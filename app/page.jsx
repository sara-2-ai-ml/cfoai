"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  BarChart3,
  BrainCircuit,
  FileSpreadsheet,
  Lightbulb,
  MessageSquare,
  Upload,
  Users,
  Zap
} from "lucide-react";
import dynamic from "next/dynamic";
import FadeUp from "@/components/FadeUp";
import LandingFooter from "@/components/LandingFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SplineRobot = dynamic(() => import("@/components/SplineRobot"), { ssr: false });
const FinancialBackground = dynamic(() => import("@/components/FinancialBackground"), { ssr: false });

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" }
];

const features = [
  {
    icon: BrainCircuit,
    title: "Document-Aware AI",
    description: "Ask natural language questions across all uploaded reports."
  },
  {
    icon: FileSpreadsheet,
    title: "Multi-Format Ingestion",
    description: "Upload PDF, Excel, CSV, and image-based financial documents."
  },
  {
    icon: BarChart3,
    title: "Period Comparison",
    description: "Auto-compare Q1, Q2, Q3, and Q4 trends in seconds."
  },
  {
    icon: Zap,
    title: "Instant Summaries",
    description: "Get actionable highlights and risk signals right after upload."
  },
  {
    icon: AlertTriangle,
    title: "Risk Scoring",
    description: "Overall risk 0-100 with key factors after simulation."
  },
  {
    icon: Lightbulb,
    title: "Scenario Analysis",
    description: "What-if scenarios: what happens if revenue drops 20%?"
  }
];

