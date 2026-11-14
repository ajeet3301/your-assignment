'use client';

import React, { useState, useEffect } from 'react';
import {
  PenTool,
  Scroll,
  Sliders,
  Type,
  Palette,
  Check,
  Search,
  Upload,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { useEditorStore } from '@/lib/store/editor-store';
import { ALL_HANDWRITING_FONTS, HandwritingFont } from '@/lib/engine/fonts';
import { loadSavedCustomFonts } from '@/lib/engine/custom-fonts';
import { PenType, PaperStyle, PageNumberStyle } from '@/lib/engine/types';
import { FontUploadModal } from './FontUploadModal';
import { INK_COLOR_PRESETS } from './ColorPickerToolbar';

export const SettingsPanel: React.FC = () => {
  const { settings, updateSettings } = useEditorStore();
  const [activeTab, setActiveTab] = useState<'handwriting' | 'paper' | 'layout'>('handwriting');

  // Font picker state
  const [fontCategory, setFontCategory] = useState<string>('All');
  const [fontSearch, setFontSearch] = useState('');
  const [customFonts, setCustomFonts] = useState<HandwritingFont[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Load custom user fonts from IndexedDB
  useEffect(() => {
    loadSavedCustomFonts().then((fonts) => {
      if (fonts.length > 0) setCustomFonts(fonts);
    });
  }, []);

  const allAvailableFonts: HandwritingFont[] = [...customFonts, ...ALL_HANDWRITING_FONTS];

  const filteredFonts = allAvailableFonts.filter((f) => {
    const matchesCategory =
      fontCategory === 'All'
        ? true
        : fontCategory === 'My Fonts'
        ? f.id.startsWith('custom-')
        : f.category === fontCategory;

    const matchesSearch =
      f.name.toLowerCase().includes(fontSearch.toLowerCase()) ||
      f.sampleText.toLowerCase().includes(fontSearch.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const selectFont = (font: HandwritingFont) => {
    updateSettings({
      fontFamily: font.family,
      fontSize: font.defaultSize,
      slant: font.defaultSlant,
    });
  };

  const PAPER_PRESETS = [
    { name: 'Cream Notebook', color: '#FBF7EE' },
    { name: 'Pure White', color: '#FFFFFF' },
    { name: 'Legal Yellow', color: '#FEF3C7' },
  ];

  const PEN_OPTIONS: { type: PenType; label: string; desc: string }[] = [
    { type: 'ballpoint', label: 'Ballpoint', desc: 'Standard student pen with crisp ink' },
    { type: 'gel', label: 'Gel Pen', desc: 'Rich, dark, smooth continuous lines' },
    { type: 'fountain', label: 'Fountain Pen', desc: 'Varied stroke width and authentic ink bleed' },
    { type: 'pencil', label: 'Graphite Pencil', desc: 'Soft granular texture and grey undertone' },
    { type: 'marker', label: 'Felt Marker', desc: 'Bold strokes for diagrams and titles' },
  ];

  const PAPER_STYLES: { style: PaperStyle; label: string }[] = [
    { style: 'ruled-medium', label: 'Ruled Medium (8.5mm)' },
    { style: 'ruled-margin', label: 'Ruled with Red Margin' },
    { style: 'ruled-narrow', label: 'Ruled Narrow (6.5mm)' },
    { style: 'ruled-wide', label: 'Ruled Wide (10.5mm)' },
    { style: 'plain', label: 'Plain White / Cream A4' },
    { style: 'grid', label: 'Math Grid (5mm)' },
    { style: 'dotted', label: 'Bullet Dotted Grid' },
  ];

  const PAGE_NUMBER_OPTIONS: { style: PageNumberStyle; label: string }[] = [
    { style: 'none', label: 'None' },
    { style: 'bottom-right', label: 'Bottom Right (e.g. 1)' },
    { style: 'bottom-center', label: 'Bottom Center' },
    { style: 'top-right', label: 'Top Right' },
    { style: '1-of-n', label: 'Page 1 of N' },
  ];

  return (
    <div className="h-full flex flex-col bg-[#FFFFFF] border-l border-[#E2D8C3] select-none text-[#14213D]">
      {/* Tabs Header */}
      <div className="flex border-b border-[#E2D8C3] bg-[#FAF8F5]">
        <button
          onClick={() => setActiveTab('handwriting')}
          className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'handwriting'
              ? 'border-[#1F3A8A] text-[#1F3A8A] bg-white'
              : 'border-transparent text-[#6B7280] hover:text-[#14213D]'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>Handwriting ({allAvailableFonts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('paper')}
          className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'paper'
              ? 'border-[#1F3A8A] text-[#1F3A8A] bg-white'
              : 'border-transparent text-[#6B7280] hover:text-[#14213D]'
          }`}
        >
          <Scroll className="w-3.5 h-3.5" />
          <span>Paper</span>
        </button>

        <button
          onClick={() => setActiveTab('layout')}
          className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'layout'
              ? 'border-[#1F3A8A] text-[#1F3A8A] bg-white'
              : 'border-transparent text-[#6B7280] hover:text-[#14213D]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Layout</span>
        </button>
      </div>

      {/* Settings Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* TAB 1: HANDWRITING & PHYSICS */}
        {activeTab === 'handwriting' && (
          <div className="space-y-5">
            {/* Font Picker */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-[#14213D] uppercase tracking-wider flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-[#1F3A8A]" />
                  <span>Handwriting Font ({allAvailableFonts.length})</span>
                </label>

                {/* Open Upload Modal */}
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="text-[11px] font-semibold text-[#1F3A8A] bg-[#EEF2FF] hover:bg-[#E0E7FF] border border-[#C7D2FE] px-2 py-0.5 rounded cursor-pointer flex items-center gap-1 transition-colors"
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload Font</span>
                </button>
              </div>

              {/* Search Box */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="text"
                  placeholder="Search 50+ handwriting fonts..."
                  value={fontSearch}
                  onChange={(e) => setFontSearch(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 text-xs border border-[#E2D8C3] rounded-lg outline-none focus:ring-1 focus:ring-[#1F3A8A] bg-[#FAF8F5]"
                />
              </div>

              {/* Category Filters */}
              <div className="flex gap-1 overflow-x-auto pb-1 mb-2 text-[11px] scrollbar-none">
                {['All', 'Neat', 'Casual', 'Cursive', 'Messy', 'Hindi', ...(customFonts.length > 0 ? ['My Fonts'] : [])].map(
                  (cat) => (
                    <button
                      key={cat}
                      onClick={() => setFontCategory(cat)}
                      className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-colors ${
                        fontCategory === cat
                          ? 'bg-[#1F3A8A] text-white font-semibold'
                          : 'bg-[#FAF8F5] border border-[#E2D8C3] text-[#6B7280] hover:text-[#14213D]'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>

              {/* Font Cards List */}
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {filteredFonts.length === 0 ? (
                  <div className="text-center py-6 text-xs text-[#9CA3AF]">
                    No fonts match your search
                  </div>
                ) : (
                  filteredFonts.map((font) => {
                    const isSelected = settings.fontFamily.includes(font.family.replace(/'/g, '').split(',')[0]);
                    return (
                      <button
                        key={font.id}
                        onClick={() => selectFont(font)}
                        className={`w-full text-left p-2 rounded-lg border transition-all flex flex-col gap-0.5 ${
                          isSelected
                            ? 'border-[#1F3A8A] bg-[#EEF2FF] shadow-xs'
                            : 'border-[#E2D8C3] hover:border-[#1F3A8A]/50 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#14213D] flex items-center gap-1.5 font-sans">
                            {font.name}
                            <span className="text-[10px] bg-[#FAF5E6] border border-[#E2D8C3] text-[#786F5C] px-1 rounded font-normal">
                              {font.category}
                            </span>
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#1F3A8A]" />}
                        </div>
                        <span
                          className="text-base truncate text-[#1F3A8A]/90 pt-0.5 leading-snug"
                          style={{ fontFamily: font.family }}
                        >
                          {font.sampleText}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Pen Type */}
            <div>
              <label className="text-xs font-bold text-[#14213D] uppercase tracking-wider block mb-2">
                Pen & Ink Physics
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {PEN_OPTIONS.map((p) => (
                  <button
                    key={p.type}
                    onClick={() => updateSettings({ penType: p.type })}
                    className={`p-2 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${
                      settings.penType === p.type
                        ? 'border-[#1F3A8A] bg-[#EEF2FF] font-semibold text-[#1F3A8A]'
                        : 'border-[#E2D8C3] hover:border-[#1F3A8A]/40'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{p.label}</div>
                      <div className="text-[11px] text-[#6B7280] font-normal">{p.desc}</div>
                    </div>
                    {settings.penType === p.type && (
                      <Check className="w-3.5 h-3.5 text-[#1F3A8A]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Global Ink Color & Headings Color */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#14213D] uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-[#1F3A8A]" />
                  <span>Global Ink Color</span>
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {INK_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.hex}
                      onClick={() => updateSettings({ inkColor: preset.hex })}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        settings.inkColor.toLowerCase() === preset.hex.toLowerCase()
                          ? 'scale-115 border-[#1F3A8A] ring-2 ring-[#1F3A8A]/30'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: preset.hex }}
                      title={preset.name}
                    />
                  ))}
                  <input
                    type="color"
                    value={settings.inkColor}
                    onChange={(e) => updateSettings({ inkColor: e.target.value })}
                    className="w-7 h-7 rounded-full border border-[#E2D8C3] cursor-pointer bg-transparent"
                    title="Custom Ink Color"
                  />
                </div>
              </div>

              {/* Headings Accent Color */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs mb-1 font-semibold">
                  <span>Headings Accent Color:</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-4 h-4 rounded-full border border-black/20"
                      style={{ backgroundColor: settings.headingColor || settings.inkColor }}
                    />
                    <input
                      type="color"
                      value={settings.headingColor || settings.inkColor}
                      onChange={(e) => updateSettings({ headingColor: e.target.value })}
                      className="w-5 h-5 cursor-pointer border-0 bg-transparent"
                      title="Custom Heading Color"
                    />
                    {settings.headingColor && (
                      <button
                        onClick={() => updateSettings({ headingColor: undefined })}
                        className="text-[10px] text-[#6B7280] hover:text-[#14213D] underline ml-1"
                      >
                        Match ink
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* REALISM & NATURAL VARIATION SLIDERS */}
            <div className="space-y-3 pt-3 border-t border-[#E2D8C3]">
              <div className="text-xs font-bold uppercase tracking-wider text-[#14213D] flex items-center justify-between">
                <span>Natural Variation Engine</span>
                <span className="text-[10px] text-[#1F3A8A] font-semibold bg-[#EEF2FF] px-1.5 py-0.5 rounded">
                  No AI
                </span>
              </div>

              {/* Ink Shade Variation Slider */}
              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span>Ink Shade Variation (Per-Letter)</span>
                  <span className="font-mono text-[#1F3A8A]">{settings.inkVariation ?? 25}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.inkVariation ?? 25}
                  onChange={(e) => updateSettings({ inkVariation: Number(e.target.value) })}
                  className="w-full accent-[#1F3A8A]"
                />
              </div>

              {/* Baseline Wobble Slider */}
              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span>Baseline Wobble</span>
                  <span className="font-mono text-[#1F3A8A]">{settings.baselineWobble ?? 35}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.baselineWobble ?? 35}
                  onChange={(e) => updateSettings({ baselineWobble: Number(e.target.value) })}
                  className="w-full accent-[#1F3A8A]"
                />
              </div>

              {/* Spacing Irregularity Slider */}
              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span>Spacing Irregularity</span>
                  <span className="font-mono text-[#1F3A8A]">{settings.spacingIrregularity ?? 25}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.spacingIrregularity ?? 25}
                  onChange={(e) => updateSettings({ spacingIrregularity: Number(e.target.value) })}
                  className="w-full accent-[#1F3A8A]"
                />
              </div>

              {/* Rotation Jitter Slider */}
              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span>Rotation Jitter</span>
                  <span className="font-mono text-[#1F3A8A]">{settings.rotationJitter ?? 30}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.rotationJitter ?? 30}
                  onChange={(e) => updateSettings({ rotationJitter: Number(e.target.value) })}
                  className="w-full accent-[#1F3A8A]"
                />
              </div>

              {/* Size & Slant */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="flex justify-between text-[11px] mb-1 font-medium">
                    <span>Font Size</span>
                    <span className="font-mono text-[#1F3A8A]">{settings.fontSize} pt</span>
                  </div>
                  <input
                    type="range"
                    min="13"
                    max="26"
                    value={settings.fontSize}
                    onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
                    className="w-full accent-[#1F3A8A]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1 font-medium">
                    <span>Slant</span>
                    <span className="font-mono text-[#1F3A8A]">{settings.slant}°</span>
                  </div>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    value={settings.slant}
                    onChange={(e) => updateSettings({ slant: Number(e.target.value) })}
                    className="w-full accent-[#1F3A8A]"
                  />
                </div>
              </div>

              {/* Fatigue Toggle */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="text-xs font-semibold">Natural Hand Fatigue</div>
                  <div className="text-[11px] text-[#6B7280]">
                    Writing subtly drifts and relaxes down the page
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.fatigue}
                  onChange={(e) => updateSettings({ fatigue: e.target.checked })}
                  className="w-4 h-4 accent-[#1F3A8A] cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PAPER */}
        {activeTab === 'paper' && (
          <div className="space-y-5">
            {/* Paper Ruling Style */}
            <div>
              <label className="text-xs font-bold text-[#14213D] uppercase tracking-wider block mb-2">
                Paper Ruling Style
              </label>
              <div className="space-y-1.5">
                {PAPER_STYLES.map((ps) => (
                  <button
                    key={ps.style}
                    onClick={() => updateSettings({ paperStyle: ps.style })}
                    className={`w-full p-2 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${
                      settings.paperStyle === ps.style
                        ? 'border-[#1F3A8A] bg-[#EEF2FF] font-semibold text-[#1F3A8A]'
                        : 'border-[#E2D8C3] hover:border-[#1F3A8A]/40'
                    }`}
                  >
                    <span>{ps.label}</span>
                    {settings.paperStyle === ps.style && (
                      <Check className="w-3.5 h-3.5 text-[#1F3A8A]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Paper Color */}
            <div>
              <label className="text-xs font-bold text-[#14213D] uppercase tracking-wider block mb-2">
                Paper Background Tone
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PAPER_PRESETS.map((preset) => (
                  <button
                    key={preset.color}
                    onClick={() => updateSettings({ paperColor: preset.color })}
                    className={`p-2 rounded-lg border text-xs text-center font-medium transition-all flex flex-col items-center gap-1.5 ${
                      settings.paperColor === preset.color
                        ? 'border-[#1F3A8A] ring-1 ring-[#1F3A8A]'
                        : 'border-[#E2D8C3] hover:border-[#1F3A8A]/40'
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-full border border-black/10 shadow-xs"
                      style={{ backgroundColor: preset.color }}
                    />
                    <span className="text-[11px] truncate w-full">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Realism Overlays */}
            <div className="space-y-3 pt-2 border-t border-[#E2D8C3]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold">Subtle Paper Grain</div>
                  <div className="text-[11px] text-[#6B7280]">Organic fibers and texture</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.paperTexture}
                  onChange={(e) => updateSettings({ paperTexture: e.target.checked })}
                  className="w-4 h-4 accent-[#1F3A8A] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold">Phone-Scan Look</div>
                  <div className="text-[11px] text-[#6B7280]">
                    Corner lighting and camera scan vignette
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.phoneScanLook}
                  onChange={(e) => updateSettings({ phoneScanLook: e.target.checked })}
                  className="w-4 h-4 accent-[#1F3A8A] cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LAYOUT & MARGINS */}
        {activeTab === 'layout' && (
          <div className="space-y-5">
            {/* Margins */}
            <div>
              <label className="text-xs font-bold text-[#14213D] uppercase tracking-wider block mb-2">
                Page Margins (in mm)
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[#6B7280] text-[11px]">Top</span>
                  <input
                    type="number"
                    min="10"
                    max="45"
                    value={settings.margins.top}
                    onChange={(e) =>
                      updateSettings({
                        margins: { ...settings.margins, top: Number(e.target.value) },
                      })
                    }
                    className="w-full p-1.5 border border-[#E2D8C3] rounded font-mono text-center"
                  />
                </div>
                <div>
                  <span className="text-[#6B7280] text-[11px]">Bottom</span>
                  <input
                    type="number"
                    min="10"
                    max="45"
                    value={settings.margins.bottom}
                    onChange={(e) =>
                      updateSettings({
                        margins: { ...settings.margins, bottom: Number(e.target.value) },
                      })
                    }
                    className="w-full p-1.5 border border-[#E2D8C3] rounded font-mono text-center"
                  />
                </div>
                <div>
                  <span className="text-[#6B7280] text-[11px]">Left (Margin Line)</span>
                  <input
                    type="number"
                    min="15"
                    max="60"
                    value={settings.margins.left}
                    onChange={(e) =>
                      updateSettings({
                        margins: { ...settings.margins, left: Number(e.target.value) },
                      })
                    }
                    className="w-full p-1.5 border border-[#E2D8C3] rounded font-mono text-center"
                  />
                </div>
                <div>
                  <span className="text-[#6B7280] text-[11px]">Right</span>
                  <input
                    type="number"
                    min="10"
                    max="45"
                    value={settings.margins.right}
                    onChange={(e) =>
                      updateSettings({
                        margins: { ...settings.margins, right: Number(e.target.value) },
                      })
                    }
                    className="w-full p-1.5 border border-[#E2D8C3] rounded font-mono text-center"
                  />
                </div>
              </div>
            </div>

            {/* Page Numbering */}
            <div>
              <label className="text-xs font-bold text-[#14213D] uppercase tracking-wider block mb-2">
                Page Numbering
              </label>
              <div className="space-y-1.5">
                {PAGE_NUMBER_OPTIONS.map((opt) => (
                  <button
                    key={opt.style}
                    onClick={() => updateSettings({ pageNumbering: opt.style })}
                    className={`w-full p-2 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${
                      settings.pageNumbering === opt.style
                        ? 'border-[#1F3A8A] bg-[#EEF2FF] font-semibold text-[#1F3A8A]'
                        : 'border-[#E2D8C3] hover:border-[#1F3A8A]/40'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {settings.pageNumbering === opt.style && (
                      <Check className="w-3.5 h-3.5 text-[#1F3A8A]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Font Upload Modal */}
      <FontUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onFontSaved={(newFont) => {
          setCustomFonts((prev) => [newFont, ...prev]);
          selectFont(newFont);
        }}
      />
    </div>
  );
};
