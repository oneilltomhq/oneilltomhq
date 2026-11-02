// Shared helpers for the diagram generators. Reads data.json, provides the
// colour tokens (light + dark), text-width estimation and an SVG writer that
// emits three files per variant: auto (prefers-color-scheme, the one you'd
// commit), -light and -dark (forced, for screenshots).
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const OUT = path.join(DIR, 'arc');
const data = JSON.parse(fs.readFileSync(path.join(DIR, 'data.json'), 'utf8'));

// Tokens. Family hues come from the dataviz reference palette (validated
// adjacent-pair CVD safe in both modes). Surfaces match GitHub's README.
const TOKENS = {
  light: {
    bg: 'transparent', surface: '#ffffff', ink: '#1f2328', ink2: '#59636e', ink3: '#8c959f',
    line: '#d0d7de', band: '#f6f8fa', card: '#ffffff',
    violet: '#6250d6', violetSoft: '#ebe8fb', violetInk: '#3d2fa3',
    orange: '#eda100', orangeSoft: '#fdf3dc', orangeInk: '#8a5a00',
    aqua: '#1baf7a', aquaSoft: '#e1f6ee', aquaInk: '#0f6e4c',
    grade: '#e34948', gradeSoft: '#fdebea',
    dep: '#8c959f',
  },
  dark: {
    bg: 'transparent', surface: '#0d1117', ink: '#e6edf3', ink2: '#9198a1', ink3: '#6e7681',
    line: '#30363d', band: '#161b22', card: '#161b22',
    violet: '#9085e9', violetSoft: '#1f1b3d', violetInk: '#c3bbf5',
    orange: '#c98500', orangeSoft: '#332605', orangeInk: '#f0c25a',
    aqua: '#199e70', aquaSoft: '#0f2e23', aquaInk: '#7ddcb6',
    grade: '#e66767', gradeSoft: '#3d1a1a',
    dep: '#6e7681',
  },
};

// Emit CSS custom properties for a mode.
function vars(mode) {
  return Object.entries(TOKENS[mode]).map(([k, v]) => `--${k}:${v};`).join('');
}

const FONT = `-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif`;
const MONO = `ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace`;

// Rough Helvetica width table, px per char at 1px font size.
function textWidth(s, size, weight = 400) {
  const narrow = /[iljtfI.,:;'|!\s\-]/;
  const wide = /[mwMW@]/;
  let w = 0;
  for (const ch of s) w += narrow.test(ch) ? 0.3 : wide.test(ch) ? 0.85 : /[A-Z]/.test(ch) ? 0.68 : 0.56;
  return w * size * (weight >= 600 ? 1.06 : 1);
}

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function monthLabel(m) {
  const [y, mo] = m.split('-').map(Number);
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[mo - 1]} ${y}`;
}

function familyColor(fam) {
  return { shell: 'violet', rust: 'orange', web: 'aqua' }[fam] || 'dep';
}

// Markers + base style block used by every variant.
function defs(extra = '') {
  const m = (id, color, w = 8) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="${w}" markerHeight="${w}" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M1 1 L9 5 L1 9 Z" fill="${color}"/></marker>`;
  const mo = (id, color, w = 9) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="${w}" markerHeight="${w}" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M1.5 1.5 L8.5 5 L1.5 8.5 Z" fill="var(--surface)" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/></marker>`;
  return `<defs>
  ${m('arr-violet', 'var(--violet)')}${m('arr-orange', 'var(--orange)')}${m('arr-aqua', 'var(--aqua)')}
  ${m('arr-grade', 'var(--grade)')}${mo('arr-dep', 'var(--dep)')}${m('arr-dep-solid', 'var(--dep)', 6)}
  ${extra}
</defs>`;
}

