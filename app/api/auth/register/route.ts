import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, db } from "@/lib/firebase-admin";
import { findUserByEmail, registerUser } from "@/lib/data";

export async function POST(req: NextRequest) {
  const email = await verifyAuth(req.headers.get("authorization"));
  if (!email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if already registered
  const existing = await findUserByEmail(email);
  if (existing) {
    return NextResponse.json({
      username: existing.username,
      displayName: existing.displayName,
      isNew: false,
    });
  }

  // Extract display name and deviceId from request body
  let displayName = "";
  let deviceId = "";
  try {
    const body = await req.json();
    displayName = body.displayName || "";
    deviceId = body.deviceId || "";
  } catch {
    // No body provided
  }
  if (!displayName) {
    displayName = email.split("@")[0];
  }

  // Check if this device already claimed welcome credits
  let deviceAlreadyClaimed = false;
  if (deviceId) {
    const deviceDoc = await db.collection("device-claims").doc(deviceId).get();
    deviceAlreadyClaimed = deviceDoc.exists;
  }

  const record = await registerUser(email, displayName);

  // Mark device as claimed (for future registrations on same device)
  if (deviceId) {
    await db.collection("device-claims").doc(deviceId).set({
      username: record.username,
      email,
      claimedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json(
    {
      username: record.username,
      displayName: record.displayName,
      isNew: true,
      deviceAlreadyClaimed,
    },
    { status: 201 }
  );
}
