// Use /*svg*/ before a template literal to get a "Preview SVG" code lens and gutter icon.
// Click to open the SVG preview to the side. If the template has variables (e.g. ${width}),
// the preview tab will show inputs to try different values.

const width = 100;
const height = 100;
const boxWidth = 80;
const color = "steelblue";
const stroke = "black";

const simple = /*svg*/ `
  <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="40" fill="steelblue"/>
  </svg>
`;

const withVariables = /*svg*/ `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 200 100">
    <rect x="10" y="10" width="${boxWidth}" height="80" fill="${color}" stroke="${stroke}" stroke-width="2"/>
  </svg>
`;
