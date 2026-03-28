import { NextRequest, NextResponse } from "next/server";
import { verifyAuthWithUser, db } from "@/lib/firebase-admin";

const PHOTOS = "generated-photos";
const LIKES = "photo-likes";

// GET — get like count + whether current user liked it
export async function GET(req: NextRequest) {
  const photoId = req.nextUrl.searchParams.get("photoId");
  if (!photoId)
    return NextResponse.json({ error: "Missing photoId" }, { status: 400 });

  const likesSnap = await db.collection(LIKES).where("photoId", "==", photoId).get();
  const count = likesSnap.size;

  // Check if authed user liked it (optional - works without auth too)
  let liked = false;
  const authed = await verifyAuthWithUser(req.headers.get("authorization"));
  if (authed) {
    liked = likesSnap.docs.some((d) => d.data().username === authed.username);
  }

  return NextResponse.json({ count, liked });
}

// POST — toggle like
export async function POST(req: NextRequest) {
  const authed = await verifyAuthWithUser(req.headers.get("authorization"));
  if (!authed)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { photoId } = await req.json();
  if (!photoId)
    return NextResponse.json({ error: "Missing photoId" }, { status: 400 });

  // Check photo exists and is public
  const photo = await db.collection(PHOTOS).doc(photoId).get();
  if (!photo.exists)
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });

  // Check if already liked
  const existing = await db
    .collection(LIKES)
    .where("photoId", "==", photoId)
    .where("username", "==", authed.username)
    .get();

  if (!existing.empty) {
    // Unlike
    const batch = db.batch();
    existing.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    const countSnap = await db.collection(LIKES).where("photoId", "==", photoId).get();
    return NextResponse.json({ liked: false, count: countSnap.size });
  }

  // Like
  await db.collection(LIKES).add({
    photoId,
    username: authed.username,
    createdAt: new Date(),
  });

  const countSnap = await db.collection(LIKES).where("photoId", "==", photoId).get();
  return NextResponse.json({ liked: true, count: countSnap.size });
}
