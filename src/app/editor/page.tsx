'use client';

import React, { useState, useEffect } from 'react';
import { EditorNav } from '@/components/editor/EditorNav';
import { InputPanel } from '@/components/editor/InputPanel';
import { CanvasPreview } from '@/components/editor/CanvasPreview';
import { SettingsPanel } from '@/components/editor/SettingsPanel';
import { ExportModal } from '@/components/editor/ExportModal';
import { useEditorStore } from '@/lib/store/editor-store';
import { Edit3, Sliders, Eye } from 'lucide-react';

export default function EditorPage() {
  const { loadFromStorage } = useEditorStore();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [pageCount, setPageCount] = useState(1);
  const [mobileTab, setMobileTab] = useState<'input' | 'preview' | 'settings'>('preview');

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#FBF7EE] overflow-hidden">
      {/* Top Navbar */}
      <EditorNav onOpenExport={() => setIsExportOpen(true)} pageCount={pageCount} />

      {/* Main 3-Panel Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel: Text & Markdown Input */}
        <aside
          className={`w-full md:w-[360px] lg:w-[420px] h-full shrink-0 ${
            mobileTab === 'input' ? 'block' : 'hidden md:block'
          }`}
        >
          <InputPanel />
        </aside>

        {/* Center Panel: Live A4 Canvas Preview */}
        <main
          className={`flex-1 h-full min-w-0 ${
            mobileTab === 'preview' ? 'block' : 'hidden md:block'
          }`}
        >
          <CanvasPreview onPageCountChange={setPageCount} />
        </main>

        {/* Right Panel: Handwriting & Paper Settings */}
        <aside
          className={`w-full md:w-[320px] lg:w-[360px] h-full shrink-0 ${
            mobileTab === 'settings' ? 'block' : 'hidden lg:block'
          }`}
        >
          <SettingsPanel />
        </aside>
      </div>

      {/* Mobile Bottom Navigation Bar (for small screens < 768px) */}
      <nav className="md:hidden h-12 bg-white border-t border-[#E2D8C3] flex items-center justify-around text-xs font-semibold select-none">
        <button
          onClick={() => setMobileTab('input')}
          className={`flex flex-col items-center gap-0.5 ${
            mobileTab === 'input' ? 'text-[#1F3A8A]' : 'text-[#6B7280]'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span>Editor</span>
        </button>
        <button
          onClick={() => setMobileTab('preview')}
          className={`flex flex-col items-center gap-0.5 ${
            mobileTab === 'preview' ? 'text-[#1F3A8A]' : 'text-[#6B7280]'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Preview ({pageCount})</span>
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
      </nav>

      {/* Export Modal */}
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </div>
  );
}
