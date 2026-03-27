'use client';

import React from 'react';

interface CreditPackage {
  packageId: string;
  name: string;
  credits: number;
  priceUSD: number;
  description: string;
  popular: boolean;
}

interface CreditPackageCardProps {
  pkg: CreditPackage;
  onSelect: (packageId: string) => void;
  loading?: boolean;
}

export function CreditPackageCard({
  pkg,
  onSelect,
  loading = false,
}: CreditPackageCardProps) {
  const priceInDollars = (pkg.priceUSD / 100).toFixed(2);
  const pricePerCredit = (pkg.priceUSD / 100 / pkg.credits).toFixed(2);

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    borderRadius: '1.2rem',
    padding: '1.5rem',
    border: pkg.popular
      ? '1px solid rgba(219, 39, 119, 0.5)'
      : '1px solid rgba(255, 255, 255, 0.1)',
    background: pkg.popular
      ? 'linear-gradient(180deg, rgba(219,39,119,0.1), rgba(147,51,234,0.1))'
      : 'rgba(255, 255, 255, 0.05)',
    textAlign: 'center',
    transition: 'border-color 0.2s',
    transform: pkg.popular ? 'scale(1.03)' : undefined,
  };

  return (
    <div style={cardStyle}>
      {pkg.popular && (
        <div style={styles.popularBadge}>Popular</div>
      )}

      <div style={styles.iconWrap}>
        <span style={{ fontSize: '1.6rem' }}>🪙</span>
      </div>

      <h3 style={styles.name}>{pkg.name}</h3>

      <p style={styles.credits}>
        {pkg.credits.toLocaleString()}{' '}
        <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>créditos</span>
      </p>

      <p style={styles.price}>${priceInDollars}</p>

      <p style={styles.perCredit}>${pricePerCredit} por crédito</p>

      <p style={styles.description}>{pkg.description}</p>

      <button
        onClick={() => onSelect(pkg.packageId)}
        disabled={loading}
        style={{
          ...styles.button,
          background: pkg.popular
            ? 'linear-gradient(135deg, #db2777, #9333ea)'
            : 'rgba(255, 255, 255, 0.1)',
          opacity: loading ? 0.5 : 1,
          cursor: loading ? 'not-allowed' : 'pointer',
          boxShadow: pkg.popular ? '0 8px 30px rgba(219, 39, 119, 0.2)' : 'none',
        }}
      >
        {loading ? 'Procesando...' : 'Comprar'}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  popularBadge: {
    position: 'absolute',
    top: '-10px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '3px 14px',
    borderRadius: '100px',
    background: 'linear-gradient(135deg, #ec4899, #9333ea)',
    fontSize: '0.65rem',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#fff',
  },
  iconWrap: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #ec4899, #9333ea)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 12px',
  },
  name: {
    fontSize: '1.1rem',
    fontWeight: 900,
    textTransform: 'uppercase',
    fontStyle: 'italic',
    marginBottom: '4px',
  },
  credits: {
    fontSize: '1.8rem',
    fontWeight: 900,
    marginBottom: '4px',
  },
  price: {
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: '2px',
  },
  perCredit: {
    fontSize: '0.7rem',
    color: '#6b7280',
    marginBottom: '10px',
  },
  description: {
    fontSize: '0.85rem',
    color: '#9ca3af',
    marginBottom: '1.2rem',
  },
  button: {
    width: '100%',
    padding: '14px',
    borderRadius: '14px',
    border: 'none',
    fontWeight: 700,
    fontSize: '0.9rem',
    color: '#fff',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
};
