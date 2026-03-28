import { NextRequest, NextResponse } from "next/server";
import { db, verifyAuthWithUser } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const COLLECTION = "follows";

// GET — check if current user follows target + get follower count
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("username");
  if (!target) return NextResponse.json({ error: "username required" }, { status: 400 });

  // Get follower count
  const snap = await db.collection(COLLECTION).where("following", "==", target).get();
  const count = snap.size;

  // Check if current user follows
  const authHeader = req.headers.get("authorization");
  const auth = await verifyAuthWithUser(authHeader);
  let isFollowing = false;

  if (auth) {
    const docId = `${auth.username}_${target}`;
    const doc = await db.collection(COLLECTION).doc(docId).get();
    isFollowing = doc.exists;
  }

  return NextResponse.json({ following: isFollowing, count });
}

// POST — toggle follow/unfollow
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const auth = await verifyAuthWithUser(authHeader);
  if (!auth) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { username: target } = await req.json();
  if (!target) return NextResponse.json({ error: "username required" }, { status: 400 });

  // Can't follow yourself
  if (auth.username === target) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  const docId = `${auth.username}_${target}`;
  const docRef = db.collection(COLLECTION).doc(docId);
  const doc = await docRef.get();

  if (doc.exists) {
    // Unfollow
    await docRef.delete();
  } else {
    // Follow
    await docRef.set({
      follower: auth.username,
      following: target,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  // Return updated count
  const snap = await db.collection(COLLECTION).where("following", "==", target).get();

  return NextResponse.json({
    following: !doc.exists,
    count: snap.size,
  });
}
