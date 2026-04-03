"use client";

import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

export default function CtaButton({ label }: { label: string }) {
  const router = useRouter();

  return (
    <button
      className="cta-create-btn"
      onClick={() => {
        if (auth.currentUser) {
          router.push("/admin");
        } else {
          router.push("/login");
        }
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
      {label}
    </button>
  );
}
