/**
 * One-time migration script: local JSON data → Firestore + Firebase Storage
 *
 * Run with:  npx tsx scripts/migrate-to-firestore.ts
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import * as fs from "fs";
import * as path from "path";
// Load .env.local manually
const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx);
  const value = trimmed.slice(eqIdx + 1);
  if (!process.env[key]) process.env[key] = value;
}

// ── Init Firebase Admin ───────────────────────────
const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}"
);
const app = initializeApp({
  credential: cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const db = getFirestore(app);
const bucket = getStorage(app).bucket();

const ROOT = path.resolve(__dirname, "..");

// ── Helpers ───────────────────────────────────────

async function uploadFile(
  localPath: string,
  storagePath: string,
  contentType: string
): Promise<string> {
  const fileRef = bucket.file(storagePath);
  await fileRef.save(fs.readFileSync(localPath), {
    metadata: { contentType },
  });
  await fileRef.makePublic();
  const url = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  console.log(`  Uploaded ${localPath} → ${url}`);
  return url;
}

// ── Main ──────────────────────────────────────────

async function main() {
  console.log("Starting migration...\n");

  // 1. Read local users registry
  const usersFile = path.join(ROOT, "data/users.json");
  const registry = JSON.parse(fs.readFileSync(usersFile, "utf-8"));

  // Add wendyprada if not in registry (she was the original single-user)
  const hasWendy = registry.users.some(
    (u: any) => u.username === "wendyprada"
  );
  if (!hasWendy) {
    registry.users.push({
      email: "wendyprada@placeholder.com",
      username: "wendyprada",
      displayName: "Wendy Prada",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  }

  // 2. Migrate each user
  for (const user of registry.users) {
    console.log(`\n── Migrating user: ${user.username} ──`);

    // Write user record to Firestore
    await db.collection("users").doc(user.username).set({
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      createdAt: user.createdAt,
    });
    console.log(`  User record written to Firestore`);

    // Read local config
    const configPath = path.join(
      ROOT,
      `data/users/${user.username}/config.json`
    );
    if (!fs.existsSync(configPath)) {
      console.log(`  No config.json found, skipping config`);
      continue;
    }
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

    // Upload profile picture if it exists locally
    if (config.profile.picture) {
      const localPicPath = path.join(ROOT, "public", config.profile.picture);
      if (fs.existsSync(localPicPath)) {
        const ext = path.extname(localPicPath).slice(1) || "png";
        const storagePath = `user-uploads/${user.username}/profile-picture.${ext}`;
        const url = await uploadFile(localPicPath, storagePath, `image/${ext}`);
        config.profile.picture = url;
      } else {
        console.log(
          `  Profile picture not found locally: ${localPicPath}, keeping as-is`
        );
      }
    }

    // Write config to Firestore
    await db.collection("configs").doc(user.username).set(config);
    console.log(`  Config written to Firestore`);
  }

  console.log("\n\nMigration complete!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
