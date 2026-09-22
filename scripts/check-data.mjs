// Checks the data files for mistakes that would break the page.
// Run with: node scripts/check-data.mjs
import { readFileSync } from "node:fs";

const load = f => JSON.parse(readFileSync(new URL(`../data/${f}.json`, import.meta.url), "utf8"));
const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);

const mss = load("manuscripts"), bib = load("bibliography"), notes = load("dating-notes");
const scholars = load("scholars"), excluded = load("excluded");
const works = bib.works;
const ref = (where, k) => { if (!works[k]) err(where, `unknown bibliography key "${k}"`); };

const required = ["id","siglum","gaNumber","name","material","date","dateRange","catalogueDate","confidence",
  "library","shelfmark","city","contents","summary","datingSummary","provenance","vmrId","images"];
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
excluded.forEach((e, i) => { if (!e.manuscript || !e.reason) err(`excluded.json [${i}]`, "needs manuscript and reason"); });

if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`OK: ${mss.length} manuscripts, ${Object.keys(works).length} works, ${scholars.length} scholars, ${excluded.length} exclusions.`);
