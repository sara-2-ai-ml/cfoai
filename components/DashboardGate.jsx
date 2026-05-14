"use client";

import dynamic from "next/dynamic";

const DashboardClient = dynamic(() => import("@/components/DashboardClient"), {
  ssr: false,
  loading: () => (
    <main className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-6 text-center text-sm text-white/55">
      Loading dashboard…
    </main>
  )
});

export default function DashboardGate() {
  return <DashboardClient />;
}
