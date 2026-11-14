'use client';

import React from 'react';
import Link from 'next/link';
import {
  PenTool,
  Sparkles,
  FileText,
  FileCheck2,
  Download,
  Terminal,
  Cpu,
  Layers,
  Check,
  ChevronRight,
  ArrowRight,
  BookOpen,
  GraduationCap,
  Scroll,
} from 'lucide-react';
import { HeroLiveDemo } from '@/components/landing/HeroLiveDemo';
import { HANDWRITING_FONTS } from '@/lib/engine/fonts';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FBF7EE] text-[#14213D] selection:bg-[#FFE066]">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-[#FBF7EE]/90 backdrop-blur-md border-b border-[#E2D8C3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1F3A8A] flex items-center justify-center text-white shadow-sm">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-[#14213D]">
                YourAssignment
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-bold uppercase tracking-wider bg-[#FFE066] text-[#14213D] px-2 py-0.5 rounded-full">
                Paper & Ink
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#4B5563]">
            <a href="#features" className="hover:text-[#1F3A8A] transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-[#1F3A8A] transition-colors">
              How It Works
            </a>
            <a href="#styles" className="hover:text-[#1F3A8A] transition-colors">
              Handwriting Styles
            </a>
            <a href="#pricing" className="hover:text-[#1F3A8A] transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-[#1F3A8A] transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-xs sm:text-sm font-semibold text-[#1F3A8A] hover:text-[#14213D] px-3 py-1.5 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/editor"
              className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-[#1F3A8A] hover:bg-[#1A3175] rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <span>Open Editor</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-16 px-4 sm:px-6 overflow-hidden">
        {/* Subtle red margin line decoration on wide screens */}
        <div className="hidden xl:block absolute left-12 top-0 bottom-0 w-[2px] bg-[#E5484D]/30" />

        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF5E6] border border-[#E2D8C3] text-xs font-semibold text-[#1F3A8A]">
            <Sparkles className="w-3.5 h-3.5 text-[#1F3A8A]" />
            <span>Rule-Based Deterministic Engine · Zero AI Inconsistencies</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-serif font-bold text-[#14213D] tracking-tight leading-tight">
            Turn Typed Assignments Into Real{' '}
            <span
              className="font-normal text-[#1F3A8A] text-5xl sm:text-7xl underline decoration-[#E5484D]/60 decoration-wavy decoration-2"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              Handwritten
            </span>{' '}
            Notebook Pages
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-[#4B5563] leading-relaxed">
            Stop copying assignments by hand for hours. Our physics-grounded engine renders text with
            per-glyph variations, baseline drift, authentic pen bleed, and exact ruling snapping on
            A4 paper.
          </p>

          <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/editor"
              className="px-6 py-3 text-sm sm:text-base font-bold text-white bg-[#1F3A8A] hover:bg-[#1A3175] rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <PenTool className="w-4 h-4" />
              <span>Start Writing Now — Free</span>
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-3 text-sm sm:text-base font-semibold text-[#14213D] bg-[#FFFFFF] hover:bg-[#F4EEDC] border border-[#E2D8C3] rounded-xl transition-all flex items-center gap-2"
            >
              <Cpu className="w-4 h-4 text-[#1F3A8A]" />
              <span>AI Assignment Solver</span>
            </Link>
          </div>

          {/* Interactive Live Hero Demo */}
          <div className="pt-8">
            <HeroLiveDemo />
          </div>
        </div>
      </section>

      {/* Ruled Divider */}
      <div className="ruled-divider max-w-6xl mx-auto w-full my-6" />

      {/* How It Works (3 Steps) */}
      <section id="how-it-works" className="py-16 px-4 sm:px-6 max-w-6xl mx-auto w-full">
        <div className="text-center space-y-2 mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-[#1F3A8A]">
            Simple Workflow
          </span>
          <h2 className="text-3xl font-serif font-bold text-[#14213D]">
            From Assignment Prompt to Handwritten PDF in 3 Steps
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-white rounded-2xl border border-[#E2D8C3] shadow-xs relative">
            <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#1F3A8A] font-bold text-base flex items-center justify-center mb-4">
              1
            </div>
            <h3 className="text-lg font-bold text-[#14213D] mb-2">Type or Upload</h3>
            <p className="text-sm text-[#4B5563] leading-relaxed">
              Paste your text or upload a scanned problem set. Our AI solver extracts questions and
              drafts step-by-step solutions with math formulas.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-[#E2D8C3] shadow-xs relative">
            <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#1F3A8A] font-bold text-base flex items-center justify-center mb-4">
              2
            </div>
            <h3 className="text-lg font-bold text-[#14213D] mb-2">Style Handwriting & Paper</h3>
            <p className="text-sm text-[#4B5563] leading-relaxed">
              Pick from 10+ organic fonts (including Hindi/Devanagari), set pen type (ballpoint, gel,
              fountain), and snap lines to lined or grid paper.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-[#E2D8C3] shadow-xs relative">
            <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#1F3A8A] font-bold text-base flex items-center justify-center mb-4">
              3
            </div>
            <h3 className="text-lg font-bold text-[#14213D] mb-2">Export 300 DPI A4 PDF</h3>
            <p className="text-sm text-[#4B5563] leading-relaxed">
              Download crisp, multi-page print-ready PDFs at exact 2480 × 3508 px resolution, ready
              for physical printing or digital classroom submission.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-16 px-4 sm:px-6 bg-[#FAF7F0] border-y border-[#E2D8C3]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-2 mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1F3A8A]">
              Built for Authenticity
            </span>
            <h2 className="text-3xl font-serif font-bold text-[#14213D]">
              Engineered Down to the Micro-Fibers
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 bg-white rounded-xl border border-[#E2D8C3] shadow-xs">
              <Sparkles className="w-6 h-6 text-[#1F3A8A] mb-3" />
              <h4 className="font-bold text-base mb-1.5">No AI Inconsistencies</h4>
              <p className="text-xs text-[#4B5563] leading-relaxed">
                Deterministic rule-based math engine using seeded PRNG. The same text and seed
                always renders identical output without hallucinated symbols.
              </p>
            </div>

            <div className="p-6 bg-white rounded-xl border border-[#E2D8C3] shadow-xs">
              <Scroll className="w-6 h-6 text-[#1F3A8A] mb-3" />
              <h4 className="font-bold text-base mb-1.5">Paper Ruling Snapping</h4>
              <p className="text-xs text-[#4B5563] leading-relaxed">
                Text lines automatically calculate baseline heights and lock directly onto ruled
                notebook lines, just like human handwriting.
              </p>
            </div>

            <div className="p-6 bg-white rounded-xl border border-[#E2D8C3] shadow-xs">
              <Layers className="w-6 h-6 text-[#1F3A8A] mb-3" />
              <h4 className="font-bold text-base mb-1.5">Natural Fatigue Simulation</h4>
              <p className="text-xs text-[#4B5563] leading-relaxed">
                Optional fatigue model allows handwriting variation to gently expand and drift as
                you reach the bottom of lengthy assignments.
              </p>
            </div>

            <div className="p-6 bg-white rounded-xl border border-[#E2D8C3] shadow-xs">
              <GraduationCap className="w-6 h-6 text-[#1F3A8A] mb-3" />
              <h4 className="font-bold text-base mb-1.5">Hindi & Devanagari Support</h4>
              <p className="text-xs text-[#4B5563] leading-relaxed">
                Includes Kalam with full Devanagari script support, rendering authentic handwritten
                Hindi and bilingual assignments.
              </p>
            </div>

            <div className="p-6 bg-white rounded-xl border border-[#E2D8C3] shadow-xs">
              <Terminal className="w-6 h-6 text-[#1F3A8A] mb-3" />
              <h4 className="font-bold text-base mb-1.5">Terminal Studio Integration</h4>
              <p className="text-xs text-[#4B5563] leading-relaxed">
                Solve coding questions and embed authentic executed terminal output (Windows Terminal,
                Ubuntu, VS Code themes) into your papers.
              </p>
            </div>

            <div className="p-6 bg-white rounded-xl border border-[#E2D8C3] shadow-xs">
              <Download className="w-6 h-6 text-[#1F3A8A] mb-3" />
              <h4 className="font-bold text-base mb-1.5">300 DPI Vector-Grade PDF</h4>
              <p className="text-xs text-[#4B5563] leading-relaxed">
                Built-in multi-page PDF generation via pdf-lib. Crisp printing with zero pixelation
                on home or university laser printers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Handwriting Style Showcase */}
      <section id="styles" className="py-16 px-4 sm:px-6 max-w-6xl mx-auto w-full">
        <div className="text-center space-y-2 mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-[#1F3A8A]">
            Typography
          </span>
          <h2 className="text-3xl font-serif font-bold text-[#14213D]">
            10 Bundled Handwriting Fonts
          </h2>
          <p className="text-sm text-[#4B5563]">
            Commercially licensed SIL Open Font License scripts for every student persona.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {HANDWRITING_FONTS.map((font) => (
            <div
              key={font.id}
              className="p-5 bg-white rounded-xl border border-[#E2D8C3] shadow-xs space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#14213D]">{font.name}</span>
                <span className="text-[11px] text-[#6B7280] capitalize bg-[#FAF5E6] px-2 py-0.5 rounded border border-[#E2D8C3]">
                  {font.category}
                </span>
              </div>
              <p
                className="text-2xl text-[#1F3A8A] pt-2 truncate"
                style={{ fontFamily: font.family }}
              >
                {font.sampleText}
              </p>
              <div className="text-[11px] text-[#9CA3AF] pt-1">
                By {font.author} · {font.license}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Preview */}
      <section id="pricing" className="py-16 px-4 sm:px-6 bg-[#FAF7F0] border-t border-[#E2D8C3]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center space-y-2 mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1F3A8A]">
              Transparent Pricing
            </span>
            <h2 className="text-3xl font-serif font-bold text-[#14213D]">
              Choose the Plan for Your Semester
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="p-6 bg-white rounded-2xl border border-[#E2D8C3] shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-lg text-[#14213D]">Free</h3>
                <div className="text-3xl font-bold text-[#1F3A8A] my-3">₹0</div>
                <p className="text-xs text-[#6B7280] mb-4">For occasional assignment submissions.</p>
                <ul className="space-y-2.5 text-xs text-[#4B5563]">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>20 handwritten pages / month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>15 AI solver questions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>6 Handwriting styles</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Small footer watermark</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/editor"
                className="mt-6 w-full py-2.5 text-xs font-bold text-[#1F3A8A] bg-[#EEF2FF] hover:bg-[#E0E7FF] border border-[#C7D2FE] rounded-xl text-center transition-colors"
              >
                Use Free
              </Link>
            </div>

            {/* Pro */}
            <div className="p-6 bg-white rounded-2xl border-2 border-[#1F3A8A] shadow-md flex flex-col justify-between relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1F3A8A] text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
                Most Popular
              </span>
              <div>
                <h3 className="font-bold text-lg text-[#14213D]">Pro</h3>
                <div className="text-3xl font-bold text-[#1F3A8A] my-3">₹249<span className="text-xs font-normal text-[#6B7280]">/mo</span></div>
                <p className="text-xs text-[#6B7280] mb-4">Complete package for active university students.</p>
                <ul className="space-y-2.5 text-xs text-[#4B5563]">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>300 handwritten pages / month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>300 AI solver questions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>All 25 handwriting styles</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>No watermarks</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Terminal Studio exports (100)</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/dashboard"
                className="mt-6 w-full py-2.5 text-xs font-bold text-white bg-[#1F3A8A] hover:bg-[#1A3175] rounded-xl text-center shadow-xs transition-colors"
              >
                Upgrade to Pro
              </Link>
            </div>

            {/* Premium */}
            <div className="p-6 bg-white rounded-2xl border border-[#E2D8C3] shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-lg text-[#14213D]">Premium</h3>
                <div className="text-3xl font-bold text-[#1F3A8A] my-3">₹499<span className="text-xs font-normal text-[#6B7280]">/mo</span></div>
                <p className="text-xs text-[#6B7280] mb-4">Unlimited power with personal font creation.</p>
                <ul className="space-y-2.5 text-xs text-[#4B5563]">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Unlimited handwriting pages</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>1,000 AI questions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Personal font upload & template</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Unlimited Terminal Studio</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/dashboard"
                className="mt-6 w-full py-2.5 text-xs font-bold text-[#1F3A8A] bg-[#EEF2FF] hover:bg-[#E0E7FF] border border-[#C7D2FE] rounded-xl text-center transition-colors"
              >
                Get Premium
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 px-4 sm:px-6 max-w-4xl mx-auto w-full">
        <div className="text-center space-y-2 mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-[#1F3A8A]">
            Answers
          </span>
          <h2 className="text-3xl font-serif font-bold text-[#14213D]">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4 text-xs sm:text-sm">
          <div className="p-4 bg-white rounded-xl border border-[#E2D8C3]">
            <h4 className="font-bold text-[#14213D] mb-1.5">
              Will professors or teachers notice this is computer-generated?
            </h4>
            <p className="text-[#4B5563] leading-relaxed">
              Our engine is specifically engineered with micro-variations that mimic real human hands:
              glyph rotations, size jitter, ink pressure variations, baseline drifting, and baseline
              snapping to notebook rulings. Printed on normal paper, it is indistinguishable from neat
              student handwriting.
            </p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-[#E2D8C3]">
            <h4 className="font-bold text-[#14213D] mb-1.5">
              Can I print it directly on physical A4 paper?
            </h4>
            <p className="text-[#4B5563] leading-relaxed">
              Yes! Exports are rendered at full 300 DPI (2480 × 3508 px), the exact standard for
              commercial laser and inkjet printers. Select &apos;Plain A4&apos; paper style if printing on
              pre-lined notebook sheets, or choose &apos;Ruled with Margin&apos; to print both the notebook lines
              and the handwriting on blank paper.
            </p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-[#E2D8C3]">
            <h4 className="font-bold text-[#14213D] mb-1.5">
              Does this use AI to render handwriting?
            </h4>
            <p className="text-[#4B5563] leading-relaxed">
              No. The handwriting renderer uses a 100% deterministic, rule-based physics engine. That
              means zero hallucinated letters, instant real-time typing preview, and stable exports. AI
              is only used for extracting and solving questions when you use the AI Solver.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-[#FFFFFF] border-t border-[#E2D8C3] py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#6B7280]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#1F3A8A] flex items-center justify-center text-white">
              <PenTool className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-[#14213D]">YourAssignment</span>
            <span>— Paper & Notebook Handwriting Engine</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/editor" className="hover:text-[#1F3A8A]">
              Handwriting Editor
            </Link>
            <Link href="/dashboard" className="hover:text-[#1F3A8A]">
              Dashboard
            </Link>
            <a href="#pricing" className="hover:text-[#1F3A8A]">
              Pricing
            </a>
            <span className="text-[#9CA3AF]">© 2026 YourAssignment. Built with Next.js & Supabase.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
