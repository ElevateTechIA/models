import { NextRequest, NextResponse } from "next/server";
import { db, verifyAuthWithUser } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { rateLimit } from "@/lib/rate-limit";

/* ---------- Credit helpers ---------- */

async function deductCredits(username: string): Promise<{ ok: boolean; creditsRemaining: number }> {
  const creditsPerGen = parseInt(process.env.CREDITS_PER_GENERATION || "100");
  const userRef = db.collection("user-credits").doc(username);

  return db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) return { ok: false, creditsRemaining: 0 };

    const currentCredits = userDoc.data()!.credits || 0;
    if (currentCredits < creditsPerGen) return { ok: false, creditsRemaining: currentCredits };

    const newCredits = currentCredits - creditsPerGen;

    transaction.update(userRef, {
      credits: newCredits,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const txRef = db.collection("model-transactions").doc();
    transaction.set(txRef, {
      username,
      type: "usage",
      credits: -creditsPerGen,
      balanceBefore: currentCredits,
      balanceAfter: newCredits,
      description: "Image generation (Replicate)",
      createdAt: FieldValue.serverTimestamp(),
    });

    return { ok: true, creditsRemaining: newCredits };
  });
}

async function refundCredits(username: string): Promise<void> {
  const creditsPerGen = parseInt(process.env.CREDITS_PER_GENERATION || "100");
  const userRef = db.collection("user-credits").doc(username);

  await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) return;

    const currentCredits = userDoc.data()!.credits || 0;
    const newCredits = currentCredits + creditsPerGen;

    transaction.update(userRef, {
      credits: newCredits,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const txRef = db.collection("model-transactions").doc();
    transaction.set(txRef, {
      username,
      type: "bonus",
      credits: creditsPerGen,
      balanceBefore: currentCredits,
      balanceAfter: newCredits,
      description: "Refund: image generation failed",
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}

/* ---------- Route handler ---------- */

export async function POST(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get("authorization");
  const authResult = await verifyAuthWithUser(authHeader);

  if (!authResult) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { username } = authResult;

  // Rate limit: max 5 generations per 60 seconds per user
  const rl = rateLimit(`generate:${username}`, 5, 60_000);
  if (rl.limited) {
    return NextResponse.json(
      { error: "TOO_MANY_REQUESTS", retryAfterMs: rl.retryAfterMs },
      { status: 429 }
    );
  }

  // Deduct credits before processing
  const { ok, creditsRemaining } = await deductCredits(username);

  if (!ok) {
    return NextResponse.json(
      { error: "INSUFFICIENT_CREDITS", creditsRemaining },
      { status: 402 }
    );
  }

  const { prompt, aspect_ratio, quality, image, prompt_strength, model_version, token_env } = await req.json();

  if (!prompt || typeof prompt !== "string") {
    await refundCredits(username);
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const allowedRatios = ["1:1", "16:9", "9:16"];
  const ratio = allowedRatios.includes(aspect_ratio) ? aspect_ratio : "9:16";
  const isHighQuality = quality === "high";

  const token = token_env === "cesarvega"
    ? process.env.REPLICATE_API_TOKEN_CESARVEGA
    : process.env.REPLICATE_API_TOKEN;

  if (!token) {
    await refundCredits(username);
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  const activeVersion = model_version || "bbcfe20b237567081da78379c67d10c637bd7267110e199d91e800955845f9b4";

  const createRes = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait",
    },
    body: JSON.stringify({
      version: activeVersion,
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
    await refundCredits(username);
    return NextResponse.json(
      { error: err.detail || "Failed to start generation" },
      { status: createRes.status }
    );
  }

  let prediction = await createRes.json();

  if (prediction.status === "succeeded") {
    return NextResponse.json({ images: prediction.output });
  }

  if (prediction.status === "failed") {
    await refundCredits(username);
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
      await refundCredits(username);
      return NextResponse.json(
        { error: prediction.error || "Generation failed" },
        { status: 500 }
      );
    }
  }

  await refundCredits(username);
  return NextResponse.json({ error: "Generation timed out" }, { status: 504 });
}
