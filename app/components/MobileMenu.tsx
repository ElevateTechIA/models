"use client";

import React from "react";
import Link from "next/link";
import type { Language, TranslationKeys } from "@/lib/translations";
import type { ToolbarFont } from "./AppToolbar";
import { themes, type ThemeName } from "@/lib/theme/colors";

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
  font?: ToolbarFont;
  onChangeFont?: (font: ToolbarFont) => void;
  theme?: ThemeName;
  onChangeTheme?: (theme: ThemeName) => void;
  colorMode?: "light" | "dark" | "auto";
  onChangeColorMode?: (mode: "light" | "dark" | "auto") => void;
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
  font = "elegant",
  onChangeFont,
  theme = "gold",
  onChangeTheme,
  colorMode = "light",
  onChangeColorMode,
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

        {/* Font */}
        {onChangeFont && (
          <>
            <div className="mmenu-divider" />
            <div className="mmenu-section">
              <p className="mmenu-section-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="4 7 4 4 20 4 20 7" />
                  <line x1="9" y1="20" x2="15" y2="20" />
                  <line x1="12" y1="4" x2="12" y2="20" />
                </svg>
                {language === "es" ? "TIPOGRAFIA" : "FONT"}
              </p>
              <div className="mmenu-font-grid">
                <button className={`mmenu-font-btn ${font === "gothic" ? "mmenu-font-active" : ""}`} onClick={() => onChangeFont("gothic")}>
                  <span className="mmenu-font-preview font-gothic">Aa</span>
                  <span className="mmenu-font-label">Gothic</span>
                </button>
                <button className={`mmenu-font-btn ${font === "elegant" ? "mmenu-font-active" : ""}`} onClick={() => onChangeFont("elegant")}>
                  <span className="mmenu-font-preview font-elegant">Aa</span>
                  <span className="mmenu-font-label">Elegant</span>
                </button>
                <button className={`mmenu-font-btn ${font === "clean" ? "mmenu-font-active" : ""}`} onClick={() => onChangeFont("clean")}>
                  <span className="mmenu-font-preview font-clean">Aa</span>
                  <span className="mmenu-font-label">Clean</span>
                </button>
                <button className={`mmenu-font-btn ${font === "haute" ? "mmenu-font-active" : ""}`} onClick={() => onChangeFont("haute")}>
                  <span className="mmenu-font-preview font-haute">Aa</span>
                  <span className="mmenu-font-label">Haute</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Theme */}
        {onChangeTheme && (
          <>
            <div className="mmenu-divider" />
            <div className="mmenu-section">
              <p className="mmenu-section-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
                {language === "es" ? "TEMA" : "THEME"}
              </p>
              <div className="mmenu-theme-grid">
                {(Object.keys(themes) as ThemeName[]).map((key) => (
                  <button
                    key={key}
                    className={`mmenu-theme-btn ${theme === key ? "mmenu-theme-active" : ""}`}
                    onClick={() => onChangeTheme(key)}
                    title={themes[key].name}
                  >
                    <span
                      className="mmenu-theme-swatch"
                      style={{ background: themes[key].colors.primary }}
                    />
                    <span className="mmenu-theme-emoji">{themes[key].emoji}</span>
                    <span className="mmenu-theme-label">{themes[key].name}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Color Mode */}
        {onChangeColorMode && (
          <>
            <div className="mmenu-divider" />
            <div className="mmenu-section">
              <p className="mmenu-section-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
                {language === "es" ? "MODO" : "MODE"}
              </p>
              <div className="mmenu-mode-grid">
                <button className={`mmenu-mode-btn ${colorMode === "light" ? "mmenu-mode-active" : ""}`} onClick={() => onChangeColorMode("light")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                  <span>Light</span>
                </button>
                <button className={`mmenu-mode-btn ${colorMode === "dark" ? "mmenu-mode-active" : ""}`} onClick={() => onChangeColorMode("dark")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                  <span>Dark</span>
                </button>
                <button className={`mmenu-mode-btn ${colorMode === "auto" ? "mmenu-mode-active" : ""}`} onClick={() => onChangeColorMode("auto")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20"/></svg>
                  <span>Auto</span>
                </button>
              </div>
            </div>
          </>
        )}

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
