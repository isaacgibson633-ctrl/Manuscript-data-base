# NT Manuscript Database: Claude Code handoff (single file)

Compiled 2026-09-24. This one file replaces the separate handoff documents. It contains the instructions, the project decisions, the readable dossiers, and every data file and reference page as embedded blocks.

**For Claude Code:** Part 5 holds the canonical data. Each block is headed with the file path it belongs at. Extract each block to that path in the repository (do not edit content while extracting), then follow Part 1.

## Contents

1. Instructions and project rules
2. Roadmap, decisions and open checks
3. Dossier: John 1:1–18
4. Dossier: John 1:19–51
5. Embedded files (data, drafts, reference pages)

---

## Part 1. Instructions and project rules


Paste this file (or point Claude Code at it) when you open the repository. Everything below is the context Claude Code needs to continue.

### What this project is

A free, accurate, secular manuscript database for general readers, in the spirit of an accessible museum guide. It shows which early manuscripts preserve each verse, how and by whom each manuscript is dated, where scholars disagree, and where to see photographs. Scholarly sources are cited throughout.

### Rules the site follows

- **Scope:** Greek New Testament papyri and majuscules dated up to AD 900 (9th century included). Greek is the primary layer. Latin manuscripts up to AD 900 are a secondary layer (curated key witnesses).
- **Manuscript-centred data:** each manuscript is recorded once. Passage pages are generated from the records plus a passage file.
- **Dates:** headline date is the INTF catalogue date for Greek manuscripts. Other proposals are listed with the scholar and work. Confidence label: `Firm` (specialists agree within about a century) or `Debated` (proposals differ by more than a century, or the catalogue date has been seriously challenged).
- **Language:** neutral and descriptive. The site neither defends nor attacks the Gospels.
- **Translation questions** that are about grammar, not manuscripts (e.g., John 1:1c), are flagged for a later "translation sweep". Variants that change a translation are covered now.
- **Images:** link out for now. On the hosted site, embed from libraries' IIIF servers where licences allow (e-codices, Cambridge Digital Library, Gallica, DigiVatLib). Do not rehost images without checking each licence.

### Files in this bundle

| Path | What it is |
|---|---|
| `data/manuscripts.json` | 65 manuscript records (50 Greek, 15 Latin): date, range, confidence, holding, contents, dating evidence, scholarly positions, literature keys, provenance, image links, open checks. |
| `data/bibliography.json` | 61 works keyed by id, grouped by topic, with plain and HTML citations. |
| `data/passage-john-1-1-18.json` | John 1:1–18: translation per verse, witnesses per verse (Greek and Latin, with status), four variants with witnesses and explanations, translation-sweep item, exclusions. |
| `data/passage-john-1-19-51.json` | John 1:19–51 in four sections: translation, witnesses per verse, Latin coverage notes, five variants (1:28, 1:34, 1:41, 1:42, 1:51), translation-sweep item (1:39). |
| `data/scholars.json` | Who's-who table for the dating debate. |
| `data/drafts/*.csv` | Draft lists of all known papyri (32), majuscules (65) and key Latin witnesses (16) for the whole Gospel of John. Not yet merged into `manuscripts.json`. |
| `reference-pages/john-18-31.html` | Published pilot page (design reference): timeline, filters, manuscript list, dating explainer, bibliography. |
| `reference-pages/john-1-prologue.html` | Published chapter-page template: verse reader, coverage matrix, variant cards, Latin layer. |
| `reference-pages/john-1-19-51.html` | Same template with section headings inside the reader and matrix, plus a table of manuscripts new to the section. |
| `john-1-19-51-dossier.md` | Readable dossier for John 1:19–51, with dating write-ups for the 14 manuscripts new to this section. |
| `john-1-1-18-dossier.md` | Human-readable version of the data: verse-by-verse witness tables, variants, one dating dossier per manuscript, bibliography. |

### Suggested first tasks for Claude Code

1. Create a repository (e.g., `nt-manuscripts`) with `data/` as above and a static site generator or a small vanilla JS build that renders:
   - a manuscript page per record (`/manuscripts/<id>`),
   - a passage page per passage file (`/john/1/1-18`, `/john/1/19-51`),
   - the John 18:31 page, rebuilt from `manuscripts.json` instead of inline data.
2. Reuse the design tokens and layout from `reference-pages/` (fonts: GFS Didot, Literata, IBM Plex Mono; light and dark themes).
3. Validate the data: every `literature` key and every `bib` in `scholarly_positions` must exist in `bibliography.json`; every witness id in the passage file must exist in `manuscripts.json`.
4. Deploy on GitHub Pages.
5. Add a verse-range field to each record (machine-readable extant ranges for all of John) so any verse page can be generated. Start from `data/drafts/*.csv`.

### Open checks (do not publish publicly until these are done)

- Confirm every Greek record against the INTF Virtual Manuscript Room (the Cowork session could not reach it).
- Confirm variant witness lists against the printed Nestle–Aland 28 apparatus.
- Each record's `to_check` list (e.g., 0234 contents, 09 F legibility in John 1, W replacement-quire date, Latin q and Sangallensis 1395 coverage, some shelfmarks and provenance).
- Page ranges missing for a few works (Hunger 1960, Lyon 1958–59, Aland 1968).
- Ask one specialist to review before public launch.

