/**
 * Mermaid Diagram Sanitizer & Syntax Auto-Fixer
 * Solves common LLM-generated Mermaid parsing errors in Mermaid 12+:
 * 1. Unquoted node labels with parentheses, inner brackets (e.g. M[AR], M[MAR])
 * 2. Unicode arrows (→, ←) instead of standard ASCII arrows (-->)
 * 3. Unescaped quotes, colons, or special characters in node text
 * 4. Missing diagram header (e.g. flowchart TD)
 */

/**
 * Sanitizes and auto-fixes Mermaid diagram code so it parses reliably
 */
export function sanitizeMermaidCode(rawCode: string): string {
  if (!rawCode || !rawCode.trim()) {
    return 'flowchart TD\n  Start([Start]) --> Process[Process Component]\n  Process --> End([Complete])';
  }

  let code = rawCode.trim();

  // Strip markdown code fences if present
  code = code.replace(/^```(?:mermaid)?\s*/i, '').replace(/```\s*$/i, '').trim();

  // 1. Ensure valid diagram header
  const knownHeaders = /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey)/i;
  const lines = code.split('\n');
  const firstNonEmpty = lines.find((l) => l.trim().length > 0) || '';

  if (!knownHeaders.test(firstNonEmpty.trim())) {
    code = `flowchart TD\n${code}`;
  }

  // 2. Normalize line by line
  const sanitizedLines = code.split('\n').map((line) => {
    let l = line;

    // Skip comment lines and pure directive lines
    if (l.trim().startsWith('%%') || l.trim().startsWith('subgraph') || l.trim() === 'end') {
      return l;
    }

    // Fix unquoted node definitions with inner brackets:
    // e.g. Fetch[Fetch: AR <- PC, IR <- M[AR]]
    // Pattern: NodeId [ ... [ ... ] ... ]
    l = l.replace(
      /([a-zA-Z0-9_\-]+)\s*\[([^\]\n]*\[[^\]\n]*\][^\]\n]*)\]/g,
      (_match, id, inner) => {
        // Replace inner brackets with parentheses to prevent parser collision
        const cleanInner = inner
          .replace(/\[/g, '(')
          .replace(/\]/g, ')')
          .replace(/"/g, "'")
          .replace(/→/g, '->')
          .replace(/←/g, '<-');
        return `${id}["${cleanInner.trim()}"]`;
      }
    );

    // Fix standard square-bracket nodes that contain special characters without quotes:
    // e.g. DP[Data Path (ALU, Registers, Bus)] or T1[ T1: Memory Read (M[MAR]) -> MBR ]
    l = l.replace(
      /([a-zA-Z0-9_\-]+)\s*\[([^"\n\]]+)\]/g,
      (match, id, inner) => {
        const trimmed = inner.trim();
        // If it already starts and ends with double quotes, leave it
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
          return match;
        }

        // Check if inner content contains characters requiring quotes
        const needsQuotes = /[:,\(\)\[\]<>&+\-*\/\\;%#=→←]/.test(trimmed);
        if (needsQuotes) {
          const clean = trimmed
            .replace(/\[/g, '(')
            .replace(/\]/g, ')')
            .replace(/"/g, "'")
            .replace(/→/g, '->')
            .replace(/←/g, '<-');
          return `${id}["${clean}"]`;
        }
        return match;
      }
    );

    // Fix stadium nodes with unquoted special characters: e.g. ID([Label with (parens)])
    l = l.replace(
      /([a-zA-Z0-9_\-]+)\s*\(\[([^"\n\]]+)\]\)/g,
      (match, id, inner) => {
        const trimmed = inner.trim();
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) return match;
        const clean = trimmed.replace(/"/g, "'").replace(/→/g, '->').replace(/←/g, '<-');
        return `${id}(["${clean}"])`;
      }
    );

    // Replace unicode arrows in connectors outside node brackets: e.g. A → B becomes A --> B
    l = l.replace(/\s*→\s*/g, ' --> ');
    l = l.replace(/\s*←\s*/g, ' <-- ');
    l = l.replace(/\s*↔\s*/g, ' <--> ');

    return l;
  });

  return sanitizedLines.join('\n');
}

/**
 * Generates an SVG flowchart fallback when Mermaid rendering encounters fatal parsing syntax errors
 */
export function generateFallbackFlowchartSvg(code: string, _errorReason?: string): string {
  // Extract potential node labels from the code
  const rawNodes: string[] = [];
  const lines = code.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('flowchart') || trimmed.startsWith('graph') || trimmed.startsWith('%%') || trimmed.startsWith('subgraph') || trimmed === 'end') {
      continue;
    }
    // Extract labels inside quotes or brackets
    const matches = Array.from(trimmed.matchAll(/(?:\["|\[)([^"\]\n]{3,})(?:"\]|\])/g));
    for (const m of matches) {
      if (m[1] && !rawNodes.includes(m[1].trim())) {
        rawNodes.push(m[1].trim().slice(0, 50));
      }
    }
    // If no bracket matches, extract step lines like "Step 1: Fetch instruction" or "Fetch instruction"
    if (matches.length === 0) {
      const stepClean = trimmed
        .replace(/^step\s*\d+\s*[:.-]\s*/i, '')
        .replace(/^\d+[\.\)]\s*/, '')
        .replace(/^[-*•]\s*/, '')
        .trim();
      if (stepClean.length >= 3 && stepClean.length <= 60 && !rawNodes.includes(stepClean)) {
        rawNodes.push(stepClean);
      }
    }
  }

  const nodes = rawNodes.length >= 2 ? rawNodes : [
    'Fetch: Instruction fetched from memory',
    'Decode: Opcode decoded by Control Unit',
    'Execute: ALU computation & Register writeback',
  ];

  const nodeHeight = 44;
  const gap = 34;
  const totalHeight = nodes.length * (nodeHeight + gap) + 60;
  const width = 640;

  const nodeElements = nodes
    .map((label, idx) => {
      const y = 30 + idx * (nodeHeight + gap);
      const isFirst = idx === 0;
      const isLast = idx === nodes.length - 1;
      const rx = isFirst || isLast ? 22 : 8;
      const fill = isFirst ? '#EEF2FF' : isLast ? '#F0FDF4' : '#FFFFFF';
      const stroke = isFirst ? '#1F3A8A' : isLast ? '#15803D' : '#6B7280';
      const textColor = isFirst ? '#1F3A8A' : isLast ? '#15803D' : '#111827';

      const arrow =
        idx < nodes.length - 1
          ? `
          <line x1="${width / 2}" y1="${y + nodeHeight}" x2="${width / 2}" y2="${
              y + nodeHeight + gap
            }" stroke="#6B7280" stroke-width="1.8" marker-end="url(#arrowhead)" />
        `
          : '';

      return `
        <g class="flow-node">
          <rect x="70" y="${y}" width="${width - 140}" height="${nodeHeight}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />
          <text x="${width / 2}" y="${y + 27}" font-family="system-ui, -apple-system, sans-serif" font-size="12.5" font-weight="600" fill="${textColor}" text-anchor="middle">
            ${escapeXml(label)}
          </text>
          ${arrow}
        </g>
      `;
    })
    .join('');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${totalHeight}" width="100%" height="${totalHeight}">
      <defs>
        <marker id="arrowhead" markerWidth="9" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 9 3, 0 6" fill="#6B7280" />
        </marker>
      </defs>
      <rect width="100%" height="100%" fill="#FAF8F5" rx="12" />
      ${nodeElements}
    </svg>
  `.trim();
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
