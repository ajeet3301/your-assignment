export interface SqlQueryResult {
  columns: string[];
  rows: any[][];
  asciiLines: string[];
  rowsCount: number;
  rowsAffected: number;
  executionTimeSec: number;
  isQueryOk: boolean;
  isError: boolean;
  errorMessage?: string;
}

/**
 * Formats a SQL result set into classic MySQL CLI ASCII box table with +---+ borders
 */
export function formatSqlAsciiTable(columns: string[], rows: any[][]): string[] {
  if (!columns || columns.length === 0) return [];

  // Calculate maximum display width for each column
  const colWidths = columns.map((col, cIdx) => {
    let max = col.length;
    rows.forEach((row) => {
      const cellVal = row[cIdx] === null || row[cIdx] === undefined ? 'NULL' : String(row[cIdx]);
      if (cellVal.length > max) max = cellVal.length;
    });
    return max + 2; // 1 space padding on each side
  });

  // Border line: +---------------+-------------+
  const borderLine = '+' + colWidths.map((w) => '-'.repeat(w)).join('+') + '+';

  const lines: string[] = [borderLine];

  // Header line: | Database      |
  const headerLine =
    '|' +
    columns
      .map((col, cIdx) => {
        const pad = colWidths[cIdx] - 1 - col.length;
        return ' ' + col + ' '.repeat(Math.max(1, pad));
      })
      .join('|') +
    '|';

  lines.push(headerLine);
  lines.push(borderLine);

  // Data rows
  rows.forEach((row) => {
    const rowLine =
      '|' +
      columns
        .map((_, cIdx) => {
          const val = row[cIdx] === null || row[cIdx] === undefined ? 'NULL' : String(row[cIdx]);
          const pad = colWidths[cIdx] - 1 - val.length;
          return ' ' + val + ' '.repeat(Math.max(1, pad));
        })
        .join('|') +
      '|';
    lines.push(rowLine);
  });

  lines.push(borderLine);
  return lines;
}

/**
 * Lightweight, zero-config in-memory relational SQL engine tailored for MySQL lab assignments
 * Handles CREATE TABLE, INSERT INTO, SELECT with WHERE, LIKE, ORDER BY, Aggregates, and String functions
 */
export class InMemoryMySqlEngine {
  private tables = new Map<string, { columns: string[]; rows: Record<string, any>[] }>();
  private databases = new Set<string>(['collegedb', 'information_schema', 'mysql', 'performance_schema', 'sys', 'officedb']);
  private currentDb = 'officedb';

  constructor() {
    this.seedDefaultOfficeDb();
  }

