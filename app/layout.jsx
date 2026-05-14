import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import AppProviders from "@/components/AppProviders";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap"
});

export const metadata = {
  title: "CFOai - Financial Report AI",
  description: "Upload financial reports and ask anything with AI."
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
      <body
        className={`${inter.className} min-h-screen bg-[#080808] text-white antialiased`}
        style={{
          backgroundColor: "#080808",
          color: "#fafafa",
          ...inter.style
        }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html { background-color: #080808; color-scheme: dark; }
              a { color: inherit; text-decoration: none; }
              a:hover { opacity: 0.88; }
              /* If the main Tailwind chunk fails to load (proxy, blocker, wrong host), keep layout readable */
              .flex { display: flex; }
              .inline-flex { display: inline-flex; }
              .grid { display: grid; }
              .flex-col { flex-direction: column; }
              .flex-wrap { flex-wrap: wrap; }
              .flex-1 { flex: 1 1 0%; }
              .items-center { align-items: center; }
              .items-stretch { align-items: stretch; }
              .justify-center { justify-content: center; }
              .justify-between { justify-content: space-between; }
              .self-end { align-self: flex-end; }
              .shrink-0 { flex-shrink: 0; }
              .mx-auto { margin-left: auto; margin-right: auto; }
              .max-w-6xl { max-width: 72rem; }
              .max-w-xl { max-width: 36rem; }
              .max-w-2xl { max-width: 42rem; }
              .max-w-md { max-width: 28rem; }
              .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
              .gap-2 { gap: 0.5rem; }
              .gap-3 { gap: 0.75rem; }
              .gap-5 { gap: 1.25rem; }
              .gap-6 { gap: 1.5rem; }
              .gap-10 { gap: 2.5rem; }
              .gap-12 { gap: 3rem; }
              .gap-x-1 { column-gap: 0.25rem; }
              .gap-y-2 { row-gap: 0.5rem; }
              .text-center { text-align: center; }
              .text-left { text-align: left; }
              @media (min-width: 768px) {
                .md\\:flex-row { flex-direction: row; }
                .md\\:items-center { align-items: center; }
                .md\\:justify-between { justify-content: space-between; }
                .md\\:order-none { order: 0; }
                .md\\:self-auto { align-self: auto; }
                .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                .md\\:text-left { text-align: left; }
              }
              @media (min-width: 1024px) {
                .lg\\:grid-cols-\\[minmax\\(0\\2c 1fr\\)_min\\(600px\\2c 100\\%\\)\\] {
                  grid-template-columns: minmax(0, 1fr) min(600px, 100%);
                }
                .lg\\:items-center { align-items: center; }
                .lg\\:gap-10 { gap: 2.5rem; }
                .lg\\:mx-0 { margin-left: 0; margin-right: 0; }
              }
            `
          }}
        />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
