import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  Footer,
  PageNumber,
  NumberFormat,
} from 'docx';

export interface StudentSubmissionHeader {
  studentName: string;
  rollNo: string;
  className: string;
  subject: string;
  assignmentTitle: string;
}

export const DEFAULT_STUDENT_HEADER: StudentSubmissionHeader = {
  studentName: 'Ajeet kumar',
  rollNo: '255ISC014',
  className: 'int btech cse',
  subject: 'Database management lab',
  assignmentTitle: 'DBMS ASSIGNMENT 2',
};

export interface SolvedQuestionDocItem {
  id: string;
  numberLabel: string; // e.g. "Q1" or "Question 1"
  sectionTitle?: string; // e.g. "A. LIKE Keyword"
  questionText: string;
  codeSnippet?: string; // source code or SQL query
  codeLanguage?: string; // e.g. "sql", "python", "cpp"
  inputUsed?: string;
  outputScreenshotDataUrl?: string; // PNG Data URL of real terminal/mysql output
  outputText?: string;
  tableData?: {
    headers: string[];
    rows: (string | number)[][];
    caption?: string;
  };
  explanation?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
}

export interface GenerateDocxOptions {
  header: StudentSubmissionHeader;
  questions: SolvedQuestionDocItem[];
  fontFamily?: string; // default "Times New Roman"
  includeExplanations?: boolean;
}

/**
 * Converts a Base64 PNG Data URL into an ArrayBuffer for docx ImageRun
 */
function dataUrlToArrayBuffer(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || dataUrl;
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64, 'base64');
  }
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Builds the docx Document object
 */
