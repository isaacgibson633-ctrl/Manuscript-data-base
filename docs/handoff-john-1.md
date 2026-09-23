# Handoff to Claude Code: early New Testament manuscript database

Paste this file (or point Claude Code at it) when you open the repository. Everything below is the context Claude Code needs to continue.

## What this project is

A free, accurate, secular manuscript database for general readers, in the spirit of an accessible museum guide. It shows which early manuscripts preserve each verse, how and by whom each manuscript is dated, where scholars disagree, and where to see photographs. Scholarly sources are cited throughout.

## Rules the site follows

- **Scope:** Greek New Testament papyri and majuscules dated up to AD 900 (9th century included). Greek is the primary layer. Latin manuscripts up to AD 900 are a secondary layer (curated key witnesses).
- **Manuscript-centred data:** each manuscript is recorded once. Passage pages are generated from the records plus a passage file.
- **Dates:** headline date is the INTF catalogue date for Greek manuscripts. Other proposals are listed with the scholar and work. Confidence label: `Firm` (specialists agree within about a century) or `Debated` (proposals differ by more than a century, or the catalogue date has been seriously challenged).
- **Language:** neutral and descriptive. The site neither defends nor attacks the Gospels.
- **Translation questions** that are about grammar, not manuscripts (e.g., John 1:1c), are flagged for a later "translation sweep". Variants that change a translation are covered now.
- **Images:** link out for now. On the hosted site, embed from libraries' IIIF servers where licences allow (e-codices, Cambridge Digital Library, Gallica, DigiVatLib). Do not rehost images without checking each licence.

## Files in this bundle

| Path | What it is |
|---|---|
| `data/manuscripts.json` | 51 manuscript records (36 Greek, 15 Latin): date, range, confidence, holding, contents, dating evidence, scholarly positions, literature keys, provenance, image links, open checks. |
| `data/bibliography.json` | 56 works keyed by id, grouped by topic, with plain and HTML citations. |
| `data/passage-john-1-1-18.json` | John 1:1–18: translation per verse, witnesses per verse (Greek and Latin, with status), four variants with witnesses and explanations, translation-sweep item, exclusions. |
| `data/scholars.json` | Who's-who table for the dating debate. |
| `data/drafts/*.csv` | Draft lists of all known papyri (32), majuscules (65) and key Latin witnesses (16) for the whole Gospel of John. Not yet merged into `manuscripts.json`. |
| `reference-pages/john-18-31.html` | Published pilot page (design reference): timeline, filters, manuscript list, dating explainer, bibliography. |
| `reference-pages/john-1-prologue.html` | Published chapter-page template: verse reader, coverage matrix, variant cards, Latin layer. |
| `john-1-1-18-dossier.md` | Human-readable version of the data: verse-by-verse witness tables, variants, one dating dossier per manuscript, bibliography. |

## Suggested first tasks for Claude Code

1. Create a repository (e.g., `nt-manuscripts`) with `data/` as above and a static site generator or a small vanilla JS build that renders:
   - a manuscript page per record (`/manuscripts/<id>`),
   - a passage page per passage file (`/john/1/1-18`),
   - the John 18:31 page, rebuilt from `manuscripts.json` instead of inline data.
2. Reuse the design tokens and layout from `reference-pages/` (fonts: GFS Didot, Literata, IBM Plex Mono; light and dark themes).
3. Validate the data: every `literature` key and every `bib` in `scholarly_positions` must exist in `bibliography.json`; every witness id in the passage file must exist in `manuscripts.json`.
4. Deploy on GitHub Pages.
5. Add a verse-range field to each record (machine-readable extant ranges for all of John) so any verse page can be generated. Start from `data/drafts/*.csv`.

## Open checks (do not publish publicly until these are done)

- Confirm every Greek record against the INTF Virtual Manuscript Room (the Cowork session could not reach it).
- Confirm variant witness lists against the printed Nestle–Aland 28 apparatus.
- Each record's `to_check` list (e.g., 0234 contents, 09 F legibility in John 1, W replacement-quire date, Latin q and Sangallensis 1395 coverage, some shelfmarks and provenance).
- Page ranges missing for a few works (Hunger 1960, Lyon 1958–59, Aland 1968).
- Ask one specialist to review before public launch.

## Roadmap after this

- Rest of John 1 (1:19–51), then the rest of John.
- Mark 16:9–20 case study in parallel, then Mark worked backwards from chapter 16.
- Later: Johannine Comma (needs a labelled "beyond the cut-off" section), translation sweep.
