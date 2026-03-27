'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function CancelPage() {
  const router = useRouter();

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.iconWrap}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
        </div>

        <h1 style={styles.title}>
          Pago <span style={{ color: '#6b7280' }}>Cancelado</span>
        </h1>

        <p style={styles.message}>
          No se realizó ningún cargo. Puedes intentar de nuevo cuando quieras.
        </p>

        <div style={styles.actions}>
          <button onClick={() => router.push('/credits')} style={styles.retryBtn}>
            Volver a Intentar
          </button>

          <button onClick={() => router.push('/admin')} style={styles.backBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Volver al Inicio
          </button>
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
    background: 'linear-gradient(135deg, rgba(107,114,128,0.15), rgba(75,85,99,0.15))',
    border: '2px solid rgba(107,114,128,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.5rem',
  },
  title: {
    fontSize: 'clamp(1.8rem, 5vw, 2.5rem)',
    fontWeight: 900,
    textTransform: 'uppercase' as const,
    fontStyle: 'italic',
    marginBottom: '1rem',
  },
  message: {
    color: '#9ca3af',
    marginBottom: '2rem',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  retryBtn: {
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
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '12px',
    borderRadius: '1rem',
    border: 'none',
    background: 'none',
    fontWeight: 500,
    fontSize: '0.9rem',
    color: '#9ca3af',
    cursor: 'pointer',
  },
};
