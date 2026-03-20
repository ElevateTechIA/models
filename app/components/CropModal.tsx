"use client";

import { useState, useRef, useCallback } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

interface Props {
  file: File;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

const ASPECT_OPTIONS: { label: string; value: number | undefined }[] = [
  { label: "Libre", value: undefined },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:4", value: 3 / 4 },
  { label: "16:9", value: 16 / 9 },
];

function centerAspectCrop(w: number, h: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, aspect, w, h),
    w,
    h
  );
}

export default function CropModal({ file, onConfirm, onCancel }: Props) {
  const [imgSrc] = useState(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setCrop(
        aspect
          ? centerAspectCrop(width, height, aspect)
          : centerCrop({ unit: "%", width: 90, height: 90 }, width, height)
      );
    },
    [aspect]
  );

  function changeAspect(a: number | undefined) {
    setAspect(a);
    if (imgRef.current && a) {
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, a));
    }
  }

  async function handleConfirm() {
    if (!imgRef.current || !completedCrop?.width || !completedCrop?.height) {
      // No crop drawn — use full image
      const canvas = document.createElement("canvas");
      const img = imgRef.current!;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => { if (blob) onConfirm(blob); },
        "image/jpeg",
        0.92
      );
      return;
    }

    setConfirming(true);
    const img = imgRef.current;
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;
    const canvas = document.createElement("canvas");
    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(
      img,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );
    canvas.toBlob(
      (blob) => {
        setConfirming(false);
        if (blob) onConfirm(blob);
      },
      "image/jpeg",
      0.92
    );
  }

  return (
    <div className="crop-overlay" onClick={onCancel}>
      <div className="crop-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="crop-title">Recortar imagen</h3>

        <div className="crop-aspect-row">
          {ASPECT_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              className={`adm-btn adm-btn-small ${
                aspect === opt.value ? "adm-btn-active" : ""
              }`}
              onClick={() => changeAspect(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="crop-canvas-area">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
            minWidth={20}
            minHeight={20}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imgSrc}
              alt="Crop preview"
              className="crop-img"
              onLoad={onImageLoad}
            />
          </ReactCrop>
        </div>

        <div className="crop-actions">
          <button
            className="adm-btn adm-btn-primary"
            onClick={handleConfirm}
            disabled={confirming}
          >
            {confirming ? "Procesando..." : "Confirmar recorte"}
          </button>
          <button className="adm-btn" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
