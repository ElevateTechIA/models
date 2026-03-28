// Run with: npx tsx scripts/mark-public.ts
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(readFileSync("serviceAccountKey.json", "utf8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function main() {
  const snap = await db.collection("generated-photos").where("username", "==", "cesarvegacol").get();
  console.log(`Found ${snap.size} photos for cesarvegacol`);
  const batch = db.batch();
  snap.docs.forEach((doc) => {
    batch.update(doc.ref, { isPublic: true });
  });
  await batch.commit();
  console.log("All marked as isPublic: true");
}

main().catch(console.error);
