/**
 * Client-side device fingerprint generator.
 * Combines multiple browser signals into a stable hash.
 * Not 100% unique but makes multi-account farming impractical.
 */

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("fingerprint", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("fingerprint", 4, 17);
    return canvas.toDataURL();
  } catch {
    return "";
  }
}

export async function getDeviceId(): Promise<string> {
  // Check localStorage first for consistency across sessions
  const stored = localStorage.getItem("_did");
  if (stored) return stored;

  // Build fingerprint from multiple signals
  const signals = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    screen.colorDepth.toString(),
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency?.toString() || "",
    (navigator as any).deviceMemory?.toString() || "",
    navigator.maxTouchPoints?.toString() || "",
    getCanvasFingerprint(),
  ].join("|");

  const hash = await sha256(signals);
  localStorage.setItem("_did", hash);
  return hash;
}
