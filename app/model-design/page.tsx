"use client";

import { useRef, useState } from "react";

type PageMode = "generate" | "faceswap";

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1", icon: "\u25A0" },
  { value: "16:9", label: "16:9", icon: "\u25AC" },
  { value: "9:16", label: "9:16", icon: "\u25AE" },
];

const PRESET_PROMPTS = [
  {
    label: "Diosa de Playa",
    emoji: "\u{1F3D6}",
    prompt:
      "Un retrato de wendy de pie en una playa tropical al atardecer, luz dorada y calida viniendo desde el lado izquierdo proyectando sombras suaves y largas sobre su rostro. Lleva un elegante traje de bano de una pieza. El oceano turquesa y las palmeras lejanas estan ligeramente desenfocados detras de ella. Su piel muestra poros visibles, tono ligeramente desigual, pequenas manchas de sol en los hombros y fino vello facial atrapando la contraluz. Un pequeno lunar es visible cerca de su clavicula. El viento mueve suavemente su cabello. La sensacion general es calida, natural y relajada, como un editorial de revista de viajes.",
  },
  {
    label: "Glamour Nocturno",
    emoji: "\u{1F37D}",
    prompt:
      "Una foto espontanea de wendy sentada en una mesa de un restaurante elegante frente al mar durante la noche. Lleva un vestido de noche ajustado y mira ligeramente lejos de la camara con una expresion relajada. La calida luz ambar de las velas sobre la mesa ilumina su rostro desde abajo, mezclada con la suave luz azul del crepusculo desde la terraza abierta detras de ella. Su piel tiene poros visibles en la nariz y mejillas, ligero enrojecimiento alrededor de la nariz, algunas cicatrices de acne apenas visibles y brillo natural en la frente por el aire calido. El fondo muestra luces de hilo borrosas y el horizonte oscuro del oceano. La atmosfera es intima y sofisticada.",
  },
  {
    label: "Playa Topless",
    emoji: "\u{1F31E}",
    prompt:
      "Un retrato artistico de wendy en una playa tropical aislada, topless, de pie con el agua turquesa y calma hasta las rodillas. El sol de la tarde esta bajo y detras de ella, creando una suave contraluz calida que delinea su silueta y se refleja en su cabello. Su piel tiene pecas naturales esparcidas por los hombros y el pecho, poros visibles, lineas de bronceado ligeramente desiguales, fino vello corporal atrapando la luz y algunos pequenos lunares en el torso. Tiene una expresion calmada y contemplativa. Las suaves olas del oceano crean reflejos delicados en su cuerpo. La composicion es artistica y de buen gusto, como un editorial de moda de alta gama.",
  },
  {
    label: "Sueno Tropical",
    emoji: "\u{1F334}",
    prompt:
      "Una foto de cuerpo completo de wendy caminando por un sendero en la selva hacia una pequena cascada en un paraiso tropical. Lleva un vestido de verano ligero y fluido que atrapa la brisa. La luz del sol filtrada a traves del denso dosel verde crea parches de luz calida y sombra fresca sobre su cuerpo y el camino. La neblina de la cascada atrapa la luz al fondo. Su cabello esta ligeramente desordenado y encrespado por la humedad. Gotas de sudor visibles en su cuello y brazos, su piel tiene textura natural con poros, ligero enrojecimiento en rodillas y codos, y algunas picaduras de mosquito en las piernas. La escena se siente exuberante, organica y viva, como una pagina de National Geographic.",
  },
];

