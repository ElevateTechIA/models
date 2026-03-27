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
    <div style={styles.overlay}>
      <div style={styles.backdrop} onClick={onClose} />
      <div style={styles.modal}>
        <button onClick={onClose} style={styles.closeBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#9ca3af' }}>
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div style={styles.content}>
          <div style={styles.iconWrap}>
            <span style={{ fontSize: '2.2rem' }}>🪙</span>
          </div>

          <h2 style={styles.title}>Sin Créditos</h2>

          <p style={styles.message}>
            Necesitas créditos para generar contenido. Compra un paquete para continuar.
          </p>

          <div style={styles.actions}>
            <button onClick={onBuyCredits} style={styles.buyBtn}>
              Comprar Créditos
            </button>
            <button onClick={onClose} style={styles.cancelBtn}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px',
  },
  backdrop: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(4px)',
  },
  modal: {
    position: 'relative',
    background: 'linear-gradient(180deg, #111827, #000)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '1.2rem',
    padding: '1.5rem',
    maxWidth: '380px',
    width: '100%',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
  },
  closeBtn: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.05)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  content: {
    textAlign: 'center' as const,
  },
  iconWrap: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(219,39,119,0.2), rgba(147,51,234,0.2))',
    border: '1px solid rgba(219,39,119,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 14px',
  },
  title: {
    fontSize: '1.4rem',
    fontWeight: 900,
    textTransform: 'uppercase' as const,
    fontStyle: 'italic',
    marginBottom: '8px',
    color: '#fff',
  },
  message: {
    color: '#9ca3af',
    fontSize: '0.85rem',
    marginBottom: '1.5rem',
    padding: '0 8px',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  buyBtn: {
    padding: '14px 20px',
    borderRadius: '14px',
    border: 'none',
    fontWeight: 700,
    fontSize: '0.9rem',
    background: 'linear-gradient(135deg, #db2777, #9333ea)',
    color: '#fff',
    cursor: 'pointer',
    boxShadow: '0 8px 30px rgba(219, 39, 119, 0.2)',
  },
  cancelBtn: {
    padding: '10px 20px',
    borderRadius: '14px',
    border: 'none',
    background: 'none',
    fontWeight: 500,
    fontSize: '0.9rem',
    color: '#9ca3af',
    cursor: 'pointer',
  },
};
