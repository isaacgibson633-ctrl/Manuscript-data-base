// Filters and timeline links for passage pages. The page itself is complete without this script.
(function(){
  const list = document.getElementById("list");
  if (!list) return;
  document.querySelectorAll(".nojs").forEach(el=>el.classList.remove("nojs"));
  const items = [...list.querySelectorAll("article.ms")];
  const state = {mat:"all", era:"all", conf:"all", q:""};

  function applyFilters(){
    let n = 0;
    items.forEach(el=>{
      const d = el.dataset;
      const ok = (state.mat==="all" || d.mat===state.mat) && (state.era==="all" || d.era===state.era) &&
        (state.conf==="all" || d.conf===state.conf) && (!state.q || d.search.includes(state.q));
      el.hidden = !ok; if (ok) n++;
      const g = document.querySelector(`#tl g.m[data-id="${CSS.escape(el.dataset.id)}"]`); if (g) g.classList.toggle("dim", !ok);
    });
    document.getElementById("count").textContent = `Showing ${n} of ${items.length}`;
    let empty = document.getElementById("empty");
    if (!n && !empty){ empty = document.createElement("p"); empty.id="empty"; empty.className="empty"; empty.textContent="No manuscripts match these filters. Clear the search or choose “All”."; list.appendChild(empty); }
    if (n && empty) empty.remove();
  }
  function resetFilters(){
    state.mat=state.era=state.conf="all"; state.q="";
    document.getElementById("q").value="";
    document.querySelectorAll(".chip").forEach(c=>c.setAttribute("aria-pressed", c.dataset.v==="all"?"true":"false"));
    applyFilters();
  }
  function jump(id){
    const el = document.getElementById("ms-"+id);
    if (!el) return;
    if (el.hidden) resetFilters();
    el.scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block:"start"});
    el.classList.add("flash"); setTimeout(()=>el.classList.remove("flash"), 1400);
  }

  document.querySelectorAll(".chip").forEach(btn=>btn.addEventListener("click", ()=>{
    const f = btn.dataset.f;
    state[f] = btn.dataset.v;
    document.querySelectorAll(`.chip[data-f="${f}"]`).forEach(c=>c.setAttribute("aria-pressed", c===btn?"true":"false"));
    applyFilters();
  }));
  document.getElementById("q").addEventListener("input", e=>{ state.q = e.target.value.trim().toLowerCase(); applyFilters(); });
  document.querySelectorAll("#tl g.m").forEach(g=>{
    const go = ()=>jump(g.dataset.id);
    g.addEventListener("click", go);
    g.addEventListener("keydown", e=>{ if(e.key==="Enter"||e.key===" "){e.preventDefault();go();} });
  });
  applyFilters();
})();
