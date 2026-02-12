import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { prompt, aspect_ratio, quality, image, prompt_strength } = await req.json();

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const allowedRatios = ["1:1", "16:9", "9:16"];
  const ratio = allowedRatios.includes(aspect_ratio) ? aspect_ratio : "9:16";
  const isHighQuality = quality === "high";

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  // Create prediction
  const createRes = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait",
    },
    body: JSON.stringify({
      version:
        "bbcfe20b237567081da78379c67d10c637bd7267110e199d91e800955845f9b4",
      input: {
        model: "dev",
        prompt,
        go_fast: false,
        lora_scale: 0.75,
        megapixels: "1",
        num_outputs: 1,
        aspect_ratio: ratio,
        output_format: "png",
        guidance_scale: isHighQuality ? 2.5 : 2.8,
        output_quality: 100,
        prompt_strength: image ? (prompt_strength ?? 0.5) : 0.8,
        extra_lora_scale: 1,
        num_inference_steps: isHighQuality ? 50 : 36,
        disable_safety_checker: true,
        ...(image ? { image } : {}),
      },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: err.detail || "Failed to start generation" },
      { status: createRes.status }
    );
  }

  let prediction = await createRes.json();

  // If Prefer: wait returned a completed prediction, return it
  if (prediction.status === "succeeded") {
    return NextResponse.json({ images: prediction.output });
  }

  if (prediction.status === "failed") {
    return NextResponse.json(
      { error: prediction.error || "Generation failed" },
      { status: 500 }
    );
  }

  // Poll until done (fallback if Prefer: wait times out)
  const maxAttempts = isHighQuality ? 90 : 60;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2000));

    const pollRes = await fetch(
      `https://api.replicate.com/v1/predictions/${prediction.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    prediction = await pollRes.json();

    if (prediction.status === "succeeded") {
      return NextResponse.json({ images: prediction.output });
    }

    if (prediction.status === "failed" || prediction.status === "canceled") {
      return NextResponse.json(
        { error: prediction.error || "Generation failed" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "Generation timed out" }, { status: 504 });
}
