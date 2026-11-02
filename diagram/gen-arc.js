// The arc diagram for the profile README. One vertical spine, time runs down.
// Names and blurbs sit left of the spine, every relationship between two of
// my projects is an arc on the right, and edges to an outside reference
// (graded against, uses) are rays out to a box in the right margin.
//
// Outputs, all under arc/:
//   arc.svg, arc-light.svg, arc-dark.svg   the whole picture
//   light/NN.svg, dark/NN.svg              one slice per row, same document with
//                                          a cropped viewBox, so arcs continue
//                                          across slice boundaries
//   slices.json                            band table (y, h, project, url)
//   arc.md                                 the README block: each slice in a
//                                          <picture>, wrapped in a link when the
//                                          project is public
//
// Rows are 46px so a slice stays taller than GitHub's 24px line height down
// to about 370px of README width; below that a 2–3px gap opens under slices.
// Row centres sit on integers so every band boundary is an integer.
const fs = require('fs');
const path = require('path');
const { OUT, data, byId, core, coreEdges, edgeStyle, textWidth, esc, familyColor, monthLabel, writeSvg, haloText } = require('./lib');

const ROW = 46, CH = 52, TOP = 8, LEFT = 24, NAME_COL = 372, SPINE = LEFT + NAME_COL + 18, ARC_W = 270, PAD = 20;
const W = SPINE + ARC_W + PAD;

// Row order: chronological, with lineage neighbours kept adjacent.
const ORDER = ['lib3', 'agent-browser-ext', 'voice-browser-agent', 'crush', 'ghostty-web', 'aiwm', 'semantic-atlas', 'oneilltom.com', 'hydra-tsl', 'agent-native-shell', 'nonlinear', 'wgpu-smithay-renderer', '3os', 'plurality', 'windows-pane', 'smithay-wgpu', 'wgpu-dmabuf', 'glasspane', 'three-rs', 'd3-hierarchy', 'upfront', 'd3-three'];
const nodes = [...core].sort((a, b) => {
  const ia = ORDER.indexOf(a.id), ib = ORDER.indexOf(b.id);
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.month.localeCompare(b.month);
});
const anchors = Object.fromEntries(data.anchors.map((a) => [a.id, a]));
const chapterFor = (month) => [...data.chapters].reverse().find((c) => c.from <= month);

// Lay out rows and chapter headers top to bottom. Each becomes one slice.
const rowY = {};
const slices = []; // { y, h, kind: 'chapter'|'row'|'legend', id?, url? }
let cursor = TOP;
let chapter = null;
for (const n of nodes) {
  const c = chapterFor(n.month);
  if (c !== chapter) {
    chapter = c;
    slices.push({ y: cursor === TOP ? 0 : cursor, h: (cursor === TOP ? TOP : 0) + CH, kind: 'chapter', id: c.title, month: n.month });
    cursor += CH;
  }
  rowY[n.id] = cursor + ROW / 2;
  slices.push({ y: cursor, h: ROW, kind: 'row', id: n.id, url: n.public ? n.url : null });
  cursor += ROW;
}
const LEGEND_H = 76;
slices.push({ y: cursor, h: LEGEND_H, kind: 'legend' });
const H = cursor + LEGEND_H;

