// Tabbed viewer. Data comes from scripts/build-viewer.mjs; the address (#john-1-1-18.v5) holds the current view.
(function(){
  const D = JSON.parse(document.getElementById("data").textContent);
  const F = JSON.parse(document.getElementById("fragments").textContent);
  const MS = D.mss, P = Object.fromEntries(D.passages.map(p => [p.slug, p]));
  const view = document.getElementById("view"), dlg = document.getElementById("msd");

  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const cite = k => D.bib[k] || `<span class="missing">[missing reference: ${esc(k)}]</span>`;
  const label = m => m.siglum || m.name;
  const MATCOL = {papyrus:"var(--papyrus)", parchment:"var(--parchment)", "to check":"var(--unknown)"};
  const MATNAME = {papyrus:"Papyrus", parchment:"Parchment", "to check":"Material to check"};
  const STATUS = {preserved:"", replacement_leaves:"replacement leaves", to_check:"extent to check", preserved_in_harmony:"in harmony", to_map:"to map"};
  const NUM = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
  const isINTF = u => /ntvmr\.uni-muenster\.de/.test(u);
  const short = p => p.passage.replace(/^John /, "John ");

  // ---------- routing ----------
  // #<passage> · #<passage>.v<n> · #<passage>.<sub> · #manuscripts · #sources.<sub> · #checks
  function parse(){
    const h = decodeURIComponent(location.hash.slice(1));
    const [a, b] = h.split(".");
    if (P[a]) {
      const p = P[a];
      if (b && /^v\d+$/.test(b) && p.verses.some(v => v.n === +b.slice(1))) return {tab:a, sub:"verses", verse:+b.slice(1)};
      if (b && ["coverage","variants","latin","about"].includes(b)) return {tab:a, sub:b};
      return {tab:a, sub:"verses", verse:p.verses[0].n};
    }
    if (a === "manuscripts" || a === "checks") return {tab:a};
    if (a === "sources") return {tab:a, sub:["dating","people","bib","method"].includes(b) ? b : "dating"};
    return {tab:D.passages[0].slug, sub:"verses", verse:D.passages[0].verses[0].n};
  }
  let current = {};
  function go(hash){ if (location.hash.slice(1) === hash) render(); else location.hash = hash; }
  function render(){
    const r = parse(), tabChanged = r.tab !== current.tab || r.sub !== current.sub;
    current = r;
    renderTabs(r);
    if (P[r.tab]) view.innerHTML = passageView(P[r.tab], r);
    else if (r.tab === "manuscripts") view.innerHTML = manuscriptsView();
    else if (r.tab === "sources") view.innerHTML = sourcesView(r.sub);
    else view.innerHTML = checksView();
    if (r.tab === "manuscripts") bindManuscriptFilters();
    if (tabChanged) window.scrollTo({top:0});
    document.title = `${P[r.tab] ? P[r.tab].passage + (r.sub === "verses" && P[r.tab].verses.length > 1 ? ` · ${P[r.tab].chapter}:${r.verse}` : "") : {manuscripts:"Manuscripts", sources:"Dating and sources", checks:"Open checks"}[r.tab]} · Manuscript Witness Explorer`;
  }
  function renderTabs(r){
    const t = D.passages.map(p => `<a href="#${p.slug}"${r.tab === p.slug ? ' aria-current="page"' : ""}>${esc(short(p))}</a>`).join("") +
      `<span class="sep" aria-hidden="true"></span>` +
      [["manuscripts","Manuscripts"],["sources","Dating and sources"],["checks","Open checks"]]
        .map(([k, n]) => `<a href="#${k}"${r.tab === k ? ' aria-current="page"' : ""}>${n}</a>`).join("");
    document.getElementById("tabs").innerHTML = t;
    const on = document.querySelector('#tabs [aria-current="page"]');
    if (on) on.scrollIntoView({block:"nearest", inline:"nearest"});
  }

  // ---------- passage ----------
  function greekIds(p){ return [...new Set(p.verses.flatMap(v => v.g.map(([id]) => id)))].map(id => MS[id]); }
  function passageView(p, r){
    const greek = greekIds(p), multi = p.verses.length > 1;
    const pap = greek.filter(m => m.material === "papyrus").length, deb = greek.filter(m => m.date.confidence === "Debated").length;
    const stats = [[greek.length, "Greek manuscripts to 900"], [pap, "on papyrus"], [deb, "with debated dates"],
      ...(p.variants.length ? [[p.variants.length, "variants that matter"]] : []), ...(p.newIds.length ? [[p.newIds.length, "new in this section"]] : []),
      ...(p.latin.length ? [[p.latin.length, "Latin witnesses"]] : [])];
    const open = [...greek, ...p.latin.map(([id]) => MS[id])].filter(m => m.to_check.length);
    const subs = [["verses", multi ? "Verse by verse" : "The verse"], ...(multi ? [["coverage", "Who has which verse"]] : []),
      ...(p.variants.length || p.sweep.length ? [["variants", "Variants and notes", p.variants.length + p.sweep.length]] : []),
      ...(p.latin.length ? [["latin", "Latin layer", p.latin.length]] : []), ["about", "About this passage"]];
    const body = r.sub === "coverage" ? coverageView(p) : r.sub === "variants" ? variantsView(p) : r.sub === "latin" ? latinView(p)
      : r.sub === "about" ? aboutView(p) : verseView(p, r.verse);
    return `<header class="phead">
      <div class="top" style="display:flex;gap:12px;flex-wrap:wrap;align-items:center"><span class="eyebrow">Gospel of ${esc(p.book)} · chapter ${p.chapter}</span></div>
      <h1>${esc(p.heading || (multi ? p.passage : `Who has ${p.passage}?`))}</h1>
      ${p.lede ? `<p class="lede">${esc(p.lede)}</p>` : ""}
      <div class="stats">${stats.map(([n, l]) => `<span><b>${n}</b>${l}</span>`).join("")}</div>
      ${open.length ? `<details class="checks"><summary><b>Still to confirm:</b> ${open.length} record${open.length > 1 ? "s" : ""} used here ${open.length > 1 ? "have" : "has"} open checks</summary>
        <p style="margin-top:6px">${open.map(m => `<button class="lacksbtn ml" data-ms="${esc(m.id)}" style="font:inherit;color:var(--accent);background:none;border:0;padding:0;cursor:pointer;text-decoration:underline">${esc(label(m))}</button>`).join(", ")}. See <a href="#checks">Open checks</a>.</p></details>` : ""}
    </header>
    <nav class="subtabs" aria-label="${esc(p.passage)}">${subs.map(([k, n, c]) =>
      `<a href="#${p.slug}${k === "verses" ? (r.sub === "verses" ? `.v${r.verse}` : "") : "." + k}"${r.sub === k ? ' aria-current="page"' : ""}>${n}${c ? `<span class="n">${c}</span>` : ""}</a>`).join("")}</nav>
    ${body}`;
  }

  function verseView(p, n){
    const i = p.verses.findIndex(v => v.n === n), v = p.verses[i], multi = p.verses.length > 1;
    const prev = p.verses[i - 1], next = p.verses[i + 1];
    const vlabel = k => { const x = p.variants.find(y => y.id === k); return x ? `variant${x.label ? ": " + x.label : ""}` : "translation note"; };
    let rail = "";
    if (multi) {
      const groups = p.sections ? p.sections.map(s => [s.title, p.verses.filter(x => x.n >= s.from && x.n <= s.to)]) : [[null, p.verses]];
      rail = `<nav class="rail" aria-label="Verses">${groups.map(([title, vs]) => `<div class="railsec">${title ? `<span class="eyebrow">${esc(title)}</span>` : ""}<div class="railbtns">${
        vs.map(x => `<a class="vbtn" href="#${p.slug}.v${x.n}"${x.n === n ? ' aria-current="true"' : ""} title="${esc(x.ref)}${x.vars.length ? " · variant" : ""}${x.notes.length ? " · translation note" : ""}">${p.chapter}:${x.n}${
          x.vars.length ? '<i class="mk var" aria-hidden="true"></i>' : x.notes.length ? '<i class="mk tr" aria-hidden="true"></i>' : ""}</a>`).join("")}</div></div>`).join("")}</nav>
      <div class="stepper">
        <a class="stepbtn" href="#${p.slug}.v${prev ? prev.n : n}"${prev ? "" : ' aria-disabled="true" tabindex="-1"'}>‹ ${prev ? `${p.chapter}:${prev.n}` : "Previous"}</a>
        <span class="pos">Verse ${i + 1} of ${p.verses.length} <span class="keyhint">· use ← → keys</span></span>
        <a class="stepbtn" href="#${p.slug}.v${next ? next.n : n}"${next ? "" : ' aria-disabled="true" tabindex="-1"'}>${next ? `${p.chapter}:${next.n}` : "Next"} ›</a>
      </div>`;
    }
    const flags = v.vars.map(k => `<a class="flag var" href="#vc-${esc(k)}">${esc(vlabel(k))}</a>`).concat(v.notes.map(k => `<a class="flag tr" href="#vc-${esc(k)}">translation note</a>`)).join("");
    const greekText = v.gk
      ? `<p class="greek" lang="grc"><span class="init">${esc(Array.from(v.gk)[0])}</span>${esc(Array.from(v.gk).slice(1).join(""))}</p>`
      : v.gv ? `<span class="gvl">Greek where the manuscripts differ</span><p class="gv" lang="grc">${esc(v.gv)}</p>` : "";
    const ws = v.g.map(([id, st]) => [MS[id], st]).sort((a, b) => a[0].date.estimate - b[0].date.estimate);
    const here = new Set(v.g.map(([id]) => id));
    const lacking = greekIds(p).filter(m => !here.has(m.id));
    const groups = [["Papyri", ws.filter(([m]) => m.material === "papyrus")], ["Parchment majuscules", ws.filter(([m]) => m.material !== "papyrus")]];
    const lat = v.l.map(([id, st]) => [MS[id], st]).sort((a, b) => a[0].date.estimate - b[0].date.estimate);
    const cards = [...v.vars.map(k => p.variants.find(x => x.id === k)).filter(Boolean).map(variantCard), ...v.notes.map(k => p.sweep.find(x => x.id === k)).filter(Boolean).map(sweepCard)];
    return `${rail}
    <article class="vcard" aria-label="${esc(v.ref)}">
      <span class="vref">${p.chapter}:${v.n}</span>
      ${v.section ? `<span class="eyebrow">${esc(v.section)}</span>` : ""}
      ${greekText}
      <p class="tr">${esc(v.tr)}</p>
      ${flags ? `<div class="vflags">${flags}</div>` : ""}
    </article>
    <section class="wsec" aria-labelledby="w-h">
      <h2 id="w-h">Greek manuscripts that preserve ${multi ? "this verse" : "it"}<span class="n">${ws.length}</span></h2>
      ${strip(ws.map(([m]) => m))}
      ${groups.filter(([, l]) => l.length).map(([name, l]) => `<div class="wgroup"><span class="eyebrow">${name}</span><div class="wgrid">${l.map(([m, st]) => witBtn(m, st)).join("")}</div></div>`).join("")}
      ${lacking.length ? `<p class="lacks">Listed for ${esc(p.passage)} but lacking this verse: ${lacking.map(m => `<button data-ms="${esc(m.id)}">${esc(label(m))}</button>`).join(", ")}.</p>` : ""}
      <p class="note">Select a manuscript for its date, the evidence and debates behind it, where it is now and where to see it.</p>
    </section>
    ${lat.length ? `<section class="wsec"><h2>Latin manuscripts<span class="n">${lat.length}</span></h2><div class="wgrid">${lat.map(([m, st]) => witBtn(m, st)).join("")}</div></section>`
      : p.latin.length ? `<p class="note">Latin coverage for ${esc(p.passage)} is recorded for the whole passage: see the <a href="#${p.slug}.latin">Latin layer</a>.</p>` : ""}
    ${cards.length ? `<section class="wsec"><h2>Where the manuscripts disagree here</h2><div class="variants">${cards.join("")}</div></section>` : ""}
    ${multi ? "" : aboutView(p)}`;
  }
  function witBtn(m, st){
    return `<button class="wit st-${esc(st)}" data-ms="${esc(m.id)}" title="${esc(m.name)}${STATUS[st] ? " · " + STATUS[st] : ""}">
      <span class="s"><i class="sw" style="background:${m.language === "Latin" ? "var(--latin)" : MATCOL[m.material]}"></i>${esc(label(m))}${m.date.confidence === "Debated" ? '<i class="deb" title="date debated"></i>' : ""}</span>
      <span class="d">${esc(m.date.label)}</span>${STATUS[st] ? `<span class="st">${STATUS[st]}</span>` : ""}</button>`;
  }
  // Dots on a 100–1000 axis, stacked where dates coincide
  function strip(list){
    const W = 720, l = 20, r = 20, x = y => l + (y - 100) / 900 * (W - l - r), R = 5.5;
    const placed = [];
    list.forEach(m => { const cx = x(m.date.estimate); let k = 0; while (placed.some(p => Math.abs(p.cx - cx) < R * 2 && p.k === k)) k++; placed.push({m, cx, k}); });
    const rows = Math.max(1, ...placed.map(p => p.k + 1)), base = 14 + rows * R * 2.2, H = base + 22;
    let s = `<line class="ax" x1="${l}" x2="${W - r}" y1="${base}" y2="${base}"></line>`;
    for (let c = 100; c <= 1000; c += 100) s += `<line class="ax" x1="${x(c)}" x2="${x(c)}" y1="${base}" y2="${base + 4}"></line><text x="${x(c)}" y="${base + 16}" text-anchor="middle">${c}</text>`;
    s += `<line class="cut" x1="${x(900)}" x2="${x(900)}" y1="4" y2="${base}"></line><text class="cut" x="${x(900) - 4}" y="10" text-anchor="end">cut-off</text>`;
    s += placed.map(({m, cx, k}) => `<circle data-ms="${esc(m.id)}" cx="${cx.toFixed(1)}" cy="${(base - R - 2 - k * R * 2.2).toFixed(1)}" r="${R}" fill="${MATCOL[m.material]}"><title>${esc(label(m))} · ${esc(m.date.label)}</title></circle>`).join("");
    return `<div class="strip"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${s}</svg></div>`;
  }
  function variantCard(v){
    return `<div class="vc" id="vc-${esc(v.id)}"><span class="ref">${esc(v.ref)}</span><h3>${esc(v.title)}</h3>
      <div class="readings">${v.readings.map(r => `<div class="rd${r.printed_in_NA28 ? " printed" : ""}">${r.printed_in_NA28 ? '<span class="pl">Printed in NA28</span>' : ""}<span class="gk" lang="${/[α-ω]/i.test(r.greek) ? "grc" : "la"}">${esc(r.greek)}</span><span class="en">${esc(r.english)}</span><span class="wit">${esc(r.witnesses)}</span></div>`).join("")}</div>
      <p>${esc(v.explanation)}</p>
      ${(v.literature || []).length ? `<details><summary>Scholarly works</summary><ul>${v.literature.map(k => `<li>${cite(k)}</li>`).join("")}</ul></details>` : ""}</div>`;
  }
  function sweepCard(t){
    return `<div class="vc tr" id="vc-${esc(t.id)}"><span class="ref">${esc(t.ref)} · translation question, not a manuscript variant</span><h3>${esc(t.question)}</h3>
      ${t.greek ? `<div class="readings"><div class="rd"><span class="gk" lang="grc">${esc(t.greek)}</span>${t.manuscripts_agree ? '<span class="wit">Read the same way in the early Greek manuscripts that preserve the verse.</span>' : ""}</div></div>` : ""}
      ${t.explanation ? `<p>${esc(t.explanation)}</p>` : ""}
      ${(t.literature || []).length ? `<details><summary>Scholarly works</summary><ul>${t.literature.map(k => `<li>${cite(k)}</li>`).join("")}</ul></details>` : ""}</div>`;
  }

  function coverageView(p){
    const vs = p.verses.map(v => v.n), at = {};
    p.verses.forEach(v => [...v.g, ...v.l].forEach(([id, st]) => { (at[id] ||= {})[v.n] = st; }));
    const cls = (m, s) => !s ? "" : s === "preserved" ? `y${m.material === "papyrus" ? " pap" : m.language === "Latin" ? " lat" : ""}` : s === "replacement_leaves" ? "s" : s === "preserved_in_harmony" ? "h" : "q";
    const byDate = (a, b) => a.date.estimate - b.date.estimate;
    const greek = greekIds(p).sort(byDate);
    const latin = [...new Set(p.verses.flatMap(v => v.l.map(([id]) => id)))].map(id => MS[id]).sort(byDate);
    const row = m => `<tr><th class="mxh" scope="row"><button data-ms="${esc(m.id)}"><span class="s">${esc(label(m))}</span>${m.date.confidence === "Debated" ? '<span class="dtag deb">date debated</span>' : ""}<span class="d">${esc(m.name)} · ${esc(m.date.label)}</span></button></th>${
      vs.map(n => { const s = at[m.id]?.[n]; return `<td><i class="c ${cls(m, s)}" role="img" aria-label="${p.chapter}:${n} ${s ? (STATUS[s] || "preserved") : "not preserved"}"></i></td>`; }).join("")}</tr>`;
    const groups = [["Papyri", greek.filter(m => m.material === "papyrus")], ["Parchment majuscules", greek.filter(m => m.material !== "papyrus")], ["Latin (secondary layer)", latin]];
    const secRow = p.sections ? `<tr class="secs"><th class="mxh"></th>${p.sections.map(s => `<th colspan="${s.to - s.from + 1}" scope="colgroup">${esc(s.title)}</th>`).join("")}</tr>` : "";
    return `<section class="sec">
      <p>Each row is a manuscript, each column a verse. A filled square means at least part of that verse survives. Select a verse number to open it, or a manuscript for its record.</p>
      <div class="legend"><span><i class="c y pap"></i>Papyrus</span><span><i class="c y"></i>Parchment</span>${latin.length ? '<span><i class="c y lat"></i>Latin</span><span><i class="c h"></i>Within a Gospel harmony</span>' : ""}<span><i class="c s"></i>Later replacement leaves (still before 900)</span><span><i class="c q"></i>Survives, extent to check or to map</span><span><i class="c"></i>Lost or never included</span></div>
      <div class="mx-box"><table class="mx"><thead>${secRow}<tr><th class="mxh" scope="col">Manuscript</th>${vs.map(n => `<th scope="col"><a href="#${p.slug}.v${n}">${n}</a></th>`).join("")}</tr></thead><tbody>${
        groups.filter(([, l]) => l.length).map(([name, l]) => `<tr class="grp"><th colspan="${vs.length + 1}">${name}</th></tr>${l.map(row).join("")}`).join("")
      }</tbody><tfoot><tr><th>Greek witnesses per verse</th>${p.verses.map(v => `<td>${v.g.length}</td>`).join("")}</tr></tfoot></table></div>
      <p class="note">Coverage is taken from published contents lists and each manuscript’s recorded gaps. It has not yet been checked leaf by leaf against the INTF catalogue.</p>
    </section>`;
  }
  function variantsView(p){
    return `<section class="sec">
      ${p.variants.length ? `<p>Most differences between manuscripts are spelling and word order. ${p.variants.length === 1 ? "One place matters" : `${NUM[p.variants.length] || p.variants.length} places matter`} for meaning. The printed reading of the modern critical edition (Nestle–Aland, 28th edition) is outlined.</p>
      <div class="variants">${p.variants.map(variantCard).join("")}</div>` : ""}
      ${p.sweep.length ? `<h2 style="margin-top:12px">Saved for the translation sweep</h2><div class="variants">${p.sweep.map(sweepCard).join("")}</div>` : ""}
    </section>`;
  }
  function latinView(p){
    return `<section class="sec">
      <p>${esc(p.latinNote || "Latin translations were made from Greek manuscripts older than most that survive, so they can preserve early readings. These are key Latin witnesses up to AD 900; verse-level coverage for some is still to be mapped.")}</p>
      <div class="tbl"><table><thead><tr><th>Manuscript</th><th>Date</th><th>Type</th><th>${esc(p.passage)}</th></tr></thead>
      <tbody>${p.latin.map(([id, cov]) => { const m = MS[id]; return `<tr><td class="name"><button class="ml" data-ms="${esc(id)}">${esc(m.siglum ? `${m.name} (${m.siglum})` : m.name)}</button></td><td>${esc(m.date.label)}</td><td class="name">${esc(m.text_type || "")}</td><td class="name">${esc(cov)}</td></tr>`; }).join("")}</tbody></table></div>
    </section>`;
  }
  function aboutView(p){
    const parts = [];
    if (p.newIds.length) parts.push(`<section class="sec"><h2>Witnesses that first appear in this section</h2>
      <p>Manuscripts that do not preserve the earlier part of the chapter here but do preserve part of ${esc(p.passage)}.</p>
      <div class="tbl"><table><thead><tr><th>Manuscript</th><th>Date</th><th>What it is</th><th>Where it is</th></tr></thead><tbody>${p.newIds.map(id => { const m = MS[id];
        return `<tr><td><button class="ml sg" data-ms="${esc(id)}">${esc(label(m))}</button></td><td class="name">${esc(m.date.label)}</td><td class="name">${esc(m.summary)}</td><td class="name">${esc([m.holding.library, m.holding.city].filter(Boolean).join(", "))}</td></tr>`; }).join("")}</tbody></table></div></section>`);
    if (p.excluded.length) parts.push(`<section class="sec"><h2>Why some manuscripts aren’t listed</h2>
      <p>Some manuscripts are missing the page that held this passage, or were copied after the cut-off. Leaving them out is part of being accurate, so here is why.</p>
      <div class="tbl"><table><thead><tr><th>Manuscript</th><th>Date</th><th>Why it’s not in the list</th></tr></thead><tbody>${p.excluded.map(e => {
        const m = e.id && MS[e.id];
        return `<tr><td>${m ? `<button class="ml" data-ms="${esc(e.id)}">${esc(e.label || label(m))}</button>` : esc(e.label || e.id)}</td><td class="name">${esc(e.date || (m ? m.date.label : ""))}</td><td class="name">${esc(e.reason)}</td></tr>`; }).join("")}</tbody></table></div></section>`);
    if (p.lit.length) parts.push(`<section class="sec"><h2>Scholarly works for this passage</h2><p>Works on the manuscripts themselves are listed in each manuscript’s record.</p><ul class="biblist">${p.lit.map(k => `<li>${cite(k)}</li>`).join("")}</ul></section>`);
    parts.push(`<section class="sec"><h2>Status</h2><p>${p.translationNote ? esc(p.translationNote) + " " : ""}Draft built from published catalogue data. Each entry should be confirmed in the INTF Virtual Manuscript Room${p.variants.length ? ", and the variant witness lists against the printed Nestle–Aland 28 apparatus," : ""} before public release, ideally by a specialist.</p></section>`);
    return parts.join("");
  }

  // ---------- manuscripts ----------
  let mfilter = {q:"", lang:"all"};
  function manuscriptsView(){
    const all = [...D.greek, ...D.latin].map(id => MS[id]);
    return `<header class="phead"><span class="eyebrow">Every record</span><h1>The manuscripts</h1>
      <p class="lede">Each manuscript is recorded once, with its date, the evidence and debates behind that date, where it is now and where to see it. Select one to open its record.</p>
      <div class="stats"><span><b>${D.greek.length}</b>Greek</span><span><b>${D.latin.length}</b>Latin</span><span><b>${all.filter(m => m.date.confidence === "Debated").length}</b>with debated dates</span><span><b>${all.filter(m => m.to_check.length).length}</b>with open checks</span></div></header>
      <div class="mfilters">
        <input id="mq" type="search" placeholder="Siglum, name, library or city" aria-label="Search manuscripts" value="${esc(mfilter.q)}" style="font:15px var(--body);color:var(--ink);background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:8px 12px;width:100%;max-width:360px">
        <div class="frow" role="group" aria-label="Language">${[["all","All"],["Greek","Greek"],["Latin","Latin"]].map(([v, n]) => `<button class="chip" data-lang="${v}" aria-pressed="${mfilter.lang === v}">${n}</button>`).join("")}</div>
        <span class="count" id="mcount"></span>
      </div>
      <div class="tbl"><table><thead><tr><th>Manuscript</th><th>Name</th><th>Date</th><th>Where</th><th>Passages</th></tr></thead><tbody id="mrows">${all.map(m => `<tr data-lang="${m.language}" data-q="${esc([m.siglum, m.ga, m.name, m.holding.library, m.holding.city, m.holding.shelfmark].filter(Boolean).join(" ").toLowerCase())}">
        <td><button class="ml sg" data-ms="${esc(m.id)}">${esc(label(m))}</button></td>
        <td class="name"><button class="ml" data-ms="${esc(m.id)}">${esc(m.name)}</button>${m.to_check.length ? ` <span class="tag tocheck">${m.to_check.length} to check</span>` : ""}</td>
        <td class="name">${esc(m.date.label)}${m.date.confidence === "Debated" ? ' <span class="dtag deb">debated</span>' : ""}</td>
        <td class="name">${esc(m.holding.city || m.holding.library)}</td><td>${m.cited.length}</td></tr>`).join("")}</tbody></table></div>`;
  }
  function bindManuscriptFilters(){
    const apply = () => {
      let n = 0;
      document.querySelectorAll("#mrows tr").forEach(tr => {
        const ok = (mfilter.lang === "all" || tr.dataset.lang === mfilter.lang) && (!mfilter.q || tr.dataset.q.includes(mfilter.q));
        tr.hidden = !ok; if (ok) n++;
      });
      document.getElementById("mcount").textContent = `Showing ${n}`;
    };
    document.getElementById("mq").addEventListener("input", e => { mfilter.q = e.target.value.trim().toLowerCase(); apply(); });
    document.querySelectorAll("[data-lang].chip").forEach(b => b.addEventListener("click", () => {
      mfilter.lang = b.dataset.lang;
      document.querySelectorAll("[data-lang].chip").forEach(c => c.setAttribute("aria-pressed", c === b));
      apply();
    }));
    apply();
  }

  // ---------- sources and checks ----------
  function sourcesView(sub){
    const subs = [["dating","How dates are worked out"],["people","Who’s who"],["bib","Bibliography"],["method","How the lists are made"]];
    const body = sub === "people" ? F.people : sub === "bib"
      ? `<section class="prose"><p>Works cited in this explorer, grouped by topic. Each manuscript’s record lists the works about it.</p><div class="bibgroups">${D.bibGroups.map(([g, list]) => `<div><h3>${esc(g)}</h3><ul class="biblist">${list.map(t => `<li>${t}</li>`).join("")}</ul></div>`).join("")}</div></section>`
      : sub === "method" ? F.method : F.dating;
    return `<header class="phead"><span class="eyebrow">Dating and sources</span><h1>How we know what we know</h1></header>
      <nav class="subtabs" aria-label="Dating and sources">${subs.map(([k, n]) => `<a href="#sources.${k}"${sub === k ? ' aria-current="page"' : ""}>${n}</a>`).join("")}</nav>${body}`;
  }
  function checksView(){
    const recs = [...D.greek, ...D.latin].map(id => MS[id]).filter(m => m.to_check.length);
    const vrows = [];
    D.passages.forEach(p => p.verses.forEach(v => [...v.g, ...v.l].forEach(([id, st]) => { if (st === "to_check" || st === "to_map") vrows.push([p, v, MS[id], st]); })));
    return `<header class="phead"><span class="eyebrow">Before public release</span><h1>Open checks</h1>
      <p class="lede">What still has to be confirmed before this is released publicly. The list is built from the data, so it shrinks as items are resolved.</p></header>
      <section class="sec"><h2>Across the whole project</h2><ul class="lit">
        <li>Confirm every Greek record against the INTF Virtual Manuscript Room.</li>
        <li>Confirm variant witness lists against the printed Nestle–Aland 28 apparatus.</li>
        <li>Add page ranges missing from a few works (Hunger 1960, Lyon 1958–59, Aland 1968).</li>
        <li>Ask one specialist to review before public launch.</li></ul></section>
      <section class="sec"><h2>Manuscript records <span class="count">${recs.length}</span></h2><div class="tbl"><table><thead><tr><th>Manuscript</th><th>Still to confirm</th></tr></thead><tbody>${
        recs.map(m => `<tr><td><button class="ml sg" data-ms="${esc(m.id)}">${esc(label(m))}</button></td><td class="name"><ul class="lit">${m.to_check.map(c => `<li>${esc(c)}</li>`).join("")}</ul></td></tr>`).join("")}</tbody></table></div></section>
      <section class="sec"><h2>Verse coverage <span class="count">${vrows.length}</span></h2><p>Places where a manuscript is listed for a verse but how much survives is still to be checked or mapped.</p>
        <div class="tbl"><table><thead><tr><th>Verse</th><th>Manuscript</th><th>Status</th></tr></thead><tbody>${
        vrows.map(([p, v, m, st]) => `<tr><td><a href="#${p.slug}.v${v.n}">${esc(v.ref)}</a></td><td class="name"><button class="ml" data-ms="${esc(m.id)}">${esc(label(m))}</button></td><td class="name">${st === "to_map" ? "coverage still to map" : "survives, extent to check"}</td></tr>`).join("")}</tbody></table></div></section>`;
  }

  // ---------- manuscript panel ----------
  function openMs(id){
    const m = MS[id]; if (!m) return;
    const d = m.date;
    const pos = m.scholarly_positions.length ? `<dt>Positions</dt><dd><ul class="pos">${m.scholarly_positions.map(p => `<li><b>${esc(p.who)}</b>: ${esc(p.claim)}</li>`).join("")}</ul></dd>` : "";
    document.getElementById("msd-body").innerHTML = `
      <div class="sheet-top"><span class="eyebrow">${esc(m.language)}${m.ga ? ` · Gregory–Aland ${esc(m.ga)}` : m.text_type ? ` · ${esc(m.text_type)}` : ""}</span><button class="closebtn" data-close>Close</button></div>
      <div class="sheet-body">
        ${m.siglum ? `<div class="sig">${esc(m.siglum)}</div>` : ""}
        <h2 id="msd-title">${esc(m.name)}</h2>
        <div class="facts"><span class="tag date">${esc(d.label)}</span><span class="tag ${d.confidence === "Firm" ? "firm" : "debated"}">Date: ${esc(d.confidence)}</span>
          <span class="tag mat"><i class="sw" style="background:${MATCOL[m.material]}"></i>${MATNAME[m.material]}${m.palimpsest ? " · palimpsest" : ""}</span></div>
        <p class="where">${[m.holding.library, m.holding.shelfmark, m.holding.city].filter(Boolean).map(esc).join(" · ")}</p>
        <p class="summary">${esc(m.summary)}</p>
        ${m.images.length ? `<div class="links">${m.images.map(i => `<a class="btn${isINTF(i.url) ? " primary" : ""}" href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.label)}</a>`).join("")}</div>` : ""}
        ${m.to_check.length ? `<div class="checks" role="note"><b>Still to confirm for this record:</b><ul>${m.to_check.map(c => `<li>${esc(c)}</li>`).join("")}</ul></div>` : ""}
        <dl>
          <dt>What survives</dt><dd>${esc(m.contents_summary)}</dd>
          <dt>Date</dt><dd>${esc(d.label)}. ${esc(d.summary)}</dd>
          <dt>Why this date</dt><dd>${esc(m.dating_evidence)}</dd>
          ${pos}
          <dt>Provenance</dt><dd>${esc(m.provenance)}</dd>
          ${m.literature.length ? `<dt>Read further</dt><dd><ul class="lit">${m.literature.map(k => `<li>${cite(k)}</li>`).join("")}</ul></dd>` : ""}
          <dt>In this explorer</dt><dd>${m.cited.length ? `<ul class="cited">${m.cited.map(([slug, cov]) => {
            const p = P[slug], first = p.verses.find(v => [...v.g, ...v.l].some(([x]) => x === id));
            return `<li><a href="#${slug}${first ? `.v${first.n}` : ".latin"}" data-close>${esc(p.passage)}</a>: ${esc(cov)}</li>`; }).join("")}</ul>` : "Not yet a witness in any passage."}</dd>
        </dl>
      </div>`;
    if (!dlg.open) dlg.showModal();
    dlg.scrollTop = 0;
  }

  // ---------- events ----------
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-ms]");
    if (t) { e.preventDefault(); openMs(t.dataset.ms); return; }
    if (e.target.closest("[data-close]")) dlg.close();
    const a = e.target.closest('a[href^="#vc-"]');
    if (a) { e.preventDefault(); document.getElementById(a.getAttribute("href").slice(1))?.scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block:"start"}); }
  });
  dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
  document.addEventListener("keydown", e => {
    if (dlg.open || e.altKey || e.ctrlKey || e.metaKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const p = P[current.tab];
    if (!p || current.sub !== "verses" || p.verses.length < 2) return;
    const i = p.verses.findIndex(v => v.n === current.verse);
    const j = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? p.verses.length - 1 : -2;
    if (j < -1) return;
    if (p.verses[j]) { e.preventDefault(); go(`${p.slug}.v${p.verses[j].n}`); }
  });
  window.addEventListener("hashchange", render);
  render();
})();
