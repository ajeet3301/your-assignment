'use client';

import React, { useState } from 'react';
import { Palette, Check } from 'lucide-react';

export const INK_COLOR_PRESETS = [
  { name: 'Ink Blue', hex: '#1B3FA0' },
  { name: 'Deep Black', hex: '#111827' },
  { name: 'Margin Red', hex: '#E5484D' },
  { name: 'Forest Green', hex: '#15803D' },
  { name: 'Royal Purple', hex: '#6B21A8' },
  { name: 'Pencil Grey', hex: '#4B5563' },
];

interface ColorPickerToolbarProps {
  currentColor: string;
  onSelectColor: (hex: string) => void;
  isSelectionActive?: boolean;
}

export const ColorPickerToolbar: React.FC<ColorPickerToolbarProps> = ({
  currentColor,
  onSelectColor,
  isSelectionActive = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-flex items-center gap-1.5">
      {/* Preset Swatches Bar */}
      <div className="flex items-center gap-1 bg-white border border-[#E2D8C3] rounded-lg p-1 shadow-2xs">
        {INK_COLOR_PRESETS.map((preset) => {
          const isSelected = currentColor.toLowerCase() === preset.hex.toLowerCase();
          return (
            <button
              key={preset.hex}
              onClick={() => onSelectColor(preset.hex)}
              className={`w-5 h-5 rounded-full border transition-transform relative flex items-center justify-center ${
                isSelected
                  ? 'scale-110 border-white ring-2 ring-[#1F3A8A]'
                  : 'border-black/10 hover:scale-105'
              }`}
              style={{ backgroundColor: preset.hex }}
              title={
                isSelectionActive
                  ? `Apply ${preset.name} to selected text`
                  : `Set global ink: ${preset.name}`
              }
            >
              {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
            </button>
          );
        })}

        {/* Custom Color Input */}
        <div className="relative w-5 h-5 rounded-full overflow-hidden border border-black/15 cursor-pointer ml-0.5">
          <input
            type="color"
            value={currentColor}
            onChange={(e) => onSelectColor(e.target.value)}
            className="absolute -inset-2 w-9 h-9 cursor-pointer border-0 bg-transparent"
            title="Pick custom hex color"
          />
        </div>
      </div>

      {isSelectionActive && (
        <span className="text-[10px] font-semibold text-[#1F3A8A] bg-[#EEF2FF] border border-[#C7D2FE] px-1.5 py-0.5 rounded">
          Selection
        </span>
      )}
    </div>
  );
};
