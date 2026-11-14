'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Type, Search, Star, ChevronDown, Check, X, RotateCcw } from 'lucide-react';
import { ALL_HANDWRITING_FONTS, HandwritingFont } from '@/lib/engine/fonts';
import { loadSavedCustomFonts } from '@/lib/engine/custom-fonts';

interface FontDropdownProps {
  currentFont: string;
  onSelectFont: (font: HandwritingFont) => void;
  onHoverFont?: (family: string | null) => void;
  onResetDefaults?: () => void;
}

export const FontDropdown: React.FC<FontDropdownProps> = ({
  currentFont,
  onSelectFont,
  onHoverFont,
  onResetDefaults,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('All');
  const [customFonts, setCustomFonts] = useState<HandwritingFont[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load custom fonts and favorites from local storage
  useEffect(() => {
    loadSavedCustomFonts().then((cf) => {
      if (cf.length > 0) setCustomFonts(cf);
    });

    try {
      const favs = localStorage.getItem('yourassignment_fav_fonts');
      if (favs) setFavorites(JSON.parse(favs));
    } catch {}
  }, []);

  const toggleFavorite = (fontId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = favorites.includes(fontId)
      ? favorites.filter((id) => id !== fontId)
      : [...favorites, fontId];

    setFavorites(updated);
    try {
      localStorage.setItem('yourassignment_fav_fonts', JSON.stringify(updated));
    } catch {}
  };

  const allFonts = [...customFonts, ...ALL_HANDWRITING_FONTS];

  const filteredFonts = allFonts.filter((f) => {
    const matchesCategory =
      category === 'All'
        ? true
        : category === 'Favorites'
        ? favorites.includes(f.id)
        : category === 'My Fonts'
        ? f.id.startsWith('custom-')
        : f.category === category;

    const matchesSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.sampleText.toLowerCase().includes(search.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const activeFontObj =
    allFonts.find((f) => currentFont.includes(f.family.replace(/'/g, '').split(',')[0])) ||
    allFonts[0];

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (isOpen) {
          setIsOpen(false);
          if (onHoverFont) onHoverFont(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onHoverFont]);

  // Keyboard navigation: arrow up/down, Enter to apply, Esc to cancel
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
      if (onHoverFont) onHoverFont(null);
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      const next = (highlightedIndex + 1) % filteredFonts.length;
      setHighlightedIndex(next);
      if (filteredFonts[next] && onHoverFont) {
        onHoverFont(filteredFonts[next].family);
      }
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      const prev = highlightedIndex <= 0 ? filteredFonts.length - 1 : highlightedIndex - 1;
      setHighlightedIndex(prev);
      if (filteredFonts[prev] && onHoverFont) {
        onHoverFont(filteredFonts[prev].family);
      }
      e.preventDefault();
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      const chosen = filteredFonts[highlightedIndex];
      if (chosen) {
        onSelectFont(chosen);
        setIsOpen(false);
        if (onHoverFont) onHoverFont(null);
      }
      e.preventDefault();
    }
  };

  const handleApply = (font: HandwritingFont) => {
    onSelectFont(font);
    setIsOpen(false);
    if (onHoverFont) onHoverFont(null);
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left" onKeyDown={handleKeyDown}>
      {/* Trigger Button (Always visible in toolbar) */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => searchInputRef.current?.focus(), 50);
          } else {
            if (onHoverFont) onHoverFont(null);
          }
        }}
        className="h-8 px-2.5 py-1 text-xs font-semibold text-[#14213D] bg-white hover:bg-[#FAF8F5] border border-[#E2D8C3] rounded-lg shadow-2xs flex items-center gap-2 transition-colors outline-none focus:ring-1 focus:ring-[#1F3A8A]"
        title="Change Handwriting Font (Click to pick, hover to preview on page)"
      >
        <Type className="w-3.5 h-3.5 text-[#1F3A8A]" />
        <span className="truncate max-w-[120px] sm:max-w-[150px] font-sans">
          {activeFontObj.name}
        </span>
        <ChevronDown className="w-3 h-3 text-[#6B7280]" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-[#E2D8C3] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col">
          {/* Search Header */}
          <div className="p-2.5 border-b border-[#E2D8C3] bg-[#FAF8F5] space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search fonts (e.g. Caveat, Kalam)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-7 py-1 text-xs border border-[#E2D8C3] rounded-lg outline-none focus:ring-1 focus:ring-[#1F3A8A] bg-white font-sans"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#14213D]"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Category / Collection Tabs */}
            <div className="flex gap-1 overflow-x-auto text-[11px] scrollbar-none pb-0.5">
              {[
                'All',
                'Favorites',
                'Neat',
                'Casual',
                'Cursive',
                'Messy',
                'Hindi',
                ...(customFonts.length > 0 ? ['My Fonts'] : []),
              ].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-colors flex items-center gap-1 ${
                    category === cat
                      ? 'bg-[#1F3A8A] text-white font-semibold'
                      : 'bg-white border border-[#E2D8C3] text-[#6B7280] hover:text-[#14213D]'
                  }`}
                >
                  {cat === 'Favorites' && <Star className="w-2.5 h-2.5 fill-current" />}
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Fonts List */}
          <div className="max-h-72 overflow-y-auto p-1.5 space-y-1">
            {filteredFonts.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#9CA3AF]">
                No handwriting fonts found
              </div>
            ) : (
              filteredFonts.map((font, idx) => {
                const isSelected = activeFontObj.id === font.id;
                const isFav = favorites.includes(font.id);
                const isHighlighted = highlightedIndex === idx;

                return (
                  <div
                    key={font.id}
                    onClick={() => handleApply(font)}
                    onMouseEnter={() => {
                      setHighlightedIndex(idx);
                      if (onHoverFont) onHoverFont(font.family);
                    }}
                    className={`w-full text-left p-2 rounded-lg border transition-all cursor-pointer flex flex-col gap-0.5 ${
                      isSelected
                        ? 'border-[#1F3A8A] bg-[#EEF2FF]'
                        : isHighlighted
                        ? 'border-[#1F3A8A]/60 bg-[#FAF8F5]'
                        : 'border-transparent hover:border-[#E2D8C3] bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#14213D] flex items-center gap-1.5 font-sans">
                        {font.name}
                        <span className="text-[10px] bg-[#FAF5E6] border border-[#E2D8C3] text-[#786F5C] px-1 rounded font-normal">
                          {font.category}
                        </span>
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => toggleFavorite(font.id, e)}
                          className={`p-1 rounded hover:bg-black/5 ${
                            isFav ? 'text-amber-500' : 'text-[#D1D5DB] hover:text-amber-500'
                          }`}
                          title="Star Favorite"
                        >
                          <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-500' : ''}`} />
                        </button>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#1F3A8A]" />}
                      </div>
                    </div>

                    <div
                      className="text-base truncate text-[#1F3A8A] pt-0.5 leading-snug"
                      style={{ fontFamily: font.family }}
                    >
                      {font.sampleText}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Guide & Reset */}
          <div className="p-2 border-t border-[#E2D8C3] bg-[#FAF8F5] flex items-center justify-between text-[11px] text-[#6B7280]">
            <span>Hover/Arrow to preview · Click to apply</span>
            {onResetDefaults && (
              <button
                onClick={() => {
                  onResetDefaults();
                  setIsOpen(false);
                }}
                className="hover:text-[#1F3A8A] font-medium flex items-center gap-1"
                title="Reset font size, slant and line height to recommended values"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Defaults</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
