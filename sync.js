const { Client } = require("@notionhq/client");
const { NotionToMarkdown } = require("notion-to-md");
const { marked } = require("marked");
const fs = require("fs");
const path = require("path");

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });

marked.setOptions({ gfm: true, breaks: false });

const DATABASE_ID = process.env.NOTION_DATABASE_ID;
const CERT_DB_ID  = "1a08e775abfd4d9188dad53470aad0b4";
const OUT_DIR = "./dist";

// ── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
:root {
  --bg:      #1a1b1e;
  --surface: #222428;
  --border:  #2d2f36;
  --border2: #3a3d46;
  --text:    #abb2bf;
  --muted:   #6b7280;
  --dim:     #44475a;
  --white:   #e8eaf0;
  --accent:  #56b6c2;
  --code-bg: #282c34;
}
body { background:var(--bg); color:var(--text); font-family:'IBM Plex Sans',sans-serif; font-weight:300; font-size:14px; line-height:1.75; }
.shell { display:grid; grid-template-columns:260px 1fr; min-height:100vh; }

/* ── NAV ── */
nav { border-right:1px solid var(--border); padding:40px 0; position:sticky; top:0; height:100vh; overflow-y:auto; background:var(--bg); }
.nav-logo { padding:0 28px 36px; border-bottom:1px solid var(--border); margin-bottom:24px; }
.nav-logo a { font-family:'IBM Plex Mono',monospace; font-size:15px; font-weight:500; color:var(--white); text-decoration:none; letter-spacing:.5px; }
.nav-logo .tld { color:var(--muted); font-weight:300; }
.nav-platform { display:block; padding:9px 28px; color:var(--dim); font-family:'IBM Plex Mono',monospace; font-size:10px; text-transform:uppercase; letter-spacing:2px; text-decoration:none; transition:color .15s; }
.nav-platform:hover { color:var(--muted); }
.nav-platform.active { color:var(--white); border-left:2px solid var(--accent); padding-left:26px; }
.nav-sep { height:1px; background:var(--border); margin:20px 28px; }
.nav-about { display:block; padding:9px 28px; color:var(--dim); font-family:'IBM Plex Mono',monospace; font-size:10px; text-transform:uppercase; letter-spacing:2px; text-decoration:none; transition:color .15s; }
.nav-about:hover { color:var(--muted); }
.nav-about.active { color:var(--white); border-left:2px solid var(--accent); padding-left:26px; }

/* ── MAIN ── */
main { padding:52px 68px; max-width:900px; }
.page-platform { font-family:'IBM Plex Mono',monospace; font-size:10.5px; color:var(--dim); text-transform:uppercase; letter-spacing:2px; margin-bottom:14px; }

/* ── PAGE HEADER WITH ICON ── */
.page-header { display:flex; align-items:center; gap:22px; margin-bottom:18px; }
.box-icon { width:54px; height:54px; border-radius:50%; object-fit:cover; border:1px solid var(--border2); flex-shrink:0; background:var(--surface); }
.icon-placeholder { width:54px; height:54px; border-radius:50%; background:var(--surface); border:1px solid var(--border); flex-shrink:0; }
h1 { font-family:'IBM Plex Mono',monospace; font-size:28px; font-weight:500; color:var(--white); letter-spacing:.5px; }

