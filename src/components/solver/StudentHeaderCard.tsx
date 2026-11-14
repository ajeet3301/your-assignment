'use client';

import React, { useState, useEffect } from 'react';
import { User, BookOpen, GraduationCap, FileSignature, Edit3, Check, Sparkles } from 'lucide-react';
import { StudentSubmissionHeader } from '@/lib/docx/docx-generator';

const STORAGE_KEY = 'yourassignment_student_header';

export const DEFAULT_STUDENT_HEADER: StudentSubmissionHeader = {
  studentName: 'Ajeet kumar',
  rollNo: '255ISC014',
  className: 'int btech cse',
  subject: 'Database management lab',
  assignmentTitle: 'DBMS ASSIGNMENT 2',
};

interface StudentHeaderCardProps {
  onHeaderChange?: (header: StudentSubmissionHeader) => void;
}

export const StudentHeaderCard: React.FC<StudentHeaderCardProps> = ({ onHeaderChange }) => {
  const [header, setHeader] = useState<StudentSubmissionHeader>(DEFAULT_STUDENT_HEADER);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setHeader(parsed);
          onHeaderChange?.(parsed);
        } else {
          onHeaderChange?.(DEFAULT_STUDENT_HEADER);
        }
      } catch (e) {
        console.warn('Failed to load student header:', e);
      }
    }
  }, []);

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(header));
    }
    onHeaderChange?.(header);
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E2D8C3] p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3 border-b border-[#E2D8C3] pb-2">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-[#1F3A8A]" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-[#14213D]">
            Student Submission Header (Printed on DOCX)
          </h3>
        </div>

        <button
          onClick={() => {
            if (isEditing) handleSave();
            else setIsEditing(true);
          }}
          className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
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

      {isEditing ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">Student Name</label>
            <input
              type="text"
              value={header.studentName}
              onChange={(e) => setHeader({ ...header, studentName: e.target.value })}
              className="w-full p-2 border border-[#E2D8C3] rounded-lg bg-[#FAF8F5] outline-none font-medium"
              placeholder="e.g. Ajeet kumar"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">Roll Number</label>
            <input
              type="text"
              value={header.rollNo}
              onChange={(e) => setHeader({ ...header, rollNo: e.target.value })}
              className="w-full p-2 border border-[#E2D8C3] rounded-lg bg-[#FAF8F5] outline-none font-medium"
              placeholder="e.g. 255ISC014"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">Class / Branch</label>
            <input
              type="text"
              value={header.className}
              onChange={(e) => setHeader({ ...header, className: e.target.value })}
              className="w-full p-2 border border-[#E2D8C3] rounded-lg bg-[#FAF8F5] outline-none font-medium"
              placeholder="e.g. int btech cse"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">Subject</label>
            <input
              type="text"
              value={header.subject}
              onChange={(e) => setHeader({ ...header, subject: e.target.value })}
              className="w-full p-2 border border-[#E2D8C3] rounded-lg bg-[#FAF8F5] outline-none font-medium"
              placeholder="e.g. Database management lab"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">Assignment Title</label>
            <input
              type="text"
              value={header.assignmentTitle}
              onChange={(e) => setHeader({ ...header, assignmentTitle: e.target.value })}
              className="w-full p-2 border border-[#E2D8C3] rounded-lg bg-[#FAF8F5] outline-none font-medium"
              placeholder="e.g. DBMS ASSIGNMENT 2"
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between flex-wrap gap-3 text-xs bg-[#FAF8F5] p-3 rounded-xl border border-[#E2D8C3]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#1F3A8A] text-sm">{header.assignmentTitle}</span>
            <span className="text-[#6B7280]">·</span>
            <span className="font-semibold text-[#14213D]">{header.studentName} ({header.rollNo})</span>
          </div>

          <div className="flex items-center gap-3 text-[#4B5563]">
            <span><strong>Class:</strong> {header.className}</span>
            <span>·</span>
            <span><strong>Subject:</strong> {header.subject}</span>
          </div>
        </div>
      )}
    </div>
  );
};
