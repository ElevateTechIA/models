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
    if (body.profile.usePerThemePictures !== undefined)
      config.profile.usePerThemePictures = body.profile.usePerThemePictures;
    if (body.profile.perThemePictures !== undefined)
      config.profile.perThemePictures = body.profile.perThemePictures;
    if (body.profile.perThemePictureAspects !== undefined)
      config.profile.perThemePictureAspects = body.profile.perThemePictureAspects;
  }

  if (body.settings) {
    if (body.settings.language) config.settings.language = body.settings.language;
    if (body.settings.footerText !== undefined)
      config.settings.footerText = body.settings.footerText;
    if (body.settings.showcaseLayout !== undefined)
      config.settings.showcaseLayout = body.settings.showcaseLayout;
    if (body.settings.carouselPhotos !== undefined)
      config.settings.carouselPhotos = body.settings.carouselPhotos;
    if (body.settings.sectionOrder !== undefined)
      config.settings.sectionOrder = body.settings.sectionOrder;
    if (body.settings.toolbarFont !== undefined)
      config.settings.toolbarFont = body.settings.toolbarFont;
    if (body.settings.appTheme !== undefined)
      config.settings.appTheme = body.settings.appTheme;
    if (body.settings.colorMode !== undefined)
      config.settings.colorMode = body.settings.colorMode;
    if (body.settings.useGradients !== undefined)
      config.settings.useGradients = body.settings.useGradients;
  }

  await writeUserConfig(authed.username, config);
  return NextResponse.json(config);
}
