# Early New Testament Manuscripts

Static site: `data/*.json` → `scripts/build.mjs` → `_site/`. No dependencies beyond Node 22. See README.md for the data format.

## Commands

- `node scripts/check-data.mjs` (add `--open` to list open checks): run after any data change; must pass.
- `node scripts/build.mjs`: builds `_site/`. Preview with `python3 -m http.server -d _site`.

## Rules the site follows

- **Scope:** Greek New Testament papyri and majuscules dated up to AD 900 (9th century included) are the primary layer. Latin manuscripts up to AD 900 are a secondary layer of curated key witnesses.
- **Manuscript-centred data:** each manuscript is recorded once in `data/manuscripts.json`. Passage pages are generated from the records plus a passage file. Never copy manuscript facts into passage files.
- **Dates:** the headline date is the INTF catalogue date for Greek manuscripts. Other proposals are listed with the scholar and work. `Firm` = specialists agree within about a century; `Debated` = proposals differ by more than a century, or the catalogue date has been seriously challenged.
- **Language:** neutral and descriptive. The site neither defends nor attacks the Gospels.
- **Translation questions** about grammar, not manuscripts (e.g. John 1:1c), go in `translation_sweep`. Variants that change a translation are covered in `variants`.
- **Images:** link out. Embedding from IIIF servers (e-codices, Cambridge Digital Library, Gallica, DigiVatLib) is allowed only where the licence permits; never rehost images without checking each licence.
- **Unverified data stays visible:** anything uncertain goes in the record's `to_check` list or a witness status of `to_check` / `to_map`, never silently resolved. The site shows these on every page that uses them.

## Working on the data

The research data comes from separate research sessions. Treat it as the source: adapt the code to its format rather than reshaping it, and report conflicts or suspected errors instead of fixing facts yourself.
