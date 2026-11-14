'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { PRNG } from '@/lib/engine/prng';
import { drawPaperBackground } from '@/lib/engine/paper-ruling';
import { PEN_PROFILES } from '@/lib/engine/pen-effects';

export const HeroLiveDemo: React.FC = () => {
  const [inputText, setInputText] = useState(
    'The speed of light in vacuum, c = 299,792,458 m/s, is an exact physical constant.'
  );
  const [fontFamily, setFontFamily] = useState<string>("'Caveat', cursive");
  const [inkColor, setInkColor] = useState<string>('#1B3FA0');
  const [seed, setSeed] = useState<number>(42);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Renders the live interactive snippet
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Draw lined notebook paper
    drawPaperBackground(
      ctx,
      width,
      height,
      'ruled-margin',
      '#FBF7EE',
      { top: 15, bottom: 15, left: 35, right: 15 },
      true,
      false
    );

    const prng = new PRNG(seed);
    const pen = PEN_PROFILES.ballpoint;

    ctx.save();
    ctx.globalCompositeOperation = pen.blendMode;

    const fontSizePx = 28;
    ctx.font = `500 ${fontSizePx}px ${fontFamily}`;
    ctx.textBaseline = 'alphabetic';

    const words = inputText.split(' ');
    let cursorX = 140; // past red margin line
    let cursorY = 100;
    const lineSpacing = 48;
    const maxWidth = width - 40;

    for (let wIdx = 0; wIdx < words.length; wIdx++) {
      const word = words[wIdx];
      const wordWidth = ctx.measureText(word).width;

      if (cursorX + wordWidth > maxWidth) {
        cursorX = 140;
        cursorY += lineSpacing;
      }

      for (let cIdx = 0; cIdx < word.length; cIdx++) {
        const char = word[cIdx];
        const charMetrics = ctx.measureText(char);
        const charWidth = charMetrics.width;

        const sizeJitter = 1.0 + prng.gaussian(0, 0.04);
        const rotationJitter = prng.gaussian(0, 0.025);
        const drift = prng.gaussian(0, 1.2);

        ctx.save();
        ctx.fillStyle = inkColor;
        ctx.globalAlpha = Math.max(0.7, Math.min(1.0, 0.9 + prng.gaussian(0, 0.08)));

        const glyphX = cursorX + charWidth * 0.5;
        const glyphY = cursorY + drift;

        ctx.translate(glyphX, glyphY);
        ctx.rotate(rotationJitter);
        ctx.scale(sizeJitter, sizeJitter);

        ctx.fillText(char, -charWidth * 0.5, 0);
        ctx.restore();

        cursorX += charWidth + prng.range(-0.5, 0.8);
      }

      cursorX += ctx.measureText(' ').width + prng.range(-1, 2);
    }

    ctx.restore();
  }, [inputText, fontFamily, inkColor, seed]);

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-[#E2D8C3] overflow-hidden">
      {/* Top Bar */}
      <div className="bg-[#FAF8F5] border-b border-[#E2D8C3] px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#E5484D]/80" />
          <span className="w-3 h-3 rounded-full bg-[#FFE066]" />
          <span className="w-3 h-3 rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold text-[#14213D] ml-2">
            Interactive Engine Demo (No AI · 100% Deterministic)
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="p-1 px-2 border border-[#E2D8C3] rounded bg-white text-[#14213D] font-medium outline-none text-xs"
          >
            <option value="'Caveat', cursive">Caveat (Organic Cursive)</option>
            <option value="'Kalam', cursive">Kalam (Neat Hindi/Eng)</option>
            <option value="'Patrick Hand', cursive">Patrick Hand (Classroom)</option>
            <option value="'Homemade Apple', cursive">Homemade Apple (Fountain)</option>
            <option value="'Indie Flower', cursive">Indie Flower (Ballpoint)</option>
          </select>

          <button
            onClick={() => setSeed(Math.floor(Math.random() * 100000))}
            className="p-1 px-2.5 bg-[#EEF2FF] border border-[#C7D2FE] text-[#1F3A8A] font-semibold rounded hover:bg-[#E0E7FF] transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" />
            <span>Variation</span>
          </button>
        </div>
      </div>

      {/* Split Interactive View */}
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Left: Input Text Box */}
        <div className="p-4 border-b md:border-b-0 md:border-r border-[#E2D8C3] bg-[#FCFBF8] flex flex-col justify-between">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#6B7280] block mb-2">
              Type anything here to test in real time:
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={4}
              className="w-full p-3 font-mono text-xs md:text-sm text-[#14213D] border border-[#E2D8C3] rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#1F3A8A] resize-none"
              placeholder="Type your own assignment answers..."
            />
            {/* Quick Preset Buttons */}
            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-[#6B7280]">Try:</span>
              <button
                onClick={() =>
                  setInputText('Ohm’s law states that the current I = V / R through a conductor.')
                }
                className="text-[11px] bg-[#EAE1CB]/60 hover:bg-[#EAE1CB] text-[#14213D] px-2 py-0.5 rounded font-medium"
              >
                Physics
              </button>
              <button
                onClick={() =>
                  setInputText('In binary search, time complexity is O(log n) on sorted arrays.')
                }
                className="text-[11px] bg-[#EAE1CB]/60 hover:bg-[#EAE1CB] text-[#14213D] px-2 py-0.5 rounded font-medium"
              >
                Code
              </button>
              <button
                onClick={() =>
                  setInputText('The French Revolution of 1789 began with the Storming of the Bastille.')
                }
                className="text-[11px] bg-[#EAE1CB]/60 hover:bg-[#EAE1CB] text-[#14213D] px-2 py-0.5 rounded font-medium"
              >
                History
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E2D8C3]/60 flex items-center justify-between text-xs text-[#6B7280]">
            <span>Snaps to paper ruling baselines</span>
            <Link
              href="/editor"
              className="font-semibold text-[#1F3A8A] hover:underline flex items-center gap-1"
            >
              <span>Full 3-Panel Editor</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Right: Live Canvas Viewport */}
        <div className="p-3 bg-[#F4EEDC] flex items-center justify-center overflow-hidden">
          <canvas
            ref={canvasRef}
            width={580}
            height={260}
            className="w-full h-auto rounded-lg shadow-md border border-[#E2D8C3]"
          />
        </div>
      </div>
    </div>
  );
};
