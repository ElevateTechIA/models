"use client";

import { useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import type { SiteLink } from "@/lib/types";

const QR_ICON_PATH = "/icons/qrcode_icon.svg";

function isQrLink(link: SiteLink) {
  return link.icon === QR_ICON_PATH;
}

export default function LinksNav({ links }: { links: SiteLink[] }) {
  const [qrModal, setQrModal] = useState<{ url: string; label: string; dataUrl: string } | null>(null);

  async function openQr(link: SiteLink) {
    try {
      const url = link.url === "#profile" ? window.location.href : link.url;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 512,
        margin: 2,
        color: { dark: "#2d2d2d", light: "#ffffff" },
      });
      setQrModal({ url, label: link.label, dataUrl });
    } catch {
      // fallback: just open the link
      window.open(link.url, "_blank");
    }
  }

  function saveQr() {
    if (!qrModal) return;
    const a = document.createElement("a");
    a.href = qrModal.dataUrl;
    a.download = `${qrModal.label.replace(/\s+/g, "-").toLowerCase()}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <>
      <nav className="links">
        {links.map((link) =>
          isQrLink(link) ? (
            <button
              key={link.id}
              className="link-btn"
              onClick={() => openQr(link)}
            >
              <span className="link-icon">
                <Image src={link.icon} alt="" width={40} height={40} />
              </span>
              <span className="link-label">{link.label}</span>
              <span className="link-arrow">&#8250;</span>
            </button>
          ) : (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="link-btn"
            >
              <span className="link-icon">
                <Image src={link.icon} alt="" width={40} height={40} />
              </span>
              <span className="link-label">{link.label}</span>
              <span className="link-arrow">&#8250;</span>
            </a>
          )
        )}
      </nav>

      {qrModal && (
        <div className="qr-overlay" onClick={() => setQrModal(null)}>
          <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="qr-modal-title">{qrModal.label}</h3>
            <img src={qrModal.dataUrl} alt="QR Code" className="qr-modal-image" />
            <p className="qr-modal-url">{qrModal.url}</p>
            <div className="qr-modal-actions">
              <button className="qr-modal-btn qr-modal-btn-save" onClick={saveQr}>Guardar QR</button>
              <button className="qr-modal-btn" onClick={() => setQrModal(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
