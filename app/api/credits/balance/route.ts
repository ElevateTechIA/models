import { NextRequest, NextResponse } from 'next/server';
import { db, verifyAuthWithUser } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const authResult = await verifyAuthWithUser(authHeader);

    if (!authResult) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { username, email } = authResult;
    const userCreditsRef = db.collection('user-credits').doc(username);
    const userDoc = await userCreditsRef.get();

    // If user doesn't have a credits doc yet, create with welcome credits
    if (!userDoc.exists) {
      const welcomeCredits = parseInt(process.env.WELCOME_CREDITS || '100');

      // Check if this device already claimed welcome credits
      const deviceId = request.headers.get('x-device-id');
      let deviceAlreadyClaimed = false;
      if (deviceId) {
        const deviceDoc = await db.collection('device-claims').doc(deviceId).get();
        deviceAlreadyClaimed = deviceDoc.exists;
      }

      const creditsToGrant = deviceAlreadyClaimed ? 0 : welcomeCredits;

      await userCreditsRef.set({
        username,
        email,
        credits: creditsToGrant,
        totalCreditsEarned: creditsToGrant,
        deviceId: deviceId || null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Create welcome bonus transaction (only if credits granted)
      if (creditsToGrant > 0) {
        await db.collection('model-transactions').add({
          username,
          type: 'bonus',
          credits: creditsToGrant,
          balanceBefore: 0,
          balanceAfter: creditsToGrant,
          description: 'Créditos de bienvenida',
          createdAt: FieldValue.serverTimestamp(),
        });

        // Mark device as claimed
        if (deviceId) {
          await db.collection('device-claims').doc(deviceId).set({
            username,
            email,
            claimedAt: new Date().toISOString(),
          });
        }

        console.log(`✅ New credits user: ${username} with ${creditsToGrant} credits`);
      } else {
        console.log(`⚠️ Device already claimed credits. ${username} gets 0 welcome credits (deviceId: ${deviceId})`);
      }

      return NextResponse.json({ credits: creditsToGrant, username });
    }

    const userData = userDoc.data();
    return NextResponse.json({
      credits: userData?.credits || 0,
      username,
    });
  } catch (error: any) {
    console.error('❌ Error GET /api/credits/balance:', error.message);
    return NextResponse.json(
      { error: 'Error al obtener balance de créditos' },
      { status: 500 }
    );
  }
}