export default function ModelDesign() {
  const [mode, setMode] = useState<PageMode>("generate");

  // Generate mode state
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [quality, setQuality] = useState<"standard" | "high">("standard");
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [inputImageName, setInputImageName] = useState("");
  const [promptStrength, setPromptStrength] = useState(0.5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // --- Generate handlers ---

  async function generate(promptText: string) {
    if (!promptText.trim()) return;
    setLoading(true);
    setError("");
    setImages([]);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          aspect_ratio: aspectRatio,
          quality,
          ...(inputImage ? { image: inputImage, prompt_strength: promptStrength } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      setImages(data.images || []);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setInputImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => setInputImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setInputImage(null);
    setInputImageName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function selectPreset(index: number) {
    setSelectedPreset(index);
    setPrompt(PRESET_PROMPTS[index].prompt);
  }

  // --- Face swap handlers ---

  function handleFaceSwapUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setFaceSwapError("La imagen es muy grande. Usa una foto menor a 4 MB.");
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
      setFaceSwapError("La imagen es muy grande. Usa una foto menor a 4 MB.");
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
    if (!faceSwapImage) return;
    setFaceSwapLoading(true);
    setFaceSwapError("");
    setFaceSwapResult(null);

    try {
      const res = await fetch("/api/face-swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_image: faceSwapImage,
          ...(customFace ? { swap_image: customFace } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFaceSwapError(data.error || "Algo salio mal");
        return;
      }

      setFaceSwapResult(data.image);
    } catch {
      setFaceSwapError("Error de red. Intenta de nuevo.");
    } finally {
      setFaceSwapLoading(false);
    }
  }

  // --- Shared download handler ---

  async function handleDownload(url: string, filename: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch {
      // User cancelled share sheet
    }
  }

  const anyLoading = loading || faceSwapLoading;

  return (
    <div className="md-page">
      <header className="md-header">
        <a href="/" className="md-back">&larr; Volver</a>
        <h1 className="md-title">Estudio de Fotos IA</h1>
        <p className="md-subtitle-text">Genera fotos impresionantes con Wendy</p>
      </header>

      {/* Mode toggle */}
      <section className="md-section">
        <div className="md-mode-toggle">
          <button
            className={`md-mode-btn ${mode === "generate" ? "md-mode-active" : ""}`}
            onClick={() => setMode("generate")}
            disabled={anyLoading}
          >
            <span className="md-mode-icon">{"\u2728"}</span>
            <span>Generar Foto</span>
          </button>
          <button
            className={`md-mode-btn ${mode === "faceswap" ? "md-mode-active" : ""}`}
            onClick={() => setMode("faceswap")}
            disabled={anyLoading}
          >
            <span className="md-mode-icon">{"\u{1F3AD}"}</span>
            <span>Cambiar Cara</span>
          </button>
        </div>
      </section>

      {/* ═══ GENERATE MODE ═══ */}
      {mode === "generate" && (
        <>
          {/* Preset prompts */}
          <section className="md-section">
            <h2 className="md-section-title">Estilos Rapidos</h2>
            <div className="md-preset-grid">
              {PRESET_PROMPTS.map((p, i) => (
                <button
                  key={p.label}
                  className={`md-preset-btn ${selectedPreset === i ? "md-preset-active" : ""}`}
                  onClick={() => selectPreset(i)}
                  disabled={loading}
                >
                  <span className="md-preset-emoji">{p.emoji}</span>
                  <span className="md-preset-label">{p.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Aspect ratio */}
          <section className="md-section">
            <h2 className="md-section-title">Proporcion</h2>
            <div className="md-ratio-grid">
              {ASPECT_RATIOS.map((r) => (
                <button
                  key={r.value}
                  className={`md-ratio-btn ${aspectRatio === r.value ? "md-ratio-active" : ""}`}
                  onClick={() => setAspectRatio(r.value)}
                  disabled={loading}
                >
                  <span className="md-ratio-icon">{r.icon}</span>
                  <span className="md-ratio-label">{r.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Quality mode */}
          <section className="md-section">
            <h2 className="md-section-title">Calidad</h2>
            <div className="md-ratio-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
              <button
                className={`md-ratio-btn ${quality === "standard" ? "md-ratio-active" : ""}`}
                onClick={() => setQuality("standard")}
                disabled={loading}
              >
                <span className="md-ratio-icon">{"\u26A1"}</span>
                <span className="md-ratio-label">Estandar</span>
              </button>
              <button
                className={`md-ratio-btn ${quality === "high" ? "md-ratio-active" : ""}`}
                onClick={() => setQuality("high")}
                disabled={loading}
              >
                <span className="md-ratio-icon">{"\u2728"}</span>
                <span className="md-ratio-label">Alta Calidad</span>
              </button>
            </div>
          </section>

          {/* Reference image upload */}
          <section className="md-section">
            <h2 className="md-section-title">Imagen de Referencia (Opcional)</h2>
            <p className="md-section-hint">Sube una foto como base — la IA la transformara con tu prompt.</p>
            {!inputImage ? (
              <label className="md-upload-zone">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="md-upload-input"
                  disabled={loading}
                />
                <span className="md-upload-icon">{"\u{1F4F7}"}</span>
                <span className="md-upload-text">Toca para subir una foto</span>
              </label>
            ) : (
              <div className="md-upload-preview">
                <img src={inputImage} alt="Reference" className="md-upload-thumb" />
                <div className="md-upload-info">
                  <span className="md-upload-name">{inputImageName}</span>
                  <button className="md-upload-remove" onClick={clearImage} disabled={loading}>
                    Eliminar
                  </button>
                </div>
              </div>
            )}

            {inputImage && (
              <div className="md-slider-group">
                <div className="md-slider-header">
                  <span className="md-slider-label">Fuerza del Prompt</span>
                  <span className="md-slider-value">{promptStrength.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={promptStrength}
                  onChange={(e) => setPromptStrength(parseFloat(e.target.value))}
                  className="md-slider"
                  disabled={loading}
                />
                <div className="md-slider-hints">
                  <span>Mas como la foto</span>
                  <span>Mas como el prompt</span>
                </div>
              </div>
            )}
          </section>

          {/* Custom prompt */}
          <section className="md-section">
            <h2 className="md-section-title">Descripcion</h2>
            <textarea
              className="md-textarea"
              placeholder={'Describe tu foto... (incluye "wendy" como palabra clave)'}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setSelectedPreset(null);
              }}
              rows={3}
            />
            <button
              className="md-generate-btn"
              onClick={() => generate(prompt)}
              disabled={loading || !prompt.trim()}
            >
              {loading ? (
                <>
                  <span className="md-btn-spinner" />
                  Generando...
                </>
              ) : (
                "Generar Imagen"
              )}
            </button>
          </section>

          {/* Preview */}
          <section className="md-section md-preview">
            {loading && (
              <div className="md-loading">
                <div className="md-spinner" />
                <p>Creando tu imagen&hellip;</p>
                <p className="md-loading-hint">
                  {quality === "high"
                    ? "Modo alta calidad \u2014 puede tomar 40-90 segundos"
                    : "Puede tomar 20-40 segundos"}
                </p>
              </div>
            )}

            {error && <p className="md-error">{error}</p>}

            {!loading && images.length > 0 && (
              <div className="md-image-grid">
                {images.map((url, i) => (
                  <div key={i} className="md-image-wrapper">
                    <img src={url} alt={`Generated ${i + 1}`} className="md-image" />
                    <button onClick={() => handleDownload(url, `wendy-${i + 1}.png`)} className="md-download-btn">
                      Descargar PNG
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!loading && images.length === 0 && !error && (
              <div className="md-placeholder">
                <span className="md-placeholder-icon">{"\u{1F4F8}"}</span>
                <p>Tus fotos generadas apareceran aqui</p>
              </div>
            )}
          </section>
        </>
      )}

      {/* ═══ FACE SWAP MODE ═══ */}
      {mode === "faceswap" && (
        <>
          {/* Source face */}
          <section className="md-section">
            <h2 className="md-section-title">Cara a Usar</h2>
            {!customFace ? (
              <div className="md-faceswap-source">
                <img
                  src="/profile-pictures/profile-picture.png"
                  alt="Wendy"
                  className="md-faceswap-source-img"
                />
                <div className="md-faceswap-source-info">
                  <span className="md-faceswap-source-label">Wendy (por defecto)</span>
                  <label className="md-faceswap-change">
                    <input
                      ref={customFaceRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCustomFaceUpload}
                      className="md-upload-input"
                      disabled={faceSwapLoading}
                    />
                    Usar otra cara
                  </label>
                </div>
              </div>
            ) : (
              <div className="md-faceswap-source">
                <img
                  src={customFace}
                  alt="Custom face"
                  className="md-faceswap-source-img"
                />
                <div className="md-faceswap-source-info">
                  <span className="md-faceswap-source-label">{customFaceName}</span>
                  <button
                    className="md-upload-remove"
                    onClick={clearCustomFace}
                    disabled={faceSwapLoading}
                  >
                    Volver a Wendy
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Target image upload */}
          <section className="md-section">
            <h2 className="md-section-title">Foto Objetivo</h2>
            <p className="md-section-hint">
              Sube la foto donde quieres poner la cara de Wendy.
            </p>
            {!faceSwapImage ? (
              <label className="md-upload-zone">
                <input
                  ref={faceSwapFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFaceSwapUpload}
                  className="md-upload-input"
                  disabled={faceSwapLoading}
                />
                <span className="md-upload-icon">{"\u{1F4F7}"}</span>
                <span className="md-upload-text">Toca para subir la foto objetivo</span>
              </label>
            ) : (
              <div className="md-upload-preview">
                <img src={faceSwapImage} alt="Target" className="md-upload-thumb" />
                <div className="md-upload-info">
                  <span className="md-upload-name">{faceSwapImageName}</span>
                  <button
                    className="md-upload-remove"
                    onClick={clearFaceSwapImage}
                    disabled={faceSwapLoading}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Swap button */}
          <section className="md-section">
            <button
              className="md-generate-btn"
              onClick={handleFaceSwap}
              disabled={faceSwapLoading || !faceSwapImage}
            >
              {faceSwapLoading ? (
                <>
                  <span className="md-btn-spinner" />
                  Procesando...
                </>
              ) : (
                "Intercambiar Cara"
              )}
            </button>
          </section>

          {/* Result preview */}
          <section className="md-section md-preview">
            {faceSwapLoading && (
              <div className="md-loading">
                <div className="md-spinner" />
                <p>Intercambiando la cara&hellip;</p>
                <p className="md-loading-hint">Puede tomar 20-30 segundos</p>
              </div>
            )}

            {faceSwapError && <p className="md-error">{faceSwapError}</p>}

            {!faceSwapLoading && faceSwapResult && (
              <div className="md-image-grid">
                <div className="md-image-wrapper">
                  <img src={faceSwapResult} alt="Face swap result" className="md-image" />
                  <button
                    onClick={() => handleDownload(faceSwapResult, "wendy-faceswap.png")}
                    className="md-download-btn"
                  >
                    Descargar PNG
                  </button>
                </div>
              </div>
            )}

            {!faceSwapLoading && !faceSwapResult && !faceSwapError && (
              <div className="md-placeholder">
                <span className="md-placeholder-icon">{"\u{1F3AD}"}</span>
                <p>El resultado aparecera aqui</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
