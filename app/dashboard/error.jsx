"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({ error, reset }) {
  useEffect(() => {
    console.error("[dashboard]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-6 text-center text-white">
      <p className="text-xs font-medium uppercase tracking-wide text-accent/80">Dashboard</p>
      <h1 className="mt-3 text-xl font-semibold">Could not load this page</h1>
      <p className="mt-2 max-w-md text-sm text-white/55">
        {error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : error != null
              ? String(error)
              : "Try a clean dev restart: stop all terminals running Next.js, then run npm run dev:clean."}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full border border-white/20 bg-white/5 px-5 py-2 text-sm hover:bg-white/10"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-black hover:bg-accent/90"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
