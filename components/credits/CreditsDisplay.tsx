'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface CreditsDisplayProps {
  credits: number;
  loading: boolean;
}

export function CreditsDisplay({ credits, loading }: CreditsDisplayProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
        <span className="text-sm text-gray-400 animate-pulse">...</span>
      </div>
    );
  }

  return (
    <button
      onClick={() => router.push('/credits')}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-600/20 to-purple-600/20 border border-pink-500/30 hover:from-pink-600/30 hover:to-purple-600/30 transition-all active:scale-95"
      title="Comprar créditos"
    >
      <span className="text-lg">🪙</span>
      <span className="text-sm font-bold text-white">{credits}</span>
    </button>
  );
}
