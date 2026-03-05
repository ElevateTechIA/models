"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const ALLOWED_USERNAMES = ["cesarvegacol", "wendypradaoficial11"];

type PageMode = "generate" | "faceswap";

const MODELS = [
  {
    id: "wendy",
    name: "Wendy Prada",
    picture: "/profile-pictures/profile-picture.png",
    version: "bbcfe20b237567081da78379c67d10c637bd7267110e199d91e800955845f9b4",
    triggerWord: "wendy",
    tokenEnv: "default",
  },
  {
    id: "astrea",
    name: "Astrea",
    picture: "/profile-pictures/profile-picture.png",
    version: "e69946c1115e653320a9e103ec90fd766dc0b4eab17ab7780cb84ee08f579614",
    triggerWord: "STRA",
    tokenEnv: "cesarvega",
  },
  {
    id: "alina",
    name: "Alina",
    picture: "/profile-pictures/profile-picture.png",
    version: "54cc655616e24a8f59010c48d351ce1192c0581885ffcb839be388309f0a85af",
    triggerWord: "alina",
    tokenEnv: "default",
  },
  {
    id: "meg",
    name: "Meg",
    picture: "/profile-pictures/profile-picture.png",
    version: "59ed94ac709c364ff56536123a7426dee7f0d6a6909c27830be3a02c7989029f",
    triggerWord: "meg",
    tokenEnv: "default",
  },
  {
    id: "neopop",
    name: "Neopop",
    picture: "/profile-pictures/profile-picture.png",
    version: "515a10ad8a3e9f6410fb457d4b14c6845b66b0f42ca4d433f16ae457e47bf83e",
    triggerWord: "neopop",
    tokenEnv: "cesarvega",
  },
  {
    id: "djhanna",
    name: "DJ Hannah",
    picture: "/profile-pictures/profile-picture.png",
    version: "fae09d7bc22ec9e1d6c074380b7005df58ca7e5c91a22a749c610fc23601b826",
    triggerWord: "djhanna",
    tokenEnv: "cesarvega",
  },
];

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1", icon: "▪" },
  { value: "16:9", label: "16:9", icon: "▬" },
  { value: "9:16", label: "9:16", icon: "▮" },
];

