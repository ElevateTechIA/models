import { NextRequest, NextResponse } from "next/server";
import { verifyAuthWithUser, bucket } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  const authed = await verifyAuthWithUser(req.headers.get("authorization"));
  if (!authed)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string | null;

  if (!file)
    return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  if (buffer.length > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File too large (max 5MB)" },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop() || "png";
  let storagePath: string;

  if (type === "profile") {
    storagePath = `user-uploads/${authed.username}/profile-picture.${ext}`;
  } else {
    const uniqueName = `icon-${Date.now()}.${ext}`;
    storagePath = `user-uploads/${authed.username}/${uniqueName}`;
  }

  // Upload to Firebase Storage
  const fileRef = bucket.file(storagePath);
  await fileRef.save(buffer, {
    metadata: {
      contentType: file.type || "image/png",
    },
  });

  // Make the file publicly accessible
  await fileRef.makePublic();

  // Get the public URL
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

  return NextResponse.json({ path: publicUrl });
}
