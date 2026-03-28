import * as fs from "fs";
import * as path from "path";

// Load .env.local BEFORE any firebase import
const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx);
  const val = trimmed.slice(eqIdx + 1);
  if (!process.env[key]) process.env[key] = val;
}

async function main() {
  // Dynamic import AFTER env is loaded
  const { db } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");

  const username = "cesarvegacol";
  const amount = 10000;
  const ref = db.collection("user-credits").doc(username);

  await db.runTransaction(async (t) => {
    const doc = await t.get(ref);
    const current = doc.exists ? (doc.data()?.credits || 0) : 0;
    const totalEarned = doc.exists ? (doc.data()?.totalCreditsEarned || 0) : 0;

    if (doc.exists) {
      t.update(ref, {
        credits: current + amount,
        totalCreditsEarned: totalEarned + amount,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      t.set(ref, {
        username,
        credits: amount,
        totalCreditsEarned: amount,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });

  await db.collection("model-transactions").add({
    username,
    type: "bonus",
    credits: amount,
    description: "Manual grant - 10k tokens",
    createdAt: FieldValue.serverTimestamp(),
  });

  const updated = await ref.get();
  console.log(`Done! cesarvegacol credits: ${updated.data()?.credits}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
