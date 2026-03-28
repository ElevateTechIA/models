"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { translations } from "@/lib/translations";
import { InsufficientCreditsModal } from "@/components/credits/InsufficientCreditsModal";
import AppToolbar from "@/app/components/AppToolbar";
import MobileMenu from "@/app/components/MobileMenu";

// Access is now open to all authenticated users (controlled by credits)

type Tab = "photos" | "videos" | "library" | "wall";
type LibraryFilter = "photos" | "videos";
type ResultItem = { id: string; url: string; prompt: string; aspectRatio: string };
type LibraryImage = { id: string; imageUrl: string; prompt: string; aspectRatio: string; createdAt: number; isPublic?: boolean };
type WallPhoto = { id: string; imageUrl: string; username: string; prompt: string };
type WallComment = { id: string; username: string; text: string; createdAt: number };
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
  const searchParams = useSearchParams();
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("library");
  const [authReady, setAuthReady] = useState(false);
  const [lang, setLang] = useState<"es" | "en">("es");
  const t = translations[lang] || translations.es;
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [toolbarFont, setToolbarFont] = useState<"gothic" | "elegant" | "clean">("elegant");
  const [appTheme, setAppTheme] = useState<string>("gold");
  const [colorMode, setColorMode] = useState<"light" | "dark" | "auto">("light");
  const [templateImage, setTemplateImage] = useState<string | null>(null);

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

  // ── Credits state ──
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [creditToast, setCreditToast] = useState<{ used: number; remaining: number } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiRef = useRef<HTMLCanvasElement>(null);

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

  // ── Wall state ──
  const [wallPhotos, setWallPhotos] = useState<WallPhoto[]>([]);
  const [wallLoading, setWallLoading] = useState(false);
  const [wallSelected, setWallSelected] = useState<WallPhoto | null>(null);
  const [wallLiked, setWallLiked] = useState(false);
  const [wallLikeCount, setWallLikeCount] = useState(0);
  const [wallComments, setWallComments] = useState<WallComment[]>([]);
  const [wallNewComment, setWallNewComment] = useState("");
  const [wallSending, setWallSending] = useState(false);

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
    const storedUsername = localStorage.getItem("username");
    if (!storedUsername) { router.replace("/"); return; }
    setUsername(storedUsername);
    setAuthorized(true);
    // Detect language from config
    function loadLang() {
      fetch(`/api/admin/config?username=${storedUsername}`).then(r => r.json()).then(d => {
        if (d?.settings?.language) setLang(d.settings.language);
        if (d?.settings?.toolbarFont) setToolbarFont(d.settings.toolbarFont);
        if (d?.settings?.appTheme) { setAppTheme(d.settings.appTheme); import("@/lib/theme/colors").then(m => m.applyTheme(d.settings.appTheme)); }
        if (d?.settings?.colorMode) { setColorMode(d.settings.colorMode); import("@/lib/theme/colors").then(m => m.applyColorMode(d.settings.colorMode)); }
      }).catch(() => {});
    }
    loadLang();
    // Re-fetch language when user returns to this tab
    const handleFocus = () => loadLang();
    window.addEventListener("focus", handleFocus);
    const unsub = onAuthStateChanged(auth, (u) => { if (u) setAuthReady(true); });
    return () => { unsub(); window.removeEventListener("focus", handleFocus); };
  }, [router]);

  // ── Handle "Make your own" from wall ──
  useEffect(() => {
    const tab = searchParams.get("tab");
    const promptParam = searchParams.get("prompt");
    const templateParam = searchParams.get("template");
    if (tab === "photos") setActiveTab("photos");
    if (promptParam) setPrompt(decodeURIComponent(promptParam));
    if (templateParam) setTemplateImage(decodeURIComponent(templateParam));
  }, [searchParams]);

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

  async function handleLogout() {
    try { await signOut(auth); } catch {}
    localStorage.removeItem("username");
    router.replace("/");
  }

  // ── Confetti + toast ──
  function celebrate(creditsUsed: number, creditsRemaining: number) {
    setCreditToast({ used: creditsUsed, remaining: creditsRemaining });
    setTimeout(() => setCreditToast(null), 4000);
    setShowConfetti(true);
    const canvas = confettiRef.current;
    if (!canvas) { setTimeout(() => setShowConfetti(false), 2500); return; }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const colors = ["#c9a84c", "#e8d48b", "#f5e6a3", "#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#ffeaa7", "#dfe6e9", "#fd79a8"];
    const particles: { x: number; y: number; vx: number; vy: number; r: number; color: string; rot: number; vr: number; life: number }[] = [];
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width * Math.random(),
        y: -10 - Math.random() * 40,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 3 + 2,
        r: Math.random() * 5 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.2,
        life: 1,
      });
    }
    let frame = 0;
    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        if (p.life <= 0) continue;
        alive = true;
        p.x += p.vx;
        p.vy += 0.08;
        p.y += p.vy;
        p.rot += p.vr;
        p.life -= 0.008;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.r / 2, -p.r, p.r, p.r * 2);
        ctx.restore();
      }
      frame++;
      if (alive && frame < 180) requestAnimationFrame(draw);
      else { ctx.clearRect(0, 0, canvas.width, canvas.height); setShowConfetti(false); }
    }
    requestAnimationFrame(draw);
  }

  // ── Photo handlers ──
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 4 * 1024 * 1024) { setError(t.imageTooLarge); return; }
    setError("");
    const reader = new FileReader();
    reader.onload = () => setReferenceImage(reader.result as string);
    reader.readAsDataURL(file);
  }
  function clearImage() { setReferenceImage(null); setResultImages([]); setError(""); if (fileInputRef.current) fileInputRef.current.value = ""; }

  async function generate() {
    if (!prompt.trim() || !referenceImage) return;
    const token = await getToken();
    if (!token) { setError(t.loginRequiredPhotos); return; }
    const currentPrompt = prompt;
    const currentAR = aspectRatio;
    setLoading(true); setError(""); setElapsed(0);
    const start = Date.now();
    timerRef.current = setInterval(() => setElapsed((Date.now() - start) / 1000), 100);
    try {
      const res = await fetch("/api/photos", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ prompt: currentPrompt, image: referenceImage, aspect_ratio: currentAR }) });
      const data = await res.json();
      if (!res.ok) { if (data.error === "INSUFFICIENT_CREDITS") { setShowCreditsModal(true); return; } setError(data.error || "Algo salio mal"); return; }
      setResultImages(prev => [...prev, { id: Date.now().toString(), url: data.image, prompt: currentPrompt, aspectRatio: currentAR }]);
      savePhotoToLibrary(data.image, currentPrompt, currentAR);
      if (data.creditsUsed) celebrate(data.creditsUsed, data.creditsRemaining ?? 0);
      setTimeout(() => resultsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch { setError(t.networkError); } finally { setLoading(false); if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } }
  }

  // ── Video handlers ──
  function handleVidImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 4 * 1024 * 1024) { setVidError(t.imageTooLarge); return; }
    setVidError("");
    const reader = new FileReader();
    reader.onload = () => setVidSourceImage(reader.result as string);
    reader.readAsDataURL(file);
  }
  function clearVidImage() { setVidSourceImage(null); setResultVideos([]); setVidError(""); if (vidFileInputRef.current) vidFileInputRef.current.value = ""; }

  async function generateVideo() {
    if (!vidSourceImage) return;
    const token = await getToken();
    if (!token) { setVidError(t.loginRequiredVideos); return; }
    const currentPrompt = vidPrompt;
    const currentAR = vidAspectRatio;
    setVidLoading(true); setVidError(""); setVidElapsed(0);
    const start = Date.now();
    vidTimerRef.current = setInterval(() => setVidElapsed((Date.now() - start) / 1000), 100);
    try {
      const res = await fetch("/api/videos", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ prompt: currentPrompt || undefined, image: vidSourceImage, aspect_ratio: currentAR }) });
      const data = await res.json();
      if (!res.ok) { if (data.error === "INSUFFICIENT_CREDITS") { setShowCreditsModal(true); return; } setVidError(data.error || "Algo salio mal"); return; }
      setResultVideos(prev => [...prev, { id: Date.now().toString(), url: data.video, prompt: currentPrompt || "Auto-animated", aspectRatio: currentAR }]);
      saveVideoToLibrary(data.video, currentPrompt, currentAR, vidSourceImage);
      setTimeout(() => vidResultsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch { setVidError(t.networkError); } finally { setVidLoading(false); if (vidTimerRef.current) { clearInterval(vidTimerRef.current); vidTimerRef.current = null; } }
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

  // ── Wall handlers ──
  useEffect(() => {
    if (activeTab === "wall" && wallPhotos.length === 0 && !wallLoading) {
      setWallLoading(true);
      fetch("/api/photos/gallery").then(r => r.json()).then(d => {
        if (d.photos?.length) setWallPhotos(d.photos);
      }).catch(() => {}).finally(() => setWallLoading(false));
    }
  }, [activeTab, wallPhotos.length, wallLoading]);

  function openWallPhoto(photo: WallPhoto) {
    setWallSelected(photo);
    setWallLiked(false);
    setWallLikeCount(0);
    setWallComments([]);
    setWallNewComment("");
    // Fetch likes + comments
    fetch(`/api/photos/like?photoId=${photo.id}`).then(r => r.json()).then(d => {
      setWallLikeCount(d.count || 0);
      setWallLiked(d.liked || false);
    }).catch(() => {});
    fetch(`/api/photos/comments?photoId=${photo.id}`).then(r => r.json()).then(d => {
      setWallComments(d.comments || []);
    }).catch(() => {});
  }

  async function handleWallLike() {
    if (!wallSelected) return;
    const token = await getToken(); if (!token) return;
    setWallLiked(!wallLiked);
    setWallLikeCount(c => wallLiked ? c - 1 : c + 1);
    try {
      const res = await fetch("/api/photos/like", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ photoId: wallSelected.id }),
      });
      const d = await res.json();
      setWallLiked(d.liked);
      setWallLikeCount(d.count);
    } catch {}
  }

  async function handleWallComment() {
    if (!wallSelected || !wallNewComment.trim() || wallSending) return;
    const token = await getToken(); if (!token) return;
    setWallSending(true);
    try {
      const res = await fetch("/api/photos/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ photoId: wallSelected.id, text: wallNewComment.trim() }),
      });
      const d = await res.json();
      if (d.id) { setWallComments(prev => [...prev, d]); setWallNewComment(""); }
    } catch {} finally { setWallSending(false); }
  }

  async function togglePublish(img: LibraryImage) {
    const token = await getToken(); if (!token) return;
    const newVal = !img.isPublic;
    // Optimistic update
    setLibraryImages(prev => prev.map(i => i.id === img.id ? { ...i, isPublic: newVal } : i));
    try {
      await fetch("/api/photos/library", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: img.id, isPublic: newVal }),
      });
    } catch {
      // Revert on error
      setLibraryImages(prev => prev.map(i => i.id === img.id ? { ...i, isPublic: !newVal } : i));
    }
  }

  if (!authorized) return null;

  // ── Copy button SVG ──
  const CopyIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;

  // ── Spinner ──
  function Spinner({ c1, c2, elapsed: sec }: { c1: string; c2: string; elapsed: number }) {
    return (
      <div className="ph-loading">
        <div className="ph-loading-icon">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="16" stroke={`${c1}33`} strokeWidth="3" /><path d="M20 4a16 16 0 0 1 16 16" stroke="url(#sg)" strokeWidth="3" strokeLinecap="round"><animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="1s" repeatCount="indefinite" /></path><defs><linearGradient id="sg" x1="20" y1="4" x2="36" y2="20"><stop stopColor={c1} /><stop offset="1" stopColor={c2} /></linearGradient></defs></svg>
          <svg className="ph-sparkle" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c1} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" /></svg>
        </div>
        <p className="ph-loading-text">{t.creatingMagic}</p>
        <p className="ph-loading-hint">{t.mayTakeMoment}</p>
        <p className="ph-loading-timer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", marginRight: 4 }}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>{sec.toFixed(1)}s</p>
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
          <button className="ph-fs-btn" onClick={() => handleSave()}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>{t.phSave}</span></button>
          <button className="ph-fs-btn" onClick={() => handleShare()}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg><span>{t.phShare}</span></button>
          <button className="ph-fs-btn ph-fs-btn-post" onClick={() => handlePost()}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg><span>{t.phPost}</span></button>
        </div>
        {fullscreenPrompt && (
          <button className="ph-fs-btn ph-fs-btn-copy" onClick={() => copyPrompt(fullscreenPrompt, "fs")}>
            {copiedId === "fs" ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>{t.copied}</span></> : <><CopyIcon /><span>{t.copyPrompt}</span></>}
          </button>
        )}
        {showGenVideo && imageUrl && (
          <button className="ph-fs-btn ph-fs-btn-video" onClick={() => { onClose(); openVideoFromLibrary(imageUrl); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg><span>{t.generateVideo}</span>
          </button>
        )}
        <button className="ph-fs-btn ph-fs-btn-close" onClick={onClose}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg><span>{t.phClose}</span></button>
      </>
    );
  }

  return (
    <div className={`ph-page ${activeTab === "videos" ? "ph-theme-blue" : activeTab === "library" ? "ph-theme-purple" : activeTab === "wall" ? "ph-theme-pink" : ""}`}>
      {showConfetti && <canvas ref={confettiRef} className="ph-confetti-canvas" />}
      {creditToast && (
        <div className="ph-credit-toast">
          <span className="ph-credit-toast-icon">&#x2728;</span>
          <span><strong>-{creditToast.used}</strong> {t.creditsConsumed} &middot; {creditToast.remaining} {t.creditsRemaining}</span>
        </div>
      )}
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
        onLogout={() => { setShowMenu(false); handleLogout(); }}
        t={t}
      />

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
                  <div className="ph-ref-overlay"><p>{t.sourceImage}</p><button className="ph-ref-remove" onClick={clearImage}>{t.changeBtn}</button></div>
                </div>
              </div>
            )}

            {!referenceImage && resultImages.length === 0 && !loading && templateImage && (
              <div className="ph-preview ph-template-preview" style={{ aspectRatio: `${getAspectNumber(aspectRatio)}` }}>
                <div className="ph-template-container">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={templateImage} alt="Template" className="ph-template-img" />
                  <div className="ph-template-overlay">
                    <p className="ph-template-title">{lang === "es" ? "Crea la tuya" : "Make your own"}</p>
                    <p className="ph-template-hint">{lang === "es" ? "Sube tu foto y generaremos una version con tu estilo" : "Upload your photo and we'll generate your version"}</p>
                    <label className="ph-template-upload-btn">
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      {lang === "es" ? "Subir mi foto" : "Upload my photo"}
                    </label>
                  </div>
                </div>
              </div>
            )}

            {!referenceImage && resultImages.length === 0 && !loading && !templateImage && (
              <div className="ph-preview ph-ideas-preview" style={{ aspectRatio: `${getAspectNumber(aspectRatio)}` }}>
                <div className="ph-ideas-container">
                  <p className="ph-ideas-title">{t.promptIdeasTitle}</p>
                  <p className="ph-ideas-subtitle">{t.promptIdeasTap}</p>
                  <div className="ph-ideas-list">
                    {t.promptIdeas.map((idea, i) => (
                      <button key={i} className="ph-idea-chip" onClick={() => setPrompt(idea)}>
                        <span className="ph-idea-text">{idea}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      </button>
                    ))}
                  </div>
                  <label className="ph-upload-link">
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <span>{t.uploadPhotoHint}</span>
                  </label>
                </div>
              </div>
            )}

            {/* Stacked results */}
            {resultImages.map((item) => <ImageCard key={item.id} item={item} />)}

            {/* Loading spinner */}
            {loading && (
              <div className="ph-preview" style={{ aspectRatio: `${getAspectNumber(aspectRatio)}` }}>
                <Spinner c1="#c9a84c" c2="#e8d48b" elapsed={elapsed} />
              </div>
            )}
            <div ref={resultsEndRef} />
          </div>
          {error && <p className="ph-error">{error}</p>}
          <div className="ph-input-area">
            <textarea className="ph-textarea" placeholder={t.describeImage} value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} />
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
                  <div className="ph-ref-overlay"><p>{t.sourceImage}</p><button className="ph-ref-remove" onClick={clearVidImage}>{t.changeBtn}</button></div>
                </div>
              </div>
            )}

            {!vidSourceImage && resultVideos.length === 0 && !vidLoading && (
              <div className="ph-preview" style={{ aspectRatio: `${getAspectNumber(vidAspectRatio)}` }}>
                <label className="ph-upload-zone">
                  <input ref={vidFileInputRef} type="file" accept="image/*" onChange={handleVidImageUpload} style={{ display: "none" }} />
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(59,130,246,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                  <p className="ph-upload-text">{t.uploadVideoHint}</p>
                </label>
              </div>
            )}

            {resultVideos.map((item) => <VideoCard key={item.id} item={item} />)}

            {vidLoading && (
              <div className="ph-preview" style={{ aspectRatio: `${getAspectNumber(vidAspectRatio)}` }}>
                <Spinner c1="#3b82f6" c2="#60a5fa" elapsed={vidElapsed} />
              </div>
            )}
            <div ref={vidResultsEndRef} />
          </div>
          {vidError && <p className="ph-error">{vidError}</p>}
          <div className="ph-input-area">
            <textarea className="ph-textarea" placeholder={t.describeMotion} value={vidPrompt} onChange={(e) => setVidPrompt(e.target.value)} rows={2} />
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
            <button className={`ph-lib-filter ${libraryFilter === "photos" ? "ph-lib-filter-active" : ""}`} onClick={() => setLibraryFilter("photos")}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>{t.fotosFilter}</span></button>
            <button className={`ph-lib-filter ${libraryFilter === "videos" ? "ph-lib-filter-active" : ""}`} onClick={() => setLibraryFilter("videos")}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg><span>{t.videosFilter}</span></button>
          </div>

          {libraryLoading && <div className="ph-library-loading"><div className="ph-spinner-small" /><p>{lang === "es" ? "Cargando..." : "Loading..."}</p></div>}

          {!libraryLoading && libraryFilter === "photos" && (
            libraryImages.length === 0 ? (
              <div className="ph-onboarding">
                <p className="ph-onboarding-title">{t.onboardingTitle}</p>
                <div className="ph-onboarding-tips">
                  {t.onboardingTips.map((tip, i) => (
                    <div key={i} className="ph-onboarding-tip">
                      <span className="ph-onboarding-icon">{
                        tip.icon === "instagram" ? "\uD83D\uDCF8" :
                        tip.icon === "showcase" ? "\u2728" :
                        tip.icon === "link" ? "\uD83D\uDD17" :
                        tip.icon === "brand" ? "\uD83C\uDFA8" :
                        "\uD83C\uDFAC"
                      }</span>
                      <span className="ph-onboarding-text">{tip.text}</span>
                    </div>
                  ))}
                </div>
                <button className="ph-onboarding-cta" onClick={() => setActiveTab("photos")}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  {t.goToPhotos}
                </button>
              </div>
            ) : (
              <div className="ph-library-grid">
                {libraryImages.map((img) => (
                  <div key={img.id} className="ph-library-item">
                    <div className="ph-library-img-wrap" onClick={() => openFullscreenImage(img.imageUrl, img.prompt)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.imageUrl} alt={img.prompt} className="ph-library-img" />
                    </div>
                    <button
                      className={`ph-publish-btn ${img.isPublic ? "ph-publish-active" : ""}`}
                      onClick={(e) => { e.stopPropagation(); togglePublish(img); }}
                      title={img.isPublic ? (lang === "es" ? "Publicada" : "Published") : (lang === "es" ? "Publicar" : "Publish")}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={img.isPublic ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {!libraryLoading && libraryFilter === "videos" && (
            libraryVideos.length === 0 ? (
              <div className="ph-library-empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(168,85,247,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg><p>{t.noVideosYet}</p><p className="ph-library-empty-hint">{t.generateFirstVideo}</p>
                <button className="ph-onboarding-cta" onClick={() => setActiveTab("videos")} style={{ marginTop: "16px" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                  {t.generateVideo}
                </button>
              </div>
            ) : (
              <div className="ph-library-grid">
                {libraryVideos.map((vid) => (
                  <div key={vid.id} className="ph-library-item" onClick={() => openFullscreenVideo(vid.videoUrl, vid.prompt)}>
                    <video src={vid.videoUrl} className="ph-library-img" muted playsInline preload="metadata" onMouseOver={(e) => (e.target as HTMLVideoElement).play()} onMouseOut={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }} />
                    <div className="ph-library-play"><svg width="24" height="24" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* ═══ WALL TAB ═══ */}
      {activeTab === "wall" && (
        <div className="ph-wall">
          {wallLoading && <div className="ph-library-loading"><div className="ph-spinner-small" /><p>{lang === "es" ? "Cargando..." : "Loading..."}</p></div>}
          {!wallLoading && wallPhotos.length === 0 && (
            <div className="ph-library-empty"><p>{t.wallEmpty}</p></div>
          )}
          {!wallLoading && wallPhotos.length > 0 && (
            <div className="ph-wall-grid">
              {wallPhotos.map((photo) => (
                <div key={photo.id} className="ph-wall-item" onClick={() => openWallPhoto(photo)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.imageUrl} alt="" className="ph-wall-img" loading="lazy" />
                  <div className="ph-wall-overlay">
                    <span className="ph-wall-user">@{photo.username}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ WALL PHOTO MODAL ═══ */}
      {wallSelected && (
        <div className="ph-fullscreen" onClick={() => setWallSelected(null)}>
          <div className="ph-wall-modal" onClick={(e) => e.stopPropagation()}>
            <button className="ph-wall-modal-close" onClick={() => setWallSelected(null)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={wallSelected.imageUrl} alt="" className="ph-wall-modal-img" />
            <div className="ph-wall-modal-body">
              <p className="ph-wall-modal-author">{t.wallBy} <strong>@{wallSelected.username}</strong></p>
              <div className="ph-wall-modal-actions">
                <button className={`ph-wall-like-btn ${wallLiked ? "ph-wall-liked" : ""}`} onClick={handleWallLike}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={wallLiked ? "#ef4444" : "none"} stroke={wallLiked ? "#ef4444" : "currentColor"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  <span>{wallLikeCount}</span>
                </button>
                <span className="ph-wall-comment-count">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  {wallComments.length}
                </span>
              </div>
              <div className="ph-wall-comments">
                {wallComments.map(c => (
                  <div key={c.id} className="ph-wall-comment"><strong>@{c.username}</strong> {c.text}</div>
                ))}
              </div>
              <div className="ph-wall-comment-input">
                <input value={wallNewComment} onChange={e => setWallNewComment(e.target.value)} placeholder={t.wallComment} onKeyDown={e => e.key === "Enter" && handleWallComment()} maxLength={500} />
                <button onClick={handleWallComment} disabled={wallSending || !wallNewComment.trim()}>{t.wallSend}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ BOTTOM TAB BAR ═══ */}
      <nav className="ph-tab-bar">
        <button className={`ph-tab ${activeTab === "library" ? "ph-tab-active-purple" : ""}`} onClick={() => setActiveTab("library")}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg><span>{t.libraryTab}</span></button>
        <button className={`ph-tab ${activeTab === "photos" ? "ph-tab-active" : ""}`} onClick={() => setActiveTab("photos")}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg><span>{t.photosTab}</span></button>

        <button className={`ph-tab ${activeTab === "videos" ? "ph-tab-active-blue" : ""}`} onClick={() => setActiveTab("videos")}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg><span>{t.videosTab}</span></button>
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

      <InsufficientCreditsModal
        isOpen={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
        onBuyCredits={() => { setShowCreditsModal(false); window.location.href = "https://elevate-social-links.vercel.app/credits"; }}
      />
    </div>
  );
}
