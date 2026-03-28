import { NextRequest, NextResponse } from "next/server";
import { db, verifyAuthWithUser } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const ADMIN_USERNAMES = ["cesarvegacol"];

// POST — gift credits to all registered users
export async function POST(req: NextRequest) {
  const authed = await verifyAuthWithUser(req.headers.get("authorization"));
  if (!authed || !ADMIN_USERNAMES.includes(authed.username))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amount, description } = await req.json();
  const giftAmount = amount || 1000;
  const giftDescription = description || "Gift from the creator 🎁";

  // Get all registered users
  const usersSnap = await db.collection("users").get();
  const usernames = usersSnap.docs.map((doc) => doc.id);

  let gifted = 0;

  for (const username of usernames) {
    const creditRef = db.collection("user-credits").doc(username);

    await db.runTransaction(async (transaction) => {
      const creditDoc = await transaction.get(creditRef);
      const currentCredits = creditDoc.exists ? (creditDoc.data()!.credits || 0) : 0;
      const newCredits = currentCredits + giftAmount;

      if (creditDoc.exists) {
        transaction.update(creditRef, {
          credits: newCredits,
          totalCreditsEarned: FieldValue.increment(giftAmount),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        transaction.set(creditRef, {
          username,
          credits: newCredits,
          totalCreditsEarned: giftAmount,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      // Log transaction
      const txRef = db.collection("model-transactions").doc();
      transaction.set(txRef, {
        username,
        type: "bonus",
        credits: giftAmount,
        balanceBefore: currentCredits,
        balanceAfter: newCredits,
        description: giftDescription,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    gifted++;
  }

  return NextResponse.json({ success: true, gifted, amount: giftAmount, description: giftDescription });
}
