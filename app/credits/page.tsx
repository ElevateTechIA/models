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
      <div style={styles.page}>
        <div style={styles.spinner} />
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <button onClick={() => router.back()} style={styles.backBtn}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>Volver</span>
        </button>

        <div style={styles.header}>
          <h1 style={styles.title}>
            Comprar <span style={{ color: '#db2777' }}>Créditos</span>
          </h1>
          <p style={styles.subtitle}>Elige el paquete perfecto para ti</p>

          <div style={styles.balanceBadge}>
            <span style={{ fontSize: '1.4rem' }}>🪙</span>
            <span>
              Tienes <strong>{currentCredits.toLocaleString()}</strong> créditos
            </span>
          </div>
        </div>

        {packages.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No hay paquetes disponibles en este momento.</p>
          </div>
        ) : (
          <div style={styles.grid}>
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

        <div style={styles.footer}>
          <p>Pagos procesados de forma segura por Stripe</p>
          <p style={{ marginTop: '4px' }}>Los créditos no caducan y puedes usarlos en cualquier momento</p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#050505',
    color: '#fff',
    fontFamily: "'Poppins', sans-serif",
    display: 'flex',
    justifyContent: 'center',
  },
  container: {
    maxWidth: '460px',
    width: '100%',
    padding: '2rem 1.2rem 3rem',
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid rgba(219, 39, 119, 0.3)',
    borderTopColor: '#db2777',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: 'auto',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    fontSize: '0.875rem',
    cursor: 'pointer',
    marginBottom: '1.5rem',
    padding: 0,
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '2rem',
  },
  title: {
    fontSize: 'clamp(1.8rem, 5vw, 2.8rem)',
    fontWeight: 900,
    letterSpacing: '-0.03em',
    textTransform: 'uppercase' as const,
    fontStyle: 'italic',
    marginBottom: '0.5rem',
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: '1rem',
    marginBottom: '1.2rem',
  },
  balanceBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 20px',
    borderRadius: '100px',
    background: 'linear-gradient(135deg, rgba(219,39,119,0.15), rgba(147,51,234,0.15))',
    border: '1px solid rgba(219,39,119,0.3)',
    fontSize: '0.95rem',
  },
  grid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.2rem',
  },
  emptyState: {
    textAlign: 'center' as const,
    color: '#6b7280',
    padding: '3rem 0',
  },
  footer: {
    textAlign: 'center' as const,
    marginTop: '2.5rem',
    fontSize: '0.8rem',
    color: '#6b7280',
  },
};
