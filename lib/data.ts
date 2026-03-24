import { db } from "@/lib/firebase-admin";
import type { SiteConfig, UserRecord } from "@/lib/types";

const RESERVED_USERNAMES = [
  "admin",
  "login",
  "api",
  "model-design",
  "photos",
  "videos",
  "_next",
  "public",
  "favicon",
  "icons",
  "uploads",
];

// ── User operations ────────────────────────────────

export async function findUserByEmail(
  email: string
): Promise<UserRecord | undefined> {
  const snapshot = await db
    .collection("users")
    .where("email", "==", email.toLowerCase())
    .limit(1)
    .get();

  if (snapshot.empty) return undefined;
  return snapshot.docs[0].data() as UserRecord;
}

export async function findUserByUsername(
  username: string
): Promise<UserRecord | undefined> {
  const doc = await db.collection("users").doc(username).get();
  if (!doc.exists) return undefined;
  return doc.data() as UserRecord;
}

export async function generateUsername(email: string): Promise<string> {
  const prefix = email.split("@")[0].replace(/[^a-z0-9]/gi, "").toLowerCase();
  const base = prefix || "user";

  // Check reserved names
  if (RESERVED_USERNAMES.includes(base)) {
    let i = 1;
    while (true) {
      const candidate = `${base}${i}`;
      const exists = await findUserByUsername(candidate);
      if (!exists) return candidate;
      i++;
    }
  }

  const exists = await findUserByUsername(base);
  if (!exists) return base;

  let i = 1;
  while (true) {
    const candidate = `${base}${i}`;
    const exists = await findUserByUsername(candidate);
    if (!exists) return candidate;
    i++;
  }
}

export async function registerUser(
  email: string,
  displayName: string
): Promise<UserRecord> {
  const username = await generateUsername(email);
  const record: UserRecord = {
    email: email.toLowerCase(),
    username,
    displayName,
    createdAt: new Date().toISOString(),
  };

  // Write user record (doc ID = username)
  await db.collection("users").doc(username).set(record);

  // Create default config
  const config = getNewUserConfig(displayName);
  await writeUserConfig(username, config);

  return record;
}

// ── Per-user config ────────────────────────────────

export async function readUserConfig(username: string): Promise<SiteConfig> {
  const doc = await db.collection("configs").doc(username).get();
  if (!doc.exists) {
    const config = getNewUserConfig(username);
    await writeUserConfig(username, config);
    return config;
  }
  return doc.data() as SiteConfig;
}

export async function writeUserConfig(
  username: string,
  config: SiteConfig
): Promise<void> {
  await db.collection("configs").doc(username).set(config);
}

function getNewUserConfig(displayName: string): SiteConfig {
  return {
    profile: {
      name: displayName || "New User",
      subtitle: "",
      picture: "",
    },
    links: [],
    settings: {
      language: "es",
      footerText: "",
    },
  };
}

// ── Link ID generation ─────────────────────────────

export function generateLinkId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "lk_";
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
