"use client";

import dynamic from "next/dynamic";

const PhotosClient = dynamic(() => import("./photos-client"), {
  ssr: false,
});

export default function PhotosPage() {
  return <PhotosClient />;
}
