'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  RotateCcw,
  RotateCw,
  Sparkles,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckCircle2,
  Loader2,
  FileText,
} from 'lucide-react';
import { useEditorStore } from '@/lib/store/editor-store';

interface EditorNavProps {
  onOpenExport: () => void;
  pageCount: number;
}

export const EditorNav: React.FC<EditorNavProps> = ({ onOpenExport, pageCount }) => {
  const {
    title,
    setTitle,
    undo,
    redo,
    regenerateSeed,
    zoom,
    setZoom,
    isSaving,
    lastSaved,
  } = useEditorStore();

  const [isEditingTitle, setIsEditingTitle] = useState(false);

  return (
    <header className="h-14 border-b border-[#E2D8C3] bg-[#FFFFFF] px-4 flex items-center justify-between shadow-xs select-none">
      {/* Left: Back & Title */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="p-1.5 text-[#14213D] hover:bg-[#F4EEDC] rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-4 h-4 text-[#1F3A8A]" />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>

        <div className="h-5 w-[1px] bg-[#E2D8C3]" />

        {/* Editable Title */}
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#1F3A8A]" />
          {isEditingTitle ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
              autoFocus
              className="text-sm font-semibold text-[#14213D] border-b border-[#1F3A8A] bg-transparent outline-none px-1"
            />
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              className="text-sm font-semibold text-[#14213D] hover:text-[#1F3A8A] transition-colors truncate max-w-[200px] md:max-w-[320px] text-left"
              title="Click to rename"
            >
              {title || 'Untitled Document'}
            </button>
          )}
        </div>

        {/* Save indicator */}
        <div className="hidden lg:flex items-center gap-1 text-xs text-[#6B7280]">
          {isSaving ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-[#1F3A8A]" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Saved locally</span>
            </>
          )}
        </div>
      </div>

      {/* Center: Undo/Redo & Regenerate Variation */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={undo}
          className="p-1.5 text-[#14213D] hover:bg-[#F4EEDC] rounded-md transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={redo}
          className="p-1.5 text-[#14213D] hover:bg-[#F4EEDC] rounded-md transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-[#E2D8C3] mx-1" />

        <button
          onClick={regenerateSeed}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#1F3A8A] bg-[#EEF2FF] hover:bg-[#E0E7FF] rounded-md border border-[#C7D2FE] transition-colors"
          title="Re-roll organic randomness for realistic handwriting variation"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#1F3A8A]" />
          <span>Regenerate Variation</span>
        </button>
      </div>

      {/* Right: Zoom & Export */}
      <div className="flex items-center gap-2">
        {/* Zoom controls */}
        <div className="hidden md:flex items-center gap-1 bg-[#FBF7EE] border border-[#E2D8C3] rounded-lg p-0.5 text-xs text-[#14213D]">
          <button
            onClick={() => setZoom(zoom - 0.1)}
            className="p-1 hover:bg-[#EAE1CB] rounded"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="w-11 text-center font-mono font-medium">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(zoom + 0.1)}
            className="p-1 hover:bg-[#EAE1CB] rounded"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(1.0)}
            className="p-1 hover:bg-[#EAE1CB] rounded"
            title="Reset Zoom"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Export Button */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs md:text-sm font-semibold text-white bg-[#1F3A8A] hover:bg-[#1A3175] rounded-lg shadow-sm transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Export A4 PDF</span>
        </button>
      </div>
    </header>
  );
};
