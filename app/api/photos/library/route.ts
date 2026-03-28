import { NextRequest, NextResponse } from "next/server";
import { verifyAuthWithUser, bucket, db } from "@/lib/firebase-admin";

const COLLECTION = "generated-photos";

// GET — fetch user's library
export async function GET(req: NextRequest) {
  const authed = await verifyAuthWithUser(req.headers.get("authorization"));
  if (!authed)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let snapshot;
  try {
    snapshot = await db
      .collection(COLLECTION)
      .where("username", "==", authed.username)
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();
  } catch (err: any) {
    // If composite index doesn't exist yet, fall back to unordered query
    console.warn("[library] Index error, falling back:", err.message?.substring(0, 200));
    snapshot = await db
      .collection(COLLECTION)
      .where("username", "==", authed.username)
      .limit(100)
      .get();
  }

  const images = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toMillis() || 0,
  }));

  return NextResponse.json({ images });
}

// POST — save a generated image
export async function POST(req: NextRequest) {
  const authed = await verifyAuthWithUser(req.headers.get("authorization"));
  if (!authed)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { image, prompt, aspectRatio } = await req.json();

  if (!image || typeof image !== "string") {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  // Convert base64 data URL to buffer
  const base64Data = image.includes(",") ? image.split(",")[1] : image;
  const buffer = Buffer.from(base64Data, "base64");

  if (buffer.length > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Image too large" }, { status: 400 });
  }

  // Upload to Firebase Storage
  const timestamp = Date.now();
  const storagePath = `user-uploads/${authed.username}/generated/photo-${timestamp}.png`;
  const fileRef = bucket.file(storagePath);
  await fileRef.save(buffer, {
    metadata: { contentType: "image/png" },
  });
  await fileRef.makePublic();
  const imageUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

  // Save metadata to Firestore
  const docRef = await db.collection(COLLECTION).add({
    username: authed.username,
    imageUrl,
    prompt: prompt || "",
    aspectRatio: aspectRatio || "1:1",
    createdAt: new Date(),
  });

  return NextResponse.json({
    id: docRef.id,
    imageUrl,
    prompt,
    aspectRatio,
    createdAt: timestamp,
  });
}

// PATCH — toggle isPublic on a photo
export async function PATCH(req: NextRequest) {
  const authed = await verifyAuthWithUser(req.headers.get("authorization"));
  if (!authed)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, isPublic } = await req.json();
  if (!id || typeof isPublic !== "boolean")
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });

  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists || doc.data()?.username !== authed.username)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.collection(COLLECTION).doc(id).update({ isPublic });
  return NextResponse.json({ success: true, isPublic });
}

// DELETE — remove an image
export async function DELETE(req: NextRequest) {
  const authed = await verifyAuthWithUser(req.headers.get("authorization"));
  if (!authed)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "No id" }, { status: 400 });

  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists || doc.data()?.username !== authed.username) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete from Storage
  const imageUrl = doc.data()?.imageUrl;
  if (imageUrl) {
    try {
      const path = imageUrl.split(`${bucket.name}/`)[1];
      if (path) await bucket.file(path).delete();
    } catch {}
  }

  await db.collection(COLLECTION).doc(id).delete();
  return NextResponse.json({ success: true });
}
