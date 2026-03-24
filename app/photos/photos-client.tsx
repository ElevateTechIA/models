"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

const ALLOWED_USERNAMES = ["cesarvegacol"];

type Tab = "photos" | "library";

type LibraryImage = {
  id: string;
  imageUrl: string;
  prompt: string;
  aspectRatio: string;
  createdAt: number;
};

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

  // Generate state
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [showRatioPanel, setShowRatioPanel] = useState(false);

  // Fullscreen state (shared between tabs)
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Library state
  const [libraryImages, setLibraryImages] = useState<LibraryImage[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryFetched, setLibraryFetched] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function getToken(): Promise<string | null> {
    try {
      return (await auth.currentUser?.getIdToken()) ?? null;
    } catch {
      return null;
    }
  }

  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const username = localStorage.getItem("username");
    if (!username || !ALLOWED_USERNAMES.includes(username)) {
      router.replace("/");
      return;
    }
    setAuthorized(true);
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setAuthReady(true);
    });
    return () => unsub();
  }, [router]);

  // Fetch library when tab switches to library
  const fetchLibrary = useCallback(async () => {
    setLibraryLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/photos/library", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLibraryImages(data.images || []);
      }
    } catch {} finally {
      setLibraryLoading(false);
      setLibraryFetched(true);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "library" && !libraryFetched) {
      fetchLibrary();
    }
  }, [activeTab, libraryFetched, fetchLibrary]);

  // Auto-save generated image to library
  async function saveToLibrary(imageData: string) {
    try {
      const token = await getToken();
      if (!token) {
        console.warn("[photos] No auth token for library save");
        return;
      }
      const res = await fetch("/api/photos/library", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          image: imageData,
          prompt,
          aspectRatio,
        }),
      });
      if (res.ok) {
        console.log("[photos] Saved to library");
        setLibraryFetched(false);
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("[photos] Library save failed:", err);
      }
    } catch (err) {
      console.error("[photos] Library save error:", err);
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError("La imagen es muy grande. Usa una foto menor a 4 MB.");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = () => setReferenceImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setReferenceImage(null);
    setResultImage(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function generate() {
    if (!prompt.trim() || !referenceImage) return;
    setLoading(true);
    setError("");
    setResultImage(null);
    setElapsed(0);

    const start = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(((Date.now() - start) / 1000));
    }, 100);

    try {
      const res = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          image: referenceImage,
          aspect_ratio: aspectRatio,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Algo salio mal");
        return;
      }
      setResultImage(data.image);
      // Auto-save to library in background
      saveToLibrary(data.image);
    } catch {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }

  async function fetchImageBlob(url: string): Promise<Blob> {
    if (url.startsWith("data:")) {
      const res = await fetch(url);
      return res.blob();
    }
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    return res.blob();
  }

  async function handleSave(imageUrl?: string) {
    const url = imageUrl || fullscreenImage;
    if (!url) return;
    try {
      const blob = await fetchImageBlob(url);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `photo-studio-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      if (url) window.open(url, "_blank");
    }
  }

  async function handleShare(imageUrl?: string) {
    const url = imageUrl || fullscreenImage;
    if (!url) return;
    try {
      const blob = await fetchImageBlob(url);
      const file = new File([blob], "photo-studio.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Photo Studio" });
        return;
      }
      handleSave(url);
    } catch {}
  }

  async function handlePost(imageUrl?: string) {
    const url = imageUrl || fullscreenImage;
    if (!url) return;
    try {
      const blob = await fetchImageBlob(url);
      const file = new File([blob], "photo-studio.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Photo Studio", text: "Created with Photo Studio" });
        return;
      }
      handleSave(url);
    } catch {}
  }

  if (!authorized) return null;

  const aspect = getAspectNumber(aspectRatio);

  return (
    <div className="ph-page">
      {/* Header */}
      <header className="ph-header">
        <a href="/admin" className="ph-back">&larr;</a>
        <h1 className="ph-title">Photo Studio</h1>
      </header>

      {/* ═══ PHOTOS TAB ═══ */}
      {activeTab === "photos" && (
        <>
          {/* Preview area */}
          <div className="ph-preview-container">
            <div className="ph-preview" style={{ aspectRatio: `${aspect}` }}>
              {loading && (
                <div className="ph-loading">
                  <div className="ph-loading-icon">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                      <circle cx="20" cy="20" r="16" stroke="rgba(201,168,76,0.3)" strokeWidth="3" />
                      <path d="M20 4a16 16 0 0 1 16 16" stroke="url(#ph-grad)" strokeWidth="3" strokeLinecap="round">
                        <animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="1s" repeatCount="indefinite" />
                      </path>
                      <defs>
                        <linearGradient id="ph-grad" x1="20" y1="4" x2="36" y2="20">
                          <stop stopColor="#c9a84c" />
                          <stop offset="1" stopColor="#e8d48b" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <svg className="ph-sparkle" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
                    </svg>
                  </div>
                  <p className="ph-loading-text">Creating magic...</p>
                  <p className="ph-loading-hint">This may take a moment</p>
                  <p className="ph-loading-timer">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", marginRight: 4 }}>
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                    {elapsed.toFixed(1)}s
                  </p>
                </div>
              )}

              {!loading && resultImage && (
                <div className="ph-result-wrap" onClick={() => setFullscreenImage(resultImage)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={resultImage} alt="Generated" className="ph-result-img" />
                  <div className="ph-result-badge">auto</div>
                  <div className="ph-result-actions-inline">
                    <button className="ph-inline-btn" onClick={(e) => { e.stopPropagation(); handleSave(resultImage); }} title="Save">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                    <button className="ph-inline-btn ph-inline-btn-check" onClick={(e) => { e.stopPropagation(); setFullscreenImage(resultImage); }} title="View">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>
                  </div>
                </div>
              )}

              {!loading && !resultImage && referenceImage && (
                <div className="ph-ref-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={referenceImage} alt="Reference" className="ph-ref-img" />
                  <div className="ph-ref-overlay">
                    <p>Imagen de referencia</p>
                    <button className="ph-ref-remove" onClick={clearImage}>Cambiar</button>
                  </div>
                </div>
              )}

              {!loading && !resultImage && !referenceImage && (
                <label className="ph-upload-zone">
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(201,168,76,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <p className="ph-upload-text">Toca para subir una foto de referencia</p>
                </label>
              )}
            </div>
          </div>

          {error && <p className="ph-error">{error}</p>}

          {/* Prompt input area */}
          <div className="ph-input-area">
            <textarea
              className="ph-textarea"
              placeholder="Describe the image you want to create..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
            />

            {showRatioPanel && (
              <div className="ph-ratio-panel">
                <div className="ph-ratio-row">
                  {ASPECT_RATIOS.slice(0, 4).map((r) => (
                    <button key={r.value} className={`ph-ratio-btn ${aspectRatio === r.value ? "ph-ratio-active" : ""}`} onClick={() => setAspectRatio(r.value)}>
                      <span className="ph-ratio-icon">{r.icon}</span>
                      <span>{r.label}</span>
                    </button>
                  ))}
                </div>
                <div className="ph-ratio-row">
                  {ASPECT_RATIOS.slice(4).map((r) => (
                    <button key={r.value} className={`ph-ratio-btn ${aspectRatio === r.value ? "ph-ratio-active" : ""}`} onClick={() => setAspectRatio(r.value)}>
                      <span className="ph-ratio-icon">{r.icon}</span>
                      <span>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

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

              <button className={`ph-ratio-toggle ${showRatioPanel ? "ph-ratio-toggle-active" : ""}`} onClick={() => setShowRatioPanel(!showRatioPanel)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="18" rx="2" ry="2" /><rect x="6" y="7" width="12" height="10" rx="1" ry="1" />
                </svg>
                <span>{aspectRatio}</span>
              </button>

              <button className="ph-mic-btn" disabled>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </button>

              <button className="ph-send-btn" onClick={generate} disabled={loading || !prompt.trim() || !referenceImage}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ═══ LIBRARY TAB ═══ */}
      {activeTab === "library" && (
        <div className="ph-library">
          {libraryLoading && (
            <div className="ph-library-loading">
              <div className="ph-spinner-small" />
              <p>Loading...</p>
            </div>
          )}

          {!libraryLoading && libraryImages.length === 0 && (
            <div className="ph-library-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(201,168,76,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
              <p>No photos yet</p>
              <p className="ph-library-empty-hint">Generate your first photo to see it here</p>
            </div>
          )}

          {!libraryLoading && libraryImages.length > 0 && (
            <div className="ph-library-grid">
              {libraryImages.map((img) => (
                <div key={img.id} className="ph-library-item" onClick={() => setFullscreenImage(img.imageUrl)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.imageUrl} alt={img.prompt} className="ph-library-img" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ BOTTOM TAB BAR ═══ */}
      <nav className="ph-tab-bar">
        <button className={`ph-tab ${activeTab === "photos" ? "ph-tab-active" : ""}`} onClick={() => setActiveTab("photos")}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
          </svg>
          <span>Photos</span>
        </button>
        <button className={`ph-tab ${activeTab === "library" ? "ph-tab-active" : ""}`} onClick={() => { setActiveTab("library"); }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          <span>Library</span>
        </button>
      </nav>

      {/* ═══ FULLSCREEN OVERLAY (shared) ═══ */}
      {fullscreenImage && (
        <div className="ph-fullscreen" onClick={() => setFullscreenImage(null)}>
          <div className="ph-fullscreen-inner" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fullscreenImage} alt="Generated" className="ph-fullscreen-img" />
            <div className="ph-fullscreen-actions">
              <button className="ph-fs-btn" onClick={() => handleSave()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Save</span>
              </button>
              <button className="ph-fs-btn" onClick={() => handleShare()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                <span>Share</span>
              </button>
              <button className="ph-fs-btn ph-fs-btn-post" onClick={() => handlePost()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                <span>Post</span>
              </button>
            </div>
            <button className="ph-fs-btn ph-fs-btn-close" onClick={() => setFullscreenImage(null)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              <span>Close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
