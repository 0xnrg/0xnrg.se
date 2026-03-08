const { Client } = require("@notionhq/client");
const { NotionToMarkdown } = require("notion-to-md");
const { marked } = require("marked");
const fs = require("fs");
const path = require("path");

// Configure marked: GFM (tables, strikethrough etc), no mangled links
marked.setOptions({ gfm: true, breaks: false });

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });

const DATABASE_ID = process.env.NOTION_DATABASE_ID;
const OUT_DIR = "./dist";

// ── CSS + layout (same style we designed) ──────────────────────────────────
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
:root {
  --bg:      #161616;
  --surface: #1e1e1e;
  --border:  #2e2e2e;
  --border2: #3a3a3a;
  --text:    #e0e0e0;
  --muted:   #888;
  --dim:     #5a5a5a;
  --white:   #f4f4f4;
  --code-bg: #181818;
}
body { background:var(--bg); color:var(--text); font-family:'IBM Plex Sans',sans-serif; font-weight:300; font-size:14px; line-height:1.7; }
.shell { display:grid; grid-template-columns:240px 1fr; min-height:100vh; }
nav { border-right:1px solid var(--border); padding:48px 0; position:sticky; top:0; height:100vh; overflow-y:auto; background:var(--bg); }
.nav-logo { padding:0 28px 40px; border-bottom:1px solid var(--border); margin-bottom:32px; }
.nav-logo a { font-family:'IBM Plex Mono',monospace; font-size:15px; font-weight:500; color:var(--white); text-decoration:none; letter-spacing:.5px; }
.nav-logo .tld { color:var(--muted); font-weight:300; }
.nav-section { font-family:'IBM Plex Mono',monospace; font-size:10px; color:var(--dim); text-transform:uppercase; letter-spacing:2px; padding:0 28px 10px; }
.nav-link { display:flex; align-items:center; justify-content:space-between; padding:9px 28px; color:var(--muted); font-size:13px; font-family:'IBM Plex Mono',monospace; font-weight:300; text-decoration:none; border-left:2px solid transparent; transition:color .15s; }
.nav-link:hover { color:var(--text); }
.nav-link.active { color:var(--white); border-left-color:#777; }
.nav-link.locked { opacity:.5; }
.nav-link .lock { font-size:11px; color:var(--dim); }
.nav-spacer { height:24px; }
main { padding:56px 72px; max-width:860px; }
.page-platform { font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--dim); text-transform:uppercase; letter-spacing:2px; margin-bottom:14px; }
h1 { font-family:'IBM Plex Mono',monospace; font-size:26px; font-weight:500; color:var(--white); letter-spacing:1px; margin-bottom:20px; }
.meta { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:48px; padding-bottom:40px; border-bottom:1px solid var(--border); }
.chip { font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--muted); background:var(--surface); border:1px solid var(--border); padding:3px 10px; border-radius:2px; }
.chip.easy   { color:#7ab87a; border-color:#2e4a2e; }
.chip.medium { color:#b8a87a; border-color:#4a3e22; }
.chip.hard   { color:#b87a7a; border-color:#4a2222; }
.chip.insane { color:#9a7ab8; border-color:#3a2a4a; }
h2 { font-family:'IBM Plex Mono',monospace; font-size:14px; font-weight:500; color:var(--white); margin:40px 0 12px; }
h3 { font-family:'IBM Plex Mono',monospace; font-size:12px; font-weight:500; color:var(--muted); margin:28px 0 10px; text-transform:uppercase; letter-spacing:2px; }
p { color:var(--muted); font-size:13px; margin-bottom:16px; }
pre { background:var(--code-bg); border:1px solid var(--border); border-radius:3px; padding:20px 22px; font-family:'IBM Plex Mono',monospace; font-size:12.5px; line-height:1.85; color:#b0b0b0; overflow-x:auto; margin:16px 0; }
code { font-family:'IBM Plex Mono',monospace; font-size:12px; color:#c0c0c0; background:var(--surface); border:1px solid var(--border); padding:1px 6px; border-radius:2px; }
pre code { background:none; border:none; padding:0; color:inherit; }
blockquote { border-left:2px solid var(--border2); padding-left:14px; color:var(--muted); font-size:13px; margin:16px 0; }
hr { border:none; border-top:1px solid var(--border); margin:40px 0; }
ul, ol { padding-left:20px; color:var(--muted); font-size:13px; margin-bottom:16px; }
li { padding:3px 0; }
li code { font-size:11.5px; }
a { color:var(--muted); text-decoration:underline; text-underline-offset:3px; }
/* tables */
table { border-collapse:collapse; width:100%; margin:16px 0; font-size:13px; }
thead tr { border-bottom:1px solid var(--border2); }
th { font-family:'IBM Plex Mono',monospace; font-size:10px; color:var(--dim); text-transform:uppercase; letter-spacing:1.5px; padding:8px 12px; text-align:left; font-weight:400; }
td { padding:9px 12px; color:var(--muted); border-bottom:1px solid var(--border); vertical-align:top; }
td code { font-size:11px; }
tr:last-child td { border-bottom:none; }
/* strong/em in writeup body */
strong { color:var(--text); font-weight:500; }
em { color:var(--muted); font-style:italic; }
/* lock */
.lock-wrap { position:relative; max-width:760px; }
.lock-inner { max-height:260px; overflow:hidden; }
.lock-fade { position:absolute; bottom:0; left:0; right:0; height:160px; background:linear-gradient(to bottom, transparent 0%, var(--bg) 100%); pointer-events:none; }
.lock-card { margin-top:40px; border:1px solid var(--border2); border-radius:4px; padding:32px 36px; max-width:560px; background:var(--surface); }
.lock-card h3 { font-family:'IBM Plex Mono',monospace; font-size:13px; font-weight:500; color:var(--white); margin:0 0 10px; letter-spacing:.3px; text-transform:none; }
.lock-card p { font-size:13px; color:var(--muted); margin-bottom:0; }
.lock-card .eta { font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--dim); margin-top:20px; padding-top:20px; border-top:1px solid var(--border); }
/* scrollbar */
::-webkit-scrollbar { width:3px; }
::-webkit-scrollbar-thumb { background:var(--border2); }
`;

function platformLabel(platform) {
  const map = { HTB: "HackTheBox", TryHackMe: "TryHackMe", VulnLab: "VulnLab", OFFSEC: "OffSec", Other: "Other" };
  return map[platform] || platform;
}

function diffClass(diff) {
  return (diff || "").toLowerCase();
}

function navSection(platform) {
  const map = { HTB: "HTB Labs", TryHackMe: "TryHackMe", VulnLab: "VulnLab", OFFSEC: "OffSec" };
  return map[platform] || "Other";
}

function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
}

function buildNav(pages, currentSlug) {
  // Group by platform
  const groups = {};
  for (const p of pages) {
    const section = navSection(p.platform);
    if (!groups[section]) groups[section] = [];
    groups[section].push(p);
  }

  // Use relative paths so the site works both on github.io/0xnrg.se/ and on 0xnrg.se/
  const isSubpage = currentSlug !== null;
  const base = isSubpage ? "../" : "";
  const homeHref = isSubpage ? "../" : "./";

  let html = `<nav>\n<div class="nav-logo"><a href="${homeHref}">0xnrg<span class="tld">.se</span></a></div>\n`;

  for (const [section, items] of Object.entries(groups)) {
    html += `<div class="nav-section">${section}</div>\n`;
    for (const item of items) {
      const isActive = item.slug === currentSlug;
      const isLocked = item.status !== "Completed";
      const lockIcon = isLocked ? `<span class="lock">⌀</span>` : "";
      const cls = [isActive ? "active" : "", isLocked ? "locked" : ""].filter(Boolean).join(" ");
      html += `<a href="${base}${item.slug}/" class="nav-link ${cls}">${item.name.toLowerCase()}${lockIcon}</a>\n`;
    }
    html += `<div class="nav-spacer"></div>\n`;
  }

  html += `</nav>\n`;
  return html;
}

function buildPage(page, nav, bodyHtml) {
  const isLocked = page.status !== "Completed";
  const focusTags = (page.focus || []).map(f => `<span class="chip">${f}</span>`).join("");
  const osTags = page.os ? `<span class="chip">${page.os}</span>` : "";
  const diffTag = page.difficulty ? `<span class="chip ${diffClass(page.difficulty)}">${page.difficulty}</span>` : "";
  const catTag = page.category ? `<span class="chip">${page.category}</span>` : "";

  let contentHtml;

  if (isLocked) {
    // Show first ~10% then lock
    contentHtml = `
<div class="lock-wrap">
  <div class="lock-inner">${bodyHtml}</div>
  <div class="lock-fade"></div>
</div>
<div class="lock-card">
  <div style="font-size:18px;color:var(--dim);margin-bottom:16px;">—</div>
  <h3>Writeup restricted</h3>
  <p>This machine is currently active. The full writeup will be published here automatically once the box is retired, in accordance with HTB's NDA policy.</p>
  <div class="eta">Status — Active</div>
</div>`;
  } else {
    contentHtml = bodyHtml;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${page.name} — 0xnrg.se</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&family=IBM+Plex+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<div class="shell">
${nav}
<main>
  <div class="page-platform">${platformLabel(page.platform)} · ${page.category || "Lab"}</div>
  <h1>${page.name}</h1>
  <div class="meta">
    ${diffTag}${osTags}${catTag}${focusTags}
  </div>
  ${contentHtml}
</main>
</div>
</body>
</html>`;
}

function buildIndex(pages, nav) {
  const rows = pages.map(p => {
    const isLocked = p.status !== "Completed";
    const lockIcon = isLocked ? " ⌀" : "";
    const diff = p.difficulty ? `<span class="chip ${diffClass(p.difficulty)}">${p.difficulty}</span>` : "";
    return `<div style="display:flex;align-items:center;gap:16px;padding:12px 0;border-top:1px solid var(--border)">
  <a href="${p.slug}/" style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--text);text-decoration:none;min-width:160px;">${p.name.toLowerCase()}${lockIcon}</a>
  ${diff}
  <span class="chip" style="font-size:10px;">${p.platform}</span>
  <span style="font-size:12px;color:var(--dim);">${p.os || ""}</span>
</div>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>0xnrg.se</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&family=IBM+Plex+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<div class="shell">
${nav}
<main>
  <div class="page-platform">Writeups</div>
  <h1>0xnrg</h1>
  <div class="meta" style="margin-bottom:32px;padding-bottom:0;border:none;">
    <span class="chip">Senior Security Consultant</span>
    <span class="chip">OSCP · OSWE · OSCE3</span>
    <span class="chip">CPTS · CWEE · CAPE</span>
  </div>
  <div style="padding-bottom:2px;border-bottom:1px solid var(--border);margin-bottom:0;">
    <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:2px;padding:12px 0;">All Writeups</div>
  </div>
  ${rows}
</main>
</div>
</body>
</html>`;
}

function markdownToHtml(md) {
  // Strip the h1 title if notion-to-md adds it (already shown in page header)
  const stripped = md.replace(/^#\s+.+\n?/, "");
  return marked.parse(stripped);
}

async function main() {
  console.log("Fetching Notion database...");

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // Query all HTB Labs — exclude Pro Labs, Rooms, Challenges etc.
  const response = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: {
      and: [
        { property: "Platform",  select: { equals: "HTB" } },
        { property: "Category",  select: { equals: "Lab" } }
      ]
    },
    sorts: [{ property: "Name", direction: "ascending" }]
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

    pages.push({ id: result.id, name, status, platform, difficulty, os, category, focus, notionPageUrl, slug });
  }

  console.log(`Found ${pages.length} pages`);

  // Build nav (used on every page)
  const indexNav = buildNav(pages, null);

  // Build index
  const indexHtml = buildIndex(pages, indexNav);
  fs.writeFileSync(path.join(OUT_DIR, "index.html"), indexHtml);
  console.log("Built index.html");

  // Build each writeup page
  for (const page of pages) {
    console.log(`Building: ${page.name} (${page.status})`);

    const pageDir = path.join(OUT_DIR, page.slug);
    if (!fs.existsSync(pageDir)) fs.mkdirSync(pageDir, { recursive: true });

    let bodyHtml = "";

    if (page.status === "Completed") {
      // Extract the page ID from the linked Notion Page URL, falling back to the DB entry ID
      let contentPageId = page.id;
      if (page.notionPageUrl) {
        const match = page.notionPageUrl.match(/([a-f0-9]{32})(?:[?#].*)?$/i);
        if (match) {
          // Insert dashes to form a valid UUID: 8-4-4-4-12
          const h = match[1];
          contentPageId = `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
        }
      }
      try {
        console.log(`  Fetching content from page: ${contentPageId}`);
        const mdBlocks = await n2m.pageToMarkdown(contentPageId);
        const mdString = n2m.toMarkdownString(mdBlocks);
        bodyHtml = markdownToHtml(mdString.parent || "");
        if (!bodyHtml.trim()) bodyHtml = "<p>No content found on the linked Notion page.</p>";
      } catch (e) {
        console.warn(`  Could not fetch content for ${page.name}:`, e.message);
        bodyHtml = "<p>Content unavailable.</p>";
      }
    } else {
      // Active/locked — stub hidden behind lock screen anyway
      bodyHtml = `<h2>Port Scanning</h2><p>Initial reconnaissance to map the attack surface.</p>`;
    }

    const nav = buildNav(pages, page.slug);
    const html = buildPage(page, nav, bodyHtml);
    fs.writeFileSync(path.join(pageDir, "index.html"), html);
  }

  // Write CNAME + .nojekyll (prevents GitHub Pages from running Jekyll,
  // which would otherwise mangle paths and cause 404s on subfolders)
  fs.writeFileSync(path.join(OUT_DIR, "CNAME"), "0xnrg.se");
  fs.writeFileSync(path.join(OUT_DIR, ".nojekyll"), "");

  console.log("Done. Output in ./dist/");
}

main().catch(err => { console.error(err); process.exit(1); });
