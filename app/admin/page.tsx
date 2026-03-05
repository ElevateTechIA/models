"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import type { SiteConfig, SiteLink } from "@/lib/types";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { PRESET_ICONS } from "@/lib/preset-icons";
import { translations, type Language } from "@/lib/translations";

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

  // Settings state
  const [language, setLanguage] = useState<Language>("es");
  const [footerText, setFooterText] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

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

  // Auth helper
  function authHeaders(tk: string) {
    return {
      Authorization: `Bearer ${tk}`,
      "Content-Type": "application/json",
    };
  }

  // ── Auth check + load config ──────────────────────
  useEffect(() => {
    const tk = localStorage.getItem("firebase-token");
    const un = localStorage.getItem("username");
    if (!tk || !un) {
      router.push("/login");
      return;
    }
    setToken(tk);
    setUsername(un);

    fetch(`/api/admin/config?username=${un}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((data: SiteConfig) => {
        setConfig(data);
        setName(data.profile.name);
        setSubtitle(data.profile.subtitle);
        setPicture(data.profile.picture);
        setLinks(data.links);
        setLanguage(data.settings.language);
        setFooterText(data.settings.footerText);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem("firebase-token");
        localStorage.removeItem("username");
        router.push("/login");
      });
  }, [router]);

  // ── Profile save ──────────────────────────────────
  async function saveProfile() {
    if (!token) return;
    setSavingProfile(true);
    setProfileSaved(false);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify({
          profile: { name, subtitle, picture },
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

  // ── Profile picture upload ────────────────────────
  async function handleProfilePicUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast(t.imageTooLarge);
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "profile");
    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPicture(data.path);
      showToast(t.saved);
    } catch {
      showToast(t.somethingWrong);
    }
  }

  // ── Add link ──────────────────────────────────────
  async function addLink() {
    if (!token || !newLabel || !newUrl) return;
    try {
      const res = await fetch("/api/admin/links", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({
          icon: newIcon,
          iconType: newIconType,
          label: newLabel,
          url: newUrl,
          enabled: true,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLinks(data.links);
      setNewLabel("");
      setNewUrl("");
      setNewIcon(PRESET_ICONS[0].path);
      setNewIconType("preset");
      setShowAddForm(false);
      showToast(t.saved);
    } catch {
      showToast(t.somethingWrong);
    }
  }

  // ── Toggle link ───────────────────────────────────
  async function toggleLink(link: SiteLink) {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/links", {
        method: "PUT",
        headers: authHeaders(token),
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
    if (!token) return;
    setConfirmModal({
      message: t.confirmDelete,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const res = await fetch(`/api/admin/links?id=${id}`, {
            method: "DELETE",
            headers: authHeaders(token),
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
  }

  // ── Save edited link ──────────────────────────────
  async function saveEditLink() {
    if (!token || !editingLinkId) return;
    try {
      const res = await fetch("/api/admin/links", {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify({
          id: editingLinkId,
          label: editLabel,
          url: editUrl,
          icon: editIcon,
          iconType: editIconType,
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
    if (!token) return;
    const newLinks = [...links];
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    [newLinks[idx], newLinks[swapIdx]] = [newLinks[swapIdx], newLinks[idx]];
    setLinks(newLinks);
    try {
      await fetch("/api/admin/links/reorder", {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify({ ids: newLinks.map((l) => l.id) }),
      });
    } catch {
      showToast(t.somethingWrong);
    }
  }

  // ── Custom icon upload (for add form) ─────────────
  async function handleNewIconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;
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
        headers: { Authorization: `Bearer ${token}` },
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
    if (!file || !token) return;
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
        headers: { Authorization: `Bearer ${token}` },
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

  // ── Save settings ─────────────────────────────────
  async function saveSettings() {
    if (!token) return;
    setSavingSettings(true);
    setSettingsSaved(false);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify({
          settings: { language, footerText },
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

      {/* ── Header ────────────────────────────────── */}
      <header className="adm-header">
        <h1 className="adm-title">{t.adminTitle}</h1>
        <p className="adm-subtitle">{t.adminSubtitle}</p>
        <nav className="adm-nav">
          <Link href={`/${username}`} className="adm-nav-link">
            {t.viewSite}
          </Link>
          {(username === "cesarvegacol" || username === "wendypradaoficial11") && (
            <Link href="/model-design" className="adm-nav-link">
              {t.photoStudio}
            </Link>
          )}
          <button className="adm-btn adm-btn-logout" onClick={handleLogout}>
            {t.logout}
          </button>
        </nav>
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
            <button
              className="adm-btn adm-btn-small"
              onClick={() => profilePicRef.current?.click()}
            >
              {t.changePicture}
            </button>
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
            <div className="adm-form-actions">
              <button className="adm-btn adm-btn-primary" onClick={addLink}>
                {t.save}
              </button>
              <button className="adm-btn" onClick={() => setShowAddForm(false)}>
                {t.cancel}
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