// Write the three SVG files. `body` is the inner markup, written against the
// CSS variables. `css` is extra style text.
function writeSvg(name, { width, height, body, css = '', title }) {
  const style = (mode) => {
    if (mode === 'auto') {
      return `:root{${vars('light')}}@media (prefers-color-scheme:dark){:root{${vars('dark')}}}`;
    }
    return `:root{${vars(mode)}}`;
  };
  fs.mkdirSync(OUT, { recursive: true });
  const out = {};
  for (const mode of ['auto', 'light', 'dark']) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family='${FONT}' role="img" aria-label="${esc(title || name)}">
<title>${esc(title || name)}</title>
<style>${style(mode)}
text{fill:var(--ink)}
.mono{font-family:${MONO}}
${css}</style>
${defs()}
<rect width="${width}" height="${height}" fill="var(--bg)"/>
${body}
</svg>`;
    const file = mode === 'auto' ? `${name}.svg` : `${name}-${mode}.svg`;
    fs.writeFileSync(path.join(OUT, file), svg);
    out[mode] = svg;
  }
  console.log(`wrote arc/${name}.svg (${width}x${height})`);
  return out;
}

// Cubic bezier from a to b, horizontal tangents.
function hcurve(x1, y1, x2, y2, k = 0.5) {
  const dx = (x2 - x1) * k;
  return `M${x1} ${y1} C${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`;
}
function vcurve(x1, y1, x2, y2, k = 0.5) {
  const dy = (y2 - y1) * k;
  return `M${x1} ${y1} C${x1} ${y1 + dy} ${x2} ${y2 - dy} ${x2} ${y2}`;
}

// Label with a surface-coloured halo so it stays legible on top of lines.
function haloText(x, y, s, { size = 11, fill = 'var(--ink2)', weight = 400, anchor = 'middle', cls = '' } = {}) {
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" class="${cls}" paint-order="stroke" stroke="var(--surface)" stroke-width="4" stroke-linejoin="round" fill="${fill}">${esc(s)}</text>`;
}

const byId = Object.fromEntries(data.nodes.map((n) => [n.id, n]));
// Core graph: everything with edges. Standalone projects are opt-in per variant.
const core = data.nodes.filter((n) => !n.standalone);
const coreIds = new Set(core.map((n) => n.id));
const coreEdges = data.edges.filter((e) => coreIds.has(e.from) && coreIds.has(e.to));
// Edge style attributes shared by all variants. Returns stroke attrs + marker.
function edgeStyle(e, col) {
  const faint = e.unconfirmed ? ' opacity="0.45"' : '';
  switch (e.kind) {
    case 'lineage': return `stroke="var(--${col})" stroke-width="${e.unconfirmed ? 1.6 : 2.6}" stroke-linecap="round"${e.unconfirmed ? ' stroke-dasharray="2 5"' : ''} marker-end="url(#arr-${col})"${faint}`;
    case 'depends': return `stroke="var(--dep)" stroke-width="1.3" marker-end="url(#arr-dep)"`;
    case 'part': return `stroke="var(--${col})" stroke-width="1.6" stroke-dasharray="1.5 4" stroke-linecap="round" marker-end="url(#arr-${col})"`;
    case 'graded': return `stroke="var(--grade)" stroke-width="2.2" stroke-dasharray="7 5" stroke-linecap="round" marker-end="url(#arr-grade)"`;
    case 'uses': return `stroke="var(--dep)" stroke-width="1.3" stroke-dasharray="1.5 4" stroke-linecap="round" marker-end="url(#arr-dep)"`;
  }
}
// The "graded against" badge, centred at (cx, cy).
function gradeBadge(cx, cy, note, noteAnchor = 'middle') {
  const t = 'graded against', tw = textWidth(t, 10.5, 600) + 22;
  let s = `<g transform="translate(${cx - tw / 2} ${cy - 11})"><rect width="${tw}" height="22" rx="11" fill="var(--gradeSoft)" stroke="var(--grade)" stroke-width="1.2"/>` +
    `<path d="M8 11 l3 3 l6 -7" fill="none" stroke="var(--grade)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<text x="21" y="15" font-size="10.5" font-weight="600" fill="var(--grade)">${esc(t)}</text></g>`;
  if (note) s += haloText(noteAnchor === 'end' ? cx + tw / 2 : noteAnchor === 'start' ? cx - tw / 2 : cx, cy + 25, note, { size: 9.5, fill: 'var(--ink2)', anchor: noteAnchor });
  return s;
}

module.exports = { OUT, data, byId, core, coreEdges, edgeStyle, gradeBadge, TOKENS, FONT, MONO, textWidth, esc, monthLabel, familyColor, writeSvg, hcurve, vcurve, haloText };
