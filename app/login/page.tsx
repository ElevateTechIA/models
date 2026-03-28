"use client";

import { useEffect, useState, useRef } from "react";
import { signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { auth, googleProvider } from "../../lib/firebase";
import { getDeviceId } from "@/lib/device-fingerprint";

type GalleryPhoto = { id: string; imageUrl: string; username: string; prompt: string };
type Comment = { id: string; username: string; text: string; createdAt: number };

const t_es = {
  hero: "Tu mundo digital en un solo enlace",
  heroSub: "Comparte todas tus redes sociales, contacto y mas en una pagina elegante y personalizada.",
  featureLinks: "Todos tus enlaces",
  featureLinksDesc: "Redes sociales, WhatsApp, Spotify y mas en un solo lugar.",
  featureQr: "Codigo QR",
  featureQrDesc: "Genera un QR para que te encuentren al instante.",
  featureCustom: "100% personalizable",
  featureCustomDesc: "Tu foto, tu nombre, tu estilo. Hazlo tuyo.",
  cta: "Login o Registrarse",
  loginWithGoogle: "Continuar con Google",
  loginError: "Error al iniciar sesion",
  already: "Ya tienes cuenta?",
  signIn: "Inicia sesion",
  gallery: "Galeria",
  galleryDesc: "Mira lo que la comunidad esta creando con IA.",
  likes: "Me gusta",
  addComment: "Escribe un comentario...",
  send: "Enviar",
  loginToInteract: "Inicia sesion para dar like y comentar",
  joinNow: "Unete ahora",
  by: "por",
  inviteFriend: "Invita un amigo",
  inviteMsg: "Mira esta app para crear tu pagina de enlaces con IA! ",
};

const t_en = {
  hero: "Your digital world in one link",
  heroSub: "Share all your social media, contact info and more on one elegant, personalized page.",
  featureLinks: "All your links",
  featureLinksDesc: "Social media, WhatsApp, Spotify and more in one place.",
  featureQr: "QR Code",
  featureQrDesc: "Generate a QR so people can find you instantly.",
  featureCustom: "Fully customizable",
  featureCustomDesc: "Your photo, your name, your style. Make it yours.",
  cta: "Login or Register",
  loginWithGoogle: "Continue with Google",
  loginError: "Login failed",
  already: "Already have an account?",
  signIn: "Sign in",
  gallery: "Gallery",
  galleryDesc: "See what the community is creating with AI.",
  likes: "Likes",
  addComment: "Write a comment...",
  send: "Send",
  loginToInteract: "Sign in to like and comment",
  joinNow: "Join now",
  by: "by",
  inviteFriend: "Invite a friend",
  inviteMsg: "Check out this app to create your link page with AI! ",
};

type Lang = "es" | "en";
type Translations = typeof t_es;

const langMap: Record<Lang, Translations> = { es: t_es, en: t_en };

function PhotoWall({ photos, onSelect }: { photos: GalleryPhoto[]; onSelect: (p: GalleryPhoto) => void }) {
  const ROWS = 3;
  const rows: GalleryPhoto[][] = [];
  const perRow = Math.ceil(photos.length / ROWS);
  for (let i = 0; i < ROWS; i++) {
    rows.push(photos.slice(i * perRow, (i + 1) * perRow));
  }

  return (
    <div className="photo-wall">
      {rows.map((row, i) => (
        <div key={i} className="photo-wall-row">
          <div className={`photo-wall-track ${i % 2 === 1 ? "photo-wall-reverse" : ""}`}>
            {[...row, ...row].map((photo, j) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={`${photo.id}-${j}`} src={photo.imageUrl} alt="" className="photo-wall-img" loading="lazy" onClick={() => onSelect(photo)} />
            ))}
          </div>
        </div>
      ))}
      <div className="photo-wall-fade-left" />
      <div className="photo-wall-fade-right" />
    </div>
  );
}

