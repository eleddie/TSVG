# tsvg-preview

Preview SVG inside TypeScript and JavaScript template literals. Mark a template with `/*svg*/` before the opening backtick to get a live preview in a side tab—with optional inputs for variables and sensible default values.

## Features

- **Live SVG preview** – Mark any template literal with `/*svg*/` (or `/* svg */`) immediately before the backtick. A **Preview SVG** code lens and a gutter icon appear on that line. Click either to open the SVG in a side preview tab.
- **Variable inputs** – If the template uses interpolations like `${width}` or `${color}`, the preview tab shows a text input for each. Edit values to see the SVG update in real time.
- **Smart defaults** – Defaults are inferred from how variables are used (e.g. in `width`, `fill`, `stroke`). Numbers get values like `100` or `50`; colors get `#3366cc`; coordinates and radius get sensible defaults.

## How to use

1. In a `.ts`, `.tsx`, `.js`, or `.jsx` file, add `/*svg*/` right before the opening backtick of a template literal that contains SVG.
2. Use the **Preview SVG** code lens above the line or the eye icon in the gutter to open the preview.
3. Or run **Preview SVG** from the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) with the cursor on a line that has a `/*svg*/` template.

### Example

```ts
// Simple SVG
const icon = /*svg*/ `
  <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="40" fill="steelblue"/>
  </svg>
`;

// With variables – preview shows inputs with inferred defaults
const badge = /*svg*/ `
  <svg width="${width}" height="${height}" viewBox="0 0 200 100">
    <rect x="10" y="10" width="${boxWidth}" height="80" fill="${color}" stroke="${stroke}" stroke-width="2"/>
  </svg>
`;
```

## Supported languages

TypeScript, JavaScript, TSX, and JSX.

## Requirements

- VS Code ^1.105.0

## Publishing

Add a `.env` file in the project root (see `.env.example`) with:

- **ACCESS_TOKEN_VSC** – VS Code Marketplace PAT from [Azure DevOps](https://dev.azure.com/) (Marketplace → Manage scope).
- **ACCESS_TOKEN_OPEN_VSX** – Token from [Open VSX user settings](https://open-vsx.org/user-settings/tokens).

Then:

```bash
yarn publish:all      # publish to both marketplaces
yarn publish:vscode   # VS Code Marketplace only
yarn publish:openvsx  # Open VSX only
```

## Release Notes

### 0.0.1

Initial release:

- Preview SVG from `/*svg*/`-marked template literals
- Code lens and gutter icon to open preview
- Variable inputs in preview with inferred default values (numbers, colors, coordinates, etc.)
