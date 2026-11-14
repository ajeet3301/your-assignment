'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  FileText,
  Sliders,
  Type,
  Loader2,
  FolderPlus,
} from 'lucide-react';
import { validateFontFile, FontValidationResult } from '@/lib/engine/font-validator';
import { registerFontFace } from '@/lib/engine/custom-fonts';
import { HandwritingFont } from '@/lib/engine/fonts';
import Dexie, { Table } from 'dexie';

interface FontUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFontSaved: (font: HandwritingFont) => void;
}

export const FontUploadModal: React.FC<FontUploadModalProps> = ({
  isOpen,
  onClose,
  onFontSaved,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validation, setValidation] = useState<FontValidationResult | null>(null);

  // Form states
  const [fontName, setFontName] = useState('');
  const [collection, setCollection] = useState('My Fonts');
  const [customCollection, setCustomCollection] = useState('');
  const [defaultSize, setDefaultSize] = useState(18);
  const [defaultSlant, setDefaultSlant] = useState(0);
  const [userPreviewText, setUserPreviewText] = useState('My custom assignment notes look great!');
  const [licenseAgreed, setLicenseAgreed] = useState(false);
  const [licenseName, setLicenseName] = useState('SIL Open Font License 1.1');
  const [licenseUrl, setLicenseUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileProcess = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsValidating(true);
    setValidation(null);

    const result = await validateFontFile(selectedFile);
    setValidation(result);
    setIsValidating(false);

    if (result.valid && result.familyName) {
      setFontName(result.familyName);

      // Register font face for live preview in modal
      const tempFamily = `TempPreview_${Date.now()}`;
      if (result.cleanBuffer) {
        await registerFontFace(tempFamily, result.cleanBuffer, result.format || 'truetype');
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileProcess(droppedFile);
  };

  const handleSave = async () => {
    if (!validation || !validation.valid || !file || !licenseAgreed) return;

    setIsSaving(true);
    try {
      const cleanFamilyName = fontName.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
      const finalFamily = `'Custom_${cleanFamilyName}', cursive`;
      const fontId = `custom-${Date.now()}`;

      // Convert buffer to base64
      const buffer = validation.cleanBuffer || (await file.arrayBuffer());
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      // Save in Dexie IndexedDB
      const db = new Dexie('YourAssignmentCustomFontsDB') as any;
      db.version(1).stores({ customFonts: 'id, name, family, createdAt' });

      const finalCollection = customCollection.trim() || collection;

      await db.customFonts.put({
        id: fontId,
        name: fontName,
        family: finalFamily,
        dataBase64: base64,
        format: validation.format || 'truetype',
        collection: finalCollection,
        license: licenseName || 'Personal License',
        licenseUrl: licenseUrl || '',
        fsType: validation.fsType || 0,
        canEmbedInPdf: validation.canEmbedInPdf,
        defaultSettings: { size: defaultSize, slant: defaultSlant },
        createdAt: new Date().toISOString(),
      });

      // Register permanently in browser
      await registerFontFace(
        finalFamily.replace(/'/g, '').split(',')[0].trim(),
        buffer,
        validation.format || 'truetype'
      );

      const fontObj: HandwritingFont = {
        id: fontId,
        name: fontName,
        family: finalFamily,
        category: (finalCollection as any) || 'Casual',
        defaultSize,
        defaultSlant,
        author: 'User Upload',
        license: licenseName || 'Personal Font',
        sampleText: userPreviewText || 'My custom personal handwriting font',
      };

      onFontSaved(fontObj);
      onClose();
    } catch (err: any) {
      alert(`Failed to save font: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#E2D8C3] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#E2D8C3] bg-[#FAF8F5] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#1F3A8A]" />
            <h3 className="font-bold text-sm text-[#14213D]">Upload Personal Handwriting Font</h3>
          </div>
          <button onClick={onClose} className="p-1 text-[#6B7280] hover:text-[#14213D] rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-[#14213D]">
          {/* Dropzone */}
          {!validation?.valid && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#C7D2FE] hover:border-[#1F3A8A] bg-[#EEF2FF]/40 rounded-2xl p-8 text-center cursor-pointer transition-colors space-y-2"
            >
              <Upload className="w-8 h-8 text-[#1F3A8A] mx-auto opacity-70" />
              <div className="font-bold text-sm text-[#14213D]">
                Drag & Drop font file here, or click to browse
              </div>
              <p className="text-[11px] text-[#6B7280]">
                Supports <strong>.TTF, .OTF, .WOFF, .WOFF2</strong> · Max file size 5 MB
              </p>
              <p className="text-[10px] text-[#9CA3AF]">
                Validated via magic bytes & opentype.js · Stored private in your browser only
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".ttf,.otf,.woff,.woff2"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileProcess(f);
                }}
                className="hidden"
              />
            </div>
          )}

          {isValidating && (
            <div className="p-6 text-center text-[#1F3A8A] flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="font-semibold">Validating font tables, magic bytes & glyphs...</span>
            </div>
          )}

          {validation && !validation.valid && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block">Font Validation Error</strong>
                <span>{validation.error}</span>
              </div>
            </div>
          )}

          {/* Validated Font Configuration & Preview */}
          {validation?.valid && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="font-bold">{validation.familyName}</span>
                    <span className="text-[11px] text-emerald-700 ml-2">
                      ({validation.format?.toUpperCase()} · {validation.glyphCoveragePercent}% glyph coverage)
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setValidation(null);
                    setFile(null);
                  }}
                  className="text-[11px] text-[#6B7280] hover:text-rose-600 underline"
                >
                  Change File
                </button>
              </div>

              {/* fsType restricted warning */}
              {validation.embeddingWarning && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Restricted Embedding (OS/2 fsType=2)</span>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      {validation.embeddingWarning}
                    </p>
                  </div>
                </div>
              )}

              {/* Missing glyphs warning */}
              {validation.missingGlyphs.length > 0 && (
                <div className="p-2.5 bg-[#FAF8F5] border border-[#E2D8C3] rounded-xl text-[11px] text-[#786F5C]">
                  <strong>Note: Missing characters:</strong>{' '}
                  <span className="font-mono">{validation.missingGlyphs.join(' ')}</span>
                </div>
              )}

              {/* Live Preview Strip */}
              <div className="p-4 bg-[#FBF7EE] border border-[#E2D8C3] rounded-xl space-y-2">
                <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                  Live Font Preview
                </div>
                <div
                  className="text-2xl text-[#1F3A8A] leading-relaxed transition-all"
                  style={{
                    fontSize: `${defaultSize * 1.2}px`,
                    transform: `skewX(${defaultSlant}deg)`,
                  }}
                >
                  {userPreviewText || 'The quick brown fox jumps over the lazy dog'}
                </div>
                <div className="text-xs text-[#6B7280] font-mono pt-1">
                  A B C D E F G H I J K L M N O P Q R S T U V W X Y Z · 0 1 2 3 4 5 6 7 8 9
                </div>
              </div>

              {/* Editable Test Text */}
              <div>
                <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">
                  Test your own sample text:
                </label>
                <input
                  type="text"
                  value={userPreviewText}
                  onChange={(e) => setUserPreviewText(e.target.value)}
                  className="w-full p-2 border border-[#E2D8C3] rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#1F3A8A]"
                />
              </div>

              {/* Font Name & Collection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">
                    Font Display Name
                  </label>
                  <input
                    type="text"
                    value={fontName}
                    onChange={(e) => setFontName(e.target.value)}
                    className="w-full p-2 border border-[#E2D8C3] rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#1F3A8A]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">
                    Collection Group
                  </label>
                  <select
                    value={collection}
                    onChange={(e) => setCollection(e.target.value)}
                    className="w-full p-2 border border-[#E2D8C3] rounded-lg text-xs outline-none bg-white"
                  >
                    <option value="My Fonts">My Fonts (Default)</option>
                    <option value="Neat">Neat</option>
                    <option value="Casual">Casual</option>
                    <option value="Cursive">Cursive</option>
                    <option value="Messy">Messy</option>
                    <option value="Hindi">Hindi</option>
                  </select>
                </div>
              </div>

              {/* Default Size and Slant Sliders */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-[#FAF8F5] border border-[#E2D8C3] rounded-xl">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span>Recommended Size</span>
                    <span className="font-mono font-bold text-[#1F3A8A]">{defaultSize} pt</span>
                  </div>
                  <input
                    type="range"
                    min="14"
                    max="26"
                    value={defaultSize}
                    onChange={(e) => setDefaultSize(Number(e.target.value))}
                    className="w-full accent-[#1F3A8A]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span>Natural Slant</span>
                    <span className="font-mono font-bold text-[#1F3A8A]">{defaultSlant}°</span>
                  </div>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    value={defaultSlant}
                    onChange={(e) => setDefaultSlant(Number(e.target.value))}
                    className="w-full accent-[#1F3A8A]"
                  />
                </div>
              </div>

              {/* Mandatory License Confirmation */}
              <div className="p-3 border border-[#E2D8C3] rounded-xl bg-white space-y-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={licenseAgreed}
                    onChange={(e) => setLicenseAgreed(e.target.checked)}
                    className="w-4 h-4 accent-[#1F3A8A] mt-0.5 cursor-pointer shrink-0"
                  />
                  <span className="text-xs font-semibold text-[#14213D]">
                    I confirm that I have the right or permission to use this font file for personal document rendering.
                  </span>
                </label>

                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div>
                    <span className="text-[#6B7280]">License Name (Optional):</span>
                    <input
                      type="text"
                      placeholder="e.g. SIL OFL / Personal"
                      value={licenseName}
                      onChange={(e) => setLicenseName(e.target.value)}
                      className="w-full p-1.5 border border-[#E2D8C3] rounded text-xs outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[#6B7280]">License URL (Optional):</span>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={licenseUrl}
                      onChange={(e) => setLicenseUrl(e.target.value)}
                      className="w-full p-1.5 border border-[#E2D8C3] rounded text-xs outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#E2D8C3] bg-[#FAF8F5] flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#6B7280] hover:text-[#14213D] rounded-lg"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={!validation?.valid || !licenseAgreed || isSaving}
            className="px-5 py-2 font-bold text-xs text-white bg-[#1F3A8A] hover:bg-[#1A3175] rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-40"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving to IndexedDB...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Save to My Fonts</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
