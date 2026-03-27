import { NextRequest, NextResponse } from 'next/server';
import { db, verifyAuthWithUser } from '@/lib/firebase-admin';
import { stripe } from '@/lib/stripe/server';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const authResult = await verifyAuthWithUser(authHeader);

    if (!authResult) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { username, email } = authResult;
    const body = await request.json();
    const { packageId } = body;

    if (!packageId) {
      return NextResponse.json({ error: 'packageId es requerido' }, { status: 400 });
    }

    // Get the package from Firestore
    const packageDoc = await db.collection('model-credit-packages').doc(packageId).get();

    if (!packageDoc.exists) {
      return NextResponse.json({ error: 'Paquete no encontrado' }, { status: 404 });
    }

    const packageData = packageDoc.data()!;

    if (!packageData.active) {
      return NextResponse.json({ error: 'Paquete no disponible' }, { status: 400 });
    }

    // Get or create credits user doc
    const userCreditsRef = db.collection('user-credits').doc(username);
    let userDoc = await userCreditsRef.get();

    if (!userDoc.exists) {
      await userCreditsRef.set({
        username,
        email,
        credits: 0,
        totalCreditsEarned: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      userDoc = await userCreditsRef.get();
    }

    const userData = userDoc.data()!;

    // Create or get Stripe customer
    let stripeCustomerId = userData.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { username },
      });

      stripeCustomerId = customer.id;

      await userCreditsRef.update({
        stripeCustomerId,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // Create checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [
        {
          price: packageData.stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${appUrl}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/credits/cancel`,
      metadata: {
        username,
        packageId,
        credits: packageData.credits.toString(),
      },
    });

    // Save session to Firestore
    await db.collection('model-checkout-sessions').doc(session.id).set({
      sessionId: session.id,
      username,
      packageId,
      credits: packageData.credits,
      amountUSD: packageData.priceUSD,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('❌ Error POST /api/stripe/create-checkout-session:', error.message);
    return NextResponse.json(
      { error: 'Error creando sesión de checkout' },
      { status: 500 }
    );
  }
}
