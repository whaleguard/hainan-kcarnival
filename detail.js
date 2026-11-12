(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = n => n.toLocaleString("en-US");
  const PAGE = window.PAGE;
  const ST_COLOR = { open: "#2FA57C", res: "#E3A02F", conf: "#8E969D" };
  const ORDER = ["haikou", "wanning", "kfood", "kbeauty", "battle", "stage", "photozone", "hanbok", "playzone", "guide", "exhibitor", "pk-std", "pk-kitchen", "pk-showcase", "sponsor"];
  const MAPLINK = [
    { amap: "https://uri.amap.com/search?keyword=" + encodeURIComponent("夏南洋·骑楼烟火食集") + "&city=460100", baidu: "https://map.baidu.com/search/" + encodeURIComponent("海口 夏南洋骑楼烟火食集"), google: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("海口 骑楼老街 长堤路34号") },
    { amap: "https://uri.amap.com/search?keyword=" + encodeURIComponent("神州半岛") + "&city=469006", baidu: "https://map.baidu.com/search/" + encodeURIComponent("万宁 神州半岛"), google: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Shenzhou Peninsula Wanning Hainan") }
  ];

  let lang = "zh";
  try {
    const ql = new URLSearchParams(location.search).get("lang"), saved = localStorage.getItem("hk-lang2");
    if (ql && T[ql]) lang = ql; else if (saved && T[saved]) lang = saved;
  } catch (e) {}

  const D = l => (window.DETAILS[l] && window.DETAILS[l][PAGE]) ? window.DETAILS[l] : window.DETAILS.ko;
  const altL = () => (lang === "zh" ? "ko" : "zh");
  const alt = s => s ? `<span class="alt">${esc(s)}</span>` : "";
  const img = (src, cls = "") => `<img class="${cls}" src="${src}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`;

  function boothsHtml(sec, L) {
    let list = [];
    ["A", "B"].forEach(v => BOOTHS[v].forEach(b => { if ((sec.venue ? v === sec.venue : true) && (sec.zone ? b.zone === sec.zone : true)) list.push(b); }));
    if (!list.length) return "";
    const al = altL();
    return `<div class="dt-booths">${list.map(b => {
      const items = window.MENU ? MENU.items(b.id) : [];
      return `<article class="dt-booth">
        <header><span class="no" style="background:${ST_COLOR[b.st]}">${b.id}</span><div><h4>${esc(b.name[lang])}<small>${esc(b.name[al])}</small></h4><span class="st" style="color:${ST_COLOR[b.st]}">${esc(L.st[b.st])} · ${esc(ZONES[b.zone][lang])}</span></div></header>
        ${items.length ? `<ul>${items.map(it => { const src = MENU.img[it.sheet + ":" + it.cell]; return `<li>${src ? `<img src="${src}" alt="">` : `<i></i>`}<span>${esc(it.name(lang))}<small>${esc(it.name(al))}</small></span><b>¥${it.price}</b></li>`; }).join("")}</ul>` : ""}
      </article>`;
    }).join("")}</div><p class="dt-note">${esc(MENU ? MENU.note[lang] : "")}</p>`;
  }

  function sectionHtml(sec, i, L, U) {
    const id = "s" + i, h = sec.h ? `<h2 id="${id}">${esc(sec.h)}</h2>` : "";
    let body = "";
    switch (sec.type) {
      case "text": body = sec.p.map(p => `<p>${esc(p)}</p>`).join(""); break;
      case "list": {
        const items = sec.src ? L[sec.src] : sec.items;
        body = `<ul class="dt-list">${items.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`; break;
      }
      case "facts": body = `<dl class="dt-facts">${sec.rows.map(r => `<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`).join("")}</dl>` +
        (sec.maps !== undefined ? `<div class="vg-maps"><span>${esc(L.map_open)}</span><a href="${MAPLINK[sec.maps].amap}" target="_blank" rel="noopener">高德地图</a><a href="${MAPLINK[sec.maps].baidu}" target="_blank" rel="noopener">百度地图</a><a href="${MAPLINK[sec.maps].google}" target="_blank" rel="noopener">Google Maps</a></div>` : ""); break;
      case "steps": body = `<ol class="dt-steps">${sec.items.map((s, k) => `<li><span class="num">${String(k + 1).padStart(2, "0")}</span><b>${esc(s[0])}</b><p>${esc(s[1])}</p></li>`).join("")}</ol>`; break;
      case "layout": body = `<div class="dt-layout"><figure>${img(sec.img)}</figure><dl class="dt-facts">${sec.items.map(r => `<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`).join("")}</dl></div>${sec.note ? `<p class="dt-note">${esc(sec.note)}</p>` : ""}`; break;
      case "booths": body = boothsHtml(sec, L); break;
      case "gallery": body = `<div class="dt-gallery g${sec.imgs.length}">${sec.imgs.map(s => `<figure>${img(s)}</figure>`).join("")}</div><p class="dt-note">${esc(U.note_img)}</p>`; break;
      case "faq": body = `<div class="faq">${L[sec.src].map(q => `<details><summary><span>${esc(q[0])}</span></summary><p>${esc(q[1])}</p></details>`).join("")}</div>`; break;
      case "table": body = `<table class="tbl dt-table"><thead><tr>${sec.head.map(x => `<th>${esc(x)}</th>`).join("")}</tr></thead><tbody>${sec.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>${sec.note ? `<p class="dt-note">${esc(sec.note)}</p>` : ""}`; break;
      case "addons": body = `<table class="tbl">${L.addons.map(a => `<tr><td>${esc(a[0])}</td><td>${esc(a[1])}</td></tr>`).join("")}</table>`; break;
      case "support": body = `<div class="sup-rows">${L.support.map(s => `<div class="sup"><b>${esc(s[0])}</b><p>${esc(s[1])}</p></div>`).join("")}</div>`; break;
      case "timeline": body = `<ol class="dt-steps dt-time">${L.sched.map(s => `<li><span class="num">${esc(s[0])}</span><b>${esc(s[1])}</b></li>`).join("")}</ol>`; break;
      case "pkgitems": {
        const d = D(lang)[PAGE], k = d.pk, p = L.pk[k];
        body = `<div class="dt-pkg"><div class="pr"><b class="num">₩${fmt(PKG[k].price)}</b><span>${esc(p.unit)}</span></div><p class="for">${esc(p.for)}</p><ul class="dt-list">${p.items.map(x => `<li>${esc(x)}</li>`).join("")}</ul><a class="btn btn-red" href="index.html?pkg=${k}#apply">${esc(L.pk_pick)}</a></div>`; break;
      }
    }
    return `<section class="dt-sec">${h}${body}</section>`;
  }

  function render() {
    const L = T[lang], DD = D(lang), d = DD[PAGE], U = DD._ui, A = D(altL())[PAGE];
    document.documentElement.lang = lang;
    document.title = `${d.title} · ${L.html_title.split("·")[0].trim()}`;
    $$("[data-nav2]").forEach(el => { el.textContent = L.nav2[+el.dataset.nav2]; });
    $$("[data-mnav]").forEach(el => { el.textContent = L.mnav[+el.dataset.mnav]; });
    $$("[data-t]").forEach(el => { const v = L[el.dataset.t]; if (typeof v === "string") el.textContent = v; });
    $$(".langs button").forEach(b => b.setAttribute("aria-pressed", b.dataset.lang === lang));

    const ctas = [];
    if (d.walk) ctas.push(`<a class="btn btn-light" href="walk.html?venue=${d.walk}&lang=${lang}" target="_blank" rel="noopener">${esc(U.walk)}</a>`);
    if (d.group === "exhibitor") ctas.push(`<a class="btn ${d.walk ? "btn-line light" : "btn-light"}" href="index.html${d.pk ? "?pkg=" + d.pk : ""}#apply">${esc(U.apply)}</a>`);
    ctas.push(`<a class="link-arrow light" href="index.html"><span>${esc(U.back)}</span><i aria-hidden="true"></i></a>`);

    $("#dt").innerHTML = `
      <section class="dt-hero">
        <img class="dt-hero-img" src="${d.hero}" alt="" fetchpriority="high">
        <div class="dt-hero-shade"></div>
        <div class="wrap dt-hero-in">
          <nav class="dt-crumb"><a href="index.html">${esc(U.home)}</a><span>/</span><span>${esc(d.group === "exhibitor" ? U.exhibitor : U.visitor)}</span></nav>
          <p class="hero-meta">${esc(d.kicker)}</p>
          <h1>${esc(d.title)}${alt(A && A.title !== d.title ? A.title : "")}</h1>
          <p class="dt-lead">${esc(d.lead)}</p>
          <div class="hero-cta">${ctas.join("")}</div>
        </div>
      </section>
      ${d.facts ? `<section class="dt-factbar"><div class="wrap"><dl>${d.facts.map(f => `<div><dt>${esc(f[0])}</dt><dd>${esc(f[1])}</dd></div>`).join("")}</dl></div></section>` : ""}
      <div class="wrap dt-body">
        <aside class="dt-toc"><p>${esc(U.contents)}</p>${d.sections.map((s, i) => s.h ? `<a href="#s${i}">${esc(s.h)}</a>` : "").join("")}</aside>
        <div class="dt-main">${d.sections.map((s, i) => sectionHtml(s, i, L, U)).join("")}</div>
      </div>
      <section class="dt-related"><div class="wrap">
        <div class="sec-head"><span class="eyebrow">MORE</span><div><h2>${esc(U.related)}</h2></div></div>
        <div class="dt-rel">${d.related.map(r => { const x = DD[r] || window.DETAILS.ko[r]; return `<a class="dt-card" href="${r}.html"><figure>${img(x.hero)}</figure><span class="k">${esc(x.kicker)}</span><b>${esc(x.title)}</b></a>`; }).join("")}</div>
      </div></section>`;
    $("#ft-note").textContent = L.ft_note;
  }

  document.addEventListener("click", e => {
    const b = e.target.closest("[data-lang]");
    if (b) { lang = b.dataset.lang; try { localStorage.setItem("hk-lang2", lang); } catch (er) {} render(); }
    if (e.target.closest(".nav a")) $("#nav").classList.remove("open");
  });
  $("#menu-btn").addEventListener("click", () => { const o = $("#nav").classList.toggle("open"); $("#menu-btn").setAttribute("aria-expanded", o); });
  const onScroll = () => document.body.classList.toggle("at-top", scrollY < 40);
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  render();
  if (window.MENU) MENU.onReady(render);
})();
