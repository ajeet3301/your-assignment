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
  Table,
} from 'lucide-react';
import { useEditorStore } from '@/lib/store/editor-store';
import { FontDropdown } from './FontDropdown';
import { ColorPickerToolbar } from './ColorPickerToolbar';
import { HandwritingFont } from '@/lib/engine/fonts';

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
  const [hasSelection, setHasSelection] = useState(false);

  const checkSelection = () => {
    const el = textareaRef.current;
    if (!el) return;
    setHasSelection(el.selectionStart !== el.selectionEnd);
  };

  const handleInsertPrefix = (prefix: string) => {
    setContent(content + (content.endsWith('\n') || content === '' ? '' : '\n') + prefix);
  };

  const wrapSelection = (before: string, after: string) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;

    if (start === end) {
      // No selection: insert at cursor
      const nextContent = content.slice(0, start) + before + after + content.slice(end);
      setContent(nextContent);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + before.length, start + before.length);
      }, 0);
      return;
    }

    const selectedText = content.slice(start, end);
    const nextContent = content.slice(0, start) + before + selectedText + after + content.slice(end);
    setContent(nextContent);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, end + before.length);
      checkSelection();
    }, 0);
  };

  // Per-selection or global color update
  const handleColorSelect = (hex: string) => {
    const el = textareaRef.current;
    if (el && el.selectionStart !== el.selectionEnd) {
      wrapSelection('[', `]{${hex}}`);
    } else {
      updateSettings({ inkColor: hex });
    }
  };

  // Per-selection or global font update
  const handleFontSelect = (font: HandwritingFont) => {
    const el = textareaRef.current;
    if (el && el.selectionStart !== el.selectionEnd) {
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
    });
  };

  const wordsCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charsCount = content.length;

  return (
    <div className="h-full flex flex-col bg-[#FFFFFF] border-r border-[#E2D8C3]">
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

          {/* Color Palette (Global or Selection) */}
          <ColorPickerToolbar
            currentColor={settings.inkColor}
            onSelectColor={handleColorSelect}
            isSelectionActive={hasSelection}
          />
        </div>

        <button
          onClick={() => wrapSelection('**', '**')}
          className="p-1.5 hover:bg-[#EAE1CB] rounded text-[#14213D] border border-transparent hover:border-[#E2D8C3]"
          title="Bold (**text**)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Block Formatting Shortcuts Bar */}
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

      {/* 3. Textarea with Selection Listener */}
      <div className="flex-1 p-3">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onSelect={checkSelection}
          onKeyUp={checkSelection}
          onMouseUp={checkSelection}
          placeholder="Type or paste your assignment here...
• Use # for large headings
• Highlight text and pick a color or font to style words individually
• Empty lines create space between answers"
          className="w-full h-full p-3 font-mono text-xs md:text-sm leading-relaxed text-[#14213D] bg-transparent resize-none outline-none focus:ring-1 focus:ring-[#1F3A8A]/30 rounded-lg placeholder:text-[#9CA3AF]"
          spellCheck={false}
        />
      </div>

      {/* Footer Metrics */}
      <div className="px-3 py-2 border-t border-[#E2D8C3] bg-[#FAF8F5] flex items-center justify-between text-[11px] text-[#6B7280]">
        <span>
          {wordsCount} words · {charsCount} chars
        </span>
        <span className="text-[#1F3A8A] font-medium">Per-letter color & font enabled</span>
      </div>
    </div>
  );
};
