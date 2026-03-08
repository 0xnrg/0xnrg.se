# 0xnrg.se

CTF writeup site — auto-synced from Notion → GitHub Pages.

## Setup (one-time)

### 1. GitHub Secrets
Go to your repo → **Settings → Secrets and variables → Actions → New repository secret**

Add two secrets:

| Name | Value |
|------|-------|
| `NOTION_TOKEN` | Your `secret_xxx` integration token from notion.so/my-integrations |
| `NOTION_DATABASE_ID` | `358d656f-49a2-4a09-870a-9a60de56bb0e` |

### 2. Enable GitHub Pages
Go to **Settings → Pages**
- Source: **GitHub Actions**
- Save

### 3. DNS (at your domain registrar)
Add these four A records pointing to GitHub Pages:

| Type | Name | Value |
|------|------|-------|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |

Also add a CNAME for www:

| Type | Name | Value |
|------|------|-------|
| CNAME | www | 0xnrg.github.io |

DNS propagation takes up to 24h but usually works within minutes.

### 4. First deploy
Go to **Actions → Sync Notion → Deploy → Run workflow**

The site will be live at https://0xnrg.se once DNS has propagated.

---

## How it works

- GitHub Actions runs every night at 03:00 UTC
- Fetches all entries with `Status = Retired` or `Status = Completed` from your Notion CTF DATABASE
- `Retired` → full writeup published
- `Completed` → visible in sidebar with lock UI, content hidden
- Builds static HTML into `./dist/` and deploys to GitHub Pages

## Manual trigger
Actions tab → **Sync Notion → Deploy** → **Run workflow**

Use this whenever you flip a box to `Retired` in Notion and want it published immediately.
