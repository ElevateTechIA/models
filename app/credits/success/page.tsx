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
    <div className="cs-page">
      <style>{css}</style>
      <div className="cs-container">
        <div className="cs-icon-wrap">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>

        <h1 className="cs-title">Pago Exitoso!</h1>

        {loading ? (
          <div className="cs-loading">
            <div className="credits-spinner" />
            <p>Cargando tokens...</p>
          </div>
        ) : (
          <div className="cs-balance-section">
            <p className="cs-label">Ahora tienes</p>
            <div className="cs-balance-badge">
              <span style={{ fontSize: '1.8rem' }}>🪙</span>
              <span className="cs-balance-num">{credits?.toLocaleString()}</span>
              <span className="cs-balance-label">tokens</span>
            </div>
          </div>
        )}

        <p className="cs-subtext">Tus tokens ya están disponibles para usar.</p>

        <button onClick={() => router.push('/admin')} className="cs-main-btn">
          Empezar a Crear
        </button>

        <p className="cs-countdown">
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
        <div className="cs-page">
          <style>{css}</style>
          <div className="credits-spinner" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}

const css = `
  .cs-page {
    min-height: 100vh;
    background: linear-gradient(180deg, #fdfcfa 0%, #f3efe8 50%, #fdfcfa 100%);
    font-family: 'Poppins', sans-serif;
    color: #2d2d2d;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
  }
  .cs-container {
    max-width: 420px;
    width: 100%;
    text-align: center;
  }
  .cs-icon-wrap {
    width: 88px;
    height: 88px;
    border-radius: 50%;
    background: rgba(34, 197, 94, 0.08);
    border: 2px solid rgba(34, 197, 94, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1.5rem;
    animation: bounce 1s ease infinite;
  }
  .cs-title {
    font-family: 'Playfair Display', serif;
    font-size: clamp(1.6rem, 5vw, 2.2rem);
    font-weight: 700;
    color: #2d2d2d;
    margin-bottom: 1.2rem;
  }
  .cs-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-bottom: 1.5rem;
    color: #6b6b6b;
    font-size: 0.9rem;
  }
  .cs-balance-section { margin-bottom: 1.5rem; }
  .cs-label {
    color: #6b6b6b;
    margin-bottom: 10px;
    font-size: 0.9rem;
  }
  .cs-balance-badge {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 14px 28px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.85);
    border: 1.5px solid #d4b96a;
    box-shadow: 0 4px 20px rgba(180, 160, 120, 0.15);
    backdrop-filter: blur(8px);
  }
  .cs-balance-num {
    font-size: 1.8rem;
    font-weight: 700;
    color: #c9a84c;
  }
  .cs-balance-label {
    font-size: 0.9rem;
    color: #6b6b6b;
  }
  .cs-subtext {
    color: #6b6b6b;
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
  }
  .cs-main-btn {
    width: 100%;
    padding: 14px;
    border-radius: 50px;
    border: none;
    font-weight: 600;
    font-size: 0.95rem;
    background: linear-gradient(135deg, #c9a84c, #b8942f);
    color: #fff;
    cursor: pointer;
    font-family: 'Poppins', sans-serif;
    box-shadow: 0 4px 15px rgba(201, 168, 76, 0.3);
    transition: all 0.25s ease;
  }
  .cs-main-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(201, 168, 76, 0.4);
  }
  .cs-countdown {
    font-size: 0.8rem;
    color: #6b6b6b;
    margin-top: 1rem;
  }
  .credits-spinner {
    width: 36px;
    height: 36px;
    border: 3px solid #e8d5a0;
    border-top-color: #c9a84c;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: auto;
  }
`;
