import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const packagesSnapshot = await db
      .collection('model-credit-packages')
      .where('active', '==', true)
      .orderBy('priceUSD', 'asc')
      .get();

    const packages = packagesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        packageId: doc.id,
        name: data.name,
        credits: data.credits,
        priceUSD: data.priceUSD,
        stripePriceId: data.stripePriceId,
        description: data.description,
        popular: data.popular || false,
      };
    });

    return NextResponse.json({ packages });
  } catch (error: any) {
    console.error('❌ Error GET /api/credits/packages:', error.message);
    return NextResponse.json(
      { error: 'Error al obtener paquetes de créditos' },
      { status: 500 }
    );
  }
}