let b = '';
// chapter headers: rule, title, month, one-line note
for (const s of slices) {
  if (s.kind !== 'chapter') continue;
  const c = data.chapters.find((c) => c.title === s.id);
  const y = s.y + s.h - CH; // header top
  const label = s.month.startsWith('2025') ? '2025' : monthLabel(s.month);
  b += `<line x1="${LEFT}" y1="${y + 6}" x2="${W - PAD}" y2="${y + 6}" stroke="var(--line)"/>`;
  b += `<text x="${LEFT}" y="${y + 21}" font-size="11.5" font-weight="700" fill="var(--ink)">${esc(c.title)}</text>`;
  b += `<text x="${LEFT + textWidth(c.title, 11.5, 700) + 10}" y="${y + 21}" font-size="9.5" font-weight="700" fill="var(--ink3)" letter-spacing="1">${esc(label.toUpperCase())}</text>`;
  // note wraps inside the left column so it never runs under the arcs
  const lines = [], maxW = SPINE - 12 - LEFT;
  let line = '';
  for (const w of c.note.split(' ')) {
    const t = line ? line + ' ' + w : w;
    if (textWidth(t, 10) > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  lines.slice(0, 2).forEach((l, i) => { b += `<text x="${LEFT}" y="${y + 34 + i * 13}" font-size="10" fill="var(--ink2)">${esc(l)}</text>`; });
}
// spine
const firstRow = slices.find((s) => s.kind === 'row'), lastRow = [...slices].reverse().find((s) => s.kind === 'row');
b += `<line x1="${SPINE}" y1="${firstRow.y + 4}" x2="${SPINE}" y2="${lastRow.y + lastRow.h - 4}" stroke="var(--line)" stroke-width="2"/>`;

// arcs between my own projects
const both = new Set(coreEdges.filter((e) => e.kind === 'lineage').map((e) => e.from + '>' + e.to));
let arcs = '', labels = '', rays = '';
const inner = coreEdges.filter((e) => !anchors[e.to]);
const sorted = [...inner].sort((p, q) => Math.abs(rowY[q.from] - rowY[q.to]) - Math.abs(rowY[p.from] - rowY[p.to])); // big arcs first (drawn under)
for (const e of sorted) {
  if (e.kind === 'depends' && both.has(e.from + '>' + e.to)) continue;
  const src = e.kind === 'depends' ? e.to : e.from, dst = e.kind === 'depends' ? e.from : e.to;
  const y1 = rowY[src], y2 = rowY[dst];
  const down = y2 > y1;
  const r = Math.abs(y2 - y1) / 2, rx = Math.min(r * 1.15, ARC_W - 30);
  const col = familyColor(byId[e.from].family);
  const d = `M${SPINE + 7} ${y1} A${rx} ${r} 0 0 ${down ? 1 : 0} ${SPINE + 7} ${y2}`;
  const apexX = SPINE + 7 + rx, apexY = (y1 + y2) / 2;
  arcs += `<path d="${d}" fill="none" ${edgeStyle(e, col)}/>`;
  if ((e.kind === 'lineage' || e.kind === 'part') && e.label) {
    const fits = apexX + 6 + textWidth(e.label, 10) <= W - PAD;
    labels += haloText(fits ? apexX + 6 : apexX - 6, apexY + 3.5, e.label, { size: 10, fill: `var(--${col}Ink)`, anchor: fits ? 'start' : 'end', cls: e.unconfirmed ? 'faint' : '' });
  }
}
b += arcs;

// rays to outside references: a horizontal line from the row out to a box in the right margin
const rayEdges = data.edges.filter((e) => anchors[e.to] && rowY[e.from] !== undefined);
for (const e of rayEdges) {
  const y = rowY[e.from], a = anchors[e.to];
  const graded = e.kind === 'graded';
  const tw = textWidth(a.name, 10.5, 600) + (graded ? 30 : 16), bh = 20;
  const bx = W - PAD - tw, by = y - bh / 2;
  const col = graded ? 'var(--grade)' : 'var(--dep)';
  rays += `<path d="M${SPINE + 9} ${y} H${bx - 2}" fill="none" ${edgeStyle(e, 'dep')}/>`;
  rays += `<g transform="translate(${bx} ${by})"><rect width="${tw}" height="${bh}" rx="4" fill="var(--surface)" stroke="${col}" stroke-width="1.2"/>`;
  if (graded) rays += `<path d="M8 10 l3 3 l6 -7" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  rays += `<text x="${graded ? 22 : 8}" y="14" font-size="10.5" font-weight="600" fill="${col}">${esc(a.name)}</text></g>`;
  if (e.note) rays += haloText(W - PAD, y + 23, e.note, { size: 9.5, fill: 'var(--ink3)', anchor: 'end' });
}
b += rays;

// nodes
for (const n of nodes) {
  const y = rowY[n.id], col = familyColor(n.family);
  const hero = n.tier === 1;
  const size = hero ? 14.5 : 13, weight = hero ? 700 : n.public ? 600 : 500;
  const nameW = textWidth(n.name, size, weight);
  if (n.flagship) b += `<circle cx="${SPINE}" cy="${y}" r="10" fill="var(--${col})"/><circle cx="${SPINE}" cy="${y}" r="4" fill="var(--surface)"/>`;
  else if (n.public) b += `<circle cx="${SPINE}" cy="${y}" r="${hero ? 8 : 6.5}" fill="var(--${col})" stroke="var(--surface)" stroke-width="2"/>`;
  else b += `<circle cx="${SPINE}" cy="${y}" r="5.5" fill="var(--surface)" stroke="var(--${col})" stroke-width="2" stroke-dasharray="3 2"/>`;
  const nx = SPINE - 16;
  b += `<text x="${nx}" y="${y + 5}" font-size="${size}" font-weight="${weight}" text-anchor="end" fill="${n.public || n.flagship ? `var(--${col}Ink)` : 'var(--ink2)'}">${esc(n.name)}</text>`;
  let blurb = n.blurb || '';
  if (n.flagship && n.goingPublic) blurb += ' · public soon';
  const maxW = NAME_COL - nameW - 14;
  while (blurb.length > 3 && textWidth(blurb, 10.5) > maxW) blurb = blurb.replace(/\s*\S+…?$/, '') + '…';
  b += `<text x="${nx - nameW - 8}" y="${y + 4}" font-size="10.5" text-anchor="end" fill="var(--ink3)">${esc(blurb)}</text>`;
}
b += labels;

// legend
let ly = H - LEGEND_H + 22, lx = LEFT;
const item = (svg, text, w) => { b += `<g transform="translate(${lx} ${ly})">${svg}<text x="${w + 6}" y="4" font-size="10.5" fill="var(--ink2)">${esc(text)}</text></g>`; lx += w + 6 + textWidth(text, 10.5) + 18; };
item(`<path d="M0 0 H22" stroke="var(--violet)" stroke-width="2.6" marker-end="url(#arr-violet)"/>`, 'lineage', 26);
item(`<path d="M0 0 H22" stroke="var(--dep)" stroke-width="1.3" marker-end="url(#arr-dep)"/>`, 'used by', 26);
item(`<path d="M0 0 H22" stroke="var(--grade)" stroke-width="2.2" stroke-dasharray="6 4" marker-end="url(#arr-grade)"/>`, 'graded against', 26);
item(`<rect x="0" y="-8" width="26" height="16" rx="4" fill="var(--surface)" stroke="var(--dep)" stroke-width="1.2"/>`, 'outside reference', 26);
item(`<circle cx="6" cy="0" r="6" fill="var(--aqua)"/>`, 'public', 12);
item(`<circle cx="6" cy="0" r="5.5" fill="var(--surface)" stroke="var(--aqua)" stroke-width="2" stroke-dasharray="3 2"/>`, 'private', 12);
ly += 24; lx = LEFT;
for (const [f, fam] of Object.entries(data.families)) item(`<rect x="0" y="-5" width="10" height="10" rx="2" fill="var(--${familyColor(f)})"/>`, fam.label, 10);

const svgs = writeSvg('arc', { width: W, height: H, body: b, css: '.faint{opacity:.6}', title: 'Project history: arc diagram' });

// slices: the same document with a cropped viewBox, one per band
const root = new RegExp(`width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"`);
for (const mode of ['light', 'dark']) {
  const dir = path.join(OUT, mode);
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (/^\d\d\.svg$/.test(f)) fs.unlinkSync(path.join(dir, f));
  slices.forEach((s, i) => {
    if (!root.test(svgs[mode])) throw new Error('root element not found');
    const doc = svgs[mode].replace(root, `width="${W}" height="${s.h}" viewBox="0 ${s.y} ${W} ${s.h}"`);
    fs.writeFileSync(path.join(dir, `${String(i).padStart(2, '0')}.svg`), doc);
  });
}
fs.writeFileSync(path.join(OUT, 'slices.json'), JSON.stringify(slices, null, 1) + '\n');

// README block. `align="top"` is what removes the baseline gap between stacked
// images on GitHub; measured 0px at every boundary, against 7.2px without it.
const base = 'diagram/arc';
const md = slices.map((s, i) => {
  const nn = String(i).padStart(2, '0');
  const alt = s.kind === 'row' ? `${byId[s.id].name}: ${byId[s.id].blurb}` : s.kind === 'chapter' ? `${s.id}, ${s.month.startsWith('2025') ? '2025' : monthLabel(s.month)}` : 'legend';
  const pic = `<picture><source media="(prefers-color-scheme: dark)" srcset="${base}/dark/${nn}.svg"><img src="${base}/light/${nn}.svg" width="${W}" alt="${esc(alt)}" align="top"></picture>`;
  return s.url ? `<a href="${s.url}">${pic}</a>` : pic;
}).join('\n');
fs.writeFileSync(path.join(OUT, 'arc.md'), md + '\n');
console.log(`${slices.length} slices, ${slices.filter((s) => s.url).length} linked; H=${H}`);
