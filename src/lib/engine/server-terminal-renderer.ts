import path from 'path';
import fs from 'fs';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';

export type TerminalStyle = 'vscode' | 'powershell' | 'cmd' | 'ubuntu' | 'macos' | 'mysql';

let terminalFontsRegistered = false;

function ensureTerminalFontsRegistered() {
  if (terminalFontsRegistered) return;
  terminalFontsRegistered = true;

  const fontDefs = [
    { file: 'RobotoMono-Regular.ttf', alias: 'TerminalMono' },
    { file: 'Inter-Regular.ttf', alias: 'TerminalHeader' },
  ];

  const fontsDir = path.join(process.cwd(), 'public', 'fonts');

  for (const f of fontDefs) {
    const fullPath = path.join(fontsDir, f.file);
    try {
      if (fs.existsSync(fullPath)) {
        GlobalFonts.registerFromPath(fullPath, f.alias);
      }
    } catch (e) {
      console.warn(`Could not register font ${f.alias} from ${fullPath}:`, e);
    }
  }
}

export interface ServerTerminalOptions {
  style?: TerminalStyle;
  promptLocation?: string; // e.g. "PS D:\\ajeet\\program\\DBMS>" or "C:\\Users\\Ajeet\\Desktop\\DSA>"
  command?: string; // e.g. "gcc linear.c -o linear && .\\linear"
  outputLines: string[];
  windowTitle?: string;
  width?: number;
  databaseName?: string;
  isSql?: boolean;
}

interface ThemeConfig {
  bg: string;
  text: string;
  headerBg: string;
  headerText: string;
  promptColor: string;
  dots: boolean;
  defaultTitle: string;
}

const THEMES: Record<TerminalStyle, ThemeConfig> = {
  vscode: {
    bg: '#181818',
    text: '#CCCCCC',
    headerBg: '#181818',
    headerText: '#858585',
    promptColor: '#CCCCCC',
    dots: false,
    defaultTitle: 'Terminal',
  },
  powershell: {
    bg: '#012456',
    text: '#FFFFFF',
    headerBg: '#0A326E',
    headerText: '#E0E7FF',
    promptColor: '#FBBF24',
    dots: false,
    defaultTitle: 'Windows PowerShell',
  },
  cmd: {
    bg: '#0C0C0C',
    text: '#CCCCCC',
    headerBg: '#1F1F1F',
    headerText: '#FFFFFF',
    promptColor: '#CCCCCC',
    dots: false,
    defaultTitle: 'Command Prompt',
  },
  ubuntu: {
    bg: '#300A24',
    text: '#FFFFFF',
    headerBg: '#3E1030',
    headerText: '#DFDBDF',
    promptColor: '#4ADE80',
    dots: true,
    defaultTitle: 'user@ubuntu: ~',
  },
  macos: {
    bg: '#181818',
    text: '#F3F4F6',
    headerBg: '#282828',
    headerText: '#9CA3AF',
    promptColor: '#38BDF8',
    dots: true,
    defaultTitle: 'Terminal — zsh — 80×24',
  },
  mysql: {
    bg: '#0C0C0C',
    text: '#E5E7EB',
    headerBg: '#1F1F1F',
    headerText: '#F3F4F6',
    promptColor: '#38BDF8',
    dots: false,
    defaultTitle: 'Administrator: MySQL 8.4 Command Line Client',
  },
};

/**
 * Procedurally draws a high-resolution (retina 2x) terminal screenshot in Node.js
 * matching authentic VS Code or terminal themes with real stdout and prompt.
 */
