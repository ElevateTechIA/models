"use client";

import { useEffect, useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../../lib/firebase";

const t_es = {
  hero: "Tu mundo digital en un solo enlace",
  heroSub: "Comparte todas tus redes sociales, contacto y mas en una pagina elegante y personalizada.",
  featureLinks: "Todos tus enlaces",
  featureLinksDesc: "Redes sociales, WhatsApp, Spotify y mas en un solo lugar.",
  featureQr: "Codigo QR",
  featureQrDesc: "Genera un QR para que te encuentren al instante.",
  featureCustom: "100% personalizable",
  featureCustomDesc: "Tu foto, tu nombre, tu estilo. Hazlo tuyo.",
  cta: "Crea tu pagina gratis",
  loginWithGoogle: "Continuar con Google",
  loginError: "Error al iniciar sesion",
  already: "Ya tienes cuenta?",
  signIn: "Inicia sesion",
};

const t_en = {
  hero: "Your digital world in one link",
  heroSub: "Share all your social media, contact info and more on one elegant, personalized page.",
  featureLinks: "All your links",
  featureLinksDesc: "Social media, WhatsApp, Spotify and more in one place.",
  featureQr: "QR Code",
  featureQrDesc: "Generate a QR so people can find you instantly.",
  featureCustom: "Fully customizable",
  featureCustomDesc: "Your photo, your name, your style. Make it yours.",
  cta: "Create your page for free",
  loginWithGoogle: "Continue with Google",
  loginError: "Login failed",
  already: "Already have an account?",
  signIn: "Sign in",
};

type Lang = "es" | "en";
type Translations = typeof t_es;

const langMap: Record<Lang, Translations> = { es: t_es, en: t_en };

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lang, setLang] = useState<Lang>("es");
  const t = langMap[lang];

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      localStorage.getItem("firebase-token") &&
      localStorage.getItem("username")
    ) {
      window.location.href = "/admin";
      return;
    }

    const detected = navigator.language?.startsWith("en") ? "en" : "es";
    setLang(detected);
  }, []);

  async function handleGoogleLogin() {
    setLoading(true);
    setError("");

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const displayName = result.user.displayName || "";

      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName }),
      });

      if (!registerRes.ok) {
        setError(t.loginError);
        setLoading(false);
        return;
      }

      const data = await registerRes.json();
      localStorage.setItem("firebase-token", idToken);
      localStorage.setItem("username", data.username);
      window.location.href = "/admin";
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t.loginError;
      setError(message);
      setLoading(false);
    }
  }

  return (
    <div className="landing-page">
      {/* Language toggle */}
      <div className="landing-lang">
        <button
          className={`landing-lang-btn ${lang === "es" ? "landing-lang-active" : ""}`}
          onClick={() => setLang("es")}
        >
          ES
        </button>
        <button
          className={`landing-lang-btn ${lang === "en" ? "landing-lang-active" : ""}`}
          onClick={() => setLang("en")}
        >
          EN
        </button>
      </div>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-logo">E</div>
        <h1 className="landing-h1">{t.hero}</h1>
        <p className="landing-sub">{t.heroSub}</p>
      </section>

      {/* Features */}
      <section className="landing-features">
        <div className="landing-feature">
          <span className="landing-feature-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          </span>
          <div>
            <strong>{t.featureLinks}</strong>
            <p>{t.featureLinksDesc}</p>
          </div>
        </div>
        <div className="landing-feature">
          <span className="landing-feature-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/><rect x="2" y="14" width="8" height="8" rx="1"/><rect x="14" y="14" width="4" height="4"/><rect x="20" y="14" width="2" height="2"/><rect x="14" y="20" width="2" height="2"/><rect x="20" y="20" width="2" height="2"/></svg>
          </span>
          <div>
            <strong>{t.featureQr}</strong>
            <p>{t.featureQrDesc}</p>
          </div>
        </div>
        <div className="landing-feature">
          <span className="landing-feature-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </span>
          <div>
            <strong>{t.featureCustom}</strong>
            <p>{t.featureCustomDesc}</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <button
          className="landing-google-btn"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.07 24.07 0 0 0 0 21.56l7.98-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {loading ? "..." : t.cta}
        </button>

        {error && <p className="login-error">{error}</p>}
      </section>
    </div>
  );
}
