import { Timestamp } from 'firebase-admin/firestore';

export interface CreditUser {
  username: string;
  email: string;
  credits: number;
  totalCreditsEarned: number;
  stripeCustomerId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreditPackage {
  packageId: string;
  name: string;
  credits: number;
  priceUSD: number; // In cents (800 = $8.00)
  stripePriceId: string;
  stripeProductId: string;
  description: string;
  popular: boolean;
  active: boolean;
  createdAt: Timestamp;
}

export interface Transaction {
  transactionId: string;
  username: string;
  type: 'purchase' | 'usage' | 'bonus';
  credits: number; // Positive for purchase, negative for usage
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  metadata?: {
    packageId?: string;
    sessionId?: string;
    generationId?: string;
  };
  createdAt: Timestamp;
}

export interface CheckoutSession {
  sessionId: string;
  username: string;
  packageId: string;
  credits: number;
  amountUSD: number; // In cents
  status: 'pending' | 'completed' | 'expired';
  createdAt: Timestamp;
  completedAt?: Timestamp;
}
