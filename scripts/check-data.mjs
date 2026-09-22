// Checks the data files for mistakes that would break the page.
// Run with: node scripts/check-data.mjs
import { readFileSync, readdirSync } from "node:fs";

const load = f => JSON.parse(readFileSync(new URL(`../data/${f}.json`, import.meta.url), "utf8"));
const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);

const mss = load("manuscripts"), bib = load("bibliography"), notes = load("dating-notes");
const scholars = load("scholars");
const verseFiles = readdirSync(new URL("../data/verses/", import.meta.url)).filter(f => f.endsWith(".json"));
const verses = verseFiles.map(f => [f, load(`verses/${f.replace(/\.json$/, "")}`)]);
const works = bib.works;
const ref = (where, k) => { if (!works[k]) err(where, `unknown bibliography key "${k}"`); };

const required = ["id","siglum","gaNumber","name","material","date","dateRange","catalogueDate","confidence",
  "library","shelfmark","city","summary","datingSummary","provenance","vmrId","images"];
const ids = new Set();
for (const m of mss) {
  const w = `manuscripts.json [${m.id ?? "?"}]`;
  for (const f of required) if (m[f] === undefined || m[f] === "") err(w, `missing "${f}"`);
  if (ids.has(m.id)) err(w, "duplicate id"); ids.add(m.id);
  if (!["papyrus","parchment","unknown"].includes(m.material)) err(w, `material must be papyrus, parchment or unknown`);
  if (!["Firm","Debated"].includes(m.confidence)) err(w, `confidence must be Firm or Debated`);
  const r = m.dateRange || {};
  if (!(r.earliest <= m.catalogueDate && m.catalogueDate <= r.latest)) err(w, `catalogueDate should fall within dateRange`);
  for (const i of m.images || []) if (!/^https:\/\//.test(i.url || "")) err(w, `image link "${i.label}" needs an https URL`);
  const d = m.datingEvidence;
  if (d) {
    if (d.note ? !notes[d.note] : !d.text) err(w, `datingEvidence needs "text" or a known "note"`);
    (d.positions || []).forEach(p => p.source && ref(w, p.source));
    (d.furtherReading || []).forEach(k => ref(w, k));
  }
}
for (const [k, b] of Object.entries(works)) {
  if (!bib.groups.includes(b.group)) err(`bibliography.json [${k}]`, `group "${b.group}" is not in the groups list`);
  if (!b.citation) err(`bibliography.json [${k}]`, "missing citation");
}
scholars.forEach(s => ref(`scholars.json [${s.name}]`, s.keyWork));

const BOOKS = ["matthew","mark","luke","john","acts","romans","1-corinthians","2-corinthians","galatians","ephesians",
  "philippians","colossians","1-thessalonians","2-thessalonians","1-timothy","2-timothy","titus","philemon","hebrews",
  "james","1-peter","2-peter","1-john","2-john","3-john","jude","revelation"];
const cited = new Set(), paths = new Set();
for (const [f, v] of verses) {
  const w = `verses/${f}`;
  for (const k of ["reference","book","bookSlug","chapter","verse","greek","translation","cutoff","witnesses","excluded"])
    if (v[k] === undefined || v[k] === "") err(w, `missing "${k}"`);
  if (!BOOKS.includes(v.bookSlug)) err(w, `bookSlug "${v.bookSlug}" is not a New Testament book (e.g. "john", "1-corinthians")`);
  const expected = `${v.bookSlug}-${v.chapter}-${v.verse}.json`;
  if (f !== expected) err(w, `file should be named ${expected}`);
  const path = `${v.bookSlug}/${v.chapter}/${v.verse}`;
  if (paths.has(path)) err(w, `another verse file already builds ${path}`); paths.add(path);
  const seen = new Set();
  for (const x of v.witnesses || []) {
    if (!ids.has(x.manuscript)) err(w, `witness "${x.manuscript}" is not in manuscripts.json`);
    if (seen.has(x.manuscript)) err(w, `witness "${x.manuscript}" listed twice`); seen.add(x.manuscript);
    if (!x.contents) err(w, `witness "${x.manuscript}" needs "contents" (what survives of the verse)`);
    const m = mss.find(m => m.id === x.manuscript);
    if (m && v.cutoff && m.dateRange.earliest > v.cutoff) err(w, `witness "${x.manuscript}" is dated entirely after the AD ${v.cutoff} cut-off`);
    cited.add(x.manuscript);
  }
  (v.excluded || []).forEach((e, i) => { if (!e.manuscript || !e.reason) err(`${w} excluded[${i}]`, "needs manuscript and reason"); });
}
const unused = mss.filter(m => !cited.has(m.id)).map(m => m.id);
if (unused.length) console.warn(`Note: not a witness for any verse yet: ${unused.join(", ")}`);

if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`OK: ${mss.length} manuscripts, ${Object.keys(works).length} works, ${scholars.length} scholars, ${verses.length} verse(s).`);
