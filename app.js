(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = n => n.toLocaleString("en-US");
  const PK_ORDER = ["std", "kitchen", "showcase", "sponsor"];
  const ST_CLASS = { open: "s-open", res: "s-res", conf: "s-conf" };
  const ST_COLOR = { open: "#2FA57C", res: "#E3A02F", conf: "#8E969D" };
  const IMG = {
    cityA: ["img-city-a.jpg", "img-venue-a.jpg"], cityB: ["img-city-b.jpg", "img-venue-b.jpg"],
    tiles: [["img-food.jpg", "img-venue-a.jpg"], ["img-kbeauty.jpg", "img-beauty.jpg"], ["img-kculture.jpg", "img-dance.jpg"]],
    prog: [["img-pg-battle.jpg", "img-dance.jpg"], ["img-pg-stage.jpg", "img-stage.jpg"], ["img-pg-photo.jpg", "img-photobooth.jpg"], ["img-hanbok.jpg", "img-beauty.jpg"]],
    pk: { std: ["img-pk-std.jpg", "img-venue-a.jpg"], kitchen: ["img-pk-kitchen.jpg", "img-food.jpg"], showcase: ["img-pk-showcase.jpg", "img-beauty.jpg"] },
    sponsor: ["img-sponsor.jpg", "img-dance.jpg"],
    visit: [["img-visit-a.jpg", "img-hero.jpg"], ["img-visit-b.jpg", "img-venue-b.jpg"]],
    sup: [["img-sup-logistics.jpg", "img-venue-a.jpg"], ["img-sup-pay.jpg", "img-food.jpg"], ["img-b2b.jpg", "img-beauty.jpg"]]
  };
  const MAPLINK = [
    { amap: "https://uri.amap.com/search?keyword=" + encodeURIComponent("夏南洋·骑楼烟火食集") + "&city=460100", baidu: "https://map.baidu.com/search/" + encodeURIComponent("海口 夏南洋骑楼烟火食集"), google: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("海口 骑楼老街 长堤路34号") },
    { amap: "https://uri.amap.com/search?keyword=" + encodeURIComponent("神州半岛") + "&city=469006", baidu: "https://map.baidu.com/search/" + encodeURIComponent("万宁 神州半岛"), google: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Shenzhou Peninsula Wanning Hainan") }
  ];

  const state = { lang: "ko", venue: "A", sel: null, filter: null, step: 0, faq: 0, openPk: {} };
  try {
    const saved = localStorage.getItem("hk-lang");
    if (saved && T[saved]) state.lang = saved;
    else { const nl = (navigator.language || "ko").slice(0, 2); if (T[nl]) state.lang = nl; }
  } catch (e) {}

  const t = () => T[state.lang];
  const altL = () => (state.lang === "zh" ? "ko" : "zh");
  const A = () => T[altL()];
  const alt = txt => `<span class="alt">${esc(txt)}</span>`;
  const br = s => esc(s).replace(/\n/g, "<br>");
  const img = (pair, cls = "", eager = false) => `<img class="${cls}" src="${pair[0]}" alt="" ${eager ? "" : 'loading="lazy"'} onerror="if(!this.dataset.f){this.dataset.f=1;this.src='${pair[1]}'}">`;

  /* ---------- sections ---------- */
  function renderStatic() {
    const L = t(), Al = A();
    document.documentElement.lang = state.lang;
    document.title = L.html_title;
    $$("[data-t]").forEach(el => { const v = L[el.dataset.t]; if (typeof v === "string") el.textContent = v; });
    $$("[data-tt]").forEach(el => { const k = el.dataset.tt; el.innerHTML = br(L[k]) + alt(String(Al[k] || "").replace(/\n/g, " ")); });
    $$("[data-th]").forEach(el => { const k = el.dataset.th; el.innerHTML = L[k].replace(/\n/g, "<br>") + alt(Al[k].replace(/<[^>]+>/g, "").replace(/\n/g, " ")); });
    $$("[data-tf]").forEach(el => { el.textContent = L.f[el.dataset.tf]; });
    $$("[data-t-alt]").forEach(el => { el.textContent = Al[el.dataset.tAlt] || ""; });
    $$("[data-nav2]").forEach(el => { el.textContent = L.nav2[+el.dataset.nav2]; });
    $$("[data-mnav]").forEach(el => { el.textContent = L.mnav[+el.dataset.mnav]; });
    $$("[data-step-title]").forEach(el => { const i = +el.dataset.stepTitle; el.innerHTML = `<b class="num">0${i + 1}</b> ${esc(L.steps[i])}<small>${esc(Al.steps[i])}</small>`; });
    $$(".langs button").forEach(b => b.setAttribute("aria-pressed", b.dataset.lang === state.lang));
    $("#f-products").placeholder = L.f.products_ph;

    // two cities
    $("#city-grid").innerHTML = ["A", "B"].map(k => {
      const c = L["city" + k], ca = Al["city" + k], v = L["venue" + k];
      return `<article class="city">
        ${img(IMG["city" + k], "city-img")}
        <div class="city-body">
          <p class="city-days"><b class="num">${c.days}</b><span>${L.days}</span></p>
          <h3><span class="num">${c.city}</span><small>${esc(c.local)}</small></h3>
          <p class="city-dates num">${esc(c.dates)}</p>
          <p class="city-tag">${esc(c.tag)}<span>${esc(ca.tag)}</span></p>
          <ul class="city-facts">${c.facts.map(f => `<li>${esc(f)}</li>`).join("")}</ul>
          <div class="city-cta"><a class="btn btn-light" href="#visit">${esc(L.city_more)}</a><a class="link-arrow light" href="#map" data-goto="${k}"><span>${esc(L.city_3d)}</span><i aria-hidden="true"></i></a></div>
        </div>
      </article>`;
    }).join("");

    // experience tiles
    $("#tiles").innerHTML = L.tiles.map((x, i) => `<a class="tile" href="#map" data-filter="${["kfood", "beauty", "exp"][i]}">
      ${img(IMG.tiles[i])}
      <div class="tile-cap"><b class="num">${x[0]}</b><h3>${esc(x[1])}<span>${esc(Al.tiles[i][1])}</span></h3><p>${esc(x[2])}</p></div></a>`).join("");

    // map legend/tabs/filter
    $("#legend").innerHTML = ["open", "res", "conf"].map(s => `<span><i style="background:${ST_COLOR[s]}"></i>${esc(L.st[s])}</span>`).join("");
    $("#tab-A").innerHTML = `${esc(L.tabA[0])}<small>${L.tabA[1]}</small>`;
    $("#tab-B").innerHTML = `${esc(L.tabB[0])}<small>${L.tabB[1]}</small>`;
    renderFilter();
    $("#map-views").innerHTML = L.views.map((v, i) => `<button type="button" data-view="${["all", "gate", "stage", "booths", "dining"][i]}">${esc(v)}</button>`).join("");

    // program — asymmetric
    $("#programs").innerHTML = L.prog.map((p, i) => `<article class="pg pg-${i}">
      <div class="im">${img(IMG.prog[i])}${i === 0 ? `<span class="pg-badge">${esc(L.prog_badge)}</span>` : ""}</div>
      <div class="tx"><h3>${esc(p[0])}${alt(Al.prog[i][0])}</h3><p>${esc(p[1])}</p></div></article>`).join("");

    // visitor guide
    $("#visit-grid").innerHTML = ["A", "B"].map((k, i) => {
      const c = L["city" + k], rows = L["visit" + k], m = MAPLINK[i];
      return `<article class="vg">
        <div class="vg-img">${img(IMG.visit[i])}<span class="vg-tag num">${c.city} · ${esc(c.local)}</span></div>
        <dl>${L.visit_rows.map((r, j) => `<dt>${esc(r)}</dt><dd>${esc(rows[j])}</dd>`).join("")}</dl>
        <div class="vg-maps"><span>${esc(L.map_open)}</span><a href="${m.amap}" target="_blank" rel="noopener">高德地图</a><a href="${m.baidu}" target="_blank" rel="noopener">百度地图</a><a href="${m.google}" target="_blank" rel="noopener">Google Maps</a></div>
      </article>`;
    }).join("");

    // exhibitor steps
    $("#exh-steps").innerHTML = L.exh_steps.map((s, i) => `<li><span class="num">${s[0]}</span><b>${esc(s[1])}<small>${esc(Al.exh_steps[i][1])}</small></b><em>${esc(s[2])}</em><p>${esc(s[3])}</p></li>`).join("");

    // packages (3) + sponsor band
    $("#packages").innerHTML = ["std", "kitchen", "showcase"].map(k => {
      const p = L.pk[k], P = PKG[k], open = !!state.openPk[k];
      return `<article class="pk ${k === "kitchen" ? "hot" : ""}">
        <div class="pk-img">${img(IMG.pk[k])}${k === "kitchen" ? `<span class="badge">${esc(L.popular)}</span>` : ""}</div>
        <div class="pk-body">
          <span class="en">${p.en}</span>
          <h3>${esc(p.name)}${alt(A().pk[k].name)}</h3>
          <span class="for">${esc(p.for)}</span>
          <div class="pr"><b class="num">₩${fmt(P.price)}</b><span>${esc(p.unit)}</span></div>
          <button type="button" class="pk-toggle" data-pk="${k}" aria-expanded="${open}">${esc(open ? L.pk_less : L.pk_more)}</button>
          <ul ${open ? "" : "hidden"}>${p.items.map(i => `<li>${esc(i)}</li>`).join("")}</ul>
          <a class="btn ${k === "kitchen" ? "btn-red" : "btn-dark"}" href="#apply" data-pick="${k}">${esc(L.pk_pick)}</a>
        </div></article>`;
    }).join("");
    const sp = L.pk.sponsor;
    $("#sponsor").innerHTML = `<div class="sp-img">${img(IMG.sponsor)}</div>
      <div class="sp-body"><span class="en">SPONSOR</span><h3>${esc(L.sponsor_title)}${alt(A().sponsor_title)}</h3><p>${esc(L.sponsor_text)}</p>
      <ul>${sp.items.map(i => `<li>${esc(i)}</li>`).join("")}</ul>
      <div class="pr"><b class="num">₩${fmt(PKG.sponsor.price)}</b><span>${esc(sp.unit)}</span></div>
      <a class="btn btn-light" href="#apply" data-pick="sponsor">${esc(L.pk_pick)}</a></div>`;

    // options grouped
    $("#addons").innerHTML = L.opt_groups.map(g => `<div class="opt-g"><h4>${esc(g[0])}</h4><table class="tbl">${g[1].map(i => `<tr><td>${esc(L.addons[i][0])}</td><td>${esc(L.addons[i][1])}</td></tr>`).join("")}</table></div>`).join("");
    $("#terms").innerHTML = L.terms.map(x => `<li>${esc(x)}</li>`).join("");
    $("#cats").innerHTML = L.cats.map(c => `<div class="cat"><b>${esc(c[0])}</b><span>${esc(c[1])}</span></div>`).join("");

    // support: 3 photo stories + 6 detail rows
    $("#support").innerHTML = `<div class="sup-photos">${L.exh_steps.map((s, i) => `<figure>${img(IMG.sup[i])}<figcaption><span class="num">${s[0]}</span>${esc(s[2])}</figcaption></figure>`).join("")}</div>
      <div class="sup-rows">${L.support.map(s => `<div class="sup"><b>${esc(s[0])}</b><p>${esc(s[1])}</p></div>`).join("")}</div>`;

    renderTimeline();
    renderStepper();
    renderFaq();

    // footer
    const link = (href, txt) => `<a href="${href}">${esc(txt)}</a>`;
    $("#ftr-cols").innerHTML = `
      <div><h4>${esc(L.ft_cols[0])}</h4>${["#cities", "#experience", "#map", "#visit"].map((h, i) => link(h, L.ft_links_event[i])).join("")}</div>
      <div><h4>${esc(L.ft_cols[1])}</h4>${["#join", "#apply", "#faq"].map((h, i) => link(h, L.ft_links_join[i])).join("")}</div>
      <div><h4>${esc(L.ft_cols[2])}</h4>${L.ft.map(f => `<p><small>${esc(f[0])}</small>${esc(f[1])}</p>`).join("")}</div>`;
  }

  function renderFilter() {
    const L = t(), keys = ["kfood", "drink", "mealkit", "beauty", "goods", "exp"];
    $("#map-filter").innerHTML = `<button type="button" class="chip-f" data-filter="" aria-pressed="${!state.filter}">ALL</button>` +
      keys.map(k => `<button type="button" class="chip-f" data-filter="${k}" aria-pressed="${state.filter === k}">${esc(ZONES[k][state.lang])}</button>`).join("");
  }

  /* timeline on a true calendar scale (Nov 16 → Jan 24) */
  function renderTimeline() {
    const L = t(), Al = A();
    const t0 = Date.UTC(2026, 10, 10), t1 = Date.UTC(2027, 0, 31), pos = d => ((d - t0) / (t1 - t0) * 100).toFixed(2);
    const dates = [Date.UTC(2026, 10, 16), Date.UTC(2026, 11, 5), Date.UTC(2026, 11, 10), Date.UTC(2026, 11, 22), Date.UTC(2026, 11, 24), Date.UTC(2026, 11, 30), Date.UTC(2027, 0, 24)];
    const months = [[Date.UTC(2026, 10, 10), L.sched_months[0]], [Date.UTC(2026, 11, 1), L.sched_months[1]], [Date.UTC(2027, 0, 1), L.sched_months[2]]];
    const runA = [pos(Date.UTC(2026, 11, 24)), pos(Date.UTC(2026, 11, 30))], runB = [pos(Date.UTC(2026, 11, 30)), pos(Date.UTC(2027, 0, 25))];
    $("#timeline").innerHTML = `
      <div class="tl-axis">
        ${months.map(m => `<span class="tl-month" style="left:${pos(m[0])}%">${esc(m[1])}</span>`).join("")}
        <span class="tl-run a" style="left:${runA[0]}%;width:${runA[1] - runA[0]}%"><b>HAIKOU</b></span>
        <span class="tl-run b" style="left:${runB[0]}%;width:${runB[1] - runB[0]}%"><b>WANNING</b></span>
        ${dates.map((d, i) => `<span class="tl-dot ${[4, 5, 6].includes(i) ? "key" : ""}" style="left:${pos(d)}%"></span>`).join("")}
      </div>
      <ol class="tl-list">${L.sched.map((s, i) => `<li class="${[4, 5].includes(i) ? "key" : ""}" style="--x:${pos(dates[i])}%"><b class="num">${s[0]}</b><span>${esc(s[1])}<small>${esc(Al.sched[i][1])}</small></span></li>`).join("")}</ol>`;
  }

  function renderFaq() {
    const L = t(), Al = A();
    $("#faq-tabs").innerHTML = L.faq_tabs.map((x, i) => `<button type="button" role="tab" data-faq="${i}" aria-selected="${state.faq === i}">${esc(x)}<small>${esc(Al.faq_tabs[i])}</small></button>`).join("");
    const list = state.faq === 0 ? L.faq : L.faq_v, alist = state.faq === 0 ? Al.faq : Al.faq_v;
    $("#faq-list").innerHTML = list.map((q, i) => `<details><summary><span>${esc(q[0])}${alt(alist[i][0])}</span></summary><p>${esc(q[1])}</p></details>`).join("");
  }

  /* ---------- 3D side panel ---------- */
  const boothsOf = v => BOOTHS[v];
  function findBooth(id) { for (const v of ["A", "B"]) { const b = BOOTHS[v].find(x => x.id === id); if (b) return { b, v }; } return null; }
  function renderMapPanel() {
    const L = t(), list = boothsOf(state.venue);
    $$(".tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.venue === state.venue));
    const open = list.filter(b => b.st === "open").length;
    $("#map-count").innerHTML = L.map_count.replace("{open}", open).replace("{total}", list.length) + (state.venue === "B" ? `<br><span class="draft">${esc(L.draftB)}</span>` : "");
    $("#booth-list").innerHTML = list.map(b => `<button type="button" class="bitem ${state.filter && b.zone !== state.filter ? "dim" : ""}" data-booth="${b.id}" aria-current="${state.sel === b.id}">
      <span class="no">${b.id}</span><span class="nm">${esc(b.name[state.lang])}<small>${esc(b.name[altL()])}</small></span><span class="dot" style="background:${ST_COLOR[b.st]}" title="${esc(L.st[b.st])}"></span></button>`).join("");
    renderCard();
  }
  function menuHtml(id) {
    if (!window.MENU) return "";
    const items = MENU.items(id); if (!items.length) return "";
    const lg = state.lang, al = altL();
    return `<div class="menu"><p class="menu-h">${esc(MENU.title[lg])}<span>${esc(MENU.title[al])}</span></p>
      <ul>${items.map(it => { const src = MENU.img[it.sheet + ":" + it.cell];
        return `<li>${src ? `<img src="${src}" alt="">` : `<i class="ph"></i>`}<span class="mn">${esc(it.name(lg))}<small>${esc(it.name(al))}</small></span><b>¥${it.price}</b></li>`; }).join("")}</ul>
      <p class="menu-note">${esc(MENU.note[lg])}</p></div>`;
  }
  function renderCard() {
    const L = t(), el = $("#booth-card");
    const hit = state.sel && findBooth(state.sel);
    if (!hit || hit.v !== state.venue) { el.innerHTML = `<div class="card-empty">${esc(L.card.hint)}</div>`; return; }
    const b = hit.b, p = L.pk[b.pkg];
    el.innerHTML = `<div class="card">
      <div class="card-head"><span class="card-no" style="background:${ST_COLOR[b.st]}">${b.id}</span>
        <div style="display:grid;gap:4px;min-width:0"><h3>${esc(b.name[state.lang])}${alt(b.name[altL()])}</h3><span class="status ${ST_CLASS[b.st]}">${esc(L.st[b.st])}</span></div></div>
      ${menuHtml(b.id)}
      <details class="card-more"><summary>${esc(L.walk_exhibitor)}</summary>
      <dl class="kv"><dt>${esc(L.card.zone)}</dt><dd>${esc(ZONES[b.zone][state.lang])}</dd><dt>${esc(L.card.size)}</dt><dd class="num">${L.size_booth}</dd><dt>${esc(L.card.pkg)}</dt><dd>${esc(p.name)} · ${esc(p.for)}</dd><dt>${esc(L.card.price)}</dt><dd class="num">₩${fmt(PKG[b.pkg].price)}</dd></dl>
      ${b.st !== "conf" ? `<a class="btn btn-dark" href="#apply" data-apply-booth="${b.id}">${esc(L.card.apply)}</a>` : `<button type="button" class="btn btn-line" data-next-open>${esc(L.card.other)}</button>`}
      </details></div>`;
  }
  if (window.MENU) MENU.onReady(() => renderCard());
  function select(id, fromMap) {
    state.sel = id; renderMapPanel();
    if (!fromMap && window.Map3D) window.Map3D.focus(id);
    const cur = $(`.bitem[data-booth="${id}"]`); if (cur) cur.scrollIntoView({ block: "nearest" });
  }
  function setVenue(v) {
    if (state.venue === v) return;
    state.venue = v; state.sel = null; renderMapPanel();
    if (window.Map3D) { window.Map3D.setVenue(v); window.Map3D.setFilter && window.Map3D.setFilter(state.filter); }
  }
  function setFilter(f) {
    state.filter = f || null; renderFilter(); renderMapPanel();
    window.Map3D && window.Map3D.setFilter && window.Map3D.setFilter(state.filter);
  }

  /* ---------- apply wizard ---------- */
  function renderStepper() {
    const L = t();
    $("#stepper").innerHTML = L.steps.map((s, i) => `<li class="${i === state.step ? "on" : i < state.step ? "done" : ""}"><span class="num">0${i + 1}</span>${esc(s)}</li>`).join("");
    $("#pkg-pick").innerHTML = PK_ORDER.map(k => `<button type="button" class="pp ${$("#f-pkg").value === k ? "on" : ""}" data-pp="${k}">
      <span class="en">${L.pk[k].en}</span><b>${esc(L.pk[k].name)}</b><small>${esc(A().pk[k].name)}</small><em class="num">₩${fmt(PKG[k].price)}</em><i>${esc(L.pk[k].for)}</i></button>`).join("");
    $$(".step").forEach(f => { f.hidden = +f.dataset.step !== state.step; });
    $("#step-prev").hidden = state.step === 0;
    $("#step-next").hidden = state.step === 3;
    $("#step-submit").hidden = state.step !== 3;
    if (state.step === 3) renderReview();
  }
  function stepValid(i) {
    const L = t(), err = $("#form-err"); err.textContent = "";
    if (i === 2) {
      let bad = false;
      ["#f-company", "#f-person", "#f-phone", "#f-products"].forEach(s => { const el = $(s), miss = !el.value.trim(); el.classList.toggle("invalid", miss); if (miss) bad = true; });
      if (bad) { err.textContent = L.err_req; return false; }
    }
    return true;
  }
  function goStep(n) {
    if (n > state.step && !stepValid(state.step)) return;
    state.step = Math.max(0, Math.min(3, n)); renderStepper();
    const top = $("#stepper").getBoundingClientRect().top + scrollY - 90;
    if (Math.abs(scrollY - top) > 200) scrollTo({ top, behavior: "smooth" });
  }
  function renderReview() {
    const L = t(), F = L.f, r = calc();
    const rows = [[F.pkg, L.pk[$("#f-pkg").value].name], [F.venue, $("#f-venue").selectedOptions[0]?.textContent], [F.booth, $("#f-booth").selectedOptions[0]?.textContent], [F.people, $("#f-people").value],
      [F.company, $("#f-company").value], [F.person, $("#f-person").value], [F.phone, $("#f-phone").value], [F.cat, $("#f-cat").selectedOptions[0]?.textContent], [F.products, $("#f-products").value],
      [L.est.total, `₩${fmt(r.total)} (${L.est.deposit} ₩${fmt(r.deposit)})`]];
    $("#review").innerHTML = rows.map(x => `<dt>${esc(x[0])}</dt><dd>${esc(x[1] || "—")}</dd>`).join("");
  }
  function fillSelects(keep) {
    const L = t(), cat = $("#f-cat"), ven = $("#f-venue"), pkg = $("#f-pkg");
    const k = keep || { cat: cat.value, venue: ven.value || "A", pkg: pkg.value || "std", booth: $("#f-booth").value };
    cat.innerHTML = L.cats.map((c, i) => `<option value="${i}">${esc(c[0])}</option>`).join("");
    ven.innerHTML = ["A", "B", "AB"].map((v, i) => `<option value="${v}">${esc(L.f.venues[i])}</option>`).join("");
    pkg.innerHTML = PK_ORDER.map(p => `<option value="${p}">${esc(L.pk[p].name)}</option>`).join("");
    if (k.cat) cat.value = k.cat;
    ven.value = k.venue; pkg.value = k.pkg;
    fillBooths(k.booth);
  }
  function fillBooths(keepBooth) {
    const L = t(), v = $("#f-venue").value, vs = v === "AB" ? ["A", "B"] : [v];
    let html = `<option value="">${esc(L.f.booth_any)}</option>`;
    vs.forEach(vv => BOOTHS[vv].filter(b => b.st !== "conf").forEach(b => { html += `<option value="${b.id}">${b.id} · ${esc(b.name[state.lang])} (${esc(L.st[b.st])})</option>`; }));
    const sel = $("#f-booth"); sel.innerHTML = html;
    if (keepBooth && sel.querySelector(`option[value="${keepBooth}"]`)) sel.value = keepBooth;
  }
  function calc() {
    const pk = $("#f-pkg").value, P = PKG[pk], both = $("#f-venue").value === "AB", peopleIn = $("#f-people");
    if (pk === "showcase") { peopleIn.value = 0; peopleIn.disabled = true; } else { peopleIn.disabled = false; if (+peopleIn.value < 1) peopleIn.value = Math.max(1, P.incl); }
    const people = Math.max(0, Math.min(10, parseInt(peopleIn.value, 10) || 0));
    const r = { base: P.price, venue: both ? P.venueExtra : 0, people: Math.max(0, people - P.incl) * FEE.extraPerson, extraN: Math.max(0, people - P.incl), log: $("#f-log").checked ? FEE.logistics : 0, inf: $("#f-inf").checked ? FEE.influencer : 0 };
    r.total = r.base + r.venue + r.people + r.log + r.inf; r.deposit = Math.round(r.total / 2);
    return r;
  }
  function renderEst() {
    const L = t(), E = L.est, r = calc(), w = L.won;
    const row = (label, val, show) => show ? `<div class="row"><span>${esc(label)}</span><b>${fmt(val)} ${esc(w)}</b></div>` : "";
    $("#est").innerHTML = `<h3>${esc(E.title)}</h3><div class="rows">
        ${row(E.base + " · " + L.pk[$("#f-pkg").value].name, r.base, true)}${row(E.venue, r.venue, r.venue > 0)}${row(E.people + (r.extraN ? ` ×${r.extraN}` : ""), r.people, r.people > 0)}${row(E.log, r.log, r.log > 0)}${row(E.inf, r.inf, r.inf > 0)}
      </div><div class="total"><span>${esc(E.total)}</span><b class="num">₩${fmt(r.total)}</b></div>
      <div class="dep"><span>${esc(E.deposit)}</span><b>${fmt(r.deposit)} ${esc(w)}</b></div><small>${esc(E.note)}</small>`;
    $$(".pp").forEach(b => b.classList.toggle("on", b.dataset.pp === $("#f-pkg").value));
  }
  function submit(e) {
    e.preventDefault();
    const L = t(), err = $("#form-err");
    if (!stepValid(2)) { goStep(2); return; }
    if (!$("#f-agree").checked) { err.textContent = L.err_agree; return; }
    err.textContent = "";
    const r = calc(), F = L.f, E = L.est;
    const no = "HK-" + new Date().toISOString().slice(2, 10).replace(/-/g, "") + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    const lines = [`[HAINAN K-CARNIVAL 2026–2027] ${L.apply_title} · ${no}`, `${F.company}: ${$("#f-company").value.trim()}`, `${F.person}: ${$("#f-person").value.trim()}`, `${F.phone}: ${$("#f-phone").value.trim()}`,
      $("#f-msg").value.trim() && `${F.msg}: ${$("#f-msg").value.trim()}`, $("#f-email").value.trim() && `${F.email}: ${$("#f-email").value.trim()}`,
      `${F.cat}: ${$("#f-cat").selectedOptions[0].textContent}`, `${F.venue}: ${$("#f-venue").selectedOptions[0].textContent}`, `${F.pkg}: ${L.pk[$("#f-pkg").value].name}`, `${F.booth}: ${$("#f-booth").selectedOptions[0].textContent}`,
      `${F.people}: ${$("#f-people").value}${L.person_unit}`, ($("#f-log").checked || $("#f-inf").checked) && `${F.addon}: ${[$("#f-log").checked && F.log, $("#f-inf").checked && F.inf].filter(Boolean).join(", ")}`,
      `${F.products}: ${$("#f-products").value.trim()}`, $("#f-memo").value.trim() && `${F.memo}: ${$("#f-memo").value.trim()}`, `${E.total}: ${fmt(r.total)} ${L.won} (${E.deposit} ${fmt(r.deposit)} ${L.won})`].filter(Boolean);
    $("#done-text").value = lines.join("\n");
    $("#done").hidden = false; $("#done").scrollIntoView({ behavior: "smooth", block: "center" });
  }
  async function copyDone() {
    const ta = $("#done-text"), btn = $("#btn-copy");
    try { await navigator.clipboard.writeText(ta.value); } catch (e) { ta.focus(); ta.select(); try { document.execCommand("copy"); } catch (e2) {} }
    btn.textContent = t().copied; setTimeout(() => { btn.textContent = t().copy; }, 1800);
  }
  function applyBooth(id) {
    const hit = findBooth(id); if (!hit) return;
    $("#f-venue").value = hit.v; fillBooths(hit.b.id);
    $("#f-pkg").value = hit.b.pkg; renderEst();
    $("#f-cat").value = String({ kfood: 0, mealkit: 1, beauty: 2, goods: 3, exp: 4, drink: 5 }[hit.b.zone]);
    state.step = 1; renderStepper();
  }

  /* ---------- language ---------- */
  function setLang(l) {
    if (!T[l]) return;
    const keep = { cat: $("#f-cat").value, venue: $("#f-venue").value || "A", pkg: $("#f-pkg").value || "std", booth: $("#f-booth").value };
    state.lang = l;
    try { localStorage.setItem("hk-lang", l); } catch (e) {}
    fillSelects(keep); renderStatic(); renderEst(); renderMapPanel(); observeReveal();
    if (window.Map3D) window.Map3D.setLang(l);
  }

  /* ---------- events ---------- */
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-lang]"); if (a) return setLang(a.dataset.lang);
    const tab = e.target.closest("[data-venue]"); if (tab) return setVenue(tab.dataset.venue);
    const bi = e.target.closest("[data-booth]"); if (bi) return select(bi.dataset.booth);
    const go = e.target.closest("[data-goto]"); if (go) { setVenue(go.dataset.goto); return; }
    const fl = e.target.closest("[data-filter]"); if (fl) { setFilter(fl.dataset.filter); if (fl.classList.contains("chip-f")) e.preventDefault(); return; }
    const pk = e.target.closest("[data-pk]"); if (pk) { state.openPk[pk.dataset.pk] = !state.openPk[pk.dataset.pk]; renderStatic(); return; }
    const pick = e.target.closest("[data-pick]"); if (pick) { $("#f-pkg").value = pick.dataset.pick; renderEst(); state.step = 1; renderStepper(); return; }
    const pp = e.target.closest("[data-pp]"); if (pp) { $("#f-pkg").value = pp.dataset.pp; renderEst(); return; }
    const vw = e.target.closest("[data-view]"); if (vw) { $$("#map-views button").forEach(b => b.classList.toggle("on", b === vw)); window.Map3D && window.Map3D.view && window.Map3D.view(vw.dataset.view); return; }
    const fq = e.target.closest("[data-faq]"); if (fq) { state.faq = +fq.dataset.faq; renderFaq(); return; }
    const ab = e.target.closest("[data-apply-booth]"); if (ab) { applyBooth(ab.dataset.applyBooth); return; }
    if (e.target.closest("[data-next-open]")) { const nb = boothsOf(state.venue).find(b => b.st === "open"); if (nb) select(nb.id); return; }
    if (e.target.closest(".nav a")) { $("#nav").classList.remove("open"); $("#menu-btn").setAttribute("aria-expanded", "false"); }
  });
  $("#menu-btn").addEventListener("click", () => { const o = $("#nav").classList.toggle("open"); $("#menu-btn").setAttribute("aria-expanded", o); });
  $("#btn-reset").addEventListener("click", () => { state.sel = null; renderMapPanel(); window.Map3D && window.Map3D.reset(); });
  $("#btn-rotate").addEventListener("click", e => { const on = e.currentTarget.getAttribute("aria-pressed") !== "true"; e.currentTarget.setAttribute("aria-pressed", on); window.Map3D && window.Map3D.setRotate(on); });
  $("#f-venue").addEventListener("change", () => { fillBooths(); renderEst(); });
  ["#f-pkg", "#f-people", "#f-log", "#f-inf"].forEach(s => $(s).addEventListener("input", renderEst));
  $("#step-next").addEventListener("click", () => goStep(state.step + 1));
  $("#step-prev").addEventListener("click", () => goStep(state.step - 1));
  $("#form").addEventListener("submit", submit);
  $("#btn-copy").addEventListener("click", copyDone);
  $("#btn-edit").addEventListener("click", () => { $("#done").hidden = true; goStep(2); });

  /* header over the hero, solid after */
  const onScroll = () => { document.body.classList.toggle("at-top", scrollY < 40); };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* hero film (desktop / fast connections only) + soundtrack */
  const vid = $("#hero-video"), bgm = $("#bgm"), snd = $("#sound");
  const slow = navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ""));
  if (vid && matchMedia("(min-width: 761px)").matches && !slow && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    vid.src = vid.dataset.src; vid.preload = "auto";
    vid.addEventListener("playing", () => vid.classList.add("on"));
    vid.play().catch(() => {});
  }
  if (snd && bgm) {
    bgm.volume = 0.55;
    snd.addEventListener("click", () => {
      if (snd.getAttribute("aria-pressed") === "true") { bgm.pause(); snd.setAttribute("aria-pressed", "false"); }
      else bgm.play().then(() => snd.setAttribute("aria-pressed", "true")).catch(() => {});
    });
  }

  /* gentle reveal — content stays visible if observers never fire */
  let io = null;
  function observeReveal() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    io && io.disconnect();
    io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { rootMargin: "0px 0px -8% 0px" });
    $$(".city, .tile, .pg, .pk, .vg, .exh-steps li, .sup-photos figure, .exp-collage figure").forEach(el => { if (el.getBoundingClientRect().top > innerHeight) { el.classList.add("rv"); io.observe(el); } });
  }

  window.App = { get state() { return state; }, select: id => select(id, true), clearSel: () => { state.sel = null; renderMapPanel(); } };

  fillSelects(); renderStatic(); renderEst(); renderMapPanel(); observeReveal();
  try {
    const qb = new URLSearchParams(location.search).get("booth");
    if (qb && findBooth(qb)) { applyBooth(qb); setTimeout(() => $("#apply").scrollIntoView({ behavior: "smooth" }), 400); }
  } catch (e) {}
})();
