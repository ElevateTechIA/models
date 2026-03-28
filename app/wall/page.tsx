"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { translations } from "@/lib/translations";
import AppToolbar from "@/app/components/AppToolbar";
import MobileMenu from "@/app/components/MobileMenu";

type WallPhoto = { id: string; imageUrl: string; username: string; prompt: string };
type Comment = { id: string; username: string; text: string; createdAt: number };

export default function WallPage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<WallPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WallPhoto | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [toolbarFont, setToolbarFont] = useState<"gothic" | "elegant" | "clean">("elegant");
  const [lang, setLang] = useState<"es" | "en">("es");
  const t = translations[lang] || translations.es;

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) setUsername(storedUsername);
    // Load language
    if (storedUsername) {
      fetch(`/api/admin/config?username=${storedUsername}`).then(r => r.json()).then(d => {
        if (d?.settings?.language) setLang(d.settings.language);
        if (d?.settings?.toolbarFont) setToolbarFont(d.settings.toolbarFont);
      }).catch(() => {});
    }
    const unsub = onAuthStateChanged(auth, (u) => setAuthed(!!u));
    fetch("/api/photos/gallery")
      .then((r) => r.json())
      .then((d) => { if (d.photos?.length) setPhotos(d.photos); })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => unsub();
  }, []);

  async function getToken() {
    try { return (await auth.currentUser?.getIdToken()) ?? null; } catch { return null; }
  }

  function openPhoto(photo: WallPhoto) {
    setSelected(photo);
    setLiked(false); setLikeCount(0); setComments([]); setNewComment("");
    const headers: Record<string, string> = {};
    getToken().then(t => {
      if (t) headers.Authorization = `Bearer ${t}`;
      fetch(`/api/photos/like?photoId=${photo.id}`, { headers }).then(r => r.json()).then(d => {
        setLikeCount(d.count || 0); setLiked(d.liked || false);
      }).catch(() => {});
    });
    fetch(`/api/photos/comments?photoId=${photo.id}`).then(r => r.json()).then(d => {
      setComments(d.comments || []);
    }).catch(() => {});
  }

  async function handleLike() {
    const token = await getToken(); if (!token) return;
    setLiked(!liked); setLikeCount(c => liked ? c - 1 : c + 1);
    try {
      const res = await fetch("/api/photos/like", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ photoId: selected!.id }),
      });
      const d = await res.json(); setLiked(d.liked); setLikeCount(d.count);
    } catch {}
  }

  async function handleComment() {
    if (!selected || !newComment.trim() || sending) return;
    const token = await getToken(); if (!token) return;
    setSending(true);
    try {
      const res = await fetch("/api/photos/comments", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ photoId: selected.id, text: newComment.trim() }),
      });
      const d = await res.json();
      if (d.id) { setComments(prev => [...prev, d]); setNewComment(""); }
    } catch {} finally { setSending(false); }
  }

  // Split photos into rows for carousel
  const ROWS = Math.max(3, Math.ceil(photos.length / 4));
  const rows: WallPhoto[][] = [];
  const perRow = Math.max(4, Math.ceil(photos.length / ROWS));
  for (let i = 0; i < ROWS; i++) {
    const row = photos.slice(i * perRow, (i + 1) * perRow);
    if (row.length > 0) rows.push(row);
  }

  const wobbles = ["wall-wobble-1", "", "wall-wobble-2", "", "wall-wobble-1"];

  return (
    <div className="wall-page">
      <AppToolbar username={username} onMenuClick={() => setShowMenu(true)} font={toolbarFont} />
      <MobileMenu
        isOpen={showMenu}
        onClose={() => setShowMenu(false)}
        username={username}
        email={auth.currentUser?.email ?? null}
        profilePicture={null}
        language={lang}
        onChangeLanguage={async (newLang) => {
          setLang(newLang);
          setShowMenu(false);
          try {
            const token = await getToken();
            if (token) {
              await fetch("/api/admin/config", {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ settings: { language: newLang } }),
              });
            }
          } catch {}
        }}
        onLogout={async () => {
          setShowMenu(false);
          try { await signOut(auth); } catch {}
          localStorage.removeItem("username");
          router.replace("/");
        }}
        t={t}
      />

      {loading && <div className="wall-loading"><div className="ph-spinner-small" /></div>}

      {!loading && photos.length === 0 && (
        <div className="wall-empty"><p>No photos yet</p></div>
      )}

      {!loading && photos.length > 0 && (
        <div className="wall-carousel-container">
          {rows.map((row, ri) => (
            <div key={ri} className="wall-carousel-row">
              <div className={`wall-carousel-track ${ri % 2 === 1 ? "wall-carousel-reverse" : ""}`} style={{ animationDuration: `${25 + ri * 5}s` }}>
                {[...row, ...row].map((photo, j) => (
                  <div
                    key={`${photo.id}-${j}`}
                    className={`wall-card ${wobbles[j % wobbles.length]}`}
                    onClick={() => openPhoto(photo)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.imageUrl} alt="" className="wall-card-img" loading="lazy" />
                    <div className="wall-card-overlay">
                      <span>@{photo.username}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {selected && (
        <div className="wall-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="wall-modal" onClick={e => e.stopPropagation()}>
            <button className="wall-modal-close" onClick={() => setSelected(null)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected.imageUrl} alt="" className="wall-modal-img" />
            <div className="wall-modal-body">
              <p className="wall-modal-author">by <strong>@{selected.username}</strong></p>
              <div className="wall-modal-actions">
                <button className={`wall-modal-like ${liked ? "wall-modal-liked" : ""}`} onClick={handleLike} disabled={!authed}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={liked ? "#ef4444" : "none"} stroke={liked ? "#ef4444" : "currentColor"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  <span>{likeCount}</span>
                </button>
                <span className="wall-modal-comments-count">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  {comments.length}
                </span>
              </div>
              <div className="wall-modal-comments">
                {comments.map(c => (
                  <div key={c.id} className="wall-modal-comment"><strong>@{c.username}</strong> {c.text}</div>
                ))}
              </div>
              {authed ? (
                <div className="wall-modal-input">
                  <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Write a comment..." onKeyDown={e => e.key === "Enter" && handleComment()} maxLength={500} />
                  <button onClick={handleComment} disabled={sending || !newComment.trim()}>Send</button>
                </div>
              ) : (
                <p className="wall-modal-hint">Sign in to like and comment</p>
              )}
              <button
                className="wall-make-own-btn"
                onClick={() => {
                  const prompt = selected?.prompt || "";
                  const templateImg = encodeURIComponent(selected?.imageUrl || "");
                  router.push(`/photos?tab=photos&prompt=${encodeURIComponent(prompt)}&template=${templateImg}`);
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                {lang === "es" ? "Crea la tuya" : "Make your own"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating share button */}
      <button
        className="wall-share-fab"
        onClick={() => {
          const url = window.location.origin + "/login";
          const text = lang === "es"
            ? "Mira esta app para crear tu pagina de enlaces con IA! "
            : "Check out this app to create your link page with AI! ";
          if (navigator.share) {
            navigator.share({ title: "One Link", text: text + url, url }).catch(() => {});
          } else {
            navigator.clipboard.writeText(text + url);
          }
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        <span>{lang === "es" ? "Compartir app" : "Share this app"}</span>
      </button>
    </div>
  );
}
