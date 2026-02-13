import * as vscode from 'vscode';
import { registerSvgPreviewFeatures } from './svgCodeLensProvider.js';

export function activate(context: vscode.ExtensionContext) {
  registerSvgPreviewFeatures(context);
}

export function deactivate() {}
