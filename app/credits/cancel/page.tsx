'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function CancelPage() {
  const router = useRouter();

  return (
    <div className="cc-page">
      <style>{css}</style>
      <div className="cc-container">
        <div className="cc-icon-wrap">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#6b6b6b" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
        </div>

        <h1 className="cc-title">Pago Cancelado</h1>

        <p className="cc-message">
          No se realizó ningún cargo. Puedes intentar de nuevo cuando quieras.
        </p>

        <div className="cc-actions">
          <button onClick={() => router.push('/credits')} className="cc-retry-btn">
            Volver a Intentar
          </button>

          <button onClick={() => router.push('/admin')} className="cc-back-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Volver al Inicio
          </button>
        </div>
      </div>
    </div>
  );
}

const css = `
  .cc-page {
    min-height: 100vh;
    background: linear-gradient(180deg, #fdfcfa 0%, #f3efe8 50%, #fdfcfa 100%);
    font-family: 'Poppins', sans-serif;
    color: #2d2d2d;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
  }
  .cc-container {
    max-width: 420px;
    width: 100%;
    text-align: center;
  }
  .cc-icon-wrap {
    width: 88px;
    height: 88px;
    border-radius: 50%;
    background: rgba(107, 107, 107, 0.06);
    border: 2px solid rgba(107, 107, 107, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1.5rem;
  }
  .cc-title {
    font-family: 'Playfair Display', serif;
    font-size: clamp(1.6rem, 5vw, 2.2rem);
    font-weight: 700;
    color: #2d2d2d;
    margin-bottom: 1rem;
  }
  .cc-message {
    color: #6b6b6b;
    margin-bottom: 2rem;
    font-size: 0.9rem;
  }
  .cc-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .cc-retry-btn {
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
  .cc-retry-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(201, 168, 76, 0.4);
  }
  .cc-back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    padding: 12px;
    border-radius: 50px;
    border: none;
    background: none;
    font-weight: 500;
    font-size: 0.85rem;
    color: #6b6b6b;
    cursor: pointer;
    font-family: 'Poppins', sans-serif;
    transition: color 0.2s;
  }
  .cc-back-btn:hover { color: #2d2d2d; }
`;
