"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

const LINKS = [
  {
    href: "https://www.instagram.com/wendypradaoficial/",
    label: "@wendyprada",
    icon: "/instagram_icon.svg",
  },
  {
    href: "https://onlyfans.com/yohanah",
    label: "OnlyFans",
    icon: "/onlyfans_icon.svg",
  },
  {
    href: "https://wa.me/17864279533?text=Hola%20quisiera%20mas%20informacion%20del%20chat%20bot",
    label: "Chatea conmigo",
    icon: "/whatsapp_icon.svg",
  },
  {
    href: "https://www.tiktok.com/@bypradaw",
    label: "TikTok @wendyprada",
    icon: "/tiktok_icon.svg",
  },
  {
    href: "https://x.com/pramuswpl",
    label: "X @pramuswpl",
    icon: "/x_icon.svg",
  },
  {
    href: "https://www.facebook.com/wjlamus",
    label: "Facebook",
    icon: "/facebook_icon.svg",
  },
];

export default function Home() {
  const router = useRouter();

  return (
    <div className="device-frame">
      {/* iPhone notch */}
      <div className="device-notch" />
    <main className="page-wrapper">
      {/* Profile avatar */}
      <div className="avatar-ring" onDoubleClick={() => router.push("/model-design")} style={{ cursor: "pointer" }}>
        <Image
          src="/profile-pictures/profile-picture.png"
          alt="Wendy Prada"
          width={170}
          height={170}
          priority
        />
        <span className="badge">
          <svg viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
        </span>
      </div>

      {/* Name */}
      <h2 className="name">Wendy Prada</h2>
      <p className="subtitle">Modelo ✦ Contenido Exclusivo</p>

      {/* Links */}
      <nav className="links">
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="link-btn"
          >
            <span className="link-icon">
              <Image
                src={link.icon}
                alt=""
                width={40}
                height={40}
              />
            </span>
            <span className="link-label">{link.label}</span>
            <span className="link-arrow">&#8250;</span>
          </a>
        ))}
      </nav>

      <footer className="footer">&copy; 2026 Wendy Prada Oficial</footer>
    </main>
      {/* iPhone home indicator */}
      <div className="device-home-indicator" />
    </div>
  );
}
