export interface ResumeData {
  basics: {
    name: string;
    email: string;
    url: string;
    location: { city: string; countryCode: string };
    profiles: Array<{ network: string; username: string; url: string }>;
    summary: string;
  };
  projects: Array<{
    name: string;
    description: string;
    url: string;
    startDate: string;
    endDate?: string;
    highlights: string[];
    keywords: string[];
  }>;
  work: Array<{
    name: string;
    position: string;
    url: string;
    startDate: string;
    endDate?: string;
    highlights: string[];
  }>;
  skills: Array<{
    name: string;
    keywords: string[];
  }>;
}

const GITHUB_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><path fill="currentColor" d="M16 2C8.27 2 2 8.27 2 16c0 6.19 4.01 11.44 9.58 13.29.7.13.96-.3.96-.67 0-.33-.01-1.42-.02-2.58-3.9.85-4.72-1.65-4.72-1.65-.64-1.62-1.56-2.05-1.56-2.05-1.27-.87.1-.85.1-.85 1.41.1 2.15 1.44 2.15 1.44 1.25 2.14 3.28 1.52 4.08 1.16.13-.91.49-1.52.89-1.87-3.11-.35-6.38-1.56-6.38-6.93 0-1.53.55-2.78 1.44-3.76-.14-.35-.63-1.78.14-3.72 0 0 1.18-.38 3.85 1.44a13.4 13.4 0 0 1 7.02 0c2.67-1.82 3.85-1.44 3.85-1.44.77 1.94.28 3.37.14 3.72.9.98 1.44 2.23 1.44 3.76 0 5.38-3.28 6.57-6.4 6.92.5.43.95 1.29.95 2.6 0 1.87-.02 3.39-.02 3.85 0 .37.25.81.96.67C25.99 27.44 30 22.19 30 16c0-7.73-6.27-14-14-14z"/></svg>`;

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function smartQuotes(text: string): string {
  return text
    .replace(/(\s)'(\w)/g, '$1\u2019$2')    // apostrophe after space: since '25
    .replace(/\.\.\./g, '\u2026');            // ellipsis
}

function icon(icons: Record<string, string>, name: string): string {
  if (name === 'github') return `<span class="icon">${GITHUB_ICON}</span>`;
  const svg = icons[name];
  if (!svg) return '';
  return `<span class="icon">${svg}</span>`;
}

function pictogram(pictograms: Record<string, string>, name: string): string {
  const svg = pictograms[name];
  if (!svg) return '';
  return `<span class="pictogram">${svg}</span>`;
}

export function renderHTML(
  data: ResumeData,
  css: string,
  icons: Record<string, string>,
  pictograms: Record<string, string>,
): string {
  const { basics, projects, work, skills } = data;

  const github = basics.profiles.find((p) => p.network === 'GitHub');
  const linkedin = basics.profiles.find((p) => p.network === 'LinkedIn');

  const summaryLines = basics.summary
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const contactHTML = `
    <ul class="contact-list">
      <li>${icon(icons, 'envelope')} <a href="mailto:${basics.email}">${basics.email}</a></li>
      ${github ? `<li>${icon(icons, 'github')} <a href="${github.url}">${github.username}</a></li>` : ''}
      ${linkedin ? `<li><span class="icon icon-linkedin">${icons['linkedin'] || ''}</span> <a href="${linkedin.url}">${linkedin.username}</a></li>` : ''}
      <li>${icon(icons, 'websites')} <a href="${basics.url}">${basics.url.replace(/^https?:\/\//, '')}</a></li>
      <li>${icon(icons, 'earth')} ${basics.location.city}</li>
    </ul>
  `;

  const synopsisHTML = `
    <div class="synopsis">
      ${summaryLines.map((l) => `<p>${smartQuotes(l)}</p>`).join('\n')}
    </div>
  `;

  const projectsHTML = projects
    .map(
      (p) => `
    <div class="project">
      <div class="project-header">
        <h3><a href="${p.url}"><span class="project-name-text">${p.name}</span></a></h3>
        <span class="work-dates">${formatDate(p.startDate)}${p.endDate ? ` – ${formatDate(p.endDate)}` : ''}</span>
      </div>
      <p class="project-description">${p.description}</p>
      <ul>
        ${p.highlights.map((h) => `<li>${h}</li>`).join('\n')}
      </ul>
    </div>
  `,
    )
    .join('\n');

  const workHTML = work
    .map(
      (w) => `
    <div class="work-entry">
      <div class="work-header">
        <h3>${w.position} @ <a href="${w.url}">${w.name}</a></h3>
        <span class="work-dates">${formatDate(w.startDate)} – ${w.endDate ? formatDate(w.endDate) : 'Present'}</span>
      </div>
      <ul>
        ${w.highlights.map((h) => `<li>${h}</li>`).join('\n')}
      </ul>
    </div>
  `,
    )
    .join('\n');

  const skillsHTML = skills
    .map(
      (s) => `<div class="skills-group">
        <h4 class="skills-heading">${s.name}</h4>
        <p class="skills-line">${s.keywords.join(' · ')}</p>
      </div>`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${basics.name} — Resume</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>${css}</style>
</head>
<body>
  <header class="hero">
    <h1 class="name">${basics.name}</h1>
    ${synopsisHTML}
  </header>

  <div class="layout">
    <main class="main">
      <div class="section">
        <h2>Recent Projects</h2>
        ${projectsHTML}
      </div>
      <div class="section">
        <h2>Work Experience</h2>
        ${workHTML}
      </div>
    </main>

    <aside class="sidebar">
      <div class="section section-contact">
        <h2>Contact</h2>
        ${contactHTML}
      </div>
      <div class="section section-skills">
        <h2>Skills</h2>
        ${skillsHTML}
      </div>
    </aside>
  </div>
</body>
</html>`;
}
