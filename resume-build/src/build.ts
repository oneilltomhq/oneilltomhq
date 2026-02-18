import { readFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, basename, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { parse } from 'yaml';
import { chromium } from 'playwright';
import { renderHTML, type ResumeData } from './template.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

// 1. Read and parse YAML
const yamlPath = resolve(root, '..', 'resume-ai-engineer.yaml');
const data = parse(readFileSync(yamlPath, 'utf-8')) as ResumeData;

// 2. Read CSS
const css = readFileSync(resolve(root, 'src', 'style.css'), 'utf-8');

// 3. Read SVGs into maps
function loadSVGs(dir: string): Record<string, string> {
  const map: Record<string, string> = {};
  const fullDir = resolve(root, dir);
  if (!existsSync(fullDir)) return map;
  for (const file of readdirSync(fullDir)) {
    if (extname(file) === '.svg') {
      const name = basename(file, '.svg');
      map[name] = readFileSync(resolve(fullDir, file), 'utf-8');
    }
  }
  return map;
}

const icons = loadSVGs('icons');
const pictograms = loadSVGs('pictograms');

// 4. Render HTML
const html = renderHTML(data, css, icons, pictograms);

// 5. Ensure output directory
const outputDir = resolve(root, 'output');
if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

// 6. Launch Playwright and generate PDF
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

const shortHash = execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf-8' }).trim();
const dirty = execSync('git status --porcelain', { cwd: root, encoding: 'utf-8' }).trim() ? '-dirty' : '';
const outputPath = resolve(outputDir, `resume-${shortHash}${dirty}.pdf`);
await page.pdf({
  path: outputPath,
  printBackground: true,
  preferCSSPageSize: true,
});

await browser.close();
console.log(`PDF generated: ${outputPath}`);
