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

      await userCreditsRef.set({
        username,
        email,
        credits: welcomeCredits,
        totalCreditsEarned: welcomeCredits,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Create welcome bonus transaction
      await db.collection('model-transactions').add({
        username,
        type: 'bonus',
        credits: welcomeCredits,
        balanceBefore: 0,
        balanceAfter: welcomeCredits,
        description: 'Créditos de bienvenida',
        createdAt: FieldValue.serverTimestamp(),
      });

      console.log(`✅ New credits user: ${username} with ${welcomeCredits} credits`);

      return NextResponse.json({ credits: welcomeCredits, username });
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
