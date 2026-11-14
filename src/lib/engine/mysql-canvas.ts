'use client';

export interface MySqlTerminalTheme {
  name: string;
  bg: string;
  text: string;
  headerBg: string;
  headerText: string;
  dots: boolean;
}

export const MYSQL_THEMES: Record<string, MySqlTerminalTheme> = {
  'windows-dark': {
    name: 'Windows Terminal (Dark - Match Photo)',
    bg: '#0C0C0C',
    text: '#E5E7EB',
    headerBg: '#1F1F1F',
    headerText: '#F3F4F6',
    dots: false,
  },
  'powershell': {
    name: 'PowerShell Console',
    bg: '#012456',
    text: '#FFFFFF',
    headerBg: '#0A326E',
    headerText: '#FFFFFF',
    dots: false,
  },
  'ubuntu': {
    name: 'Ubuntu Linux Terminal',
    bg: '#300A24',
    text: '#FFFFFF',
    headerBg: '#3E1030',
    headerText: '#DFDBDF',
    dots: true,
  },
  'macos': {
    name: 'macOS Terminal',
    bg: '#181818',
    text: '#F3F4F6',
    headerBg: '#282828',
    headerText: '#9CA3AF',
    dots: true,
  },
};

export interface MySqlPromptAction {
  query: string;
  outputRows?: string[];
  executionTimeSec?: number;
  rowsCount?: number;
  isQueryOk?: boolean;
  rowsAffected?: number;
  isError?: boolean;
  errorMessage?: string;
}

export interface RenderMySqlCanvasOptions {
  theme?: string;
  windowTitle?: string;
  databaseName?: string;
  includeBanner?: boolean;
  actions: MySqlPromptAction[];
  width?: number;
}

/**
 * Procedurally draws an authentic MySQL Monitor terminal window to an offscreen canvas and returns PNG Data URL
 */
export function generateMySqlTerminalScreenshotDataUrl(options: RenderMySqlCanvasOptions): string {
  if (typeof document === 'undefined') return '';

  const {
    theme = 'windows-dark',
    windowTitle = 'Administrator: MySQL 8.4 Command Line Client',
    databaseName = 'OfficeDB',
    includeBanner = false,
    actions,
    width = 720,
  } = options;

  const currentTheme = MYSQL_THEMES[theme] || MYSQL_THEMES['windows-dark'];

  // Prepare all text lines to calculate height
  const linesToRender: { text: string; color?: string; isPrompt?: boolean }[] = [];

  if (includeBanner) {
    linesToRender.push({ text: 'Enter password: ****', color: '#9CA3AF' });
    linesToRender.push({ text: 'Welcome to the MySQL monitor.  Commands end with ; or \\g.', color: currentTheme.text });
    linesToRender.push({ text: 'Your MySQL connection id is 9', color: currentTheme.text });
    linesToRender.push({ text: 'Server version: 8.4.11 MySQL Community Server - GPL', color: currentTheme.text });
    linesToRender.push({ text: '', color: currentTheme.text });
  }

  actions.forEach((act) => {
    // Break query into lines (handle long queries with continuation line "    -> ")
    const rawQueryLines = act.query.trim().split('\n');
    rawQueryLines.forEach((qLine, qIdx) => {
      const promptStr = qIdx === 0 ? 'mysql> ' : '    -> ';
      linesToRender.push({
        text: `${promptStr}${qLine}`,
        color: currentTheme.text,
        isPrompt: true,
      });
    });

    if (act.isError && act.errorMessage) {
      linesToRender.push({
        text: act.errorMessage.startsWith('ERROR') ? act.errorMessage : `ERROR 1064 (42000): ${act.errorMessage}`,
        color: '#F87171',
      });
    } else if (act.isQueryOk) {
      const secStr = (act.executionTimeSec || 0.01).toFixed(2);
      const affected = act.rowsAffected !== undefined ? act.rowsAffected : 0;
      linesToRender.push({
        text: `Query OK, ${affected} row${affected === 1 ? '' : 's'} affected (${secStr} sec)`,
        color: currentTheme.text,
      });
    } else if (act.outputRows && act.outputRows.length > 0) {
      act.outputRows.forEach((r) => {
        linesToRender.push({ text: r, color: currentTheme.text });
      });

      const count = act.rowsCount !== undefined ? act.rowsCount : 0;
      const secStr = (act.executionTimeSec || 0.0).toFixed(2);
      if (count === 0) {
        linesToRender.push({ text: `Empty set (${secStr} sec)`, color: currentTheme.text });
      } else {
        linesToRender.push({ text: `${count} row${count === 1 ? '' : 's'} in set (${secStr} sec)`, color: currentTheme.text });
      }
    }

    linesToRender.push({ text: '', color: currentTheme.text }); // blank line spacing
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const lineHeight = 20;
  const headerHeight = 34;
  const paddingX = 18;
  const paddingY = 16;

  const totalContentHeight = linesToRender.length * lineHeight;
  const height = headerHeight + paddingY * 2 + Math.max(120, totalContentHeight);

  // Retina 2x resolution
  const dpr = 2;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  // 1. Terminal Window Base & Rounded Corners
  const radius = 8;
  ctx.save();
  ctx.fillStyle = currentTheme.bg;
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, radius);
  ctx.fill();

  // Outer border
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.stroke();

  // 2. Title Bar Header
  ctx.fillStyle = currentTheme.headerBg;
  ctx.beginPath();
  ctx.roundRect(0, 0, width, headerHeight, [radius, radius, 0, 0]);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.moveTo(0, headerHeight);
  ctx.lineTo(width, headerHeight);
  ctx.stroke();

  // Dots or Icon
  if (currentTheme.dots) {
    const dotColors = ['#FF5F56', '#FFBD2E', '#27C93F'];
    dotColors.forEach((color, i) => {
      ctx.beginPath();
      ctx.arc(16 + i * 16, headerHeight / 2, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
  } else {
    // Windows Terminal style prompt icon
    ctx.fillStyle = '#9CA3AF';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('>', 14, headerHeight / 2 + 4);
  }

  // Window Title
  ctx.fillStyle = currentTheme.headerText;
  ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(windowTitle, width / 2, headerHeight / 2 + 4);

  // 3. Render Terminal Text Content (Consolas)
  ctx.textAlign = 'left';
  ctx.font = '13px Consolas, "Courier New", Courier, monospace';

  let currentY = headerHeight + paddingY + 12;

  linesToRender.forEach((item) => {
    if (item.text) {
      ctx.fillStyle = item.color || currentTheme.text;
      ctx.fillText(item.text, paddingX, currentY);
    }
    currentY += lineHeight;
  });

  ctx.restore();

  return canvas.toDataURL('image/png');
}