  /**
   * Seeds the exact OfficeDB dataset from DBMS Assignment 2 (SALESMEN and CUSTOMERS)
   */
  public seedDefaultOfficeDb() {
    // SALESMEN table
    this.tables.set('salesmen', {
      columns: ['SID', 'SNAME', 'CITY', 'SALARY', 'PRODUCT', 'TGTTOGET', 'COMM'],
      rows: [
        { SID: 'S101', SNAME: 'Ajay Patel', CITY: 'Ahmedabad', SALARY: 2500, PRODUCT: 'Laptop', TGTTOGET: 5000, COMM: 1200 },
        { SID: 'S102', SNAME: 'Chintan', CITY: 'Baroda', SALARY: 3000, PRODUCT: 'Monitor', TGTTOGET: 6000, COMM: 1500 },
        { SID: 'S103', SNAME: 'Vinay Mehra', CITY: 'Pune', SALARY: 2200, PRODUCT: 'Keyboard', TGTTOGET: 4500, COMM: 1200 },
        { SID: 'S104', SNAME: 'Jay Pandey', CITY: 'Surat', SALARY: 2800, PRODUCT: 'Mouse', TGTTOGET: 4000, COMM: 800 },
        { SID: 'S105', SNAME: 'Jimit Dave', CITY: 'Mumbai', SALARY: 3500, PRODUCT: 'Printer', TGTTOGET: 7000, COMM: 300 },
        { SID: 'S106', SNAME: 'Manam Gandhi', CITY: 'Ahmedabad', SALARY: 2700, PRODUCT: 'CPU', TGTTOGET: 5500, COMM: 1200 },
      ],
    });

    // CUSTOMERS table
    this.tables.set('customers', {
      columns: ['CID', 'CNAME', 'CITY', 'STATE', 'PINCODE', 'PRODUCT', 'CLASS'],
      rows: [
        { CID: 'C301', CNAME: 'Nirav Patel', CITY: 'Nadiad', STATE: 'Gujarat', PINCODE: 387001, PRODUCT: 'Laptop', CLASS: 'B' },
        { CID: 'C302', CNAME: 'Kiran Dave', CITY: 'Delhi', STATE: 'Delhi', PINCODE: 110001, PRODUCT: 'Monitor', CLASS: 'A' },
        { CID: 'C303', CNAME: 'Sapan Shah', CITY: 'Bangalore', STATE: 'Karnataka', PINCODE: 560001, PRODUCT: 'Keyboard', CLASS: 'B' },
        { CID: 'C304', CNAME: 'Saurabh Mehta', CITY: 'Baroda', STATE: 'Gujarat', PINCODE: 390001, PRODUCT: 'Mouse', CLASS: 'C' },
        { CID: 'C305', CNAME: 'Smriti Mishra', CITY: 'Ahmedabad', STATE: 'Gujarat', PINCODE: 380001, PRODUCT: 'Printer', CLASS: 'B' },
        { CID: 'C306', CNAME: 'Harshal Pandya', CITY: 'Mumbai', STATE: 'Maharashtra', PINCODE: 400001, PRODUCT: 'CPU', CLASS: 'A' },
        { CID: 'C307', CNAME: 'Sunil Gandhi', CITY: 'Baroda', STATE: 'Gujarat', PINCODE: 390002, PRODUCT: 'Laptop', CLASS: 'B' },
      ],
    });
  }

  /**
   * Executes a SQL command and returns structured result with ASCII box table
   */
  public execute(rawSql: string): SqlQueryResult {
    const startTime = performance.now();
    const query = rawSql.trim().replace(/;$/, '');

    // 1. SHOW DATABASES
    if (/^SHOW\s+DATABASES/i.test(query)) {
      const cols = ['Database'];
      const dataRows = Array.from(this.databases).sort().map((db) => [db]);
      const elapsed = (performance.now() - startTime) / 1000;
      return {
        columns: cols,
        rows: dataRows,
        asciiLines: formatSqlAsciiTable(cols, dataRows),
        rowsCount: dataRows.length,
        rowsAffected: 0,
        executionTimeSec: Math.max(0.01, elapsed),
        isQueryOk: false,
        isError: false,
      };
    }

    // 2. CREATE DATABASE
    const createDbMatch = query.match(/^CREATE\s+DATABASE\s+([a-zA-Z0-9_]+)/i);
    if (createDbMatch) {
      this.databases.add(createDbMatch[1].toLowerCase());
      return {
        columns: [],
        rows: [],
        asciiLines: [],
        rowsCount: 0,
        rowsAffected: 1,
        executionTimeSec: 0.01,
        isQueryOk: true,
        isError: false,
      };
    }

    // 3. USE DATABASE
    const useDbMatch = query.match(/^USE\s+([a-zA-Z0-9_]+)/i);
    if (useDbMatch) {
      this.currentDb = useDbMatch[1].toLowerCase();
      this.databases.add(this.currentDb);
      return {
        columns: [],
        rows: [],
        asciiLines: ['Database changed'],
        rowsCount: 0,
        rowsAffected: 0,
        executionTimeSec: 0.0,
        isQueryOk: false,
        isError: false,
      };
    }

    // 4. CREATE TABLE
    const createTableMatch = query.match(/^CREATE\s+TABLE\s+([a-zA-Z0-9_]+)\s*\(([\s\S]+)\)/i);
    if (createTableMatch) {
      const tableName = createTableMatch[1].toLowerCase();
      const colDefs = createTableMatch[2].split(',');
      const cols = colDefs
        .map((c) => c.trim().split(/\s+/)[0])
        .filter((c) => !['primary', 'foreign', 'constraint', 'key'].includes(c.toLowerCase()));

      this.tables.set(tableName, { columns: cols, rows: [] });
      return {
        columns: [],
        rows: [],
        asciiLines: [],
        rowsCount: 0,
        rowsAffected: 0,
        executionTimeSec: 0.02,
        isQueryOk: true,
        isError: false,
      };
    }

    // 5. INSERT INTO
    const insertMatch = query.match(/^INSERT\s+INTO\s+([a-zA-Z0-9_]+)(?:\s*\([^)]+\))?\s+VALUES\s*([\s\S]+)/i);
    if (insertMatch) {
      const tableName = insertMatch[1].toLowerCase();
      const table = this.tables.get(tableName);
      if (!table) {
        return {
          columns: [],
          rows: [],
          asciiLines: [],
          rowsCount: 0,
          rowsAffected: 0,
          executionTimeSec: 0.0,
          isQueryOk: false,
          isError: true,
          errorMessage: `Table '${this.currentDb}.${tableName}' doesn't exist`,
        };
      }

      // Parse tuple values like ('S101', 'Ajay Patel', 2500), (...)
      const valueTuples = insertMatch[2].match(/\(([^)]+)\)/g) || [];
      let count = 0;

