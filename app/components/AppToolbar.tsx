"use client";

import React, { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

interface AppToolbarProps {
  username: string | null;
  onMenuClick: () => void;
}

export default function AppToolbar({ username, onMenuClick }: AppToolbarProps) {
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
      {/* Left: Logo + Name */}
      <a href={username ? `/${username}` : "/"} className="toolbar-brand">
        <div className="toolbar-logo">✦</div>
        <span className="toolbar-name">ONE LINK</span>
      </a>

      {/* Right: Actions */}
      <div className="toolbar-actions">
        {/* Gallery button */}
        <a href="/photos" className="toolbar-icon-btn" title="Photos">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
