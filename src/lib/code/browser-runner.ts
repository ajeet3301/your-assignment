/**
 * In-Browser Code Execution Runner
 * Runs JavaScript safely via Web Worker sandbox.
 * Runs Python via Pyodide CDN when requested.
 * Everything is transparently labelled "Executed in browser" or "Simulated".
 */

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  runtimeMs: number;
  mode: 'executed-browser' | 'simulated';
  language: string;
}

export async function runJavaScriptInBrowser(code: string): Promise<ExecutionResult> {
  const startTime = performance.now();

  return new Promise((resolve) => {
    // Isolated worker script as a blob
    const workerScript = `
      self.onmessage = function(e) {
        let stdout = [];
        let stderr = [];
        
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;

        console.log = function(...args) {
          stdout.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
        };
        console.error = function(...args) {
          stderr.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
        };
        console.warn = console.log;

        try {
          const fn = new Function(e.data);
          const result = fn();
          if (result !== undefined && stdout.length === 0) {
            stdout.push(String(result));
          }
          self.postMessage({ stdout: stdout.join('\\n'), stderr: stderr.join('\\n'), exitCode: 0 });
        } catch (err) {
          stderr.push(String(err));
          self.postMessage({ stdout: stdout.join('\\n'), stderr: stderr.join('\\n'), exitCode: 1 });
        }
      };
    `;

    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));

    const timeout = setTimeout(() => {
      worker.terminate();
      resolve({
        stdout: '',
        stderr: 'Execution timed out after 3000ms',
        exitCode: 124,
        runtimeMs: Math.round(performance.now() - startTime),
        mode: 'executed-browser',
        language: 'javascript',
      });
    }, 3000);

    worker.onmessage = (e) => {
      clearTimeout(timeout);
      worker.terminate();
      resolve({
        stdout: e.data.stdout || '',
        stderr: e.data.stderr || '',
        exitCode: e.data.exitCode,
        runtimeMs: Math.round(performance.now() - startTime),
        mode: 'executed-browser',
        language: 'javascript',
      });
    };

    worker.onerror = (err) => {
      clearTimeout(timeout);
      worker.terminate();
      resolve({
        stdout: '',
        stderr: err.message,
        exitCode: 1,
        runtimeMs: Math.round(performance.now() - startTime),
        mode: 'executed-browser',
        language: 'javascript',
      });
    };

    worker.postMessage(code);
  });
}

/**
 * Executes Python in-browser via Pyodide CDN or lightweight fallback
 */
export async function runPythonInBrowser(code: string): Promise<ExecutionResult> {
  const startTime = performance.now();

  try {
    // If Pyodide is loaded on window
    const win = window as any;
    if (!win.loadPyodide) {
      // Dynamically load Pyodide script
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Pyodide runtime from CDN'));
        document.head.appendChild(script);
      });
    }

    if (!win.__pyodideInstance) {
      win.__pyodideInstance = await win.loadPyodide({
        stdout: (text: string) => {
          if (!win.__pyodideStdout) win.__pyodideStdout = [];
          win.__pyodideStdout.push(text);
        },
      });
    }

    const pyodide = win.__pyodideInstance;
    win.__pyodideStdout = [];

    const result = await pyodide.runPythonAsync(code);
    const stdout = (win.__pyodideStdout || []).join('\n') || (result !== undefined ? String(result) : '');

    return {
      stdout,
      stderr: '',
      exitCode: 0,
      runtimeMs: Math.round(performance.now() - startTime),
      mode: 'executed-browser',
      language: 'python',
    };
  } catch (err: any) {
    return {
      stdout: '',
      stderr: err.message || 'Python execution failed',
      exitCode: 1,
      runtimeMs: Math.round(performance.now() - startTime),
      mode: 'executed-browser',
      language: 'python',
    };
  }
}
