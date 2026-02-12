"use client";

import { useState } from "react";

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
      "RAW photo of wendy modeling on a tropical beach with crystal clear turquoise water and palm trees, wearing an elegant swimsuit, golden hour sunset lighting, shot on Canon EOS R5 85mm f/1.8, natural skin texture, photorealistic, ultra detailed, soft bokeh background",
  },
  {
    label: "Restaurant Glam",
    emoji: "\u{1F37D}",
    prompt:
      "RAW photo of wendy modeling at a luxurious beachside restaurant, elegant evening dress, warm ambient candlelight, sophisticated tropical setting, shot on Sony A7IV 50mm f/1.4, natural skin texture, photorealistic, ultra detailed, cinematic color grading",
  },
  {
    label: "Beach Topless",
    emoji: "\u{1F31E}",
    prompt:
      "RAW photo of wendy modeling topless on a secluded tropical beach, soft ocean waves, golden hour warm sunlight, natural relaxed pose, shot on Canon EOS R5 85mm f/1.8, natural skin texture, photorealistic, ultra detailed, soft bokeh background",
  },
  {
    label: "Paradise Dream",
    emoji: "\u{1F334}",
    prompt:
      "RAW photo of wendy modeling in a tropical paradise with lush green jungle and a beautiful waterfall, wearing a flowing summer dress, natural golden sunlight filtering through leaves, shot on Sony A7IV 35mm f/2.0, natural skin texture, photorealistic, ultra detailed, dreamy atmosphere",
  },
];

export default function ModelDesign() {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate(promptText: string) {
    if (!promptText.trim()) return;
    setLoading(true);
    setError("");
    setImages([]);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText, aspect_ratio: aspectRatio }),
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
            <p className="md-loading-hint">This may take 20-40 seconds</p>
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
