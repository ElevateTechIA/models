/**
 * Compress an image file to fit under a max size using Canvas.
 * Returns a base64 data URL (JPEG).
 * Progressively reduces quality and resolution until the image fits.
 */
export function compressImage(
  file: File,
  maxBytes: number = 4 * 1024 * 1024
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }

      let { width, height } = img;
      const maxDim = 2048;

      // Scale down if larger than maxDim
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // Try decreasing quality until under maxBytes
      let quality = 0.85;
      let dataUrl = canvas.toDataURL("image/jpeg", quality);

      while (dataUrl.length * 0.75 > maxBytes && quality > 0.1) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL("image/jpeg", quality);
      }

      // If still too large, scale down further
      if (dataUrl.length * 0.75 > maxBytes) {
        const scale = 0.5;
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      }

      resolve(dataUrl);
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}
