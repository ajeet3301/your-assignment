'use client';

import React from 'react';
import Link from 'next/link';
import { TopBar } from '@/components/navigation/TopBar';
import { ALL_HANDWRITING_FONTS } from '@/lib/engine/fonts';
import { PenTool, ShieldCheck, Heart, Sparkles, ExternalLink } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FBF7EE] text-[#14213D] select-none">
      <TopBar />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {/* Intro Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E2D8C3] shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1F3A8A] text-white flex items-center justify-center">
              <PenTool className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#14213D]">
              About YourAssignment
            </h1>
          </div>

          <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
            YourAssignment is a fast, deterministic handwriting generator and assignment utility.
            It uses a mathematical rule-based physics engine (seeded PRNG, glyph jitter, baseline
            drifting, and ruled paper baseline snapping) to render realistic handwriting on A4 pages.
          </p>

          <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-semibold text-[#1F3A8A]">
            <div className="p-3 bg-[#EEF2FF] rounded-xl flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#1F3A8A]" />
              <span>100% Free & Unlimited</span>
            </div>
            <div className="p-3 bg-[#EEF2FF] rounded-xl flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#1F3A8A]" />
              <span>Zero-Config (No Login)</span>
            </div>
            <div className="p-3 bg-[#EEF2FF] rounded-xl flex items-center gap-2">
              <Heart className="w-4 h-4 text-[#1F3A8A]" />
              <span>No Watermarks</span>
            </div>
          </div>
        </div>

        {/* Font Credits & Licenses (54 OFL fonts) */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E2D8C3] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#14213D]">
                Handwriting Font Credits ({ALL_HANDWRITING_FONTS.length})
              </h2>
              <p className="text-xs text-[#6B7280]">
                All fonts are commercially free and licensed under the SIL Open Font License (OFL) or
                Apache License 2.0.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1 text-xs">
            {ALL_HANDWRITING_FONTS.map((font) => (
              <div
                key={font.id}
                className="p-3 rounded-xl border border-[#E2D8C3] bg-[#FAF8F5] flex flex-col justify-between space-y-1.5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#14213D]">{font.name}</span>
                    <span className="text-[10px] bg-white border border-[#E2D8C3] px-1.5 py-0.2 rounded text-[#786F5C]">
                      {font.category}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#6B7280]">By {font.author}</div>
                </div>

                <div className="text-[10px] text-[#9CA3AF] flex items-center justify-between pt-1 border-t border-[#E2D8C3]/60">
                  <span>{font.license}</span>
                  <span className="text-[#1F3A8A] font-mono">Free OFL</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Open Source Engine Dependencies */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E2D8C3] shadow-xs space-y-3 text-xs">
          <h2 className="text-lg font-bold text-[#14213D]">Open Source Libraries</h2>
          <div className="space-y-2 text-[#4B5563] leading-relaxed">
            <p>
              • <strong>pdf-lib</strong>: Client-side high-resolution 300 DPI vector A4 document compilation.
            </p>
            <p>
              • <strong>Dexie.js</strong>: Fast IndexedDB storage for offline project persistence.
            </p>
            <p>
              • <strong>Pyodide & Web Workers</strong>: In-browser sandboxed Python and JavaScript runtime execution.
            </p>
            <p>
              • <strong>Next.js & Tailwind CSS</strong>: Simple, reactive, accessible UI.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
