'use client';

import React from 'react';

interface InsufficientCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBuyCredits: () => void;
}

export function InsufficientCreditsModal({
  isOpen,
  onClose,
  onBuyCredits,
}: InsufficientCreditsModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <style>{css}</style>
      <div className="icm-overlay">
        <div className="icm-backdrop" onClick={onClose} />
        <div className="icm-modal">
          <button onClick={onClose} className="icm-close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <div className="icm-content">
            <div className="icm-icon-wrap">
              <span style={{ fontSize: '2rem' }}>🪙</span>
            </div>

            <h2 className="icm-title">Sin Tokens</h2>

            <p className="icm-message">
              Necesitas tokens para generar contenido. Compra un paquete para continuar.
            </p>

            <div className="icm-actions">
              <button onClick={onBuyCredits} className="icm-buy-btn">
                Comprar Tokens
              </button>
              <button onClick={onClose} className="icm-cancel-btn">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const css = `
  .icm-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .icm-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
  }
  .icm-modal {
    position: relative;
    background: rgba(255, 255, 255, 0.95);
    border: 1.5px solid #d4b96a;
    border-radius: 20px;
    padding: 1.5rem;
    max-width: 360px;
    width: 100%;
    box-shadow: 0 20px 50px rgba(180, 160, 120, 0.3);
    backdrop-filter: blur(8px);
  }
  .icm-close {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.05);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #6b6b6b;
    transition: background 0.2s;
  }
  .icm-close:hover { background: rgba(0, 0, 0, 0.1); }
  .icm-content { text-align: center; }
  .icm-icon-wrap {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(201,168,76,0.15), rgba(232,213,160,0.2));
    border: 1.5px solid #d4b96a;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 12px;
  }
  .icm-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.3rem;
    font-weight: 700;
    color: #2d2d2d;
    margin-bottom: 8px;
  }
  .icm-message {
    color: #6b6b6b;
    font-size: 0.85rem;
    margin-bottom: 1.2rem;
    padding: 0 8px;
  }
  .icm-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .icm-buy-btn {
    padding: 12px 20px;
    border-radius: 50px;
    border: none;
    font-weight: 600;
    font-size: 0.9rem;
    background: linear-gradient(135deg, #c9a84c, #b8942f);
    color: #fff;
    cursor: pointer;
    font-family: 'Poppins', sans-serif;
    box-shadow: 0 4px 15px rgba(201, 168, 76, 0.3);
    transition: all 0.25s ease;
  }
  .icm-buy-btn:hover {
    box-shadow: 0 6px 20px rgba(201, 168, 76, 0.4);
    transform: translateY(-1px);
  }
  .icm-cancel-btn {
    padding: 10px 20px;
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
  .icm-cancel-btn:hover { color: #2d2d2d; }
`;
