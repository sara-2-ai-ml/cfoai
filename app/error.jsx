"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#080808] px-6 text-center text-white">
      <p className="text-sm text-[#A78BFA]">CFOai</p>
      <h1 className="mt-4 text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-3 max-w-md text-sm text-white/55">
        {error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : error != null
              ? String(error)
              : "An unexpected error occurred. Try again or return home."}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full border border-white/25 bg-white/5 px-5 py-2.5 text-sm text-white hover:bg-white/10"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#080808] hover:opacity-90"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
