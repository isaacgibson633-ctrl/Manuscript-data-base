// Builds the whole site into _site/ as plain HTML pages. Run with: node scripts/build.mjs
//
//   /                          home: passages and the project in brief
//   /<book>/<ch>/<verses>/     one page per data/passage-*.json
//   /manuscripts/              index of every manuscript record
//   /manuscripts/<id>/         one page per record in data/manuscripts.json
//   /dating/                   how the dates are worked out, and who's who
//   /bibliography/             every work in data/bibliography.json
//   /about/                    method and sources
//   /checks/                   everything still to be confirmed before public release
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, cpSync } from "node:fs";
import { join, dirname } from "node:path";
import { BOOKS, parsePassageRef } from "./lib.mjs";

const here = new URL("..", import.meta.url).pathname;
const out = join(here, "_site");
const read = p => readFileSync(join(here, p), "utf8");
const json = p => JSON.parse(read(p));

const mss = json("data/manuscripts.json");
const BIB = json("data/bibliography.json");
const scholars = json("data/scholars.json");
const byId = Object.fromEntries(mss.map(m => [m.id, m]));
const passages = readdirSync(join(here, "data")).filter(f => /^passage-.+\.json$/.test(f))
  .map(f => { const p = json(`data/${f}`); return { ...p, ref: parsePassageRef(p.passage) }; })
  .sort((a, b) => BOOKS.indexOf(a.ref.book) - BOOKS.indexOf(b.ref.book) || a.ref.chapter - b.ref.chapter || a.ref.verses[0] - b.ref.verses[0]);

// ---------- helpers ----------
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const cite = k => BIB[k] ? BIB[k].citation_html : `<span class="missing">[missing reference: ${esc(k)}]</span>`;
const plain = s => s.replace(/<[^>]+>/g, "");
const label = m => m.siglum || m.name;
const byDate = (a, b) => a.date.estimate - b.date.estimate || a.date.range_start - b.date.range_start;
const eraOf = m => m.date.estimate < 500 ? "early" : m.date.estimate < 800 ? "mid" : "late";
const MATCOL = { papyrus: "var(--papyrus)", parchment: "var(--parchment)", "to check": "var(--unknown)" };
const MATNAME = { papyrus: "Papyrus", parchment: "Parchment", "to check": "Material to check" };
const STATUS = {
  preserved: "preserved", replacement_leaves: "on later replacement leaves (still before 900)", to_check: "survives, extent to check",
  preserved_in_harmony: "preserved within a Gospel harmony", to_map: "coverage still to map",
};
const isINTF = i => /ntvmr\.uni-muenster\.de/.test(i.url);
const unique = a => [...new Set(a)];
const NUM = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

// Compress verse numbers into "1:1–5, 7, 9–18"
function ranges(chapter, nums) {
  const s = [...nums].sort((a, b) => a - b), parts = [];
  for (let i = 0; i < s.length; i++) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    parts.push(i === j ? `${s[i]}` : `${s[i]}–${s[j]}`);
    i = j;
  }
  return parts.length ? `${chapter}:${parts.join(", ")}` : "";
}

// Every appearance of a manuscript in passage files: [{ passage, status per verse }]
const citedIn = {};
for (const p of passages) for (const v of p.verses) for (const w of [...(v.greek_witnesses || []), ...(v.latin_witnesses || [])]) {
  const e = (citedIn[w.id] ||= new Map());
  if (!e.has(p)) e.set(p, []);
  e.get(p).push([v.verse, w.status]);
}
// "1:1–15 · on later replacement leaves: 1:16–18"
function coverage(p, id) {
  const rows = citedIn[id]?.get(p) || [];
  const all = p.verses.length, { chapter } = p.ref;
  const groups = {};
  rows.forEach(([v, s]) => (groups[s] ||= []).push(v));
  const parts = [];
  if (groups.preserved) parts.push(groups.preserved.length === all && all > 1 ? "complete" : ranges(chapter, groups.preserved));
  for (const s of ["preserved_in_harmony", "replacement_leaves", "to_check", "to_map"])
    if (groups[s]) parts.push(`${STATUS[s]}: ${groups[s].length === all && all > 1 ? "whole passage" : ranges(chapter, groups[s])}`);
  return parts.join(" · ");
}

