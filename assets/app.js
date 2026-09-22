// Builds a verse page from the JSON files in data/ (the verse to show is set on <body> by scripts/build.mjs).
// Citations in bibliography.json may contain <i> tags; every other field is escaped.

const VMR = id => `https://ntvmr.uni-muenster.de/manuscript-workspace?docID=${id}`;
const MATCOL = {papyrus:"var(--papyrus)", parchment:"var(--parchment)", unknown:"var(--unknown)"};
const MATNAME = {papyrus:"Papyrus", parchment:"Parchment", unknown:"Material to check"};
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const eraOf = m => m.catalogueDate < 500 ? "early" : m.catalogueDate < 800 ? "mid" : "late";

let MSS = [], BIB = {}, NOTES = {};
const state = {mat:"all", era:"all", conf:"all", q:""};
const cite = k => BIB[k] ? BIB[k].citation : `<span class="missing">[missing reference: ${esc(k)}]</span>`;

const ROOT = document.body.dataset.root || "";
const VERSE = document.body.dataset.verse;
const CUTOFF = Number(document.body.dataset.cutoff) || 900;

async function load(){
  const get = f => fetch(`${ROOT}data/${f}.json`).then(r => { if (!r.ok) throw new Error(`${f}.json: ${r.status}`); return r.json(); });
  const [mss, bib, notes, people, verse] = await Promise.all(
    ["manuscripts","bibliography","dating-notes","scholars",`verses/${VERSE}`].map(get));
  const byId = Object.fromEntries(mss.map(m=>[m.id, m]));
  // A witness is a shared manuscript record plus what survives of this verse in it
  MSS = verse.witnesses.filter(w=>byId[w.manuscript]).map(w=>({...byId[w.manuscript], contents:w.contents}))
    .sort((a,b)=> a.catalogueDate-b.catalogueDate || a.dateRange.earliest-b.dateRange.earliest);
  BIB = bib.works; NOTES = notes;
  renderStats();
  drawTimeline();
  render();
  renderPeople(people);
  renderBib(bib.groups);
  renderExcluded(verse.excluded);
  bindFilters();
  if (location.hash.startsWith("#ms-")) jump(location.hash.slice(4));
}

function renderStats(){
  const pap = MSS.filter(m=>m.material==="papyrus").length;
  const deb = MSS.filter(m=>m.confidence==="Debated").length;
  const withImg = MSS.filter(m=>m.images.length).length;
  document.getElementById("stats").innerHTML =
    `<span><b>${MSS.length}</b>manuscripts</span><span><b>${pap}</b>on papyrus</span><span><b>${deb}</b>with debated dates</span><span><b>${withImg}</b>with a direct image viewer (all have INTF links)</span>`;
}

// Timeline
function drawTimeline(){
  const svg = document.getElementById("tl");
  const W = 940, left = 110, right = 20, top = 26, rowH = 17;
  const x = y => left + (y-100)/(1000-100)*(W-left-right);
  const H = top + MSS.length*rowH + 10;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  let s = "";
  for (let c=100; c<=1000; c+=100){
    s += `<line class="grid" x1="${x(c)}" x2="${x(c)}" y1="${top-8}" y2="${H-4}"></line>`;
    s += `<text x="${x(c)}" y="12" text-anchor="middle">${c}</text>`;
  }
  s += `<line x1="${x(CUTOFF)}" x2="${x(CUTOFF)}" y1="${top-8}" y2="${H-4}" stroke="var(--rubric)" stroke-dasharray="3 3" stroke-width="1"></line>`;
  s += `<text x="${x(CUTOFF)+4}" y="${top-1}" fill="var(--rubric)" style="fill:var(--rubric)">cut-off</text>`;
  MSS.forEach((m,i)=>{
    const y = top + i*rowH + 8, col = MATCOL[m.material];
    s += `<g class="m" data-id="${esc(m.id)}" tabindex="0" role="link" aria-label="${esc(m.siglum)}, ${esc(m.name)}, ${esc(m.date)}">`;
    s += `<text class="lbl" x="${left-10}" y="${y+4}" text-anchor="end">${esc(m.siglum)}</text>`;
    s += `<line class="rng" x1="${x(m.dateRange.earliest)}" x2="${x(m.dateRange.latest)}" y1="${y}" y2="${y}" stroke="${col}"></line>`;
    s += `<circle class="dot" cx="${x(m.catalogueDate)}" cy="${y}" r="5.5" fill="${col}"></circle>`;
    s += `<title>${esc(m.siglum)} · ${esc(m.name)} · ${esc(m.date)}</title></g>`;
  });
  svg.innerHTML = s;
  svg.querySelectorAll("g.m").forEach(g=>{
    const go = ()=>jump(g.dataset.id);
    g.addEventListener("click", go);
    g.addEventListener("keydown", e=>{ if(e.key==="Enter"||e.key===" "){e.preventDefault();go();} });
  });
}
function jump(id){
  const el = document.getElementById("ms-"+id);
  if (!el) return;
  if (el.hidden){ resetFilters(); }
  el.scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block:"start"});
  el.classList.add("flash"); setTimeout(()=>el.classList.remove("flash"), 1400);
}