export function renderServerTerminalScreenshot(options: ServerTerminalOptions): Buffer {
  ensureTerminalFontsRegistered();

  const {
    style = 'vscode',
    promptLocation,
    command = '',
    outputLines = [],
    windowTitle,
    width = 780,
    databaseName = 'ASSIGNMENT_DB',
    isSql = false,
  } = options;

  const currentTheme = THEMES[style] || THEMES.vscode;
  const isVsCode = style === 'vscode';
  const title = windowTitle || (isSql ? `MySQL 8.4 Monitor [${databaseName}]` : currentTheme.defaultTitle);

  // Line metrics
  const lineHeight = 22;
  const headerHeight = 35;
  const padding = 16;

  // Build the lines to display
  const displayLines: { text: string; color?: string; isPrompt?: boolean }[] = [];

  const effectivePrompt = promptLocation?.trim() || (
    style === 'powershell'
      ? 'PS D:\\ajeet\\program\\DBMS>'
      : style === 'cmd'
      ? 'C:\\Users\\Ajeet\\Desktop\\DSA>'
      : style === 'ubuntu'
      ? 'ajeet@pc:~/programs$'
      : style === 'macos'
      ? 'ajeet@MacBook-Pro ~ %'
      : isVsCode
      ? 'PS E:\\drive\\Semester 3\\DSA assignment>'
      : 'PS D:\\assignments>'
  );

  if (isSql || style === 'mysql') {
    // MySQL Monitor Header Banner
    displayLines.push({
      text: 'Enter password: ****',
      color: '#9CA3AF',
    });
    displayLines.push({
      text: 'Welcome to the MySQL monitor. Commands end with ; or \\g.',
      color: currentTheme.text,
    });
    displayLines.push({
      text: `Server version: 8.4.11 MySQL Community Server - GPL [Database: ${databaseName}]`,
      color: currentTheme.text,
    });
    displayLines.push({ text: '', color: currentTheme.text });

    if (command) {
      const qLines = command.trim().split('\n');
      qLines.forEach((ql, idx) => {
        displayLines.push({
          text: (idx === 0 ? 'mysql> ' : '    -> ') + ql,
          color: '#38BDF8',
          isPrompt: true,
        });
      });
    }

    outputLines.forEach((ol) => {
      let color = currentTheme.text;
      if (ol.startsWith('+') || ol.startsWith('|')) {
        color = '#E5E7EB'; // ASCII table borders
      } else if (ol.includes('row in set') || ol.includes('rows in set') || ol.includes('Query OK')) {
        color = '#34D399'; // Emerald success
      } else if (ol.toLowerCase().includes('error')) {
        color = '#F87171'; // Red error
      }
      displayLines.push({ text: ol, color });
    });
  } else {
    // Standard terminal shell (VS Code / PowerShell / Ubuntu / CMD / macOS)
    if (command) {
      displayLines.push({
        text: `${effectivePrompt} ${command}`,
        color: currentTheme.promptColor,
        isPrompt: true,
      });
    } else {
      displayLines.push({
        text: effectivePrompt,
        color: currentTheme.promptColor,
        isPrompt: true,
      });
    }

    outputLines.forEach((line) => {
      let color = currentTheme.text;
      if (line.toLowerCase().includes('error:') || line.toLowerCase().includes('exception')) {
        color = '#F87171';
      } else if (line.toLowerCase().includes('warning:')) {
        color = '#FBBF24';
      } else if (line.startsWith('---') || line.startsWith('===')) {
        color = '#858585';
      }
      displayLines.push({ text: line, color });
    });
  }

  // Calculate height (including trailing prompt line for VS Code)
  const trailingLines = isVsCode ? 2 : 1;
  const totalContentHeight = (displayLines.length + trailingLines) * lineHeight;
  const height = headerHeight + padding * 2 + totalContentHeight;

  // 2x Retina canvas
  const dpr = 2;
  const canvas = createCanvas(width * dpr, height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // 1. Terminal Window Background
  const radius = 8;
  ctx.fillStyle = currentTheme.bg;
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(0, 0, width, height, radius);
  } else {
    ctx.rect(0, 0, width, height);
  }
  ctx.fill();

  // Subtle border
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.stroke();

  // 2. Header Bar Chrome
  ctx.fillStyle = currentTheme.headerBg;
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(0, 0, width, headerHeight, [radius, radius, 0, 0]);
  } else {
    ctx.rect(0, 0, width, headerHeight);
  }
  ctx.fill();

  // Bottom separator line of header
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, headerHeight);
  ctx.lineTo(width, headerHeight);
  ctx.stroke();

  if (isVsCode) {
    // Exact VS Code Panel Tabs
    const tabs = ['Problems', 'Output', 'Debug Console', 'Terminal', 'Ports', 'Query Results'];
    let tx = 16;
    ctx.font = '500 11.5px TerminalHeader, -apple-system, sans-serif';

    tabs.forEach((tab) => {
      const isTerminal = tab === 'Terminal';
      ctx.fillStyle = isTerminal ? '#FFFFFF' : '#858585';
      ctx.fillText(tab, tx, 22);
      const tw = ctx.measureText(tab).width;
      if (isTerminal) {
        // Active tab underline in VS Code blue
        ctx.strokeStyle = '#007ACC';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tx, headerHeight - 1);
        ctx.lineTo(tx + tw, headerHeight - 1);
        ctx.stroke();
      }
      tx += tw + 18;
    });

    // Right-side badge (e.g. >_ Code - DSA assignment 7)
    const badgeRaw = windowTitle ? `Code - ${windowTitle}` : 'Code - Solution';
    const badgeText = `>_ ${badgeRaw.slice(0, 24)}`;
    ctx.font = '11px TerminalHeader, -apple-system, sans-serif';
    const bw = ctx.measureText(badgeText).width;
    const bx = width - bw - 118;

    ctx.fillStyle = '#252526';
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(bx, 6, bw + 18, 22, 4);
    } else {
      ctx.rect(bx, 6, bw + 18, 22);
    }
    ctx.fill();

    ctx.fillStyle = '#CCCCCC';
    ctx.fillText(badgeText, bx + 7, 21);

    // Right-side VS Code panel action icons
    const icons = ['+', '◫', '🗑', '⋯', '✕'];
    let ix = width - 86;
    ctx.fillStyle = '#858585';
    ctx.font = '12px TerminalHeader, -apple-system, sans-serif';
    icons.forEach((ic) => {
      ctx.fillText(ic, ix, 22);
      ix += 16;
    });
  } else {
    // Window dots for macOS/Ubuntu
    if (currentTheme.dots) {
      const dots = ['#FF5F56', '#FFBD2E', '#27C93F'];
      dots.forEach((dotColor, i) => {
        ctx.beginPath();
        ctx.arc(18 + i * 16, headerHeight / 2, 5, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();
      });
    }

    // Header Title
    ctx.fillStyle = currentTheme.headerText;
    ctx.font = '600 12px TerminalHeader, -apple-system, sans-serif';
    ctx.textAlign = currentTheme.dots ? 'center' : 'left';
    ctx.fillText(title, currentTheme.dots ? width / 2 : 18, headerHeight / 2 + 4);
  }

  // 3. Render Terminal Output Lines
  ctx.textAlign = 'left';
  ctx.font = '13px TerminalMono, Consolas, Monaco, monospace';

  let currentY = headerHeight + padding + 14;

  if (isVsCode) {
    for (const line of displayLines) {
      if (line.isPrompt) {
        // Gutter indicator circle
        ctx.fillStyle = '#858585';
        ctx.fillText('o', 14, currentY);
      }
      ctx.fillStyle = line.color || currentTheme.text;
      ctx.fillText(line.text, 28, currentY);
      currentY += lineHeight;
    }

    // Trailing prompt line with blinking block cursor (Exact match with user's VS Code screenshot)
    currentY += 4;
    ctx.fillStyle = '#858585';
    ctx.fillText('o', 14, currentY);
    ctx.fillStyle = currentTheme.text;
    ctx.fillText(effectivePrompt + ' ', 28, currentY);
    const pWidth = ctx.measureText(effectivePrompt + ' ').width;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('█', 28 + pWidth, currentY);
  } else {
    for (const line of displayLines) {
      ctx.fillStyle = line.color || currentTheme.text;
      ctx.fillText(line.text, padding, currentY);
      currentY += lineHeight;
    }
  }

  return canvas.toBuffer('image/png');
}

/**
 * Returns PNG Data URL for embedding in DOCX or HTML
 */
export function renderServerTerminalDataUrl(options: ServerTerminalOptions): string {
  const buf = renderServerTerminalScreenshot(options);
  return `data:image/png;base64,${buf.toString('base64')}`;
}
