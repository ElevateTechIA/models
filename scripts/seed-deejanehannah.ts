/**
 * One-time seed script to populate deejanehannah config in Firestore.
 * Run: npx tsx --env-file=.env.local scripts/seed-deejanehannah.ts
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}"
);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

const config = {
  profile: {
    name: "DJ Hannah",
    subtitle: "",
    picture: "",
  },
  links: [
    {
      id: "lk_instagram",
      icon: "/instagram_icon.svg",
      iconType: "preset",
      label: "@djhannah_",
      url: "https://www.instagram.com/djhannah_/",
      enabled: true,
    },
    {
      id: "lk_facebook",
      icon: "/facebook_icon.svg",
      iconType: "preset",
      label: "DJHANNAHOFFICIAL",
      url: "https://www.facebook.com/DJHANNAHOFFICIAL",
      enabled: true,
    },
    {
      id: "lk_tiktok",
      icon: "/tiktok_icon.svg",
      iconType: "preset",
      label: "@djhannah_",
      url: "https://www.tiktok.com/@djhannah_",
      enabled: true,
    },
    {
      id: "lk_bandcamp",
      icon: "/bandcamp_icon.svg",
      iconType: "preset",
      label: "SONIKA 🪩",
      url: "https://djhannah.bandcamp.com/album/sonika-vol-1",
      enabled: true,
    },
    {
      id: "lk_ep",
      icon: "/music_icon.svg",
      iconType: "preset",
      label: "ON THE LOW - EP",
      url: "https://rawthentic.lnk.to/OnTheLowEPAS",
      enabled: true,
    },
    {
      id: "lk_youtube",
      icon: "/youtube_icon.svg",
      iconType: "preset",
      label: "YouTube 🎵",
      url: "https://youtu.be/JOaTSGyZcVw?si=vbsBQ3YND_QVmsIy",
      enabled: true,
    },
    {
      id: "lk_linktree",
      icon: "/linktree_icon.svg",
      iconType: "preset",
      label: "linktr.ee/dj.hannah",
      url: "https://linktr.ee/dj.hannah",
      enabled: true,
    },
    {
      id: "lk_djfan",
      icon: "/music_icon.svg",
      iconType: "preset",
      label: "All-Access Pass - DJ Content & Community",
      url: "https://djfan.app/artists/djhannah?tab=posts",
      enabled: true,
    },
    {
      id: "lk_telegram",
      icon: "/telegram_icon.svg",
      iconType: "preset",
      label: "Telegram",
      url: "https://t.me/+d2Zw7ZWxMXtlZDdh",
      enabled: true,
    },
    {
      id: "lk_soundcloud",
      icon: "/soundcloud_icon.svg",
      iconType: "preset",
      label: "SoundCloud",
      url: "https://on.soundcloud.com/6BqDK",
      enabled: true,
    },
    {
      id: "lk_magazine",
      icon: "/magazine_icon.svg",
      iconType: "preset",
      label: "Lifestyle Plus Magazine Special Edition",
      url: "https://www.magcloud.com/browse/issue/2726995",
      enabled: true,
    },
    {
      id: "lk_freedownload",
      icon: "/music_icon.svg",
      iconType: "preset",
      label: "Free Download: CUICA - DJ HANNAH",
      url: "https://hypeddit.com/hannah/cuicadjhannah",
      enabled: true,
    },
  ],
  settings: {
    language: "es",
    footerText: "",
  },
};

async function main() {
  await db.collection("configs").doc("deejanehannah").set(config, { merge: true });
  console.log("Config written for deejanehannah");
}

main().catch(console.error);
