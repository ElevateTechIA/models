"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { translations } from "@/lib/translations";
import AppToolbar from "@/app/components/AppToolbar";
import MobileMenu from "@/app/components/MobileMenu";

type WallPhoto = { id: string; imageUrl: string; username: string; prompt: string; relation?: string };
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
  const [following, setFollowing] = useState(false);
  const [followCount, setFollowCount] = useState(0);
  const [authed, setAuthed] = useState(false);
  const [feedTab, setFeedTab] = useState<"all" | "following">("all");
  const [followingPhotos, setFollowingPhotos] = useState<WallPhoto[]>([]);
  const [discoverPhotos, setDiscoverPhotos] = useState<WallPhoto[]>([]);
  const [showSocialPanel, setShowSocialPanel] = useState(false);
  const [socialTab, setSocialTab] = useState<"following" | "followers">("following");
  const [socialFollowing, setSocialFollowing] = useState<string[]>([]);
  const [socialFollowers, setSocialFollowers] = useState<string[]>([]);
  const [socialLoading, setSocialLoading] = useState(false);
  const [myFollowingCount, setMyFollowingCount] = useState(0);
  const [myFollowersCount, setMyFollowersCount] = useState(0);
  const [username, setUsername] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [toolbarFont, setToolbarFont] = useState<"gothic" | "elegant" | "clean" | "haute">("elegant");
  const [appTheme, setAppTheme] = useState<string>("gold");
  const [colorMode, setColorMode] = useState<"light" | "dark" | "auto">("light");
  const [useGradients, setUseGradients] = useState(true);
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
        if (d?.settings?.appTheme) { setAppTheme(d.settings.appTheme); import("@/lib/theme/colors").then(m => m.applyTheme(d.settings.appTheme)); }
        if (d?.settings?.colorMode) { setColorMode(d.settings.colorMode); import("@/lib/theme/colors").then(m => m.applyColorMode(d.settings.colorMode)); }
        const g = d?.settings?.useGradients !== false; setUseGradients(g); import("@/lib/theme/colors").then(m => m.applyGradientMode(g));
      }).catch(() => {});
    }
    const unsub = onAuthStateChanged(auth, async (u) => {
      setAuthed(!!u);
      try {
        if (u) {
          const token = await u.getIdToken();
          const res = await fetch("/api/feed", { headers: { Authorization: `Bearer ${token}` } });
          const d = await res.json();
          if (d.feed?.length) {
            const followingPics = d.feed.filter((p: WallPhoto) => p.relation === "following" || p.relation === "mutual");
            const discoverPics = d.feed.filter((p: WallPhoto) => p.relation === "discover");
            setFollowingPhotos(followingPics);
            setDiscoverPhotos(discoverPics);
            setPhotos(d.feed);
            setMyFollowingCount(d.followingCount || 0);
            setMyFollowersCount(d.followersCount || 0);
          }
        } else {
          const res = await fetch("/api/photos/gallery");
          const d = await res.json();
          if (d.photos?.length) setPhotos(d.photos);
        }
      } catch {
        // Fallback
        try {
          const res = await fetch("/api/photos/gallery");
          const d = await res.json();
          if (d.photos?.length) setPhotos(d.photos);
        } catch {}
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  async function getToken() {
    try { return (await auth.currentUser?.getIdToken()) ?? null; } catch { return null; }
  }

  function openPhoto(photo: WallPhoto) {
    setSelected(photo);
    setLiked(false); setLikeCount(0); setComments([]); setNewComment("");
    setFollowing(false); setFollowCount(0);
    const headers: Record<string, string> = {};
    getToken().then(t => {
      if (t) headers.Authorization = `Bearer ${t}`;
      fetch(`/api/photos/like?photoId=${photo.id}`, { headers }).then(r => r.json()).then(d => {
        setLikeCount(d.count || 0); setLiked(d.liked || false);
      }).catch(() => {});
      fetch(`/api/follow?username=${photo.username}`, { headers }).then(r => r.json()).then(d => {
        setFollowing(d.following || false); setFollowCount(d.count || 0);
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

  async function handleFollow() {
    if (!selected) return;
    const token = await getToken(); if (!token) return;
    setFollowing(!following);
    setFollowCount(c => following ? c - 1 : c + 1);
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: selected.username }),
      });
      const d = await res.json();
      setFollowing(d.following);
      setFollowCount(d.count);
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

  async function openSocialPanel() {
    setShowSocialPanel(true);
    setSocialLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const [followingRes, followersRes] = await Promise.all([
        fetch("/api/follow/list?type=following", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/follow/list?type=followers", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const followingData = await followingRes.json();
      const followersData = await followersRes.json();
      setSocialFollowing(followingData.users || []);
      setSocialFollowers(followersData.users || []);
      setMyFollowingCount(followingData.count || 0);
      setMyFollowersCount(followersData.count || 0);
    } catch {} finally { setSocialLoading(false); }
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
        font={toolbarFont}
        onChangeFont={async (f) => {
          setToolbarFont(f);
          const token = await getToken(); if (!token) return;
          try { await fetch("/api/admin/config", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ settings: { language: lang, toolbarFont: f, appTheme, colorMode } }) }); } catch {}
        }}
        theme={appTheme as any}
        onChangeTheme={async (th) => {
          setAppTheme(th);
          (await import("@/lib/theme/colors")).applyTheme(th);
          const token = await getToken(); if (!token) return;
          try { await fetch("/api/admin/config", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ settings: { language: lang, toolbarFont, appTheme: th, colorMode } }) }); } catch {}
        }}
        colorMode={colorMode}
        onChangeColorMode={async (mode) => {
          setColorMode(mode);
          (await import("@/lib/theme/colors")).applyColorMode(mode);
          const token = await getToken(); if (!token) return;
          try { await fetch("/api/admin/config", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ settings: { language: lang, toolbarFont, appTheme, colorMode: mode } }) }); } catch {}
        }}
        useGradients={useGradients}
        onChangeGradients={async (on) => {
          setUseGradients(on);
          (await import("@/lib/theme/colors")).applyGradientMode(on);
          const token = await getToken(); if (!token) return;
          try { await fetch("/api/admin/config", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ settings: { useGradients: on } }) }); } catch {}
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

      {/* Feed tabs (only show when logged in and has following content) */}
      {!loading && authed && followingPhotos.length > 0 && (
        <div className="wall-feed-tabs">
          <button
            className={`wall-feed-tab ${feedTab === "all" ? "wall-feed-tab-active" : ""}`}
            onClick={() => setFeedTab("all")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            {lang === "es" ? "Todos" : "All"}
          </button>
          <button
            className={`wall-feed-tab ${feedTab === "following" ? "wall-feed-tab-active" : ""}`}
            onClick={() => setFeedTab("following")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
            {lang === "es" ? "Siguiendo" : "Following"}
            <span className="wall-feed-tab-count">{followingPhotos.length}</span>
          </button>
        </div>
      )}

      {!loading && photos.length > 0 && (() => {
        const displayPhotos = feedTab === "following" && authed ? followingPhotos : photos;
        const ROWS = Math.max(3, Math.ceil(displayPhotos.length / 4));
        const rowsArr: WallPhoto[][] = [];
        const perRow = Math.max(4, Math.ceil(displayPhotos.length / ROWS));
        for (let i = 0; i < ROWS; i++) {
          const row = displayPhotos.slice(i * perRow, (i + 1) * perRow);
          if (row.length > 0) rowsArr.push(row);
        }
        return (
          <div className="wall-carousel-container">
            {/* Section label for Following tab */}
            {feedTab === "following" && followingPhotos.length === 0 && (
              <div className="wall-empty"><p>{lang === "es" ? "Sigue a alguien para ver su contenido aqui" : "Follow someone to see their content here"}</p></div>
            )}
            {rowsArr.map((row, ri) => (
              <div key={ri} className="wall-carousel-row">
                <div className={`wall-carousel-track ${ri % 2 === 1 ? "wall-carousel-reverse" : ""}`} style={{ animationDuration: `${25 + ri * 5}s` }}>
                  {[...row, ...row].map((photo, j) => (
                    <div
                      key={`${photo.id}-${j}`}
                      className={`wall-card ${wobbles[j % wobbles.length]} ${photo.relation === "mutual" ? "wall-card-mutual" : photo.relation === "following" ? "wall-card-following" : ""}`}
                      onClick={() => openPhoto(photo)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.imageUrl} alt="" className="wall-card-img" loading="lazy" />
                      <div className="wall-card-overlay">
                        <span>@{photo.username}</span>
                        {photo.relation === "mutual" && <span className="wall-card-badge wall-card-badge-mutual">🤝</span>}
                        {photo.relation === "following" && <span className="wall-card-badge wall-card-badge-following">✓</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

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
              <div className="wall-modal-btn-row">
                <button
                  className="wall-make-own-btn"
                  onClick={() => {
                    const prompt = selected?.prompt || "";
                    const templateImg = encodeURIComponent(selected?.imageUrl || "");
                    router.push(`/photos?tab=photos&prompt=${encodeURIComponent(prompt)}&template=${templateImg}`);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                  {lang === "es" ? "Crea la tuya" : "Make your own"}
                </button>
                <button
                  className={`wall-follow-me-btn ${following ? "wall-follow-me-active" : ""}`}
                  onClick={handleFollow}
                  disabled={!authed}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {following ? (
                      <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></>
                    ) : (
                      <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></>
                    )}
                  </svg>
                  {following ? "Following" : "Follow me"}
                </button>
              </div>
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

      {/* Floating social stats button */}
      {authed && (
        <button className="wall-social-fab" onClick={openSocialPanel}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span className="wall-social-fab-count">{myFollowersCount}</span>
          <span>{lang === "es" ? "seguidores" : "followers"}</span>
        </button>
      )}

      {/* Social panel (followers/following) */}
      {showSocialPanel && (
        <>
          <div className="wall-social-panel-backdrop" onClick={() => setShowSocialPanel(false)} />
          <div className={`wall-social-panel ${showSocialPanel ? "wall-social-panel-open" : ""}`}>
            <div className="wall-social-header">
              <h3>{username || ""}</h3>
              <button className="wall-social-close" onClick={() => setShowSocialPanel(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="wall-social-tabs">
              <button
                className={`wall-social-tab ${socialTab === "following" ? "wall-social-tab-active" : ""}`}
                onClick={() => setSocialTab("following")}
              >
                {lang === "es" ? "Siguiendo" : "Following"} ({socialFollowing.length})
              </button>
              <button
                className={`wall-social-tab ${socialTab === "followers" ? "wall-social-tab-active" : ""}`}
                onClick={() => setSocialTab("followers")}
              >
                {lang === "es" ? "Seguidores" : "Followers"} ({socialFollowers.length})
              </button>
            </div>
            <div className="wall-social-list">
              {socialLoading && <div style={{ textAlign: "center", padding: 32 }}><div className="ph-spinner-small" /></div>}
              {!socialLoading && (socialTab === "following" ? socialFollowing : socialFollowers).length === 0 && (
                <p className="wall-social-empty">
                  {socialTab === "following"
                    ? (lang === "es" ? "No sigues a nadie aun" : "You're not following anyone yet")
                    : (lang === "es" ? "Nadie te sigue aun" : "No followers yet")}
                </p>
              )}
              {!socialLoading && (socialTab === "following" ? socialFollowing : socialFollowers).map((user) => {
                const isMutual = socialFollowing.includes(user) && socialFollowers.includes(user);
                return (
                  <div
                    key={user}
                    className="wall-social-item"
                    onClick={() => { setShowSocialPanel(false); router.push(`/${user}/showcase`); }}
                  >
                    <div className="wall-social-avatar">{user.charAt(0).toUpperCase()}</div>
                    <span className="wall-social-username">@{user}</span>
                    {isMutual && <span className="wall-social-mutual">{lang === "es" ? "Mutuo" : "Mutual"}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
