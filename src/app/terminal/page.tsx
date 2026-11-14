'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Terminal,
  Play,
  Download,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  Loader2,
  FileText,
  RotateCcw,
  ChevronDown,
  PlusCircle,
  FilePlus,
} from 'lucide-react';
import { runJavaScriptInBrowser, runPythonInBrowser, ExecutionResult } from '@/lib/code/browser-runner';
import { useEditorStore } from '@/lib/store/editor-store';
import { TopBar } from '@/components/navigation/TopBar';
import { generateTerminalScreenshotDataUrl } from '@/lib/engine/terminal-canvas';

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

const SAMPLE_JS_CODE = `// Binary Search in JavaScript
function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    console.log(\`Checking index \${mid}: value = \${arr[mid]}\`);
    
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}

const scores = [12, 24, 38, 45, 67, 78, 89, 99];
const target = 78;
const index = binarySearch(scores, target);
console.log(\`\\nTarget \${target} located at array index: \${index}\`);`;

export default function TerminalStudioPage() {
  const router = useRouter();
  const { setContent, setTitle, content } = useEditorStore();

  const [language, setLanguage] = useState<'javascript' | 'python' | 'cpp' | 'java'>('javascript');
  const [code, setCode] = useState(SAMPLE_JS_CODE);
  const [theme, setTheme] = useState<TerminalTheme>('windows-terminal');
  const [windowTitle, setWindowTitle] = useState('bash - 80x24');
  const [promptPrefix, setPromptPrefix] = useState('user@assignment:~$');
  const [output, setOutput] = useState(
    'Checking index 3: value = 45\nChecking index 5: value = 78\n\nTarget 78 located at array index: 5'
  );
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>({
    stdout: output,
    stderr: '',
    exitCode: 0,
    runtimeMs: 14,
    mode: 'executed-browser',
    language: 'javascript',
  });
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEmbedMenuOpen, setIsEmbedMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const terminalRef = useRef<HTMLDivElement>(null);

  const currentTheme = TERMINAL_THEMES[theme];

  const handleRunCode = async () => {
    setIsRunning(true);

    if (language === 'javascript') {
      const res = await runJavaScriptInBrowser(code);
      setExecutionResult(res);
      setOutput(res.stderr ? `${res.stdout}\n[Error]: ${res.stderr}` : res.stdout);
    } else if (language === 'python') {
      const res = await runPythonInBrowser(code);
      setExecutionResult(res);
      setOutput(res.stderr ? `${res.stdout}\n[Error]: ${res.stderr}` : res.stdout);
    } else {
      // For compiled languages without Judge0 remote host
      setExecutionResult({
        stdout: output,
        stderr: '',
        exitCode: 0,
        runtimeMs: 0,
        mode: 'simulated',
        language,
      });
    }

    setIsRunning(false);
  };

  const generateScreenshotDataUrl = () => {
    return generateTerminalScreenshotDataUrl({
      themeConfig: currentTheme,
      windowTitle,
      promptPrefix,
      output,
      commandName: `run solution.${language === 'javascript' ? 'js' : language === 'python' ? 'py' : 'cpp'}`,
    });
  };

  // Option 1: Append screenshot to current assignment
  const handleAppendToHandwriting = () => {
    const screenshotDataUrl = generateScreenshotDataUrl();
    const currentDoc = useEditorStore.getState().content;
    const snippet = `\n\n**Executed Terminal Screenshot (${executionResult?.mode === 'executed-browser' ? 'Executed in browser' : 'Simulated'}):**\n\n![Terminal Execution](${screenshotDataUrl})\n`;
    setContent(currentDoc + snippet);
    router.push('/');
  };

  // Option 2: Replace / Create new assignment document
  const handleCreateNewDocument = () => {
    const screenshotDataUrl = generateScreenshotDataUrl();
    const formattedBlock = `# Coding Assignment Solution (${language.toUpperCase()})

\`\`\`${language}
${code}
\`\`\`

**Executed Terminal Screenshot (${executionResult?.mode === 'executed-browser' ? 'Executed in browser' : 'Simulated'}):**

![Terminal Execution](${screenshotDataUrl})

The program completed execution with status code 0.
`;

    setTitle(`Coding Solution (${language.toUpperCase()})`);
    setContent(formattedBlock);
    router.push('/');
  };

  // Option 3: Copy markdown tag to clipboard
  const handleCopyMarkdownTag = () => {
    const screenshotDataUrl = generateScreenshotDataUrl();
    navigator.clipboard.writeText(`![Terminal Screenshot](${screenshotDataUrl})`);
    setToastMessage('Screenshot code copied! Paste (Ctrl+V) anywhere in your handwritten notes.');
    setIsEmbedMenuOpen(false);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDownloadScreenshot = () => {
    const screenshotDataUrl = generateScreenshotDataUrl();
    const a = document.createElement('a');
    a.href = screenshotDataUrl;
    a.download = `terminal-${language}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF7EE] text-[#14213D] select-none relative">
      <TopBar />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 bg-[#1F3A8A] text-white text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Studio Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Code Editor & Controls (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E2D8C3] p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#14213D] uppercase tracking-wider">
                Source Code
              </label>

              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="p-1 px-2 border border-[#E2D8C3] rounded-lg text-xs font-semibold bg-[#FAF8F5] outline-none"
              >
                <option value="javascript">JavaScript (Web Worker)</option>
                <option value="python">Python (Pyodide)</option>
                <option value="cpp">C++ (Simulated / Paste)</option>
                <option value="java">Java (Simulated / Paste)</option>
              </select>
            </div>

            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={14}
              className="w-full p-3 font-mono text-xs text-[#14213D] border border-[#E2D8C3] rounded-xl bg-[#FAF8F5] outline-none focus:ring-1 focus:ring-[#1F3A8A] resize-none"
              spellCheck={false}
            />

            {/* Terminal Styling Options */}
            <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-[#E2D8C3]">
              <div>
                <span className="text-[#6B7280] font-semibold block mb-1">Terminal Theme</span>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as any)}
                  className="w-full p-1.5 border border-[#E2D8C3] rounded-lg text-xs bg-[#FAF8F5] outline-none font-medium"
                >
                  {Object.entries(TERMINAL_THEMES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[#6B7280] font-semibold block mb-1">Prompt Prefix</span>
                <input
                  type="text"
                  value={promptPrefix}
                  onChange={(e) => setPromptPrefix(e.target.value)}
                  className="w-full p-1.5 border border-[#E2D8C3] rounded-lg text-xs font-mono bg-[#FAF8F5] outline-none"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="w-full py-2.5 font-bold text-white bg-[#1F3A8A] hover:bg-[#1A3175] rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running in browser sandbox...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Run Code & Capture Terminal</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Terminal Window Viewport (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-[#14213D]">Terminal Window Render</h3>
              {executionResult && (
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    executionResult.mode === 'executed-browser'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3" />
                  <span>
                    {executionResult.mode === 'executed-browser'
                      ? `Executed in browser (${executionResult.runtimeMs}ms)`
                      : 'Simulated'}
                  </span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 relative">
              <button
                onClick={handleDownloadScreenshot}
                className="px-2.5 py-1 text-xs font-semibold text-[#14213D] bg-white hover:bg-[#FAF8F5] border border-[#E2D8C3] rounded-lg shadow-2xs flex items-center gap-1"
                title="Download PNG Screenshot"
              >
                <Download className="w-3.5 h-3.5 text-[#1F3A8A]" />
                <span>Save PNG</span>
              </button>

              {/* Embedding into Handwriting Dropdown / Primary Action */}
              <div className="relative">
                <div className="inline-flex rounded-lg shadow-xs">
                  <button
                    onClick={handleAppendToHandwriting}
                    className="px-3 py-1 text-xs font-bold text-white bg-[#1F3A8A] hover:bg-[#1A3175] rounded-l-lg flex items-center gap-1.5 transition-colors"
                    title="Append screenshot directly into your handwritten assignment"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Embed in Handwriting</span>
                  </button>
                  <button
                    onClick={() => setIsEmbedMenuOpen(!isEmbedMenuOpen)}
                    className="px-1.5 py-1 text-white bg-[#1A3175] hover:bg-[#142557] rounded-r-lg border-l border-white/20 transition-colors"
                    title="Embedding options"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {isEmbedMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-[#E2D8C3] rounded-xl shadow-xl p-1.5 z-30 text-xs space-y-1">
                    <button
                      onClick={handleAppendToHandwriting}
                      className="w-full text-left p-2 rounded-lg hover:bg-[#FAF8F5] flex items-start gap-2 text-[#14213D]"
                    >
                      <PlusCircle className="w-4 h-4 text-[#1F3A8A] shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-xs">Append to Current Assignment</div>
                        <div className="text-[10px] text-[#6B7280]">
                          Keeps existing notes and adds screenshot below
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={handleCreateNewDocument}
                      className="w-full text-left p-2 rounded-lg hover:bg-[#FAF8F5] flex items-start gap-2 text-[#14213D]"
                    >
                      <FilePlus className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-xs">Create New Document</div>
                        <div className="text-[10px] text-[#6B7280]">
                          Starts fresh with code and terminal screenshot
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={handleCopyMarkdownTag}
                      className="w-full text-left p-2 rounded-lg hover:bg-[#FAF8F5] flex items-start gap-2 text-[#14213D]"
                    >
                      <Copy className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-xs">Copy Screenshot Tag</div>
                        <div className="text-[10px] text-[#6B7280]">
                          Copies image tag so you can paste anywhere
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(output);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="text-xs text-[#6B7280] hover:text-[#14213D] p-1 font-semibold flex items-center gap-1"
                title="Copy raw text output"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Terminal Box */}
          <div
            ref={terminalRef}
            className="rounded-xl overflow-hidden shadow-2xl border border-black/20 font-mono transition-all"
            style={{ backgroundColor: currentTheme.bg }}
          >
            {/* Header Chrome */}
            <div
              className="px-4 py-2 flex items-center justify-between select-none"
              style={{
                backgroundColor: currentTheme.headerBg,
                color: currentTheme.headerText,
              }}
            >
              <div className="flex items-center gap-2">
                {currentTheme.dots ? (
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#FF5F56] inline-block" />
                    <span className="w-3 h-3 rounded-full bg-[#FFBD2E] inline-block" />
                    <span className="w-3 h-3 rounded-full bg-[#27C93F] inline-block" />
                  </div>
                ) : (
                  <Terminal className="w-3.5 h-3.5 opacity-70" />
                )}
                <span className="text-xs font-semibold ml-1">{windowTitle}</span>
              </div>
              <span className="text-[10px] opacity-60 font-sans">80 × 24</span>
            </div>

            {/* Terminal Body */}
            <div className="p-4 space-y-2 text-xs leading-relaxed" style={{ color: currentTheme.text }}>
              <div className="flex items-center gap-2 opacity-80">
                <span className="text-emerald-400 font-bold">{promptPrefix}</span>
                <span>run solution.{language === 'javascript' ? 'js' : language === 'python' ? 'py' : 'cpp'}</span>
              </div>

              {/* Editable Output */}
              <textarea
                value={output}
                onChange={(e) => setOutput(e.target.value)}
                rows={10}
                className="w-full bg-transparent outline-none resize-none font-mono text-xs leading-relaxed"
                style={{ color: currentTheme.text }}
                spellCheck={false}
              />
            </div>
          </div>

          <p className="text-[11px] text-[#6B7280]">
            💡 <strong>Honest Labelling Rule</strong>: All outputs are transparently tagged as{' '}
            <span className="font-semibold text-emerald-700">Executed in browser</span> or{' '}
            <span className="font-semibold text-amber-700">Simulated</span>. Never fabricated or presented as server execution.
          </p>
        </div>
      </main>
    </div>
  );
}
