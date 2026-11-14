'use client';

import React, { useState, useEffect } from 'react';
import { GraduationCap, Edit3, Check, RefreshCw } from 'lucide-react';
import { StudentSubmissionHeader } from '@/lib/docx/docx-generator';

const STORAGE_KEY = 'yourassignment_student_header';

export const DEFAULT_STUDENT_HEADER: StudentSubmissionHeader = {
  studentName: 'Ajeet kumar',
  rollNo: '255ISC014',
  className: 'int btech cse',
  subject: 'Computer Organization and Architecture',
  assignmentTitle: 'COA ASSIGNMENT 2',
};

interface StudentHeaderCardProps {
  header?: StudentSubmissionHeader;
  onHeaderChange?: (header: StudentSubmissionHeader) => void;
}

export const StudentHeaderCard: React.FC<StudentHeaderCardProps> = ({
  header: externalHeader,
  onHeaderChange,
}) => {
  const [header, setHeader] = useState<StudentSubmissionHeader>(
    externalHeader || DEFAULT_STUDENT_HEADER
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Sync external header changes (e.g. from auto-detection when a sheet is pasted)
  useEffect(() => {
    if (externalHeader) {
      setHeader((prev) => ({
        ...prev,
        ...externalHeader,
        // Retain saved student credentials if external only had subject/title
        studentName: externalHeader.studentName || prev.studentName,
        rollNo: externalHeader.rollNo || prev.rollNo,
        className: externalHeader.className || prev.className,
      }));
    }
  }, [externalHeader]);

  // Initial load from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setHeader((prev) => {
            const merged = { ...prev, ...parsed };
            onHeaderChange?.(merged);
            return merged;
          });
        } else {
          onHeaderChange?.(header);
        }
      } catch (e) {
        console.warn('Failed to load student header:', e);
      }
    }
  }, []);

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(header));
      } catch {
        // ignore
      }
    }
    onHeaderChange?.(header);
    setIsEditing(false);
  };

  const handleFieldChange = (field: keyof StudentSubmissionHeader, value: string) => {
    const updated = { ...header, [field]: value };
    setHeader(updated);
    onHeaderChange?.(updated);
  };

  return (
    <div
      onClick={() => setIsFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setIsFocused(false);
      }}
      tabIndex={0}
      className={`bg-white rounded-2xl border transition-all duration-300 ease-out p-4 outline-none ${
        isFocused || isEditing
          ? 'scale-[1.015] shadow-xl border-[#1F3A8A] ring-2 ring-[#1F3A8A]/20 relative z-10'
          : 'border-[#E2D8C3] shadow-xs hover:shadow-md hover:scale-[1.008] hover:border-[#1F3A8A]/40'
      }`}
    >
      <div className="flex items-center justify-between mb-3 border-b border-[#E2D8C3] pb-2">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-[#1F3A8A]" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-[#14213D]">
            Student Submission Header (Printed on DOCX)
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isEditing) handleSave();
              else {
                setIsEditing(true);
                setIsFocused(true);
              }
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all duration-150 hover:scale-105 active:scale-95 ${
              isEditing
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                : 'bg-[#FAF8F5] hover:bg-[#EEF2FF] text-[#1F3A8A] border border-[#E2D8C3]'
            }`}
          >
            {isEditing ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Save Header</span>
              </>
            ) : (
              <>
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Details</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">Student Name</label>
            <input
              type="text"
              value={header.studentName}
              onChange={(e) => handleFieldChange('studentName', e.target.value)}
              className="w-full p-2 border border-[#E2D8C3] rounded-lg bg-[#FAF8F5] outline-none font-medium focus:ring-1 focus:ring-[#1F3A8A]"
              placeholder="e.g. Ajeet kumar"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">Roll Number</label>
            <input
              type="text"
              value={header.rollNo}
              onChange={(e) => handleFieldChange('rollNo', e.target.value)}
              className="w-full p-2 border border-[#E2D8C3] rounded-lg bg-[#FAF8F5] outline-none font-medium focus:ring-1 focus:ring-[#1F3A8A]"
              placeholder="e.g. 255ISC014"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">Class / Branch</label>
            <input
              type="text"
              value={header.className}
              onChange={(e) => handleFieldChange('className', e.target.value)}
              className="w-full p-2 border border-[#E2D8C3] rounded-lg bg-[#FAF8F5] outline-none font-medium focus:ring-1 focus:ring-[#1F3A8A]"
              placeholder="e.g. int btech cse"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">Subject</label>
            <input
              type="text"
              value={header.subject}
              onChange={(e) => handleFieldChange('subject', e.target.value)}
              className="w-full p-2 border border-[#E2D8C3] rounded-lg bg-[#FAF8F5] outline-none font-medium focus:ring-1 focus:ring-[#1F3A8A]"
              placeholder="e.g. Computer Organization and Architecture"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">Assignment Title</label>
            <input
              type="text"
              value={header.assignmentTitle}
              onChange={(e) => handleFieldChange('assignmentTitle', e.target.value)}
              className="w-full p-2 border border-[#E2D8C3] rounded-lg bg-[#FAF8F5] outline-none font-medium focus:ring-1 focus:ring-[#1F3A8A]"
              placeholder="e.g. COA ASSIGNMENT 2"
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between flex-wrap gap-3 text-xs bg-[#FAF8F5] p-3 rounded-xl border border-[#E2D8C3]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[#1F3A8A] text-sm">{header.assignmentTitle}</span>
            <span className="text-[#6B7280]">·</span>
            <span className="font-semibold text-[#14213D]">{header.studentName} ({header.rollNo})</span>
          </div>

          <div className="flex items-center gap-3 text-[#4B5563] flex-wrap">
            <span><strong>Class:</strong> {header.className}</span>
            <span>·</span>
            <span><strong>Subject:</strong> {header.subject}</span>
          </div>
        </div>
      )}
    </div>
  );
};
