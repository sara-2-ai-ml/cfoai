"use client";

import dynamic from "next/dynamic";

const HeroParticles3D = dynamic(() => import("@/components/HeroParticles3D"), {
  ssr: false,
  loading: () => (
    <div
      className="relative mx-auto mt-4 h-[min(48vh,440px)] w-full max-w-[1100px] bg-[#080808] md:mt-6 md:h-[min(52vh,500px)]"
      aria-hidden
    />
  )
});

export default function HeroParticles3DLazy() {
  return <HeroParticles3D />;
}