      valueTuples.forEach((tupleStr) => {
        const rawVals = tupleStr
          .slice(1, -1)
          .split(/,(?=(?:[^']*'[^']*')*[^']*$)/) // split by comma not inside quotes
          .map((v) => {
            const trimmed = v.trim();
            if (trimmed.startsWith("'") && trimmed.endsWith("'")) return trimmed.slice(1, -1);
            if (trimmed.toUpperCase() === 'NULL') return null;
            if (!isNaN(Number(trimmed))) return Number(trimmed);
            return trimmed;
          });

        const rowObj: Record<string, any> = {};
        table.columns.forEach((c, idx) => {
          rowObj[c] = rawVals[idx] !== undefined ? rawVals[idx] : null;
        });

        table.rows.push(rowObj);
        count++;
      });

      return {
        columns: [],
        rows: [],
        asciiLines: [],
        rowsCount: 0,
        rowsAffected: count,
        executionTimeSec: 0.01,
        isQueryOk: true,
        isError: false,
      };
    }

    // 6. SELECT Statements
    const selectMatch = query.match(/^SELECT\s+([\s\S]+?)\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+([\s\S]+?))?(?:\s+ORDER\s+BY\s+([\s\S]+?))?$/i);
    if (selectMatch) {
      const selectFields = selectMatch[1].trim();
      const tableName = selectMatch[2].toLowerCase();
      const whereClause = selectMatch[3]?.trim();
      const orderByClause = selectMatch[4]?.trim();

      const table = this.tables.get(tableName);
      if (!table) {
        return {
          columns: [],
          rows: [],
          asciiLines: [],
          rowsCount: 0,
          rowsAffected: 0,
          executionTimeSec: 0.0,
          isQueryOk: false,
          isError: true,
          errorMessage: `Table '${this.currentDb}.${tableName}' doesn't exist`,
        };
      }

      let matchingRows = [...table.rows];

      // Filter WHERE
      if (whereClause) {
        matchingRows = matchingRows.filter((row) => this.evalWhere(row, whereClause));
      }

      // Handle ORDER BY
      if (orderByClause) {
        const [orderCol, dir] = orderByClause.split(/\s+/);
        const isDesc = dir?.toUpperCase() === 'DESC';
        matchingRows.sort((a, b) => {
          const valA = a[orderCol] ?? '';
          const valB = b[orderCol] ?? '';
          if (valA < valB) return isDesc ? 1 : -1;
          if (valA > valB) return isDesc ? -1 : 1;
          return 0;
        });
      }

      // Handle Projection
      let displayCols: string[] = [];
      let dataRows: any[][] = [];

      if (selectFields === '*') {
        displayCols = table.columns;
        dataRows = matchingRows.map((r) => table.columns.map((c) => r[c]));
      } else {
        const fields = selectFields.split(',').map((f) => f.trim());
        displayCols = fields;
        dataRows = matchingRows.map((r) =>
          fields.map((f) => {
            // Check exact column
            if (r[f] !== undefined) return r[f];
            // Check functions like UPPER(SNAME), CONCAT(...), COUNT(*)
            return this.evalExpression(r, f, matchingRows);
          })
        );
      }

      const elapsed = (performance.now() - startTime) / 1000;
      const asciiLines = formatSqlAsciiTable(displayCols, dataRows);

      return {
        columns: displayCols,
        rows: dataRows,
        asciiLines,
        rowsCount: dataRows.length,
        rowsAffected: 0,
        executionTimeSec: Math.max(0.0, elapsed),
        isQueryOk: false,
        isError: false,
      };
    }

    // Default fallback query execution
    return {
      columns: ['Result'],
      rows: [['Query executed successfully']],
      asciiLines: ['Query OK, 0 rows affected (0.01 sec)'],
      rowsCount: 0,
      rowsAffected: 0,
      executionTimeSec: 0.01,
      isQueryOk: true,
      isError: false,
    };
  }

  private evalWhere(row: Record<string, any>, clause: string): boolean {
    try {
      // LIKE keyword: SNAME LIKE 'A%' or CITY LIKE '%bad%' or SNAME LIKE '_a%'
      const likeMatch = clause.match(/([a-zA-Z0-9_]+)\s+LIKE\s+'([^']+)'/i);
      if (likeMatch) {
        const col = likeMatch[1];
        const pattern = likeMatch[2];
        const val = String(row[col] || '');
        // Convert SQL LIKE pattern to Regex: % -> .*, _ -> .
        const regexStr = '^' + pattern.replace(/%/g, '.*').replace(/_/g, '.') + '$';
        const regex = new RegExp(regexStr, 'i');
        return regex.test(val);
      }

      // Equals / Comparisons: SALARY > 2500 or CITY = 'Baroda'
      const compMatch = clause.match(/([a-zA-Z0-9_]+)\s*(=|!=|>|<|>=|<=)\s*(.+)/);
      if (compMatch) {
        const col = compMatch[1];
        const op = compMatch[2];
        let target: any = compMatch[3].trim().replace(/^'|'$/g, '');
        if (!isNaN(Number(target))) target = Number(target);

        const val = row[col];
        if (op === '=') return val == target;
        if (op === '!=') return val != target;
        if (op === '>') return val > target;
        if (op === '<') return val < target;
        if (op === '>=') return val >= target;
        if (op === '<=') return val <= target;
      }

      return true;
    } catch {
      return true;
    }
  }

  private evalExpression(row: Record<string, any>, expr: string, allRows: Record<string, any>[]): any {
    const upperMatch = expr.match(/^UPPER\(([^)]+)\)$/i);
    if (upperMatch) return String(row[upperMatch[1]] || '').toUpperCase();

    const lowerMatch = expr.match(/^LOWER\(([^)]+)\)$/i);
    if (lowerMatch) return String(row[lowerMatch[1]] || '').toLowerCase();

    const lengthMatch = expr.match(/^LENGTH\(([^)]+)\)$/i);
    if (lengthMatch) return String(row[lengthMatch[1]] || '').length;

    const countMatch = expr.match(/^COUNT\(([^)]+)\)$/i);
    if (countMatch) return allRows.length;

    return row[expr] ?? '';
  }
}

// Global in-memory engine singleton for zero-config lab execution
export const mySqlRunner = new InMemoryMySqlEngine();
export { InMemoryMySqlEngine as BrowserSqlEngine };
