'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useEditorStore } from '@/lib/store/editor-store';
import { calculateDocumentLayout } from '@/lib/engine/layout-engine';
import { renderHandwrittenPage } from '@/lib/engine/canvas-renderer';
import { A4_WIDTH_PREVIEW, A4_HEIGHT_PREVIEW } from '@/lib/engine/types';
import { exportPageAsPng } from '@/lib/export/image-export';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';

interface CanvasPreviewProps {
  onPageCountChange?: (count: number) => void;
}

export const CanvasPreview: React.FC<CanvasPreviewProps> = ({ onPageCountChange }) => {
  const { content, settings, zoom, currentPage, setCurrentPage } = useEditorStore();
  const [debouncedContent, setDebouncedContent] = useState(content);

  // Debounce layout updates for buttery-smooth 60fps typing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedContent(content);
    }, 120);
    return () => clearTimeout(handler);
  }, [content]);

  // Compute pages layout
  const pages = useMemo(() => {
    return calculateDocumentLayout(debouncedContent, {
      canvasWidth: A4_WIDTH_PREVIEW,
      canvasHeight: A4_HEIGHT_PREVIEW,
      settings,
    });
  }, [debouncedContent, settings]);

  useEffect(() => {
    if (onPageCountChange) {
      onPageCountChange(pages.length);
    }
  }, [pages.length, onPageCountChange]);

  // Canvas refs array
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  // Render pages when layout or settings change
  useEffect(() => {
    // Wait for web fonts to load for accurate canvas glyph rendering
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => {
        pages.forEach((page, idx) => {
          const canvas = canvasRefs.current[idx];
          if (canvas) {
            canvas.width = A4_WIDTH_PREVIEW;
            canvas.height = A4_HEIGHT_PREVIEW;
            renderHandwrittenPage({
              canvas,
              page,
              totalPages: pages.length,
              settings,
            });
          }
        });
      });
    }
  }, [pages, settings]);

  return (
    <div className="h-full flex flex-col bg-[#ECE4D0] overflow-hidden select-none">
      {/* Top Page Navigator Bar */}
      <div className="h-10 px-4 bg-[#E2D8C3] border-b border-[#D5C9B0] flex items-center justify-between text-xs font-medium text-[#14213D]">
        <div className="flex items-center gap-2">
          <span>
            Page {currentPage + 1} of {pages.length}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="p-1 hover:bg-[#D5C9B0] rounded disabled:opacity-30 disabled:hover:bg-transparent"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(pages.length - 1, currentPage + 1))}
              disabled={currentPage >= pages.length - 1}
              className="p-1 hover:bg-[#D5C9B0] rounded disabled:opacity-30 disabled:hover:bg-transparent"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            if (pages[currentPage]) {
              exportPageAsPng(
                pages[currentPage],
                pages.length,
                settings,
                `page-${currentPage + 1}.png`
              );
            }
          }}
          className="flex items-center gap-1 text-[#1F3A8A] hover:text-[#14213D] transition-colors"
          title="Download Current Page as High-Res PNG"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Save Page PNG</span>
        </button>
      </div>

      {/* Canvas Viewport with Zoom */}
      <div className="flex-1 overflow-auto p-4 md:p-8 flex flex-col items-center gap-8">
        {pages.map((page, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center transition-transform origin-top"
            style={{
              transform: `scale(${zoom})`,
              marginBottom: `${(zoom - 1) * 300}px`,
            }}
          >
            {/* A4 Sheet Container */}
            <div className="relative shadow-xl hover:shadow-2xl transition-shadow rounded-sm bg-white border border-[#D5C9B0]/60">
              <canvas
                ref={(el) => {
                  canvasRefs.current[idx] = el;
                }}
                width={A4_WIDTH_PREVIEW}
                height={A4_HEIGHT_PREVIEW}
                className="block max-w-full h-auto cursor-default"
                style={{
                  width: `${A4_WIDTH_PREVIEW * 0.72}px`,
                  height: `${A4_HEIGHT_PREVIEW * 0.72}px`,
                }}
              />
            </div>
            <span className="mt-2 text-xs text-[#786F5C] font-mono">
              Page {idx + 1}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
