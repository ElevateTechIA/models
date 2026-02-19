"use client";

import { useState, useEffect } from "react";
import type { SiteConfig } from "@/lib/types";
import { getCachedConfig, setCachedConfig } from "./idb-store";

interface UseOfflineConfigResult {
  config: SiteConfig | null;
  loading: boolean;
  isOffline: boolean;
  isCached: boolean;
}

export function useOfflineConfig(username: string): UseOfflineConfigResult {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [isCached, setIsCached] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      // 1. Try network first
      try {
        const res = await fetch(`/api/admin/config?username=${username}`);
        if (!res.ok) throw new Error("API error");
        const data: SiteConfig = await res.json();

        if (!cancelled) {
          setConfig(data);
          setLoading(false);
          setIsOffline(false);
          setIsCached(false);
        }

        // Store in IndexedDB for offline use
        await setCachedConfig(username, data);

        // Proactively cache profile picture and custom icons
        if ("caches" in window) {
          try {
            const imageCache = await caches.open("images-v1");
            // Cache profile picture
            if (data.profile.picture) {
              const existing = await imageCache.match(data.profile.picture);
              if (!existing) {
                const imgRes = await fetch(data.profile.picture);
                if (imgRes.ok) await imageCache.put(data.profile.picture, imgRes);
              }
            }
            // Cache custom link icons
            for (const link of data.links) {
              if (link.enabled && link.iconType === "custom" && link.icon) {
                const existing = await imageCache.match(link.icon);
                if (!existing) {
                  const iconRes = await fetch(link.icon);
                  if (iconRes.ok) await imageCache.put(link.icon, iconRes);
                }
              }
            }
          } catch {
            // Silently fail image caching
          }
        }
        return;
      } catch {
        // Network failed
      }

      // 2. Fall back to IndexedDB
      try {
        const cached = await getCachedConfig(username);
        if (cached && !cancelled) {
          setConfig(cached);
          setIsOffline(true);
          setIsCached(true);
          setLoading(false);
          return;
        }
      } catch {
        // IDB also failed
      }

      // 3. Nothing available
      if (!cancelled) {
        setLoading(false);
        setIsOffline(!navigator.onLine);
      }
    }

    loadConfig();

    function handleOnline() {
      setIsOffline(false);
      loadConfig();
    }
    function handleOffline() {
      setIsOffline(true);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [username]);

  return { config, loading, isOffline, isCached };
}
