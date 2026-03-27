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
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.iconWrap}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>

        <h1 style={styles.title}>
          Pago <span style={{ color: '#db2777' }}>Exitoso!</span>
        </h1>

        {loading ? (
          <div style={styles.loadingWrap}>
            <div style={styles.spinnerSmall} />
            <p style={{ color: '#9ca3af' }}>Cargando créditos...</p>
          </div>
        ) : (
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ color: '#9ca3af', marginBottom: '12px' }}>Ahora tienes</p>
            <div style={styles.creditsBadge}>
              <span style={{ fontSize: '2rem' }}>🪙</span>
              <span style={{ fontSize: '2rem', fontWeight: 900 }}>{credits?.toLocaleString()}</span>
              <span style={{ fontSize: '1rem', color: '#9ca3af' }}>créditos</span>
            </div>
          </div>
        )}

        <p style={styles.subtext}>Tus créditos ya están disponibles para usar.</p>

        <button onClick={() => router.push('/admin')} style={styles.mainBtn}>
          Empezar a Crear
        </button>

        <p style={styles.countdown}>
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
        <div style={styles.page}>
          <div style={styles.spinner} />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#050505',
    color: '#fff',
    fontFamily: "'Poppins', sans-serif",
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
  },
  container: {
    maxWidth: '420px',
    width: '100%',
    textAlign: 'center' as const,
  },
  iconWrap: {
    width: '96px',
    height: '96px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.15))',
    border: '2px solid rgba(34,197,94,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.5rem',
    animation: 'bounce 1s ease infinite',
  },
  title: {
    fontSize: 'clamp(1.8rem, 5vw, 2.5rem)',
    fontWeight: 900,
    textTransform: 'uppercase' as const,
    fontStyle: 'italic',
    marginBottom: '1rem',
  },
  loadingWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '1.5rem',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(219,39,119,0.3)',
    borderTopColor: '#db2777',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: 'auto',
  },
  spinnerSmall: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(156,163,175,0.3)',
    borderTopColor: '#9ca3af',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  creditsBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 32px',
    borderRadius: '1rem',
    background: 'linear-gradient(135deg, rgba(219,39,119,0.15), rgba(147,51,234,0.15))',
    border: '1px solid rgba(219,39,119,0.3)',
  },
  subtext: {
    color: '#6b7280',
    marginBottom: '2rem',
  },
  mainBtn: {
    width: '100%',
    padding: '16px',
    borderRadius: '1rem',
    border: 'none',
    fontWeight: 700,
    fontSize: '1rem',
    background: 'linear-gradient(135deg, #db2777, #9333ea)',
    color: '#fff',
    cursor: 'pointer',
    boxShadow: '0 8px 30px rgba(219,39,119,0.2)',
  },
  countdown: {
    fontSize: '0.85rem',
    color: '#6b7280',
    marginTop: '1rem',
  },
};