.meta { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:44px; padding-bottom:36px; border-bottom:1px solid var(--border); }
.chip { font-family:'IBM Plex Mono',monospace; font-size:10.5px; color:var(--muted); background:var(--surface); border:1px solid var(--border); padding:3px 10px; border-radius:2px; }
.chip.easy   { color:#98c379; border-color:#2a4028; }
.chip.medium { color:#e5c07b; border-color:#483d1a; }
.chip.hard   { color:#e06c75; border-color:#481e22; }
.chip.insane { color:#c678dd; border-color:#3a1f48; }

/* ── CONTENT TYPOGRAPHY ── */
h2 { font-family:'IBM Plex Mono',monospace; font-size:13.5px; font-weight:500; color:var(--white); margin:40px 0 14px; padding-left:12px; border-left:2px solid var(--accent); }
h3 { font-family:'IBM Plex Mono',monospace; font-size:11px; font-weight:500; color:var(--muted); margin:28px 0 10px; text-transform:uppercase; letter-spacing:2px; }
p { color:var(--text); font-size:13px; margin-bottom:14px; }

/* ── CODE ── */
pre { border-radius:5px; padding:18px 22px; font-family:'IBM Plex Mono',monospace; font-size:12.5px; line-height:1.8; overflow-x:auto; margin:14px 0; border:1px solid var(--border2); background:var(--code-bg); }
code { font-family:'IBM Plex Mono',monospace; font-size:12px; color:#abb2bf; background:var(--surface); border:1px solid var(--border2); padding:1px 6px; border-radius:3px; }
pre code { background:none !important; border:none !important; padding:0 !important; font-size:12.5px; }
.hljs { background:var(--code-bg) !important; }

blockquote { border-left:2px solid var(--border2); padding:2px 0 2px 14px; color:var(--muted); font-size:13px; margin:16px 0; }
hr { border:none; border-top:1px solid var(--border); margin:38px 0; }
ul, ol { padding-left:22px; color:var(--text); font-size:13px; margin-bottom:14px; }
li { padding:3px 0; }
li code { font-size:11.5px; }
a { color:var(--accent); text-decoration:none; opacity:.85; }
a:hover { opacity:1; }

/* ── TABLES ── */
table { border-collapse:collapse; width:100%; margin:16px 0; font-size:12.5px; }
thead tr { border-bottom:1px solid var(--border2); }
th { font-family:'IBM Plex Mono',monospace; font-size:10px; color:var(--dim); text-transform:uppercase; letter-spacing:1.5px; padding:8px 12px; text-align:left; font-weight:400; }
td { padding:9px 12px; color:var(--text); border-bottom:1px solid var(--border); vertical-align:top; }
td code { font-size:11px; }
tr:last-child td { border-bottom:none; }
strong { color:var(--white); font-weight:500; }
em { color:var(--muted); font-style:italic; }

/* ── INDEX ROWS ── */
.index-row { display:flex; align-items:center; gap:20px; padding:20px 0; border-top:1px solid var(--border); text-decoration:none; }
.index-row:hover .index-name { color:var(--white); }
.index-icon { flex-shrink:0; }
.index-icon img { width:48px; height:48px; border-radius:50%; object-fit:cover; border:1px solid var(--border2); display:block; }
.index-icon-placeholder { width:48px; height:48px; border-radius:50%; background:var(--surface); border:1px solid var(--border); }
.index-info { flex:1; min-width:0; }
.index-name { font-family:'IBM Plex Mono',monospace; font-size:15px; color:var(--text); transition:color .15s; display:flex; align-items:center; gap:8px; }
.index-name .lock { font-size:11px; color:var(--dim); }
.index-meta { display:flex; gap:6px; margin-top:6px; flex-wrap:wrap; align-items:center; }

/* ── LOCK ── */
.lock-wrap { position:relative; }
.lock-inner { max-height:420px; overflow:hidden; }
.lock-fade { position:absolute; bottom:0; left:0; right:0; height:180px; background:linear-gradient(to bottom, transparent 0%, var(--bg) 100%); pointer-events:none; }
.lock-card { margin-top:32px; border:1px solid var(--border2); border-radius:5px; padding:28px 32px; max-width:540px; background:var(--surface); }
.lock-card h3 { font-family:'IBM Plex Mono',monospace; font-size:12.5px; font-weight:500; color:var(--white); margin:0 0 10px; letter-spacing:.3px; text-transform:none; }
.lock-card p { font-size:13px; color:var(--muted); margin-bottom:0; }
.lock-card .eta { font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--dim); margin-top:18px; padding-top:18px; border-top:1px solid var(--border); }

/* ── ABOUT PAGE ── */
.about-role { font-family:'IBM Plex Mono',monospace; font-size:10.5px; color:var(--dim); text-transform:uppercase; letter-spacing:2px; margin-bottom:14px; }
.about-bio { max-width:580px; margin:20px 0 52px; }
.about-bio p { font-size:13.5px; line-height:1.9; color:var(--text); margin-bottom:14px; }
.cert-table-wrap { margin-bottom:44px; }
.cert-achieved { color:#98c379; font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.5px; }
.cert-inprogress { color:#e5c07b; font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.5px; }
.cert-goal { color:var(--dim); font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.5px; }

/* ── SCROLLBAR ── */
::-webkit-scrollbar { width:3px; }
::-webkit-scrollbar-thumb { background:var(--border2); border-radius:2px; }
`;

const HLJS_HEAD = `
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/bash.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/powershell.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/xml.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/javascript.min.js"></script>`;

// ── Helpers ──────────────────────────────────────────────────────────────────
function platformLabel(platform) {
  const map = { HTB: "Hack The Box", TryHackMe: "TryHackMe", VulnLab: "VulnLab", OFFSEC: "OffSec", Other: "Other" };
  return map[platform] || platform;
}

function diffClass(diff) {
  return (diff || "").toLowerCase();
}

function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
}

function extractContentPageId(page) {
  if (page.notionPageUrl) {
    const match = page.notionPageUrl.match(/([a-f0-9]{32})(?:[?#].*)?$/i);
    if (match) {
      const h = match[1];
      return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
    }
  }
  return page.id;
}

function markdownToHtml(md) {
  const stripped = md.replace(/^#\s+.+\n?/, "");
  return marked.parse(stripped);
}

// Returns a relative path prefix for the given depth level
// depth 0 = dist/          → "./"
// depth 1 = dist/htb/      → "../"
// depth 2 = dist/htb/slug/ → "../../"
function pathPrefix(depth) {
  return depth === 0 ? "./" : "../".repeat(depth);
}

// Copy favicon from repo root to dist, return filename or null
function copyFavicon() {
  for (const ext of ["ico", "png", "svg"]) {
    const src = path.join(".", `favicon.${ext}`);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(OUT_DIR, `favicon.${ext}`));
      console.log(`Copied favicon.${ext} to dist/`);
      return `favicon.${ext}`;
    }
  }
  return null;
}

function faviconTag(faviconFile, depth) {
  if (!faviconFile) return "";
  return `<link rel="icon" href="${pathPrefix(depth)}${faviconFile}">`;
}

const PLATFORMS = [
  { key: "htb",        label: "Hack The Box", slug: "htb"       },
  { key: "vulnlab",    label: "VulnLab",       slug: "vulnlab"   },
  { key: "offsec",     label: "OffSec",        slug: "offsec"    },
  { key: "tryhackme",  label: "TryHackMe",     slug: "tryhackme" },
];

// ── buildNav ─────────────────────────────────────────────────────────────────
// depth: 0 = root, 1 = platform index, 2 = writeup page
// activePlatform: "htb" | "vulnlab" | "offsec" | "tryhackme" | "about"
function buildNav(depth, activePlatform) {
  const prefix = pathPrefix(depth);

  let html = `<nav>\n<div class="nav-logo"><a href="${prefix}">0xnrg<span class="tld">.se</span></a></div>\n`;

  for (const p of PLATFORMS) {
    const href = `${prefix}${p.slug}/`;
    const isActive = p.key === activePlatform;
    html += `<a href="${href}" class="nav-platform${isActive ? " active" : ""}">${p.label}</a>\n`;
  }

  html += `<div class="nav-sep"></div>\n`;
  html += `<a href="${prefix}" class="nav-about${activePlatform === "about" ? " active" : ""}">About</a>\n`;
  html += `</nav>\n`;
  return html;
}

// ── buildAboutPage ────────────────────────────────────────────────────────────
function buildAboutPage(nav, certs, faviconFile) {
  const achieved = certs.filter(c => c.status === "Achieved");
  const goals    = certs.filter(c => c.status !== "Achieved");

  const achievedRows = achieved.map(c => {
    const year = c.dateAchieved ? c.dateAchieved.slice(0, 4) : "—";
    return `<tr>
  <td><strong>${c.name}</strong></td>
  <td>${c.provider}</td>
  <td>${year}</td>
</tr>`;
  }).join("\n");

  const goalRows = goals.map(c => {
    const statusClass = c.status === "In Progress" ? "cert-inprogress" : "cert-goal";
    const statusLabel = c.status === "In Progress" ? "in progress" : "goal";
    return `<tr>
  <td><strong>${c.name}</strong></td>
  <td>${c.provider}</td>
  <td><span class="${statusClass}">${statusLabel}</span></td>
</tr>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>0xnrg.se</title>
${faviconTag(faviconFile, 0)}
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&family=IBM+Plex+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<div class="shell">
${nav}
<main>
  <div class="about-role">Cyber Security Consultant</div>
  <h1>0xnrg</h1>

  <div class="about-bio">
    <p>Offensive security practitioner with a focus on Active Directory exploitation, red team operations, and adversary simulation.</p>
    <p>Passionate about understanding systems at a low level — from Windows internals and ADCS abuse to custom tooling and CTF research. Currently pursuing the full OffSec and HTB certification tracks.</p>
    <p>This site documents writeups and attack chains from labs across Hack The Box, VulnLab, OffSec, and TryHackMe.</p>
  </div>

  <h2>Certifications</h2>

  <h3>Achieved</h3>
  <div class="cert-table-wrap">
    <table>
      <thead>
        <tr><th>Certification</th><th>Provider</th><th>Year</th></tr>
      </thead>
      <tbody>
        ${achievedRows}
      </tbody>
    </table>
  </div>

  <h3>Goals</h3>
  <div class="cert-table-wrap">
    <table>
      <thead>
        <tr><th>Certification</th><th>Provider</th><th>Status</th></tr>
      </thead>
      <tbody>
        ${goalRows}
      </tbody>
    </table>
  </div>

</main>
</div>
</body>
</html>`;
}

// ── buildPage ─────────────────────────────────────────────────────────────────
function buildPage(page, nav, bodyHtml, faviconFile) {
  const isLocked = page.status !== "Completed";
  const focusTags = (page.focus || []).map(f => `<span class="chip">${f}</span>`).join("");
  const osTags = page.os ? `<span class="chip">${page.os}</span>` : "";
  const diffTag = page.difficulty ? `<span class="chip ${diffClass(page.difficulty)}">${page.difficulty}</span>` : "";

  const iconHtml = page.icon
    ? `<img src="${page.icon}" class="box-icon" alt="${page.name}">`
    : `<div class="icon-placeholder"></div>`;

  const contentHtml = isLocked
    ? `<div class="lock-wrap">
  <div class="lock-inner">${bodyHtml}</div>
  <div class="lock-fade"></div>
</div>
<div class="lock-card">
  <div style="font-size:16px;color:var(--dim);margin-bottom:14px;">—</div>
  <h3>Writeup restricted</h3>
  <p>This machine is currently active. The full writeup will be published once the box retires, in accordance with HTB's NDA policy.</p>
  <div class="eta">Status — Active</div>
</div>`
    : bodyHtml;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${page.name} — 0xnrg.se</title>
${faviconTag(faviconFile, 2)}
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&family=IBM+Plex+Sans:wght@300;400;500&display=swap" rel="stylesheet">
${HLJS_HEAD}
<style>${CSS}</style>
</head>
<body>
<div class="shell">
${nav}
<main>
  <div class="page-platform">${platformLabel(page.platform)} · ${page.category || "Lab"}</div>
  <div class="page-header">
    ${iconHtml}
    <h1>${page.name}</h1>
  </div>
  <div class="meta">
    ${diffTag}${osTags}${focusTags}
  </div>
  ${contentHtml}
</main>
</div>
<script>hljs.highlightAll();</script>
</body>
</html>`;
}

// ── buildPlatformPage ─────────────────────────────────────────────────────────
function buildPlatformPage(label, nav, faviconFile) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${label} — 0xnrg.se</title>
${faviconTag(faviconFile, 1)}
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&family=IBM+Plex+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<div class="shell">
${nav}
<main>
  <div class="page-platform">writeups</div>
  <h1>${label}</h1>
  <div style="height:36px;"></div>
  <div style="padding-bottom:2px;border-bottom:1px solid var(--border);margin-bottom:0;">
    <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:2px;padding:10px 0;">All Labs</div>
  </div>
  <p style="margin-top:32px;font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--dim);">No writeups published yet.</p>
</main>
</div>
</body>
</html>`;
}

// ── buildIndex ────────────────────────────────────────────────────────────────
// Generates dist/htb/index.html (depth=1)
function buildIndex(pages, nav, faviconFile) {
  const rows = pages.map(p => {
    const isLocked = p.status !== "Completed";
    const lockIcon = isLocked ? `<span class="lock">⌀</span>` : "";
    const diff = p.difficulty ? `<span class="chip ${diffClass(p.difficulty)}">${p.difficulty}</span>` : "";
    const osChip = p.os ? `<span class="chip">${p.os}</span>` : "";
    const iconHtml = p.icon
      ? `<img src="${p.icon}" alt="${p.name}" width="48" height="48" style="border-radius:50%;object-fit:cover;border:1px solid var(--border2);">`
      : `<div class="index-icon-placeholder"></div>`;

    return `<a href="${p.slug}/" class="index-row">
  <div class="index-icon">${iconHtml}</div>
  <div class="index-info">
    <div class="index-name">${p.name.toLowerCase()} ${lockIcon}</div>
    <div class="index-meta">${diff}${osChip}</div>
  </div>
</a>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Hack The Box — 0xnrg.se</title>
${faviconTag(faviconFile, 1)}
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&family=IBM+Plex+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<div class="shell">
${nav}
<main>
  <div class="page-platform">writeups</div>
  <h1>Hack The Box</h1>
  <div style="height:36px;"></div>
  <div style="padding-bottom:2px;border-bottom:1px solid var(--border);margin-bottom:0;">
    <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:2px;padding:10px 0;">All Labs</div>
  </div>
  ${rows}
</main>
</div>
</body>
</html>`;
}

// ── fetchCerts ────────────────────────────────────────────────────────────────
async function fetchCerts() {
  console.log("Fetching certifications from Notion...");
  try {
    const response = await notion.databases.query({
      database_id: CERT_DB_ID,
      sorts: [
        { property: "Status", direction: "ascending" },
        { property: "Name",   direction: "ascending"  }
      ]
    });

    return response.results.map(r => {
      const props = r.properties;
      return {
        name:         props.Name?.title?.[0]?.plain_text || "",
        provider:     props.Provider?.select?.name || "",
        status:       props.Status?.select?.name || "",
        dateAchieved: props["Date Achieved"]?.date?.start || null,
        notes:        props.Notes?.rich_text?.[0]?.plain_text || ""
      };
    });
  } catch (e) {
    console.warn("Could not fetch certifications:", e.message);
    console.warn("Make sure the cert database is shared with your Notion integration.");
    return [];
  }
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Fetching Notion database...");

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // Fetch certifications for About page
  const certs = await fetchCerts();
  console.log(`Found ${certs.length} certifications`);

  // Query HTB Labs, newest first (created_time descending)
  const response = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: {
      and: [
        { property: "Platform", select: { equals: "HTB" } },
        { property: "Category", select: { equals: "Lab" } }
      ]
    },
    sorts: [{ timestamp: "created_time", direction: "descending" }]
  });

  const pages = [];

  for (const result of response.results) {
    const props = result.properties;
    const name = props.Name?.title?.[0]?.plain_text || "Untitled";
    const status = props.Status?.select?.name || "";
    const platform = props.Platform?.select?.name || "";
    const difficulty = props.Difficulty?.select?.name || "";
    const os = props.OS?.select?.name || "";
    const category = props.Category?.select?.name || "";
    const focus = props.Focus?.multi_select?.map(f => f.name) || [];
    const notionPageUrl = props["Notion Page"]?.url || null;
    const slug = slugify(name);

    pages.push({ id: result.id, name, status, platform, difficulty, os, category, focus, notionPageUrl, slug, icon: null, bodyHtml: "" });
  }

  console.log(`Found ${pages.length} pages — fetching content & icons...`);

  for (const page of pages) {
    const contentPageId = extractContentPageId(page);

    try {
      console.log(`  [${page.status}] ${page.name} → ${contentPageId}`);

      const [pageMeta, mdBlocks] = await Promise.all([
        notion.pages.retrieve({ page_id: contentPageId }),
        n2m.pageToMarkdown(contentPageId)
      ]);
      page.icon = pageMeta.icon?.external?.url || pageMeta.icon?.file?.url || null;
      const mdString = n2m.toMarkdownString(mdBlocks);
      page.bodyHtml = markdownToHtml(mdString.parent || "");
      if (!page.bodyHtml.trim()) page.bodyHtml = "<p>No content found on the linked Notion page.</p>";

    } catch (e) {
      console.warn(`  Could not fetch ${page.name}:`, e.message);
      page.icon = null;
      page.bodyHtml = "<p>Content unavailable.</p>";
    }
  }

  // Copy favicon if present
  const faviconFile = copyFavicon();

  // ── About page at dist/index.html (root, depth=0) ──
  const aboutNav  = buildNav(0, "about");
  const aboutHtml = buildAboutPage(aboutNav, certs, faviconFile);
  fs.writeFileSync(path.join(OUT_DIR, "index.html"), aboutHtml);
  console.log("Built index.html (About)");

  // ── HTB index at dist/htb/index.html (depth=1) ──
  const htbDir = path.join(OUT_DIR, "htb");
  if (!fs.existsSync(htbDir)) fs.mkdirSync(htbDir, { recursive: true });
  const htbNav  = buildNav(1, "htb");
  const htbHtml = buildIndex(pages, htbNav, faviconFile);
  fs.writeFileSync(path.join(htbDir, "index.html"), htbHtml);
  console.log("Built htb/index.html");

  // ── Individual writeup pages at dist/htb/{slug}/index.html (depth=2) ──
  for (const page of pages) {
    const pageDir = path.join(OUT_DIR, "htb", page.slug);
    if (!fs.existsSync(pageDir)) fs.mkdirSync(pageDir, { recursive: true });

    const nav  = buildNav(2, "htb");
    const html = buildPage(page, nav, page.bodyHtml, faviconFile);
    fs.writeFileSync(path.join(pageDir, "index.html"), html);
    console.log(`Built: htb/${page.slug}/`);
  }

  // ── Platform placeholder pages at dist/{slug}/index.html (depth=1) ──
  for (const p of PLATFORMS) {
    if (p.key === "htb") continue; // HTB handled above
    const dir = path.join(OUT_DIR, p.slug);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const nav  = buildNav(1, p.key);
    const html = buildPlatformPage(p.label, nav, faviconFile);
    fs.writeFileSync(path.join(dir, "index.html"), html);
    console.log(`Built: ${p.slug}/`);
  }

  // CNAME + .nojekyll
  fs.writeFileSync(path.join(OUT_DIR, "CNAME"), "0xnrg.se");
  fs.writeFileSync(path.join(OUT_DIR, ".nojekyll"), "");

  console.log("Done. Output in ./dist/");
}

main().catch(err => { console.error(err); process.exit(1); });
