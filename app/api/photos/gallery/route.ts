import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

const COLLECTION = "generated-photos";

function mapDocs(snapshot: FirebaseFirestore.QuerySnapshot) {
  return snapshot.docs
    .filter((doc) => doc.data().imageUrl)
    .map((doc) => ({
      id: doc.id,
      imageUrl: doc.data().imageUrl,
      username: doc.data().username || "",
      prompt: doc.data().prompt || "",
    }));
}

// GET — fetch public photos for the landing page wall (no auth required)
export async function GET() {
  try {
    // 1. Try public photos with index
    let photos: ReturnType<typeof mapDocs> = [];
    try {
      const snap = await db
        .collection(COLLECTION)
        .where("isPublic", "==", true)
        .orderBy("createdAt", "desc")
        .limit(30)
        .get();
      photos = mapDocs(snap);
    } catch {
      // Index not ready, try without ordering
      try {
        const snap = await db
          .collection(COLLECTION)
          .where("isPublic", "==", true)
          .limit(30)
          .get();
        photos = mapDocs(snap);
      } catch {}
    }

    // 2. If not enough, fallback to seed account (all their photos)
    if (photos.length < 6) {
      try {
        const snap = await db
          .collection(COLLECTION)
          .where("username", "==", "cesarvegacol")
          .limit(30)
          .get();
        photos = mapDocs(snap);
      } catch {}
    }

    // 3. Last resort — just grab any photos
    if (photos.length < 6) {
      try {
        const snap = await db.collection(COLLECTION).limit(30).get();
        photos = mapDocs(snap);
      } catch {}
    }

    return NextResponse.json({ photos }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json({ photos: [] });
  }
}
