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

async function urlToBase64(url: string): Promise<{ data: string; mime: string }> {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const mime = res.headers.get("content-type") || "image/jpeg";
  return { data: base64, mime };
}

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

const VEO_MODELS = [
  "veo-3.0-generate-001",
  "veo-3.0-fast-generate-001",
  "veo-2.0-generate-001",
];

export async function POST(req: NextRequest) {
  const { prompt, image, aspect_ratio } = await req.json();

  if (!image || typeof image !== "string") {
    return NextResponse.json({ error: "Se requiere una imagen" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  let imageData: string;
  let imageMime: string;

  if (image.startsWith("data:")) {
    imageData = extractBase64(image);
    imageMime = detectMime(image);
  } else if (image.startsWith("http")) {
    // URL from library — fetch and convert
    const converted = await urlToBase64(image);
    imageData = converted.data;
    imageMime = converted.mime;
  } else {
    imageData = image;
    imageMime = "image/jpeg";
  }

  const effectivePrompt = prompt?.trim()
    || "Animate this image with subtle, natural motion. Keep the scene realistic.";

  for (const model of VEO_MODELS) {
    const url = `${GEMINI_API_BASE}/models/${model}:predictLongRunning?key=${apiKey}`;

    const instance: any = {
      prompt: effectivePrompt,
      image: {
        bytesBase64Encoded: imageData,
        mimeType: imageMime,
      },
    };

    // Veo 3 requires durationSeconds between 4-8; Veo 2 accepts 5-8
    const duration = model.startsWith("veo-3") ? 8 : 5;
    const payload = {
      instances: [instance],
      parameters: {
        sampleCount: 1,
        durationSeconds: duration,
        ...(aspect_ratio ? { aspectRatio: aspect_ratio } : {}),
      },
    };

    try {
      console.log(`[videos] Starting generation with model: ${model}`);
      const startRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!startRes.ok) {
        const errText = await startRes.text();
        console.error(`[videos] ${model} HTTP ${startRes.status}:`, errText.substring(0, 500));
        continue;
      }

      const startData = await startRes.json();
      const operationName = startData.name;

      if (!operationName) {
        console.error(`[videos] ${model} no operation name:`, JSON.stringify(startData).substring(0, 300));
        continue;
      }

      console.log(`[videos] Operation started: ${operationName}`);

      // Poll for completion (up to 3 minutes)
      const pollUrl = `${GEMINI_API_BASE}/${operationName}?key=${apiKey}`;

      for (let i = 0; i < 36; i++) {
        await new Promise((r) => setTimeout(r, 5000));

        const pollRes = await fetch(pollUrl);
        if (!pollRes.ok) {
          console.error(`[videos] Poll error HTTP ${pollRes.status}`);
          continue;
        }

        const pollData = await pollRes.json();

        if (pollData.error) {
          console.error(`[videos] Operation error:`, JSON.stringify(pollData.error).substring(0, 300));
          return NextResponse.json(
            { error: pollData.error.message || "Error generating video" },
            { status: 500 }
          );
        }

        if (pollData.done) {
          const videoUri = pollData.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;

          if (videoUri) {
            // Download the video and convert to base64
            const videoUrl = videoUri.includes("key=") ? videoUri : `${videoUri}&key=${apiKey}`;
            const videoRes = await fetch(videoUrl);

            if (!videoRes.ok) {
              console.error(`[videos] Failed to download video: HTTP ${videoRes.status}`);
              return NextResponse.json(
                { error: "Failed to download generated video" },
                { status: 500 }
              );
            }

            const videoBuffer = await videoRes.arrayBuffer();
            const videoBase64 = Buffer.from(videoBuffer).toString("base64");
            console.log(`[videos] Success with ${model}, video size: ${videoBuffer.byteLength} bytes`);

            return NextResponse.json({
              video: `data:video/mp4;base64,${videoBase64}`,
            });
          }

          const filtered = pollData.response?.generateVideoResponse?.raiMediaFilteredCount;
          if (filtered) {
            const reasons = pollData.response?.generateVideoResponse?.raiMediaFilteredReasons;
            console.warn(`[videos] Filtered by safety:`, reasons);
            return NextResponse.json(
              { error: "Video bloqueado por filtros de seguridad. Intenta con otro prompt o imagen." },
              { status: 500 }
            );
          }
          console.warn(`[videos] Done but no video URI:`, JSON.stringify(pollData).substring(0, 500));
          return NextResponse.json(
            { error: "No se genero el video. Intenta de nuevo." },
            { status: 500 }
          );
        }

        console.log(`[videos] Polling... attempt ${i + 1}`);
      }

      return NextResponse.json(
        { error: "El video tomo demasiado tiempo. Intenta de nuevo." },
        { status: 504 }
      );

    } catch (err) {
      console.error(`[videos] ${model} error:`, err);
      continue;
    }
  }

  return NextResponse.json(
    { error: "No se pudo generar el video. Intenta de nuevo." },
    { status: 500 }
  );
}
