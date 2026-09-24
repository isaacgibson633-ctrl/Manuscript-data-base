// Builds the tabbed viewer: one self-contained page with every passage, manuscript and source.
// Run with: node scripts/build-viewer.mjs
//   _viewer/index.html    for publishing as a claude.ai artifact (the host adds <html>, <head> and <body>)
//   _viewer/preview.html  the same page wrapped as a full document, for opening locally
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { BOOKS, parsePassageRef, passageCoverage, firstAppearances } from "./lib.mjs";

const here = new URL("..", import.meta.url).pathname;
const read = p => readFileSync(join(here, p), "utf8");
const json = p => JSON.parse(read(p));

const mss = json("data/manuscripts.json");
const bib = json("data/bibliography.json");
const scholars = json("data/scholars.json");
const passages = readdirSync(join(here, "data")).filter(f => /^passage-.+\.json$/.test(f)).map(f => json(`data/${f}`))
  .map(p => ({ p, ref: parsePassageRef(p.passage) }))
  .sort((a, b) => BOOKS.indexOf(a.ref.book) - BOOKS.indexOf(b.ref.book) || a.ref.chapter - b.ref.chapter || a.ref.verses[0] - b.ref.verses[0]);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const byDate = (a, b) => a.date.estimate - b.date.estimate || a.date.range_start - b.date.range_start;
const byId = Object.fromEntries(mss.map(m => [m.id, m]));

// Where each manuscript appears: [[passage slug, coverage text]]
const cited = {};
for (const { p, ref } of passages) {
  const ids = new Set([...p.verses.flatMap(v => [...v.greek_witnesses, ...(v.latin_witnesses || [])].map(w => w.id)), ...(p.latin || []).map(l => l.id)]);
  for (const id of ids) (cited[id] ||= []).push([ref.slug, passageCoverage(p, ref.chapter, id)]);
}

const DATA = {
  mss: Object.fromEntries(mss.map(m => [m.id, { ...m, cited: cited[m.id] || [] }])),
  greek: mss.filter(m => m.language === "Greek").sort(byDate).map(m => m.id),
  latin: mss.filter(m => m.language === "Latin").sort(byDate).map(m => m.id),
  bib: Object.fromEntries(Object.entries(bib).map(([k, b]) => [k, b.citation_html])),
  bibGroups: Object.entries(Object.values(bib).reduce((g, b) => ((g[b.group] ||= []).push(b.citation_html), g), {}))
    .map(([g, list]) => [g, list.sort((a, b) => a.replace(/<[^>]+>/g, "").localeCompare(b.replace(/<[^>]+>/g, "")))]),
  scholars,
  passages: passages.map(({ p, ref }) => ({
    slug: ref.slug, passage: p.passage, heading: p.heading, lede: p.lede, book: ref.book, chapter: ref.chapter,
    translationNote: p.translation_note, sections: p.sections || null, latinNote: p.latin_note || null,
    verses: p.verses.map(v => ({
      n: v.verse, ref: v.ref, section: v.section || null, tr: v.translation, gk: v.greek || null, gv: v.greek_where_variant || null,
      vars: v.variants || [], notes: v.translation_notes || [],
      g: v.greek_witnesses.map(w => [w.id, w.status]), l: (v.latin_witnesses || []).map(w => [w.id, w.status]),
    })),
    variants: p.variants || [], sweep: p.translation_sweep || [], excluded: p.excluded || [],
    latin: [...new Set([...p.verses.flatMap(v => (v.latin_witnesses || []).map(w => w.id)), ...(p.latin || []).map(l => l.id)])]
      .map(id => byId[id]).sort(byDate).map(m => [m.id, passageCoverage(p, ref.chapter, m.id)]),
    newIds: firstAppearances(passages.map(x => x.p), p).map(id => byId[id]).sort(byDate).map(m => m.id),
    lit: [...new Set([...(p.variants || []).flatMap(v => v.literature || []), ...(p.translation_sweep || []).flatMap(t => t.literature || []), ...(p.literature || [])])],
  })),
};

const dating = read("templates/dating.html");
const split = dating.indexOf('<h3 class="subh">Who’s who');
const fragments = {
  dating: dating.slice(0, split) + "</section>",
  people: `<section class="prose">${dating.slice(split).replace("{{people}}", scholars.map(s =>
    `<tr><td>${esc(s.name)}</td><td>${esc(s.contribution)}</td><td>${bib[s.key_work]?.citation_html || s.key_work}</td></tr>`).join(""))}`,
  method: read("templates/method.html"),
};

// JSON inside <script> must not contain "</script"
const embed = o => JSON.stringify(o).replace(/</g, "\\u003c");
const page = `<title>Manuscript Witness Explorer</title>
<meta name="description" content="Early Greek and Latin manuscripts of John, verse by verse: who preserves each verse, how each manuscript is dated, and where the manuscripts disagree.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=GFS+Didot&family=IBM+Plex+Mono:wght@400;500&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;1,7..72,400&display=swap">
<style>
${read("assets/style.css")}
${read("assets/viewer.css")}
</style>
<div class="app">
  <header class="topbar">
    <div class="topbar-in">
      <a class="home" href="#${DATA.passages[0].slug}">Manuscript Witness Explorer</a>
      <span class="draft">Draft · not yet peer-reviewed</span>
    </div>
    <nav class="tabs" id="tabs" aria-label="Sections"></nav>
  </header>
  <main id="view" class="view" tabindex="-1"></main>
</div>
<dialog id="msd" class="sheet" aria-labelledby="msd-title"><div id="msd-body"></div></dialog>
<script type="application/json" id="data">${embed(DATA)}</script>
<script type="application/json" id="fragments">${embed(fragments)}</script>
<script>
${read("assets/viewer.js")}
</script>
`;

mkdirSync(join(here, "_viewer"), { recursive: true });
writeFileSync(join(here, "_viewer/index.html"), page);
writeFileSync(join(here, "_viewer/preview.html"), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head>
<body>
${page}</body></html>
`);
console.log(`Built _viewer/index.html (${Math.round(page.length / 1024)} KB): ${DATA.passages.length} passages, ${mss.length} manuscripts.`);
