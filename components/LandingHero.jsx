import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircleMinus,
  LayoutGrid,
  Upload
} from "lucide-react";
import HeroParticles3DLazy from "@/components/HeroParticles3DLazy";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Security", href: "#security" },
  { label: "Pricing", href: "#pricing" }
];

/** Match reference strip: upload, grid, arrow, minus circle, check */
const heroIcons = [
  { Icon: Upload, label: "Upload" },
  { Icon: LayoutGrid, label: "Grid" },
  { Icon: ArrowRight, label: "Flow" },
  { Icon: CircleMinus, label: "Refine" },
  { Icon: Check, label: "Done" }
];

export default function LandingHero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#080808] text-white">
      {/* Subtle film grain */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.055] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat"
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-5 pt-8 md:px-10 md:pt-10">
        {/* Header — reference: logo | pill nav | white CTA */}
        <header className="flex flex-col items-stretch gap-5 md:flex-row md:items-center md:justify-between md:gap-6">
          <Link
            href="/"
            className="font-display shrink-0 text-[15px] font-medium lowercase tracking-[0.04em] text-white md:text-base"
          >
            cfoai.
          </Link>

          <nav
            className="order-last flex flex-1 justify-center md:order-none"
            aria-label="Site"
          >
            <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-md sm:gap-x-2 sm:px-4 sm:py-2">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-3 py-1.5 text-[11px] text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white/90 sm:px-3.5 sm:text-[12px]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          <Link
            href="/dashboard"
            className="shrink-0 self-end rounded-full bg-white px-6 py-2.5 text-center text-[12px] font-semibold text-black transition-opacity hover:opacity-90 md:self-auto md:px-7 md:py-3 md:text-[13px]"
          >
            Get Started
          </Link>
        </header>

        {/* Hero copy — generous spacing like reference */}
        <div className="mx-auto mt-16 max-w-[820px] text-center md:mt-20 lg:mt-24">
          <h1 className="font-display text-balance text-[clamp(1.65rem,4.2vw,3.15rem)] font-medium leading-[1.18] tracking-[-0.025em] text-white md:leading-[1.12]">
            When data speaks, decisions become clear.
          </h1>
          <p className="mx-auto mt-7 max-w-[640px] text-pretty text-[13px] font-normal leading-[1.85] text-white/42 md:mt-9 md:text-[15px] md:leading-[1.9]">
            AI-powered financial intelligence for CFOs and investors
          </p>
          <div className="mt-9 flex justify-center md:mt-11">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-8 py-3.5 text-[13px] font-semibold text-black transition-opacity hover:opacity-90 md:px-10 md:text-sm"
            >
              See it in action
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>

      <HeroParticles3DLazy />

      {/* Bottom icons — very subtle on black */}
      <div className="relative z-10 mx-auto flex max-w-xl flex-wrap items-center justify-center gap-9 pb-20 pt-2 text-[#2a2a2e] md:gap-11 md:pb-28 md:pt-4">
        {heroIcons.map(({ Icon, label }) => (
          <div key={label} className="transition-colors hover:text-white/25" title={label}>
            <Icon className="h-[17px] w-[17px]" strokeWidth={1.25} aria-hidden />
            <span className="sr-only">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
