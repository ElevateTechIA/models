"use client";

import { useEffect, useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../../lib/firebase";

const t_es = {
  loginTitle: "Panel de Administracion",
  loginSubtitle: "Inicia sesion para gestionar tu pagina",
  loginWithGoogle: "Continuar con Google",
  loginError: "Error al iniciar sesion",
};

const t_en = {
  loginTitle: "Admin Panel",
  loginSubtitle: "Sign in to manage your page",
  loginWithGoogle: "Continue with Google",
  loginError: "Login failed",
};

type Translations = typeof t_es;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [t, setT] = useState<Translations>(t_es);

  useEffect(() => {
    // If already logged in with username, redirect immediately
    if (
      typeof window !== "undefined" &&
      localStorage.getItem("firebase-token") &&
      localStorage.getItem("username")
    ) {
      window.location.href = "/admin";
      return;
    }

    // Detect language from browser
    const lang = navigator.language?.startsWith("en") ? "en" : "es";
    if (lang === "en") setT(t_en);
  }, []);

  async function handleGoogleLogin() {
    setLoading(true);
    setError("");

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const displayName = result.user.displayName || "";

      // Register or retrieve the user
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

      // Store token and username, then redirect
      localStorage.setItem("firebase-token", idToken);
      localStorage.setItem("username", data.username);
      window.location.href = "/admin";
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t.loginError;
      setError(message);
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">{t.loginTitle}</h1>
        <p className="login-subtitle">{t.loginSubtitle}</p>

        <button
          className="login-google-btn"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 48 48"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.07 24.07 0 0 0 0 21.56l7.98-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>
          {loading ? "..." : t.loginWithGoogle}
        </button>

        {error && <p className="login-error">{error}</p>}
      </div>
    </div>
  );
}
