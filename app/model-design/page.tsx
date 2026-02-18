"use client";

import { useEffect, useRef, useState } from "react";

type Lang = "es" | "en";

const T = {
  es: {
    mdBack: "Volver", mdTitle: "Estudio de Fotos IA", mdSubtitle: "Cambia caras en tus fotos con IA",
    mdRemove: "Eliminar", mdSave: "Guardar Foto", mdShare: "Compartir",
    mdFaceToUse: "Cara a Usar", mdUseOtherFace: "Subir cara", mdChangeFace: "Cambiar cara",
    mdTargetPhoto: "Foto Objetivo", mdTargetHint: "Sube la foto donde quieres poner la cara.",
    mdUploadTarget: "Toca para subir la foto objetivo", mdSwapFace: "Intercambiar Cara",
    mdProcessing: "Procesando...", mdSwapping: "Intercambiando la cara\u2026",
    mdSwapHint: "Puede tomar 20-30 segundos", mdResultPlaceholder: "El resultado aparecera aqui",
    imageTooLarge: "La imagen es muy grande. Usa una foto menor a 4 MB.",
    networkError: "Error de red. Intenta de nuevo.", somethingWrong: "Algo salio mal",
  },
  en: {
    mdBack: "Back", mdTitle: "AI Photo Studio", mdSubtitle: "Swap faces in your photos with AI",
    mdRemove: "Remove", mdSave: "Save Photo", mdShare: "Share",
    mdFaceToUse: "Face to Use", mdUseOtherFace: "Upload face", mdChangeFace: "Change face",
    mdTargetPhoto: "Target Photo", mdTargetHint: "Upload the photo where you want to swap the face.",
    mdUploadTarget: "Tap to upload target photo", mdSwapFace: "Swap Face",
    mdProcessing: "Processing...", mdSwapping: "Swapping the face\u2026",
    mdSwapHint: "May take 20-30 seconds", mdResultPlaceholder: "The result will appear here",
    imageTooLarge: "Image is too large. Use a photo under 4 MB.",
    networkError: "Network error. Please try again.", somethingWrong: "Something went wrong",
  },
};

