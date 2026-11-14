'use client';

import React, { useState } from 'react';
import { X, FileDown, CheckCircle, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { useEditorStore } from '@/lib/store/editor-store';
import { calculateDocumentLayout } from '@/lib/engine/layout-engine';
import { generateHandwrittenPdf, downloadPdfBlob } from '@/lib/export/pdf-export';
import { A4_WIDTH_300DPI, A4_HEIGHT_300DPI } from '@/lib/engine/types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { content, settings, title } = useEditorStore();
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isSuccess, setIsSuccess] = useState(false);
  const [docName, setDocName] = useState(title || 'Handwritten-Assignment');
  const [includeWatermark, setIncludeWatermark] = useState(true);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setIsSuccess(false);

    try {
      // 1. Calculate 300 DPI high-res layout
      const pages = calculateDocumentLayout(content, {
        canvasWidth: A4_WIDTH_300DPI,
        canvasHeight: A4_HEIGHT_300DPI,
        settings,
      });

      setProgress({ current: 0, total: pages.length });

      // 2. Generate PDF bytes
      const pdfBytes = await generateHandwrittenPdf({
        pages,
        settings,
        documentTitle: docName,
        hasWatermark: includeWatermark,
        onProgress: (current, total) => setProgress({ current, total }),
      });

      // 3. Trigger download
      downloadPdfBlob(pdfBytes, `${docName}.pdf`);
      setIsSuccess(true);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E2D8C3] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-[#E2D8C3] bg-[#FAF8F5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileDown className="w-5 h-5 text-[#1F3A8A]" />
            <h3 className="font-bold text-[#14213D] text-base">Export Handwritten Document</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-1 text-[#6B7280] hover:text-[#14213D] rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#14213D] block mb-1">
              File Name
            </label>
            <input
              type="text"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              className="w-full p-2 border border-[#E2D8C3] rounded-lg text-sm font-medium focus:ring-1 focus:ring-[#1F3A8A] outline-none"
              placeholder="e.g. Physics Assignment 1"
            />
          </div>

          <div className="p-3 bg-[#EEF2FF] border border-[#C7D2FE] rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#1F3A8A]" />
              <div className="text-xs">
                <span className="font-semibold text-[#1F3A8A]">A4 300 DPI Print Quality</span>
                <p className="text-[#4B5563] text-[11px]">Exact 2480 × 3508 px canvas rendering</p>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-[#1F3A8A] text-white px-2 py-0.5 rounded-full">
              PDF-LIB
            </span>
          </div>

          {/* Watermark toggle */}
          <div className="flex items-center justify-between p-3 border border-[#E2D8C3] rounded-xl bg-[#FAF8F5]">
            <div>
              <div className="text-xs font-semibold text-[#14213D]">Footer Watermark</div>
              <div className="text-[11px] text-[#6B7280]">
                Small footer text (Free tier preview)
              </div>
            </div>
            <input
              type="checkbox"
              checked={includeWatermark}
              onChange={(e) => setIncludeWatermark(e.target.checked)}
              className="w-4 h-4 accent-[#1F3A8A] cursor-pointer"
            />
          </div>

          {/* Export Progress */}
          {isExporting && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs font-medium text-[#1F3A8A]">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Rendering 300 DPI pages...
                </span>
                <span>
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="w-full h-2 bg-[#E2D8C3] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1F3A8A] transition-all duration-200"
                  style={{
                    width: `${progress.total ? (progress.current / progress.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}

          {isSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>PDF downloaded successfully! Ready to print or submit.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E2D8C3] bg-[#FAF8F5] flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-xs font-semibold text-[#6B7280] hover:text-[#14213D] rounded-lg"
          >
            Close
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-5 py-2 text-xs font-bold text-white bg-[#1F3A8A] hover:bg-[#1A3175] rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate & Download</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
