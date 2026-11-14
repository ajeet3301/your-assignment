'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  Upload,
  Cpu,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Trash2,
  Plus,
  Loader2,
  Settings,
  Code2,
} from 'lucide-react';
import { TopBar } from '@/components/navigation/TopBar';
import { SolverSetupCard } from '@/components/solver/SolverSetupCard';
import { parseQuestionsFromText, ParsedQuestion } from '@/lib/solver/question-parser';
import { useEditorStore } from '@/lib/store/editor-store';

const SAMPLE_RAW_ASSIGNMENT = `PHYSICS 201 - PROBLEM SET 4

Q1. State Newton's Second Law of Motion in vector form and derive the impulse-momentum theorem from it. [5 marks]

Q2. A 1500 kg automobile travelling at 25 m/s collides with a concrete barrier and comes to rest in 0.12 seconds. Calculate:
(a) The average deceleration of the vehicle.
(b) The average stopping force exerted on the vehicle. [10 marks]

Q3. Write an algorithm or Python function to calculate the kinetic energy KE = 0.5 * m * v^2 given mass and velocity, and test it for m=1200 kg and v=20 m/s. [5 marks]`;

export default function SolverPage() {
  const router = useRouter();
  const { setContent, setTitle } = useEditorStore();

  const [hasKey, setHasKey] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [rawText, setRawText] = useState(SAMPLE_RAW_ASSIGNMENT);
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('yourassignment_user_ai_key');
      if (savedKey) setHasKey(true);
    }
  }, []);

  const handleExtract = () => {
    setIsExtracting(true);
    setTimeout(() => {
      const parsed = parseQuestionsFromText(rawText);
      setQuestions(parsed);
      setIsExtracting(false);
    }, 150);
  };

  const handleAnswerChange = (id: string, answer: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, answer } : q))
    );
  };

  const handleGenerateAnswer = async (q: ParsedQuestion) => {
    const key = typeof window !== 'undefined' ? localStorage.getItem('yourassignment_user_ai_key') : null;
    const provider = (typeof window !== 'undefined' ? localStorage.getItem('yourassignment_user_ai_provider') : null) || 'groq';

    if (!key) {
      alert('Please configure your free API key in the setup card above.');
      return;
    }

    setGeneratingId(q.id);

    try {
      const model = provider === 'groq' ? 'llama-3.3-70b-versatile' : 'google/gemini-2.0-flash-exp:free';
      const prompt = `Solve this assignment question with clear, step-by-step academic explanations, relevant formulas in LaTeX or plain text, and accurate calculations:\n\nQuestion ${q.numberLabel}: ${q.text}`;

      const res = await fetch('/api/ai/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          provider,
          model,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert academic tutor. Provide thorough, well-structured assignment solutions with step-by-step working and final answers clearly highlighted.',
            },
            { role: 'user', content: prompt },
          ],
        }),
      });

      const data = await res.json();
      if (res.ok && data.choices?.[0]?.message?.content) {
        handleAnswerChange(q.id, data.choices[0].message.content);
      } else {
        alert(data.error || 'Failed to generate answer. Check provider status.');
      }
    } catch (err: any) {
      alert(err.message || 'Error generating answer');
    } finally {
      setGeneratingId(null);
    }
  };

  const handleSendToEditor = () => {
    // Convert questions into formatted markdown for the handwriting engine
    const documentMarkdown = questions
      .map((q) => {
        const title = `# ${q.numberLabel}: ${q.text.slice(0, 70)}${q.text.length > 70 ? '...' : ''}`;
        const questionBody = `**Question:**\n${q.text}`;
        const answerBody = q.answer ? `\n\n**Solution:**\n${q.answer}` : '\n\n**Solution:**\n[Write answer here]';
        return `${title}\n\n${questionBody}${answerBody}`;
      })
      .join('\n\n---\n\n');

    setTitle('AI Solved Assignment');
    setContent(documentMarkdown || rawText);
    router.push('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF7EE] text-[#14213D] select-none">
      <TopBar />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Setup Card if neither key nor manual mode is active */}
        {!hasKey && !isManualMode && (
          <div className="mb-6">
            <SolverSetupCard
              onKeySaved={() => setHasKey(true)}
              onSelectManualMode={() => setIsManualMode(true)}
            />
          </div>
        )}

        {/* Solver Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Raw Text & Extractor (5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E2D8C3] p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-[#14213D] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#1F3A8A]" />
                  <span>Assignment Prompt Text</span>
                </label>
                <button
                  onClick={() => setRawText(SAMPLE_RAW_ASSIGNMENT)}
                  className="text-[11px] text-[#1F3A8A] font-semibold hover:underline"
                >
                  Load Sample
                </button>
              </div>

              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={16}
                placeholder="Paste your assignment, question sheet, or homework text here..."
                className="w-full p-3 font-mono text-xs text-[#14213D] border border-[#E2D8C3] rounded-xl bg-[#FAF8F5] outline-none focus:ring-1 focus:ring-[#1F3A8A] resize-none"
              />
            </div>

            <button
              onClick={handleExtract}
              disabled={isExtracting}
              className="w-full py-2.5 font-bold text-white bg-[#1F3A8A] hover:bg-[#1A3175] rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-2"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extracting Questions...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Extract Questions ({questions.length || 'Auto'})</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Ordered Questions & Answers Review (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-[#14213D]">Structured Questions</h3>
                <span className="text-xs bg-[#EEF2FF] text-[#1F3A8A] font-bold px-2 py-0.5 rounded-full">
                  {questions.length} detected
                </span>
              </div>

              {questions.length > 0 && (
                <button
                  onClick={handleSendToEditor}
                  className="px-4 py-2 font-bold text-white bg-[#1F3A8A] hover:bg-[#1A3175] rounded-xl text-xs shadow-xs transition-all flex items-center gap-1.5"
                >
                  <span>Send to Handwriting Editor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {questions.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-[#E2D8C3] border-dashed text-[#6B7280] space-y-3">
                <Sparkles className="w-8 h-8 text-[#1F3A8A]/40 mx-auto" />
                <h4 className="font-bold text-sm text-[#14213D]">No questions extracted yet</h4>
                <p className="text-xs max-w-sm mx-auto">
                  Click &apos;Extract Questions&apos; on the left to automatically split your problem set into
                  ordered questions.
                </p>
                <button
                  onClick={handleExtract}
                  className="px-4 py-1.5 font-bold text-xs text-[#1F3A8A] bg-[#EEF2FF] rounded-lg"
                >
                  Extract Sample Questions
                </button>
              </div>
            ) : (
              <div className="space-y-4 max-h-[700px] overflow-y-auto pr-1">
                {questions.map((q) => (
                  <div
                    key={q.id}
                    className="p-4 bg-white rounded-2xl border border-[#E2D8C3] shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs bg-[#1F3A8A] text-white px-2 py-0.5 rounded-md">
                          {q.numberLabel}
                        </span>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                          {q.type}
                        </span>
                        {q.marks && (
                          <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                            {q.marks} Marks
                          </span>
                        )}
                      </div>

                      {hasKey && (
                        <button
                          onClick={() => handleGenerateAnswer(q)}
                          disabled={generatingId === q.id}
                          className="px-2.5 py-1 text-[11px] font-bold text-[#1F3A8A] bg-[#EEF2FF] hover:bg-[#E0E7FF] border border-[#C7D2FE] rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          {generatingId === q.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Solving...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3" />
                              <span>Solve with AI</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <p className="text-xs font-medium text-[#14213D] leading-relaxed">
                      {q.text}
                    </p>

                    <div>
                      <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">
                        Editable Solution:
                      </label>
                      <textarea
                        value={q.answer || ''}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        placeholder="Type answer or click 'Solve with AI'..."
                        rows={3}
                        className="w-full p-2.5 text-xs text-[#14213D] border border-[#E2D8C3] rounded-xl bg-[#FAF8F5] outline-none focus:ring-1 focus:ring-[#1F3A8A] resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
