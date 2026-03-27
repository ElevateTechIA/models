'use client';

import React from 'react';
import type { TranslationKeys } from '@/lib/translations';

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
  t: TranslationKeys;
}

export function CreditPackageCard({
  pkg,
  onSelect,
  loading = false,
  t,
}: CreditPackageCardProps) {
  const priceInDollars = (pkg.priceUSD / 100).toFixed(2);
  const pricePerCredit = (pkg.priceUSD / 100 / pkg.credits).toFixed(2);

  return (
    <>
      <style>{css}</style>
      <div className={`cpkg-card ${pkg.popular ? 'cpkg-popular' : ''}`}>
        {pkg.popular && <div className="cpkg-badge">Popular</div>}

        <div className="cpkg-icon-wrap">
          <span className="cpkg-icon">🪙</span>
        </div>

        <h3 className="cpkg-name">{pkg.name}</h3>

        <p className="cpkg-tokens">
          {pkg.credits.toLocaleString()} <span className="cpkg-tokens-label">{t.creditsLabel}</span>
        </p>

        <p className="cpkg-price">${priceInDollars}</p>
        <p className="cpkg-per-token">${pricePerCredit} {t.creditsPerCredit}</p>
        <p className="cpkg-desc">{pkg.description}</p>

        <button
          onClick={() => onSelect(pkg.packageId)}
          disabled={loading}
          className={`cpkg-btn ${pkg.popular ? 'cpkg-btn-primary' : ''}`}
          style={{ opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? t.creditsProcessing : t.creditsBuy}
        </button>
      </div>
    </>
  );
}

const css = `
  .cpkg-card {
    position: relative;
    border-radius: 20px;
    padding: 1.4rem;
    background: rgba(255, 255, 255, 0.85);
    border: 1.5px solid #d4b96a;
    text-align: center;
    box-shadow: 0 4px 20px rgba(180, 160, 120, 0.15);
    backdrop-filter: blur(8px);
    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }
  .cpkg-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(180, 160, 120, 0.25);
  }
  .cpkg-popular {
    border-color: #c9a84c;
    background: linear-gradient(180deg, rgba(201,168,76,0.08), rgba(232,213,160,0.12));
    transform: scale(1.02);
  }
  .cpkg-popular:hover { transform: scale(1.02) translateY(-2px); }
  .cpkg-badge {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    padding: 3px 16px;
    border-radius: 50px;
    background: linear-gradient(135deg, #c9a84c, #b8942f);
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #fff;
    font-family: 'Poppins', sans-serif;
  }
  .cpkg-icon-wrap {
    width: 50px;
    height: 50px;
    border-radius: 14px;
    background: linear-gradient(135deg, #c9a84c, #e8d5a0);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 10px;
  }
  .cpkg-icon { font-size: 1.4rem; }
  .cpkg-name {
    font-family: 'Playfair Display', serif;
    font-size: 1.1rem;
    font-weight: 700;
    color: #2d2d2d;
    margin-bottom: 4px;
  }
  .cpkg-tokens {
    font-size: 1.6rem;
    font-weight: 700;
    color: #2d2d2d;
    margin-bottom: 2px;
  }
  .cpkg-tokens-label {
    font-size: 0.8rem;
    color: #6b6b6b;
    font-weight: 400;
  }
  .cpkg-price {
    font-size: 1.3rem;
    font-weight: 600;
    color: #c9a84c;
    margin-bottom: 2px;
  }
  .cpkg-per-token {
    font-size: 0.68rem;
    color: #6b6b6b;
    margin-bottom: 8px;
  }
  .cpkg-desc {
    font-size: 0.8rem;
    color: #6b6b6b;
    margin-bottom: 1rem;
  }
  .cpkg-btn {
    width: 100%;
    padding: 12px;
    border-radius: 50px;
    border: 1.5px solid #d4b96a;
    background: rgba(255, 255, 255, 0.85);
    font-weight: 600;
    font-size: 0.85rem;
    color: #2d2d2d;
    cursor: pointer;
    font-family: 'Poppins', sans-serif;
    transition: all 0.25s ease;
  }
  .cpkg-btn:hover {
    background: #c9a84c;
    color: #fff;
    border-color: #c9a84c;
  }
  .cpkg-btn-primary {
    background: linear-gradient(135deg, #c9a84c, #b8942f);
    color: #fff;
    border-color: #c9a84c;
    box-shadow: 0 4px 15px rgba(201, 168, 76, 0.3);
  }
  .cpkg-btn-primary:hover {
    box-shadow: 0 6px 20px rgba(201, 168, 76, 0.4);
  }
`;
