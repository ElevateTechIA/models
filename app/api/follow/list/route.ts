import { NextRequest, NextResponse } from "next/server";
import { db, verifyAuthWithUser } from "@/lib/firebase-admin";

const COLLECTION = "follows";

// GET — list who the current user follows and who follows them
export async function GET(req: NextRequest) {
  const authed = await verifyAuthWithUser(req.headers.get("authorization"));
  if (!authed) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "following"; // "following" | "followers"

  if (type === "followers") {
    const snap = await db
      .collection(COLLECTION)
      .where("following", "==", authed.username)
      .get();
    const followers = snap.docs.map((d) => d.data().follower as string);
    return NextResponse.json({ users: followers, count: followers.length });
  }

  // Default: who I follow
  const snap = await db
    .collection(COLLECTION)
    .where("follower", "==", authed.username)
    .get();
  const following = snap.docs.map((d) => d.data().following as string);
  return NextResponse.json({ users: following, count: following.length });
}
