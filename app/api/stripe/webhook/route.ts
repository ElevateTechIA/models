import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import Stripe from 'stripe';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'checkout.session.expired':
        await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
        break;
      default:
        console.log(`Unhandled event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error(`❌ Error processing webhook ${event.type}:`, error.message);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { id: sessionId, metadata } = session;

  if (!metadata?.username || !metadata?.packageId) {
    console.error('❌ Missing metadata in checkout session:', sessionId);
    return;
  }

  const { username, packageId } = metadata;

  // All checks + credit grant inside ONE transaction to prevent double-processing
  await db.runTransaction(async (transaction) => {
    const sessionRef = db.collection('model-checkout-sessions').doc(sessionId);
    const sessionDoc = await transaction.get(sessionRef);

    // Session must exist and be pending — if already completed, skip (idempotent)
    if (!sessionDoc.exists) return;
    if (sessionDoc.data()!.status === 'completed') return;

    // Verify credits from the checkout session doc (set at creation time from DB),
    // NOT from Stripe metadata which could theoretically be tampered with
    const credits = sessionDoc.data()!.credits;
    if (!credits || typeof credits !== 'number' || credits <= 0) {
      console.error('❌ Invalid credits in session doc:', sessionId, credits);
      return;
    }

    const userRef = db.collection('user-credits').doc(username);
    const userDoc = await transaction.get(userRef);

    if (!userDoc.exists) {
      throw new Error(`User ${username} not found`);
    }

    const currentCredits = userDoc.data()!.credits || 0;
    const newCredits = currentCredits + credits;

    // Update user credits
    transaction.update(userRef, {
      credits: newCredits,
      totalCreditsEarned: FieldValue.increment(credits),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Create transaction record
    const transactionRef = db.collection('model-transactions').doc();
    transaction.set(transactionRef, {
      username,
      type: 'purchase',
      credits,
      balanceBefore: currentCredits,
      balanceAfter: newCredits,
      description: `Compra de paquete: ${packageId}`,
      metadata: { packageId, sessionId },
      createdAt: FieldValue.serverTimestamp(),
    });

    // Mark session as completed (inside transaction = atomic with credit grant)
    transaction.update(sessionRef, {
      status: 'completed',
      completedAt: FieldValue.serverTimestamp(),
    });

    console.log(`✅ Credits granted: ${username} now has ${newCredits} (+${credits})`);
  });
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const { id: sessionId } = session;
  await db.collection('model-checkout-sessions').doc(sessionId).update({
    status: 'expired',
  });
}
