// Checks the data files for mistakes that would break the site or mislead a reader.
// Run with: node scripts/check-data.mjs          (errors only, plus a count of open checks)
//           node scripts/check-data.mjs --open   (also lists every open check)
import { readFileSync, readdirSync } from "node:fs";
import { parsePassageRef } from "./lib.mjs";

const dataDir = new URL("../data/", import.meta.url);
const load = f => JSON.parse(readFileSync(new URL(f, dataDir), "utf8"));
const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);

const mss = load("manuscripts.json"), bib = load("bibliography.json"), scholars = load("scholars.json");
const passageFiles = readdirSync(dataDir).filter(f => /^passage-.+\.json$/.test(f));
const passages = passageFiles.map(f => [f, load(f)]);

const ref = (where, k) => { if (!bib[k]) err(where, `unknown bibliography key "${k}"`); };

// Bibliography
for (const [k, b] of Object.entries(bib)) {
  for (const f of ["group", "citation", "citation_html"]) if (!b[f]) err(`bibliography.json [${k}]`, `missing "${f}"`);
}

// Manuscripts
const MATERIALS = ["papyrus", "parchment", "to check"];
const ids = new Set();
for (const m of mss) {
  const w = `manuscripts.json [${m.id ?? "?"}]`;
  for (const f of ["id", "language", "name", "material", "date", "holding", "contents_summary", "dating_evidence", "provenance", "summary"])
    if (m[f] === undefined || m[f] === "") err(w, `missing "${f}"`);
  for (const f of ["scholarly_positions", "literature", "images", "to_check"])
    if (!Array.isArray(m[f])) err(w, `"${f}" must be a list (use [] when empty)`);
  if (ids.has(m.id)) err(w, "duplicate id");
  ids.add(m.id);
  if (!/^[a-z0-9_]+$/.test(m.id || "")) err(w, "id may only use lower-case letters, digits and _ (it becomes a web address)");
  if (!["Greek", "Latin"].includes(m.language)) err(w, `language must be Greek or Latin`);
  if (m.language === "Greek") {
    if (!m.siglum) err(w, `Greek manuscripts need "siglum"`);
    if (!m.ga) err(w, `Greek manuscripts need "ga" (Gregory–Aland number)`);
    if (!Number.isInteger(m.intf_docid)) err(w, `Greek manuscripts need "intf_docid" (INTF Virtual Manuscript Room ID)`);
  }
  if (!MATERIALS.includes(m.material)) err(w, `material must be one of: ${MATERIALS.join(", ")}`);
  const d = m.date || {};
  for (const f of ["label", "range_start", "range_end", "estimate", "confidence", "summary"]) if (d[f] === undefined || d[f] === "") err(w, `date is missing "${f}"`);
  if (!["Firm", "Debated"].includes(d.confidence)) err(w, `date.confidence must be Firm or Debated`);
  if (!(d.range_start <= d.estimate && d.estimate <= d.range_end)) err(w, `date.estimate should fall within range_start–range_end`);
  // An unknown holding is allowed only while it is on the record's to_check list
  if (!m.holding || ((!m.holding.library || !m.holding.city) && !(m.to_check || []).some(c => /holding/i.test(c))))
    err(w, `holding needs library and city (or a "Current holding" item in to_check)`);
  (m.literature || []).forEach(k => ref(w, k));
  (m.scholarly_positions || []).forEach(p => {
    if (!p.who || !p.claim) err(w, `each scholarly position needs "who" and "claim"`);
    if (p.bib) ref(w, p.bib);
  });
  for (const i of m.images || []) if (!/^https:\/\//.test(i.url || "")) err(w, `image link "${i.label}" needs an https URL`);
}
const byId = Object.fromEntries(mss.map(m => [m.id, m]));

scholars.forEach(s => ref(`scholars.json [${s.name}]`, s.key_work));

// Passages
const STATUSES = ["preserved", "replacement_leaves", "to_check", "preserved_in_harmony", "to_map"];
const cited = new Set(), paths = new Map();
for (const [f, p] of passages) {
  const w = f;
  let parsed;
  try { parsed = parsePassageRef(p.passage); } catch (e) { err(w, e.message); continue; }
  const expected = `passage-${parsed.slug}.json`;
  if (f !== expected) err(w, `file should be named ${expected} to match "passage": "${p.passage}"`);
  if (paths.has(parsed.path)) err(w, `builds the same page as ${paths.get(parsed.path)}`);
  paths.set(parsed.path, f);
  if (!Array.isArray(p.verses) || !p.verses.length) { err(w, "needs a non-empty verses list"); continue; }

  const variantIds = new Set((p.variants || []).map(v => v.id));
  const sweepIds = new Set((p.translation_sweep || []).map(t => t.id));
  const nums = p.verses.map(v => v.verse);
  const [from, to] = parsed.verses;
  if (nums[0] !== from || nums[nums.length - 1] !== to || nums.some((n, i) => i && n !== nums[i - 1] + 1))
    err(w, `verses should run ${from} to ${to} in order, one entry each`);

  for (const v of p.verses) {
    const vw = `${w} [${v.ref}]`;
    if (!v.translation) err(vw, `missing "translation"`);
    (v.variants || []).forEach(k => { if (!variantIds.has(k)) err(vw, `refers to variant "${k}", which is not in "variants"`); });
    (v.translation_notes || []).forEach(k => { if (!sweepIds.has(k)) err(vw, `refers to translation note "${k}", which is not in "translation_sweep"`); });
    for (const [layer, lang] of [["greek_witnesses", "Greek"], ["latin_witnesses", "Latin"]]) {
      const seen = new Set();
      for (const x of v[layer] || []) {
        if (!byId[x.id]) err(vw, `${layer}: "${x.id}" is not in manuscripts.json`);
        else if (byId[x.id].language !== lang) err(vw, `${layer}: "${x.id}" is a ${byId[x.id].language} manuscript`);
        if (seen.has(x.id)) err(vw, `${layer}: "${x.id}" listed twice`);
        seen.add(x.id);
        if (!STATUSES.includes(x.status)) err(vw, `${layer}: "${x.id}" has status "${x.status}"; use one of ${STATUSES.join(", ")}`);
        cited.add(x.id);
      }
    }
  }
  for (const v of p.variants || []) {
    const vw = `${w} [variant ${v.id}]`;
    if (!v.title || !v.explanation || !(v.readings || []).length) err(vw, `needs title, readings and explanation`);
    if ((v.readings || []).filter(r => r.printed_in_NA28).length !== 1) err(vw, `exactly one reading should be marked printed_in_NA28`);
    (v.literature || []).forEach(k => ref(vw, k));
    if (!p.verses.some(x => (x.variants || []).includes(v.id))) err(vw, `no verse refers to this variant`);
  }
  for (const t of p.translation_sweep || []) (t.literature || []).forEach(k => ref(`${w} [translation note ${t.id}]`, k));
  (p.literature || []).forEach(k => ref(w, k));
  (p.excluded || []).forEach((e, i) => { if (!(e.id || e.label) || !e.reason) err(`${w} excluded[${i}]`, "needs an id or label, and a reason"); });
}

const unused = mss.filter(m => !cited.has(m.id)).map(m => m.id);
if (unused.length) console.warn(`Note: not yet a witness in any passage: ${unused.join(", ")}`);

const open = mss.filter(m => m.to_check.length);
if (process.argv.includes("--open")) {
  console.log("\nOpen checks:");
  for (const m of open) for (const c of m.to_check) console.log(`  ${m.siglum || m.name} (${m.id}): ${c}`);
  console.log("");
}

if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`OK: ${mss.length} manuscripts, ${Object.keys(bib).length} works, ${scholars.length} scholars, ${passages.length} passage(s). ` +
  `${open.reduce((n, m) => n + m.to_check.length, 0)} open checks on ${open.length} records (list them with --open).`);
