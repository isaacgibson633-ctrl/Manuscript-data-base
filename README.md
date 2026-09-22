# Manuscript Database

Greek manuscripts that contain a given New Testament verse, with their dates, how those dates were argued, where the manuscripts are now and where to see photographs. The first page covers **John 18:31**, for manuscripts copied up to about AD 900.

Draft v0.1, not yet peer-reviewed.

## How the site is built

The page is plain HTML, CSS and JavaScript, with no build step. The script reads the data files and builds the list, timeline, tables and bibliography in the browser.

```
index.html              page text and layout (verse, method notes, section headings)
assets/style.css        styles
assets/app.js           builds the page from the data files
data/manuscripts.json   one entry per manuscript
data/bibliography.json  every cited work, keyed by a short ID (e.g. "nongbri05")
data/dating-notes.json  shared "why this date" text used by several manuscripts
data/scholars.json      the "Who's who in the debate" table
data/excluded.json      the "Why some famous manuscripts aren't listed" table
scripts/check-data.mjs  checks the data files for mistakes
```

## Editing the data

**Add or correct a manuscript** in `data/manuscripts.json`. The fields:

| Field | Meaning |
|---|---|
| `id` | Short unique ID, used in links (`#ms-p52`) |
| `siglum`, `gaNumber` | Display siglum (`01 א`) and Gregory–Aland number (`01`) |
| `material` | `papyrus`, `parchment` or `unknown` |
| `palimpsest` | `true` if the text is underneath later writing (optional) |
| `date` | Date as displayed (`4th century`) |
| `dateRange.earliest`, `dateRange.latest` | Range of proposed dates (AD), drawn as the bar on the timeline |
| `catalogueDate` | INTF catalogue estimate (AD), drawn as the dot and used for sorting |
| `confidence` | `Firm` or `Debated` |
| `library`, `shelfmark`, `city` | Current location |
| `contents`, `summary`, `datingSummary`, `provenance` | Text for the entry |
| `vmrId` | INTF Virtual Manuscript Room document ID |
| `images` | List of `{ "label", "url" }` links to image viewers |
| `datingEvidence` | `text` (or `note`, a key from `dating-notes.json`), `positions` (`who`, `claim`, `source`), and `furtherReading` (bibliography keys) |

**Add a book or article** to `data/bibliography.json` under `works`, with a new key, its `group` (one of the names in `groups`) and its `citation`. Citations may use `<i>…</i>` for titles. Then refer to it by its key from a manuscript or scholar.

Before committing, run:

```
node scripts/check-data.mjs
```

It reports unknown bibliography keys, missing fields, dates outside their range and similar mistakes. The same check runs on GitHub for every push and pull request.

## Previewing locally

The page loads its data with `fetch`, so opening `index.html` straight from disk won't work. Serve the folder instead:

```
python3 -m http.server
```

and visit http://localhost:8000.

## Publishing

`.github/workflows/pages.yml` checks the data and then publishes the site to GitHub Pages on every push to `main`. One-time setup: in the repository's **Settings → Pages**, set **Source** to **GitHub Actions**. The site will then be at `https://isaacgibson633-ctrl.github.io/Manuscript-data-base/`.