### Roadmap after this

- John 1 is drafted (1:1–18 and 1:19–51). Next: John 2, then the rest of John.
- Mark 16:9–20 case study in parallel, then Mark worked backwards from chapter 16.
- Later: Johannine Comma (needs a labelled "beyond the cut-off" section), translation sweep.


### Extracting the embedded files

Each file in Part 5 appears as:

- a heading line `#### FILE: <path>`
- one fenced block holding the exact file contents.

A short script can split this document: find each `#### FILE:` heading, take the fenced block that follows, and write its contents to the path.

---

## Part 2. Roadmap, decisions and open checks


### Decisions
- Scope: Greek New Testament papyri and majuscules dated up to AD 900 (9th century included). Greek is the main focus.
- Latin: included as a secondary layer, manuscripts up to AD 900 only (Old Latin and early Vulgate), curated key witnesses rather than exhaustive.
- Data model: manuscript-centred. Each manuscript is recorded once, with its extant verse ranges (machine-readable), gaps, a "fragmentary" flag, dating evidence, scholarly positions and bibliography. Verse pages are generated from those records.
- Work streams, run at the same time:
  1. Gospel of John, complete, working from chapter 1: every early manuscript with any part of John, plus dating debates.
  2. Mark 16:9-20 (the longer ending) as the first case study. Mark then becomes the second full book, worked in reverse from chapter 16 back to chapter 1.
- Translation issues: grammar/interpretation questions go in a later translation sweep, flagged as "translation note to revisit" (so far: John 1:1c, John 1:39 "tenth hour"). Variants that change the translation go in now.
- Later: Johannine Comma (needs a labelled "beyond the cut-off" section for post-900 evidence). Nativity stories held until/unless the site adds a historical-questions section.
- Build/hosting moves to Claude Code + GitHub (GitHub Pages, IIIF images). Research, fact-checking and drafting stay in Cowork.
- Handoff format: one compiled file, NT-manuscripts-claude-code-handoff.md, regenerated after each research round.

### Pages so far
- John 18:31 pilot (v0.2): https://claude.ai/artifact/PeMB8eE5g13aX4kfwPCCH4
- John 1:1-18 Prologue (v0.3): https://claude.ai/artifact/MK6RXVmr2joxAsSYqwisvF
  - Variants: 1:3-4 punctuation, 1:4 was/is, 1:13 who/he who, 1:18 God/Son. 1:1c flagged.
- John 1:19-51 (v0.1): https://claude.ai/artifact/3GGkFm117MjzEmn2LeKQxM
  - Sections: 1:19-28 envoys; 1:29-34 Lamb of God; 1:35-42 first disciples; 1:43-51 Philip and Nathanael.
  - Variants: 1:28 Bethany/Bethabara (Origen); 1:34 Son/Chosen One (𝔓5vid 𝔓106vid 01* b e ff2* sys,c; Quek NTS 55 (2009); Ehrman); 1:41 πρῶτον/πρῶτος; 1:42 son of John/Jonah; 1:51 ἀπ᾽ ἄρτι (added from Matt 26:64). 1:39 tenth hour flagged.
  - 14 manuscripts new to this section: 𝔓5, 𝔓106, 𝔓119, 𝔓134, 𝔓120, 𝔓55, 𝔓59, 029 T, 083, 024 P, 086, 0260, 0268, 0101.

### Data
- manuscripts.json: 65 records (50 Greek, 15 Latin)
- bibliography.json: 61 works
- passage-john-1-1-18.json, passage-john-1-19-51.json
- Draft CSVs for all of John (papyri, majuscules, Latin)

### Verification done
- Prologue: witnesses for 1:3-4, 1:4, 1:13, 1:18 against NET tc notes and apparatus summaries; Latin coverage of 1:1-18.
- 1:19-51: witnesses for 1:28, 1:34, 1:41, 1:42 against NET tc notes; 1:51 against James Snapp's survey (blog, used only as a finding aid); papyrus contents against edition summaries.

### Still open
- Final check against the printed NA28 apparatus for all variants.
- INTF check of every Greek record.
- 0234 extent; 09 F legibility in John 1; W replacement-quire date; 𝔓120 exact ranges; 𝔓106 P.Oxy volume (LXIV 1997 or LXV 1998); 𝔓134 which side of the roll; Nessana volume year (1946 vs 1950); 𝔓5 BL shelfmarks.
- 1:41 Old Latin "mane" (in the morning) reading: confirm witnesses.
- Latin q and Sangallensis 1395 coverage.
- Page ranges for Hunger 1960, Lyon 1958-59, Aland 1968.

### Next
- John 2 (0162 is the key early parchment fragment; 𝔓66 𝔓75 continue).
- Mark 16:9-20 study (083/0112 already noted).

### Open decisions
- Rule for evidence beyond the cut-off (needed before the Johannine Comma).


