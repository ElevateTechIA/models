"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function AvatarLink({ picture, name }: { picture: string; name: string }) {
  const router = useRouter();

  return (
    <div
      className="avatar-ring"
      onDoubleClick={() => router.push("/model-design")}
      style={{ cursor: "pointer" }}
    >
      <Image src={picture} alt={name} width={170} height={170} priority />
      <span className="badge">
        <svg viewBox="0 0 24 24">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
      </span>
    </div>
  );
}
