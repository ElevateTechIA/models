import { NextRequest, NextResponse } from "next/server";
import { verifyAuthWithUser, bucket, db } from "@/lib/firebase-admin";

const COLLECTION = "generated-videos";

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
  } catch {
    snapshot = await db
      .collection(COLLECTION)
      .where("username", "==", authed.username)
      .limit(100)
      .get();
  }

  const videos = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toMillis() || 0,
  }));

  return NextResponse.json({ videos });
}

export async function POST(req: NextRequest) {
  const authed = await verifyAuthWithUser(req.headers.get("authorization"));
  if (!authed)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { video, prompt, aspectRatio, thumbnailImage } = await req.json();

  if (!video || typeof video !== "string") {
    return NextResponse.json({ error: "No video provided" }, { status: 400 });
  }

  const base64Data = video.includes(",") ? video.split(",")[1] : video;
  const buffer = Buffer.from(base64Data, "base64");

  const timestamp = Date.now();
  const storagePath = `user-uploads/${authed.username}/generated-videos/video-${timestamp}.mp4`;
  const fileRef = bucket.file(storagePath);
  await fileRef.save(buffer, { metadata: { contentType: "video/mp4" } });
  await fileRef.makePublic();
  const videoUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

  // Save thumbnail if provided
  let thumbnailUrl = "";
  if (thumbnailImage) {
    const thumbData = thumbnailImage.includes(",") ? thumbnailImage.split(",")[1] : thumbnailImage;
    const thumbBuffer = Buffer.from(thumbData, "base64");
    const thumbPath = `user-uploads/${authed.username}/generated-videos/thumb-${timestamp}.png`;
    const thumbRef = bucket.file(thumbPath);
    await thumbRef.save(thumbBuffer, { metadata: { contentType: "image/png" } });
    await thumbRef.makePublic();
    thumbnailUrl = `https://storage.googleapis.com/${bucket.name}/${thumbPath}`;
  }

  const docRef = await db.collection(COLLECTION).add({
    username: authed.username,
    videoUrl,
    thumbnailUrl,
    prompt: prompt || "",
    aspectRatio: aspectRatio || "9:16",
    createdAt: new Date(),
  });

  return NextResponse.json({
    id: docRef.id,
    videoUrl,
    thumbnailUrl,
    prompt,
    aspectRatio,
    createdAt: timestamp,
  });
}