function PhotoModal({ photo, t, onClose, onGoogleLogin }: { photo: GalleryPhoto; t: Translations; onClose: () => void; onGoogleLogin: () => void }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    setIsAuthed(!!localStorage.getItem("firebase-token"));
    // Fetch likes
    fetch(`/api/photos/like?photoId=${photo.id}`).then(r => r.json()).then(d => {
      setLikeCount(d.count || 0);
      setLiked(d.liked || false);
    }).catch(() => {});
    // Fetch comments
    fetch(`/api/photos/comments?photoId=${photo.id}`).then(r => r.json()).then(d => {
      setComments(d.comments || []);
    }).catch(() => {});
  }, [photo.id]);

  async function getToken() {
    try {
      const { auth } = await import("../../lib/firebase");
      return (await auth.currentUser?.getIdToken()) ?? null;
    } catch { return null; }
  }

  async function handleLike() {
    const token = await getToken();
    if (!token) return;
    // Optimistic
    setLiked(!liked);
    setLikeCount(c => liked ? c - 1 : c + 1);
    try {
      const res = await fetch("/api/photos/like", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ photoId: photo.id }),
      });
      const d = await res.json();
      setLiked(d.liked);
      setLikeCount(d.count);
    } catch {}
  }

  async function handleComment() {
    if (!newComment.trim() || sending) return;
    const token = await getToken();
    if (!token) return;
    setSending(true);
    try {
      const res = await fetch("/api/photos/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ photoId: photo.id, text: newComment.trim() }),
      });
      const d = await res.json();
      if (d.id) {
        setComments(prev => [...prev, d]);
        setNewComment("");
      }
    } catch {} finally { setSending(false); }
  }

  return (
    <div className="gm-backdrop" onClick={onClose}>
      <div className="gm-modal" onClick={e => e.stopPropagation()}>
        <button className="gm-close" onClick={onClose}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.imageUrl} alt="" className="gm-photo" />
        <div className="gm-body">
          <div className="gm-author-row">
            <p className="gm-author">{t.by} <strong>@{photo.username}</strong></p>
            <a href={`/${photo.username}`} className="gm-follow-btn" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              Follow
            </a>
          </div>
          <div className="gm-actions">
            <button className={`gm-like-btn ${liked ? "gm-liked" : ""}`} onClick={handleLike} disabled={!isAuthed}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill={liked ? "#ef4444" : "none"} stroke={liked ? "#ef4444" : "currentColor"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <span>{likeCount}</span>
            </button>
            <span className="gm-comment-count">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              {comments.length}
            </span>
          </div>
          <div className="gm-comments">
            {comments.map(c => (
              <div key={c.id} className="gm-comment">
                <strong>@{c.username}</strong> {c.text}
              </div>
            ))}
          </div>
          {isAuthed ? (
            <div className="gm-comment-input">
              <input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder={t.addComment}
                onKeyDown={e => e.key === "Enter" && handleComment()}
                maxLength={500}
              />
              <button onClick={handleComment} disabled={sending || !newComment.trim()}>
                {t.send}
              </button>
            </div>
          ) : (
            <div className="gm-join-section">
              <p className="gm-login-hint">{t.loginToInteract}</p>
              <button className="gm-google-btn" onClick={(e) => { e.stopPropagation(); onClose(); onGoogleLogin(); }}>
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.07 24.07 0 0 0 0 21.56l7.98-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                {t.cta}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lang, setLang] = useState<Lang>("es");
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const t = langMap[lang];

  useEffect(() => {
    const isLoggedIn = !!(localStorage.getItem("firebase-token") && localStorage.getItem("username"));

    // Handle redirect result (mobile login fallback)
    getRedirectResult(auth).then(async (result) => {
      if (result?.user) {
        const idToken = await result.user.getIdToken();
        const displayName = result.user.displayName || "";
        const deviceId = await getDeviceId();
        const registerRes = await fetch("/api/auth/register", {
          method: "POST",
          headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ displayName, deviceId }),
        });
        if (registerRes.ok) {
          const data = await registerRes.json();
          localStorage.setItem("firebase-token", idToken);
          localStorage.setItem("username", data.username);
          window.location.href = "/admin";
        }
      }
    }).catch(() => {});

    // Fetch gallery photos first, then redirect if logged in
    fetch("/api/photos/gallery")
      .then((r) => r.json())
      .then((d) => {
        if (d.photos?.length) setGalleryPhotos(d.photos);
        if (isLoggedIn) window.location.href = "/admin";
      })
      .catch(() => {
        if (isLoggedIn) window.location.href = "/admin";
      });
  }, []);

  async function handleGoogleLogin() {
    setLoading(true);
    setError("");

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const displayName = result.user.displayName || "";
      const deviceId = await getDeviceId();

      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName, deviceId }),
      });

      if (!registerRes.ok) {
        setError(t.loginError);
        setLoading(false);
        return;
      }

      const data = await registerRes.json();
      localStorage.setItem("firebase-token", idToken);
      localStorage.setItem("username", data.username);
      window.location.href = "/admin";
    } catch {
      // Popup blocked or failed on mobile — fallback to redirect
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (err2: unknown) {
        const message = err2 instanceof Error ? err2.message : t.loginError;
        setError(message);
        setLoading(false);
      }
    }
  }

  return (
    <div className="landing-page" suppressHydrationWarning>
      {/* Hero */}
      <section className="landing-hero">
        <img src="/ol_logo.png" alt="Logo" className="landing-logo-img" />
        <h1 className="landing-h1">{t.hero}</h1>
        <p className="landing-sub">{t.heroSub}</p>
      </section>

      {/* Features */}
      <section className="landing-features">
        <div className="landing-feature">
          <span className="landing-feature-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          </span>
          <div>
            <strong>{t.featureLinks}</strong>
            <p>{t.featureLinksDesc}</p>
          </div>
        </div>
        <div className="landing-social-icons">
          {/* Instagram */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.054 1.97.24 2.43.403a4.08 4.08 0 0 1 1.47.957c.453.453.757.91.957 1.47.163.46.35 1.26.403 2.43.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.054 1.17-.24 1.97-.403 2.43a4.08 4.08 0 0 1-.957 1.47 4.08 4.08 0 0 1-1.47.957c-.46.163-1.26.35-2.43.403-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.054-1.97-.24-2.43-.403a4.08 4.08 0 0 1-1.47-.957 4.08 4.08 0 0 1-.957-1.47c-.163-.46-.35-1.26-.403-2.43C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.054-1.17.24-1.97.403-2.43a4.08 4.08 0 0 1 .957-1.47A4.08 4.08 0 0 1 5.063 2.29c.46-.163 1.26-.35 2.43-.403C8.759 1.83 9.139 1.818 12 1.818h.003M12 0C8.741 0 8.333.014 7.053.072 5.775.131 4.902.333 4.14.63a5.88 5.88 0 0 0-2.126 1.384A5.88 5.88 0 0 0 .63 4.14C.333 4.902.131 5.775.072 7.053.014 8.333 0 8.741 0 12s.014 3.668.072 4.948c.059 1.277.261 2.15.558 2.913a5.88 5.88 0 0 0 1.384 2.126A5.88 5.88 0 0 0 4.14 23.37c.763.297 1.636.499 2.913.558C8.333 23.986 8.741 24 12 24s3.668-.014 4.948-.072c1.277-.059 2.15-.261 2.913-.558a5.88 5.88 0 0 0 2.126-1.384 5.88 5.88 0 0 0 1.384-2.126c.297-.763.499-1.636.558-2.913.058-1.28.072-1.688.072-4.948s-.014-3.668-.072-4.948c-.059-1.277-.261-2.15-.558-2.913a5.88 5.88 0 0 0-1.384-2.126A5.88 5.88 0 0 0 19.86.63C19.098.333 18.225.131 16.948.072 15.668.014 15.26 0 12 0zm0 5.838a6.163 6.163 0 1 0 0 12.326 6.163 6.163 0 0 0 0-12.326zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
          {/* TikTok */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.78 1.54V6.84a4.84 4.84 0 0 1-1.02-.15z"/></svg>
          {/* OnlyFans */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 3.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zm0 2.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 1.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z"/></svg>
          {/* Spotify */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
          {/* YouTube */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          {/* WhatsApp */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
          {/* X/Twitter */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          {/* Snapchat */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12.989-.217.15-.045.301-.09.436-.12.165-.045.323-.063.465-.063.39 0 .7.15.93.39.18.195.27.42.285.66.03.54-.405.96-.958 1.245-.09.045-.21.09-.33.135l-.15.06c-.45.165-.96.36-1.215.66-.195.225-.24.525-.135.885.015.06.03.12.06.195.45 1.215.96 2.145 1.56 2.865.39.465.78.81 1.17 1.035.225.135.435.21.631.246.03.006.063.012.09.015.405.06.465.345.435.555-.03.195-.18.405-.465.585-.36.24-.855.39-1.41.495-.105.015-.18.09-.21.18-.03.135-.06.285-.105.42-.06.195-.165.3-.345.3h-.015c-.135 0-.3-.03-.48-.075a5.26 5.26 0 0 0-.66-.105c-.24-.03-.48-.045-.72-.045-.36 0-.69.045-1.005.135-.39.12-.72.315-1.005.57-.42.375-.855.555-1.32.555-.03 0-.06 0-.09-.003-.48.003-.93-.18-1.35-.555-.285-.255-.615-.45-1.005-.57A3.645 3.645 0 0 0 9.72 19.5c-.24 0-.48.015-.72.045-.18.024-.39.06-.636.105a2.1 2.1 0 0 1-.51.075c-.21 0-.345-.12-.39-.33-.045-.135-.075-.285-.105-.42-.03-.09-.105-.165-.21-.18-.555-.105-1.05-.255-1.41-.495-.27-.18-.42-.375-.45-.57-.03-.21.03-.495.42-.555.03-.003.06-.009.09-.015.21-.039.42-.114.645-.249.39-.225.78-.57 1.17-1.035.6-.72 1.11-1.65 1.56-2.865.03-.075.045-.135.06-.195.105-.36.06-.66-.135-.885-.255-.3-.765-.495-1.215-.66l-.15-.06a2.3 2.3 0 0 1-.33-.135c-.375-.195-.87-.555-.96-1.035a.825.825 0 0 1 .285-.825c.225-.24.54-.375.87-.375.15 0 .3.03.465.075.12.03.27.075.42.12.33.1.689.204.989.217.18 0 .315-.045.39-.09-.007-.165-.019-.33-.03-.51l-.003-.06c-.105-1.628-.23-3.654.3-4.847C7.86 1.07 11.216.793 12.206.793z"/></svg>
          {/* QR Code */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/><rect x="2" y="14" width="8" height="8" rx="1"/><rect x="14" y="14" width="4" height="4"/><rect x="20" y="14" width="2" height="2"/><rect x="14" y="20" width="2" height="2"/><rect x="20" y="20" width="2" height="2"/></svg>
        </div>
        <div className="landing-feature">
          <span className="landing-feature-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/><rect x="2" y="14" width="8" height="8" rx="1"/><rect x="14" y="14" width="4" height="4"/><rect x="20" y="14" width="2" height="2"/><rect x="14" y="20" width="2" height="2"/><rect x="20" y="20" width="2" height="2"/></svg>
          </span>
          <div>
            <strong>{t.featureQr}</strong>
            <p>{t.featureQrDesc}</p>
          </div>
        </div>
      </section>

      {/* Photo Wall */}
      {galleryPhotos.length > 0 && (
        <section className="landing-gallery-section">
          <h2 className="landing-gallery-title">{t.gallery}</h2>
          <p className="landing-gallery-desc">{t.galleryDesc}</p>
          <PhotoWall photos={galleryPhotos} onSelect={setSelectedPhoto} />
        </section>
      )}

      {/* Photo Modal */}
      {selectedPhoto && <PhotoModal photo={selectedPhoto} t={t} onClose={() => setSelectedPhoto(null)} onGoogleLogin={handleGoogleLogin} />}

      {/* CTA */}
      <section className="landing-cta">
        <button
          className="landing-google-btn"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.07 24.07 0 0 0 0 21.56l7.98-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {loading ? "..." : t.cta}
        </button>

        {error && <p className="login-error">{error}</p>}

        <button
          className="landing-invite-btn"
          onClick={() => {
            const url = window.location.origin + "/login";
            const text = t.inviteMsg + url;
            if (navigator.share) {
              navigator.share({ title: "One Link", text, url }).catch(() => {});
            } else {
              navigator.clipboard.writeText(text);
            }
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
          {t.inviteFriend}
        </button>

        <div className="landing-lang">
          <button
            className={`landing-lang-btn ${lang === "es" ? "landing-lang-active" : ""}`}
            onClick={() => setLang("es")}
          >
            ES
          </button>
          <button
            className={`landing-lang-btn ${lang === "en" ? "landing-lang-active" : ""}`}
            onClick={() => setLang("en")}
          >
            EN
          </button>
        </div>
        <p className="landing-version">v1.0.2</p>
      </section>
    </div>
  );
}
