import * as vscode from "vscode";
import { findSvgTemplates } from "./svgDetection.js";
import { openSvgPreview } from "./preview.js";

const PREVIEW_CMD = "tsvg-preview.previewSvg";

export function registerSvgPreviewFeatures(
  context: vscode.ExtensionContext,
): void {
  const selector: vscode.DocumentSelector = [
    { language: "typescript" },
    { language: "javascript" },
    { language: "typescriptreact" },
    { language: "javascriptreact" },
  ];

  const codeLensProvider: vscode.CodeLensProvider = {
    provideCodeLenses(
      document: vscode.TextDocument,
    ): vscode.ProviderResult<vscode.CodeLens[]> {
      const matches = findSvgTemplates(document);
      return matches.map((match) => {
        const line = document.lineAt(match.line);
        const range = new vscode.Range(
          match.line,
          0,
          match.line,
          line.text.length,
        );
        return new vscode.CodeLens(range, {
          title: "$(eye) Preview SVG",
          command: PREVIEW_CMD,
          arguments: [document.uri.toString(), match.line],
        });
      });
    },
  };

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(selector, codeLensProvider),
    vscode.commands.registerCommand(
      PREVIEW_CMD,
      async (uriStr?: string, line?: number) => {
        const editor = vscode.window.activeTextEditor;
        const document = uriStr
          ? await vscode.workspace.openTextDocument(vscode.Uri.parse(uriStr))
          : editor?.document;

        if (!document) {
          vscode.window.showWarningMessage(
            "Open a TypeScript or JavaScript file with a /*svg*/ template first.",
          );
          return;
        }

        const matches = findSvgTemplates(document);
        if (matches.length === 0) {
          vscode.window.showWarningMessage(
            "No SVG template found. Add /*svg*/ (or /* svg */) immediately before a template literal containing SVG.",
          );
          return;
        }

        let match: (typeof matches)[0];
        if (typeof line === "number") {
          match = matches.find((m) => m.line === line) ?? matches[0];
        } else if (editor && document === editor.document) {
          const cursorLine = editor.selection.active.line;
          match = matches.find((m) => m.line === cursorLine) ?? matches[0];
        } else {
          match = matches[0];
        }

        openSvgPreview(context, document, match, vscode.ViewColumn.Beside);
      },
    ),
  );
}
