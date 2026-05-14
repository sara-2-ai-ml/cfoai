"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";

/**
 * Mount Clerk after hydration so Clerk’s Server Action ids match the client bundle
 * (avoids UnrecognizedActionError). Kept in this file to avoid an extra client chunk / HMR edge cases.
 */
function ClerkWhenReady({ children }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  if (!ready) {
    return <>{children}</>;
  }
  return <ClerkProvider>{children}</ClerkProvider>;
}

export default function AppProviders({ children }) {
  return (
    <ClerkWhenReady>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          className: "",
          style: {
            background: "#111214",
            color: "#fafafa",
            border: "1px solid rgba(255,255,255,0.12)"
          },
          duration: 4500
        }}
      />
    </ClerkWhenReady>
  );
}