const PRESET_PROMPTS = [
  {
    label: "Diosa de Playa",
    image: "/1.png",
    emoji: "\u{1F3D6}",
    prompts: [
      "Un retrato de wendy de pie en una playa tropical al atardecer, luz dorada y calida viniendo desde el lado izquierdo proyectando sombras suaves y largas sobre su rostro. Lleva un elegante traje de bano de una pieza. El oceano turquesa y las palmeras lejanas estan ligeramente desenfocados detras de ella. Su piel muestra poros visibles, tono ligeramente desigual, pequenas manchas de sol en los hombros y fino vello facial atrapando la contraluz. El viento mueve suavemente su cabello. La sensacion general es calida, natural y relajada, como un editorial de revista de viajes.",
      "Wendy jugando en las olas del mar turquesa, riendo con el cabello mojado y pegado al rostro, vistiendo un bikini colorido. La espuma blanca de las olas salpica alrededor de sus piernas. El sol del mediodia crea destellos brillantes en el agua. Su piel bronceada tiene gotas de agua brillando con la luz, poros visibles y ligeras marcas de bronceado en los hombros. La expresion es alegre y espontanea, capturada como si fuera una foto de vacaciones perfecta.",
      "Wendy sentada en la orilla de una cala virgen al amanecer, con el agua cristalina llegando hasta sus tobillos. El cielo tiene tonos rosados y naranjas del amanecer. Lleva un vestido de playa blanco transparente sobre el traje de bano. Las rocas de la cala crean un fondo natural. Su piel tiene la calidez rosada del amanecer reflejada en las mejillas, poros naturales visibles y algunos lunares en los brazos. La atmosfera es serena y romantica, como una escena de pelicula.",
      "Wendy caminando a lo largo de la orilla en la hora dorada, dejando huellas en la arena mojada. El sol detras de ella crea una silueta luminosa con el cabello brillando como un halo. Lleva un pareo colorido anudado en la cadera sobre un bikini. El reflejo del sol en la arena humeda crea un efecto espejo bajo sus pies. Su piel tiene la textura natural del final del dia, con sal seca en los hombros y mejillas ligeramente rosadas por el sol.",
      "Wendy recostada en una hamaca de tela entre dos palmeras inclinadas sobre el mar, con el agua verde esmeralda detras. Lleva un traje de bano de una pieza con estampado tropical. La suave sombra de las hojas de palma crea patrones de luz sobre su cuerpo y la hamaca. Su cabello cae suelto hacia abajo. La piel tiene ese brillo sano de quien ha pasado el dia al sol, con pequenas imperfecciones naturales y la relajacion total visible en su expresion.",
    ],
  },
  {
    label: "Glamour Nocturno",
    image: "/2.png",
    emoji: "\u{1F37D}",
    prompts: [
      "Una foto espontanea de wendy sentada en una mesa de un restaurante elegante frente al mar durante la noche. Lleva un vestido de noche ajustado y mira ligeramente lejos de la camara con una expresion relajada. La calida luz ambar de las velas sobre la mesa ilumina su rostro desde abajo, mezclada con la suave luz azul del crepusculo desde la terraza abierta detras de ella. El fondo muestra luces de hilo borrosas y el horizonte oscuro del oceano. La atmosfera es intima y sofisticada.",
      "Wendy de pie en la terraza de un bar en azotea con el skyline de la ciudad iluminado detras de ella. Lleva un elegante vestido negro de tirantes con joyas doradas discretas. La iluminacion ambiental del bar crea halos dorados alrededor de su figura. Las luces de la ciudad en el fondo estan desenfocadas como estrellas. Su piel tiene el brillo suave del maquillaje nocturno, con la piel perfectamente iluminada por las luces calidas del bar. La expresion es segura y elegante.",
      "Wendy llegando a una gala de gala, capturada en el momento justo al bajar de un auto de lujo. Lleva un vestido de noche largo con una abertura lateral y tacones de aguja. Los flashes de los fotografos crean una luz dramatica y momentanea. El fondo muestra una alfombra roja y siluetas de otros asistentes. Su rostro muestra una sonrisa genuina y confiada. La piel tiene el acabado luminoso del maquillaje profesional con iluminador en pomulos y nariz.",
      "Wendy sentada en el borde de una piscina infinita de un hotel de lujo por la noche, con los pies en el agua iluminada desde abajo. Lleva un vestido de seda fluido. El agua de la piscina refleja luces azules y blancas creando patrones dinamicos. Las luces del hotel y el mar oscuro al fondo crean capas de profundidad. Su rostro esta iluminado por el resplandor azul del agua, creando una luz magica y eterea. La atmosfera es exclusiva y sonanadora.",
      "Wendy en un club de jazz intimista, sentada en un taburete junto a la barra con una copa en la mano. Lleva un vestido rojo cenico con escote sutil. La luz del escenario crea haces dorados y ambar que atraviesan el humo del ambiente. Un musico con trompeta es visible desenfocado al fondo. Su piel captura los tonos calidos del jazz, con sombras dramaticas y luces en relieve. La expresion es sensual y relajada, como alguien que disfruta plenamente del momento.",
    ],
  },
  {
    label: "Playa Topless",
    image: "/3.png",
    emoji: "\u{1F31E}",
    prompts: [
      "Un retrato artistico de wendy en una playa tropical aislada, topless, de pie con el agua turquesa y calma hasta las rodillas. El sol de la tarde esta bajo y detras de ella, creando una suave contraluz calida que delinea su silueta y se refleja en su cabello. Su piel tiene pecas naturales esparcidas por los hombros y el pecho, poros visibles, lineas de bronceado ligeramente desiguales y fino vello corporal atrapando la luz. La composicion es artistica y de buen gusto, como un editorial de moda de alta gama.",
      "Wendy tumbada boca abajo sobre una roca plana de granito rosa junto al mar, topless, tomando el sol. El mar azul profundo con olas lentas de fondo. La luz lateral del sol de la tarde ilumina su espalda creando una sombra suave y alargada sobre la roca. Su piel tiene el tono bronceado desigual tipico del verano, con algunas pecas nuevas en los hombros, piel ligeramente seca con textura natural en los codos. El ambiente es solitario, salvaje y bello.",
      "Wendy caminando hacia afuera del oceano, topless, con el agua goteando por todo su cuerpo. El sol refleja en cada gota de agua creando destellos brillantes. Su cabello mojado y pegado al cuello y hombros. La expresion es de total libertad y felicidad natural. Su piel brillante y humeda muestra su textura real, con pequenas gotas de agua capturadas en el vello fino de sus brazos y abdomen. Las olas espumosas detras de ella crean un fondo dinamico y vivo.",
      "Wendy sentada bajo una palmera inclinada sobre el mar, topless, con las rodillas recogidas hacia el pecho mirando al horizonte. La sombra de las hojas de palma crea un patron de luz y sombra sobre su piel y la arena. El sol crea un contraste marcado entre las zonas iluminadas y las sombras. Su piel bronceada tiene la textura real del verano prolongado, con lineas de bronceado visibles, la piel ligeramente exfoliada por la sal y la arena.",
      "Wendy de pie en el borde de un acantilado bajo sobre el mar Mediterraneo, topless, con los brazos abiertos y el cabello al viento. El azul profundo del Mediterraneo y el cielo infinito se fusionan en el horizonte detras de ella. La brisa marina eleva su cabello dramaticamente. El sol de la manana ilumina su rostro y cuerpo de frente con una luz suave y favorecedora. Su piel tiene el tono claro del inicio del verano, con la frescura y el ligero enrojecimiento del viento marino en las mejillas.",
    ],
  },
  {
    label: "Sueno Tropical",
    image: "/4.png",
    emoji: "\u{1F334}",
    prompts: [
      "Una foto de cuerpo completo de wendy caminando por un sendero en la selva hacia una pequena cascada en un paraiso tropical. Lleva un vestido de verano ligero y fluido que atrapa la brisa. La luz del sol filtrada a traves del denso dosel verde crea parches de luz calida y sombra fresca. Su cabello esta ligeramente desordenado y encrespado por la humedad. Gotas de sudor visibles en su cuello y brazos, su piel tiene textura natural con poros, ligero enrojecimiento en rodillas y codos. La escena se siente exuberante, organica y viva.",
      "Wendy de pie en un puente colgante de madera y cuerda sobre un rio de agua cristalina en la selva tropical. Lleva shorts de tela y blusa anudada. El verde intenso de la vegetacion tropical la rodea completamente. Los rayos de sol se filtran a traves del follaje creando columnas de luz dorada que iluminan particulas de polvo y humedad en el aire. Su piel tiene el sudor natural del calor tropical, con el cabello recogido parcialmente por el calor. La luz crea un ambiente magico y aventurero.",
      "Wendy nadando en una poza natural de agua cristalina turquesa al pie de una pequena cascada rodeada de selva densa. Lleva un bikini de colores vivos. El agua tiene esa tonalidad verde-azul caracteristica de los cenotes y pozas naturales. Las gotas de la cascada crean un velo de niebla fina que atrapa la luz como miles de diamantes. Su piel refleja los tonos azules y verdes del agua. La expresion es de puro asombro y felicidad, como descubrir un paraiso secreto.",
      "Wendy sentada en una gran hoja de platanero en un jardin botanico tropical exuberante, rodeada de flores de heliconias y bromelias coloridas. Lleva un vestido wrap floral de colores tropicales. La luz difusa del mediodia crea colores intensos y saturados en las plantas. Las flores son gigantes y de colores imposibles. Su piel refleja los tonos calidos y coloridos del entorno. El conjunto se ve como una pintura surrealista y magica de la naturaleza en su estado mas exuberante.",
      "Wendy caminando por un mercado de flores tropical al amanecer, entre puestos llenos de orquideas, flores de ave del paraiso y heliconias. Lleva un vestido largo blanco con bordados florales. Los colores vibrantes de las flores crean un fondo explosivo de amarillos, rojos, morados y naranjas. La luz baja del amanecer crea sombras largas y tonos dorados sobre todo. Su piel tiene el brillo fresco de la manana, con el cabello suelto y algunos petalos de flores enganchados en el. La escena irradia vida, color y alegria pura.",
    ],
  },
];