export default function ModelDesign() {
  const [lang, setLang] = useState<Lang>("es");
  const t = T[lang];

  // Face swap state
  const [faceSwapImage, setFaceSwapImage] = useState<string | null>(null);
  const [faceSwapImageName, setFaceSwapImageName] = useState("");
  const [customFace, setCustomFace] = useState<string | null>(null);
  const [customFaceName, setCustomFaceName] = useState("");
  const [faceSwapResult, setFaceSwapResult] = useState<string | null>(null);
  const [faceSwapLoading, setFaceSwapLoading] = useState(false);
  const [faceSwapError, setFaceSwapError] = useState("");
  const faceSwapFileRef = useRef<HTMLInputElement>(null);
  const customFaceRef = useRef<HTMLInputElement>(null);

  // Fetch language setting
  useEffect(() => {
    fetch("/api/admin/config")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.settings?.language === "en") setLang("en");
      })
      .catch(() => {});
  }, []);

  // --- Face swap handlers ---

  function handleFaceSwapUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setFaceSwapError(t.imageTooLarge);
      return;
    }
    setFaceSwapImageName(file.name);
    setFaceSwapError("");
    const reader = new FileReader();
    reader.onload = () => setFaceSwapImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  function clearFaceSwapImage() {
    setFaceSwapImage(null);
    setFaceSwapImageName("");
    setFaceSwapResult(null);
    setFaceSwapError("");
    if (faceSwapFileRef.current) faceSwapFileRef.current.value = "";
  }

  function handleCustomFaceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setFaceSwapError(t.imageTooLarge);
      return;
    }
    setCustomFaceName(file.name);
    setFaceSwapError("");
    const reader = new FileReader();
    reader.onload = () => setCustomFace(reader.result as string);
    reader.readAsDataURL(file);
  }

  function clearCustomFace() {
    setCustomFace(null);
    setCustomFaceName("");
    if (customFaceRef.current) customFaceRef.current.value = "";
  }

  async function handleFaceSwap() {
    if (!faceSwapImage || !customFace) return;
    setFaceSwapLoading(true);
    setFaceSwapError("");
    setFaceSwapResult(null);

    try {
      const res = await fetch("/api/face-swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_image: faceSwapImage,
          swap_image: customFace,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFaceSwapError(data.error || t.somethingWrong);
        return;
      }

      setFaceSwapResult(data.image);
    } catch {
      setFaceSwapError(t.networkError);
    } finally {
      setFaceSwapLoading(false);
    }
  }

  // --- Save & Share handlers ---

  async function fetchImageBlob(url: string): Promise<Blob> {
    // Data URLs (base64 from Gemini) can be fetched directly
    if (url.startsWith("data:")) {
      const res = await fetch(url);
      return res.blob();
    }
    // HTTP URLs (Replicate) need proxy for CORS
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    return res.blob();
  }

  async function handleSave(url: string, filename: string) {
    try {
      const blob = await fetchImageBlob(url);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      // Fallback: open image in new tab (user can long-press to save on iOS)
      window.open(url, "_blank");
    }
  }

  async function handleShare(url: string, filename: string) {
    try {
      const blob = await fetchImageBlob(url);
      const file = new File([blob], filename, { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: t.mdTitle,
        });
        return;
      }

      // Fallback to save if share not supported
      handleSave(url, filename);
    } catch {
      // User cancelled share sheet or error
    }
  }

  return (
    <div className="md-page">
      <header className="md-header">
        <a href="/" className="md-back">&larr; {t.mdBack}</a>
        <h1 className="md-title">{t.mdTitle}</h1>
        <p className="md-subtitle-text">{t.mdSubtitle}</p>
      </header>

      <section className="md-section">
        <h2 className="md-section-title">{t.mdFaceToUse}</h2>
        {!customFace ? (
          <label className="md-upload-zone">
            <input ref={customFaceRef} type="file" accept="image/*" onChange={handleCustomFaceUpload} className="md-upload-input" disabled={faceSwapLoading} />
            <span className="md-upload-icon">{"\u{1F4F7}"}</span>
            <span className="md-upload-text">{t.mdUseOtherFace}</span>
          </label>
        ) : (
          <div className="md-upload-preview">
            <img src={customFace} alt="Source face" className="md-upload-thumb" />
            <div className="md-upload-info">
              <span className="md-upload-name">{customFaceName}</span>
              <button className="md-upload-remove" onClick={clearCustomFace} disabled={faceSwapLoading}>{t.mdChangeFace}</button>
            </div>
          </div>
        )}
      </section>

      <section className="md-section">
        <h2 className="md-section-title">{t.mdTargetPhoto}</h2>
        <p className="md-section-hint">{t.mdTargetHint}</p>
        {!faceSwapImage ? (
          <label className="md-upload-zone">
            <input ref={faceSwapFileRef} type="file" accept="image/*" onChange={handleFaceSwapUpload} className="md-upload-input" disabled={faceSwapLoading} />
            <span className="md-upload-icon">{"\u{1F4F7}"}</span>
            <span className="md-upload-text">{t.mdUploadTarget}</span>
          </label>
        ) : (
          <div className="md-upload-preview">
            <img src={faceSwapImage} alt="Target" className="md-upload-thumb" />
            <div className="md-upload-info">
              <span className="md-upload-name">{faceSwapImageName}</span>
              <button className="md-upload-remove" onClick={clearFaceSwapImage} disabled={faceSwapLoading}>{t.mdRemove}</button>
            </div>
          </div>
        )}
      </section>

      <section className="md-section">
        <button className="md-generate-btn" onClick={handleFaceSwap} disabled={faceSwapLoading || !faceSwapImage || !customFace}>
          {faceSwapLoading ? (<><span className="md-btn-spinner" />{t.mdProcessing}</>) : t.mdSwapFace}
        </button>
      </section>

      <section className="md-section md-preview">
        {faceSwapLoading && (
          <div className="md-loading">
            <div className="md-spinner" />
            <p>{t.mdSwapping}</p>
            <p className="md-loading-hint">{t.mdSwapHint}</p>
          </div>
        )}
        {faceSwapError && <p className="md-error">{faceSwapError}</p>}
        {!faceSwapLoading && faceSwapResult && (
          <div className="md-image-grid">
            <div className="md-image-wrapper">
              <img src={faceSwapResult} alt="Face swap result" className="md-image" />
              <div className="md-action-buttons">
                <button onClick={() => handleSave(faceSwapResult, "faceswap.png")} className="md-download-btn">{t.mdSave}</button>
                <button onClick={() => handleShare(faceSwapResult, "faceswap.png")} className="md-share-btn">{t.mdShare}</button>
              </div>
            </div>
          </div>
        )}
        {!faceSwapLoading && !faceSwapResult && !faceSwapError && (
          <div className="md-placeholder">
            <span className="md-placeholder-icon">{"\u{1F3AD}"}</span>
            <p>{t.mdResultPlaceholder}</p>
          </div>
        )}
      </section>
    </div>
  );
}
