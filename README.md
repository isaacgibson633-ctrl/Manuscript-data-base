# Early New Testament Manuscripts

A free, accurate, secular guide to the earliest manuscripts of the New Testament for general readers. For each passage it shows which early manuscripts preserve it, how and by whom each manuscript is dated, where scholars disagree, and where to see photographs. Scholarly sources are cited throughout.

Draft v0.1, not yet peer-reviewed. See [Open checks](#open-checks) before releasing publicly.

## What's on the site

| Address | Built from |
|---|---|
| `/` | Home: the passages and the project in brief |
| `/john/1/1-18/`, `/john/18/31/` | One page per `data/passage-*.json` |
| `/manuscripts/` and `/manuscripts/<id>/` | One page per record in `data/manuscripts.json` |
| `/dating/` | `templates/dating.html` plus `data/scholars.json` |
| `/bibliography/` | `data/bibliography.json` |
| `/about/` | `templates/method.html` |
| `/checks/` | Every `to_check` item and every verse marked `to_check` or `to_map` |

`scripts/build.mjs` writes all pages into `_site/` as plain HTML. The only browser script (`assets/passage.js`) adds the filters and timeline links on passage pages; the pages read fine without it.

## Data

Research data lives in `data/` and is written in the Cowork research sessions. The site code adapts to this format, not the other way round.

### `manuscripts.json`: one record per manuscript

Each manuscript is recorded once; passage pages refer to it by `id`.

| Field | Meaning |
|---|---|
| `id` | Unique ID, also the web address (`p75` → `/manuscripts/p75/`). Lower-case letters, digits and `_` only. |
| `language` | `Greek` or `Latin` |
| `ga`, `siglum` | Gregory–Aland number (`P75`) and display siglum (`𝔓75`). Required for Greek; Latin may leave `siglum` out. |
| `name`, `summary` | Name and a one- or two-sentence description |
| `material`, `palimpsest` | `papyrus`, `parchment` or `to check`; `true` / `false` |
| `date` | `label` (as displayed), `range_start` / `range_end` (AD, the timeline bar), `estimate` (AD, the dot and sort order), `confidence` (`Firm` or `Debated`), `summary` |
| `holding` | `library`, `shelfmark`, `city` |
| `contents_summary` | What survives |
| `dating_evidence` | Why this date, in prose |
| `scholarly_positions` | List of `{ who, claim, bib }`, where `bib` is a bibliography key |
| `literature` | Bibliography keys for "Read further" |
| `provenance` | How it reached its current home |
| `images` | List of `{ label, url }`. The INTF Virtual Manuscript Room link is shown as the main button. |
| `intf_docid` | INTF document ID (Greek only) |
| `text_type` | Latin only, e.g. `Old Latin (African)` |
| `to_check` | Open questions about this record. Each one shows on the record, on passage pages that use it, and on `/checks/`. |

### `passage-<book>-<chapter>-<verses>.json`: one file per passage

The file name must match the `passage` field: `"John 1:1–18"` → `passage-john-1-1-18.json` → `/john/1/1-18/`.

| Field | Meaning |
|---|---|
| `passage` | `John 1:1–18` or `John 18:31` (one chapter per file) |
| `heading`, `lede` | Optional page title and introduction |
| `scope`, `translation_note` | Scope statement and note on the translation |
| `verses` | One entry per verse, in order: `ref`, `verse`, `translation`, optional `greek` (full text, shown for single-verse pages), `greek_where_variant`, `variants` and `translation_notes` (IDs), `greek_witnesses` and `latin_witnesses` |
| witness entries | `{ id, status }`, status one of `preserved`, `replacement_leaves`, `to_check`, `preserved_in_harmony`, `to_map` |
| `variants` | `{ id, ref, label, title, readings: [{ greek, english, witnesses, printed_in_NA28 }], explanation, literature }` |
| `translation_sweep` | `{ id, ref, question, greek, manuscripts_agree, explanation, literature }`: grammar questions saved for later |
| `excluded` | `{ id or label, date, reason }`: well-known manuscripts left out, and why |
| `literature` | Optional extra bibliography keys for the passage |

### Other files

- `bibliography.json`: works keyed by ID, each with `group`, `citation` (plain) and `citation_html` (titles in `<i>`).
- `scholars.json`: the who's-who table on `/dating/`.
- `drafts/*.csv`: draft lists of all known papyri, majuscules and key Latin witnesses for the whole of John. Not yet merged into `manuscripts.json`.

## Checking and building

```
node scripts/check-data.mjs          # check the data; add --open to list every open check
node scripts/build.mjs               # build the site into _site/
python3 -m http.server -d _site      # preview at http://localhost:8000
```

The checker catches unknown bibliography keys (in `literature`, `scholarly_positions`, variants, the translation sweep and `scholars.json`), witness IDs missing from `manuscripts.json`, Greek witnesses listed as Latin and vice versa, unknown statuses, variants no verse refers to, badly named passage files, and dates outside their range. It runs on GitHub for every push and pull request.

## Publishing

`.github/workflows/pages.yml` checks the data, builds the site and publishes it to GitHub Pages on every push to `main`. One-time setup: in the repository's **Settings → Pages**, set **Source** to **GitHub Actions**. The site will be at `https://isaacgibson633-ctrl.github.io/Manuscript-data-base/`.

## Open checks

Before public release:

- Confirm every Greek record against the INTF Virtual Manuscript Room.
- Confirm variant witness lists against the printed Nestle–Aland 28 apparatus.
- Resolve each record's `to_check` list (listed on `/checks/`).
- Add missing page ranges (Hunger 1960, Lyon 1958–59, Aland 1968).
- Ask one specialist to review.

## Roadmap

- Machine-readable extant verse ranges for every record, starting from `data/drafts/*.csv`, so any verse page can be generated.
- Rest of John 1 (1:19–51), then the rest of John.
- Mark 16:9–20 case study, then Mark worked backwards from chapter 16.
- Later: the Johannine Comma (needs a labelled "beyond the cut-off" section) and the translation sweep.

`docs/` keeps the handoff notes and the two published reference pages the design follows.
