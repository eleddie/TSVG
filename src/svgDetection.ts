import * as vscode from 'vscode';

// Matches /*svg*/ or /* svg */ etc., then optional whitespace, then opening backtick
const SVG_MARKER = new RegExp('/\\*\\s*svg\\s*\\*/\\s*`');

/** Matches ${...} - captures the expression inside */
const INTERPOLATION = /\$\{([^}]*)\}/g;

export interface SvgTemplateMatch {
  /** Range of the entire template literal (from opening backtick to closing backtick) */
  range: vscode.Range;
  /** Line where the svg marker comment starts (for gutter/code lens) */
  line: number;
  /** Raw template literal content including ${...} placeholders */
  rawContent: string;
  /** Unique variable expressions found in the template (e.g. width, height, color) */
  variables: string[];
}

/**
 * Find all template literals marked with the svg comment (slash-star svg star-slash) before the backtick.
 * Returns matches with range, raw content, and list of variable names from ${...}.
 */
export function findSvgTemplates(document: vscode.TextDocument): SvgTemplateMatch[] {
  const text = document.getText();
  const matches: SvgTemplateMatch[] = [];
  let pos = 0;

  while (true) {
    const markerMatch = text.slice(pos).match(SVG_MARKER);
    if (!markerMatch || markerMatch.index === undefined) {
      break;
    }

    const startOffset = pos + markerMatch.index;
    // Opening backtick is at the end of the match
    const backtickStart = startOffset + markerMatch[0].length;
    const afterOpen = backtickStart;

    // Find closing backtick (unescaped). Template literals can contain \` and \${.
    let i = afterOpen;
    let depth = 0;
    while (i < text.length) {
      const c = text[i];
      if (c === '\\') {
        i += 2; // skip next char
        continue;
      }
      if (c === '`') {
        break;
      }
      if (c === '$' && text[i + 1] === '{') {
        i += 2;
        depth++;
        continue;
      }
      if (c === '}' && depth > 0) {
        depth--;
      }
      i++;
    }

    if (i >= text.length) {
      break; // no closing backtick
    }

    const rawContent = text.slice(afterOpen, i);
    const variables = extractVariableNames(rawContent);

    const startPos = document.positionAt(afterOpen);
    const endPos = document.positionAt(i);
    const line = document.positionAt(startOffset).line;

    matches.push({
      range: new vscode.Range(startPos, endPos),
      line,
      rawContent,
      variables,
    });

    pos = i + 1;
  }

  return matches;
}

function extractVariableNames(content: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  let m: RegExpExecArray | null;
  INTERPOLATION.lastIndex = 0;
  while ((m = INTERPOLATION.exec(content)) !== null) {
    const expr = m[1].trim();
    if (expr && !seen.has(expr)) {
      seen.add(expr);
      names.push(expr);
    }
  }
  return names;
}

/**
 * Substitute ${expr} placeholders in template content with values from a record.
 */
export function substituteVariables(
  rawContent: string,
  values: Record<string, string>
): string {
  return rawContent.replace(INTERPOLATION, (_, expr) => {
    const key = expr.trim();
    return key in values ? values[key] : '';
  });
}
