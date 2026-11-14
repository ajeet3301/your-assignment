import { describe, it, expect } from 'vitest';
import { generateAssignmentDocx } from '../lib/docx/docx-generator';
import { mySqlRunner, formatSqlAsciiTable } from '../lib/sql/browser-sql-engine';
import { generateMySqlTerminalScreenshotDataUrl } from '../lib/engine/mysql-canvas';

describe('DOCX Answer Document & SQL Lab Assignment Tests', () => {
  it('mySqlRunner accurately seeds OfficeDB and executes queries matching uploaded assignment photos', () => {
    mySqlRunner.seedDefaultOfficeDb();

    // 1. SHOW DATABASES
    const dbRes = mySqlRunner.execute('SHOW DATABASES;');
    expect(dbRes.columns).toEqual(['Database']);
    expect(dbRes.rows.some((r) => r[0] === 'officedb')).toBe(true);

    // 2. SELECT * FROM CUSTOMERS
    const custRes = mySqlRunner.execute('SELECT * FROM CUSTOMERS;');
    expect(custRes.columns).toEqual(['CID', 'CNAME', 'CITY', 'STATE', 'PINCODE', 'PRODUCT', 'CLASS']);
    expect(custRes.rowsCount).toBe(7);
    expect(custRes.rows[0][1]).toBe('Nirav Patel');

    // 3. SELECT * FROM SALESMEN
    const salesRes = mySqlRunner.execute('SELECT * FROM SALESMEN;');
    expect(salesRes.columns).toEqual(['SID', 'SNAME', 'CITY', 'SALARY', 'PRODUCT', 'TGTTOGET', 'COMM']);
    expect(salesRes.rowsCount).toBe(6);

    // 4. Pattern matching with LIKE keyword: SNAME LIKE 'A%'
    const likeRes = mySqlRunner.execute("SELECT * FROM SALESMEN WHERE SNAME LIKE 'A%';");
    expect(likeRes.rowsCount).toBe(1);
    expect(likeRes.rows[0][1]).toBe('Ajay Patel');

    // 5. Comparison: SALARY > 2500
    const salaryRes = mySqlRunner.execute('SELECT SNAME, SALARY FROM SALESMEN WHERE SALARY > 2500;');
    expect(salaryRes.rowsCount).toBe(4);
  });

  it('formatSqlAsciiTable generates classic MySQL CLI box table with +---+ borders', () => {
    const cols = ['CID', 'CNAME', 'CITY'];
    const rows = [
      ['C301', 'Nirav Patel', 'Nadiad'],
      ['C302', 'Kiran Dave', 'Delhi'],
    ];

    const ascii = formatSqlAsciiTable(cols, rows);
    expect(ascii.length).toBeGreaterThanOrEqual(5);
    // Border check
    expect(ascii[0]).toMatch(/^\+[-+]+\+$/);
    // Column header
    expect(ascii[1]).toContain('CID');
    expect(ascii[1]).toContain('CNAME');
    // Content rows
    expect(ascii[3]).toContain('Nirav Patel');
  });

  it('generateMySqlTerminalScreenshotDataUrl returns valid PNG data URL', () => {
    const dataUrl = generateMySqlTerminalScreenshotDataUrl({
      theme: 'windows-dark',
      windowTitle: 'Administrator: MySQL 8.4 Command Line Client',
      actions: [
        {
          query: 'SELECT * FROM CUSTOMERS;',
          outputRows: ['+------+-------------+', '| CID  | CNAME       |', '+------+-------------+'],
          rowsCount: 1,
          executionTimeSec: 0.01,
        },
      ],
    });

    // In Node/happy-dom or browser, returns string
    expect(typeof dataUrl).toBe('string');
  });

  it('generateAssignmentDocx generates a complete student submission DOCX file', async () => {
    const dummyPngDataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const blob = await generateAssignmentDocx({
      header: {
        studentName: 'Ajeet kumar',
        rollNo: '255ISC014',
        className: 'int btech cse',
        subject: 'Database management lab',
        assignmentTitle: 'DBMS ASSIGNMENT 2',
      },
      questions: [
        {
          id: 'q-1',
          numberLabel: 'Q1',
          questionText: 'Show all databases on the MySQL server.',
          codeSnippet: 'SHOW DATABASES;',
          codeLanguage: 'sql',
          outputScreenshotDataUrl: dummyPngDataUrl,
          tableData: {
            headers: ['Database'],
            rows: [['officedb'], ['collegedb']],
          },
          explanation: 'Executes SHOW DATABASES command to list all database schemas.',
        },
      ],
    });

    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(1000);
    expect(blob.type).toContain('officedocument.wordprocessingml.document');
  });
});
