(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = n => n.toLocaleString("en-US");
  const PK_ORDER = ["std", "kitchen", "showcase", "sponsor"];
  const ST_CLASS = { open: "s-open", res: "s-res", conf: "s-conf" };
  const ST_COLOR = { open: "#34BFAC", res: "#F2B84B", conf: "#8C97A0" };
  const IMG = { A: "img-venue-a.jpg", B: "img-venue-b.jpg", prog: ["img-dance.jpg", "img-stage.jpg", "img-photobooth.jpg", "img-beauty.jpg"] };

  const state = { lang: "ko", venue: "A", sel: null };
  try {
    const saved = localStorage.getItem("hk-lang");
    if (saved && T[saved]) state.lang = saved;
    else {
      const nl = (navigator.language || "ko").slice(0, 2);
      if (T[nl]) state.lang = nl;
    }
  } catch (e) {}

  const t = () => T[state.lang];
  const altL = () => (state.lang === "zh" ? "ko" : "zh");
  const A = () => T[altL()];
  const alt = txt => `<span class="alt">${esc(txt)}</span>`;

  function imgTag(src, cls) {
    return `<img class="fade-img ${cls || ""}" src="${src}" alt="" loading="lazy" onload="this.classList.add('ok')" onerror="this.remove()">`;
  }

  /* ---------- static sections ---------- */
  function renderStatic() {
    const L = t();
    document.documentElement.lang = state.lang;
    document.title = L.html_title;
    $$("[data-t]").forEach(el => { const v = L[el.dataset.t]; if (typeof v === "string") el.textContent = v; });
    $$("[data-th]").forEach(el => { el.innerHTML = L[el.dataset.th] + alt(A()[el.dataset.th].replace(/<[^>]+>/g, "").replace(/\n/g, " ")); });
    $$(".sec-head h2[data-t]").forEach(el => { el.innerHTML = esc(L[el.dataset.t]) + alt(A()[el.dataset.t]); });
    $$("[data-tf]").forEach(el => { el.textContent = L.f[el.dataset.tf]; });
    $$("[data-nav]").forEach(el => { el.textContent = L.nav[+el.dataset.nav]; });
    $$(".langs button").forEach(b => b.setAttribute("aria-pressed", b.dataset.lang === state.lang));
    $("#f-products").placeholder = L.f.products_ph;

    $("#stats").innerHTML = L.stats.map(s => `<div class="stat"><b>${esc(s[0])}</b><span>${esc(s[1])}</span></div>`).join("");
    $("#pillars").innerHTML = L.pillars.map(p => `<div class="pillar"><span class="tag">${p[0]}</span><p>${esc(p[1])}</p></div>`).join("");

    $("#venue-cards").innerHTML = ["A", "B"].map(k => {
      const v = L["venue" + k];
      return `<article class="venue">
        <div class="venue-img">${imgTag(IMG[k])}<span class="vtag">${v.tag}</span></div>
        <div class="venue-body">
          <span class="when">${esc(v.when)}</span>
          <h3>${esc(v.name)}${alt(A()["venue" + k].name)}</h3>
          <p>${esc(v.desc)}</p>
          <div class="chips">${v.tags.map(x => `<span class="chip">${esc(x)}</span>`).join("")}</div>
          <dl class="facts">${v.facts.map(f => `<dt>${esc(f[0])}</dt><dd>${esc(f[1])}</dd>`).join("")}</dl>
          <div class="btns"><a class="btn btn-ghost" href="#map" data-goto="${k}" style="padding:10px 18px;font-size:14px">${esc(L.cta_map)}</a></div>
        </div></article>`;
    }).join("");

    $("#legend").innerHTML = ["open", "res", "conf"].map(s => `<span><i style="background:${ST_COLOR[s]}"></i>${esc(L.st[s])}</span>`).join("");
    $("#tab-A").innerHTML = `${esc(L.tabA[0])}<small>${L.tabA[1]}</small>`;
    $("#tab-B").innerHTML = `${esc(L.tabB[0])}<small>${L.tabB[1]}</small>`;

    $("#packages").innerHTML = PK_ORDER.map(k => {
      const p = L.pk[k], P = PKG[k];
      const price = k === "sponsor" ? fmt(P.price) : fmt(P.price);
      return `<article class="pk ${k === "kitchen" ? "hot" : ""}">
        ${k === "kitchen" ? `<span class="badge">${esc(L.popular)}</span>` : ""}
        <span class="en">${p.en}</span>
        <h3>${esc(p.name)}${alt(A().pk[k].name)}</h3>
        <span class="for">${esc(p.for)}</span>
        <div class="pr"><b>${price}</b><span>${esc(p.unit)}</span></div>
        <ul>${p.items.map(i => `<li>${esc(i)}</li>`).join("")}</ul>
        <a class="btn ${k === "kitchen" ? "btn-red" : "btn-ghost"}" href="#apply" data-pick="${k}">${esc(L.pk_pick)}</a>
      </article>`;
    }).join("");
    $("#addons").innerHTML = L.addons.map(a => `<tr><td>${esc(a[0])}</td><td>${esc(a[1])}</td></tr>`).join("");
    $("#terms").innerHTML = L.terms.map(x => `<li>${esc(x)}</li>`).join("");
    $("#cats").innerHTML = L.cats.map(c => `<div class="cat"><b>${esc(c[0])}</b><span>${esc(c[1])}</span></div>`).join("");
    $("#support").innerHTML = L.support.map(s => `<div class="sup"><b>${esc(s[0])}</b><p>${esc(s[1])}</p></div>`).join("");
    $("#timeline").innerHTML = L.sched.map((s, i) => `<li class="${[4, 5].includes(i) ? "key" : ""}"><b>${s[0]}</b><span>${esc(s[1])}</span></li>`).join("");
    $("#programs").innerHTML = L.prog.map((p, i) => `<article class="pg"><div class="im">${imgTag(IMG.prog[i])}</div><div class="tx"><h3>${esc(p[0])}${alt(A().prog[i][0])}</h3><p>${esc(p[1])}</p></div></article>`).join("");
    $("#faq-list").innerHTML = L.faq.map(q => `<details><summary><span>${esc(q[0])}${alt(A().faq[T[state.lang].faq.indexOf(q)][0])}</span></summary><p>${esc(q[1])}</p></details>`).join("");
    $("#ft").innerHTML = L.ft.map(f => `<div><dt>${esc(f[0])}</dt><dd>${esc(f[1])}</dd></div>`).join("");
  }

  /* ---------- map side panel ---------- */
  function boothsOf(v) { return BOOTHS[v]; }
  function findBooth(id) {
    for (const v of ["A", "B"]) { const b = BOOTHS[v].find(x => x.id === id); if (b) return { b, v }; }
    return null;
  }
  function renderMapPanel() {
    const L = t(), list = boothsOf(state.venue);
    $$(".tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.venue === state.venue));
    const open = list.filter(b => b.st === "open").length;
    $("#map-count").innerHTML = L.map_count.replace("{open}", open).replace("{total}", list.length) + (state.venue === "B" ? `<br><span style="color:var(--gold)">${esc(L.draftB)}</span>` : "");
    $("#booth-list").innerHTML = list.map(b => `<button type="button" class="bitem" data-booth="${b.id}" aria-current="${state.sel === b.id}">
      <span class="no">${b.id}</span><span class="nm">${esc(b.name[state.lang])}<small>${esc(b.name[altL()])}</small></span><span class="dot" style="background:${ST_COLOR[b.st]}" title="${esc(L.st[b.st])}"></span></button>`).join("");
    renderCard();
  }
  function renderCard() {
    const L = t(), el = $("#booth-card");
    const hit = state.sel && findBooth(state.sel);
    if (!hit || hit.v !== state.venue) { el.innerHTML = `<div class="card-empty">${esc(L.card.hint)}</div>`; return; }
    const b = hit.b, p = L.pk[b.pkg];
    const canApply = b.st !== "conf";
    el.innerHTML = `<div class="card">
      <div class="card-head"><span class="card-no" style="background:${ST_COLOR[b.st]}">${b.id}</span>
        <div style="display:grid;gap:4px;min-width:0"><h3>${esc(b.name[state.lang])}${alt(b.name[altL()])}</h3><span class="status ${ST_CLASS[b.st]}">${esc(L.st[b.st])}</span></div></div>
      <dl class="kv">
        <dt>${esc(L.card.zone)}</dt><dd>${esc(ZONES[b.zone][state.lang])}</dd>
        <dt>${esc(L.card.size)}</dt><dd class="num">${L.size_booth}</dd>
        <dt>${esc(L.card.pkg)}</dt><dd>${esc(p.name)} · ${esc(p.for)}</dd>
      </dl>
      <div><div style="font-size:12px;color:var(--muted)">${esc(L.card.price)}</div><div class="price">${fmt(PKG[b.pkg].price)} <span style="font-size:14px;color:var(--muted)">${esc(p.unit)}</span></div></div>
      ${canApply ? `<a class="btn btn-red" href="#apply" data-apply-booth="${b.id}">${esc(L.card.apply)}</a>` : `<button type="button" class="btn btn-ghost" data-next-open>${esc(L.card.other)}</button>`}
    </div>`;
  }

  function select(id, fromMap) {
    state.sel = id;
    renderMapPanel();
    if (!fromMap && window.Map3D) window.Map3D.focus(id);
    const cur = $(`.bitem[data-booth="${id}"]`);
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: "nearest" });
  }
  function setVenue(v) {
    if (state.venue === v) return;
    state.venue = v; state.sel = null;
    renderMapPanel();
    if (window.Map3D) window.Map3D.setVenue(v);
  }

  /* ---------- form ---------- */
  function fillSelects(keep) {
    const L = t();
    const cat = $("#f-cat"), ven = $("#f-venue"), pkg = $("#f-pkg");
    const k = keep || { cat: cat.value, venue: ven.value || "A", pkg: pkg.value || "std", booth: $("#f-booth").value };
    cat.innerHTML = L.cats.map((c, i) => `<option value="${i}">${esc(c[0])}</option>`).join("");
    ven.innerHTML = ["A", "B", "AB"].map((v, i) => `<option value="${v}">${esc(L.f.venues[i])}</option>`).join("");
    pkg.innerHTML = PK_ORDER.map(p => `<option value="${p}">${esc(L.pk[p].name)} — ${fmt(PKG[p].price)} ${esc(L.won)}</option>`).join("");
    if (k.cat) cat.value = k.cat;
    ven.value = k.venue; pkg.value = k.pkg;
    fillBooths(k.booth);
  }
  function fillBooths(keepBooth) {
    const L = t(), v = $("#f-venue").value;
    const vs = v === "AB" ? ["A", "B"] : [v];
    let html = `<option value="">${esc(L.f.booth_any)}</option>`;
    vs.forEach(vv => BOOTHS[vv].filter(b => b.st !== "conf").forEach(b => {
      html += `<option value="${b.id}">${b.id} · ${esc(b.name[state.lang])} (${esc(L.st[b.st])})</option>`;
    }));
    const sel = $("#f-booth");
    sel.innerHTML = html;
    if (keepBooth && sel.querySelector(`option[value="${keepBooth}"]`)) sel.value = keepBooth;
  }
  function calc() {
    const pk = $("#f-pkg").value, P = PKG[pk];
    const both = $("#f-venue").value === "AB";
    const peopleIn = $("#f-people");
    if (pk === "showcase") { peopleIn.value = 0; peopleIn.disabled = true; } else { peopleIn.disabled = false; if (+peopleIn.value < 1) peopleIn.value = Math.max(1, P.incl); }
    const people = Math.max(0, Math.min(10, parseInt(peopleIn.value, 10) || 0));
    const r = {
      base: P.price,
      venue: both ? P.venueExtra : 0,
      people: Math.max(0, people - P.incl) * FEE.extraPerson,
      extraN: Math.max(0, people - P.incl),
      log: $("#f-log").checked ? FEE.logistics : 0,
      inf: $("#f-inf").checked ? FEE.influencer : 0
    };
    r.total = r.base + r.venue + r.people + r.log + r.inf;
    r.deposit = Math.round(r.total / 2);
    return r;
  }
  function renderEst() {
    const L = t(), E = L.est, r = calc(), w = L.won;
    const row = (label, val, show) => show ? `<div class="row"><span>${esc(label)}</span><b>${fmt(val)} ${esc(w)}</b></div>` : "";
    $("#est").innerHTML = `<h3>${esc(E.title)}</h3>
      <div class="rows">
        ${row(E.base + " · " + L.pk[$("#f-pkg").value].name, r.base, true)}
        ${row(E.venue, r.venue, r.venue > 0)}
        ${row(E.people + (r.extraN ? ` ×${r.extraN}` : ""), r.people, r.people > 0)}
        ${row(E.log, r.log, r.log > 0)}
        ${row(E.inf, r.inf, r.inf > 0)}
      </div>
      <div class="total"><span>${esc(E.total)}</span><b>${fmt(r.total)}</b></div>
      <div class="dep"><span>${esc(E.deposit)}</span><b>${fmt(r.deposit)} ${esc(w)}</b></div>
      <small>${esc(E.note)}</small>`;
  }
  function submit(e) {
    e.preventDefault();
    const L = t(), err = $("#form-err");
    let bad = false;
    ["#f-company", "#f-person", "#f-phone", "#f-products"].forEach(s => {
      const el = $(s), miss = !el.value.trim();
      el.classList.toggle("invalid", miss);
      if (miss) bad = true;
    });
    if (bad) { err.textContent = L.err_req; return; }
    if (!$("#f-agree").checked) { err.textContent = L.err_agree; return; }
    err.textContent = "";
    const r = calc(), F = L.f, E = L.est;
    const venueTxt = $("#f-venue").selectedOptions[0].textContent;
    const boothTxt = $("#f-booth").selectedOptions[0].textContent;
    const no = "HK-" + new Date().toISOString().slice(2, 10).replace(/-/g, "") + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    const lines = [
      `[HAINAN K-CARNIVAL 2026–2027] ${L.apply_title} · ${no}`,
      `${F.company}: ${$("#f-company").value.trim()}`,
      `${F.person}: ${$("#f-person").value.trim()}`,
      `${F.phone}: ${$("#f-phone").value.trim()}`,
      $("#f-msg").value.trim() && `${F.msg}: ${$("#f-msg").value.trim()}`,
      $("#f-email").value.trim() && `${F.email}: ${$("#f-email").value.trim()}`,
      `${F.cat}: ${$("#f-cat").selectedOptions[0].textContent}`,
      `${F.venue}: ${venueTxt}`,
      `${F.pkg}: ${L.pk[$("#f-pkg").value].name}`,
      `${F.booth}: ${boothTxt}`,
      `${F.people}: ${$("#f-people").value}${L.person_unit}`,
      ($("#f-log").checked || $("#f-inf").checked) && `${F.addon}: ${[$("#f-log").checked && F.log, $("#f-inf").checked && F.inf].filter(Boolean).join(", ")}`,
      `${F.products}: ${$("#f-products").value.trim()}`,
      $("#f-memo").value.trim() && `${F.memo}: ${$("#f-memo").value.trim()}`,
      `${E.total}: ${fmt(r.total)} ${L.won} (${E.deposit} ${fmt(r.deposit)} ${L.won})`
    ].filter(Boolean);
    $("#done-text").value = lines.join("\n");
    $("#done").hidden = false;
    $("#done").scrollIntoView({ behavior: "smooth", block: "center" });
  }
  async function copyDone() {
    const ta = $("#done-text"), btn = $("#btn-copy");
    try { await navigator.clipboard.writeText(ta.value); }
    catch (e) { ta.focus(); ta.select(); try { document.execCommand("copy"); } catch (e2) {} }
    btn.textContent = t().copied;
    setTimeout(() => { btn.textContent = t().copy; }, 1800);
  }

  /* ---------- language ---------- */
  function setLang(l) {
    if (!T[l]) return;
    const keep = { cat: $("#f-cat").value, venue: $("#f-venue").value || "A", pkg: $("#f-pkg").value || "std", booth: $("#f-booth").value };
    state.lang = l;
    try { localStorage.setItem("hk-lang", l); } catch (e) {}
    renderStatic(); fillSelects(keep); renderEst(); renderMapPanel();
    if (window.Map3D) window.Map3D.setLang(l);
  }

  /* ---------- events ---------- */
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-lang]"); if (a) return setLang(a.dataset.lang);
    const tab = e.target.closest("[data-venue]"); if (tab) return setVenue(tab.dataset.venue);
    const bi = e.target.closest("[data-booth]"); if (bi) return select(bi.dataset.booth);
    const go = e.target.closest("[data-goto]"); if (go) { setVenue(go.dataset.goto); return; }
    const pick = e.target.closest("[data-pick]"); if (pick) { $("#f-pkg").value = pick.dataset.pick; calc(); renderEst(); return; }
    const ab = e.target.closest("[data-apply-booth]");
    if (ab) {
      const hit = findBooth(ab.dataset.applyBooth);
      $("#f-venue").value = hit.v; fillBooths(hit.b.id);
      $("#f-pkg").value = hit.b.pkg; renderEst();
      const ci = { kfood: 0, mealkit: 1, beauty: 2, goods: 3, exp: 4, drink: 5 }[hit.b.zone];
      $("#f-cat").value = String(ci);
      return;
    }
    if (e.target.closest("[data-next-open]")) {
      const nb = boothsOf(state.venue).find(b => b.st === "open"); if (nb) select(nb.id); return;
    }
    if (e.target.closest(".nav a")) { $("#nav").classList.remove("open"); $("#menu-btn").setAttribute("aria-expanded", "false"); }
  });
  $("#menu-btn").addEventListener("click", () => {
    const o = $("#nav").classList.toggle("open");
    $("#menu-btn").setAttribute("aria-expanded", o);
  });
  $("#btn-reset").addEventListener("click", () => { state.sel = null; renderMapPanel(); window.Map3D && window.Map3D.reset(); });
  $("#btn-rotate").addEventListener("click", e => {
    const on = e.currentTarget.getAttribute("aria-pressed") !== "true";
    e.currentTarget.setAttribute("aria-pressed", on);
    window.Map3D && window.Map3D.setRotate(on);
  });
  $("#f-venue").addEventListener("change", () => { fillBooths(); renderEst(); });
  ["#f-pkg", "#f-people", "#f-log", "#f-inf"].forEach(s => $(s).addEventListener("input", renderEst));
  $("#f-pkg").addEventListener("change", renderEst);
  $("#form").addEventListener("submit", submit);
  $("#btn-copy").addEventListener("click", copyDone);
  $("#btn-edit").addEventListener("click", () => { $("#done").hidden = true; $("#f-company").focus(); });
  $(".hero-img img").addEventListener("load", function () { this.classList.add("ok"); });
  $(".hero-img img").addEventListener("error", function () { this.remove(); });
  if ($(".hero-img img") && $(".hero-img img").complete && $(".hero-img img").naturalWidth) $(".hero-img img").classList.add("ok");

  /* public API for the 3D module */
  window.App = {
    get state() { return state; },
    select: id => select(id, true),
    clearSel: () => { state.sel = null; renderMapPanel(); }
  };

  renderStatic(); fillSelects(); renderEst(); renderMapPanel();
})();
