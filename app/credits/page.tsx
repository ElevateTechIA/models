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
      <div className="credits-page">
        <div className="credits-spinner" />
        <style>{cssText}</style>
      </div>
    );
  }

  return (
    <div className="credits-page">
      <style>{cssText}</style>
      <div className="credits-container">
        <button onClick={() => router.back()} className="credits-back-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Volver
        </button>

        <div className="credits-header">
          <h1 className="credits-title">Comprar Tokens</h1>
          <p className="credits-subtitle">Elige el paquete perfecto para ti</p>

          <div className="credits-balance-badge">
            <span className="credits-coin">🪙</span>
            Tienes <strong>{currentCredits.toLocaleString()}</strong> tokens
          </div>
        </div>

        {packages.length === 0 ? (
          <div className="credits-empty">
            <p>No hay paquetes disponibles en este momento.</p>
          </div>
        ) : (
          <div className="credits-grid">
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

        <div className="credits-footer">
          <p>Pagos procesados de forma segura por Stripe</p>
          <p>Los tokens no caducan y puedes usarlos en cualquier momento</p>
        </div>
      </div>
    </div>
  );
}

const cssText = `
  .credits-page {
    min-height: 100vh;
    background: linear-gradient(180deg, #fdfcfa 0%, #f3efe8 50%, #fdfcfa 100%);
    font-family: 'Poppins', sans-serif;
    color: #2d2d2d;
    display: flex;
    justify-content: center;
  }
  .credits-container {
    max-width: 460px;
    width: 100%;
    padding: 2rem 1.2rem 3rem;
  }
  .credits-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e8d5a0;
    border-top-color: #c9a84c;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: auto;
  }
  .credits-back-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    color: #6b6b6b;
    font-size: 0.875rem;
    font-family: 'Poppins', sans-serif;
    cursor: pointer;
    margin-bottom: 1.5rem;
    padding: 0;
    transition: color 0.2s;
  }
  .credits-back-btn:hover { color: #2d2d2d; }
  .credits-header {
    text-align: center;
    margin-bottom: 2rem;
  }
  .credits-title {
    font-family: 'Playfair Display', serif;
    font-size: clamp(1.8rem, 5vw, 2.4rem);
    font-weight: 700;
    color: #2d2d2d;
    margin-bottom: 0.4rem;
  }
  .credits-subtitle {
    color: #6b6b6b;
    font-size: 0.95rem;
    margin-bottom: 1.2rem;
  }
  .credits-balance-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border-radius: 50px;
    background: rgba(255,255,255,0.85);
    border: 1.5px solid #d4b96a;
    font-size: 0.9rem;
    box-shadow: 0 4px 20px rgba(180,160,120,0.15);
    backdrop-filter: blur(8px);
  }
  .credits-coin { font-size: 1.2rem; }
  .credits-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .credits-empty {
    text-align: center;
    color: #6b6b6b;
    padding: 3rem 0;
  }
  .credits-footer {
    text-align: center;
    margin-top: 2rem;
    font-size: 0.75rem;
    color: #6b6b6b;
    line-height: 1.6;
  }
`;
