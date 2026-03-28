"use client";

import React, { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

export type ToolbarFont = "gothic" | "elegant" | "clean";

interface AppToolbarProps {
  username: string | null;
  onMenuClick: () => void;
  font?: ToolbarFont;
}

export default function AppToolbar({ username, onMenuClick, font = "elegant" }: AppToolbarProps) {
  const [tokens, setTokens] = useState<number | null>(null);
  const [loadingTokens, setLoadingTokens] = useState(true);

  useEffect(() => {
    fetchTokens();
  }, []);

  async function fetchTokens() {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const res = await fetch("/api/credits/balance", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTokens(data.credits ?? 0);
      }
    } catch {
    } finally {
      setLoadingTokens(false);
    }
  }

  return (
    <div className="toolbar">
      {/* Left: Logo + Name — logo jumps to random page */}
      <div className="toolbar-brand">
        <div
          className="toolbar-logo toolbar-logo-jump"
          onClick={() => {
            if (!username) return;
            const pages = [`/${username}`, `/${username}/showcase`];
            window.location.href = pages[Math.floor(Math.random() * pages.length)];
          }}
          role="button"
          tabIndex={0}
        >✦</div>
        <a href={username ? `/${username}` : "/"} className="toolbar-brand-link">
          <span className={`toolbar-name font-${font}`}>ONE LINK</span>
        </a>
      </div>

      {/* Right: Actions */}
      <div className="toolbar-actions">
        {/* Gallery button */}
        <a href="/photos" className="toolbar-icon-btn" title="Photos">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </a>

        {/* Wall button */}
        <a href="/wall" className="toolbar-icon-btn" title="Wall">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </a>

        {/* Tokens display */}
        <a href="/credits" className="toolbar-tokens">
          <span className="toolbar-coin">🪙</span>
          <span className="toolbar-token-count">
            {loadingTokens ? "..." : tokens?.toLocaleString() ?? "0"}
          </span>
        </a>

        {/* Menu button */}
        <button className="toolbar-icon-btn" onClick={onMenuClick} title="Menu">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
