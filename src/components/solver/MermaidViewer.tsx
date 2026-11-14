'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Code2,
  RefreshCw,
  Download,
  Eye,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface MermaidViewerProps {
  id: string;
  code: string;
  onChangeCode: (code: string) => void;
  onSvgRendered?: (svg: string, pngDataUrl?: string) => void;
}

export const MermaidViewer: React.FC<MermaidViewerProps> = ({
  id,
  code,
  onChangeCode,
  onSvgRendered,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [currentCode, setCurrentCode] = useState(code);

  useEffect(() => {
    setCurrentCode(code);
    renderDiagram(code);
  }, [code]);

  const renderDiagram = async (chartCode: string) => {
    if (!chartCode.trim()) return;
    setIsRendering(true);
    setRenderError(null);

    try {
      const mermaidModule = await import('mermaid');
      const mermaid = mermaidModule.default || mermaidModule;

      mermaid.initialize({
        startOnLoad: false,
        theme: 'neutral',
        securityLevel: 'loose',
        fontFamily: 'system-ui, sans-serif',
      });

      const uniqueId = `mermaid_${id.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
      const { svg } = await mermaid.render(uniqueId, chartCode);
      setSvgContent(svg);

      // Convert SVG to PNG Data URL for Word DOCX export
      if (typeof window !== 'undefined') {
        try {
          const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);
          const img = new Image();

          img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = 2; // High-DPI export
            const w = Math.max(img.width || 600, 600);
            const h = Math.max(img.height || 350, 350);
            canvas.width = w * scale;
            canvas.height = h * scale;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.scale(scale, scale);
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, w, h);
              ctx.drawImage(img, 0, 0, w, h);
              const pngDataUrl = canvas.toDataURL('image/png');
              onSvgRendered?.(svg, pngDataUrl);
            }
            URL.revokeObjectURL(url);
          };

          img.onerror = () => {
            URL.revokeObjectURL(url);
            onSvgRendered?.(svg);
          };

          img.src = url;
        } catch {
          onSvgRendered?.(svg);
        }
      }
    } catch (err: any) {
      console.warn('Mermaid rendering failed:', err);
      setRenderError(err.message || 'Syntax error in Mermaid diagram code');
    } finally {
      setIsRendering(false);
    }
  };

  const handleApplyCode = () => {
    onChangeCode(currentCode);
    renderDiagram(currentCode);
  };

  return (
    <div className="space-y-2 border border-[#E2D8C3] rounded-xl bg-white overflow-hidden shadow-xs">
      {/* Diagram Action Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#FAF8F5] border-b border-[#E2D8C3] text-xs font-semibold text-[#14213D]">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Rendered System Diagram / Flowchart</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditorOpen(!isEditorOpen)}
            className="flex items-center gap-1 text-[11px] text-[#1F3A8A] font-bold hover:underline"
          >
            <Code2 className="w-3 h-3" />
            <span>{isEditorOpen ? 'Hide Mermaid Source' : 'Edit Mermaid Code'}</span>
            {isEditorOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Rendered SVG Viewport */}
      <div className="p-4 bg-white flex items-center justify-center min-h-[180px] overflow-x-auto">
        {renderError ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2 w-full">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Diagram Render Error</p>
              <p className="font-mono text-[11px] opacity-90">{renderError}</p>
            </div>
          </div>
        ) : svgContent ? (
          <div
            ref={containerRef}
            className="w-full flex items-center justify-center max-w-full [&_svg]:max-w-full [&_svg]:h-auto select-text"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div className="text-xs text-[#6B7280] flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#1F3A8A]" />
            <span>Rendering diagram...</span>
          </div>
        )}
      </div>

      {/* Collapsible Mermaid Code Editor */}
      {isEditorOpen && (
        <div className="p-3 bg-[#FAF8F5] border-t border-[#E2D8C3] space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#6B7280]">
            <span>Mermaid.js Code:</span>
            <span className="text-[10px]">Supports flowchart, graph, sequenceDiagram, classDiagram</span>
          </div>

          <textarea
            value={currentCode}
            onChange={(e) => setCurrentCode(e.target.value)}
            rows={5}
            className="w-full p-2.5 font-mono text-xs text-[#14213D] border border-[#E2D8C3] rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#1F3A8A] resize-none"
            placeholder="flowchart TD\n  A --> B"
            spellCheck={false}
          />

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleApplyCode}
              disabled={isRendering}
              className="px-3 py-1 bg-[#1F3A8A] hover:bg-[#1A3175] text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isRendering ? 'animate-spin' : ''}`} />
              <span>Re-render Diagram</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