// Scholars, bibliography, exclusions
function renderPeople(people){
  document.getElementById("people").innerHTML = people.map(p=>`<tr><td>${esc(p.name)}</td><td>${esc(p.contribution)}</td><td>${cite(p.keyWork)}</td></tr>`).join("");
}
function renderBib(order){
  const groups = {};
  Object.values(BIB).forEach(b=>{ (groups[b.group] ||= []).push(b.citation); });
  const sortKey = s => s.replace(/<[^>]+>/g,"").toLowerCase();
  const all = order.concat(Object.keys(groups).filter(g=>!order.includes(g)));
  document.getElementById("bib").innerHTML = all.filter(g=>groups[g]).map(g=>
    `<div><h3>${esc(g)}</h3><ul>${groups[g].sort((a,b)=>sortKey(a).localeCompare(sortKey(b))).map(t=>`<li>${t}</li>`).join("")}</ul></div>`).join("");
}
function renderExcluded(rows){
  document.getElementById("excluded").innerHTML = rows.map(r=>`<tr><td>${esc(r.manuscript)}</td><td>${esc(r.date)}</td><td>${esc(r.reason)}</td></tr>`).join("");
}

// Manuscript list
function datingBlock(m){
  const d = m.datingEvidence; if (!d) return "";
  const ev = d.note ? NOTES[d.note] : d.text;
  const pos = d.positions.length ? `<dt>Positions</dt><dd><ul class="pos">${d.positions.map(p=>`<li><b>${esc(p.who)}</b>: ${esc(p.claim)}</li>`).join("")}</ul></dd>` : "";
  return `<dt>Why this date</dt><dd>${esc(ev)}</dd>${pos}<dt>Read further</dt><dd><ul class="lit">${d.furtherReading.map(k=>`<li>${cite(k)}</li>`).join("")}</ul></dd>`;
}
function card(m){
  const links = [`<a class="btn primary" href="${VMR(m.vmrId)}" target="_blank" rel="noopener">INTF Virtual Manuscript Room</a>`]
    .concat(m.images.map(i=>`<a class="btn" href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.label)}</a>`)).join("");
  return `<article class="ms" id="ms-${esc(m.id)}">
    <div class="sig">${esc(m.siglum)}<small>GA ${esc(m.gaNumber)}</small></div>
    <div class="body">
      <h3>${esc(m.name)}</h3>
      <div class="facts">
        <span class="tag date">${esc(m.date)}</span>
        <span class="tag ${m.confidence==="Firm"?"firm":"debated"}">Date: ${esc(m.confidence)}</span>
        <span class="tag mat"><i class="sw" style="background:${MATCOL[m.material]}"></i>${MATNAME[m.material]}${m.palimpsest?" · palimpsest":""}</span>
      </div>
      <p class="where">${esc(m.library)} · ${esc(m.shelfmark)} · ${esc(m.city)}</p>
      <p class="summary">${esc(m.summary)}</p>
      <div class="links">${links}</div>
      <details${m.confidence==="Debated"?" open":""}><summary>Full record and dating evidence</summary>
        <dl>
          <dt>What survives</dt><dd>${esc(m.contents)}</dd>
          <dt>Dating summary</dt><dd>${esc(m.datingSummary)}</dd>
          ${datingBlock(m)}
          <dt>Provenance</dt><dd>${esc(m.provenance)}</dd>
          <dt>Catalogue no.</dt><dd>Gregory–Aland ${esc(m.gaNumber)}</dd>
        </dl>
      </details>
    </div>
  </article>`;
}
function render(){
  document.getElementById("list").innerHTML = MSS.map(card).join("");
  applyFilters();
}

// Filters
function matches(m){
  if (state.mat!=="all" && m.material!==state.mat) return false;
  if (state.era!=="all" && eraOf(m)!==state.era) return false;
  if (state.conf!=="all" && m.confidence!==state.conf) return false;
  if (state.q){
    const hay = [m.siglum,m.gaNumber,m.name,m.library,m.city,m.shelfmark].join(" ").toLowerCase();
    if (!hay.includes(state.q)) return false;
  }
  return true;
}
function applyFilters(){
  let n = 0;
  MSS.forEach(m=>{
    const ok = matches(m); if (ok) n++;
    const el = document.getElementById("ms-"+m.id); if (el) el.hidden = !ok;
    const g = document.querySelector(`#tl g.m[data-id="${CSS.escape(m.id)}"]`); if (g) g.classList.toggle("dim", !ok);
  });
  document.getElementById("count").textContent = `Showing ${n} of ${MSS.length}`;
  let empty = document.getElementById("empty");
  if (!n && !empty){ empty = document.createElement("p"); empty.id="empty"; empty.className="empty"; empty.textContent="No manuscripts match these filters. Clear the search or choose “All”."; document.getElementById("list").appendChild(empty); }
  if (n && empty) empty.remove();
}
function resetFilters(){
  state.mat=state.era=state.conf="all"; state.q="";
  document.getElementById("q").value="";
  document.querySelectorAll(".chip").forEach(c=>c.setAttribute("aria-pressed", c.dataset.v==="all"?"true":"false"));
  applyFilters();
}
function bindFilters(){
  document.querySelectorAll(".chip").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const f = btn.dataset.f;
      state[f] = btn.dataset.v;
      document.querySelectorAll(`.chip[data-f="${f}"]`).forEach(c=>c.setAttribute("aria-pressed", c===btn?"true":"false"));
      applyFilters();
    });
  });
  document.getElementById("q").addEventListener("input", e=>{ state.q = e.target.value.trim().toLowerCase(); applyFilters(); });
}

load().catch(err=>{
  document.getElementById("list").innerHTML =
    `<p class="empty">Could not load the data files (${esc(err.message)}). To preview on your own computer, run <code>node scripts/build.mjs</code> and then <code>python3 -m http.server -d _site</code>, and visit http://localhost:8000.</p>`;
  console.error(err);
});
