"use client";

import { useEffect, useState, useRef } from "react";
import type { SiteConfig, SiteLink } from "@/lib/types";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { translations } from "@/lib/translations";
import CropModal from "@/app/components/CropModal";

interface Props {
  config: SiteConfig;
  username: string;
}

type CropTarget = { type: "profile" } | { type: "link"; linkId: string };

export default function ShowcaseClient({ config: initialConfig, username }: Props) {
  const [config, setConfig] = useState(initialConfig);
  const [isOwner, setIsOwner] = useState(false);
  const [toast, setToast] = useState("");

  // Loading state: tracks which items are being uploaded
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingLinks, setLoadingLinks] = useState<Set<string>>(new Set());

  // Crop state
  const [cropState, setCropState] = useState<{ file: File; target: CropTarget } | null>(null);
  const [cropFile, setCropFile] = useState<{ [key: string]: File }>({});
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const profilePicRef = useRef<HTMLInputElement>(null);

  const t = translations[config.settings.language] || translations.es;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function getFreshToken(): Promise<string | null> {
    try {
      return (await auth.currentUser?.getIdToken()) ?? null;
    } catch {
      return null;
    }
  }

  // Check if current user owns this showcase
  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername !== username) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsOwner(!!user && storedUsername === username);
    });
    return () => unsubscribe();
  }, [username]);

  // Upload cropped blob
  async function uploadCroppedBlob(blob: Blob, type: string): Promise<string | null> {
    const formData = new FormData();
    formData.append("file", new File([blob], "cropped.jpg", { type: "image/jpeg" }));
    formData.append("type", type);
    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${await getFreshToken()}` },
        body: formData,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      return data.path as string;
    } catch {
      showToast(t.somethingWrong);
      return null;
    }
  }

  // Save updated profile picture + aspect to API
  async function updateProfilePicture(picture: string, pictureAspect?: number) {
    setLoadingProfile(true);
    try {
      const tk = await getFreshToken();
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tk}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profile: { picture, pictureAspect } }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setConfig(data);
      showToast(t.saved);
    } catch {
      showToast(t.somethingWrong);
    } finally {
      setLoadingProfile(false);
    }
  }

  // Save updated link photo + aspect to API
  async function updateLinkPhoto(linkId: string, photo: string, photoAspect?: number) {
    setLoadingLinks((prev) => new Set(prev).add(linkId));
    try {
      const tk = await getFreshToken();
      const res = await fetch("/api/admin/links", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tk}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: linkId, photo, photoAspect }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setConfig((prev) => ({ ...prev, links: data.links }));
      showToast(t.saved);
    } catch {
      showToast(t.somethingWrong);
    } finally {
      setLoadingLinks((prev) => {
        const next = new Set(prev);
        next.delete(linkId);
        return next;
      });
    }
  }

  // Handle file pick for profile
  function handleProfileFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast(t.imageTooLarge); return; }
    setCropFile((prev) => ({ ...prev, __profile__: file }));
    setCropState({ file, target: { type: "profile" } });
    e.target.value = "";
  }

  // Handle file pick for a link
  function handleFileSelect(linkId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast(t.imageTooLarge); return; }
    setCropFile((prev) => ({ ...prev, [linkId]: file }));
    setCropState({ file, target: { type: "link", linkId } });
    e.target.value = "";
  }

  // Handle crop confirm
  async function handleCropConfirm(blob: Blob, aspectRatio?: number) {
    if (!cropState) return;
    const { target } = cropState;
    setCropState(null);

    if (target.type === "profile") {
      setLoadingProfile(true);
      const path = await uploadCroppedBlob(blob, "profile");
      if (path) {
        await updateProfilePicture(path, aspectRatio);
      } else {
        setLoadingProfile(false);
      }
    } else {
      const linkId = target.linkId;
      setLoadingLinks((prev) => new Set(prev).add(linkId));
      const path = await uploadCroppedBlob(blob, "link-photo");
      if (path) {
        await updateLinkPhoto(linkId, path, aspectRatio);
      } else {
        setLoadingLinks((prev) => {
          const next = new Set(prev);
          next.delete(linkId);
          return next;
        });
      }
    }
  }

  // Re-crop existing file
  function reCrop(key: string, target: CropTarget) {
    const file = cropFile[key];
    if (file) {
      setCropState({ file, target });
    }
  }

  // Get card style based on aspect ratio
  function getCardStyle(link: SiteLink, idx: number) {
    const aspect = link.photoAspect;
    // Full width: first card always, or any card with wide crop (>=1.2)
    const isFullWidth = idx === 0 || (aspect !== undefined && aspect >= 1.2);
    const style: React.CSSProperties = {};
    if (aspect) {
      style.aspectRatio = `${aspect}`;
    }
    return {
      className: `sc-link-card${isFullWidth ? " sc-link-card-full" : ""}`,
      style,
    };
  }

  // Hero style based on profile picture aspect
  function getHeroStyle(): React.CSSProperties {
    const aspect = config.profile.pictureAspect;
    if (!aspect) return {};
    return {
      height: "auto",
      aspectRatio: `${aspect}`,
      minHeight: "320px",
      maxHeight: "100dvh",
    };
  }

  const enabledLinks = config.links.filter((l) => l.enabled);

  return (
    <div className="sc-page">
      {/* Crop Modal */}
      {cropState && (
        <CropModal
          file={cropState.file}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropState(null)}
        />
      )}

      {/* Toast */}
      {toast && <div className="adm-toast">{toast}</div>}

      {/* Hidden file inputs — only mount after client-side auth */}
      {isOwner && (
        <input
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          ref={profilePicRef}
          onChange={handleProfileFileSelect}
        />
      )}

      {/* Hero section */}
      <div className="sc-hero" style={getHeroStyle()}>
        {config.profile.picture && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={config.profile.picture}
            alt={config.profile.name}
            className="sc-hero-bg"
          />
        )}
        <div className="sc-hero-overlay" />

        {/* Loading overlay for hero */}
        {loadingProfile && (
          <div className="sc-loading-overlay">
            <div className="sc-spinner" />
            <span className="sc-loading-text">{t.updatingPhoto}</span>
          </div>
        )}

        {/* Edit profile picture button — only for owner */}
        {isOwner && !loadingProfile && (
          <div className="sc-hero-edit-btns">
            <button
              className="sc-edit-btn"
              onClick={() => profilePicRef.current?.click()}
            >
              {t.changePicture}
            </button>
            {cropFile.__profile__ && (
              <button
                className="sc-edit-btn"
                onClick={() => reCrop("__profile__", { type: "profile" })}
              >
                ✂ Recortar
              </button>
            )}
          </div>
        )}

        <div className="sc-hero-content">
          <div className="sc-name">{config.profile.name}</div>
          {config.profile.subtitle && (
            <div className="sc-handle">{config.profile.subtitle}</div>
          )}
          {enabledLinks.length > 0 && (
            <div className="sc-social-row">
              {enabledLinks.slice(0, 6).map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sc-social-btn"
                  title={link.label}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={link.icon} alt={link.label} />
                </a>
              ))}
            </div>
          )}
          <p className="sc-cta">Check my links</p>
        </div>
      </div>

      {/* Links grid */}
      {enabledLinks.length > 0 && (
        <div className="sc-links">
          {enabledLinks.map((link, idx) => {
            const cardProps = getCardStyle(link, idx);
            const isCardLoading = loadingLinks.has(link.id);
            return (
              <div key={link.id} className={cardProps.className} style={cardProps.style}>
                {/* Hidden file input per card — only after auth */}
                {isOwner && (
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    ref={(el) => { fileInputRefs.current[link.id] = el; }}
                    onChange={(e) => handleFileSelect(link.id, e)}
                  />
                )}

                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "contents" }}
                >
                  {link.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={link.photo} alt={link.label} className="sc-card-img" />
                  ) : (
                    <div className="sc-card-no-photo">
                      {isOwner && (
                        <span className="sc-card-placeholder">{t.replacePhoto}</span>
                      )}
                    </div>
                  )}
                  <div className="sc-card-overlay" />
                  <div className="sc-card-icon">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={link.icon} alt={link.label} />
                  </div>
                  <div className="sc-card-label">{link.label}</div>
                </a>

                {/* Loading overlay for card */}
                {isCardLoading && (
                  <div className="sc-loading-overlay">
                    <div className="sc-spinner" />
                    <span className="sc-loading-text">{t.updatingPhoto}</span>
                  </div>
                )}

                {/* Edit buttons — only for owner, hide while loading */}
                {isOwner && !isCardLoading && (
                  <div className="sc-card-edit-btns">
                    <button
                      className="sc-edit-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRefs.current[link.id]?.click();
                      }}
                      title={t.changePhoto}
                    >
                      {t.changePhoto}
                    </button>
                    {cropFile[link.id] && (
                      <button
                        className="sc-edit-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          reCrop(link.id, { type: "link", linkId: link.id });
                        }}
                      >
                        ✂ Recortar
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {config.settings.footerText && (
        <div className="sc-footer">{config.settings.footerText}</div>
      )}
    </div>
  );
}
