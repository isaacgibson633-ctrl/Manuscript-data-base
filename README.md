# Manuscript Database

Greek manuscripts that contain a given New Testament verse, with their dates, how those dates were argued, where the manuscripts are now and where to see photographs. The first page covers **John 18:31**, for manuscripts copied up to about AD 900.

Draft v0.1, not yet peer-reviewed.

## How the site is built

Each verse gets its own page (`/john/18/31/`), and a home page lists all the verses. `scripts/build.mjs` writes these pages into `_site/` from the templates and the data files. On each verse page, a script in the browser then builds the manuscript list, timeline, tables and bibliography from the data files.

```
templates/verse.html        layout and fixed text of a verse page ({{placeholders}} are filled from the verse file)
templates/home.html         the home page
assets/style.css            styles
assets/app.js               builds a verse page's list, timeline and tables in the browser
data/manuscripts.json       one entry per manuscript: facts that are the same whichever verse you look at
data/verses/<book>-<chapter>-<verse>.json
                            one file per verse: text, translation, cut-off date, witnesses and exclusions
data/bibliography.json      every cited work, keyed by a short ID (e.g. "nongbri05")
data/dating-notes.json      shared "why this date" text used by several manuscripts
data/scholars.json          the "Who's who in the debate" table
scripts/check-data.mjs      checks the data files for mistakes
scripts/build.mjs           builds the site into _site/
```

## Editing the data

### Manuscripts

`data/manuscripts.json` holds what is true of a manuscript however many verses it is cited for. Its fields:

| Field | Meaning |
|---|---|
| `id` | Short unique ID, used by verse files and in links (`#ms-p52`) |
| `siglum`, `gaNumber` | Display siglum (`01 א`) and Gregory–Aland number (`01`) |
| `material` | `papyrus`, `parchment` or `unknown` |
| `palimpsest` | `true` if the text is underneath later writing (optional) |
| `date` | Date as displayed (`4th century`) |
| `dateRange.earliest`, `dateRange.latest` | Range of proposed dates (AD), drawn as the bar on the timeline |
| `catalogueDate` | INTF catalogue estimate (AD), drawn as the dot and used for sorting |
| `confidence` | `Firm` or `Debated` |
| `library`, `shelfmark`, `city` | Current location |
| `summary`, `datingSummary`, `provenance` | Text for the entry |
| `vmrId` | INTF Virtual Manuscript Room document ID |
| `images` | List of `{ "label", "url" }` links to image viewers |
| `datingEvidence` | `text` (or `note`, a key from `dating-notes.json`), `positions` (`who`, `claim`, `source`), and `furtherReading` (bibliography keys) |

### Verses

Each verse is one file in `data/verses/`, named `<bookSlug>-<chapter>-<verse>.json` (for example `john-18-31.json`), and is published at `/<bookSlug>/<chapter>/<verse>/`. Its fields:

| Field | Meaning |
|---|---|
| `reference`, `book` | `John 18:31`, `John` |
| `bookSlug`, `chapter`, `verse` | `john`, `18`, `31`; books with numbers are written `1-corinthians` |
| `heading` | Page heading (optional; defaults to "Who has John 18:31?") |
| `greek`, `translation` | Verse text as printed in critical editions, and the literal translation |
| `cutoff` | Latest date (AD) of manuscripts included |
| `witnesses` | List of `{ "manuscript": <id from manuscripts.json>, "contents": what survives of this verse in it }` |
| `excluded` | The "Why some famous manuscripts aren't listed" table: `{ "manuscript", "date", "reason" }` |

**To add a verse:** copy `john-18-31.json`, rename it, and change the text, witnesses and exclusions. A manuscript that is already in `manuscripts.json` only needs a witness line. Add a full entry to `manuscripts.json` only for manuscripts that are new to the site.

### Bibliography

**Add a book or article** to `data/bibliography.json` under `works`, with a new key, its `group` (one of the names in `groups`) and its `citation`. Citations may use `<i>…</i>` for titles. Then refer to it by its key from a manuscript or scholar.

### Checking

Before committing, run:

```
node scripts/check-data.mjs
```

It reports unknown bibliography keys, witnesses missing from `manuscripts.json`, missing fields, dates outside their range, badly named verse files and similar mistakes. The same check runs on GitHub for every push and pull request.

## Previewing locally

```
node scripts/build.mjs
python3 -m http.server -d _site
```

Then visit http://localhost:8000. Re-run the build after any change, since `_site/` holds a copy of the data and assets.

## Publishing

`.github/workflows/pages.yml` checks the data and then publishes the site to GitHub Pages on every push to `main`. One-time setup: in the repository's **Settings → Pages**, set **Source** to **GitHub Actions**. The site will then be at `https://isaacgibson633-ctrl.github.io/Manuscript-data-base/`.
