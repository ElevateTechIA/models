"use client";

import { useRef, useState } from "react";

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1", icon: "\u25A0" },
  { value: "16:9", label: "16:9", icon: "\u25AC" },
  { value: "9:16", label: "9:16", icon: "\u25AE" },
];

const PRESET_PROMPTS = [
  {
    label: "Beach Goddess",
    emoji: "\u{1F3D6}",
    prompt:
      "A portrait of wendy standing on a tropical beach at sunset, warm golden light coming from the left side casting long soft shadows across her face. She wears an elegant one-piece swimsuit. The turquoise ocean and distant palm trees are slightly out of focus behind her. Her skin has natural texture with visible pores and a slight sun-kissed glow. The wind gently moves her hair. The overall feeling is warm, natural, and relaxed, like a travel magazine editorial.",
  },
  {
    label: "Restaurant Glam",
    emoji: "\u{1F37D}",
    prompt:
      "A candid photo of wendy sitting at a table in an upscale beachside restaurant during the evening. She is wearing a fitted evening dress and looking slightly away from the camera with a relaxed expression. Warm amber candlelight from the table illuminates her face from below, mixed with soft blue twilight from the open terrace behind her. Her skin looks natural with subtle highlights on her cheekbones. The background shows blurred string lights and the dark ocean horizon. The atmosphere is intimate and sophisticated.",
  },
  {
    label: "Beach Topless",
    emoji: "\u{1F31E}",
    prompt:
      "A fine art portrait of wendy on a secluded tropical beach, topless, standing knee-deep in calm turquoise water. The late afternoon sun is low and behind her, creating a soft warm backlight that outlines her silhouette and catches in her hair. Her skin has natural freckles and a warm even tan with realistic texture. She has a calm, contemplative expression. The soft ocean waves create gentle reflections on her body. The composition is artistic and tasteful, reminiscent of a high-end fashion editorial.",
  },
  {
    label: "Paradise Dream",
    emoji: "\u{1F334}",
    prompt:
      "A full-body photo of wendy walking along a jungle path toward a small waterfall in a tropical paradise. She is wearing a light flowing summer dress that catches the breeze. Dappled sunlight filters through the dense green canopy above, creating patches of warm light and cool shadow across her body and the path. The waterfall mist catches the light in the background. Her hair is slightly messy from the humidity. The scene feels lush, organic, and alive, like a page from National Geographic.",
  },
];

export default function ModelDesign() {
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

  return (
    <div className="md-page">
      <header className="md-header">
        <a href="/" className="md-back">&larr; Back</a>
        <h1 className="md-title">AI Photo Studio</h1>
        <p className="md-subtitle-text">Generate stunning photos with Wendy</p>
      </header>

      {/* Preset prompts */}
      <section className="md-section">
        <h2 className="md-section-title">Quick Styles</h2>
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
        <h2 className="md-section-title">Aspect Ratio</h2>
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
        <h2 className="md-section-title">Quality</h2>
        <div className="md-ratio-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
          <button
            className={`md-ratio-btn ${quality === "standard" ? "md-ratio-active" : ""}`}
            onClick={() => setQuality("standard")}
            disabled={loading}
          >
            <span className="md-ratio-icon">{"\u26A1"}</span>
            <span className="md-ratio-label">Standard</span>
          </button>
          <button
            className={`md-ratio-btn ${quality === "high" ? "md-ratio-active" : ""}`}
            onClick={() => setQuality("high")}
            disabled={loading}
          >
            <span className="md-ratio-icon">{"\u2728"}</span>
            <span className="md-ratio-label">High Quality</span>
          </button>
        </div>
      </section>

      {/* Reference image upload */}
      <section className="md-section">
        <h2 className="md-section-title">Reference Image (Optional)</h2>
        <p className="md-section-hint">Upload a photo to use as a base — the AI will transform it with your prompt.</p>
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
            <span className="md-upload-text">Tap to upload a photo</span>
          </label>
        ) : (
          <div className="md-upload-preview">
            <img src={inputImage} alt="Reference" className="md-upload-thumb" />
            <div className="md-upload-info">
              <span className="md-upload-name">{inputImageName}</span>
              <button className="md-upload-remove" onClick={clearImage} disabled={loading}>
                Remove
              </button>
            </div>
          </div>
        )}

        {inputImage && (
          <div className="md-slider-group">
            <div className="md-slider-header">
              <span className="md-slider-label">Prompt Strength</span>
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
              <span>More like photo</span>
              <span>More like prompt</span>
            </div>
          </div>
        )}
      </section>

      {/* Custom prompt */}
      <section className="md-section">
        <h2 className="md-section-title">Prompt</h2>
        <textarea
          className="md-textarea"
          placeholder={'Describe your photo... (include "wendy" as trigger word)'}
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
              Generating...
            </>
          ) : (
            "Generate Image"
          )}
        </button>
      </section>

      {/* Preview */}
      <section className="md-section md-preview">
        {loading && (
          <div className="md-loading">
            <div className="md-spinner" />
            <p>Creating your image&hellip;</p>
            <p className="md-loading-hint">
              {quality === "high"
                ? "High quality mode \u2014 this may take 40-90 seconds"
                : "This may take 20-40 seconds"}
            </p>
          </div>
        )}

        {error && <p className="md-error">{error}</p>}

        {!loading && images.length > 0 && (
          <div className="md-image-grid">
            {images.map((url, i) => (
              <div key={i} className="md-image-wrapper">
                <img src={url} alt={`Generated ${i + 1}`} className="md-image" />
                <a href={url} download={`wendy-${i + 1}.png`} className="md-download-btn">
                  Download PNG
                </a>
              </div>
            ))}
          </div>
        )}

        {!loading && images.length === 0 && !error && (
          <div className="md-placeholder">
            <span className="md-placeholder-icon">{"\u{1F4F8}"}</span>
            <p>Your generated photos will appear here</p>
          </div>
        )}
      </section>
    </div>
  );
}
