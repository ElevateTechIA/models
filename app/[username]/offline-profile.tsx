"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useOfflineConfig } from "@/lib/pwa/use-offline-config";
import { setCachedConfig } from "@/lib/pwa/idb-store";
import { applyTheme, applyColorMode } from "@/lib/theme/colors";
import type { ThemeName, ColorMode } from "@/lib/theme/colors";
import LinksNav from "./links-nav";
import type { SiteConfig } from "@/lib/types";

interface Props {
  username: string;
  serverConfig: SiteConfig | null;
}

export default function OfflineProfile({ username, serverConfig }: Props) {
  const { config: offlineConfig, loading, isOffline, isCached } = useOfflineConfig(username);

  // If server provided config, store it in IndexedDB + apply theme
  useEffect(() => {
    if (serverConfig) {
      setCachedConfig(username, serverConfig);
    }
    const cfg = serverConfig || offlineConfig;
    if (cfg?.settings?.appTheme) {
      applyTheme(cfg.settings.appTheme as ThemeName);
    }
    if (cfg?.settings?.colorMode) {
      applyColorMode(cfg.settings.colorMode as ColorMode);
    }
  }, [username, serverConfig, offlineConfig]);

  // When server rendered successfully and we're online, return null
  // (the server HTML is already visible)
  if (serverConfig && !isOffline) {
    return null;
  }

  // Only render when offline or server failed (serverConfig is null)
  if (!serverConfig) {
    const config = offlineConfig;

    if (loading) {
      return (
        <div className="device-frame">
          <div className="device-notch" />
          <main className="page-wrapper" style={{ justifyContent: "center", alignItems: "center" }}>
            <div className="adm-spinner" />
          </main>
          <div className="device-home-indicator" />
        </div>
      );
    }

    if (!config) {
      return (
        <div className="device-frame">
          <div className="device-notch" />
          <main className="page-wrapper" style={{ justifyContent: "center", alignItems: "center" }}>
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "0 24px" }}>
              No hay datos guardados. Conecta a internet para ver este perfil.
            </p>
          </main>
          <div className="device-home-indicator" />
        </div>
      );
    }

    const enabledLinks = config.links.filter((l) => l.enabled);

    return (
      <>
        <div className="device-frame">
          <div className="device-notch" />
          <main className="page-wrapper">
            <div className="avatar-ring">
              {config.profile.picture ? (
                <Image
                  src={config.profile.picture}
                  alt={config.profile.name}
                  width={170}
                  height={170}
                  priority
                />
              ) : (
                <div
                  style={{
                    width: 170, height: 170, borderRadius: "50%",
                    background: "#e0d6cc", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: 64, color: "#8b7355",
                  }}
                >
                  {config.profile.name.charAt(0)}
                </div>
              )}
              <span className="badge">
                <svg viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </span>
            </div>

            <h2 className="name">{config.profile.name}</h2>
            <p className="subtitle">{config.profile.subtitle}</p>

            <LinksNav links={enabledLinks} />

            {config.settings.footerText && (
              <footer className="footer">{config.settings.footerText}</footer>
            )}
          </main>
          <div className="device-home-indicator" />
        </div>
        {isCached && <div className="offline-badge">Offline</div>}
      </>
    );
  }

  // isOffline but serverConfig exists — show offline badge on top of server HTML
  return isCached ? <div className="offline-badge">Offline</div> : null;
}
