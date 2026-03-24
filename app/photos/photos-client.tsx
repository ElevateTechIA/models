"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

const ALLOWED_USERNAMES = ["cesarvegacol"];

type Tab = "photos" | "videos" | "library";
type LibraryFilter = "photos" | "videos";
type ResultItem = { id: string; url: string; prompt: string; aspectRatio: string };
type LibraryImage = { id: string; imageUrl: string; prompt: string; aspectRatio: string; createdAt: number };
type LibraryVideo = { id: string; videoUrl: string; thumbnailUrl: string; prompt: string; aspectRatio: string; createdAt: number };

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1", icon: "\u25A0" },
  { value: "4:3", label: "4:3", icon: "\u25AC" },
  { value: "16:9", label: "16:9", icon: "\u25AD" },
  { value: "9:16", label: "9:16", icon: "\u25AE" },
  { value: "2:3", label: "2:3", icon: "\u25AF" },
  { value: "4:5", label: "4:5", icon: "\u25B1" },
  { value: "3:2", label: "3:2", icon: "\u25AD" },
];

function getAspectNumber(ratio: string): number {
  const [w, h] = ratio.split(":").map(Number);
  return w / h;
}

export default function PhotosClient() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("photos");
  const [authReady, setAuthReady] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ── Photo state ──
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [resultImages, setResultImages] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [showRatioPanel, setShowRatioPanel] = useState(false);

  // ── Video state ──
  const [vidPrompt, setVidPrompt] = useState("");
  const [vidAspectRatio, setVidAspectRatio] = useState("9:16");
  const [vidSourceImage, setVidSourceImage] = useState<string | null>(null);
  const [resultVideos, setResultVideos] = useState<ResultItem[]>([]);
  const [vidLoading, setVidLoading] = useState(false);
  const [vidError, setVidError] = useState("");
  const [vidElapsed, setVidElapsed] = useState(0);
  const [showVidRatioPanel, setShowVidRatioPanel] = useState(false);

  // ── Fullscreen state ──
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null);
  const [fullscreenPrompt, setFullscreenPrompt] = useState("");

  // ── Library state ──
  const [libraryImages, setLibraryImages] = useState<LibraryImage[]>([]);
  const [libraryVideos, setLibraryVideos] = useState<LibraryVideo[]>([]);
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>("photos");
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryPhotosFetched, setLibraryPhotosFetched] = useState(false);
  const [libraryVideosFetched, setLibraryVideosFetched] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const vidFileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vidTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultsEndRef = useRef<HTMLDivElement>(null);
  const vidResultsEndRef = useRef<HTMLDivElement>(null);

  // ── Auth ──
  async function getToken(): Promise<string | null> {
    try { return (await auth.currentUser?.getIdToken()) ?? null; } catch { return null; }
  }

  useEffect(() => {
    const username = localStorage.getItem("username");
    if (!username || !ALLOWED_USERNAMES.includes(username)) { router.replace("/"); return; }
    setAuthorized(true);
    const unsub = onAuthStateChanged(auth, (u) => { if (u) setAuthReady(true); });
    return () => unsub();
  }, [router]);

  // ── Library fetch ──
  const fetchLibraryPhotos = useCallback(async () => {
    const token = await getToken(); if (!token) return;
    setLibraryLoading(true);
    try { const res = await fetch("/api/photos/library", { headers: { Authorization: `Bearer ${token}` } }); if (res.ok) { const d = await res.json(); setLibraryImages(d.images || []); } } catch {} finally { setLibraryLoading(false); setLibraryPhotosFetched(true); }
  }, []);

  const fetchLibraryVideos = useCallback(async () => {
    const token = await getToken(); if (!token) return;
    setLibraryLoading(true);
    try { const res = await fetch("/api/videos/library", { headers: { Authorization: `Bearer ${token}` } }); if (res.ok) { const d = await res.json(); setLibraryVideos(d.videos || []); } } catch {} finally { setLibraryLoading(false); setLibraryVideosFetched(true); }
  }, []);

  useEffect(() => {
    if (activeTab === "library") {
      if (libraryFilter === "photos" && !libraryPhotosFetched) fetchLibraryPhotos();
      if (libraryFilter === "videos" && !libraryVideosFetched) fetchLibraryVideos();
    }
  }, [activeTab, libraryFilter, libraryPhotosFetched, libraryVideosFetched, fetchLibraryPhotos, fetchLibraryVideos]);

  // ── Auto-save ──
  async function savePhotoToLibrary(imageData: string, p: string, ar: string) {
    try { const token = await getToken(); if (!token) return; const res = await fetch("/api/photos/library", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ image: imageData, prompt: p, aspectRatio: ar }) }); if (res.ok) setLibraryPhotosFetched(false); } catch {}
  }

  async function saveVideoToLibrary(videoData: string, p: string, ar: string, thumb: string | null) {
    try { const token = await getToken(); if (!token) return; const res = await fetch("/api/videos/library", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ video: videoData, prompt: p, aspectRatio: ar, thumbnailImage: thumb }) }); if (res.ok) setLibraryVideosFetched(false); } catch {}
  }

  // ── Copy prompt ──
  async function copyPrompt(text: string, id: string) {
    try { await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); } catch {}
  }

  // ── Photo handlers ──
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 4 * 1024 * 1024) { setError("Imagen muy grande (max 4 MB)"); return; }
    setError("");
    const reader = new FileReader();
    reader.onload = () => setReferenceImage(reader.result as string);
    reader.readAsDataURL(file);
  }
  function clearImage() { setReferenceImage(null); setResultImages([]); setError(""); if (fileInputRef.current) fileInputRef.current.value = ""; }

  async function generate() {
    if (!prompt.trim() || !referenceImage) return;
    const currentPrompt = prompt;
    const currentAR = aspectRatio;
    setLoading(true); setError(""); setElapsed(0);
    const start = Date.now();
    timerRef.current = setInterval(() => setElapsed((Date.now() - start) / 1000), 100);
    try {
      const res = await fetch("/api/photos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: currentPrompt, image: referenceImage, aspect_ratio: currentAR }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Algo salio mal"); return; }
      setResultImages(prev => [...prev, { id: Date.now().toString(), url: data.image, prompt: currentPrompt, aspectRatio: currentAR }]);
      savePhotoToLibrary(data.image, currentPrompt, currentAR);
      setTimeout(() => resultsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch { setError("Error de red."); } finally { setLoading(false); if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } }
  }

  // ── Video handlers ──
  function handleVidImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 4 * 1024 * 1024) { setVidError("Imagen muy grande (max 4 MB)"); return; }
    setVidError("");
    const reader = new FileReader();
    reader.onload = () => setVidSourceImage(reader.result as string);
    reader.readAsDataURL(file);
  }
  function clearVidImage() { setVidSourceImage(null); setResultVideos([]); setVidError(""); if (vidFileInputRef.current) vidFileInputRef.current.value = ""; }

  async function generateVideo() {
    if (!vidSourceImage) return;
    const currentPrompt = vidPrompt;
    const currentAR = vidAspectRatio;
    setVidLoading(true); setVidError(""); setVidElapsed(0);
    const start = Date.now();
    vidTimerRef.current = setInterval(() => setVidElapsed((Date.now() - start) / 1000), 100);
    try {
      const res = await fetch("/api/videos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: currentPrompt || undefined, image: vidSourceImage, aspect_ratio: currentAR }) });
      const data = await res.json();
      if (!res.ok) { setVidError(data.error || "Algo salio mal"); return; }
      setResultVideos(prev => [...prev, { id: Date.now().toString(), url: data.video, prompt: currentPrompt || "Auto-animated", aspectRatio: currentAR }]);
      saveVideoToLibrary(data.video, currentPrompt, currentAR, vidSourceImage);
      setTimeout(() => vidResultsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch { setVidError("Error de red."); } finally { setVidLoading(false); if (vidTimerRef.current) { clearInterval(vidTimerRef.current); vidTimerRef.current = null; } }
  }

  // ── Shared helpers ──
  async function fetchMediaBlob(url: string): Promise<Blob> {
    if (url.startsWith("data:")) { const res = await fetch(url); return res.blob(); }
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
    return (await fetch(proxyUrl)).blob();
  }

  async function handleSave(url?: string) {
    const target = url || fullscreenImage || fullscreenVideo; if (!target) return;
    const isVid = target.includes("video/") || target.endsWith(".mp4");
    try { const blob = await fetchMediaBlob(target); const blobUrl = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = blobUrl; a.download = `photo-studio-${Date.now()}.${isVid ? "mp4" : "png"}`; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(blobUrl), 1000); } catch { if (target) window.open(target, "_blank"); }
  }

  async function handleShare(url?: string) {
    const target = url || fullscreenImage || fullscreenVideo; if (!target) return;
    const isVid = target.includes("video/") || target.endsWith(".mp4");
    try { const blob = await fetchMediaBlob(target); const file = new File([blob], `photo-studio.${isVid ? "mp4" : "png"}`, { type: isVid ? "video/mp4" : "image/png" }); if (navigator.share && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: "Photo Studio" }); return; } handleSave(target); } catch {}
  }

  async function handlePost(url?: string) {
    const target = url || fullscreenImage || fullscreenVideo; if (!target) return;
    const isVid = target.includes("video/") || target.endsWith(".mp4");
    try { const blob = await fetchMediaBlob(target); const file = new File([blob], `photo-studio.${isVid ? "mp4" : "png"}`, { type: isVid ? "video/mp4" : "image/png" }); if (navigator.share && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: "Photo Studio", text: "Created with Photo Studio" }); return; } handleSave(target); } catch {}
  }

  function openVideoFromLibrary(imageUrl: string) { setVidSourceImage(imageUrl); setResultVideos([]); setVidError(""); setActiveTab("videos"); }

  function openFullscreenImage(url: string, p: string) { setFullscreenImage(url); setFullscreenPrompt(p); }
  function openFullscreenVideo(url: string, p: string) { setFullscreenVideo(url); setFullscreenPrompt(p); }

  if (!authorized) return null;

  // ── Copy button SVG ──
  const CopyIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;

  // ── Spinner ──
  function Spinner({ c1, c2, t }: { c1: string; c2: string; t: number }) {
    return (
      <div className="ph-loading">
        <div className="ph-loading-icon">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="16" stroke={`${c1}33`} strokeWidth="3" /><path d="M20 4a16 16 0 0 1 16 16" stroke="url(#sg)" strokeWidth="3" strokeLinecap="round"><animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="1s" repeatCount="indefinite" /></path><defs><linearGradient id="sg" x1="20" y1="4" x2="36" y2="20"><stop stopColor={c1} /><stop offset="1" stopColor={c2} /></linearGradient></defs></svg>
          <svg className="ph-sparkle" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c1} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" /></svg>
        </div>
        <p className="ph-loading-text">Creating magic...</p>
        <p className="ph-loading-hint">This may take a moment</p>
        <p className="ph-loading-timer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", marginRight: 4 }}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>{t.toFixed(1)}s</p>
      </div>
    );
  }

  // ── Ratio panel ──
  function RatioPanel({ cur, set, show }: { cur: string; set: (v: string) => void; show: boolean }) {
    if (!show) return null;
    return (<div className="ph-ratio-panel"><div className="ph-ratio-row">{ASPECT_RATIOS.slice(0, 4).map((r) => (<button key={r.value} className={`ph-ratio-btn ${cur === r.value ? "ph-ratio-active" : ""}`} onClick={() => set(r.value)}><span className="ph-ratio-icon">{r.icon}</span><span>{r.label}</span></button>))}</div><div className="ph-ratio-row">{ASPECT_RATIOS.slice(4).map((r) => (<button key={r.value} className={`ph-ratio-btn ${cur === r.value ? "ph-ratio-active" : ""}`} onClick={() => set(r.value)}><span className="ph-ratio-icon">{r.icon}</span><span>{r.label}</span></button>))}</div></div>);
  }

  // ── Result card for images ──
  function ImageCard({ item }: { item: ResultItem }) {
    return (
      <div className="ph-result-card" style={{ aspectRatio: `${getAspectNumber(item.aspectRatio)}` }}>
        <div className="ph-result-wrap" onClick={() => openFullscreenImage(item.url, item.prompt)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.url} alt="Generated" className="ph-result-img" />
          <div className="ph-result-actions-inline">
            <button className="ph-inline-btn ph-inline-btn-copy" onClick={(e) => { e.stopPropagation(); copyPrompt(item.prompt, item.id); }} title="Copy prompt">
              {copiedId === item.id ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : <CopyIcon />}
            </button>
            <button className="ph-inline-btn" onClick={(e) => { e.stopPropagation(); handleSave(item.url); }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
          </div>
        </div>
        {item.prompt && <p className="ph-result-prompt">{item.prompt}</p>}
      </div>
    );
  }

  // ── Result card for videos ──
  function VideoCard({ item }: { item: ResultItem }) {
    return (
      <div className="ph-result-card" style={{ aspectRatio: `${getAspectNumber(item.aspectRatio)}` }}>
        <div className="ph-result-wrap">
          <video src={item.url} className="ph-result-img" autoPlay loop playsInline controls />
          <div className="ph-result-actions-inline">
            <button className="ph-inline-btn ph-inline-btn-copy" onClick={() => copyPrompt(item.prompt, item.id)} title="Copy prompt">
              {copiedId === item.id ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : <CopyIcon />}
            </button>
            <button className="ph-inline-btn" onClick={() => handleSave(item.url)} title="Save"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
            <button className="ph-inline-btn" onClick={() => handleShare(item.url)} title="Share"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>
          </div>
        </div>
        {item.prompt && <p className="ph-result-prompt">{item.prompt}</p>}
      </div>
    );
  }

  // ── Fullscreen actions (shared) ──
  function FullscreenActions({ onClose, showGenVideo, imageUrl }: { onClose: () => void; showGenVideo?: boolean; imageUrl?: string }) {
    return (
      <>
        <div className="ph-fullscreen-actions">
          <button className="ph-fs-btn" onClick={() => handleSave()}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>Save</span></button>
          <button className="ph-fs-btn" onClick={() => handleShare()}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg><span>Share</span></button>
          <button className="ph-fs-btn ph-fs-btn-post" onClick={() => handlePost()}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg><span>Post</span></button>
        </div>
        {fullscreenPrompt && (
          <button className="ph-fs-btn ph-fs-btn-copy" onClick={() => copyPrompt(fullscreenPrompt, "fs")}>
            {copiedId === "fs" ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>Copied!</span></> : <><CopyIcon /><span>Copy Prompt</span></>}
          </button>
        )}
        {showGenVideo && imageUrl && (
          <button className="ph-fs-btn ph-fs-btn-video" onClick={() => { onClose(); openVideoFromLibrary(imageUrl); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg><span>Generate Video</span>
          </button>
        )}
        <button className="ph-fs-btn ph-fs-btn-close" onClick={onClose}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg><span>Close</span></button>
      </>
    );
  }

  return (
    <div className={`ph-page ${activeTab === "videos" ? "ph-theme-blue" : activeTab === "library" ? "ph-theme-purple" : ""}`}>
      <header className="ph-header">
        <a href="/admin" className="ph-back">&larr;</a>
        <h1 className="ph-title">Photo Studio</h1>
      </header>

      {/* ═══ PHOTOS TAB ═══ */}
      {activeTab === "photos" && (
        <>
          <div className="ph-results-scroll">
            {/* Reference image */}
            {referenceImage && !loading && resultImages.length === 0 && (
              <div className="ph-preview" style={{ aspectRatio: `${getAspectNumber(aspectRatio)}` }}>
                <div className="ph-ref-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={referenceImage} alt="Reference" className="ph-ref-img" />
                  <div className="ph-ref-overlay"><p>Imagen de referencia</p><button className="ph-ref-remove" onClick={clearImage}>Cambiar</button></div>
                </div>
              </div>
            )}

            {!referenceImage && resultImages.length === 0 && !loading && (
              <div className="ph-preview" style={{ aspectRatio: `${getAspectNumber(aspectRatio)}` }}>
                <label className="ph-upload-zone">
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(201,168,76,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <p className="ph-upload-text">Toca para subir una foto de referencia</p>
                </label>
              </div>
            )}

            {/* Stacked results */}
            {resultImages.map((item) => <ImageCard key={item.id} item={item} />)}

            {/* Loading spinner */}
            {loading && (
              <div className="ph-preview" style={{ aspectRatio: `${getAspectNumber(aspectRatio)}` }}>
                <Spinner c1="#c9a84c" c2="#e8d48b" t={elapsed} />
              </div>
            )}
            <div ref={resultsEndRef} />
          </div>
          {error && <p className="ph-error">{error}</p>}
          <div className="ph-input-area">
            <textarea className="ph-textarea" placeholder="Describe the image you want to create..." value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} />
            <RatioPanel cur={aspectRatio} set={setAspectRatio} show={showRatioPanel} />
            <div className="ph-toolbar">
              {referenceImage ? (
                <button className="ph-thumb-btn" onClick={() => fileInputRef.current?.click()}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={referenceImage} alt="ref" className="ph-thumb-img" />
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
                </button>
              ) : (
                <label className="ph-thumb-btn ph-thumb-empty">
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </label>
              )}
              <button className={`ph-ratio-toggle ${showRatioPanel ? "ph-ratio-toggle-active" : ""}`} onClick={() => setShowRatioPanel(!showRatioPanel)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="18" rx="2" ry="2" /><rect x="6" y="7" width="12" height="10" rx="1" ry="1" /></svg><span>{aspectRatio}</span></button>
              <button className="ph-mic-btn" disabled><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg></button>
              <button className="ph-send-btn" onClick={generate} disabled={loading || !prompt.trim() || !referenceImage}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
            </div>
          </div>
        </>
      )}

      {/* ═══ VIDEOS TAB ═══ */}
      {activeTab === "videos" && (
        <>
          <div className="ph-results-scroll">
            {vidSourceImage && !vidLoading && resultVideos.length === 0 && (
              <div className="ph-preview" style={{ aspectRatio: `${getAspectNumber(vidAspectRatio)}` }}>
                <div className="ph-ref-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={vidSourceImage} alt="Source" className="ph-ref-img" />
                  <div className="ph-ref-overlay"><p>Source image</p><button className="ph-ref-remove" onClick={clearVidImage}>Cambiar</button></div>
                </div>
              </div>
            )}

            {!vidSourceImage && resultVideos.length === 0 && !vidLoading && (
              <div className="ph-preview" style={{ aspectRatio: `${getAspectNumber(vidAspectRatio)}` }}>
                <label className="ph-upload-zone">
                  <input ref={vidFileInputRef} type="file" accept="image/*" onChange={handleVidImageUpload} style={{ display: "none" }} />
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(59,130,246,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                  <p className="ph-upload-text">Toca para subir una imagen para animar</p>
                </label>
              </div>
            )}

            {resultVideos.map((item) => <VideoCard key={item.id} item={item} />)}

            {vidLoading && (
              <div className="ph-preview" style={{ aspectRatio: `${getAspectNumber(vidAspectRatio)}` }}>
                <Spinner c1="#3b82f6" c2="#60a5fa" t={vidElapsed} />
              </div>
            )}
            <div ref={vidResultsEndRef} />
          </div>
          {vidError && <p className="ph-error">{vidError}</p>}
          <div className="ph-input-area">
            <textarea className="ph-textarea" placeholder="Describe the motion (optional)..." value={vidPrompt} onChange={(e) => setVidPrompt(e.target.value)} rows={2} />
            <RatioPanel cur={vidAspectRatio} set={setVidAspectRatio} show={showVidRatioPanel} />
            <div className="ph-toolbar">
              {vidSourceImage ? (
                <button className="ph-thumb-btn" onClick={() => vidFileInputRef.current?.click()}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={vidSourceImage} alt="ref" className="ph-thumb-img" />
                  <input ref={vidFileInputRef} type="file" accept="image/*" onChange={handleVidImageUpload} style={{ display: "none" }} />
                </button>
              ) : (
                <label className="ph-thumb-btn ph-thumb-empty">
                  <input ref={vidFileInputRef} type="file" accept="image/*" onChange={handleVidImageUpload} style={{ display: "none" }} />
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </label>
              )}
              <button className={`ph-ratio-toggle ${showVidRatioPanel ? "ph-ratio-toggle-active" : ""}`} onClick={() => setShowVidRatioPanel(!showVidRatioPanel)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="18" rx="2" ry="2" /><rect x="6" y="7" width="12" height="10" rx="1" ry="1" /></svg><span>{vidAspectRatio}</span></button>
              <button className="ph-mic-btn" disabled><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg></button>
              <button className="ph-send-btn" onClick={generateVideo} disabled={vidLoading || !vidSourceImage}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
            </div>
          </div>
        </>
      )}

      {/* ═══ LIBRARY TAB ═══ */}
      {activeTab === "library" && (
        <div className="ph-library">
          <div className="ph-library-toolbar">
            <button className={`ph-lib-filter ${libraryFilter === "photos" ? "ph-lib-filter-active" : ""}`} onClick={() => setLibraryFilter("photos")}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>Fotos</span></button>
            <button className={`ph-lib-filter ${libraryFilter === "videos" ? "ph-lib-filter-active" : ""}`} onClick={() => setLibraryFilter("videos")}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg><span>Videos</span></button>
          </div>

          {libraryLoading && <div className="ph-library-loading"><div className="ph-spinner-small" /><p>Loading...</p></div>}

          {!libraryLoading && libraryFilter === "photos" && (
            libraryImages.length === 0 ? (
              <div className="ph-library-empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(168,85,247,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><p>No photos yet</p><p className="ph-library-empty-hint">Generate your first photo to see it here</p></div>
            ) : (
              <div className="ph-library-grid">
                {libraryImages.map((img) => (
                  <div key={img.id} className="ph-library-item" onClick={() => openFullscreenImage(img.imageUrl, img.prompt)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.imageUrl} alt={img.prompt} className="ph-library-img" />
                  </div>
                ))}
              </div>
            )
          )}

          {!libraryLoading && libraryFilter === "videos" && (
            libraryVideos.length === 0 ? (
              <div className="ph-library-empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(168,85,247,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg><p>No videos yet</p><p className="ph-library-empty-hint">Generate your first video to see it here</p></div>
            ) : (
              <div className="ph-library-grid">
                {libraryVideos.map((vid) => (
                  <div key={vid.id} className="ph-library-item" onClick={() => openFullscreenVideo(vid.videoUrl, vid.prompt)}>
                    {vid.thumbnailUrl ? (<>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={vid.thumbnailUrl} alt={vid.prompt} className="ph-library-img" /><div className="ph-library-play"><svg width="24" height="24" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg></div></>) : (<video src={vid.videoUrl} className="ph-library-img" muted preload="metadata" />)}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* ═══ BOTTOM TAB BAR ═══ */}
      <nav className="ph-tab-bar">
        <button className={`ph-tab ${activeTab === "photos" ? "ph-tab-active" : ""}`} onClick={() => setActiveTab("photos")}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg><span>Photos</span></button>
        <button className={`ph-tab ${activeTab === "videos" ? "ph-tab-active-blue" : ""}`} onClick={() => setActiveTab("videos")}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg><span>Videos</span></button>
        <button className={`ph-tab ${activeTab === "library" ? "ph-tab-active-purple" : ""}`} onClick={() => setActiveTab("library")}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg><span>Library</span></button>
      </nav>

      {/* ═══ FULLSCREEN IMAGE ═══ */}
      {fullscreenImage && (
        <div className="ph-fullscreen" onClick={() => setFullscreenImage(null)}>
          <div className="ph-fullscreen-inner" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fullscreenImage} alt="Generated" className="ph-fullscreen-img" />
            <FullscreenActions onClose={() => setFullscreenImage(null)} showGenVideo={activeTab === "library"} imageUrl={fullscreenImage} />
          </div>
        </div>
      )}

      {/* ═══ FULLSCREEN VIDEO ═══ */}
      {fullscreenVideo && (
        <div className="ph-fullscreen" onClick={() => setFullscreenVideo(null)}>
          <div className="ph-fullscreen-inner" onClick={(e) => e.stopPropagation()}>
            <video src={fullscreenVideo} className="ph-fullscreen-img" autoPlay loop playsInline controls />
            <FullscreenActions onClose={() => setFullscreenVideo(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
