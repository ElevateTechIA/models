"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import type { SiteConfig, SiteLink } from "@/lib/types";
import { auth } from "@/lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { PRESET_ICONS } from "@/lib/preset-icons";
import { translations, type Language } from "@/lib/translations";
import CropModal from "@/app/components/CropModal";
import AppToolbar from "@/app/components/AppToolbar";
import MobileMenu from "@/app/components/MobileMenu";

export default function AdminPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  // Config state
  const [config, setConfig] = useState<SiteConfig | null>(null);

  // Profile state
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [picture, setPicture] = useState("");
  const [pictureAspect, setPictureAspect] = useState<number | undefined>();
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const profilePicRef = useRef<HTMLInputElement>(null);

  // Links state
  const [links, setLinks] = useState<SiteLink[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newIcon, setNewIcon] = useState(PRESET_ICONS[0].path);
  const [newIconType, setNewIconType] = useState<"preset" | "custom">("preset");
  const newIconFileRef = useRef<HTMLInputElement>(null);

  // Edit link state
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editIconType, setEditIconType] = useState<"preset" | "custom">("preset");
  const editIconFileRef = useRef<HTMLInputElement>(null);

  // Link photo state (for showcase page)
  const [newLinkPhoto, setNewLinkPhoto] = useState("");
  const [newLinkPhotoAspect, setNewLinkPhotoAspect] = useState<number | undefined>();
  const [editLinkPhoto, setEditLinkPhoto] = useState("");
  const [editLinkPhotoAspect, setEditLinkPhotoAspect] = useState<number | undefined>();
  const newLinkPhotoRef = useRef<HTMLInputElement>(null);
  const editLinkPhotoRef = useRef<HTMLInputElement>(null);

  // Crop modal state
  type CropTarget = "profile" | "new-link-photo" | "edit-link-photo";
  const [cropState, setCropState] = useState<{ file: File; target: CropTarget } | null>(null);
  // Store original files to allow re-cropping anytime
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [newLinkPhotoFile, setNewLinkPhotoFile] = useState<File | null>(null);
  const [editLinkPhotoFile, setEditLinkPhotoFile] = useState<File | null>(null);

  // Settings state
  const [language, setLanguage] = useState<Language>("es");
  const [toolbarFont, setToolbarFont] = useState<"gothic" | "elegant" | "clean">("elegant");
  const [appTheme, setAppTheme] = useState<string>("gold");
  const [colorMode, setColorMode] = useState<"light" | "dark" | "auto">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("color-mode");
      if (saved === "dark" || saved === "auto") return saved;
    }
    return "light";
  });
  const [footerText, setFooterText] = useState("");
  const [showcaseLayout, setShowcaseLayout] = useState<"classic" | "compact" | "immersive">("classic");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Menu state
  const [showMenu, setShowMenu] = useState(false);

  // QR modal state
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // Translation
  const t = translations[language] || translations.es;

  // Show toast
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  // Always get a fresh token — Firebase refreshes it automatically
  async function getFreshToken(): Promise<string | null> {
    try {
      return (await auth.currentUser?.getIdToken()) ?? null;
    } catch {
      return null;
    }
  }

  async function authHeaders() {
    const tk = await getFreshToken();
    return {
      Authorization: `Bearer ${tk}`,
      "Content-Type": "application/json",
    };
  }

  // ── Auth check + load config ──────────────────────
  useEffect(() => {
    const un = localStorage.getItem("username");
    if (!un) {
      router.push("/login");
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (!user) {
        localStorage.removeItem("firebase-token");
        localStorage.removeItem("username");
        router.push("/login");
        return;
      }

      // Get a fresh token (Firebase handles refresh automatically)
      const freshToken = await user.getIdToken();
      localStorage.setItem("firebase-token", freshToken);
      setToken(freshToken);
      setUsername(un);

      try {
        const res = await fetch(`/api/admin/config?username=${un}`);
        if (!res.ok) throw new Error("not found");
        const data: SiteConfig = await res.json();
        setConfig(data);
        setName(data.profile.name);
        setSubtitle(data.profile.subtitle);
        setPicture(data.profile.picture);
        setPictureAspect(data.profile.pictureAspect);
        setLinks(data.links);
        setLanguage(data.settings.language);
        setToolbarFont(data.settings.toolbarFont || "elegant");
        const theme = data.settings.appTheme || "gold";
        const localMode = typeof window !== "undefined" ? localStorage.getItem("color-mode") : null;
        const mode = data.settings.colorMode || (localMode as "light" | "dark" | "auto") || "light";
        setAppTheme(theme);
        setColorMode(mode);
        import("@/lib/theme/colors").then(m => { m.applyTheme(theme as any); m.applyColorMode(mode); });
        setFooterText(data.settings.footerText);
        setShowcaseLayout(data.settings.showcaseLayout || "classic");
        setLoading(false);
      } catch {
        localStorage.removeItem("firebase-token");
        localStorage.removeItem("username");
        router.push("/login");
      }
    });
  }, [router]);

  // ── Profile save ──────────────────────────────────
  async function saveProfile() {
    if (!auth.currentUser) return;
    setSavingProfile(true);
    setProfileSaved(false);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: await authHeaders(),
        body: JSON.stringify({
          profile: { name, subtitle, picture, pictureAspect },
        }),
      });
      if (!res.ok) throw new Error();
      setProfileSaved(true);
      showToast(t.saved);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch {
      showToast(t.somethingWrong);
    } finally {
      setSavingProfile(false);
    }
  }

  // ── Profile picture upload → opens crop modal ─────
  function handleProfilePicUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;
    if (file.size > 5 * 1024 * 1024) { showToast(t.imageTooLarge); return; }
    setProfilePicFile(file);
    setCropState({ file, target: "profile" });
    e.target.value = ""; // reset so same file can be picked again
  }

  // ── Add link ──────────────────────────────────────
  async function addLink() {
    if (!auth.currentUser || !newLabel || !newUrl) return;
    try {
      const res = await fetch("/api/admin/links", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          icon: newIcon,
          iconType: newIconType,
          label: newLabel,
          url: newUrl,
          enabled: true,
          ...(newLinkPhoto ? { photo: newLinkPhoto, photoAspect: newLinkPhotoAspect } : {}),
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLinks(data.links);
      setNewLabel("");
      setNewUrl("");
      setNewIcon(PRESET_ICONS[0].path);
      setNewIconType("preset");
      setNewLinkPhoto("");
      setNewLinkPhotoAspect(undefined);
      setShowAddForm(false);
      showToast(t.saved);
    } catch {
      showToast(t.somethingWrong);
    }
  }

  // ── Toggle link ───────────────────────────────────
  async function toggleLink(link: SiteLink) {
    if (!auth.currentUser) return;
    try {
      const res = await fetch("/api/admin/links", {
        method: "PUT",
        headers: await authHeaders(),
        body: JSON.stringify({ id: link.id, enabled: !link.enabled }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLinks(data.links);
    } catch {
      showToast(t.somethingWrong);
    }
  }

  // ── Delete link ───────────────────────────────────
  function deleteLink(id: string) {
    if (!auth.currentUser) return;
    setConfirmModal({
      message: t.confirmDelete,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const res = await fetch(`/api/admin/links?id=${id}`, {
            method: "DELETE",
            headers: await authHeaders(),
          });
          if (!res.ok) throw new Error();
          const data = await res.json();
          setLinks(data.links);
          showToast(t.saved);
        } catch {
          showToast(t.somethingWrong);
        }
      },
    });
  }

  // ── Start edit link ───────────────────────────────
  function startEditLink(link: SiteLink) {
    setEditingLinkId(link.id);
    setEditLabel(link.label);
    setEditUrl(link.url);
    setEditIcon(link.icon);
    setEditIconType(link.iconType);
    setEditLinkPhoto(link.photo || "");
    setEditLinkPhotoAspect(link.photoAspect);
    setEditLinkPhotoFile(null);
  }

  // ── Save edited link ──────────────────────────────
  async function saveEditLink() {
    if (!auth.currentUser || !editingLinkId) return;
    try {
      const res = await fetch("/api/admin/links", {
        method: "PUT",
        headers: await authHeaders(),
        body: JSON.stringify({
          id: editingLinkId,
          label: editLabel,
          url: editUrl,
          icon: editIcon,
          iconType: editIconType,
          photo: editLinkPhoto,
          photoAspect: editLinkPhotoAspect,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLinks(data.links);
      setEditingLinkId(null);
      showToast(t.saved);
    } catch {
      showToast(t.somethingWrong);
    }
  }

  // ── Reorder links ─────────────────────────────────
  async function reorderLinks(idx: number, dir: "up" | "down") {
    if (!auth.currentUser) return;
    const newLinks = [...links];
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    [newLinks[idx], newLinks[swapIdx]] = [newLinks[swapIdx], newLinks[idx]];
    setLinks(newLinks);
    try {
      await fetch("/api/admin/links/reorder", {
        method: "PUT",
        headers: await authHeaders(),
        body: JSON.stringify({ ids: newLinks.map((l) => l.id) }),
      });
    } catch {
      showToast(t.somethingWrong);
    }
  }

  // ── Custom icon upload (for add form) ─────────────
  async function handleNewIconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast(t.imageTooLarge);
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "icon");
    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${await getFreshToken()}` },
        body: formData,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNewIcon(data.path);
      setNewIconType("custom");
    } catch {
      showToast(t.somethingWrong);
    }
  }

  // ── Custom icon upload (for edit form) ────────────
  async function handleEditIconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast(t.imageTooLarge);
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "icon");
    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${await getFreshToken()}` },
        body: formData,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEditIcon(data.path);
      setEditIconType("custom");
    } catch {
      showToast(t.somethingWrong);
    }
  }

  // ── Link photo (new form) → opens crop modal ──────
  function handleNewLinkPhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;
    if (file.size > 5 * 1024 * 1024) { showToast(t.imageTooLarge); return; }
    setNewLinkPhotoFile(file);
    setCropState({ file, target: "new-link-photo" });
    e.target.value = "";
  }

  // ── Link photo (edit form) → opens crop modal ─────
  function handleEditLinkPhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;
    if (file.size > 5 * 1024 * 1024) { showToast(t.imageTooLarge); return; }
    setEditLinkPhotoFile(file);
    setCropState({ file, target: "edit-link-photo" });
    e.target.value = "";
  }

  // ── Upload a cropped blob to Firebase Storage ─────
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

  // ── Crop confirm: upload cropped result ───────────
  async function handleCropConfirm(blob: Blob, aspectRatio?: number) {
    if (!cropState) return;
    const { target } = cropState;
    setCropState(null);
    switch (target) {
      case "profile": {
        const path = await uploadCroppedBlob(blob, "profile");
        if (path) { setPicture(path); setPictureAspect(aspectRatio); showToast(t.saved); }
        break;
      }
      case "new-link-photo": {
        const path = await uploadCroppedBlob(blob, "link-photo");
        if (path) { setNewLinkPhoto(path); setNewLinkPhotoAspect(aspectRatio); }
        break;
      }
      case "edit-link-photo": {
        const path = await uploadCroppedBlob(blob, "link-photo");
        if (path) { setEditLinkPhoto(path); setEditLinkPhotoAspect(aspectRatio); }
        break;
      }
    }
  }

  // ── Save settings ─────────────────────────────────
  async function saveSettings() {
    if (!auth.currentUser) return;
    setSavingSettings(true);
    setSettingsSaved(false);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: await authHeaders(),
        body: JSON.stringify({
          settings: { language, footerText, showcaseLayout },
        }),
      });
      if (!res.ok) throw new Error();
      setSettingsSaved(true);
      showToast(t.saved);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch {
      showToast(t.somethingWrong);
    } finally {
      setSavingSettings(false);
    }
  }

  // ── Logout ────────────────────────────────────────
  async function handleLogout() {
    localStorage.removeItem("firebase-token");
    localStorage.removeItem("username");
    await signOut(auth);
    router.push("/login");
  }

  // ── QR Code ─────────────────────────────────────
  const generateQr = useCallback(async () => {
    if (!username) return;
    const siteUrl = `${window.location.origin}/${username}`;
    try {
      const url = await QRCode.toDataURL(siteUrl, {
        width: 512,
        margin: 2,
        color: { dark: "#2d2d2d", light: "#ffffff" },
      });
      setQrDataUrl(url);
    } catch {
      showToast(t.somethingWrong);
    }
  }, [username, t.somethingWrong]);

  function openQrModal() {
    setShowQrModal(true);
    generateQr();
  }

  function saveQrImage() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `${username}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // ── Loading state ─────────────────────────────────
  if (loading) {
    return (
      <div className="adm-page">
        <div className="adm-loading">
          <div className="adm-spinner" />
          <p>{t.saving}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="adm-page">
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

      {/* QR Modal */}
      {showQrModal && (
        <div className="adm-qr-overlay" onClick={() => setShowQrModal(false)}>
          <div className="adm-qr-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="adm-qr-title">{t.qrTitle}</h3>
            <p className="adm-qr-subtitle">{t.qrSubtitle}</p>
            {qrDataUrl && (
              <img src={qrDataUrl} alt="QR Code" className="adm-qr-image" />
            )}
            <p className="adm-qr-url">{username ? `${window.location.origin}/${username}` : ""}</p>
            <div className="adm-qr-actions">
              <button className="adm-btn adm-btn-primary" onClick={saveQrImage}>{t.qrSave}</button>
              <button className="adm-btn" onClick={() => setShowQrModal(false)}>{t.qrClose}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="adm-confirm-overlay" onClick={() => setConfirmModal(null)}>
          <div className="adm-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <p className="adm-confirm-message">{confirmModal.message}</p>
            <div className="adm-confirm-actions">
              <button className="adm-btn adm-btn-danger" onClick={confirmModal.onConfirm}>{t.deleteLink}</button>
              <button className="adm-btn" onClick={() => setConfirmModal(null)}>{t.cancel}</button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={profilePicRef}
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleProfilePicUpload}
      />
      <input
        type="file"
        ref={newIconFileRef}
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleNewIconUpload}
      />
      <input
        type="file"
        ref={editIconFileRef}
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleEditIconUpload}
      />
      <input
        type="file"
        ref={newLinkPhotoRef}
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleNewLinkPhotoUpload}
      />
      <input
        type="file"
        ref={editLinkPhotoRef}
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleEditLinkPhotoUpload}
      />

      {/* ── Toolbar ────────────────────────────────── */}
      <AppToolbar username={username} onMenuClick={() => setShowMenu(true)} font={toolbarFont} />

      {/* ── Mobile Menu ──────────────────────────────── */}
      <MobileMenu
        isOpen={showMenu}
        onClose={() => setShowMenu(false)}
        username={username}
        email={auth.currentUser?.email ?? null}
        profilePicture={picture || null}
        language={language}
        onChangeLanguage={async (lang) => {
          setLanguage(lang);
          setShowMenu(false);
          try {
            await fetch("/api/admin/config", {
              method: "PUT",
              headers: await authHeaders(),
              body: JSON.stringify({ settings: { language: lang, footerText, showcaseLayout, toolbarFont, appTheme } }),
            });
          } catch {}
        }}
        font={toolbarFont}
        onChangeFont={async (f) => {
          setToolbarFont(f);
          try {
            await fetch("/api/admin/config", {
              method: "PUT",
              headers: await authHeaders(),
              body: JSON.stringify({ settings: { language, footerText, showcaseLayout, toolbarFont: f, appTheme } }),
            });
          } catch {}
        }}
        theme={appTheme as any}
        onChangeTheme={async (th) => {
          setAppTheme(th);
          (await import("@/lib/theme/colors")).applyTheme(th);
          try {
            await fetch("/api/admin/config", {
              method: "PUT",
              headers: await authHeaders(),
              body: JSON.stringify({ settings: { language, footerText, showcaseLayout, toolbarFont, appTheme: th } }),
            });
          } catch {}
        }}
        colorMode={colorMode}
        onChangeColorMode={async (mode) => {
          setColorMode(mode);
          (await import("@/lib/theme/colors")).applyColorMode(mode);
          try {
            await fetch("/api/admin/config", {
              method: "PUT",
              headers: await authHeaders(),
              body: JSON.stringify({ settings: { language, footerText, showcaseLayout, toolbarFont, appTheme, colorMode: mode } }),
            });
          } catch {}
        }}
        onLogout={() => { setShowMenu(false); handleLogout(); }}
        t={t}
      />

      {/* ── Header ────────────────────────────────── */}
      <header className="adm-header">
        <h1 className="adm-title">{t.adminTitle}</h1>
        <p className="adm-subtitle">{t.adminSubtitle}</p>
      </header>

      {/* ── Profile Section ───────────────────────── */}
      <section className="adm-section">
        <h2 className="adm-section-title">{t.profileSection}</h2>

        <div className="adm-profile-row">
          <div className="adm-profile-pic-wrapper">
            {picture ? (
              <img src={picture} alt={name} className="adm-profile-pic" />
            ) : (
              <div className="adm-profile-pic adm-profile-pic-placeholder">
                {name.charAt(0)}
              </div>
            )}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
              <button
                className="adm-btn adm-btn-small"
                onClick={() => profilePicRef.current?.click()}
              >
                {t.changePicture}
              </button>
              {profilePicFile && (
                <button
                  className="adm-btn adm-btn-small"
                  onClick={() => setCropState({ file: profilePicFile, target: "profile" })}
                >
                  ✂ Recortar
                </button>
              )}
            </div>
          </div>

          <div className="adm-profile-fields">
            <label className="adm-label">{t.nameLabel}</label>
            <input
              type="text"
              className="adm-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <label className="adm-label">{t.subtitleLabel}</label>
            <input
              type="text"
              className="adm-input"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
            />
          </div>
        </div>

        <button
          className="adm-btn adm-btn-primary"
          onClick={saveProfile}
          disabled={savingProfile}
        >
          {savingProfile ? t.saving : profileSaved ? t.saved : t.save}
        </button>
      </section>

      {/* ── Links Section ─────────────────────────── */}
      <section className="adm-section">
        <div className="adm-section-header">
          <h2 className="adm-section-title">{t.linksSection}</h2>
          <div className="adm-section-header-actions">
            <button
              className="adm-btn adm-btn-small adm-btn-qr"
              onClick={openQrModal}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="8" height="8" rx="1" /><rect x="14" y="2" width="8" height="8" rx="1" /><rect x="2" y="14" width="8" height="8" rx="1" /><rect x="14" y="14" width="4" height="4" /><rect x="20" y="14" width="2" height="2" /><rect x="14" y="20" width="2" height="2" /><rect x="20" y="20" width="2" height="2" />
              </svg>
              {t.shareQr}
            </button>
            <button
              className="adm-btn adm-btn-primary adm-btn-small"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? t.cancel : t.addLink}
            </button>
          </div>
        </div>

        {/* Add link form */}
        {showAddForm && (
          <div className="adm-link-form">
            <span className="adm-form-title">{t.addLink}</span>

            <label className="adm-label">{t.linkIcon}</label>
            <div className="adm-icon-type-toggle">
              <button
                className={`adm-btn adm-btn-small ${
                  newIconType === "preset" ? "adm-btn-active" : ""
                }`}
                onClick={() => setNewIconType("preset")}
              >
                {t.presetIcons}
              </button>
              <button
                className={`adm-btn adm-btn-small ${
                  newIconType === "custom" ? "adm-btn-active" : ""
                }`}
                onClick={() => {
                  setNewIconType("custom");
                  newIconFileRef.current?.click();
                }}
              >
                {t.customIcon}
              </button>
            </div>

            {newIconType === "preset" && (
              <div className="adm-icon-grid">
                {PRESET_ICONS.map((pi) => (
                  <button
                    key={pi.id}
                    className={`adm-icon-item ${
                      newIcon === pi.path ? "adm-icon-selected" : ""
                    }`}
                    onClick={() => setNewIcon(pi.path)}
                    title={pi.name}
                  >
                    <img src={pi.path} alt={pi.name} />
                    <span>{pi.name}</span>
                  </button>
                ))}
              </div>
            )}

            {newIconType === "custom" && newIcon && (
              <div className="adm-icon-preview">
                <img src={newIcon} alt="Custom icon" />
              </div>
            )}

            <label className="adm-label">{t.linkLabel}</label>
            <input
              type="text"
              className="adm-input"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder={t.linkLabel}
            />
            <label className="adm-label">{t.linkUrl}</label>
            <input
              type="url"
              className="adm-input"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://..."
            />

            <label className="adm-label">{t.linkPhoto}</label>
            <div className="adm-photo-upload">
              {newLinkPhoto ? (
                <div className="adm-photo-preview">
                  <div className="adm-photo-preview-container">
                    <div className="adm-photo-preview-blur" style={{ backgroundImage: `url(${newLinkPhoto})` }} />
                    <img src={newLinkPhoto} alt="Link photo" />
                    <div className="adm-photo-preview-actions">
                      <button className="adm-photo-action-btn" title="Cambiar foto" onClick={() => newLinkPhotoRef.current?.click()}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      {newLinkPhotoFile && (
                        <button className="adm-photo-action-btn" title="Recortar" onClick={() => setCropState({ file: newLinkPhotoFile, target: "new-link-photo" })}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.13 1 6 16a2 2 0 0 0 2 2h15"/><path d="M1 6.13 16 6a2 2 0 0 1 2 2v15"/></svg>
                        </button>
                      )}
                      <button className="adm-photo-action-btn adm-photo-action-btn--danger" title="Eliminar foto" onClick={() => { setNewLinkPhoto(""); setNewLinkPhotoFile(null); setNewLinkPhotoAspect(undefined); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className="adm-photo-dropzone"
                  onClick={() => newLinkPhotoRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("adm-photo-dropzone--active"); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove("adm-photo-dropzone--active"); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("adm-photo-dropzone--active");
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.type.startsWith("image/")) {
                      const dt = new DataTransfer();
                      dt.items.add(file);
                      newLinkPhotoRef.current!.files = dt.files;
                      newLinkPhotoRef.current!.dispatchEvent(new Event("change", { bubbles: true }));
                    }
                  }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <span>Arrastra o haz clic para subir foto</span>
                </div>
              )}
            </div>

            <div className="adm-form-actions">
              <button className="adm-btn adm-btn-primary" onClick={addLink}>
                {t.save}
              </button>
              <button className="adm-btn" onClick={() => setShowAddForm(false)}>
                {t.cancel}
              </button>
              <button className="adm-btn adm-btn-generate" onClick={() => window.open("/photos", "_blank")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                Generar Foto IA
              </button>
            </div>
          </div>
        )}

        {/* Links list */}
        {links.length === 0 && !showAddForm && (
          <p className="adm-empty">{t.noLinks}</p>
        )}

        {links.map((link, idx) => (
          <div key={link.id} className="adm-link-card">
            {editingLinkId === link.id ? (
              /* Inline edit form */
              <div className="adm-link-edit">
                <label className="adm-label">{t.linkIcon}</label>
                <div className="adm-icon-type-toggle">
                  <button
                    className={`adm-btn adm-btn-small ${
                      editIconType === "preset" ? "adm-btn-active" : ""
                    }`}
                    onClick={() => setEditIconType("preset")}
                  >
                    {t.presetIcons}
                  </button>
                  <button
                    className={`adm-btn adm-btn-small ${
                      editIconType === "custom" ? "adm-btn-active" : ""
                    }`}
                    onClick={() => {
                      setEditIconType("custom");
                      editIconFileRef.current?.click();
                    }}
                  >
                    {t.customIcon}
                  </button>
                </div>

                {editIconType === "preset" && (
                  <div className="adm-icon-grid">
                    {PRESET_ICONS.map((pi) => (
                      <button
                        key={pi.id}
                        className={`adm-icon-item ${
                          editIcon === pi.path ? "adm-icon-selected" : ""
                        }`}
                        onClick={() => setEditIcon(pi.path)}
                        title={pi.name}
                      >
                        <img src={pi.path} alt={pi.name} />
                        <span>{pi.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {editIconType === "custom" && editIcon && (
                  <div className="adm-icon-preview">
                    <img src={editIcon} alt="Custom icon" />
                  </div>
                )}

                <label className="adm-label">{t.linkLabel}</label>
                <input
                  type="text"
                  className="adm-input"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                />
                <label className="adm-label">{t.linkUrl}</label>
                <input
                  type="url"
                  className="adm-input"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                />

                <label className="adm-label">{t.linkPhoto}</label>
                <div className="adm-photo-upload">
                  {editLinkPhoto ? (
                    <div className="adm-photo-preview">
                      <div className="adm-photo-preview-container">
                        <div className="adm-photo-preview-blur" style={{ backgroundImage: `url(${editLinkPhoto})` }} />
                        <img src={editLinkPhoto} alt="Link photo" />
                        <div className="adm-photo-preview-actions">
                          <button className="adm-photo-action-btn" title="Cambiar foto" onClick={() => editLinkPhotoRef.current?.click()}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          {editLinkPhotoFile && (
                            <button className="adm-photo-action-btn" title="Recortar" onClick={() => setCropState({ file: editLinkPhotoFile, target: "edit-link-photo" })}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.13 1 6 16a2 2 0 0 0 2 2h15"/><path d="M1 6.13 16 6a2 2 0 0 1 2 2v15"/></svg>
                            </button>
                          )}
                          <button className="adm-photo-action-btn adm-photo-action-btn--danger" title="Eliminar foto" onClick={() => { setEditLinkPhoto(""); setEditLinkPhotoFile(null); setEditLinkPhotoAspect(undefined); }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="adm-photo-dropzone"
                      onClick={() => editLinkPhotoRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("adm-photo-dropzone--active"); }}
                      onDragLeave={(e) => { e.currentTarget.classList.remove("adm-photo-dropzone--active"); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove("adm-photo-dropzone--active");
                        const file = e.dataTransfer.files?.[0];
                        if (file && file.type.startsWith("image/")) {
                          const dt = new DataTransfer();
                          dt.items.add(file);
                          editLinkPhotoRef.current!.files = dt.files;
                          editLinkPhotoRef.current!.dispatchEvent(new Event("change", { bubbles: true }));
                        }
                      }}
                    >
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      <span>Arrastra o haz clic para subir foto</span>
                    </div>
                  )}
                </div>

                <div className="adm-form-actions">
                  <button
                    className="adm-btn adm-btn-primary"
                    onClick={saveEditLink}
                  >
                    {t.save}
                  </button>
                  <button
                    className="adm-btn"
                    onClick={() => setEditingLinkId(null)}
                  >
                    {t.cancel}
                  </button>
                  <button className="adm-btn adm-btn-generate" onClick={() => window.open("/photos", "_blank")}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    Generar Foto IA
                  </button>
                </div>
              </div>
            ) : (
              /* Normal display */
              <>
                <div className="adm-link-info">
                  <img
                    src={link.icon}
                    alt={link.label}
                    className="adm-link-icon"
                  />
                  <div className="adm-link-text">
                    <span className="adm-link-label">{link.label}</span>
                    <span className="adm-link-url">{link.url}</span>
                  </div>
                  {link.photo && (
                    <img
                      src={link.photo}
                      alt="showcase"
                      className="adm-link-photo-thumb"
                      title={t.linkPhoto}
                    />
                  )}
                </div>
                <div className="adm-link-actions">
                  {/* Toggle */}
                  <button
                    className={`adm-toggle ${
                      link.enabled ? "adm-toggle-on" : ""
                    }`}
                    onClick={() => toggleLink(link)}
                    title={link.enabled ? t.enabled : t.disabled}
                  >
                    <span className="adm-toggle-knob" />
                  </button>
                  {/* Reorder */}
                  <button
                    className="adm-btn adm-btn-icon"
                    onClick={() => reorderLinks(idx, "up")}
                    disabled={idx === 0}
                    title={t.moveUp}
                  >
                    &#9650;
                  </button>
                  <button
                    className="adm-btn adm-btn-icon"
                    onClick={() => reorderLinks(idx, "down")}
                    disabled={idx === links.length - 1}
                    title={t.moveDown}
                  >
                    &#9660;
                  </button>
                  {/* Edit */}
                  <button
                    className="adm-btn adm-btn-small"
                    onClick={() => startEditLink(link)}
                  >
                    {t.editLink}
                  </button>
                  {/* Delete */}
                  <button
                    className="adm-btn adm-btn-danger adm-btn-small"
                    onClick={() => deleteLink(link.id)}
                  >
                    {t.deleteLink}
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </section>

      {/* ── Settings Section ──────────────────────── */}
      <section className="adm-section">
        <h2 className="adm-section-title">{t.settingsSection}</h2>

        <label className="adm-label">{t.language}</label>
        <div className="adm-lang-toggle">
          <button
            className={`adm-btn ${language === "es" ? "adm-btn-active" : ""}`}
            onClick={() => setLanguage("es")}
          >
            {t.spanish}
          </button>
          <button
            className={`adm-btn ${language === "en" ? "adm-btn-active" : ""}`}
            onClick={() => setLanguage("en")}
          >
            {t.english}
          </button>
        </div>

        <label className="adm-label">{t.footerTextLabel}</label>
        <input
          type="text"
          className="adm-input"
          value={footerText}
          onChange={(e) => setFooterText(e.target.value)}
        />

        <button
          className="adm-btn adm-btn-primary"
          onClick={saveSettings}
          disabled={savingSettings}
        >
          {savingSettings ? t.saving : settingsSaved ? t.saved : t.save}
        </button>
      </section>
    </div>
  );
}
