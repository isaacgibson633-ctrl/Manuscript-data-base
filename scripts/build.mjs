// Builds the site into _site/: one page per verse file in data/verses/, plus a home page listing them.
// Run with: node scripts/build.mjs
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, cpSync } from "node:fs";
import { join } from "node:path";

const here = new URL("..", import.meta.url).pathname;
const out = join(here, "_site");
const read = p => readFileSync(join(here, p), "utf8");
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fill = (tpl, vals) => tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => {
  if (!(k in vals)) throw new Error(`template placeholder {{${k}}} has no value`);
  return vals[k];
});

rmSync(out, { recursive: true, force: true });
mkdirSync(out);
for (const p of ["assets", "data", ".nojekyll"]) cpSync(join(here, p), join(out, p), { recursive: true });

const verseTpl = read("templates/verse.html");
const manuscripts = JSON.parse(read("data/manuscripts.json"));
const byId = Object.fromEntries(manuscripts.map(m => [m.id, m]));

const verses = readdirSync(join(here, "data/verses")).filter(f => f.endsWith(".json")).map(f => {
  const v = JSON.parse(read(`data/verses/${f}`));
  return { ...v, id: f.replace(/\.json$/, ""), path: `${v.bookSlug}/${v.chapter}/${v.verse}/` };
});
const BOOKS = ["matthew","mark","luke","john","acts","romans","1-corinthians","2-corinthians","galatians","ephesians",
  "philippians","colossians","1-thessalonians","2-thessalonians","1-timothy","2-timothy","titus","philemon","hebrews",
  "james","1-peter","2-peter","1-john","2-john","3-john","jude","revelation"];
verses.sort((a, b) => BOOKS.indexOf(a.bookSlug) - BOOKS.indexOf(b.bookSlug) || a.chapter - b.chapter || parseInt(a.verse) - parseInt(b.verse));

for (const v of verses) {
  const [first, ...rest] = Array.from(v.greek);
  const html = fill(verseTpl, {
    root: "../".repeat(v.path.split("/").filter(Boolean).length),
    verseId: esc(v.id),
    reference: esc(v.reference),
    book: esc(v.book),
    heading: esc(v.heading || `Who has ${v.reference}?`),
    greekHtml: `<span class="init">${esc(first)}</span>${esc(rest.join(""))}`,
    translation: esc(v.translation),
    cutoff: esc(v.cutoff),
  });
  mkdirSync(join(out, v.path), { recursive: true });
  writeFileSync(join(out, v.path, "index.html"), html);
}

const card = v => {
  const ws = v.witnesses.map(w => byId[w.manuscript]).filter(Boolean);
  const earliest = ws.reduce((a, m) => (!a || m.catalogueDate < a.catalogueDate ? m : a), null);
  return `    <article class="ms">
      <div class="sig">${esc(v.reference.replace(/^\D+/, ""))}<small>${esc(v.book)}</small></div>
      <div class="body">
        <h3><a href="${v.path}">${esc(v.reference)}</a></h3>
        <p class="greek" lang="grc" style="font-size:19px">${esc(v.greek)}</p>
        <p class="where">${ws.length} manuscripts up to AD ${esc(v.cutoff)}${earliest ? ` · earliest by catalogue date: ${esc(earliest.siglum)} (${esc(earliest.date)})` : ""}</p>
      </div>
    </article>`;
};
writeFileSync(join(out, "index.html"), fill(read("templates/home.html"), { verseList: verses.map(card).join("\n") }));

console.log(`Built ${verses.length} verse page(s) into _site/: ${verses.map(v => v.path).join(", ")}`);
