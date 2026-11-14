'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PenTool,
  Cpu,
  Terminal,
  Plus,
  Search,
  FileText,
  Clock,
  Trash2,
  Copy,
  Download,
  Upload,
  Coins,
  BookOpen,
  ArrowRight,
  HardDrive,
  Settings,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEditorStore } from '@/lib/store/editor-store';
import { localAdapter } from '@/lib/storage/local-adapter';
import { StoredProject } from '@/lib/storage/adapter';

export default function DashboardPage() {
  const router = useRouter();
  const { setContent, setTitle, updateSettings } = useEditorStore();
  const [projects, setProjects] = useState<StoredProject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'handwriting' | 'solver'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Load projects from IndexedDB
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    const items = await localAdapter.getProjects();
    setProjects(items);
    setIsLoading(false);
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'all' || p.type === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const handleCreateNew = async () => {
    const newTitle = 'Untitled Handwritten Assignment';
    const newDoc = {
      content: '# New Assignment\n\nStart typing your questions and answers here...',
      settings: useEditorStore.getState().settings,
    };

    const newProject: StoredProject = {
      id: `proj-${Date.now()}`,
      title: newTitle,
      type: 'handwriting',
      document: newDoc,
      previewText: 'Start typing your questions and answers here...',
      pagesCount: 1,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    await localAdapter.saveProject(newProject);
    setTitle(newTitle);
    setContent(newDoc.content);
    router.push('/editor');
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this project from your device?')) {
      await localAdapter.deleteProject(id);
      await loadProjects();
    }
  };

  const handleDuplicate = async (project: StoredProject, e: React.MouseEvent) => {
    e.stopPropagation();
    const copy: StoredProject = {
      ...project,
      id: `proj-${Date.now()}`,
      title: `${project.title} (Copy)`,
      updatedAt: new Date().toISOString(),
    };
    await localAdapter.saveProject(copy);
    await loadProjects();
  };

  const handleOpenProject = (project: StoredProject) => {
    setTitle(project.title);
    setContent(project.document.content);
    if (project.document.settings) {
      updateSettings(project.document.settings);
    }
    router.push('/editor');
  };

  const handleExportJson = async () => {
    const jsonStr = await localAdapter.exportProjectsJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yourassignment-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
        alert(`Successfully imported ${count} project(s) to IndexedDB!`);
        await loadProjects();
      } catch {
        alert('Invalid JSON backup file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF7EE] text-[#14213D] select-none">
      {/* Dashboard Top Header */}
      <header className="h-16 bg-white border-b border-[#E2D8C3] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1F3A8A] flex items-center justify-center text-white">
              <PenTool className="w-4 h-4" />
            </div>
            <span className="font-bold text-base text-[#14213D] hidden sm:inline">
              YourAssignment
            </span>
          </Link>
          <span className="text-[#D5C9B0]">/</span>
          <span className="text-sm font-semibold text-[#6B7280]">Workspace</span>
        </div>

        {/* Right side: Zero-Config / Guest Mode */}
        <div className="flex items-center gap-3">
          <Link
            href="/setup"
            className="p-1.5 text-[#6B7280] hover:text-[#1F3A8A] hover:bg-[#F4EEDC] rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
            title="System Capabilities"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Capabilities</span>
          </Link>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FAF8F5] border border-[#E2D8C3] rounded-xl text-xs">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-bold text-[#14213D]">Unlimited</span>
            <span className="text-[10px] font-bold bg-emerald-700 text-white px-2 py-0.5 rounded-full ml-1">
              ZERO-CONFIG
            </span>
          </div>

          <div className="w-8 h-8 rounded-full bg-[#1F3A8A] text-white font-bold text-xs flex items-center justify-center">
            G
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Device Persistence Banner */}
        <div className="p-3.5 bg-[#EEF2FF] border border-[#C7D2FE] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-4 h-4 text-[#1F3A8A] shrink-0" />
            <span className="font-semibold text-[#1F3A8A]">
              Saved on this device only (IndexedDB)
            </span>
            <span className="text-[#4B5563] hidden md:inline">
              — Your documents are kept private in your browser.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              className="px-2.5 py-1 font-semibold text-[#1F3A8A] hover:bg-[#E0E7FF] rounded-lg transition-colors flex items-center gap-1"
              title="Download backup file of all documents"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>

            <label className="px-2.5 py-1 font-semibold text-[#1F3A8A] hover:bg-[#E0E7FF] rounded-lg transition-colors flex items-center gap-1 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Import JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Welcome Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2D8C3] shadow-xs">
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#14213D]">
              Student Workspace
            </h1>
            <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
              Create handwritten assignments, extract solutions, and capture terminal executions.
            </p>
          </div>

          <button
            onClick={handleCreateNew}
            className="px-5 py-2.5 text-sm font-bold text-white bg-[#1F3A8A] hover:bg-[#1A3175] rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Handwriting Document</span>
          </button>
        </div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleCreateNew}
            className="p-5 bg-white hover:bg-[#FAF8F5] rounded-2xl border border-[#E2D8C3] shadow-xs text-left transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#1F3A8A] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <PenTool className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-[#14213D]">Handwriting Editor</h3>
              <p className="text-xs text-[#6B7280] mt-1">
                Deterministic handwriting canvas with ruled paper snapping and 300 DPI A4 PDF export.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#1F3A8A]">
              <span>Open Editor</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>

          <Link
            href="/solver"
            className="p-5 bg-white hover:bg-[#FAF8F5] rounded-2xl border border-[#E2D8C3] shadow-xs text-left transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-[#14213D]">AI Assignment Solver</h3>
              <p className="text-xs text-[#6B7280] mt-1">
                Zero-config question extraction with free Groq key (BYOK) or manual question splitting.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-purple-700">
              <span>Open Solver</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            href="/terminal"
            className="p-5 bg-white hover:bg-[#FAF8F5] rounded-2xl border border-[#E2D8C3] shadow-xs text-left transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Terminal className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-[#14213D]">Terminal Studio</h3>
              <p className="text-xs text-[#6B7280] mt-1">
                Execute JavaScript & Python in-browser and capture realistic styled terminal screenshots.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-700">
              <span>Launch Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>

        {/* Projects Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#14213D]">Saved Documents</h2>
              <span className="text-xs bg-[#EAE1CB] text-[#14213D] px-2 py-0.5 rounded-full font-semibold">
                {filteredProjects.length}
              </span>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E2D8C3] rounded-lg outline-none focus:ring-1 focus:ring-[#1F3A8A] w-48 sm:w-64"
                />
              </div>

              <div className="flex bg-white border border-[#E2D8C3] rounded-lg p-0.5 text-xs">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-2.5 py-1 rounded font-medium ${
                    activeFilter === 'all' ? 'bg-[#1F3A8A] text-white' : 'text-[#6B7280]'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveFilter('handwriting')}
                  className={`px-2.5 py-1 rounded font-medium ${
                    activeFilter === 'handwriting' ? 'bg-[#1F3A8A] text-white' : 'text-[#6B7280]'
                  }`}
                >
                  Handwriting
                </button>
                <button
                  onClick={() => setActiveFilter('solver')}
                  className={`px-2.5 py-1 rounded font-medium ${
                    activeFilter === 'solver' ? 'bg-[#1F3A8A] text-white' : 'text-[#6B7280]'
                  }`}
                >
                  Solver
                </button>
              </div>
            </div>
          </div>

          {/* Projects Grid */}
          {isLoading ? (
            <div className="p-12 text-center text-xs text-[#6B7280]">
              Loading projects from IndexedDB...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => handleOpenProject(project)}
                  className="bg-white rounded-2xl border border-[#E2D8C3] p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#1F3A8A]" />
                        <span className="font-bold text-sm text-[#14213D] group-hover:text-[#1F3A8A] transition-colors truncate max-w-[200px]">
                          {project.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleDuplicate(project, e)}
                          className="p-1 hover:bg-[#FAF8F5] rounded text-[#6B7280] hover:text-[#14213D]"
                          title="Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(project.id, e)}
                          className="p-1 hover:bg-rose-50 rounded text-[#6B7280] hover:text-rose-600"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-[#6B7280] line-clamp-2 leading-relaxed">
                      {project.previewText || project.document.content.slice(0, 100)}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E2D8C3]/60 flex items-center justify-between text-[11px] text-[#9CA3AF]">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <span className="font-medium text-[#1F3A8A] bg-[#EEF2FF] px-2 py-0.5 rounded-full">
                      {project.pagesCount || 1} Page
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Helpful Tips Panel */}
        <div className="p-4 bg-[#FAF5E6] border border-[#E2D8C3] rounded-2xl flex items-start gap-3 text-xs text-[#14213D]">
          <BookOpen className="w-5 h-5 text-[#1F3A8A] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-[#1F3A8A]">
              Deterministic Offline Generation
            </span>
            <p className="text-[#4B5563] leading-relaxed">
              All handwriting rendering is performed locally via Canvas without AI, ensuring that
              your assignment exports are identical every time and never depend on server availability.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