export default function LandingPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #EDF2FF 60%, #DBEAFE 100%)" }}
    >
      {/* ── Hero ── */}
      <section className="relative overflow-x-hidden">
        {/* Decorative blurred shapes */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div
            className="absolute -right-[12%] top-[8%] h-[420px] w-[420px] rounded-full opacity-40 blur-[100px]"
            style={{ background: "radial-gradient(circle, #93C5FD 0%, #DBEAFE 60%, transparent 100%)" }}
          />
          <div
            className="absolute -left-[8%] top-[35%] h-[350px] w-[350px] rounded-full opacity-30 blur-[90px]"
            style={{ background: "radial-gradient(circle, #A5B4FC 0%, #EEF2FF 60%, transparent 100%)" }}
          />
          <div
            className="absolute left-[30%] bottom-[5%] h-[300px] w-[500px] rounded-full opacity-25 blur-[80px]"
            style={{ background: "radial-gradient(circle, #BFDBFE 0%, transparent 70%)" }}
          />
        </div>

        <div className="relative z-10 mx-auto flex max-w-7xl flex-col px-5 pb-16 pt-8 md:px-10 md:pb-20 md:pt-10">
          {/* ── Nav ── */}
          <header className="grid w-full min-w-0 grid-cols-[1fr] items-center gap-y-4 md:grid-cols-[auto_minmax(0,1fr)] md:gap-x-5 lg:gap-x-8">
            <Link
              href="/"
              className="font-display col-start-1 row-start-1 shrink-0 justify-self-start text-[15px] font-semibold lowercase tracking-[0.04em] text-[#1E1B4B] md:text-base"
            >
              cfoai.
            </Link>

            <nav
              className="col-start-1 row-start-2 flex min-w-0 w-full justify-center md:col-start-2 md:row-start-1 md:px-1"
              aria-label="Site"
            >
              <div className="flex max-w-full flex-wrap items-center justify-center gap-x-1 gap-y-2 overflow-x-auto rounded-full border border-[#C7D2FE]/50 bg-white/70 px-2 py-2 shadow-sm backdrop-blur-xl sm:gap-x-2 sm:px-4 sm:py-2">
                {navLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="shrink-0 rounded-full px-2.5 py-1.5 text-[11px] text-[#1E1B4B]/60 transition-colors hover:bg-[#EEF2FF] hover:text-[#1E1B4B] sm:px-3.5 sm:text-[12px]"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>
          </header>

          {/* ── Hero split — reduced top padding ── */}
          <div className="flex flex-col items-center gap-10 pt-10 md:flex-row md:items-center md:gap-12 lg:gap-16" style={{ paddingTop: 40 }}>
            {/* Left – copy */}
            <div className="flex flex-1 flex-col items-start text-left">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#C7D2FE]/50 bg-white/70 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#4361EE] shadow-sm backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4361EE]" />
                AI-Powered Finance
              </div>
              <h1 className="font-display max-w-xl text-balance text-[clamp(2rem,4.2vw,3.5rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-[#1E1B4B]">
                When data speaks, decisions become clear.
              </h1>
              <p className="mt-6 max-w-lg text-pretty text-[15px] font-normal leading-relaxed text-[#3F3D56] md:text-lg">
                AI-powered financial intelligence for CFOs and investors one workspace for reports, charts,
                and deep financial insight.
              </p>
              <div className="mt-10">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#4361EE] px-8 py-3.5 text-[13px] font-semibold uppercase tracking-wide text-white shadow-lg shadow-[#4361EE]/25 transition hover:bg-[#3B54D9] md:px-10 md:text-sm"
                >
                  Get Started <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Right – 3D robot */}
            <div
              className="relative flex w-full shrink-0 items-center justify-center md:w-[48%] lg:w-[52%]"
              style={{ background: "transparent", backgroundColor: "transparent", backdropFilter: "none", boxShadow: "none", border: "none" }}
            >
              <div
                className="pointer-events-none absolute inset-0 blur-[80px] opacity-40"
                style={{ background: "radial-gradient(ellipse at 60% 50%, #93C5FD 0%, transparent 60%)" }}
                aria-hidden
              />
              <div
                className="relative w-full"
                style={{ aspectRatio: "4/3", background: "transparent", backgroundColor: "transparent", backdropFilter: "none", boxShadow: "none", border: "none" }}
              >
                <FinancialBackground />
                <SplineRobot className="absolute inset-0" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="scroll-mt-28 py-14 md:py-20" style={{ background: "#f8fafc" }}>
        <div className="mx-auto max-w-6xl px-6">
          <FadeUp className="mb-10 text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-[#1E1B4B] md:text-4xl">
              How it works
            </h2>
          </FadeUp>

          <div className="relative grid grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {/* Dashed connector line */}
            <div className="pointer-events-none absolute top-1/2 left-[16%] right-[16%] h-px border-t-2 border-dashed border-[#C7D2FE]/60" aria-hidden />

            {[
              { num: "01", Icon: Upload, title: "Upload Reports", text: "PDF, Excel, CSV — indexed in 30 seconds" },
              { num: "02", Icon: MessageSquare, title: "Ask Anything", text: "Natural language questions with cited answers" },
              { num: "03", Icon: Users, title: "Simulate Market", text: "6 AI personas analyze risk and predict outcomes" },
            ].map((step, i) => (
              <FadeUp key={step.num} delay={i * 100}>
                <div className="relative flex flex-col items-center rounded-2xl p-8 text-center" style={{ background: "#0f172a" }}>
                  <span className="font-display mb-4 text-2xl font-bold text-[#4361EE]">{step.num}</span>
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#4361EE]/10">
                    <step.Icon className="h-5 w-5 text-[#4361EE]" />
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-white">{step.title}</h3>
                  <p className="text-sm text-white/50">{step.text}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-16 text-left md:py-20">
        <FadeUp className="mb-10 max-w-2xl text-left">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[#1E1B4B] md:text-4xl lg:text-5xl">
            Everything you need
          </h2>
          <p className="mt-3 text-[#3F3D56]">
            From ingestion to answers — one workspace for reports, charts, and quarter-over-quarter insight.
          </p>
        </FadeUp>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <FadeUp key={feature.title} delay={index * 70}>
              <Card className="group relative h-full overflow-hidden border border-[#C7D2FE]/30 bg-white/80 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-[#A5B4FC]/50 hover:shadow-md hover:shadow-[#4361EE]/5">
                <CardHeader className="relative">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF2FF]">
                    <feature.icon className="h-5 w-5 text-[#4361EE]" />
                  </div>
                  <CardTitle className="font-display text-lg text-[#1E1B4B] md:text-xl">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative text-sm text-[#3F3D56]">
                  {feature.description}
                </CardContent>
              </Card>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-28 px-6 py-16 md:py-20">
        <FadeUp className="mb-10 text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[#1E1B4B] md:text-4xl">
            Simple pricing
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[#3F3D56]">
            Start free, scale when ready.
          </p>
        </FadeUp>

        <div className="flex flex-row gap-6">
          {/* Free */}
          <FadeUp delay={0} className="flex flex-1">
            <div className="flex w-full flex-col rounded-2xl border border-[#C7D2FE]/30 bg-white/80 p-7 shadow-sm backdrop-blur-sm">
              <h3 className="font-display text-lg font-semibold text-[#1E1B4B]">Free</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-[#1E1B4B]">$0</span>
                <span className="text-sm text-[#3F3D56]">/month</span>
              </div>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-[#3F3D56]">
                <li className="flex gap-2"><span className="text-[#4361EE]">✓</span>3 documents per month</li>
                <li className="flex gap-2"><span className="text-[#4361EE]">✓</span>Financial summary</li>
                <li className="flex gap-2"><span className="text-[#4361EE]">✓</span>Chat Q&A</li>
                <li className="flex gap-2"><span className="text-[#4361EE]">✓</span>Basic charts</li>
              </ul>
              <Link
                href="/dashboard"
                className="mt-8 inline-flex items-center justify-center rounded-full border border-[#C7D2FE]/60 bg-white px-6 py-2.5 text-sm font-semibold text-[#1E1B4B] transition hover:border-[#A5B4FC] hover:bg-[#EEF2FF]"
              >
                Get Started
              </Link>
            </div>
          </FadeUp>

          {/* Pro */}
          <FadeUp delay={80} className="flex flex-1">
            <div className="relative flex w-full flex-col rounded-2xl border-2 border-[#4361EE] bg-white/90 p-7 shadow-lg shadow-[#4361EE]/10 backdrop-blur-sm">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#4361EE] px-3 py-0.5 text-[11px] font-semibold text-white">
                Most Popular
              </span>
              <h3 className="font-display text-lg font-semibold text-[#1E1B4B]">Pro</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-[#1E1B4B]">$49</span>
                <span className="text-sm text-[#3F3D56]">/month</span>
              </div>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-[#3F3D56]">
                <li className="flex gap-2"><span className="text-[#4361EE]">✓</span>Unlimited documents</li>
                <li className="flex gap-2"><span className="text-[#4361EE]">✓</span>Market simulation (6 agents)</li>
                <li className="flex gap-2"><span className="text-[#4361EE]">✓</span>Risk scoring</li>
                <li className="flex gap-2"><span className="text-[#4361EE]">✓</span>Scenario analysis</li>
                <li className="flex gap-2"><span className="text-[#4361EE]">✓</span>Export PDF + Excel</li>
                <li className="flex gap-2"><span className="text-[#4361EE]">✓</span>Priority support</li>
              </ul>
              <Link
                href="/dashboard"
                className="mt-8 inline-flex items-center justify-center rounded-full bg-[#4361EE] px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#4361EE]/20 transition hover:bg-[#3B54D9]"
              >
                Start Free Trial
              </Link>
            </div>
          </FadeUp>

          {/* Enterprise */}
          <FadeUp delay={160} className="flex flex-1">
            <div className="flex w-full flex-col rounded-2xl border border-[#C7D2FE]/30 bg-white/80 p-7 shadow-sm backdrop-blur-sm">
              <h3 className="font-display text-lg font-semibold text-[#1E1B4B]">Enterprise</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-[#1E1B4B]">Custom</span>
              </div>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-[#3F3D56]">
                <li className="flex gap-2"><span className="text-[#4361EE]">✓</span>Everything in Pro</li>
                <li className="flex gap-2"><span className="text-[#4361EE]">✓</span>SSO login</li>
                <li className="flex gap-2"><span className="text-[#4361EE]">✓</span>Dedicated vector isolation</li>
                <li className="flex gap-2"><span className="text-[#4361EE]">✓</span>API access</li>
                <li className="flex gap-2"><span className="text-[#4361EE]">✓</span>Custom AI agents</li>
                <li className="flex gap-2"><span className="text-[#4361EE]">✓</span>SLA guarantee</li>
              </ul>
              <Link
                href="/sign-in"
                className="mt-8 inline-flex items-center justify-center rounded-full border border-[#C7D2FE]/60 bg-white px-6 py-2.5 text-sm font-semibold text-[#1E1B4B] transition hover:border-[#A5B4FC] hover:bg-[#EEF2FF]"
              >
                Contact Us
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Comparison (Before/After) ── */}
      <section id="comparison" className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <FadeUp className="mb-10 text-left">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#C7D2FE]/40 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#4361EE]">
            <ArrowRightLeft className="h-3.5 w-3.5 text-[#4361EE]" aria-hidden />
            Before / After
          </div>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[#1E1B4B] md:text-4xl lg:text-5xl">
            Manual analysis vs CFOai
          </h2>
          <p className="mt-3 max-w-2xl text-[#3F3D56]">
            See how teams replace spreadsheet archaeology with grounded AI answers and automatic summaries.
          </p>
        </FadeUp>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          <FadeUp delay={80}>
            <div className="flex flex-col items-center">
              {/* Time number */}
              <div className="mb-4 text-center">
                <span className="text-4xl font-bold text-[#4361EE]">8h+</span>
                <p className="mt-1 text-xs text-[#3F3D56]">per report</p>
              </div>
              <Card className="h-full w-full border border-[#C7D2FE]/30 bg-white/70 p-8 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-[#A5B4FC]/50 hover:shadow-md">
                <h3 className="font-display text-xl font-semibold text-[#1E1B4B] md:text-2xl">Before CFOai</h3>
                <ul className="mt-6 space-y-4 text-sm leading-relaxed text-[#3F3D56] md:text-base">
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C7D2FE]" />
                    Manual spreadsheet checks across multiple files
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C7D2FE]" />
                    Hours lost extracting key metrics and reconciling versions
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C7D2FE]" />
                    Low confidence interpreting charts and images from decks
                  </li>
                </ul>
              </Card>
            </div>
          </FadeUp>

          <FadeUp delay={160}>
            <div className="flex flex-col items-center">
              {/* Time number */}
              <div className="mb-4 text-center">
                <span className="text-4xl font-bold text-[#4361EE]">2min</span>
                <p className="mt-1 text-xs text-[#3F3D56]">per report</p>
              </div>
              <Card className="group relative h-full w-full overflow-hidden border border-[#C7D2FE]/30 bg-white/70 p-8 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-[#A5B4FC]/50 hover:shadow-md">
                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#EEF2FF]/80 blur-[72px]" />
                <div className="pointer-events-none absolute -bottom-12 -left-10 h-44 w-44 rounded-full bg-[#DBEAFE]/60 blur-[56px]" />
                <div className="relative">
                  <h3 className="font-display text-xl font-semibold text-[#1E1B4B] md:text-2xl md:tracking-tight">
                    After CFOai
                  </h3>
                  <ul className="mt-6 space-y-4 text-sm leading-relaxed text-[#1E1B4B] md:text-base">
                    <li className="flex gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4361EE]" />
                      AI-grounded answers with citations from your documents
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4361EE]" />
                      Auto-generated financial highlights in seconds after upload
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4361EE]" />
                      Cross-period performance analysis with a single prompt
                    </li>
                  </ul>
                </div>
              </Card>
            </div>
          </FadeUp>
        </div>

        <FadeUp delay={220} className="mt-12 flex justify-center">
          <Link href="/dashboard">
            <Button
              size="lg"
              className="gap-2 rounded-full bg-[#4361EE] text-white shadow-md shadow-[#4361EE]/20 hover:bg-[#3B54D9]"
            >
              Start Analyzing Free <ArrowRight className="h-4 w-4 text-white" />
            </Button>
          </Link>
        </FadeUp>
      </section>

      <LandingFooter />
    </div>
  );
}