// ---------- page shell ----------
const NAV = [["", "Passages"], ["manuscripts/", "Manuscripts"], ["dating/", "Dating"], ["bibliography/", "Bibliography"], ["about/", "About"], ["checks/", "Open checks"]];
function page({ path, title, description, body, current, js }) {
  const root = "../".repeat(path.split("/").filter(Boolean).length);
  const html = `<!doctype html>
<html lang="en"${js ? ' class="nojs"' : ""}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
${description ? `<meta name="description" content="${esc(description)}">\n` : ""}<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=GFS+Didot&family=IBM+Plex+Mono:wght@400;500&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;1,7..72,400&display=swap">
<link rel="stylesheet" href="${root}assets/style.css">
</head>
<body>
<div class="wrap">
<div class="site"><a class="home" href="${root}">Early New Testament Manuscripts</a><nav aria-label="Site">${
    NAV.map(([href, name]) => `<a href="${root}${href}"${current === href ? ' aria-current="page"' : ""}>${name}</a>`).join("")}</nav></div>
${body(root)}
</div>
${js ? `<script src="${root}assets/${js}"></script>\n` : ""}</body>
</html>
`;
  const file = join(out, path, "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}
const DRAFT = `<span class="draft">Draft v0.1 · not yet peer-reviewed</span>`;
const msLink = (root, m, text = label(m)) => `<a href="${root}manuscripts/${m.id}/">${esc(text)}</a>`;
function checksNotice(root, list, lead) {
  const open = list.filter(m => m.to_check.length);
  if (!open.length) return "";
  return `<div class="checks" role="note"><b>Still to confirm.</b> ${lead} ${open.length === 1 ? "One record has" : `${open.length} records have`} details not yet checked: ${
    open.map(m => msLink(root, m)).join(", ")}. See <a href="${root}checks/">open checks</a>.</div>`;
}
function datingDetails(m) {
  const pos = m.scholarly_positions.length
    ? `<dt>Positions</dt><dd><ul class="pos">${m.scholarly_positions.map(p => `<li><b>${esc(p.who)}</b>: ${esc(p.claim)}</li>`).join("")}</ul></dd>` : "";
  const lit = m.literature.length ? `<dt>Read further</dt><dd><ul class="lit">${m.literature.map(k => `<li>${cite(k)}</li>`).join("")}</ul></dd>` : "";
  return `<dt>Why this date</dt><dd>${esc(m.dating_evidence)}</dd>${pos}${lit}`;
}
const facts = m => `<div class="facts">
        <span class="tag date">${esc(m.date.label)}</span>
        <span class="tag ${m.date.confidence === "Firm" ? "firm" : "debated"}">Date: ${esc(m.date.confidence)}</span>
        <span class="tag mat"><i class="sw" style="background:${MATCOL[m.material]}"></i>${MATNAME[m.material]}${m.palimpsest ? " · palimpsest" : ""}</span>
        ${m.language === "Latin" ? `<span class="tag wrap">Latin${m.text_type ? ` · ${esc(m.text_type)}` : ""}</span>` : ""}
        ${m.to_check.length ? `<span class="tag tocheck">${m.to_check.length} to check</span>` : ""}
      </div>`;
const where = m => [m.holding.library, m.holding.shelfmark, m.holding.city].filter(Boolean).map(esc).join(" · ");
const imageLinks = m => m.images.map(i => `<a class="btn${isINTF(i) ? " primary" : ""}" href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.label)}</a>`).join("");

// ---------- passage pages ----------
function timeline(list, cutoff = 900) {
  const W = 940, left = 110, right = 20, top = 26, rowH = 17;
  const x = y => +(left + (y - 100) / (1000 - 100) * (W - left - right)).toFixed(1);
  const H = top + list.length * rowH + 10;
  let s = "";
  for (let c = 100; c <= 1000; c += 100) {
    s += `<line class="grid" x1="${x(c)}" x2="${x(c)}" y1="${top - 8}" y2="${H - 4}"></line><text x="${x(c)}" y="12" text-anchor="middle">${c}</text>`;
  }
  s += `<line class="cut" x1="${x(cutoff)}" x2="${x(cutoff)}" y1="${top - 8}" y2="${H - 4}"></line><text class="cut" x="${x(cutoff) + 4}" y="${top - 1}">cut-off</text>`;
  list.forEach((m, i) => {
    const y = top + i * rowH + 8, col = MATCOL[m.material];
    s += `<g class="m" data-id="${esc(m.id)}" tabindex="0" role="link" aria-label="${esc(label(m))}, ${esc(m.name)}, ${esc(m.date.label)}">` +
      `<text class="lbl" x="${left - 10}" y="${y + 4}" text-anchor="end">${esc(label(m))}</text>` +
      `<line class="rng" x1="${x(m.date.range_start)}" x2="${x(m.date.range_end)}" y1="${y}" y2="${y}" stroke="${col}"></line>` +
      `<circle class="dot" cx="${x(m.date.estimate)}" cy="${y}" r="5.5" fill="${col}"></circle>` +
      `<title>${esc(label(m))} · ${esc(m.name)} · ${esc(m.date.label)}</title></g>`;
  });
  return `<svg id="tl" viewBox="0 0 ${W} ${H}" role="img" aria-label="Timeline of manuscripts by estimated date">${s}</svg>`;
}

function witnessCard(root, p, m, multi) {
  const search = [m.siglum, m.ga, m.name, m.holding.library, m.holding.city, m.holding.shelfmark].filter(Boolean).join(" ").toLowerCase();
  return `<article class="ms" id="ms-${esc(m.id)}" data-id="${esc(m.id)}" data-mat="${esc(m.material)}" data-era="${eraOf(m)}" data-conf="${esc(m.date.confidence)}" data-search="${esc(search)}">
    <div class="sig">${esc(label(m))}${m.ga ? `<small>GA ${esc(m.ga)}</small>` : ""}</div>
    <div class="body">
      <h3>${msLink(root, m, m.name)}</h3>
      ${facts(m)}
      <p class="where">${where(m)}</p>
      <p class="summary">${esc(m.summary)}</p>
      ${multi ? `<p class="where"><b>In this passage:</b> ${esc(coverage(p, m.id))}</p>` : ""}
      <div class="links">${imageLinks(m)}</div>
      <details${m.date.confidence === "Debated" ? " open" : ""}><summary>Full record and dating evidence</summary>
        <dl>
          <dt>What survives</dt><dd>${esc(m.contents_summary)}</dd>
          <dt>Dating summary</dt><dd>${esc(m.date.summary)}</dd>
          ${datingDetails(m)}
          <dt>Provenance</dt><dd>${esc(m.provenance)}</dd>
          <dt>Catalogue no.</dt><dd>${m.ga ? `Gregory–Aland ${esc(m.ga)}` : esc(m.siglum || "none")}</dd>
          <dt>Record</dt><dd>${msLink(root, m, `Manuscript page for ${label(m)}`)}</dd>
        </dl>
      </details>
    </div>
  </article>`;
}

function matrix(root, p, greek, latin) {
  const vs = p.verses.map(v => v.verse), { chapter } = p.ref;
  const statusAt = {};
  p.verses.forEach(v => [...(v.greek_witnesses || []), ...(v.latin_witnesses || [])].forEach(w => { (statusAt[w.id] ||= {})[v.verse] = w.status; }));
  const cls = (m, s) => !s ? "" : s === "preserved" ? `y${m.material === "papyrus" ? " pap" : m.language === "Latin" ? " lat" : ""}`
    : s === "replacement_leaves" ? "s" : s === "preserved_in_harmony" ? "h" : "q";
  const row = m => `<tr><th class="mxh" scope="row"><a href="${root}manuscripts/${m.id}/"><span class="s">${esc(label(m))}</span></a>${
    m.date.confidence === "Debated" ? '<span class="dtag deb">date debated</span>' : ""}<span class="d">${esc(m.name)} · ${esc(m.date.label)}</span></th>${
    vs.map(v => { const s = statusAt[m.id]?.[v]; return `<td><i class="c ${cls(m, s)}" role="img" aria-label="${chapter}:${v} ${s ? STATUS[s] : "not preserved"}"></i></td>`; }).join("")}</tr>`;
  const groups = [["Papyri", greek.filter(m => m.material === "papyrus")], ["Parchment majuscules", greek.filter(m => m.material !== "papyrus")], ["Latin (secondary layer)", latin]];
  const counts = vs.map(v => p.verses.find(x => x.verse === v).greek_witnesses.length);
  return `<table class="mx"><thead><tr><th class="mxh" scope="col">Manuscript</th>${vs.map(v => `<th scope="col">${v}</th>`).join("")}</tr></thead><tbody>${
    groups.filter(([, l]) => l.length).map(([name, l]) => `<tr class="grp"><th colspan="${vs.length + 1}">${name}</th></tr>${l.map(row).join("")}`).join("")
  }</tbody><tfoot><tr><th>Greek witnesses per verse</th>${counts.map(c => `<td>${c}</td>`).join("")}</tr></tfoot></table>`;
}

function passagePage(p) {
  const { ref } = p, multi = p.verses.length > 1;
  const greek = unique(p.verses.flatMap(v => (v.greek_witnesses || []).map(w => w.id))).map(id => byId[id]).sort(byDate);
  const latin = unique(p.verses.flatMap(v => (v.latin_witnesses || []).map(w => w.id))).map(id => byId[id]).sort(byDate);
  const variants = p.variants || [], sweep = p.translation_sweep || [], excluded = p.excluded || [];
  const vlabel = Object.fromEntries([...variants.map(v => [v.id, `variant${v.label ? `: ${v.label}` : ""}`]), ...sweep.map(t => [t.id, "translation note"])]);
  const heading = p.heading || (multi ? p.passage : `Who has ${p.passage}?`);
  const lede = p.lede || (multi
    ? `Which early manuscripts preserve each verse of ${p.passage}, and where they disagree. Greek manuscripts up to AD 900 come first.`
    : `Every Greek manuscript copied up to about AD 900 in which some part of this verse survives, arranged by date. Each entry says who dates it and how confident that date is, where the manuscript is now, and where you can look at photographs of it yourself.`);
  const pap = greek.filter(m => m.material === "papyrus").length, deb = greek.filter(m => m.date.confidence === "Debated").length;
  const withImg = greek.filter(m => m.images.some(i => !isINTF(i))).length;
  const stats = [[greek.length, "Greek manuscripts to 900"], [pap, "on papyrus"], [deb, "with debated dates"],
    ...(multi ? [] : [[withImg, "with a direct image viewer (all have INTF links)"]]),
    ...(variants.length ? [[variants.length, "variants that matter"]] : []), ...(latin.length ? [[latin.length, "Latin witnesses"]] : [])];
  const litKeys = unique([...variants.flatMap(v => v.literature || []), ...sweep.flatMap(t => t.literature || []), ...(p.literature || [])]);
  const single = p.verses[0];

  page({
    path: ref.path, title: multi ? `${heading}` : `Witnesses to ${p.passage}`, js: "passage.js",
    description: `Early Greek${latin.length ? " and Latin" : ""} manuscripts that preserve ${p.passage}: dates, dating debates, where they are and where to see them.`,
    body: root => `
<header class="page">
  <div class="top"><span class="eyebrow">Gospel of ${esc(ref.book)} · chapter ${ref.chapter}</span>${DRAFT}</div>
  <h1>${esc(heading)}</h1>
  ${!multi && single.greek ? `<div class="verse" aria-label="The verse">
    <p class="greek" lang="grc"><span class="init">${esc(Array.from(single.greek)[0])}</span>${esc(Array.from(single.greek).slice(1).join(""))}</p>
    <p class="trans">${esc(single.translation)}</p>
    ${p.translation_note ? `<p class="note">${esc(p.translation_note)}</p>` : ""}
  </div>` : ""}
  <p class="lede">${esc(lede)}</p>
  <div class="stats">${stats.map(([n, l]) => `<span><b>${n}</b>${l}</span>`).join("")}</div>
  ${checksNotice(root, [...greek, ...latin], "This page is a draft.")}
</header>
${multi ? `
<section class="sec" aria-labelledby="read-h">
  <h2 id="read-h">The passage, verse by verse</h2>
  <p>${esc(p.translation_note || "")} Greek is shown where the manuscripts differ. Coloured tags mark a manuscript variant (blue) or a translation question saved for a later sweep (amber); the count is how many Greek witnesses up to 900 preserve the verse.</p>
  <div class="reader">${p.verses.map(v => {
    const flags = (v.variants || []).map(k => `<a class="flag var" href="#${esc(k)}">${esc(vlabel[k])}</a>`)
      .concat((v.translation_notes || []).map(k => `<a class="flag tr" href="#${esc(k)}">${esc(vlabel[k])}</a>`)).join("");
    return `<div class="v"><span class="vn">${ref.chapter}:${v.verse}</span><span class="vt">${esc(v.translation)}</span><span class="vflags">${flags}<span class="vw">${v.greek_witnesses.length} MSS</span></span>${
      v.greek_where_variant ? `<span class="vg" lang="grc">${esc(v.greek_where_variant)}</span>` : ""}</div>`;
  }).join("")}</div>
</section>

<section class="sec" aria-labelledby="mx-h">
  <h2 id="mx-h">Who preserves which verse</h2>
  <p>Each row is a manuscript, each column a verse. A filled square means at least part of that verse survives in that manuscript.</p>
  <div class="legend">
    <span><i class="c y pap"></i>Papyrus</span><span><i class="c y"></i>Parchment</span>
    ${latin.length ? `<span><i class="c y lat"></i>Latin</span><span><i class="c h"></i>Within a Gospel harmony</span>` : ""}
    <span><i class="c s"></i>Later replacement leaves (still before 900)</span>
    <span><i class="c q"></i>Survives, extent to check or to map</span>
    <span><i class="c"></i>Lost or never included</span>
  </div>
  <div class="mx-box">${matrix(root, p, greek, latin)}</div>
  <p class="note">Coverage is taken from published contents lists and each manuscript’s recorded gaps. It has not yet been checked leaf by leaf against the INTF catalogue.</p>
</section>` : ""}

<section class="timeline" aria-labelledby="tl-h">
  <div class="eyebrow" id="tl-h">Timeline · select a manuscript to jump to it</div>
  <div class="tl-box">${timeline(greek)}</div>
  <div class="legend">
    <span><i class="sw" style="background:var(--papyrus)"></i>Papyrus</span>
    <span><i class="sw" style="background:var(--parchment)"></i>Parchment</span>
    ${greek.some(m => m.material === "to check") ? `<span><i class="sw" style="background:var(--unknown)"></i>Material to check</span>` : ""}
    <span><i class="bar"></i>Range of proposed dates</span>
  </div>
</section>

<section aria-labelledby="list-h">
  <h2 id="list-h" style="margin-bottom:8px">${multi ? "The Greek manuscripts" : "The manuscripts"}</h2>
  <div class="filters">
    <div class="frow"><span class="eyebrow">Search</span><input id="q" type="search" placeholder="Name, number, library or city" aria-label="Search manuscripts"></div>
    <div class="frow" role="group" aria-label="Material"><span class="eyebrow">Material</span>
      <button class="chip" data-f="mat" data-v="all" aria-pressed="true">All</button>
      <button class="chip" data-f="mat" data-v="papyrus" aria-pressed="false">Papyrus</button>
      <button class="chip" data-f="mat" data-v="parchment" aria-pressed="false">Parchment</button>
    </div>
    <div class="frow" role="group" aria-label="Period"><span class="eyebrow">Period</span>
      <button class="chip" data-f="era" data-v="all" aria-pressed="true">All</button>
      <button class="chip" data-f="era" data-v="early" aria-pressed="false">2nd–5th c.</button>
      <button class="chip" data-f="era" data-v="mid" aria-pressed="false">6th–8th c.</button>
      <button class="chip" data-f="era" data-v="late" aria-pressed="false">9th c.</button>
    </div>
    <div class="frow" role="group" aria-label="Dating confidence"><span class="eyebrow">Dating</span>
      <button class="chip" data-f="conf" data-v="all" aria-pressed="true">All</button>
      <button class="chip" data-f="conf" data-v="Firm" aria-pressed="false">Firm</button>
      <button class="chip" data-f="conf" data-v="Debated" aria-pressed="false">Debated</button>
      <span class="count" id="count"></span>
    </div>
  </div>
  <div class="list" id="list">${greek.map(m => witnessCard(root, p, m, multi)).join("\n")}</div>
</section>
${variants.length ? `
<section class="sec" aria-labelledby="var-h">
  <h2 id="var-h">Where the manuscripts disagree</h2>
  <p>Most differences between manuscripts are spelling and word order. ${variants.length === 1 ? "One place matters" : `${NUM[variants.length] || variants.length} places matter`} for meaning. The printed reading of the modern critical edition (Nestle–Aland, 28th edition) is outlined.</p>
  <div class="variants">${variants.map(v => `<div class="vc" id="${esc(v.id)}">
    <span class="ref">${esc(v.ref)}</span><h3>${esc(v.title)}</h3>
    <div class="readings">${v.readings.map(r => `<div class="rd${r.printed_in_NA28 ? " printed" : ""}">${r.printed_in_NA28 ? '<span class="pl">Printed in NA28</span>' : ""}<span class="gk" lang="${/[α-ω]/i.test(r.greek) ? "grc" : "la"}">${esc(r.greek)}</span><span class="en">${esc(r.english)}</span><span class="wit">${esc(r.witnesses)}</span></div>`).join("")}</div>
    <p>${esc(v.explanation)}</p>
    ${(v.literature || []).length ? `<details><summary>Scholarly works</summary><ul>${v.literature.map(k => `<li>${cite(k)}</li>`).join("")}</ul></details>` : ""}
  </div>`).join("\n")}</div>
</section>` : ""}
${sweep.length ? `
<section class="sec" aria-labelledby="tr-h">
  <h2 id="tr-h">Saved for the translation sweep</h2>
  ${sweep.map(t => `<div class="vc tr" id="${esc(t.id)}">
    <span class="ref">${esc(t.ref)} · translation question, not a manuscript variant</span>
    <h3>${esc(t.question)}</h3>
    ${t.greek ? `<div class="readings"><div class="rd"><span class="gk" lang="grc">${esc(t.greek)}</span>${t.manuscripts_agree ? `<span class="wit">Read the same way in every early Greek manuscript that preserves the verse.</span>` : ""}</div></div>` : ""}
    ${t.explanation ? `<p>${esc(t.explanation)}</p>` : ""}
    ${(t.literature || []).length ? `<details><summary>Scholarly works</summary><ul>${t.literature.map(k => `<li>${cite(k)}</li>`).join("")}</ul></details>` : ""}
  </div>`).join("\n")}
</section>` : ""}
${latin.length ? `
<section class="sec" aria-labelledby="lat-h">
  <h2 id="lat-h">The Latin layer</h2>
  <p>Latin translations were made from Greek manuscripts older than most that survive, so they can preserve early readings. These are key Latin witnesses up to AD 900; verse-level coverage for some is still to be mapped.</p>
  <div class="tbl"><table>
    <thead><tr><th>Manuscript</th><th>Date</th><th>Type</th><th>${esc(p.passage)}</th></tr></thead>
    <tbody>${latin.map(m => `<tr><td class="name">${msLink(root, m, m.siglum ? `${m.name} (${m.siglum})` : m.name)}</td><td>${esc(m.date.label)}</td><td class="name">${esc(m.text_type || "")}</td><td class="name">${esc(coverage(p, m.id))}</td></tr>`).join("")}</tbody>
  </table></div>
</section>` : ""}
${excluded.length ? `
<section class="sec" aria-labelledby="miss-h">
  <h2 id="miss-h">Why some manuscripts aren’t listed</h2>
  <p>Some manuscripts are missing the page that held this passage, or were copied after the cut-off. Leaving them out is part of being accurate, so here is why.</p>
  <div class="tbl"><table>
    <thead><tr><th>Manuscript</th><th>Date</th><th>Why it’s not in the list</th></tr></thead>
    <tbody>${excluded.map(e => `<tr><td>${e.id && byId[e.id] ? msLink(root, byId[e.id], e.label || label(byId[e.id])) : esc(e.label || e.id)}</td><td>${esc(e.date || (e.id && byId[e.id] ? byId[e.id].date.label : ""))}</td><td class="name">${esc(e.reason)}</td></tr>`).join("")}</tbody>
  </table></div>
</section>` : ""}
${litKeys.length ? `
<section class="sec" aria-labelledby="bib-h">
  <h2 id="bib-h">Scholarly works for this passage</h2>
  <p>Works on the manuscripts themselves are listed in each manuscript’s record. The <a href="${root}bibliography/">full bibliography</a> collects everything cited on the site.</p>
  <ul class="biblist">${litKeys.map(k => `<li>${cite(k)}</li>`).join("")}</ul>
</section>` : ""}

<footer class="page">
  <p><b>Status.</b> Draft built from published catalogue data (INTF Liste summaries and the institutions’ own descriptions). Each entry should be confirmed in the INTF Virtual Manuscript Room${variants.length ? ", and the variant witness lists against the printed Nestle–Aland 28 apparatus," : ""} before this is released publicly, ideally by a specialist.</p>
  <p><b>More.</b> <a href="${root}dating/">How these manuscripts got their dates</a> · <a href="${root}about/">How this list was made</a> · <a href="${root}bibliography/">Bibliography</a></p>
</footer>`,
  });
}

// ---------- manuscript pages ----------
function manuscriptPage(m) {
  const appearances = [...(citedIn[m.id] || new Map()).keys()];
  page({
    path: `manuscripts/${m.id}/`, title: `${label(m)} · ${m.name}`, current: "manuscripts/",
    description: `${m.name}: ${m.date.label}, ${m.holding.city || m.holding.library}. Dating evidence, scholarly positions and where to see it.`,
    body: root => `
<header class="page">
  <div class="top"><span class="eyebrow"><a href="${root}manuscripts/">Manuscripts</a> · ${esc(m.language)}${m.ga ? ` · Gregory–Aland ${esc(m.ga)}` : ""}</span>${DRAFT}</div>
  <div class="ms" style="border:0;padding:0">
    <div class="sig">${esc(m.siglum || "")}${m.ga ? `<small>GA ${esc(m.ga)}</small>` : ""}</div>
    <div class="body">
      <h1 class="msname">${esc(m.name)}</h1>
      ${facts(m)}
      <p class="where">${where(m)}</p>
      <p class="summary">${esc(m.summary)}</p>
      <div class="links">${imageLinks(m)}</div>
    </div>
  </div>
  ${m.to_check.length ? `<div class="checks" role="note"><b>Still to confirm for this record:</b><ul>${m.to_check.map(c => `<li>${esc(c)}</li>`).join("")}</ul></div>` : ""}
</header>

<section class="sec" aria-labelledby="rec-h">
  <h2 id="rec-h">The record</h2>
  <dl>
    <dt>What survives</dt><dd>${esc(m.contents_summary)}</dd>
    <dt>Date</dt><dd>${esc(m.date.label)}. ${esc(m.date.summary)}</dd>
    ${datingDetails(m)}
    <dt>Provenance</dt><dd>${esc(m.provenance)}</dd>
    ${m.text_type ? `<dt>Text type</dt><dd>${esc(m.text_type)}</dd>` : ""}
    <dt>Catalogue no.</dt><dd>${m.ga ? `Gregory–Aland ${esc(m.ga)}` : esc(m.siglum || "none")}${m.intf_docid ? ` · INTF document ${m.intf_docid}` : ""}</dd>
  </dl>
</section>

<section class="sec" aria-labelledby="cit-h">
  <h2 id="cit-h">Where it appears on this site</h2>
  ${appearances.length ? `<ul class="lit">${appearances.map(p => `<li><a href="${root}${p.ref.path}${m.language === "Greek" ? `#ms-${m.id}` : ""}">${esc(p.heading || p.passage)}</a>: ${esc(coverage(p, m.id))}</li>`).join("")}</ul>`
    : `<p>Not yet cited as a witness on any passage page.</p>`}
</section>

<footer class="page">
  <p><b>Status.</b> Draft record. ${m.language === "Greek" ? "It should be confirmed against the INTF Virtual Manuscript Room before public release." : "It should be confirmed against the standard Latin catalogues before public release."}</p>
  <p><b>More.</b> <a href="${root}dating/">How these manuscripts got their dates</a> · <a href="${root}about/">How this list was made</a></p>
</footer>`,
  });
}

function manuscriptsIndex() {
  const table = (root, list) => `<div class="tbl"><table>
    <thead><tr><th>Manuscript</th><th>Name</th><th>Date</th><th>Where</th><th>Passages</th></tr></thead>
    <tbody>${list.map(m => `<tr><td>${msLink(root, m)}</td><td class="name">${msLink(root, m, m.name)}${m.to_check.length ? ` <span class="tag tocheck">${m.to_check.length} to check</span>` : ""}</td><td class="name">${esc(m.date.label)}${m.date.confidence === "Debated" ? ' <span class="dtag deb">debated</span>' : ""}</td><td class="name">${esc(m.holding.city || m.holding.library)}</td><td>${citedIn[m.id]?.size || 0}</td></tr>`).join("")}</tbody>
  </table></div>`;
  const greek = mss.filter(m => m.language === "Greek").sort(byDate), latin = mss.filter(m => m.language === "Latin").sort(byDate);
  page({
    path: "manuscripts/", title: "Manuscripts", current: "manuscripts/",
    description: "Every manuscript record: early Greek papyri and majuscules to AD 900, and key Latin manuscripts.",
    body: root => `
<header class="page">
  <div class="top"><span class="eyebrow">Manuscripts</span>${DRAFT}</div>
  <h1>The manuscripts</h1>
  <p class="lede">Each manuscript is recorded once, with its date, the evidence and debates behind that date, where it is now and where to see it. Passage pages draw on these records.</p>
  <div class="stats"><span><b>${greek.length}</b>Greek</span><span><b>${latin.length}</b>Latin</span><span><b>${mss.filter(m => m.date.confidence === "Debated").length}</b>with debated dates</span></div>
</header>
<section class="sec" aria-labelledby="gk-h"><h2 id="gk-h">Greek papyri and majuscules to AD 900</h2>${table(root, greek)}</section>
<section class="sec" aria-labelledby="la-h"><h2 id="la-h">Latin manuscripts to AD 900</h2><p>A secondary layer of key witnesses, not a complete list.</p>${table(root, latin)}</section>`,
  });
}

// ---------- other pages ----------
function homePage() {
  const passageCard = (root, p) => {
    const greek = unique(p.verses.flatMap(v => v.greek_witnesses.map(w => w.id))).map(id => byId[id]).sort(byDate);
    const first = p.verses[0];
    const text = p.verses.length === 1 && first.greek ? `<p class="greek" lang="grc">${esc(first.greek)}</p>` : `<p>${esc(first.translation)}${p.verses.length > 1 ? " …" : ""}</p>`;
    return `<a class="card" href="${root}${p.ref.path}"><span class="eyebrow">${esc(p.passage)}</span><h3>${esc(p.heading || p.passage)}</h3>${text}<p class="where">${greek.length} Greek manuscripts to AD 900${greek[0] ? ` · earliest by catalogue date: ${esc(label(greek[0]))} (${esc(greek[0].date.label)})` : ""}${(p.variants || []).length ? ` · ${p.variants.length} variants` : ""}</p></a>`;
  };
  page({
    path: "", title: "Early New Testament Manuscripts", current: "",
    description: "Which early manuscripts preserve each New Testament passage, how and by whom they are dated, where scholars disagree, and where to see photographs.",
    body: root => `
<header class="page">
  <div class="top"><span class="eyebrow">Greek New Testament · manuscripts to AD 900</span>${DRAFT}</div>
  <h1>Who has this passage?</h1>
  <p class="lede">A guide to the earliest manuscripts of the New Testament for general readers. For each passage: which early manuscripts preserve it, how and by whom each manuscript is dated, where scholars disagree, and where you can see photographs yourself. Scholarly sources are cited throughout.</p>
  <div class="stats"><span><b>${passages.length}</b>passages</span><span><b>${mss.filter(m => m.language === "Greek").length}</b>Greek manuscripts</span><span><b>${mss.filter(m => m.language === "Latin").length}</b>Latin manuscripts</span><span><b>${Object.keys(BIB).length}</b>scholarly works</span></div>
</header>
<section class="sec" aria-labelledby="p-h">
  <h2 id="p-h">Passages</h2>
  <div class="cards">${passages.map(p => passageCard(root, p)).join("")}</div>
</section>
<section class="sec" aria-labelledby="h-h">
  <h2 id="h-h">How to use this site</h2>
  <p>Greek papyri and majuscules dated up to AD 900 are the main layer; key Latin manuscripts up to AD 900 are a second layer. Every manuscript has its own <a href="${root}manuscripts/">record</a>. Dates are the INTF catalogue’s for Greek manuscripts, with other proposals and their authors listed. The site describes the manuscripts and the debates about them; it does not argue for or against the Gospels.</p>
</section>
<footer class="page"><p><b>Status.</b> A draft that has not yet been checked by a specialist. See <a href="${root}checks/">open checks</a>.</p></footer>`,
  });
}

function datingPage() {
  const people = scholars.map(s => `<tr><td>${esc(s.name)}</td><td>${esc(s.contribution)}</td><td>${cite(s.key_work)}</td></tr>`).join("");
  page({
    path: "dating/", title: "How the manuscripts are dated", current: "dating/",
    description: "How early New Testament manuscripts are dated: handwriting, book construction, reading aids, dated anchors, find context, radiocarbon, and why dates get disputed.",
    body: () => read("templates/dating.html").replace("{{people}}", people),
  });
}
function aboutPage() {
  page({
    path: "about/", title: "About this project", current: "about/",
    description: "How the manuscript lists are made: numbering, dates, confidence labels, contents, photographs and sources.",
    body: () => `${read("templates/method.html")}
<section class="prose" aria-labelledby="src-h">
  <h2 id="src-h">Sources</h2>
  <p><b>Data sources.</b> INTF, Kurzgefasste Liste and the New Testament Virtual Manuscript Room; Center for the Study of New Testament Manuscripts (CSNTM); Codex Sinaiticus Project; DigiVatLib; e-codices; Cambridge Digital Library. Scholarly works are listed in the bibliography.</p>
  <p><b>Bibliography status.</b> Citations were checked against publisher and author pages where possible. Page ranges are left out where they could not be confirmed; add them from the published items before release.</p>
</section>`,
  });
}
function bibliographyPage() {
  const groups = {};
  Object.values(BIB).forEach(b => (groups[b.group] ||= []).push(b.citation_html));
  const key = s => plain(s).toLowerCase();
  page({
    path: "bibliography/", title: "Bibliography", current: "bibliography/",
    description: "Scholarly works cited on the site, grouped by topic.",
    body: () => `
<section class="prose" aria-labelledby="bib-h">
  <h1 id="bib-h">Scholarly bibliography</h1>
  <p>Works cited on this site, grouped by topic. Each manuscript’s record lists the works about it.</p>
  <div class="bibgroups">${Object.keys(groups).map(g => `<div><h3>${esc(g)}</h3><ul class="biblist">${groups[g].sort((a, b) => key(a).localeCompare(key(b))).map(t => `<li>${t}</li>`).join("")}</ul></div>`).join("")}</div>
</section>`,
  });
}
function checksPage() {
  const open = mss.filter(m => m.to_check.length);
  const statusRows = [];
  for (const p of passages) for (const v of p.verses) for (const w of [...v.greek_witnesses, ...(v.latin_witnesses || [])])
    if (w.status === "to_check" || w.status === "to_map") statusRows.push([p, v, byId[w.id], w.status]);
  page({
    path: "checks/", title: "Open checks", current: "checks/",
    description: "Everything still to be confirmed before public release.",
    body: root => `
<header class="page">
  <div class="top"><span class="eyebrow">Before public release</span>${DRAFT}</div>
  <h1>Open checks</h1>
  <p class="lede">What still has to be confirmed before this site is released publicly. This page is built from the data, so it shrinks as items are resolved.</p>
</header>
<section class="prose" aria-labelledby="g-h">
  <h2 id="g-h">Across the whole site</h2>
  <ul class="lit">
    <li>Confirm every Greek record against the INTF Virtual Manuscript Room.</li>
    <li>Confirm variant witness lists against the printed Nestle–Aland 28 apparatus.</li>
    <li>Add page ranges missing from a few works (Hunger 1960, Lyon 1958–59, Aland 1968).</li>
    <li>Ask one specialist to review the site before public launch.</li>
  </ul>
</section>
<section class="prose" aria-labelledby="r-h">
  <h2 id="r-h">Manuscript records (${open.length})</h2>
  <div class="tbl"><table><thead><tr><th>Manuscript</th><th>Still to confirm</th></tr></thead>
  <tbody>${open.map(m => `<tr><td>${msLink(root, m)}</td><td class="name"><ul class="lit">${m.to_check.map(c => `<li>${esc(c)}</li>`).join("")}</ul></td></tr>`).join("")}</tbody></table></div>
</section>
<section class="prose" aria-labelledby="c-h">
  <h2 id="c-h">Verse coverage (${statusRows.length})</h2>
  <p>Places where a manuscript is listed for a verse but how much survives is still to be checked or mapped.</p>
  <div class="tbl"><table><thead><tr><th>Verse</th><th>Manuscript</th><th>Status</th></tr></thead>
  <tbody>${statusRows.map(([p, v, m, s]) => `<tr><td><a href="${root}${p.ref.path}">${esc(v.ref)}</a></td><td class="name">${msLink(root, m)}</td><td class="name">${esc(STATUS[s])}</td></tr>`).join("")}</tbody></table></div>
</section>`,
  });
}

// ---------- build ----------
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(here, "assets"), join(out, "assets"), { recursive: true });
cpSync(join(here, "data"), join(out, "data"), { recursive: true });
writeFileSync(join(out, ".nojekyll"), "");

homePage();
passages.forEach(passagePage);
manuscriptsIndex();
mss.forEach(manuscriptPage);
datingPage();
aboutPage();
bibliographyPage();
checksPage();

console.log(`Built ${passages.length} passage pages (${passages.map(p => "/" + p.ref.path).join(", ")}), ${mss.length} manuscript pages and 6 other pages into _site/.`);
