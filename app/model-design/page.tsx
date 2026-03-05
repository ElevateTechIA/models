"use client";

import dynamic from "next/dynamic";

const ModelDesignClient = dynamic(() => import("./model-design-client"), {
  ssr: false,
});

export default function ModelDesignPage() {
  return <ModelDesignClient />;
}
