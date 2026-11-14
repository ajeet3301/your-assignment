'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PenTool, Cpu, Terminal, Info, Download, Upload } from 'lucide-react';
import { localAdapter } from '@/lib/storage/local-adapter';

export const TopBar: React.FC = () => {
  const pathname = usePathname();

  const handleExportJson = async () => {
    const json = await localAdapter.exportProjectsJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yourassignment-notes-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const count = await localAdapter.importProjectsJson(text);
        alert(`Successfully imported ${count} project(s) to this browser!`);
        window.location.reload();
      } catch {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <header className="h-14 bg-white border-b border-[#E2D8C3] px-4 flex items-center justify-between select-none shrink-0 z-40">
      {/* Brand Logo & Nav Tabs */}
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-base text-[#14213D]">
          <div className="w-7 h-7 rounded-lg bg-[#1F3A8A] text-white flex items-center justify-center">
            <PenTool className="w-4 h-4" />
          </div>
          <span>YourAssignment</span>
        </Link>

        <nav className="flex items-center gap-1 text-xs font-semibold">
          <Link
            href="/"
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              pathname === '/' || pathname === '/editor'
                ? 'bg-[#1F3A8A] text-white'
                : 'text-[#6B7280] hover:text-[#14213D] hover:bg-[#F4EEDC]'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Handwriting</span>
          </Link>

          <Link
            href="/solver"
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              pathname === '/solver'
                ? 'bg-[#1F3A8A] text-white'
                : 'text-[#6B7280] hover:text-[#14213D] hover:bg-[#F4EEDC]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Solver</span>
          </Link>

          <Link
            href="/terminal"
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              pathname === '/terminal'
                ? 'bg-[#1F3A8A] text-white'
                : 'text-[#6B7280] hover:text-[#14213D] hover:bg-[#F4EEDC]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Terminal</span>
          </Link>
        </nav>
      </div>

      {/* Right Actions: Backup & About */}
      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={handleExportJson}
          className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-[#6B7280] hover:text-[#14213D] hover:bg-[#FAF8F5] rounded-md transition-colors"
          title="Backup all projects to JSON"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export JSON</span>
        </button>

        <label
          className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-[#6B7280] hover:text-[#14213D] hover:bg-[#FAF8F5] rounded-md transition-colors cursor-pointer"
          title="Restore projects from JSON"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Import</span>
          <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
        </label>

        <div className="h-4 w-[1px] bg-[#E2D8C3] hidden sm:block mx-1" />

        <Link
          href="/about"
          className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
            pathname === '/about'
              ? 'text-[#1F3A8A] bg-[#EEF2FF]'
              : 'text-[#6B7280] hover:text-[#14213D] hover:bg-[#F4EEDC]'
          }`}
          title="Fonts & Credits"
        >
          <Info className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">About</span>
        </Link>
      </div>
    </header>
  );
};
