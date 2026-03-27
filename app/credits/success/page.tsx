'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';

function SuccessContent() {
  const router = useRouter();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    loadCredits();

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          router.push('/admin');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const loadCredits = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/credits/balance', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setCredits(data.credits);
      }
    } catch (error) {
      console.error('Error loading credits:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Success icon */}
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-500/50 flex items-center justify-center mx-auto mb-6 animate-bounce">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>

        <h1 className="text-4xl font-black mb-4 uppercase italic">
          Pago <span className="text-pink-600">Exitoso!</span>
        </h1>

        {loading ? (
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400">Cargando créditos...</p>
          </div>
        ) : (
          <div className="mb-6">
            <p className="text-gray-400 mb-3">Ahora tienes</p>
            <div className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-pink-600/20 to-purple-600/20 border border-pink-500/30">
              <span className="text-4xl">🪙</span>
              <span className="text-4xl font-black">{credits?.toLocaleString()}</span>
              <span className="text-lg text-gray-400">créditos</span>
            </div>
          </div>
        )}

        <p className="text-gray-500 mb-8">
          Tus créditos ya están disponibles para usar.
        </p>

        <button
          onClick={() => router.push('/admin')}
          className="w-full px-6 py-4 rounded-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xl shadow-pink-500/20 hover:shadow-pink-500/30 transition-all active:scale-95"
        >
          Empezar a Crear
        </button>

        <p className="text-sm text-gray-500 mt-4">
          Redirigiendo en {countdown} segundos...
        </p>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
