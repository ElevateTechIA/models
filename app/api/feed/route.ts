import { NextRequest, NextResponse } from "next/server";
import { db, verifyAuthWithUser } from "@/lib/firebase-admin";

const PHOTOS = "generated-photos";
const FOLLOWS = "follows";

type FeedPhoto = {
  id: string;
  imageUrl: string;
  username: string;
  prompt: string;
  createdAt: number;
  relation: "following" | "mutual" | "discover";
};

// GET — personalized feed: following > mutual > discover
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const authed = await verifyAuthWithUser(authHeader);

  // Not logged in → fallback to public gallery (chronological)
  if (!authed) {
    return fallbackGallery();
  }

  const myUsername = authed.username;

  try {
    // 1. Get people I follow
    const iFollowSnap = await db
      .collection(FOLLOWS)
      .where("follower", "==", myUsername)
      .get();
    const iFollow = new Set(iFollowSnap.docs.map((d) => d.data().following as string));

    // 2. Get people who follow me
    const followMeSnap = await db
      .collection(FOLLOWS)
      .where("following", "==", myUsername)
      .get();
    const followMe = new Set(followMeSnap.docs.map((d) => d.data().follower as string));

    // 3. Classify: mutual = in both sets
    const mutuals = new Set([...iFollow].filter((u) => followMe.has(u)));

    // 4. Fetch all public photos
    let allPhotos: FeedPhoto[] = [];
    try {
      const snap = await db
        .collection(PHOTOS)
        .where("isPublic", "==", true)
        .orderBy("createdAt", "desc")
        .limit(100)
        .get();
      allPhotos = snap.docs
        .filter((d) => d.data().imageUrl && d.data().username !== myUsername)
        .map((d) => ({
          id: d.id,
          imageUrl: d.data().imageUrl,
          username: d.data().username || "",
          prompt: d.data().prompt || "",
          createdAt: d.data().createdAt?.toMillis?.() || 0,
          relation: "discover" as const,
        }));
    } catch {
      // Fallback without ordering
      const snap = await db
        .collection(PHOTOS)
        .where("isPublic", "==", true)
        .limit(100)
        .get();
      allPhotos = snap.docs
        .filter((d) => d.data().imageUrl && d.data().username !== myUsername)
        .map((d) => ({
          id: d.id,
          imageUrl: d.data().imageUrl,
          username: d.data().username || "",
          prompt: d.data().prompt || "",
          createdAt: d.data().createdAt?.toMillis?.() || 0,
          relation: "discover" as const,
        }));
    }

    // 5. Tag each photo with relation
    for (const photo of allPhotos) {
      if (mutuals.has(photo.username)) {
        photo.relation = "mutual";
      } else if (iFollow.has(photo.username)) {
        photo.relation = "following";
      }
    }

    // 6. Sort: mutual first, then following, then discover. Within each group, by recency.
    const priority: Record<string, number> = { mutual: 0, following: 1, discover: 2 };
    allPhotos.sort((a, b) => {
      const p = priority[a.relation] - priority[b.relation];
      if (p !== 0) return p;
      return b.createdAt - a.createdAt;
    });

    // 7. Also include user's own public photos separately
    const myPhotosSnap = await db
      .collection(PHOTOS)
      .where("username", "==", myUsername)
      .where("isPublic", "==", true)
      .limit(20)
      .get();
    const myPhotos = myPhotosSnap.docs
      .filter((d) => d.data().imageUrl)
      .map((d) => ({
        id: d.id,
        imageUrl: d.data().imageUrl,
        username: d.data().username,
        prompt: d.data().prompt || "",
        createdAt: d.data().createdAt?.toMillis?.() || 0,
        relation: "self" as const,
      }));

    return NextResponse.json({
      feed: allPhotos.slice(0, 60),
      myPhotos,
      followingCount: iFollow.size,
      followersCount: followMe.size,
    });
  } catch (err: unknown) {
    console.error("Feed error:", err);
    return fallbackGallery();
  }
}

async function fallbackGallery() {
  try {
    const snap = await db
      .collection(PHOTOS)
      .where("isPublic", "==", true)
      .orderBy("createdAt", "desc")
      .limit(30)
      .get();
    const photos = snap.docs
      .filter((d) => d.data().imageUrl)
      .map((d) => ({
        id: d.id,
        imageUrl: d.data().imageUrl,
        username: d.data().username || "",
        prompt: d.data().prompt || "",
        createdAt: d.data().createdAt?.toMillis?.() || 0,
        relation: "discover",
      }));
    return NextResponse.json({ feed: photos, myPhotos: [], followingCount: 0, followersCount: 0 });
  } catch {
    return NextResponse.json({ feed: [], myPhotos: [], followingCount: 0, followersCount: 0 });
  }
}
