'use client';

import React, { useState, useEffect } from 'react';
import { TopBar } from '@/components/navigation/TopBar';
import { InputPanel } from '@/components/editor/InputPanel';
import { CanvasPreview } from '@/components/editor/CanvasPreview';
import { SettingsPanel } from '@/components/editor/SettingsPanel';
import { ExportModal } from '@/components/editor/ExportModal';
import { useEditorStore } from '@/lib/store/editor-store';
import {
  RotateCcw,
  RotateCw,
  Sparkles,
  Download,
  Printer,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckCircle2,
  Loader2,
  FileText,
  Sliders,
  Edit3,
  Eye,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';

export default function HomePage() {
  const {
    title,
    setTitle,
    undo,
    redo,
    regenerateSeed,
    zoom,
    setZoom,
    isSaving,
    loadFromStorage,
  } = useEditorStore();

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [pageCount, setPageCount] = useState(1);
  const [mobileTab, setMobileTab] = useState<'input' | 'preview' | 'settings'>('preview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [hoverFontFamily, setHoverFontFamily] = useState<string | null>(null);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#FBF7EE] text-[#14213D] overflow-hidden select-none">
      {/* 1. Top Bar */}
      <TopBar />

      {/* 2. Action & Document Sub-Bar */}
      <div className="h-11 border-b border-[#E2D8C3] bg-[#FAF8F5] px-4 flex items-center justify-between shrink-0 text-xs font-medium">
        {/* Document Title & Autosave status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[#1F3A8A]" />
            {isEditingTitle ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                autoFocus
                className="text-xs font-semibold text-[#14213D] border-b border-[#1F3A8A] bg-transparent outline-none px-1"
              />
            ) : (
              <button
                onClick={() => setIsEditingTitle(true)}
                className="text-xs font-bold text-[#14213D] hover:text-[#1F3A8A] transition-colors truncate max-w-[180px] sm:max-w-[280px] text-left"
                title="Click to rename document"
              >
                {title || 'Untitled Assignment'}
              </button>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-1 text-[11px] text-[#6B7280]">
            {isSaving ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-[#1F3A8A]" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Saved to IndexedDB</span>
              </>
            )}
          </div>
        </div>

        {/* Center: Undo/Redo & Seed variation */}
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            className="p-1 hover:bg-[#EAE1CB] rounded text-[#14213D]"
            title="Undo (Ctrl+Z)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            className="p-1 hover:bg-[#EAE1CB] rounded text-[#14213D]"
            title="Redo (Ctrl+Y)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-[1px] bg-[#E2D8C3] mx-1" />

          <button
            onClick={regenerateSeed}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#1F3A8A] bg-[#EEF2FF] hover:bg-[#E0E7FF] rounded-md border border-[#C7D2FE] transition-colors"
            title="Re-roll organic randomness"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#1F3A8A]" />
            <span className="hidden sm:inline">Regenerate Variation</span>
          </button>
        </div>

        {/* Right: Zoom & Export Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="hidden md:flex items-center gap-1 bg-white border border-[#E2D8C3] rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setZoom(zoom - 0.1)}
              className="p-1 hover:bg-[#FAF8F5] rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="w-10 text-center font-mono text-[11px]">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(zoom + 0.1)}
              className="p-1 hover:bg-[#FAF8F5] rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              onClick={() => setZoom(1.0)}
              className="p-1 hover:bg-[#FAF8F5] rounded"
              title="Reset Zoom"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#14213D] bg-white hover:bg-[#FAF8F5] border border-[#E2D8C3] rounded-lg shadow-2xs"
            title="Direct Print A4"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-[#1F3A8A] hover:bg-[#1A3175] rounded-lg shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF (300 DPI)</span>
          </button>

          {/* Toggle Right Settings Panel */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden lg:flex p-1 text-[#6B7280] hover:text-[#14213D] hover:bg-[#EAE1CB] rounded"
            title={isSidebarOpen ? 'Collapse Settings' : 'Expand Settings'}
          >
            {isSidebarOpen ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRightOpen className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* 3. Main Tool Workspace (Left: Input, Center: Preview, Right: Settings) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Text Input */}
        <div
          className={`w-full md:w-[360px] lg:w-[420px] h-full shrink-0 ${
            mobileTab === 'input' ? 'block' : 'hidden md:block'
          }`}
        >
          <InputPanel onHoverFont={setHoverFontFamily} />
        </div>

        {/* Center: Live A4 Canvas Preview */}
        <div
          className={`flex-1 h-full min-w-0 ${
            mobileTab === 'preview' ? 'block' : 'hidden md:block'
          }`}
        >
          <CanvasPreview
            onPageCountChange={setPageCount}
            hoverFontFamily={hoverFontFamily}
          />
        </div>

        {/* Right: Settings Panel */}
        {isSidebarOpen && (
          <div
            className={`w-full md:w-[320px] lg:w-[360px] h-full shrink-0 ${
              mobileTab === 'settings' ? 'block' : 'hidden lg:block'
            }`}
          >
            <SettingsPanel />
          </div>
        )}
      </div>

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden h-12 bg-white border-t border-[#E2D8C3] flex items-center justify-around text-xs font-semibold select-none shrink-0">
        <button
          onClick={() => setMobileTab('input')}
          className={`flex flex-col items-center gap-0.5 ${
            mobileTab === 'input' ? 'text-[#1F3A8A]' : 'text-[#6B7280]'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span>Text Input</span>
        </button>
        <button
          onClick={() => setMobileTab('preview')}
          className={`flex flex-col items-center gap-0.5 ${
            mobileTab === 'preview' ? 'text-[#1F3A8A]' : 'text-[#6B7280]'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>A4 Preview ({pageCount})</span>
        </button>
        <button
          onClick={() => setMobileTab('settings')}
          className={`flex flex-col items-center gap-0.5 ${
            mobileTab === 'settings' ? 'text-[#1F3A8A]' : 'text-[#6B7280]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>

      {/* Export Modal */}
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </div>
  );
}
