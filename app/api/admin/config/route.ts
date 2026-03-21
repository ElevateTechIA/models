import { NextRequest, NextResponse } from "next/server";
import { readUserConfig, writeUserConfig, findUserByUsername } from "@/lib/data";
import { verifyAuthWithUser } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");

  if (!username)
    return NextResponse.json({ error: "username param required" }, { status: 400 });

  const user = await findUserByUsername(username);
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  const config = await readUserConfig(username);
  return NextResponse.json(config);
}

export async function PUT(req: NextRequest) {
  const authed = await verifyAuthWithUser(req.headers.get("authorization"));
  if (!authed)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const config = await readUserConfig(authed.username);

  if (body.profile) {
    if (body.profile.name) config.profile.name = body.profile.name;
    if (body.profile.subtitle !== undefined)
      config.profile.subtitle = body.profile.subtitle;
    if (body.profile.picture) config.profile.picture = body.profile.picture;
    if (body.profile.pictureAspect !== undefined)
      config.profile.pictureAspect = body.profile.pictureAspect || undefined;
  }

  if (body.settings) {
    if (body.settings.language) config.settings.language = body.settings.language;
    if (body.settings.footerText !== undefined)
      config.settings.footerText = body.settings.footerText;
  }

  await writeUserConfig(authed.username, config);
  return NextResponse.json(config);
}
