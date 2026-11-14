import { createCanvas } from '@napi-rs/canvas';

export type TerminalStyle = 'vscode' | 'powershell' | 'cmd' | 'ubuntu' | 'macos' | 'mysql';

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
    bg: '#1E1E1E',
    text: '#CCCCCC',
    headerBg: '#252526',
    headerText: '#969696',
    promptColor: '#4ADE80',
    dots: false,
    defaultTitle: 'Terminal: bash — YourAssignment Studio',
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
 * matching the user's selected style, prompt location, and real stdout.
 */
export function renderServerTerminalScreenshot(options: ServerTerminalOptions): Buffer {
  const {
    style = 'vscode',
    promptLocation,
    command = '',
    outputLines = [],
    windowTitle,
    width = 720,
    databaseName = 'ASSIGNMENT_DB',
    isSql = false,
  } = options;

  const currentTheme = THEMES[style] || THEMES.vscode;
  const title = windowTitle || (isSql ? `MySQL 8.4 Monitor [${databaseName}]` : currentTheme.defaultTitle);

  // Line metrics
  const lineHeight = 22;
  const headerHeight = 36;
  const padding = 20;

  // Build the lines to display
  const displayLines: { text: string; color?: string; isPrompt?: boolean }[] = [];

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
    // Standard terminal shell (PowerShell / Ubuntu / CMD / VS Code / macOS)
    const effectivePrompt = promptLocation?.trim() || (
      style === 'powershell'
        ? 'PS D:\\ajeet\\program\\DBMS>'
        : style === 'cmd'
        ? 'C:\\Users\\Ajeet\\Desktop\\DSA>'
        : style === 'ubuntu'
        ? 'ajeet@pc:~/programs$'
        : style === 'macos'
        ? 'ajeet@MacBook-Pro ~ %'
        : 'PS D:\\assignments>'
    );

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
      }
      displayLines.push({ text: line, color });
    });
  }

  // Calculate height
  const totalContentHeight = (displayLines.length + 1) * lineHeight;
  const height = headerHeight + padding * 2 + totalContentHeight;

  // 2x Retina canvas
  const dpr = 2;
  const canvas = createCanvas(width * dpr, height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // 1. Terminal Window Background
  const radius = 10;
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
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.stroke();

  // 2. Header Bar
  ctx.fillStyle = currentTheme.headerBg;
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(0, 0, width, headerHeight, [radius, radius, 0, 0]);
  } else {
    ctx.rect(0, 0, width, headerHeight);
  }
  ctx.fill();

  // Window dots
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
  ctx.font = '600 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, width / 2, headerHeight / 2 + 4);

  // 3. Render Terminal Output Lines
  ctx.textAlign = 'left';
  ctx.font = '13px Consolas, Monaco, monospace';

  let currentY = headerHeight + padding + 14;
  for (const line of displayLines) {
    ctx.fillStyle = line.color || currentTheme.text;
    ctx.fillText(line.text, padding, currentY);
    currentY += lineHeight;
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
