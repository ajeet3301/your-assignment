'use client';

import React, { useRef, useState } from 'react';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  FileQuestion,
  Eraser,
  BookOpen,
  Bold,
  Image as ImageIcon,
  Check,
  X,
  Palette,
} from 'lucide-react';
import { useEditorStore } from '@/lib/store/editor-store';
import { FontDropdown } from './FontDropdown';
import { ColorPickerToolbar, ColorTargetScope, INK_COLOR_PRESETS } from './ColorPickerToolbar';
import { HandwritingFont } from '@/lib/engine/fonts';
import { InsertImageModal } from './InsertImageModal';

const SAMPLE_ASSIGNMENT = `# Computer Networks & Distributed Systems
Assignment 3 - Question 1

Explain the three-way handshake mechanism in TCP (Transmission Control Protocol) and how it achieves state synchronization between a client and a server.

## 1. Overview of TCP Connection Establishment
TCP is a connection-oriented, full-duplex protocol operating at the transport layer of the OSI model. Before any data payload can be exchanged, both hosts must agree upon initial sequence numbers (ISNs).

The three steps proceed as follows:
1. SYN (Synchronize): The client selects an initial sequence number ISN_c and transmits a segment with the SYN flag asserted.
2. SYN-ACK (Synchronize-Acknowledge): The server receives the SYN, allocates buffers, selects its own sequence number ISN_s, and replies with [SYN and ACK flags set]{#E5484D} (ACK = ISN_c + 1).
3. ACK (Acknowledge): The client acknowledges the server's sequence number by sending ACK = ISN_s + 1. The connection is now ESTABLISHED.

## 2. SYN Flood Vulnerability & Defense
Because the server pre-allocates resources upon receiving step 1, malicious actors can send spoofed SYN packets to overwhelm memory tables. The primary mitigation is SYN Cookies, where state is encoded mathematically in sequence numbers instead of memory.`;

interface InputPanelProps {
  onHoverFont?: (family: string | null) => void;
}

