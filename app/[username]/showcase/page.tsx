import { notFound } from "next/navigation";
import { findUserByUsername, readUserConfig } from "@/lib/data";
import type { SiteConfig } from "@/lib/types";
import ShowcaseClient from "./ShowcaseClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ username: string }>;
}

export default async function ShowcasePage({ params }: Props) {
  const { username } = await params;

  let config: SiteConfig | null = null;
  try {
    const user = await findUserByUsername(username);
    if (!user) notFound();
    config = await readUserConfig(username);
  } catch {
    notFound();
  }

  if (!config) notFound();

  return (
    <div suppressHydrationWarning>
      <ShowcaseClient config={config} username={username} />
    </div>
  );
}
