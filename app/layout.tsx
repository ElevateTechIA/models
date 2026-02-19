import type { Metadata, Viewport } from "next";
import "./globals.css";
import SwRegistrar from "./components/sw-registrar";

export const metadata: Metadata = {
  title: "Social Links",
  description: "Your personal links page",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Social Links",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f8f6f2",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" href="/icons/app-icon-192.png" />
      </head>
      <body>
        {children}
        <SwRegistrar />
      </body>
    </html>
  );
}
