/**
 * One-time seed script to populate wendypradaoficial11 config in Firestore.
 * Run: npx tsx --env-file=.env.local scripts/seed-wendy.ts
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
    name: "Wendy Prada",
    subtitle: "Modelo \u2726 Contenido Exclusivo",
    picture: "/profile-pictures/profile-picture.png",
  },
  links: [
    {
      id: "lk_instagram",
      icon: "/instagram_icon.svg",
      iconType: "preset",
      label: "@wendypradaoficial",
      url: "https://www.instagram.com/wendypradaoficial/",
      enabled: true,
    },
    {
      id: "lk_onlyfans",
      icon: "/onlyfans_icon.svg",
      iconType: "preset",
      label: "OnlyFans",
      url: "https://onlyfans.com/wmodel11",
      enabled: true,
    },
    {
      id: "lk_tiktok",
      icon: "/tiktok_icon.svg",
      iconType: "preset",
      label: "TikTok @wendyprada",
      url: "https://www.tiktok.com/@bypradaw",
      enabled: true,
    },
    {
      id: "lk_paypal",
      icon: "/paypal_icon.svg",
      iconType: "preset",
      label: "PayPal",
      url: "https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=Wendypradaoficial11%40gmail.com&currency_code=USD",
      enabled: true,
    },
    {
      id: "lk_qrshare",
      icon: "/icons/qrcode_icon.svg",
      iconType: "preset",
      label: "Compartir mi perfil",
      url: "#profile",
      enabled: true,
    },
  ],
  settings: {
    language: "es",
    footerText: "\u00a9 2026 Wendy Prada Oficial",
  },
};

async function main() {
  await db.collection("configs").doc("wendypradaoficial11").set(config);
  console.log("Config written for wendypradaoficial11");
}

main().catch(console.error);
