import { NextRequest, NextResponse } from "next/server";

type Provider = "gemini" | "replicate";

function getProvider(): Provider {
  const p = (process.env.FACE_SWAP_PROVIDER || "replicate").toLowerCase();
  if (p === "gemini" || p === "replicate") return p;
  return "replicate";
}

/* ---------- helpers ---------- */

function extractBase64(dataUrl: string): string {
  return dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
}

function detectMime(dataUrl: string): string {
  if (dataUrl.startsWith("data:")) {
    const m = dataUrl.match(/data:([^;]+);/);
    return m ? m[1] : "image/jpeg";
  }
  return "image/jpeg";
}

/* ---------- Gemini ---------- */

async function geminiSwap(targetImage: string, swapImage: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const targetData = extractBase64(targetImage);
  const sourceData = extractBase64(swapImage);
  const targetMime = detectMime(targetImage);
  const sourceMime = detectMime(swapImage);

  const prompt = `Perform a high-quality face swap on these two images.

CRITICAL INSTRUCTIONS:
- The FIRST image is the template/reference scene. The SECOND image is the user's face.
- ONLY replace the face. Keep EVERYTHING else from the template PIXEL-PERFECT: exact same crop, framing, zoom level, camera angle, pose, body position, outfit, accessories, background, and all objects in the scene.
- Use the user's natural skin tone and hairstyle from the second image, adapted to the template's lighting.
- Do NOT keep the template's hair or skin tone — use the user's.
- The output image MUST have the EXACT same framing and field of view as the template. Do NOT zoom in, zoom out, crop differently, or shift the composition. Every element must be in the same position as the template.`;

  const model = "gemini-2.0-flash-exp-image-generation";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          { inlineData: { data: targetData, mimeType: targetMime } },
          { inlineData: { data: sourceData, mimeType: sourceMime } },
        ],
      },
    ],
    generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
  };

  const MAX_RETRIES = 2;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Gemini error (attempt ${attempt}):`, errText);
      if (attempt === MAX_RETRIES)
        return NextResponse.json(
          { error: "Gemini API error" },
          { status: 500 }
        );
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }

    const data = await res.json();
    const imagePart = data.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData
    );

    if (imagePart?.inlineData) {
      const b64 = imagePart.inlineData.data;
      return NextResponse.json({
        image: `data:image/png;base64,${b64}`,
      });
    }

    // Log text response if any
    const textPart = data.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.text
    );
    if (textPart?.text) {
      console.warn("Gemini returned text:", textPart.text.substring(0, 200));
    }

    if (attempt === MAX_RETRIES) {
      return NextResponse.json(
        { error: "Gemini no devolvió imagen" },
        { status: 500 }
      );
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  return NextResponse.json({ error: "Gemini falló" }, { status: 500 });
}

/* ---------- Replicate ---------- */

async function replicateSwap(targetImage: string, swapImage: string) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const createRes = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait",
    },
    body: JSON.stringify({
      version:
        "278a81e7ebb22db98bcba54de985d22cc1abeead2754eb1f2af717247be69b34",
      input: { input_image: targetImage, swap_image: swapImage },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: err.detail || "Error al iniciar el intercambio de cara" },
      { status: createRes.status }
    );
  }

  let prediction = await createRes.json();

  if (prediction.status === "succeeded") {
    const output = prediction.output;
    return NextResponse.json({
      image: typeof output === "string" ? output : output?.[0] || output,
    });
  }

  if (prediction.status === "failed") {
    return NextResponse.json(
      { error: prediction.error || "El intercambio de cara falló" },
      { status: 500 }
    );
  }

  // Poll (~26s typical)
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(
      `https://api.replicate.com/v1/predictions/${prediction.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    prediction = await pollRes.json();

    if (prediction.status === "succeeded") {
      const output = prediction.output;
      return NextResponse.json({
        image: typeof output === "string" ? output : output?.[0] || output,
      });
    }
    if (prediction.status === "failed" || prediction.status === "canceled") {
      return NextResponse.json(
        { error: prediction.error || "El intercambio de cara falló" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: "El proceso tomó demasiado tiempo" },
    { status: 504 }
  );
}

/* ---------- Route handler ---------- */

export async function POST(req: NextRequest) {
  const { target_image, swap_image } = await req.json();

  if (!target_image || typeof target_image !== "string") {
    return NextResponse.json(
      { error: "Se requiere una imagen objetivo" },
      { status: 400 }
    );
  }
  if (!swap_image || typeof swap_image !== "string") {
    return NextResponse.json(
      { error: "Se requiere una imagen de cara" },
      { status: 400 }
    );
  }

  const provider = getProvider();
  console.log(`[face-swap] provider: ${provider}`);

  if (provider === "gemini") {
    return geminiSwap(target_image, swap_image);
  }
  return replicateSwap(target_image, swap_image);
}
