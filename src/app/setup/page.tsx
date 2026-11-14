'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Database,
  KeyRound,
  Cpu,
  Terminal,
  CreditCard,
  FileCode,
} from 'lucide-react';
import { Capabilities } from '@/lib/capabilities';

const SAMPLE_ENV_TEMPLATE = `# YourAssignment Configuration Template
# Copy this into .env.local if you wish to connect remote production services

# 1. Supabase (Database, Auth & Storage)
# Obtain from https://supabase.com/dashboard/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 2. Free AI Providers (Groq / OpenRouter)
# Free 30 req/min from https://console.groq.com
GROQ_API_KEY=gsk_your_groq_api_key
# Free models from https://openrouter.ai/keys
OPENROUTER_API_KEY=sk-or-v1-your_openrouter_key
AI_PRIMARY_MODEL=llama-3.3-70b-versatile
AI_FALLBACK_MODELS=google/gemini-2.0-flash-exp:free,meta-llama/llama-3.3-70b-instruct:free

# 3. Code Execution (Judge0 CE)
# https://github.com/judge0/judge0 or RapidAPI
JUDGE0_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your_judge0_token

# 4. Payments (Razorpay INR / Stripe)
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
`;

export default function SetupPage() {
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/capabilities')
      .then((res) => res.json())
      .then((data) => setCapabilities(data))
      .catch((err) => console.error('Failed to load capabilities:', err));
  }, []);

  const copyEnv = () => {
    navigator.clipboard.writeText(SAMPLE_ENV_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF7EE] text-[#14213D] select-none">
      <header className="h-14 bg-white border-b border-[#E2D8C3] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-1.5 text-[#14213D] hover:bg-[#F4EEDC] rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4 text-[#1F3A8A]" />
            <span>Dashboard</span>
          </Link>
          <span className="text-[#D5C9B0]">/</span>
          <span className="text-sm font-bold text-[#14213D]">System Capabilities & Setup</span>
        </div>

        <span className="text-xs bg-[#EEF2FF] text-[#1F3A8A] font-bold px-3 py-1 rounded-full border border-[#C7D2FE]">
          Zero-Config Mode Enabled
        </span>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {/* Intro */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2D8C3] shadow-xs space-y-2">
          <h1 className="text-2xl font-serif font-bold text-[#14213D]">
            Service Health & Zero-Config Status
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
            YourAssignment is running in <strong>Zero-Config Mode</strong>. All core features
            (Handwriting generator, 300 DPI PDF export, IndexedDB project persistence, and Terminal
            Studio) work out of the box with zero external configuration or API keys.
          </p>
        </div>

        {/* Capabilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Database */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2D8C3] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#1F3A8A]" />
                <span className="font-bold text-sm">Database & Storage</span>
              </div>
              {capabilities?.database ? (
                <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Supabase Connected</span>
                </span>
              ) : (
                <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  <span>IndexedDB (Local Device)</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              {capabilities?.database
                ? 'Cloud database connected with Row Level Security.'
                : 'Zero-config fallback: Projects are safely stored in browser IndexedDB (Dexie). No database setup required.'}
            </p>
          </div>

          {/* 2. Authentication */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2D8C3] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#1F3A8A]" />
                <span className="font-bold text-sm">User Authentication</span>
              </div>
              {capabilities?.auth ? (
                <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Auth Enabled</span>
                </span>
              ) : (
                <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  <span>Guest Mode (No Login)</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              {capabilities?.auth
                ? 'Supabase Auth active with email and session management.'
                : 'Zero-config fallback: Immediate guest access with no login barriers.'}
            </p>
          </div>

          {/* 3. AI Solver */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2D8C3] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#1F3A8A]" />
                <span className="font-bold text-sm">AI Assignment Solver</span>
              </div>
              {capabilities?.ai ? (
                <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Server Keys Configured</span>
                </span>
              ) : (
                <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  <span>BYOK & Manual Mode</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              {capabilities?.ai
                ? 'Groq / OpenRouter server keys available.'
                : 'Zero-config fallback: Bring Your Own Key (BYOK) via free Groq API key or instant Manual Question Splitting.'}
            </p>
          </div>

          {/* 4. Code Execution */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2D8C3] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#1F3A8A]" />
                <span className="font-bold text-sm">Code Execution</span>
              </div>
              {capabilities?.codeExecution ? (
                <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Judge0 CE Active</span>
                </span>
              ) : (
                <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>In-Browser Web Worker</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              {capabilities?.codeExecution
                ? 'Judge0 remote execution host connected.'
                : 'Zero-config fallback: JavaScript runs in browser Web Worker sandbox; Python runs via Pyodide; output labelled "Executed in browser".'}
            </p>
          </div>
        </div>

        {/* Copy-Paste .env Template */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2D8C3] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode className="w-5 h-5 text-[#1F3A8A]" />
              <h3 className="font-bold text-base text-[#14213D]">Optional Production .env Template</h3>
            </div>
            <button
              onClick={copyEnv}
              className="px-3.5 py-1.5 text-xs font-bold text-[#1F3A8A] bg-[#EEF2FF] hover:bg-[#E0E7FF] rounded-xl border border-[#C7D2FE] transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Template'}</span>
            </button>
          </div>

          <pre className="p-4 bg-[#14213D] text-[#FBF7EE] font-mono text-xs rounded-xl overflow-x-auto leading-relaxed">
            {SAMPLE_ENV_TEMPLATE}
          </pre>
        </div>
      </main>
    </div>
  );
}
