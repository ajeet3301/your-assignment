'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Terminal,
  Upload,
  Image as ImageIcon,
  Check,
  Sparkles,
} from 'lucide-react';
import {
  generateTerminalScreenshotDataUrl,
} from '@/lib/engine/terminal-canvas';
import { registerImage } from '@/lib/engine/image-registry';

export type TerminalTheme =
  | 'windows-terminal'
  | 'powershell'
  | 'ubuntu'
  | 'macos'
  | 'vscode'
  | 'dracula'
  | 'monokai';

interface ThemeConfig {
  name: string;
  bg: string;
  text: string;
  headerBg: string;
  headerText: string;
  dots: boolean;
}

const TERMINAL_THEMES: Record<TerminalTheme, ThemeConfig> = {
  'windows-terminal': {
    name: 'Windows Terminal (Dark)',
    bg: '#0C0C0C',
    text: '#CCCCCC',
    headerBg: '#1F1F1F',
    headerText: '#FFFFFF',
    dots: false,
  },
  powershell: {
    name: 'PowerShell Blue',
    bg: '#012456',
    text: '#FFFFFF',
    headerBg: '#0A326E',
    headerText: '#FFFFFF',
    dots: false,
  },
  ubuntu: {
    name: 'Ubuntu Purple',
    bg: '#300A24',
    text: '#FFFFFF',
    headerBg: '#3E1030',
    headerText: '#DFDBDF',
    dots: true,
  },
  macos: {
    name: 'macOS Terminal',
    bg: '#1E1E1E',
    text: '#F1F1F1',
    headerBg: '#2D2D2D',
    headerText: '#9A9A9A',
    dots: true,
  },
  vscode: {
    name: 'VS Code Dark',
    bg: '#181818',
    text: '#D4D4D4',
    headerBg: '#252526',
    headerText: '#CCCCCC',
    dots: false,
  },
  dracula: {
    name: 'Dracula',
    bg: '#282A36',
    text: '#F8F8F2',
    headerBg: '#21222C',
    headerText: '#6272A4',
    dots: true,
  },
  monokai: {
    name: 'Monokai',
    bg: '#272822',
    text: '#F8F8F2',
    headerBg: '#1E1F1C',
    headerText: '#75715E',
    dots: true,
  },
};

interface InsertImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (markdown: string) => void;
}

