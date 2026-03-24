import { NextRequest, NextResponse } from "next/server";

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

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const GEMINI_MODELS = [
  "gemini-2.5-flash-image",
  "gemini-3.1-flash-image-preview",
  "gemini-3-pro-image-preview",
];

export async function POST(req: NextRequest) {
  const { prompt, image, aspect_ratio } = await req.json();

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "Se requiere un prompt" }, { status: 400 });
  }
  if (!image || typeof image !== "string") {
    return NextResponse.json({ error: "Se requiere una imagen de referencia" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  const imageData = extractBase64(image);
  const imageMime = detectMime(image);

  const aspectInstruction = aspect_ratio
    ? `The output image MUST be in ${aspect_ratio} aspect ratio.`
    : "";

  const fullPrompt = `Generate a NEW high-quality photorealistic image based on the reference photo and the description below.

${aspectInstruction}

Description: ${prompt}

CRITICAL IDENTITY PRESERVATION: Keep the EXACT same person from the reference image - same face, same eyes, same nose, same skin tone, same hair.
ONLY create the new scene/setting/clothing described by the user.
Do NOT change any facial features, face shape, eye shape, or skin color.
The result must look like the SAME EXACT PERSON in a new setting.
Make it photorealistic, cinematic, high detail.
The output must be a single image.`;

  const parts: object[] = [
    { text: fullPrompt },
    { inlineData: { data: imageData, mimeType: imageMime } },
  ];

  for (const model of GEMINI_MODELS) {
    const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ parts }],
      generationConfig: { responseModalities: ["IMAGE"] },
    };

    try {
      console.log(`[photos] Trying model: ${model}`);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[photos] ${model} HTTP ${res.status}:`, errText.substring(0, 500));
        continue;
      }

      const data = await res.json();

      // Check for safety blocks
      if (data.candidates?.[0]?.finishReason === "SAFETY") {
        console.warn(`[photos] ${model} blocked by safety filter`);
        return NextResponse.json(
          { error: "Imagen bloqueada por filtros de seguridad. Intenta con otro prompt." },
          { status: 500 }
        );
      }

      if (data.promptFeedback?.blockReason) {
        console.warn(`[photos] ${model} prompt blocked:`, data.promptFeedback.blockReason);
        return NextResponse.json(
          { error: "Prompt bloqueado por filtros de seguridad. Intenta con otro prompt." },
          { status: 500 }
        );
      }

      const imagePart = data.candidates?.[0]?.content?.parts?.find(
        (p: any) => p.inlineData
      );

      if (imagePart?.inlineData) {
        const b64 = imagePart.inlineData.data;
        console.log(`[photos] Success with model: ${model}`);
        return NextResponse.json({
          image: `data:image/png;base64,${b64}`,
        });
      }

      console.warn(`[photos] ${model} no image in response:`, JSON.stringify(data).substring(0, 500));
    } catch (err) {
      console.error(`[photos] ${model} fetch error:`, err);
      continue;
    }

    // Small delay before next model
    await new Promise((r) => setTimeout(r, 1000));
  }

  return NextResponse.json(
    { error: "No se pudo generar la imagen. Intenta de nuevo." },
    { status: 500 }
  );
}
