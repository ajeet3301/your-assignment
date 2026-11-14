'use client';

import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  FileEdit,
  Cpu,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Loader2,
  Lock,
  Sparkles,
} from 'lucide-react';

interface SolverSetupCardProps {
  onKeySaved: (provider: 'groq' | 'openrouter', key: string) => void;
  onSelectManualMode: () => void;
}

export const SolverSetupCard: React.FC<SolverSetupCardProps> = ({
  onKeySaved,
  onSelectManualMode,
}) => {
  const [activeOption, setActiveOption] = useState<'byok' | 'manual' | 'webllm'>('byok');
  const [provider, setProvider] = useState<'groq' | 'openrouter'>('groq');
  const [apiKey, setApiKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    // Load existing stored user key
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('yourassignment_user_ai_key');
      const savedProvider = (localStorage.getItem('yourassignment_user_ai_provider') as any) || 'groq';
      if (savedKey) {
        setApiKey(savedKey);
        setProvider(savedProvider);
      }
    }
  }, []);

  const handleTestAndSaveKey = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: 'Please enter an API key' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // Test through stateless proxy
      const testModel = provider === 'groq' ? 'llama-3.3-70b-versatile' : 'google/gemini-2.0-flash-exp:free';
      const res = await fetch('/api/ai/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          provider,
          model: testModel,
          messages: [{ role: 'user', content: 'Say "OK"' }],
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setTestResult({ success: true, message: 'Key verified successfully!' });
        localStorage.setItem('yourassignment_user_ai_key', apiKey.trim());
        localStorage.setItem('yourassignment_user_ai_provider', provider);
        onKeySaved(provider, apiKey.trim());
      } else {
        setTestResult({ success: false, message: data.error || 'Verification failed. Check key format.' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Network error verifying key' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-2xl border border-[#E2D8C3] shadow-md overflow-hidden select-none">
      {/* Top Banner */}
      <div className="p-4 bg-[#FAF8F5] border-b border-[#E2D8C3] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#EEF2FF] text-[#1F3A8A] flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#14213D]">AI Assignment Solver (Zero-Config)</h3>
            <p className="text-[11px] text-[#6B7280]">
              No server API key required. Choose how you would like to solve questions:
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
          Free / Offline Mode
        </span>
      </div>

      {/* Option Selectors */}
      <div className="grid grid-cols-3 border-b border-[#E2D8C3] bg-[#FCFBF8] text-xs font-semibold">
        <button
          onClick={() => setActiveOption('byok')}
          className={`py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeOption === 'byok'
              ? 'border-[#1F3A8A] text-[#1F3A8A] bg-white'
              : 'border-transparent text-[#6B7280] hover:text-[#14213D]'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>A. Free Key (BYOK)</span>
        </button>

        <button
          onClick={() => setActiveOption('manual')}
          className={`py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeOption === 'manual'
              ? 'border-[#1F3A8A] text-[#1F3A8A] bg-white'
              : 'border-transparent text-[#6B7280] hover:text-[#14213D]'
          }`}
        >
          <FileEdit className="w-3.5 h-3.5" />
          <span>B. Manual Splitting</span>
        </button>

        <button
          onClick={() => setActiveOption('webllm')}
          className={`py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeOption === 'webllm'
              ? 'border-[#1F3A8A] text-[#1F3A8A] bg-white'
              : 'border-transparent text-[#6B7280] hover:text-[#14213D]'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>C. In-Browser WebLLM</span>
        </button>
      </div>

      {/* Option Content */}
      <div className="p-6">
        {/* OPTION A: BYOK */}
        {activeOption === 'byok' && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="font-bold text-sm text-[#14213D] mb-1">
                  Bring Your Own Free API Key
                </h4>
                <p className="text-xs text-[#6B7280] leading-relaxed">
                  Paste a free API key from Groq or OpenRouter. Your key is stored{' '}
                  <strong className="text-[#14213D]">only in your browser&apos;s localStorage</strong> and
                  is never saved to any database.
                </p>
              </div>

              <div className="flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-1 rounded-md shrink-0">
                <Lock className="w-3 h-3 text-emerald-600" />
                <span>Private & Zero-Logging</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-[#14213D]">Provider:</label>
                <div className="flex items-center gap-2 text-xs">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="provider"
                      value="groq"
                      checked={provider === 'groq'}
                      onChange={() => setProvider('groq')}
                      className="accent-[#1F3A8A]"
                    />
                    <span>Groq (Recommended - Fast & Free)</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="provider"
                      value="openrouter"
                      checked={provider === 'openrouter'}
                      onChange={() => setProvider('openrouter')}
                      className="accent-[#1F3A8A]"
                    />
                    <span>OpenRouter (Free Models)</span>
                  </label>
                </div>
              </div>

              <div>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    provider === 'groq'
                      ? 'gsk_... (from console.groq.com)'
                      : 'sk-or-v1-... (from openrouter.ai)'
                  }
                  className="w-full p-2.5 border border-[#E2D8C3] rounded-xl text-xs font-mono outline-none focus:ring-1 focus:ring-[#1F3A8A]"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <a
                  href={
                    provider === 'groq'
                      ? 'https://console.groq.com/keys'
                      : 'https://openrouter.ai/keys'
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#1F3A8A] hover:underline flex items-center gap-1 font-medium"
                >
                  <span>
                    Get a free {provider === 'groq' ? 'Groq' : 'OpenRouter'} key (No credit card)
                  </span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  onClick={handleTestAndSaveKey}
                  disabled={isTesting}
                  className="px-4 py-2 font-bold text-white bg-[#1F3A8A] hover:bg-[#1A3175] rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Test & Save Key</span>
                    </>
                  )}
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 font-medium ${
                    testResult.success
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border border-rose-200 text-rose-800'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* OPTION B: MANUAL SPLITTING */}
        {activeOption === 'manual' && (
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-sm text-[#14213D] mb-1">
                Manual Question Splitting Mode (100% Offline)
              </h4>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Paste any assignment or homework text. Our in-browser regex extractor splits questions
                (Q1, 1., (a), (i)), lets you edit answers, and sends them directly to the handwriting
                editor. Zero internet required.
              </p>
            </div>

            <div className="p-3 bg-[#FAF8F5] border border-[#E2D8C3] rounded-xl text-xs space-y-1">
              <span className="font-semibold text-[#14213D]">Supported Question Formats:</span>
              <p className="text-[#6B7280]">
                • <code className="bg-white px-1 py-0.5 rounded border border-[#E2D8C3]">Q1. ...</code>,{' '}
                <code className="bg-white px-1 py-0.5 rounded border border-[#E2D8C3]">Question 2: ...</code>,{' '}
                <code className="bg-white px-1 py-0.5 rounded border border-[#E2D8C3]">Problem 3: ...</code>,{' '}
                <code className="bg-white px-1 py-0.5 rounded border border-[#E2D8C3]">1. ...</code>
              </p>
            </div>

            <button
              onClick={onSelectManualMode}
              className="w-full py-2.5 font-bold text-white bg-[#1F3A8A] hover:bg-[#1A3175] rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-2"
            >
              <FileEdit className="w-4 h-4" />
              <span>Launch Manual Question Extractor</span>
            </button>
          </div>
        )}

        {/* OPTION C: IN-BROWSER WEBLLM */}
        {activeOption === 'webllm' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-[#14213D]">
                In-Browser WebLLM (Experimental)
              </h4>
              <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                Requires WebGPU
              </span>
            </div>

            <p className="text-xs text-[#6B7280] leading-relaxed">
              Runs a lightweight language model (Llama-3.2-1B-Instruct or Gemma-2B) entirely in your
              browser using WebGPU acceleration.
            </p>

            <div className="p-3 bg-[#FAF8F5] border border-[#E2D8C3] rounded-xl text-xs space-y-1.5 text-[#6B7280]">
              <div className="flex justify-between">
                <span>Model Download Size:</span>
                <span className="font-mono font-bold text-[#14213D]">~850 MB (cached locally)</span>
              </div>
              <div className="flex justify-between">
                <span>Hardware Requirement:</span>
                <span className="font-mono text-[#14213D]">Modern GPU with WebGPU enabled</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                WebLLM is currently in experimental preview. For fast, zero-download solving, we
                recommend Option A (Free Groq Key).
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
