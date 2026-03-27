/**
 * Script to seed credit packages in Firestore
 * Run once: npx tsx scripts/seed-credit-packages.ts
 *
 * IMPORTANT: Update the stripePriceId and stripeProductId values
 * with your NEW "Model-Influencer" Stripe products before running.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

// Initialize Firebase Admin
if (!getApps().length) {
  // Try loading service account from env var (same format as .env.local)
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    initializeApp({ credential: cert(serviceAccount) });
    console.log('✅ Firebase Admin initialized from env var');
  } else {
    console.error('❌ Set FIREBASE_SERVICE_ACCOUNT_KEY env var');
    process.exit(1);
  }
}

const db = getFirestore();

// =============================================
// UPDATE THESE WITH YOUR NEW STRIPE PRODUCT IDS
// =============================================
const packages = [
  {
    packageId: 'starter',
    name: 'ONE LINK Starter',
    credits: 1000,
    priceUSD: 800, // $8.00
    stripePriceId: 'price_REPLACE_WITH_STARTER_PRICE_ID',
    stripeProductId: 'prod_REPLACE_WITH_STARTER_PRODUCT_ID',
    description: '~10 Fotos o ~2 Videos',
    popular: false,
    active: true,
  },
  {
    packageId: 'creator',
    name: 'ONE LINK Creator',
    credits: 2200,
    priceUSD: 1500, // $15.00
    stripePriceId: 'price_REPLACE_WITH_CREATOR_PRICE_ID',
    stripeProductId: 'prod_REPLACE_WITH_CREATOR_PRODUCT_ID',
    description: '~22 Fotos o ~4 Videos',
    popular: false,
    active: true,
  },
  {
    packageId: 'pro',
    name: 'ONE LINK Pro',
    credits: 4000,
    priceUSD: 2500, // $25.00
    stripePriceId: 'price_REPLACE_WITH_PRO_PRICE_ID',
    stripeProductId: 'prod_REPLACE_WITH_PRO_PRODUCT_ID',
    description: '~40 Fotos o ~8 Videos',
    popular: true,
    active: true,
  },
  {
    packageId: 'ultra',
    name: 'ONE LINK Ultra',
    credits: 8000,
    priceUSD: 4500, // $45.00
    stripePriceId: 'price_REPLACE_WITH_ULTRA_PRICE_ID',
    stripeProductId: 'prod_REPLACE_WITH_ULTRA_PRODUCT_ID',
    description: '~80 Fotos o ~16 Videos',
    popular: false,
    active: true,
  },
];

async function seedPackages() {
  try {
    console.log('🌱 Seeding credit packages to model-credit-packages...\n');

    for (const pkg of packages) {
      const docRef = db.collection('model-credit-packages').doc(pkg.packageId);
      const existingDoc = await docRef.get();

      if (existingDoc.exists) {
        console.log(`⚠️  Package "${pkg.name}" exists, updating...`);
        await docRef.update({
          ...pkg,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        await docRef.set({
          ...pkg,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      console.log(`✅ ${pkg.name}: ${pkg.credits} credits for $${(pkg.priceUSD / 100).toFixed(2)}`);
      console.log(`   Price ID: ${pkg.stripePriceId}\n`);
    }

    console.log('🎉 Seed completed!\n');
    console.log(`📊 Total packages: ${packages.length}`);
    console.log(`⭐ Popular: ${packages.find(p => p.popular)?.name}`);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  }
}

seedPackages();
