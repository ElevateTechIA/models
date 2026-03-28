"use client";

import React from "react";
import Link from "next/link";
import type { Language, TranslationKeys } from "@/lib/translations";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  username: string | null;
  email: string | null;
  profilePicture: string | null;
  language: Language;
  onChangeLanguage: (lang: Language) => void;
  onLogout: () => void;
  t: TranslationKeys;
}

export default function MobileMenu({
  isOpen,
  onClose,
  username,
  email,
  profilePicture,
  language,
  onChangeLanguage,
  onLogout,
  t,
}: MobileMenuProps) {
  if (!isOpen) return null;

  const navItems = [
    { href: "/photos", label: t.menuPhotoStudio, icon: "camera" },
    { href: "/credits", label: t.menuTokens, icon: "coin" },
    { href: username ? `/${username}` : "/", label: t.menuViewSite, icon: "eye" },
    { href: username ? `/${username}/showcase` : "/", label: t.menuShowcase, icon: "grid" },
  ];

  const icons: Record<string, React.ReactNode> = {
    camera: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
    coin: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v12M8 10h8M8 14h8" />
      </svg>
    ),
    eye: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    grid: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  };

  return (
    <>
      <div className="mmenu-backdrop" onClick={onClose} />
      <div className="mmenu">
        {/* Header */}
        <div className="mmenu-header">
          <h2 className="mmenu-title">{t.menuTitle}</h2>
          <button className="mmenu-close" onClick={onClose}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User info */}
        <div className="mmenu-user">
          <div className="mmenu-avatar">
            {profilePicture ? (
              <img src={profilePicture} alt="" />
            ) : (
              <span>{(username || "U")[0].toUpperCase()}</span>
            )}
          </div>
          <div className="mmenu-user-info">
            <p className="mmenu-user-name">{username || "Usuario"}</p>
            <p className="mmenu-user-email">{email || ""}</p>
          </div>
        </div>

        <div className="mmenu-divider" />

        {/* Navigation */}
        <div className="mmenu-nav">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="mmenu-nav-item" onClick={onClose}>
              <span className="mmenu-nav-icon">{icons[item.icon]}</span>
              {item.label}
            </Link>
          ))}
        </div>

        <div className="mmenu-divider" />

        {/* Language */}
        <div className="mmenu-section">
          <p className="mmenu-section-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            {t.menuLanguage}
          </p>
          <div className="mmenu-lang-grid">
            <button
              className={`mmenu-lang-btn ${language === "es" ? "mmenu-lang-active" : ""}`}
              onClick={() => onChangeLanguage("es")}
            >
              🇪🇸 ES
            </button>
            <button
              className={`mmenu-lang-btn ${language === "en" ? "mmenu-lang-active" : ""}`}
              onClick={() => onChangeLanguage("en")}
            >
              🇺🇸 EN
            </button>
          </div>
          <p className="mmenu-version">v1.0.2</p>
        </div>

        {/* Logout */}
        <button className="mmenu-logout" onClick={onLogout}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {t.menuLogout}
        </button>
      </div>
    </>
  );
}
