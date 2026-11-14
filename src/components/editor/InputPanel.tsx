'use client';

import React from 'react';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  FileQuestion,
  Eraser,
  BookOpen,
} from 'lucide-react';
import { useEditorStore } from '@/lib/store/editor-store';

const SAMPLE_ASSIGNMENT = `# Computer Networks & Distributed Systems
Assignment 3 - Question 1

Explain the three-way handshake mechanism in TCP (Transmission Control Protocol) and how it achieves state synchronization between a client and a server.

## 1. Overview of TCP Connection Establishment
TCP is a connection-oriented, full-duplex protocol operating at the transport layer of the OSI model. Before any data payload can be exchanged, both hosts must agree upon initial sequence numbers (ISNs).

The three steps proceed as follows:
1. SYN (Synchronize): The client selects an initial sequence number ISN_c and transmits a segment with the SYN flag asserted.
2. SYN-ACK (Synchronize-Acknowledge): The server receives the SYN, allocates buffers, selects its own sequence number ISN_s, and replies with SYN and ACK flags set (ACK = ISN_c + 1).
3. ACK (Acknowledge): The client acknowledges the server's sequence number by sending ACK = ISN_s + 1. The connection is now ESTABLISHED.

## 2. SYN Flood Vulnerability & Defense
Because the server pre-allocates resources upon receiving step 1, malicious actors can send spoofed SYN packets to overwhelm memory tables. The primary mitigation is SYN Cookies, where state is encoded mathematically in sequence numbers instead of memory.`;

export const InputPanel: React.FC = () => {
  const { content, setContent } = useEditorStore();

  const handleInsertPrefix = (prefix: string) => {
    setContent(content + (content.endsWith('\n') || content === '' ? '' : '\n') + prefix);
  };

  const wordsCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charsCount = content.length;

  return (
    <div className="h-full flex flex-col bg-[#FFFFFF] border-r border-[#E2D8C3]">
      {/* Quick Block Toolbar */}
      <div className="p-2 border-b border-[#E2D8C3] bg-[#FAF8F5] flex items-center justify-between gap-1 flex-wrap text-xs select-none">
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleInsertPrefix('# ')}
            className="p-1.5 hover:bg-[#EAE1CB] rounded text-[#14213D] font-bold"
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleInsertPrefix('## ')}
            className="p-1.5 hover:bg-[#EAE1CB] rounded text-[#14213D] font-bold"
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleInsertPrefix('### ')}
            className="p-1.5 hover:bg-[#EAE1CB] rounded text-[#14213D] font-bold"
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </button>
          <div className="h-4 w-[1px] bg-[#E2D8C3] mx-0.5" />
          <button
            onClick={() => handleInsertPrefix('- ')}
            className="p-1.5 hover:bg-[#EAE1CB] rounded text-[#14213D]"
            title="Bullet point"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleInsertPrefix('Q1: ')}
            className="px-2 py-1 hover:bg-[#EAE1CB] rounded text-[#1F3A8A] font-semibold flex items-center gap-1"
            title="Question Prefix"
          >
            <FileQuestion className="w-3.5 h-3.5" />
            <span>Question</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setContent(SAMPLE_ASSIGNMENT)}
            className="px-2 py-1 text-xs text-[#1F3A8A] hover:bg-[#EEF2FF] rounded flex items-center gap-1 font-medium"
            title="Load Sample Assignment"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sample</span>
          </button>
          <button
            onClick={() => setContent('')}
            className="p-1.5 text-[#6B7280] hover:text-[#E5484D] hover:bg-[#FEE2E2] rounded transition-colors"
            title="Clear all text"
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Textarea */}
      <div className="flex-1 p-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type or paste your assignment text here...
Use # for large headings
Use ## for medium headings
Empty lines create spacing between answers"
          className="w-full h-full p-3 font-mono text-sm leading-relaxed text-[#14213D] bg-transparent resize-none outline-none focus:ring-1 focus:ring-[#1F3A8A]/30 rounded-lg placeholder:text-[#9CA3AF]"
          spellCheck={false}
        />
      </div>

      {/* Footer Metrics */}
      <div className="px-3 py-2 border-t border-[#E2D8C3] bg-[#FAF8F5] flex items-center justify-between text-xs text-[#6B7280]">
        <span>
          {wordsCount} {wordsCount === 1 ? 'word' : 'words'} · {charsCount} characters
        </span>
        <span className="font-medium text-[#1F3A8A]">Markdown supported</span>
      </div>
    </div>
  );
};
