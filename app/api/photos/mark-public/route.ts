import { NextRequest, NextResponse } from "next/server";
import { verifyAuthWithUser, db } from "@/lib/firebase-admin";

// POST — mark all photos for a user as public (admin only)
export async function POST(req: NextRequest) {
  const authed = await verifyAuthWithUser(req.headers.get("authorization"));
  if (!authed)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snap = await db
    .collection("generated-photos")
    .where("username", "==", authed.username)
    .get();

  const batch = db.batch();
  snap.docs.forEach((doc) => {
    batch.update(doc.ref, { isPublic: true });
  });
  await batch.commit();

  return NextResponse.json({ updated: snap.size });
}
