import { NextRequest, NextResponse } from "next/server";
import { verifyAuthWithUser, db } from "@/lib/firebase-admin";

const COMMENTS = "photo-comments";

// GET — list comments for a photo
export async function GET(req: NextRequest) {
  const photoId = req.nextUrl.searchParams.get("photoId");
  if (!photoId)
    return NextResponse.json({ error: "Missing photoId" }, { status: 400 });

  let snapshot;
  try {
    snapshot = await db
      .collection(COMMENTS)
      .where("photoId", "==", photoId)
      .orderBy("createdAt", "asc")
      .limit(50)
      .get();
  } catch {
    snapshot = await db
      .collection(COMMENTS)
      .where("photoId", "==", photoId)
      .limit(50)
      .get();
  }

  const comments = snapshot.docs.map((doc) => ({
    id: doc.id,
    username: doc.data().username,
    text: doc.data().text,
    createdAt: doc.data().createdAt?.toMillis?.() || 0,
  }));

  return NextResponse.json({ comments });
}

// POST — add a comment
export async function POST(req: NextRequest) {
  const authed = await verifyAuthWithUser(req.headers.get("authorization"));
  if (!authed)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { photoId, text } = await req.json();
  if (!photoId || !text?.trim())
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const cleanText = text.trim().slice(0, 500);

  const docRef = await db.collection(COMMENTS).add({
    photoId,
    username: authed.username,
    text: cleanText,
    createdAt: new Date(),
  });

  return NextResponse.json({
    id: docRef.id,
    username: authed.username,
    text: cleanText,
    createdAt: Date.now(),
  });
}
