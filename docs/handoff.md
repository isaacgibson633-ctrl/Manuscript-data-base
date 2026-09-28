# NT Manuscript Database: Claude Code handoff (single file)

Compiled 2026-09-26. This one file replaces the separate handoff documents. It contains the instructions, the project decisions, the readable dossiers, and every data file and reference page as embedded blocks.

**For Claude Code:** Part 6 holds the canonical data. Each block is headed with the file path it belongs at. Extract each block to that path in the repository (do not edit content while extracting), then follow Part 1.

## Contents

1. Instructions and project rules
2. Roadmap, decisions and open checks
3. Dossier: John 1:1–18
4. Dossier: John 1:19–51
5. Dossier: John 2
6. Embedded files (data, drafts, reference pages)

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
| `data/manuscripts.json` | 78 manuscript records (55 Greek, 23 Latin): date, range, confidence, holding, contents, dating evidence, scholarly positions, literature keys, provenance, image links, open checks. |
| `data/bibliography.json` | 67 works keyed by id, grouped by topic, with plain and HTML citations. |
| `data/passage-john-1-1-18.json` | John 1:1–18: translation per verse, witnesses per verse (Greek and Latin, with status), four variants with witnesses and explanations, translation-sweep item, exclusions. |
| `data/passage-john-1-19-51.json` | John 1:19–51 in four sections: translation, witnesses per verse, Latin coverage notes, five variants (1:28, 1:34, 1:41, 1:42, 1:51), translation-sweep item (1:39). |
| `data/passage-john-2.json` | John 2 in three sections: witnesses per verse, Latin coverage (full Vetus Latina Iohannes catalogue up to 900), three variants (2:3, 2:15, 2:17), translation-sweep items (2:4, 2:6). |
| `data/scholars.json` | Who's-who table for the dating debate. |
| `data/drafts/*.csv` | Draft lists of all known papyri (32), majuscules (65) and key Latin witnesses (16) for the whole Gospel of John. Not yet merged into `manuscripts.json`. |
| `reference-pages/john-18-31.html` | Published pilot page (design reference): timeline, filters, manuscript list, dating explainer, bibliography. |
| `reference-pages/john-1-prologue.html` | Published chapter-page template: verse reader, coverage matrix, variant cards, Latin layer. |
| `reference-pages/john-2.html` | Chapter page for John 2 (same template). |
| `reference-pages/john-1-19-51.html` | Same template with section headings inside the reader and matrix, plus a table of manuscripts new to the section. |
| `john-2-dossier.md` | Readable dossier for John 2, including corrections to John 1. |
| `john-1-19-51-dossier.md` | Readable dossier for John 1:19–51, with dating write-ups for the 14 manuscripts new to this section. |
| `john-1-1-18-dossier.md` | Human-readable version of the data: verse-by-verse witness tables, variants, one dating dossier per manuscript, bibliography. |

### Suggested first tasks for Claude Code

1. Create a repository (e.g., `nt-manuscripts`) with `data/` as above and a static site generator or a small vanilla JS build that renders:
   - a manuscript page per record (`/manuscripts/<id>`),
   - a passage page per passage file (`/john/1/1-18`, `/john/1/19-51`, `/john/2`),
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

- John 1 and John 2 are drafted. Next: John 3, then the rest of John.
- Mark 16:9–20 case study in parallel, then Mark worked backwards from chapter 16.
- Later: Johannine Comma (needs a labelled "beyond the cut-off" section), translation sweep.


### Extracting the embedded files

Each file in Part 6 appears as:

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
- John 18:31 pilot (v0.3): https://claude.ai/artifact/PeMB8eE5g13aX4kfwPCCH4
- John 1:1-18 Prologue (v0.5): https://claude.ai/artifact/MK6RXVmr2joxAsSYqwisvF
  - Variants: 1:3-4 punctuation, 1:4 was/is, 1:13 who/he who, 1:18 God/Son. 1:1c flagged.
- John 1:19-51 (v0.3): https://claude.ai/artifact/3GGkFm117MjzEmn2LeKQxM
  - Sections: 1:19-28 envoys; 1:29-34 Lamb of God; 1:35-42 first disciples; 1:43-51 Philip and Nathanael.
  - Variants: 1:28 Bethany/Bethabara (Origen); 1:34 Son/Chosen One (𝔓5vid 𝔓106vid 01* b e ff2* sys,c; Quek NTS 55 (2009); Ehrman); 1:41 πρῶτον/πρῶτος; 1:42 son of John/Jonah; 1:51 ἀπ᾽ ἄρτι (added from Matt 26:64). 1:39 tenth hour flagged.
  - 14 manuscripts new to this section: 𝔓5, 𝔓106, 𝔓119, 𝔓134, 𝔓120, 𝔓55, 𝔓59, 029 T, 083, 024 P, 086, 0260, 0268, 0101.