export default function ModelDesignClient() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [mode, setMode] = useState<PageMode>("generate");

  // Generate mode state
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [presetVariant, setPresetVariant] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [quality, setQuality] = useState<"standard" | "high">("standard");
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [promptStrength, setPromptStrength] = useState(0.5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Model selector state
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);

  // Face swap state
  const [faceSwapImage, setFaceSwapImage] = useState<string | null>(null);
  const [faceSwapImageName, setFaceSwapImageName] = useState("");
  const [faceSwapResult, setFaceSwapResult] = useState<string | null>(null);
  const [faceSwapLoading, setFaceSwapLoading] = useState(false);
  const [faceSwapError, setFaceSwapError] = useState("");
  const faceSwapFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const username = localStorage.getItem("username");
    if (!username || !ALLOWED_USERNAMES.includes(username)) {
      router.replace("/");
    } else {
      setCurrentUsername(username);
      setAuthorized(true);
    }
  }, [router]);

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
          model_version: activeModel.version,
          token_env: activeModel.tokenEnv,
          ...(inputImage ? { image: inputImage, prompt_strength: promptStrength } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong"); return; }
      setImages(data.images || []);
    } catch {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setInputImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setInputImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function selectPreset(index: number) {
    const variant = selectedPreset === index
      ? (presetVariant + 1) % PRESET_PROMPTS[index].prompts.length
      : 0;
    setSelectedPreset(index);
    setPresetVariant(variant);
    const rawPrompt = PRESET_PROMPTS[index].prompts[variant];
    const adapted = rawPrompt.replace(/\bwendy\b/gi, activeModel.triggerWord);
    setPrompt(adapted);
  }

  // --- Face swap handlers ---

  function handleFaceSwapUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { setFaceSwapError("La imagen es muy grande. Usa una foto menor a 4 MB."); return; }
    setFaceSwapImageName(file.name);
    setFaceSwapError("");
    const reader = new FileReader();
    reader.onload = () => setFaceSwapImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  function clearFaceSwapImage() {
    setFaceSwapImage(null); setFaceSwapImageName(""); setFaceSwapResult(null); setFaceSwapError("");
    if (faceSwapFileRef.current) faceSwapFileRef.current.value = "";
  }

  async function handleFaceSwap() {
    if (!faceSwapImage) return;
    const model = MODELS.find((m) => m.id === selectedModel);
    setFaceSwapLoading(true); setFaceSwapError(""); setFaceSwapResult(null);
    try {
      const res = await fetch("/api/face-swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_image: faceSwapImage,
          swap_image: model?.picture,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFaceSwapError(data.error || "Algo salio mal"); return; }
      setFaceSwapResult(data.image);
    } catch {
      setFaceSwapError("Error de red. Intenta de nuevo.");
    } finally {
      setFaceSwapLoading(false);
    }
  }

  // --- Save & Share ---

  async function fetchImageBlob(url: string): Promise<Blob> {
    if (url.startsWith("data:")) { const res = await fetch(url); return res.blob(); }
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    return res.blob();
  }

  async function handleSave(url: string, filename: string) {
    try {
      const blob = await fetchImageBlob(url);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch { window.open(url, "_blank"); }
  }

  async function handleShare(url: string, filename: string) {
    try {
      const blob = await fetchImageBlob(url);
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Estudio de Fotos IA" });
        return;
      }
      handleSave(url, filename);
    } catch {}
  }

  if (!authorized) return null;

  const anyLoading = loading || faceSwapLoading;
  const availableModels = currentUsername === "wendypradaoficial11"
    ? MODELS.filter((m) => m.id === "wendy")
    : MODELS;
  const activeModel = availableModels.find((m) => m.id === selectedModel) ?? availableModels[0];

  return (
    <div className="md-page">
      {/* ── Header ── */}
      <header className="md-header">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={activeModel.picture} alt={activeModel.name} className="md-header-pic" />
        <div className="md-header-text">
          <a href="/" className="md-back">&larr; Volver</a>
          <h1 className="md-title">Estudio de Fotos IA</h1>
          <p className="md-subtitle-text">Genera fotos con {activeModel.name}</p>
          <select
            className="md-model-select"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            {availableModels.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </header>

      {/* ── Mode toggle (pill) ── */}
      <div className="md-mode-toggle">
        <button className={`md-mode-btn ${mode === "generate" ? "md-mode-active" : ""}`} onClick={() => setMode("generate")} disabled={anyLoading}>
          <span className="md-mode-icon">✨</span>
          <span>Generar Foto</span>
        </button>
        <button className={`md-mode-btn ${mode === "faceswap" ? "md-mode-active" : ""}`} onClick={() => setMode("faceswap")} disabled={anyLoading}>
          <span className="md-mode-icon">{"\u{1F3AD}"}</span>
          <span>Cambiar Cara</span>
        </button>
      </div>

      {/* ══ GENERATE MODE ══ */}
      {mode === "generate" && (
        <>
          {/* Preset cards */}
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image} alt={p.label} className="md-preset-bg" />
                  <div className="md-preset-inner">
                    <span className="md-preset-emoji">{p.emoji}</span>
                    <span className="md-preset-label">
                      {p.label}
                      {selectedPreset === i && (
                        <span style={{ opacity: 0.75, fontWeight: 400, marginLeft: 4 }}>
                          {presetVariant + 1}/{p.prompts.length}
                        </span>
                      )}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Chat-style prompt input */}
          <section className="md-section">
            <div className="md-prompt-row">
              <textarea className="md-textarea" placeholder={'Describe tu foto... (incluye "wendy")'} value={prompt} onChange={(e) => { setPrompt(e.target.value); setSelectedPreset(null); }} rows={5} />
              <button className="md-prompt-send" onClick={() => generate(prompt)} disabled={loading || !prompt.trim()} title="Generar">
                {loading ? <span className="md-btn-spinner" /> : "Generar"}
              </button>
            </div>
          </section>

          {/* Reference image + Settings (2-col) */}
          <section className="md-section">
            <div className="md-ref-settings-row">
              <div className="md-ref-col">
                <h2 className="md-section-title" style={{ fontSize: "14px" }}>Foto de Referencia</h2>
                {!inputImage ? (
                  <label className="md-upload-zone-sm">
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="md-upload-input" disabled={loading} />
                    <span className="md-upload-icon-sm">{"\u{1F4F7}"}</span>
                    <span className="md-upload-text-sm">Toca para subir una foto</span>
                  </label>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={inputImage} alt="Reference" className="md-upload-thumb" style={{ width: "100%", height: "90px", borderRadius: "12px" }} />
                    <button className="md-upload-remove" onClick={clearImage} disabled={loading}>Eliminar</button>
                  </div>
                )}
                {inputImage && (
                  <div className="md-slider-group" style={{ marginTop: "4px" }}>
                    <div className="md-slider-header">
                      <span className="md-slider-label" style={{ fontSize: "12px" }}>Fuerza</span>
                      <span className="md-slider-value" style={{ fontSize: "12px" }}>{promptStrength.toFixed(2)}</span>
                    </div>
                    <input type="range" min="0.1" max="1.0" step="0.05" value={promptStrength} onChange={(e) => setPromptStrength(parseFloat(e.target.value))} className="md-slider" disabled={loading} />
                  </div>
                )}
              </div>

              <div className="md-settings-col">
                <h2 className="md-section-title" style={{ fontSize: "14px" }}>Proporcion</h2>
                <div className="md-compact-grid">
                  {ASPECT_RATIOS.map((r) => (
                    <button key={r.value} className={`md-compact-btn ${aspectRatio === r.value ? "md-compact-active" : ""}`} onClick={() => setAspectRatio(r.value)} disabled={loading}>
                      <span className="md-compact-icon">{r.icon}</span>
                      <span className="md-compact-label">{r.label}</span>
                    </button>
                  ))}
                </div>
                <h2 className="md-section-title" style={{ fontSize: "14px", marginTop: "4px" }}>Calidad</h2>
                <div className="md-compact-grid-2">
                  <button className={`md-compact-btn ${quality === "standard" ? "md-compact-active" : ""}`} onClick={() => setQuality("standard")} disabled={loading}>
                    <span className="md-compact-icon">⚡</span>
                    <span className="md-compact-label">Estandar</span>
                  </button>
                  <button className={`md-compact-btn ${quality === "high" ? "md-compact-active" : ""}`} onClick={() => setQuality("high")} disabled={loading}>
                    <span className="md-compact-icon">✨</span>
                    <span className="md-compact-label">Alta</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Preview */}
          <section className="md-section md-preview">
            {loading && (
              <div className="md-loading">
                <div className="md-spinner" />
                <p>Creando tu imagen&hellip;</p>
                <p className="md-loading-hint">{quality === "high" ? "Modo alta calidad — puede tomar 40-90 segundos" : "Puede tomar 20-40 segundos"}</p>
              </div>
            )}
            {error && <p className="md-error">{error}</p>}
            {!loading && images.length > 0 && (
              <div className="md-image-grid">
                {images.map((url, i) => (
                  <div key={i} className="md-image-wrapper">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Generated ${i + 1}`} className="md-image" />
                    <div className="md-action-buttons">
                      <button onClick={() => handleSave(url, `${activeModel.id}-${new Date().toISOString().replace(/[:.]/g, "-")}-${i + 1}.png`)} className="md-download-btn">Guardar Foto</button>
                      <button onClick={() => handleShare(url, `${activeModel.id}-${new Date().toISOString().replace(/[:.]/g, "-")}-${i + 1}.png`)} className="md-share-btn">Compartir</button>
                    </div>
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

      {/* ══ FACE SWAP MODE ══ */}
      {mode === "faceswap" && (
        <>
          <section className="md-section">
            <h2 className="md-section-title">Escoge la Modelo</h2>
            <select className="md-select" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} disabled={faceSwapLoading}>
              {availableModels.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
            </select>
            <div className="md-faceswap-source">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={activeModel.picture} alt={activeModel.name} className="md-faceswap-source-img" />
              <div className="md-faceswap-source-info">
                <span className="md-faceswap-source-label">{activeModel.name}</span>
              </div>
            </div>
          </section>

          <section className="md-section">
            <h2 className="md-section-title">Foto Objetivo</h2>
            <p className="md-section-hint">Sube la foto donde quieres poner la cara de Wendy.</p>
            {!faceSwapImage ? (
              <label className="md-upload-zone">
                <input ref={faceSwapFileRef} type="file" accept="image/*" onChange={handleFaceSwapUpload} className="md-upload-input" disabled={faceSwapLoading} />
                <span className="md-upload-icon">{"\u{1F4F7}"}</span>
                <span className="md-upload-text">Toca para subir la foto objetivo</span>
              </label>
            ) : (
              <div className="md-upload-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={faceSwapImage} alt="Target" className="md-upload-thumb" />
                <div className="md-upload-info">
                  <span className="md-upload-name">{faceSwapImageName}</span>
                  <button className="md-upload-remove" onClick={clearFaceSwapImage} disabled={faceSwapLoading}>Eliminar</button>
                </div>
              </div>
            )}
          </section>

          <section className="md-section">
            <button className="md-generate-btn" onClick={handleFaceSwap} disabled={faceSwapLoading || !faceSwapImage}>
              {faceSwapLoading ? (<><span className="md-btn-spinner" />Procesando...</>) : "Intercambiar Cara"}
            </button>
          </section>

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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={faceSwapResult} alt="Face swap result" className="md-image" />
                  <div className="md-action-buttons">
                    <button onClick={() => handleSave(faceSwapResult, `${activeModel.id}-faceswap-${new Date().toISOString().replace(/[:.]/g, "-")}.png`)} className="md-download-btn">Guardar Foto</button>
                    <button onClick={() => handleShare(faceSwapResult, `${activeModel.id}-faceswap-${new Date().toISOString().replace(/[:.]/g, "-")}.png`)} className="md-share-btn">Compartir</button>
                  </div>
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
