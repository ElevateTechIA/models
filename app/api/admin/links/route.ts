import { NextRequest, NextResponse } from "next/server";
import { readUserConfig, writeUserConfig, generateLinkId } from "@/lib/data";
import { verifyAuthWithUser } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  const authed = await verifyAuthWithUser(req.headers.get("authorization"));
  if (!authed)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const config = await readUserConfig(authed.username);

  const newLink: import("@/lib/types").SiteLink = {
    id: generateLinkId(),
    icon: body.icon || "/icons/telegram_icon.svg",
    iconType: body.iconType || "preset",
    label: body.label || "New Link",
    url: body.url || "",
    enabled: body.enabled !== false,
    ...(body.photo ? { photo: body.photo } : {}),
  };

  config.links.push(newLink);
  await writeUserConfig(authed.username, config);
  return NextResponse.json({ links: config.links }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const authed = await verifyAuthWithUser(req.headers.get("authorization"));
  if (!authed)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.id)
    return NextResponse.json({ error: "Link id required" }, { status: 400 });

  const config = await readUserConfig(authed.username);
  const index = config.links.findIndex((l) => l.id === body.id);
  if (index === -1)
    return NextResponse.json({ error: "Link not found" }, { status: 404 });

  if (body.icon !== undefined) config.links[index].icon = body.icon;
  if (body.iconType !== undefined) config.links[index].iconType = body.iconType;
  if (body.label !== undefined) config.links[index].label = body.label;
  if (body.url !== undefined) config.links[index].url = body.url;
  if (body.enabled !== undefined) config.links[index].enabled = body.enabled;
  if (body.photo !== undefined) config.links[index].photo = body.photo || undefined;

  await writeUserConfig(authed.username, config);
  return NextResponse.json({ links: config.links });
}

export async function DELETE(req: NextRequest) {
  const authed = await verifyAuthWithUser(req.headers.get("authorization"));
  if (!authed)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "Link id required" }, { status: 400 });

  const config = await readUserConfig(authed.username);
  const index = config.links.findIndex((l) => l.id === id);
  if (index === -1)
    return NextResponse.json({ error: "Link not found" }, { status: 404 });

  config.links.splice(index, 1);
  await writeUserConfig(authed.username, config);
  return NextResponse.json({ links: config.links });
}
