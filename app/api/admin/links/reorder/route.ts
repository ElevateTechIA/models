import { NextRequest, NextResponse } from "next/server";
import { readUserConfig, writeUserConfig } from "@/lib/data";
import { verifyAuthWithUser } from "@/lib/firebase-admin";

export async function PUT(req: NextRequest) {
  const authed = await verifyAuthWithUser(req.headers.get("authorization"));
  if (!authed)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids } = await req.json();
  if (!Array.isArray(ids))
    return NextResponse.json({ error: "ids array required" }, { status: 400 });

  const config = await readUserConfig(authed.username);
  const linkMap = new Map(config.links.map((l) => [l.id, l]));
  const reordered = ids.map((id: string) => linkMap.get(id)).filter(Boolean);

  const reorderedIds = new Set(ids);
  for (const link of config.links) {
    if (!reorderedIds.has(link.id)) reordered.push(link);
  }

  config.links = reordered as typeof config.links;
  await writeUserConfig(authed.username, config);
  return NextResponse.json({ links: config.links });
}
