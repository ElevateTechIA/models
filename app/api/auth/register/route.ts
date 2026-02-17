import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/firebase-admin";
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

  // Extract display name from request body or fall back to email prefix
  let displayName = "";
  try {
    const body = await req.json();
    displayName = body.displayName || "";
  } catch {
    // No body provided
  }
  if (!displayName) {
    displayName = email.split("@")[0];
  }

  const record = await registerUser(email, displayName);

  return NextResponse.json(
    {
      username: record.username,
      displayName: record.displayName,
      isNew: true,
    },
    { status: 201 }
  );
}
