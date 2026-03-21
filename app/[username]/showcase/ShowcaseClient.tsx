"use client";

import { useEffect, useState, useRef } from "react";
import type { SiteConfig, SiteLink, ShowcaseLayout, ShowcaseSection } from "@/lib/types";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { translations } from "@/lib/translations";
import CropModal from "@/app/components/CropModal";

interface Props {
  config: SiteConfig;
  username: string;
}

type CropTarget = { type: "profile" } | { type: "link"; linkId: string } | { type: "carousel" };

export default function ShowcaseClient({ config: initialConfig, username }: Props) {
  const [config, setConfig] = useState(initialConfig);
  const [isOwner, setIsOwner] = useState(false);
  const [toast, setToast] = useState("");

  const [mounted, setMounted] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingLinks, setLoadingLinks] = useState<Set<string>>(new Set());

  const [cropState, setCropState] = useState<{ file: File; target: CropTarget } | null>(null);
  const [cropFile, setCropFile] = useState<{ [key: string]: File }>({});
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const profilePicRef = useRef<HTMLInputElement>(null);
  const carouselInputRef = useRef<HTMLInputElement>(null);

  // Edit panel state
  const [showEditPanel, setShowEditPanel] = useState(false);

  // Drag reorder state
  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const linkDragIdx = useRef<number | null>(null);
  const [linkDragOverIdx, setLinkDragOverIdx] = useState<number | null>(null);

  const t = translations[config.settings.language] || translations.es;
  const layout: ShowcaseLayout = config.settings.showcaseLayout || "classic";
  const canEdit = mounted && isOwner;
  const enabledLinks = config.links.filter((l) => l.enabled);
  const carouselPhotos = config.settings.carouselPhotos || [];
  const defaultOrder: ShowcaseSection[] = ["hero", "links", "gallery"];
  const sectionOrder = config.settings.sectionOrder || defaultOrder;

  const sectionLabels: Record<ShowcaseSection, string> = {
    hero: "Foto de perfil",
    links: "Links",
    gallery: "Galeria",
  };

  async function moveSectionOrder(from: number, to: number) {
    if (from === to) return;
    const updated = [...sectionOrder];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setConfig((prev) => ({ ...prev, settings: { ...prev.settings, sectionOrder: updated } }));
    try {
      const tk = await getFreshToken();
      await fetch("/api/admin/config", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { sectionOrder: updated } }),
      });
    } catch {
      showToast(t.somethingWrong);
    }
  }

  async function reorderLinks(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    const reordered = [...enabledLinks];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const ids = reordered.map((l) => l.id);
    // Optimistic update
    const allLinks = [...config.links];
    const enabledReordered = ids.map((id) => allLinks.find((l) => l.id === id)!);
    const disabled = allLinks.filter((l) => !l.enabled);
    setConfig((prev) => ({ ...prev, links: [...enabledReordered, ...disabled] }));
    try {
      const tk = await getFreshToken();
      await fetch("/api/admin/links/reorder", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
    } catch {
      showToast(t.somethingWrong);
    }
  }

  async function changeLayout(newLayout: ShowcaseLayout) {
    try {
      const tk = await getFreshToken();
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { showcaseLayout: newLayout } }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setConfig(data);
    } catch {
      showToast(t.somethingWrong);
    }
  }

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

  useEffect(() => {
    setMounted(true);
    const storedUsername = localStorage.getItem("username");
    if (storedUsername !== username) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsOwner(!!user && storedUsername === username);
    });
    return () => unsubscribe();
  }, [username]);

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

  async function updateProfilePicture(picture: string, pictureAspect?: number) {
    setLoadingProfile(true);
    try {
      const tk = await getFreshToken();
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" },
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

  async function updateLinkPhoto(linkId: string, photo: string, photoAspect?: number) {
    setLoadingLinks((prev) => new Set(prev).add(linkId));
    try {
      const tk = await getFreshToken();
      const res = await fetch("/api/admin/links", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" },
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

  async function addCarouselPhoto(blob: Blob) {
    const path = await uploadCroppedBlob(blob, "carousel");
    if (!path) return;
    const updated = [...carouselPhotos, path];
    try {
      const tk = await getFreshToken();
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { carouselPhotos: updated } }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setConfig(data);
      showToast(t.saved);
    } catch {
      showToast(t.somethingWrong);
    }
  }

  async function reorderCarouselPhotos(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    const updated = [...carouselPhotos];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    // Optimistic update
    setConfig((prev) => ({ ...prev, settings: { ...prev.settings, carouselPhotos: updated } }));
    try {
      const tk = await getFreshToken();
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { carouselPhotos: updated } }),
      });
      if (!res.ok) throw new Error();
    } catch {
      showToast(t.somethingWrong);
    }
  }

  async function removeCarouselPhoto(index: number) {
    const updated = carouselPhotos.filter((_, i) => i !== index);
    try {
      const tk = await getFreshToken();
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { carouselPhotos: updated } }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setConfig(data);
      showToast(t.saved);
    } catch {
      showToast(t.somethingWrong);
    }
  }

  function handleProfileFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast(t.imageTooLarge); return; }
    setCropFile((prev) => ({ ...prev, __profile__: file }));
    setCropState({ file, target: { type: "profile" } });
    e.target.value = "";
  }

  function handleFileSelect(linkId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast(t.imageTooLarge); return; }
    setCropFile((prev) => ({ ...prev, [linkId]: file }));
    setCropState({ file, target: { type: "link", linkId } });
    e.target.value = "";
  }

  function handleCarouselFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast(t.imageTooLarge); return; }
    setCropState({ file, target: { type: "carousel" } });
    e.target.value = "";
  }

  async function handleCropConfirm(blob: Blob, aspectRatio?: number) {
    if (!cropState) return;
    const { target } = cropState;
    setCropState(null);

    if (target.type === "profile") {
      setLoadingProfile(true);
      const path = await uploadCroppedBlob(blob, "profile");
      if (path) await updateProfilePicture(path, aspectRatio);
      else setLoadingProfile(false);
    } else if (target.type === "link") {
      const linkId = target.linkId;
      setLoadingLinks((prev) => new Set(prev).add(linkId));
      const path = await uploadCroppedBlob(blob, "link-photo");
      if (path) await updateLinkPhoto(linkId, path, aspectRatio);
      else setLoadingLinks((prev) => { const next = new Set(prev); next.delete(linkId); return next; });
    } else if (target.type === "carousel") {
      await addCarouselPhoto(blob);
    }
  }

  function reCrop(key: string, target: CropTarget) {
    const file = cropFile[key];
    if (file) setCropState({ file, target });
  }

  function getCardStyle(link: SiteLink, _idx: number) {
    const aspect = link.photoAspect;
    const isFullWidth = aspect !== undefined && aspect >= 1.2;
    const style: React.CSSProperties = {};
    if (isFullWidth && aspect) style.aspectRatio = `${aspect}`;
    return {
      className: `sc-link-card${isFullWidth ? " sc-link-card-full" : ""}`,
      style,
    };
  }

  function getHeroStyle(): React.CSSProperties {
    const aspect = config.profile.pictureAspect;
    if (!aspect) return {};
    return { height: "auto", aspectRatio: `${aspect}`, minHeight: "320px", maxHeight: "100dvh" };
  }

  // ── Render link card (shared across layouts) ──
  function renderLinkCard(link: SiteLink, idx: number, variant: "grid" | "compact" | "horizontal" = "grid") {
    const isCardLoading = loadingLinks.has(link.id);
    const cardProps = variant === "grid" ? getCardStyle(link, idx) : {
      className: `sc-link-card${variant === "horizontal" ? " sc-link-card-horiz" : " sc-link-card-compact"}`,
      style: {} as React.CSSProperties,
    };

    const dragClass = linkDragOverIdx === idx ? " sc-link-card-dragover" : "";

    return (
      <div
        key={link.id}
        className={cardProps.className + dragClass}
        style={cardProps.style}
        draggable={canEdit || undefined}
        onDragStart={() => { linkDragIdx.current = idx; }}
        onDragOver={(e) => { e.preventDefault(); setLinkDragOverIdx(idx); }}
        onDragLeave={() => setLinkDragOverIdx(null)}
        onDrop={() => {
          if (linkDragIdx.current !== null) {
            reorderLinks(linkDragIdx.current, idx);
            linkDragIdx.current = null;
            setLinkDragOverIdx(null);
          }
        }}
        onDragEnd={() => { linkDragIdx.current = null; setLinkDragOverIdx(null); }}
      >
        {canEdit && (
          <input type="file" accept="image/*" style={{ display: "none" }}
            ref={(el) => { fileInputRefs.current[link.id] = el; }}
            onChange={(e) => handleFileSelect(link.id, e)}
          />
        )}
        <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ display: "contents" }}>
          {link.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={link.photo} alt={link.label} className="sc-card-img" />
          ) : (
            <div className="sc-card-no-photo">
              {canEdit && <span className="sc-card-placeholder">{t.replacePhoto}</span>}
            </div>
          )}
          <div className="sc-card-overlay" />
          <div className="sc-card-icon">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={link.icon} alt={link.label} />
          </div>
          <div className="sc-card-label">{link.label}</div>
        </a>
        {isCardLoading && (
          <div className="sc-loading-overlay">
            <div className="sc-spinner" />
            <span className="sc-loading-text">{t.updatingPhoto}</span>
          </div>
        )}
        {canEdit && !isCardLoading && (
          <div className="sc-card-edit-btns">
            <button className="sc-edit-btn" onClick={(e) => { e.stopPropagation(); fileInputRefs.current[link.id]?.click(); }} title={t.changePhoto}>
              {t.changePhoto}
            </button>
            {cropFile[link.id] && (
              <button className="sc-edit-btn" onClick={(e) => { e.stopPropagation(); reCrop(link.id, { type: "link", linkId: link.id }); }}>
                ✂ Recortar
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Gallery section (infinite scroll) ──
  function renderCarousel() {
    if (carouselPhotos.length === 0 && !canEdit) return null;

    const shouldAnimate = carouselPhotos.length >= 3 && !canEdit;

    return (
      <div className="sc-gallery">
        <div className={`sc-gallery-scroll${shouldAnimate ? " sc-gallery-infinite" : ""}`}>
          <div className="sc-gallery-track">
            {canEdit && (
              <div className="sc-gallery-add" onClick={() => carouselInputRef.current?.click()}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
            )}
            {carouselPhotos.map((photo, i) => (
              <div
                key={i}
                className={`sc-gallery-item${dragOverIdx === i ? " sc-gallery-item-dragover" : ""}`}
                draggable={canEdit || undefined}
                onDragStart={() => { dragIdx.current = i; }}
                onDragOver={(e) => { e.preventDefault(); setDragOverIdx(i); }}
                onDragLeave={() => setDragOverIdx(null)}
                onDrop={() => { if (dragIdx.current !== null) { reorderCarouselPhotos(dragIdx.current, i); dragIdx.current = null; setDragOverIdx(null); } }}
                onDragEnd={() => { dragIdx.current = null; setDragOverIdx(null); }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="" draggable={false} />
                {canEdit && (
                  <button className="sc-gallery-remove" onClick={() => removeCarouselPhoto(i)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
            ))}
            {shouldAnimate && carouselPhotos.map((photo, i) => (
              <div key={`clone-${i}`} className="sc-gallery-item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Section renderers per layout ──
  function renderHero() {
    if (layout === "compact") {
      return (
        <div className="sc-compact-header" key="hero">
          <div className="sc-compact-avatar-wrap">
            {config.profile.picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.profile.picture} alt={config.profile.name} className="sc-compact-avatar" />
            ) : (
              <div className="sc-compact-avatar sc-compact-avatar-placeholder">{config.profile.name.charAt(0)}</div>
            )}
            {canEdit && (
              <button className="sc-compact-avatar-edit" onClick={() => profilePicRef.current?.click()}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            )}
          </div>
          <div className="sc-compact-info">
            <div className="sc-compact-name">{config.profile.name}</div>
            {config.profile.subtitle && <div className="sc-compact-subtitle">{config.profile.subtitle}</div>}
          </div>
          <div className="sc-compact-social">
            {enabledLinks.slice(0, 4).map((link) => (
              <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="sc-social-btn sc-social-btn-sm" title={link.label}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={link.icon} alt={link.label} />
              </a>
            ))}
          </div>
        </div>
      );
    }

    const isImmersive = layout === "immersive";
    return (
      <div className={`sc-hero${isImmersive ? " sc-hero-immersive" : ""}`} style={getHeroStyle()} key="hero">
        {config.profile.picture && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={config.profile.picture} alt={config.profile.name} className="sc-hero-bg" />
        )}
        <div className="sc-hero-overlay" />
        {loadingProfile && <div className="sc-loading-overlay"><div className="sc-spinner" /><span className="sc-loading-text">{t.updatingPhoto}</span></div>}
        {canEdit && !loadingProfile && (
          <div className="sc-hero-edit-btns">
            <button className="sc-edit-btn" onClick={() => profilePicRef.current?.click()}>{t.changePicture}</button>
            {!isImmersive && cropFile.__profile__ && <button className="sc-edit-btn" onClick={() => reCrop("__profile__", { type: "profile" })}>✂ Recortar</button>}
          </div>
        )}
        <div className={`sc-hero-content${isImmersive ? " sc-hero-content-immersive" : ""}`}>
          <div className={`sc-name${isImmersive ? " sc-name-immersive" : ""}`}>{config.profile.name}</div>
          {!isImmersive && config.profile.subtitle && <div className="sc-handle">{config.profile.subtitle}</div>}
          {isImmersive ? (
            <div className="sc-immersive-social-col">
              {enabledLinks.slice(0, 4).map((link) => (
                <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="sc-social-btn" title={link.label}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={link.icon} alt={link.label} />
                </a>
              ))}
            </div>
          ) : (
            <>
              {enabledLinks.length > 0 && (
                <div className="sc-social-row">
                  {enabledLinks.slice(0, 6).map((link) => (
                    <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="sc-social-btn" title={link.label}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={link.icon} alt={link.label} />
                    </a>
                  ))}
                </div>
              )}
              <p className="sc-cta">Check my links</p>
            </>
          )}
        </div>
      </div>
    );
  }

  function renderLinks() {
    if (enabledLinks.length === 0) return null;
    if (layout === "immersive") {
      return (
        <div className="sc-links-horiz-scroll" key="links">
          {enabledLinks.map((link, idx) => renderLinkCard(link, idx, "horizontal"))}
        </div>
      );
    }
    const variant = layout === "compact" ? "compact" : "grid";
    return (
      <div className={`sc-links${layout === "compact" ? " sc-links-compact" : ""}`} key="links">
        {enabledLinks.map((link, idx) => renderLinkCard(link, idx, variant))}
      </div>
    );
  }

  function renderGallery() {
    return <div key="gallery">{renderCarousel()}</div>;
  }

  // ── Render section by key ──
  function renderSection(section: ShowcaseSection) {
    switch (section) {
      case "hero": return renderHero();
      case "links": return renderLinks();
      case "gallery": return renderGallery();
    }
  }

  if (!mounted) return <div className="sc-page" />;

  return (
    <div className={`sc-page sc-layout-${layout}`}>
      {cropState && <CropModal file={cropState.file} onConfirm={handleCropConfirm} onCancel={() => setCropState(null)} />}
      {toast && <div className="adm-toast">{toast}</div>}

      {canEdit && (
        <>
          <input type="file" accept="image/*" style={{ display: "none" }} ref={profilePicRef} onChange={handleProfileFileSelect} />
          <input type="file" accept="image/*" style={{ display: "none" }} ref={carouselInputRef} onChange={handleCarouselFileSelect} />
        </>
      )}

      {/* Floating edit button + panel — only for owner */}
      {canEdit && (
        <>
          <button className="sc-fab" onClick={() => setShowEditPanel(!showEditPanel)} title="Personalizar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {showEditPanel
                ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                : <><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></>
              }
            </svg>
          </button>

          {showEditPanel && (
            <div className="sc-edit-panel">
              <div className="sc-edit-panel-header">
                <span>Personalizar</span>
                <button className="sc-edit-panel-close" onClick={() => setShowEditPanel(false)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <div className="sc-edit-panel-section">
                <span className="sc-edit-panel-label">Layout</span>
                <div className="sc-layout-switcher">
                  <button className={`sc-layout-opt ${layout === "classic" ? "sc-layout-opt-active" : ""}`} onClick={() => changeLayout("classic")}>
                    <div className="sc-layout-thumb">
                      <div className="sc-lt-hero" />
                      <div className="sc-lt-name" />
                      <div className="sc-lt-cards"><div /><div /></div>
                    </div>
                    <span>Clasico</span>
                  </button>
                  <button className={`sc-layout-opt ${layout === "compact" ? "sc-layout-opt-active" : ""}`} onClick={() => changeLayout("compact")}>
                    <div className="sc-layout-thumb">
                      <div className="sc-lt-row"><div className="sc-lt-circle" /><div className="sc-lt-bar" /></div>
                      <div className="sc-lt-grid"><div /><div /></div>
                      <div className="sc-lt-strip" />
                    </div>
                    <span>Compacto</span>
                  </button>
                  <button className={`sc-layout-opt ${layout === "immersive" ? "sc-layout-opt-active" : ""}`} onClick={() => changeLayout("immersive")}>
                    <div className="sc-layout-thumb">
                      <div className="sc-lt-big" />
                      <div className="sc-lt-overlay-bar" />
                      <div className="sc-lt-hscroll"><div /><div /></div>
                    </div>
                    <span>Inmersivo</span>
                  </button>
                </div>
              </div>

              <div className="sc-edit-panel-section">
                <span className="sc-edit-panel-label">Orden de secciones</span>
                <div className="sc-section-order">
                  {sectionOrder.map((section, idx) => (
                    <div key={section} className="sc-section-order-item">
                      <span>{sectionLabels[section]}</span>
                      <div className="sc-section-order-btns">
                        <button
                          disabled={idx === 0}
                          onClick={() => moveSectionOrder(idx, idx - 1)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
                        </button>
                        <button
                          disabled={idx === sectionOrder.length - 1}
                          onClick={() => moveSectionOrder(idx, idx + 1)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {sectionOrder.map((section) => renderSection(section))}

      {config.settings.footerText && <div className="sc-footer">{config.settings.footerText}</div>}

      <div className="pearl-container">
        <a href="/login" className="pearl-btn" title="Acceder" aria-label="Acceder" />
        <span style={{ fontSize: "9px", color: "#b0a99a", opacity: 0.5, display: "block", textAlign: "center", marginTop: "-2px", letterSpacing: "0.5px" }}>v1.0.2</span>
      </div>
    </div>
  );
}