- John 2 (v0.1): https://claude.ai/artifact/SndDW6V3S7ycgvDqHw9cUF
  - Sections: 2:1-12 Cana; 2:13-22 temple; 2:23-25 signs at Passover.
  - Variants: 2:3 Sinaiticus* + Old Latin (a, j) longer text (Fee, NTS 15 (1968) 23-44: Sinaiticus "Western" in John 1-8); 2:15 ὡς (𝔓66 𝔓75 L N f1 33 lat; NET's only tc note for John 2); 2:17 καταφάγεται / κατέφαγε (witness lists unverified).
  - Translation sweep: 2:4 "Woman, what is that to me and to you?"; 2:6 measures.
  - New: 0162 (P.Oxy. 847, 4th c.; Comfort 3rd), 0127 (Greek-Coptic, White Monastery), 0273 (palimpsest), 0287 (Sinai New Finds); Latin j (VL 22) and others.
  - Latin layer now follows the Vetus Latina Iohannes catalogue (all Old Latin MSS of John to 900) plus early Vulgate.

### Data
- manuscripts.json: 78 records (55 Greek, 23 Latin)
- bibliography.json: 67 works
- passage-john-1-1-18.json, passage-john-1-19-51.json, passage-john-2.json
- Draft CSVs for all of John (papyri, majuscules, Latin)

### Verification done
- 022 N resolved (John 2 round): IGNTP gives 1:21-39 and 2:6-3:14, confirmed by NET citing N at 2:15. Earlier ranges were reversed; pages fixed.
- Prologue: witnesses for 1:3-4, 1:4, 1:13, 1:18 against NET tc notes and apparatus summaries; Latin coverage of 1:1-18.
- 1:19-51: witnesses for 1:28, 1:34, 1:41, 1:42 against NET tc notes; 1:51 against James Snapp's survey (finding aid only); papyrus contents against edition summaries.
- Chapter 1 completeness: the NET notes have five text-critical notes for John 1 (1:3-4, 1:18, 1:28/1:34, 1:41, 1:42); all are covered, plus 1:4, 1:13, 1:51 from other sources.
- Majuscule coverage of John 1 checked against the IGNTP majuscule edition's contents lists. Corrections: 05 D Greek has 1:1-16; 09 F has 1:1, 3-4, 7-8, 10-51; 013 H lacks 1:11; 04 C has 1:3-40; 0234 is 1:4-8, 20-24 only (the 1:18 citation was an error); 0268 is 1:30-32. Added 063 (9th c., John 1:1-3:34), missed earlier.
- 09 F: INTF says 9th c.; Utrecht University Library says Constantinople c. 1000. Now marked Debated.
- W replacement quire: about 7th c., mixed text (confirmed; no named study).
- 𝔓106: P.Oxy. LXV (1998), ed. Cockle; first half of 3rd c.; Head, TynBul 51.1 (2000) 1-16 accepts ἐκλεκτός at 1:34. 𝔓5's reading there is reconstructed from line length only.
- 𝔓5: BL Inv. 782 and 2484. Nessana II: 1950 (confirmed). Lyon: NTS 5.4 (1959) 260-72. Hunger: Anzeiger 97 (1961) 12-23.
- Latin (Houghton catalogue via Helsinki guide): a second half 4th c., Vercelli; e Trento ms. 1589, north Italy; ff2 Italy; q 6th/7th c., Illyria or Italy, Gospels in Western order; r1 c. 600; l first half 8th c., Aquileia; Sangallensis 1395 Verona, 5th c. (Lowe: possibly Jerome's lifetime).

### Still open
- Final check against the printed NA28 apparatus for all variants.
- INTF check of every Greek record.
- 𝔓120 exact ranges (sources differ); 𝔓134 which side of the roll (Ransom Center: front; Wikipedia: back); 0233 contents (NET cites it at 1:34).
- 1:41 Old Latin "mane" reading: unverified, removed from the page until confirmed.
- Sangallensis 1395 verse-level coverage (q resolved: complete in John 1-2 per Vetus Latina Iohannes).
- 037 Δ date: Vetus Latina Iohannes gives 960/970 vs INTF 9th c. and library c. 850.
- 0273 start (2:7 or 2:17); 0287 exact verses and material; j (VL 22) ranges (VL Iohannes vs Wikipedia).
- 2:17 witness lists.
- Aland 1968 page range.

### Next
- John 3 (3:13 "who is in heaven", 3:16 context; 070, 086, 029 T, 083, 0141 excluded).
- Mark 16:9-20 study (083/0112 already noted).

### Open decisions
- Rule for evidence beyond the cut-off (needed before the Johannine Comma).
- 09 F headline date (9th c. or c. 1000).


---

