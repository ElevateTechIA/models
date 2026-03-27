'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { CreditPackageCard } from '@/components/credits/CreditPackageCard';

interface CreditPackage {
  packageId: string;
  name: string;
  credits: number;
  priceUSD: number;
  description: string;
  popular: boolean;
}

export default function CreditsPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [currentCredits, setCurrentCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processingPackage, setProcessingPackage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      loadData();
    });
    return () => unsubscribe();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await auth.currentUser?.getIdToken();

      const [packagesRes, balanceRes] = await Promise.all([
        fetch('/api/credits/packages'),
        fetch('/api/credits/balance', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (packagesRes.ok) {
        const data = await packagesRes.json();
        setPackages(data.packages || []);
      }

      if (balanceRes.ok) {
        const data = await balanceRes.json();
        setCurrentCredits(data.credits || 0);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyPackage = async (packageId: string) => {
    try {
      setProcessingPackage(packageId);
      const token = await auth.currentUser?.getIdToken();

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ packageId }),
      });

      if (!response.ok) throw new Error('Error creando sesión de checkout');

      const { url } = await response.json();
      if (url) window.location.href = url;
    } catch (error) {
      console.error('Error en compra:', error);
      alert('Error al procesar la compra. Intenta de nuevo.');
      setProcessingPackage(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans">
      <div className="max-w-md mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 sm:mb-8 active:scale-95"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">Volver</span>
        </button>

        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tighter mb-3 sm:mb-4 uppercase italic">
            Comprar <span className="text-pink-600">Créditos</span>
          </h1>
          <p className="text-gray-400 text-base sm:text-lg mb-4 sm:mb-6 px-4">
            Elige el paquete perfecto para ti
          </p>

          {/* Current balance */}
          <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-gradient-to-r from-pink-600/20 to-purple-600/20 border border-pink-500/30">
            <span className="text-xl sm:text-2xl">🪙</span>
            <span className="text-sm sm:text-lg">
              Tienes <span className="font-bold">{currentCredits.toLocaleString()}</span> créditos
            </span>
          </div>
        </div>

        {/* Packages grid */}
        {packages.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <p>No hay paquetes disponibles en este momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {packages.map((pkg) => (
              <CreditPackageCard
                key={pkg.packageId}
                pkg={pkg}
                onSelect={handleBuyPackage}
                loading={processingPackage === pkg.packageId}
              />
            ))}
          </div>
        )}

        {/* Footer note */}
        <div className="text-center mt-8 sm:mt-12 text-xs sm:text-sm text-gray-500 px-4">
          <p>Pagos procesados de forma segura por Stripe</p>
          <p className="mt-1">Los créditos no caducan y puedes usarlos en cualquier momento</p>
        </div>
      </div>
    </div>
  );
}
