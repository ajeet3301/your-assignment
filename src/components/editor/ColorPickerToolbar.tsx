'use client';

import React, { useState } from 'react';
import { Check, ChevronDown, Sparkles } from 'lucide-react';

export const INK_COLOR_PRESETS = [
  { name: 'Ink Blue', hex: '#1B3FA0' },
  { name: 'Deep Black', hex: '#111827' },
  { name: 'Margin Red', hex: '#E5484D' },
  { name: 'Forest Green', hex: '#15803D' },
  { name: 'Royal Purple', hex: '#6B21A8' },
  { name: 'Pencil Grey', hex: '#4B5563' },
];

export type ColorTargetScope = 'selection' | 'document' | 'headings';

interface ColorPickerToolbarProps {
  currentColor: string;
  headingColor?: string;
  targetScope: ColorTargetScope;
  onScopeChange: (scope: ColorTargetScope) => void;
  onSelectColor: (hex: string, scope: ColorTargetScope) => void;
  hasActiveSelection?: boolean;
  selectedTextLength?: number;
}

export const ColorPickerToolbar: React.FC<ColorPickerToolbarProps> = ({
  currentColor,
  headingColor,
  targetScope,
  onScopeChange,
  onSelectColor,
  hasActiveSelection = false,
  selectedTextLength = 0,
}) => {
  const [isScopeMenuOpen, setIsScopeMenuOpen] = useState(false);

  // Active color based on current scope
  const activeColor =
    targetScope === 'headings'
      ? headingColor || currentColor
      : currentColor;

  const getScopeLabel = (scope: ColorTargetScope) => {
    switch (scope) {
      case 'selection':
        return hasActiveSelection
          ? `Selected (${selectedTextLength} chars)`
          : 'Selected Text';
      case 'headings':
        return 'Headings Only';
      case 'document':
      default:
        return 'Entire Page';
    }
  };

  return (
    <div className="relative inline-flex items-center gap-1.5 flex-wrap">
      {/* 1. Scope Selector Pill (Target: Selected vs Entire Document vs Headings) */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsScopeMenuOpen(!isScopeMenuOpen);
          }}
          className={`h-7 px-2 text-[11px] font-semibold rounded-lg border flex items-center gap-1 transition-colors ${
            hasActiveSelection && targetScope === 'selection'
              ? 'bg-[#EEF2FF] border-[#818CF8] text-[#1F3A8A] ring-1 ring-[#818CF8]'
              : 'bg-white border-[#E2D8C3] text-[#14213D] hover:bg-[#FAF8F5]'
          }`}
          title="Choose whether color applies to selected text, entire document, or headings"
        >
          <span className="text-[#6B7280] font-normal">Color:</span>
          <span>{getScopeLabel(targetScope)}</span>
          <ChevronDown className="w-3 h-3 text-[#6B7280]" />
        </button>

        {isScopeMenuOpen && (
          <div className="absolute top-full left-0 mt-1 z-30 w-48 bg-white border border-[#E2D8C3] rounded-xl shadow-lg p-1.5 space-y-1 text-xs">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onScopeChange('selection');
                setIsScopeMenuOpen(false);
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                targetScope === 'selection'
                  ? 'bg-[#EEF2FF] text-[#1F3A8A] font-bold'
                  : 'hover:bg-[#FAF8F5] text-[#14213D]'
              }`}
            >
              <div>
                <div className="font-semibold">Selected Text</div>
                <div className="text-[10px] text-[#6B7280] font-normal">
                  Applies only to highlighted text
                </div>
              </div>
              {targetScope === 'selection' && <Check className="w-3.5 h-3.5 text-[#1F3A8A]" />}
            </button>

            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onScopeChange('document');
                setIsScopeMenuOpen(false);
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                targetScope === 'document'
                  ? 'bg-[#EEF2FF] text-[#1F3A8A] font-bold'
                  : 'hover:bg-[#FAF8F5] text-[#14213D]'
              }`}
            >
              <div>
                <div className="font-semibold">Entire Document</div>
                <div className="text-[10px] text-[#6B7280] font-normal">
                  Changes main ink color for all text
                </div>
              </div>
              {targetScope === 'document' && <Check className="w-3.5 h-3.5 text-[#1F3A8A]" />}
            </button>

            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onScopeChange('headings');
                setIsScopeMenuOpen(false);
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                targetScope === 'headings'
                  ? 'bg-[#EEF2FF] text-[#1F3A8A] font-bold'
                  : 'hover:bg-[#FAF8F5] text-[#14213D]'
              }`}
            >
              <div>
                <div className="font-semibold">Headings Only (#)</div>
                <div className="text-[10px] text-[#6B7280] font-normal">
                  Changes color of titles and section headers
                </div>
              </div>
              {targetScope === 'headings' && <Check className="w-3.5 h-3.5 text-[#1F3A8A]" />}
            </button>
          </div>
        )}
      </div>

      {/* 2. Preset Swatches Bar */}
      <div className="flex items-center gap-1 bg-white border border-[#E2D8C3] rounded-lg p-1 shadow-2xs h-7">
        {INK_COLOR_PRESETS.map((preset) => {
          const isSelected = activeColor.toLowerCase() === preset.hex.toLowerCase();
          return (
            <button
              key={preset.hex}
              type="button"
              onMouseDown={(e) => {
                // Prevent textarea blur!
                e.preventDefault();
                onSelectColor(preset.hex, targetScope);
              }}
              className={`w-5 h-5 rounded-full border transition-transform relative flex items-center justify-center ${
                isSelected
                  ? 'scale-110 border-white ring-2 ring-[#1F3A8A]'
                  : 'border-black/10 hover:scale-105'
              }`}
              style={{ backgroundColor: preset.hex }}
              title={`Apply ${preset.name} (${preset.hex}) to ${getScopeLabel(targetScope)}`}
            >
              {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
            </button>
          );
        })}

        {/* Custom Hex Color Input */}
        <div
          className="relative w-5 h-5 rounded-full overflow-hidden border border-black/15 cursor-pointer ml-0.5"
          title="Pick custom hex color"
        >
          <input
            type="color"
            value={activeColor}
            onChange={(e) => onSelectColor(e.target.value, targetScope)}
            className="absolute -inset-2 w-9 h-9 cursor-pointer border-0 bg-transparent"
          />
        </div>
      </div>
    </div>
  );
};