export const InputPanel: React.FC<InputPanelProps> = ({ onHoverFont }) => {
  const { content, setContent, settings, updateSettings } = useEditorStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scope: 'selection' | 'document' | 'headings'
  const [targetScope, setTargetScope] = useState<ColorTargetScope>('document');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);

  // Persistent selection tracking
  const [selectionRange, setSelectionRange] = useState<{
    start: number;
    end: number;
    text: string;
  }>({ start: 0, end: 0, text: '' });

  const hasSelection = selectionRange.start !== selectionRange.end && selectionRange.text.length > 0;

  const updateSelectionState = () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value.slice(start, end);

    if (start !== end && text.length > 0) {
      setSelectionRange({ start, end, text });
      setTargetScope('selection');
    } else {
      setSelectionRange({ start, end, text: '' });
      if (targetScope === 'selection') {
        setTargetScope('document');
      }
    }
  };

  const insertAtCursor = (textToInsert: string) => {
    const el = textareaRef.current;
    if (!el) {
      setContent(content + textToInsert);
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const nextContent = content.slice(0, start) + textToInsert + content.slice(end);
    setContent(nextContent);

    setTimeout(() => {
      el.focus();
      const nextPos = start + textToInsert.length;
      el.setSelectionRange(nextPos, nextPos);
      updateSelectionState();
    }, 0);
  };

  const handleInsertPrefix = (prefix: string) => {
    setContent(content + (content.endsWith('\n') || content === '' ? '' : '\n') + prefix);
  };

  const wrapSelection = (before: string, after: string) => {
    const el = textareaRef.current;
    if (!el) return;

    let start = el.selectionStart;
    let end = el.selectionEnd;
    let selectedText = content.slice(start, end);

    // If textarea lost focus, use preserved selectionRange
    if (start === end && selectionRange.start !== selectionRange.end) {
      start = selectionRange.start;
      end = selectionRange.end;
      selectedText = selectionRange.text;
    }

    if (start === end || !selectedText) {
      // No selection: insert placeholder tag
      const placeholder = 'text';
      const insertion = before + placeholder + after;
      const nextContent = content.slice(0, start) + insertion + content.slice(end);
      setContent(nextContent);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + before.length, start + before.length + placeholder.length);
        updateSelectionState();
      }, 0);
      return;
    }

    const nextContent = content.slice(0, start) + before + selectedText + after + content.slice(end);
    setContent(nextContent);

    setTimeout(() => {
      el.focus();
      const newStart = start;
      const newEnd = start + before.length + selectedText.length + after.length;
      el.setSelectionRange(newStart, newEnd);
      updateSelectionState();
    }, 0);
  };

  // Color application according to user's explicitly selected target scope
  const handleColorSelect = (hex: string, scope: ColorTargetScope) => {
    if (scope === 'selection') {
      wrapSelection('[', `]{${hex}}`);
    } else if (scope === 'headings') {
      updateSettings({ headingColor: hex });
    } else {
      updateSettings({ inkColor: hex });
    }
  };

  // Font application
  const handleFontSelect = (font: HandwritingFont) => {
    if (targetScope === 'selection' && hasSelection) {
      wrapSelection('[', `]{font=${font.family}}`);
    } else {
      updateSettings({
        fontFamily: font.family,
        fontSize: font.defaultSize,
        slant: font.defaultSlant,
      });
    }
  };

  const handleResetDefaults = () => {
    updateSettings({
      fontSize: 18,
      slant: 0,
      fontWeight: 400,
      inkVariation: 25,
      baselineWobble: 35,
      spacingIrregularity: 25,
      rotationJitter: 30,
      headingColor: undefined,
    });
  };

  // Handle Ctrl+V image clipboard paste directly into handwritten page
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            insertAtCursor(`\n\n![Pasted Screenshot](${base64})\n\n`);
            setPasteNotice('Screenshot pasted & embedded into handwritten page!');
            setTimeout(() => setPasteNotice(null), 3000);
          };
          reader.readAsDataURL(file);
          return;
        }
      }
    }
  };

  const wordsCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charsCount = content.length;

  return (
    <div className="h-full flex flex-col bg-[#FFFFFF] border-r border-[#E2D8C3] relative">
      {/* 1. Primary Typography & Color Toolbar */}
      <div className="p-2 border-b border-[#E2D8C3] bg-[#FAF8F5] flex items-center justify-between gap-2 flex-wrap text-xs select-none">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Always Visible Font Dropdown with Hover Live Preview */}
          <FontDropdown
            currentFont={settings.fontFamily}
            onSelectFont={handleFontSelect}
            onHoverFont={onHoverFont}
            onResetDefaults={handleResetDefaults}
          />

          {/* Color Palette (Target Selector: Selected vs Entire Document vs Headings) */}
          <ColorPickerToolbar
            currentColor={settings.inkColor}
            headingColor={settings.headingColor}
            targetScope={targetScope}
            onScopeChange={setTargetScope}
            onSelectColor={handleColorSelect}
            hasActiveSelection={hasSelection}
            selectedTextLength={selectionRange.text.length}
          />
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              wrapSelection('**', '**');
            }}
            className="p-1.5 hover:bg-[#EAE1CB] rounded text-[#14213D] border border-transparent hover:border-[#E2D8C3]"
            title="Bold (**text**)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          {/* Insert Screenshot or Image into Handwriting */}
          <button
            type="button"
            onClick={() => setIsImageModalOpen(true)}
            className="px-2 py-1 bg-white hover:bg-[#FAF8F5] border border-[#E2D8C3] rounded-lg text-[#1F3A8A] font-semibold text-xs flex items-center gap-1 shadow-2xs transition-colors"
            title="Insert Terminal Screenshot or Image into Handwriting"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Screenshot</span>
          </button>
        </div>
      </div>

      {/* 2. Active Selection Format Bar (Floats when text is highlighted) */}
      {hasSelection && (
        <div className="px-3 py-1.5 bg-[#EEF2FF] border-b border-[#C7D2FE] flex items-center justify-between text-xs animate-in fade-in select-none">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#1F3A8A] flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#1F3A8A] animate-pulse" />
              Selected: &ldquo;{selectionRange.text.length > 20 ? selectionRange.text.slice(0, 20) + '...' : selectionRange.text}&rdquo;
            </span>
            <span className="text-[11px] text-[#6B7280]">
              ({selectionRange.text.length} chars) — Pick color to apply:
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {INK_COLOR_PRESETS.slice(0, 4).map((p) => (
              <button
                key={p.hex}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleColorSelect(p.hex, 'selection');
                }}
                className="w-4 h-4 rounded-full border border-black/20 hover:scale-110 transition-transform"
                style={{ backgroundColor: p.hex }}
                title={`Apply ${p.name} to selected text`}
              />
            ))}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setSelectionRange({ start: 0, end: 0, text: '' });
                setTargetScope('document');
              }}
              className="p-1 text-[#6B7280] hover:text-[#14213D] rounded ml-1"
              title="Deselect"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Block Formatting Shortcuts Bar */}
      <div className="px-2 py-1.5 border-b border-[#E2D8C3] bg-white flex items-center justify-between gap-1 flex-wrap text-xs select-none">
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleInsertPrefix('# ')}
            className="p-1 hover:bg-[#FAF8F5] rounded text-[#14213D] font-bold"
            title="Heading 1"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleInsertPrefix('## ')}
            className="p-1 hover:bg-[#FAF8F5] rounded text-[#14213D] font-bold"
            title="Heading 2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleInsertPrefix('### ')}
            className="p-1 hover:bg-[#FAF8F5] rounded text-[#14213D] font-bold"
            title="Heading 3"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>
          <div className="h-3.5 w-[1px] bg-[#E2D8C3] mx-0.5" />
          <button
            onClick={() => handleInsertPrefix('- ')}
            className="p-1 hover:bg-[#FAF8F5] rounded text-[#14213D]"
            title="Bullet point"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleInsertPrefix('Q1: ')}
            className="px-1.5 py-0.5 hover:bg-[#FAF8F5] rounded text-[#1F3A8A] font-semibold flex items-center gap-1 text-[11px]"
            title="Question Prefix"
          >
            <FileQuestion className="w-3 h-3" />
            <span>Q1</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setContent(SAMPLE_ASSIGNMENT)}
            className="px-2 py-0.5 text-[11px] text-[#1F3A8A] hover:bg-[#EEF2FF] rounded font-medium flex items-center gap-1"
            title="Load Sample Assignment"
          >
            <BookOpen className="w-3 h-3" />
            <span>Sample</span>
          </button>
          <button
            onClick={() => setContent('')}
            className="p-1 text-[#6B7280] hover:text-[#E5484D] hover:bg-[#FEE2E2] rounded transition-colors"
            title="Clear all text"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Paste Notification Toast */}
      {pasteNotice && (
        <div className="absolute top-20 right-4 z-40 bg-[#1F3A8A] text-white text-xs px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{pasteNotice}</span>
        </div>
      )}

      {/* 4. Textarea with Selection Listener & Image Paste */}
      <div className="flex-1 p-3">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onSelect={updateSelectionState}
          onKeyUp={updateSelectionState}
          onMouseUp={updateSelectionState}
          onPaste={handlePaste}
          placeholder="Type or paste your assignment here...
• Highlight text and click a color to color individual words: [word]{#hex}
• Change color scope in the toolbar: Selected Text, Entire Document, or Headings Only
• Insert screenshots with the 'Screenshot' button or press Ctrl + V with any copied image
• Use # for large headings"
          className="w-full h-full p-3 font-mono text-xs md:text-sm leading-relaxed text-[#14213D] bg-transparent resize-none outline-none focus:ring-1 focus:ring-[#1F3A8A]/30 rounded-lg placeholder:text-[#9CA3AF]"
          spellCheck={false}
        />
      </div>

      {/* Footer Metrics */}
      <div className="px-3 py-2 border-t border-[#E2D8C3] bg-[#FAF8F5] flex items-center justify-between text-[11px] text-[#6B7280]">
        <span>
          {wordsCount} words · {charsCount} chars
        </span>
        <span className="text-[#1F3A8A] font-medium">
          {targetScope === 'selection'
            ? 'Styling target: Selected Text'
            : targetScope === 'headings'
            ? 'Styling target: Headings Only'
            : 'Styling target: Entire Document'}
        </span>
      </div>

      {/* Insert Screenshot / Image Modal */}
      <InsertImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onInsert={(markdown) => insertAtCursor(markdown)}
      />
    </div>
  );
};
