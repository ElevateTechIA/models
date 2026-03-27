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

  return (
    <div
      className={`relative rounded-2xl sm:rounded-3xl p-5 sm:p-6 border transition-all ${
        pkg.popular
          ? 'bg-gradient-to-b from-pink-600/10 to-purple-600/10 border-pink-500/50 sm:scale-105'
          : 'bg-white/5 border-white/10 hover:border-white/20'
      }`}
    >
      {pkg.popular && (
        <div className="absolute -top-2.5 sm:-top-3 left-1/2 -translate-x-1/2 px-3 sm:px-4 py-0.5 sm:py-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-[10px] sm:text-xs font-black uppercase tracking-wider text-white">
          Popular
        </div>
      )}

      <div className="text-center">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center mx-auto mb-3 sm:mb-4">
          <span className="text-2xl sm:text-3xl">🪙</span>
        </div>

        <h3 className="text-lg sm:text-xl font-black uppercase italic mb-1">{pkg.name}</h3>

        <p className="text-3xl sm:text-4xl font-black mb-1.5 sm:mb-2">
          {pkg.credits.toLocaleString()}{' '}
          <span className="text-sm sm:text-base text-gray-400">créditos</span>
        </p>

        <p className="text-2xl sm:text-3xl font-bold mb-0.5 sm:mb-1">${priceInDollars}</p>

        <p className="text-[10px] sm:text-xs text-gray-500 mb-3 sm:mb-4">
          ${pricePerCredit} por crédito
        </p>

        <p className="text-xs sm:text-sm text-gray-400 mb-4 sm:mb-6">{pkg.description}</p>

        <button
          onClick={() => onSelect(pkg.packageId)}
          disabled={loading}
          className={`w-full px-5 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base transition-all ${
            pkg.popular
              ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xl shadow-pink-500/20 hover:shadow-pink-500/30'
              : 'bg-white/10 text-white hover:bg-white/20'
          } active:scale-95 flex items-center justify-center gap-2 ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'Procesando...' : 'Comprar'}
        </button>
      </div>
    </div>
  );
}