export const InsertImageModal: React.FC<InsertImageModalProps> = ({
  isOpen,
  onClose,
  onInsert,
}) => {
  const [tab, setTab] = useState<'terminal' | 'upload'>('terminal');

  // Terminal state
  const [theme, setTheme] = useState<TerminalTheme>('windows-terminal');
  const [windowTitle, setWindowTitle] = useState('bash - 80x24');
  const [promptPrefix, setPromptPrefix] = useState('user@assignment:~$');
  const [command, setCommand] = useState('python solution.py');
  const [output, setOutput] = useState(
    'Running test cases...\nTest 1: PASSED (12ms)\nTest 2: PASSED (8ms)\nAll tests passed successfully!'
  );

  // Upload state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [altText, setAltText] = useState('Execution Screenshot');
  const [imageSize, setImageSize] = useState<'small' | 'medium' | 'large' | 'full'>('medium');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentTheme = TERMINAL_THEMES[theme];

  const handleInsertTerminal = () => {
    const dataUrl = generateTerminalScreenshotDataUrl({
      themeConfig: currentTheme,
      windowTitle,
      promptPrefix,
      output,
      commandName: command,
    });

    const imgId = registerImage(dataUrl, command || 'Terminal Output');
    const markdown = `\n\n![${command || 'Terminal Output'}|${imageSize}](attachment:${imgId})\n\n`;
    onInsert(markdown);
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleInsertUpload = () => {
    if (!imagePreview) return;
    const imgId = registerImage(imagePreview, altText || 'Screenshot');
    const markdown = `\n\n![${altText || 'Screenshot'}|${imageSize}](attachment:${imgId})\n\n`;
    onInsert(markdown);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-[#E2D8C3] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#E2D8C3] bg-[#FAF8F5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[#1F3A8A]" />
            <h2 className="font-bold text-sm text-[#14213D]">
              Insert Screenshot into Handwriting
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[#EAE1CB] text-[#6B7280] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#E2D8C3] bg-white text-xs font-semibold">
          <button
            onClick={() => setTab('terminal')}
            className={`flex-1 py-2.5 px-4 flex items-center justify-center gap-2 border-b-2 transition-colors ${
              tab === 'terminal'
                ? 'border-[#1F3A8A] text-[#1F3A8A] bg-[#FAF8F5]'
                : 'border-transparent text-[#6B7280] hover:text-[#14213D]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Generate Terminal Screenshot</span>
          </button>
          <button
            onClick={() => setTab('upload')}
            className={`flex-1 py-2.5 px-4 flex items-center justify-center gap-2 border-b-2 transition-colors ${
              tab === 'upload'
                ? 'border-[#1F3A8A] text-[#1F3A8A] bg-[#FAF8F5]'
                : 'border-transparent text-[#6B7280] hover:text-[#14213D]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Image File</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {tab === 'terminal' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">
                    Terminal Theme
                  </label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as any)}
                    className="w-full p-1.5 border border-[#E2D8C3] rounded-lg text-xs bg-[#FAF8F5] outline-none"
                  >
                    {Object.entries(TERMINAL_THEMES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">
                    Command
                  </label>
                  <input
                    type="text"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    className="w-full p-1.5 border border-[#E2D8C3] rounded-lg text-xs font-mono bg-[#FAF8F5] outline-none"
                    placeholder="python main.py"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">
                  Terminal Output Text
                </label>
                <textarea
                  value={output}
                  onChange={(e) => setOutput(e.target.value)}
                  rows={5}
                  className="w-full p-2.5 font-mono text-xs border border-[#E2D8C3] rounded-xl bg-[#FAF8F5] outline-none resize-none leading-relaxed"
                  placeholder="Paste execution output here..."
                  spellCheck={false}
                />
              </div>

              {/* Live Preview Box */}
              <div
                className="rounded-xl overflow-hidden shadow-md border border-black/15 font-mono"
                style={{ backgroundColor: currentTheme.bg }}
              >
                <div
                  className="px-3 py-1.5 flex items-center justify-between text-[11px]"
                  style={{
                    backgroundColor: currentTheme.headerBg,
                    color: currentTheme.headerText,
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    {currentTheme.dots ? (
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                        <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
                      </div>
                    ) : (
                      <Terminal className="w-3 h-3 opacity-70" />
                    )}
                    <span className="font-semibold ml-1">{windowTitle}</span>
                  </div>
                </div>
                <div className="p-3 text-[11px]" style={{ color: currentTheme.text }}>
                  <div className="opacity-80">
                    <span className="text-emerald-400 font-bold">{promptPrefix} </span>
                    <span>{command}</span>
                  </div>
                  <pre className="mt-1 font-mono whitespace-pre-wrap opacity-95">
                    {output}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#E2D8C3] hover:border-[#1F3A8A] rounded-xl p-6 text-center cursor-pointer bg-[#FAF8F5] transition-colors"
              >
                {imagePreview ? (
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-h-48 rounded-lg shadow-sm border border-black/10"
                    />
                    <span className="text-[11px] text-[#1F3A8A] font-semibold">
                      Click to choose a different image
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#1F3A8A]">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-[#14213D]">
                      Click or drag screenshot image here
                    </span>
                    <span className="text-[11px] text-[#6B7280]">
                      PNG, JPG, or WebP up to 5 MB
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">
                  Caption / Alt text
                </label>
                <input
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  className="w-full p-2 border border-[#E2D8C3] rounded-lg text-xs bg-[#FAF8F5] outline-none"
                  placeholder="e.g. Code Execution Output"
                />
              </div>
            </div>
          )}

          {/* Size (छोटा / बड़ा) Selector */}
          <div className="pt-2 border-t border-[#E2D8C3]">
            <label className="block text-[11px] font-bold text-[#14213D] mb-1.5">
              Screenshot Size (छोटा / बड़ा विकल्प):
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'small', label: 'Chhota (छोटा)', desc: '45% Width' },
                { id: 'medium', label: 'Medium (सामान्य)', desc: '70% Width' },
                { id: 'large', label: 'Bada (बड़ा)', desc: '88% Width' },
                { id: 'full', label: 'Full Page', desc: '100% Width' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setImageSize(s.id as any)}
                  className={`py-2 px-2 rounded-xl text-center border transition-all ${
                    imageSize === s.id
                      ? 'bg-[#1F3A8A] text-white border-[#1F3A8A] shadow-xs ring-1 ring-[#1F3A8A]'
                      : 'bg-white hover:bg-[#FAF8F5] text-[#14213D] border-[#E2D8C3]'
                  }`}
                >
                  <div className="text-[11px] font-bold leading-tight">{s.label}</div>
                  <div className={`text-[10px] ${imageSize === s.id ? 'text-white/80' : 'text-[#6B7280]'}`}>
                    {s.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-2.5 bg-[#FAF8F5] border border-[#E2D8C3] rounded-xl text-[11px] text-[#6B7280] flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-[#1F3A8A] shrink-0 mt-0.5" />
            <span>
              <strong>Tip:</strong> You can also take any screenshot on your PC (e.g.{' '}
              <kbd className="px-1 py-0.5 bg-white border border-[#E2D8C3] rounded font-mono text-[10px]">
                Win + Shift + S
              </kbd>
              ) and press{' '}
              <kbd className="px-1 py-0.5 bg-white border border-[#E2D8C3] rounded font-mono text-[10px]">
                Ctrl + V
              </kbd>{' '}
              directly inside the handwriting text area to paste it instantly!
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#E2D8C3] bg-[#FAF8F5] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-[#6B7280] hover:text-[#14213D] rounded-lg"
          >
            Cancel
          </button>
          {tab === 'terminal' ? (
            <button
              onClick={handleInsertTerminal}
              className="px-4 py-1.5 text-xs font-bold text-white bg-[#1F3A8A] hover:bg-[#1A3175] rounded-lg shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Insert Terminal Screenshot</span>
            </button>
          ) : (
            <button
              onClick={handleInsertUpload}
              disabled={!imagePreview}
              className="px-4 py-1.5 text-xs font-bold text-white bg-[#1F3A8A] hover:bg-[#1A3175] disabled:opacity-50 rounded-lg shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Insert Uploaded Image</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
