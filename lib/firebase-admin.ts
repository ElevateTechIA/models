import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

if (getApps().length === 0) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}"
  );

  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

export const adminAuth = getAuth();
export const db = getFirestore();
export const bucket = getStorage().bucket();

/**
 * Verifies a Firebase ID token and returns the email.
 */
export async function verifyAuth(
  authHeader: string | null
): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const email = decoded.email;
    if (!email) {
      console.error("[verifyAuth] No email in decoded token");
      return null;
    }
    return email;
  } catch (err) {
    console.error("[verifyAuth] Token verification failed:", err);
    return null;
  }
}

/**
 * Verifies a Firebase ID token AND resolves the user to their registered
 * username. Returns { email, username } or null.
 */
export async function verifyAuthWithUser(
  authHeader: string | null
): Promise<{ email: string; username: string } | null> {
  // Import dynamically to avoid circular dependency
  const { findUserByEmail } = await import("@/lib/data");

  const email = await verifyAuth(authHeader);
  if (!email) return null;

  const user = await findUserByEmail(email);
  if (!user) {
    console.error("[verifyAuthWithUser] User not registered:", email);
    return null;
  }

  return { email: user.email, username: user.username };
}
