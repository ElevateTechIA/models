"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

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

  useEffect(() => {
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

  // Assign random animation class to each photo
  const animations = ["wall-float-1", "wall-float-2", "wall-float-3", "wall-wobble-1", "wall-wobble-2"];

  return (
    <div className="wall-page">
      <header className="wall-header">
        <button className="wall-back" onClick={() => router.back()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1 className="wall-title">Wall</h1>
      </header>

      {loading && <div className="wall-loading"><div className="ph-spinner-small" /></div>}

      {!loading && photos.length === 0 && (
        <div className="wall-empty"><p>No photos yet</p></div>
      )}

      {!loading && photos.length > 0 && (
        <div className="wall-mosaic">
          {photos.map((photo, i) => (
            <div
              key={photo.id}
              className={`wall-card ${animations[i % animations.length]}`}
              style={{ animationDelay: `${(i * 0.3) % 2}s` }}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
