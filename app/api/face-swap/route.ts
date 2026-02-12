import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export async function POST(req: NextRequest) {
  const { target_image, swap_image } = await req.json();

  if (!target_image || typeof target_image !== "string") {
    return NextResponse.json(
      { error: "Se requiere una imagen objetivo" },
      { status: 400 }
    );
  }

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  // Use client-provided face or fall back to Wendy's profile picture
  let swapImageDataUri: string;
  if (swap_image && typeof swap_image === "string") {
    swapImageDataUri = swap_image;
  } else {
    try {
      const imagePath = join(process.cwd(), "public", "profile-pictures", "profile-picture.png");
      const imageBuffer = readFileSync(imagePath);
      const base64 = imageBuffer.toString("base64");
      swapImageDataUri = `data:image/png;base64,${base64}`;
    } catch {
      return NextResponse.json(
        { error: "No se pudo cargar la imagen de referencia" },
        { status: 500 }
      );
    }
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
      input: {
        input_image: target_image,
        swap_image: swapImageDataUri,
      },
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
      { error: prediction.error || "El intercambio de cara fallo" },
      { status: 500 }
    );
  }

  // Poll fallback (~26 seconds typical)
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
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
        { error: prediction.error || "El intercambio de cara fallo" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: "El proceso tomo demasiado tiempo" },
    { status: 504 }
  );
}
