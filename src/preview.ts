import * as fs from "node:fs";
import * as vscode from "vscode";
import { findSvgTemplates, type SvgTemplateMatch } from "./svgDetection.js";

const VIEW_TYPE = "tsvg-preview";

// Attribute names that typically take numeric values (normalized: lower case, no hyphens)
const NUMERIC_ATTRS = new Set([
  "width",
  "height",
  "size",
  "r",
  "rx",
  "ry",
  "cx",
  "cy",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "strokewidth",
  "strokedasharray",
  "opacity",
  "fontsize",
  "padding",
  "margin",
  "offset",
  "stopopacity",
  "floodopacity",
]);
// Variable names that suggest number (normalized)
const NUMERIC_VAR_NAMES = new Set([
  "width",
  "height",
  "size",
  "w",
  "h",
  "r",
  "radius",
  "cx",
  "cy",
  "x",
  "y",
  "strokewidth",
  "opacity",
  "fontsize",
]);
// Attributes and variable names that suggest color (normalized)
const COLOR_ATTRS = new Set([
  "fill",
  "stroke",
  "color",
  "stopcolor",
  "floodcolor",
]);
const COLOR_VAR_NAMES = new Set([
  "fill",
  "stroke",
  "color",
  "bg",
  "background",
  "fg",
  "foreground",
]);

/** Find which SVG attribute names each variable appears in (e.g. width="${w}" → w in ["width"]) */
function getVariableContexts(
  rawContent: string,
  variables: string[],
): Record<string, string[]> {
  const contexts: Record<string, string[]> = {};
  for (const v of variables) {
    contexts[v] = [];
  }
  // Match attr="${var}" or attr='${var}' (attribute name may contain hyphens)
  const re = /([\w-]+)=["']\s*\$\{\s*([^}]+)\s*\}\s*["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rawContent)) !== null) {
    const expr = m[2].trim();
    if (expr && expr in contexts) {
      const list = contexts[expr];
      if (!list.includes(m[1])) {
        list.push(m[1]);
      }
    }
  }
  return contexts;
}

function inferDefaultValue(varName: string, attributeNames: string[]): string {
  const attrs = attributeNames.map((a) => a.toLowerCase().replace(/-/g, ""));
  const name = varName.toLowerCase().replace(/-/g, "");

  const looksNumeric = () =>
    attrs.some((a) => NUMERIC_ATTRS.has(a)) || NUMERIC_VAR_NAMES.has(name);
  const looksColor = () =>
    attrs.some((a) => COLOR_ATTRS.has(a)) || COLOR_VAR_NAMES.has(name);

  if (looksColor()) {
    return "#3366cc";
  }
  if (looksNumeric()) {
    if (name === "opacity" || attrs.includes("opacity")) {
      return "1";
    }
    if (
      ["x", "y", "x1", "y1", "x2", "y2", "cx", "cy"].includes(name) ||
      attrs.some((a) =>
        ["x", "y", "cx", "cy", "x1", "y1", "x2", "y2"].includes(a),
      )
    ) {
      return "50";
    }
    if (name === "r" || name === "radius" || attrs.includes("r")) {
      return "40";
    }
    if (name === "strokewidth" || attrs.some((a) => a === "strokewidth")) {
      return "2";
    }
    return "100";
  }
  return "";
}

/** Escape a string for safe embedding inside a single-quoted JavaScript string and to avoid closing </script> */
function escapeForJsString(s: string): string {
  return s
    .replaceAll("\\", String.raw`\\`)
    .replaceAll("'", String.raw`\'`)
    .replaceAll("\r", String.raw`\r`)
    .replaceAll("\n", String.raw`\n`)
    .replaceAll("\u2028", String.raw`\u2028`)
    .replaceAll("\u2029", String.raw`\u2029`)
    .replaceAll(/<\/script>/gi, String.raw`<\/script>`);
}

function getPreviewHtml(
  context: vscode.ExtensionContext,
  match: SvgTemplateMatch,
  initialValues: Record<string, string>,
): string {
  const vars = match.variables;
  const varsJson = escapeForJsString(JSON.stringify(vars));
  const valuesJson = escapeForJsString(JSON.stringify(initialValues));
  const rawContentJson = escapeForJsString(JSON.stringify(match.rawContent));

  const inputsHtml = vars.length
    ? `
    <div class="inputs">
      <h3>Variables</h3>
      <div class="input-list" id="inputList"></div>
    </div>
  `
    : "";

  const templateUri = vscode.Uri.joinPath(
    context.extensionUri,
    "media",
    "preview.html",
  );
  const template = fs.readFileSync(templateUri.fsPath, "utf-8");
  return template
    .replace("{{INPUTS_HTML}}", inputsHtml)
    .replace("{{VARS_JSON}}", varsJson)
    .replace("{{VALUES_JSON}}", valuesJson)
    .replace("{{RAW_CONTENT_JSON}}", rawContentJson);
}

export function openSvgPreview(
  context: vscode.ExtensionContext,
  document: vscode.TextDocument,
  match: SvgTemplateMatch,
  viewColumn: vscode.ViewColumn = vscode.ViewColumn.Beside,
): void {
  const contexts = getVariableContexts(match.rawContent, match.variables);
  const initialValues: Record<string, string> = {};
  for (const v of match.variables) {
    initialValues[v] = inferDefaultValue(v, contexts[v] ?? []);
  }

  const title = `SVG Preview: ${document.uri.path.split("/").pop()}:${match.line + 1}`;
  const panel = vscode.window.createWebviewPanel(VIEW_TYPE, title, viewColumn, {
    enableScripts: true,
    retainContextWhenHidden: true,
  });

  panel.webview.html = getPreviewHtml(context, match, initialValues);

  const documentUri = document.uri.toString();
  const matchLine = match.line;

  const docListener = vscode.workspace.onDidChangeTextDocument((e) => {
    if (e.document.uri.toString() !== documentUri) {
      return;
    }
    const matches = findSvgTemplates(e.document);
    const updated = matches.find((m) => m.line === matchLine) ?? matches[0];
    if (!updated) {
      panel.webview.postMessage({
        type: "update",
        rawContent: "",
        variables: [],
        defaultValues: {},
      });
      return;
    }
    const contexts = getVariableContexts(updated.rawContent, updated.variables);
    const defaultValues: Record<string, string> = {};
    for (const v of updated.variables) {
      defaultValues[v] = inferDefaultValue(v, contexts[v] ?? []);
    }
    panel.webview.postMessage({
      type: "update",
      rawContent: updated.rawContent,
      variables: updated.variables,
      defaultValues,
    });
  });

  panel.onDidDispose(() => docListener.dispose());
}