export function buildAssignmentDocxDocument(options: GenerateDocxOptions): Document {
  const {
    header,
    questions,
    fontFamily = 'Times New Roman',
    includeExplanations = true,
  } = options;

  const docChildren: (Paragraph | Table)[] = [];

  // 1. Student Submission Header Block
  // Style: Bold, student name, roll number, course, subject, assignment title
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120 },
      children: [
        new TextRun({
          text: header.assignmentTitle.toUpperCase(),
          bold: true,
          size: 32, // 16 pt
          font: fontFamily,
          color: '1F3A8A',
        }),
      ],
    })
  );

  // Metadata Table / Header Line
  const headerDetails = [
    `Name: ${header.studentName || 'Student Name'}`,
    `Roll No: ${header.rollNo || 'N/A'}`,
    `Class / Branch: ${header.className || 'B.Tech CSE'}`,
    `Subject: ${header.subject || 'Lab Assignment'}`,
  ];

  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 240 },
      children: [
        new TextRun({
          text: headerDetails.join('   |   '),
          bold: true,
          size: 22, // 11 pt
          font: fontFamily,
          color: '374151',
        }),
      ],
    })
  );

  // Divider line
  docChildren.push(
    new Paragraph({
      spacing: { before: 0, after: 280 },
      border: {
        bottom: {
          color: '1F3A8A',
          space: 1,
          style: BorderStyle.SINGLE,
          size: 12,
        },
      },
    })
  );

  // 2. Iterate through Questions
  let currentSection = '';

  for (let idx = 0; idx < questions.length; idx++) {
    const q = questions[idx];

    // Section Header if changed
    if (q.sectionTitle && q.sectionTitle !== currentSection) {
      currentSection = q.sectionTitle;
      docChildren.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
          children: [
            new TextRun({
              text: q.sectionTitle,
              bold: true,
              size: 26, // 13 pt
              font: fontFamily,
              color: '1F3A8A',
            }),
          ],
        })
      );
    }

    // Question Label & Text
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 180, after: 80 },
        children: [
          new TextRun({
            text: `${q.numberLabel}. `,
            bold: true,
            size: 24, // 12 pt
            font: fontFamily,
            color: '111827',
          }),
          new TextRun({
            text: q.questionText,
            bold: true,
            size: 24, // 12 pt
            font: fontFamily,
            color: '111827',
          }),
        ],
      })
    );

    // Source Code / Query Block
    if (q.codeSnippet && q.codeSnippet.trim()) {
      docChildren.push(
        new Paragraph({
          spacing: { before: 80, after: 40 },
          children: [
            new TextRun({
              text: q.codeLanguage?.toLowerCase() === 'sql' ? 'SQL Query:' : 'Source Code:',
              bold: true,
              size: 20, // 10 pt
              font: fontFamily,
              color: '4B5563',
            }),
          ],
        })
      );

      // Monospace Code Block
      const codeLines = q.codeSnippet.split('\n');
      codeLines.forEach((line) => {
        docChildren.push(
          new Paragraph({
            spacing: { before: 20, after: 20 },
            shading: {
              fill: 'F3F4F6', // Light gray background
            },
            indent: { left: 360, right: 360 },
            children: [
              new TextRun({
                text: line || ' ',
                font: 'Consolas',
                size: 19, // 9.5 pt
                color: '1F2937',
              }),
            ],
          })
        );
      });
    }

    // Real Execution Screenshot (PNG)
    if (q.outputScreenshotDataUrl && q.outputScreenshotDataUrl.startsWith('data:image/')) {
      try {
        const imageBytes = dataUrlToArrayBuffer(q.outputScreenshotDataUrl);

        docChildren.push(
          new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [
              new TextRun({
                text: 'Execution Output Screenshot (Real Execution):',
                bold: true,
                size: 20,
                font: fontFamily,
                color: '4B5563',
              }),
            ],
          })
        );

        // Standard A4 width is 8.27 in = 595 pt (~500 pt printable with margins)
        docChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 60, after: 120 },
            children: [
              new ImageRun({
                data: imageBytes,
                transformation: {
                  width: 520, // Page width in Word points
                  height: 240, // Proportional height
                },
                type: 'png',
              }),
            ],
          })
        );
      } catch (err) {
        console.warn('Failed to embed screenshot image in DOCX:', err);
      }
    }

    // Observation Table (if provided)
    if (q.tableData && q.tableData.rows.length > 0) {
      docChildren.push(
        new Paragraph({
          spacing: { before: 100, after: 60 },
          children: [
            new TextRun({
              text: q.tableData.caption || 'Observation Table / Query Results:',
              bold: true,
              size: 20,
              font: fontFamily,
              color: '1F3A8A',
            }),
          ],
        })
      );

      const tableRows: TableRow[] = [];

      // Header Row
      tableRows.push(
        new TableRow({
          tableHeader: true,
          children: q.tableData.headers.map(
            (h) =>
              new TableCell({
                shading: { fill: '1F3A8A' },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: h,
                        bold: true,
                        size: 20,
                        font: fontFamily,
                        color: 'FFFFFF',
                      }),
                    ],
                  }),
                ],
              })
          ),
        })
      );

      // Data Rows
      q.tableData.rows.forEach((row, rIdx) => {
        tableRows.push(
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  shading: { fill: rIdx % 2 === 0 ? 'F9FAFB' : 'FFFFFF' },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.LEFT,
                      children: [
                        new TextRun({
                          text: String(cell !== null && cell !== undefined ? cell : 'NULL'),
                          size: 19,
                          font: fontFamily,
                          color: '111827',
                        }),
                      ],
                    }),
                  ],
                })
            ),
          })
        );
      });

      docChildren.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
        })
      );
    }

    // Explanation & Complexity
    if (includeExplanations && (q.explanation || q.timeComplexity)) {
      if (q.explanation) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 100, after: 60 },
            children: [
              new TextRun({
                text: 'Explanation: ',
                bold: true,
                size: 21,
                font: fontFamily,
                color: '1F3A8A',
              }),
              new TextRun({
                text: q.explanation,
                size: 21,
                font: fontFamily,
                color: '374151',
              }),
            ],
          })
        );
      }

      if (q.timeComplexity || q.spaceComplexity) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 40, after: 120 },
            children: [
              new TextRun({
                text: `Complexity: Time ${q.timeComplexity || 'O(1)'} | Space ${q.spaceComplexity || 'O(1)'}`,
                bold: true,
                size: 20,
                font: fontFamily,
                color: '6B7280',
              }),
            ],
          })
        );
      }
    }

    // Separator line between questions
    if (idx < questions.length - 1) {
      docChildren.push(
        new Paragraph({
          spacing: { before: 120, after: 160 },
          border: {
            bottom: {
              color: 'E5E7EB',
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
        })
      );
    }
  }

  // 3. Construct Document with standard A4 margins & footer page numbers
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch = 1440 twips
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `${header.subject || 'Assignment'}  |  Page `,
                    size: 18,
                    font: fontFamily,
                    color: '9CA3AF',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                    font: fontFamily,
                    color: '9CA3AF',
                  }),
                  new TextRun({
                    text: ' of ',
                    size: 18,
                    font: fontFamily,
                    color: '9CA3AF',
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 18,
                    font: fontFamily,
                    color: '9CA3AF',
                  }),
                ],
              }),
            ],
          }),
        },
        children: docChildren,
      },
    ],
  });

  return doc;
}

/**
 * Creates a professional Word document (.docx) as a Blob (browser-friendly)
 */
export async function generateAssignmentDocx(options: GenerateDocxOptions): Promise<Blob> {
  const doc = buildAssignmentDocxDocument(options);
  return await Packer.toBlob(doc);
}

/**
 * Creates a professional Word document (.docx) as a Buffer (server & Telegram bot friendly)
 */
export async function generateAssignmentDocxBuffer(options: GenerateDocxOptions): Promise<Buffer> {
  const doc = buildAssignmentDocxDocument(options);
  return await Packer.toBuffer(doc);
}

/**
 * Initiates browser download of generated DOCX file
 */
export function downloadDocxBlob(blob: Blob, filename: string = 'Assignment_Solution.docx') {
  if (typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
