"use client";

import { Toaster } from "react-hot-toast";

export default function AppProviders({ children }) {
  return (
    <>
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
    </>
  );
}
