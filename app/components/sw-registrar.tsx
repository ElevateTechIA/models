"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/pwa/register-sw";

export default function SwRegistrar() {
  useEffect(() => {
    registerServiceWorker();
  }, []);
  return null;
}
