/* ==========================================================================
   pages.js — page components (map, encyclopaedia, media, sessions,
   notebook, quiz, video library, offline animations)
   ========================================================================== */
(function (W) {
  "use strict";
  const D = W.DATA, VL = W.VL;
  const esc = VL.esc, el = VL.el, $ = VL.$, $$ = VL.$$;
  const PAGES = {};

  /* ======================================================== lab map */
  const STATION_COLORS = ["#0e7490", "#7c3aed", "#b45309", "#0369a1", "#0f766e", "#be123c", "#1d4ed8", "#6d28d9", "#0f172a", "#7c2d12", "#065f46", "#92400e", "#334155"];
  PAGES.labMap = function (mapEl, listEl) {
    if (!mapEl) return;
    let s = '<svg viewBox="0 0 1000 580" xmlns="http://www.w3.org/2000/svg" aria-label="خريطة المعمل">';
    s += '<defs><pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">' +
      '<path d="M28 0H0V28" fill="none" stroke="rgba(255,255,255,.045)" stroke-width="1"/></pattern>' +
      '<linearGradient id="roomg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c141d"/><stop offset="1" stop-color="#070d14"/></linearGradient>' +
      '<filter id="soft"><feGaussianBlur stdDeviation="9"/></filter></defs>';
    s += '<rect width="1000" height="580" fill="url(#roomg)"/><rect width="1000" height="580" fill="url(#grid)"/>';
    s += '<rect x="8" y="8" width="984" height="564" rx="16" fill="none" stroke="rgba(34,211,238,.22)" stroke-width="1.5"/>';
    // door + windows + sink decorations
    s += '<g opacity=".55">' +
      '<rect x="470" y="566" width="80" height="10" rx="4" fill="#22d3ee" opacity=".35"/><text x="510" y="558" fill="#67e8f9" font-size="11" text-anchor="middle">المدخل</text>' +
      '<rect x="60" y="4" width="90" height="6" rx="3" fill="#7dd3fc" opacity=".35"/><rect x="180" y="4" width="90" height="6" rx="3" fill="#7dd3fc" opacity=".35"/>' +
      '<rect x="820" y="4" width="120" height="6" rx="3" fill="#7dd3fc" opacity=".35"/></g>';
    D.SPOTS.forEach((sp, i) => {
      const c = STATION_COLORS[i % STATION_COLORS.length];
      s += '<g class="st" data-href="' + sp.href + '" tabindex="0" role="link" aria-label="' + esc(sp.t) + '">' +
        '<rect class="stg" x="' + sp.x + '" y="' + sp.y + '" width="' + sp.w + '" height="' + sp.h + '" rx="14" fill="' + c + '" fill-opacity=".34" stroke="' + c + '" stroke-opacity=".85" stroke-width="1.4"/>' +
        '<circle cx="' + (sp.x + 20) + '" cy="' + (sp.y + 20) + '" r="12" fill="#04121a" stroke="' + c + '"/>' +
        '<text x="' + (sp.x + 20) + '" y="' + (sp.y + 25) + '" font-size="12" fill="#e2f6ff" text-anchor="middle">' + sp.n + "</text>" +
        '<text x="' + (sp.x + 40) + '" y="' + (sp.y + 25) + '" font-size="13" font-weight="700" fill="#eaf6ff">' + esc(sp.icon + " " + sp.t) + "</text>";
      const words = sp.d.split(" ");
      let line = "", ly = sp.y + 46, maxChars = Math.floor(sp.w / 6.2);
      words.forEach(w => {
        if ((line + " " + w).length > maxChars) { s += '<text x="' + (sp.x + 14) + '" y="' + ly + '" font-size="10.5" fill="#9fb3c6">' + esc(line.trim()) + "</text>"; line = w; ly += 14; }
        else line += " " + w;
      });
      if (line.trim()) s += '<text x="' + (sp.x + 14) + '" y="' + ly + '" font-size="10.5" fill="#9fb3c6">' + esc(line.trim()) + "</text>";
      s += "</g>";
    });
    s += '<text x="976" y="30" font-size="11" fill="#475569" text-anchor="end">خريطة معمل ميكروبيولوجيا الغذاء — انقر على أي محطة</text>';
    s += "</svg>";
    mapEl.innerHTML = s;
    mapEl.querySelectorAll(".st").forEach(g => {
      const go = () => location.href = g.getAttribute("data-href");
      g.addEventListener("click", go);
      g.addEventListener("keydown", e => { if (e.key === "Enter") go(); });
    });
    if (listEl) {
      listEl.innerHTML = D.SPOTS.map(sp => {
        const mod = { 1: "safety", 2: "bench", 3: "media", 5: "dilution", 6: "gram", 7: "microscope", 8: "instruments", 9: "instruments", 10: "safety", 12: "curriculum" }[sp.n];
        const done = mod && VL.store.getModule(mod) >= 100;
        return '<a class="stlink' + (done ? " done" : "") + '" href="' + sp.href + '"><b>' + sp.icon + " " + sp.t + "</b><span>" + sp.d + "</span></a>";
      }).join("");
    }
  };

  /* ======================================================== progress */
  PAGES.progress = function (box) {
    if (!box) return;
    const MODULES = [
      { id: "microscope", t: "المجهر الافتراضي", h: "microscope.html" },
      { id: "gram", t: "صبغة جرام", h: "gram.html" },
      { id: "bench", t: "الزرع والتقنيات المعقّمة", h: "bench.html" },
      { id: "dilution", t: "التخفيف والعدّ وحساب CFU", h: "dilution.html" },
      { id: "media", t: "الأوساط وقراءة الأطباق", h: "media.html" },
      { id: "instruments", t: "الأجهزة (أوتوكلاف/حاضنة/PCR)", h: "instruments.html" },
      { id: "safety", t: "السلامة المخبرية", h: "safety.html" }
    ];
    box.innerHTML = MODULES.map(m => {
      const p = VL.store.getModule(m.id);
      return '<div class="mb"><div class="between"><a href="' + m.h + '">' + m.t + "</a><span class=\"small " + (p >= 100 ? "" : "muted") + "\">" + p + "%</span></div>" +
        '<div class="prog"><i style="width:' + p + '%"></i></div></div>';
    }).join("") +
      '<div class="mt row"><a class="btn sm" href="quiz.html">📝 اختبارات</a><a class="btn sm ghost" href="curriculum.html">📚 الجلسات</a>' +
      '<button class="btn sm ghost" id="resetAll">♻ تصفير تقدّمي</button></div>';
    const b = $("#resetAll", box);
    if (b) b.onclick = () => { if (confirm("سيتم حذف كل التقدم والملاحظات والنتائج. هل أنت متأكد؟")) { localStorage.clear(); location.reload(); } };
  };

  /* ======================================================== quick cards */
  PAGES.quickCards = function (box) {
    if (!box) return;
    box.innerHTML = D.QUICK.map(q => '<a class="card hov" href="' + q.h + '" style="text-decoration:none;color:inherit"><h3><span class="ic">' + q.i + "</span> " + q.t + "</h3><p class=\"small muted\">" + q.d + "</p></a>").join("");
  };

  /* ======================================================== video cards */
  PAGES.videoCards = function (box, opts) {
    if (!box) return;
    opts = opts || {};
    let list = D.VIDEOS.slice();
    if (opts.tags) list = list.filter(v => v.tags.some(t => opts.tags.indexOf(t) >= 0));
    if (opts.lang) list = list.filter(v => v.lang === opts.lang);
    if (opts.featured) list = list.filter(v => ["مجهر", "جرام", "زرع", "تخفيف"].indexOf(v.tags[0]) >= 0);
    list = VL.shuffle(list).slice(0, opts.n || 6);
    box.innerHTML = "";
    list.forEach(v => box.appendChild(videoCard(v)));
  };
  function videoCard(v) {
    const c = el("div", { class: "vcard" });
    c.innerHTML =
      '<div class="vthumb" style="background-image:linear-gradient(135deg,#0b1220,#132030)">' +
      '<img src="https://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.85" onerror="this.style.display=\'none\'">' +
      '<span class="play">▶</span>' +
      '<span class="badge ' + (v.lang === "ar" ? "g" : "c") + '" style="position:absolute;top:8px;inset-inline-start:8px">' + (v.lang === "ar" ? "عربي" : "English") + "</span>" +
      '<span class="badge" style="position:absolute;top:8px;inset-inline-end:8px">🌐 يوتيوب</span></div>' +
      '<div class="vmeta"><b>' + esc(v.t) + '</b><span class="src">' + esc(v.ch) + "</span>" +
      '<p class="tiny muted" style="margin:4px 0 0">' + esc(v.note || "") + "</p>" +
      '<div class="vtags">' + v.tags.slice(0, 3).map(t => '<span class="pill">#' + esc(t) + "</span>").join("") + "</div></div>";
    const th = $(".vthumb", c);
    th.addEventListener("click", () => {
      th.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + v.id + '?rel=0&autoplay=1" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen title="' + esc(v.t) + '"></iframe>';
      VL.store.addXP(3, "مشاهدة فيديو عملي");
    });
    return c;
  }

  /* ======================================================== size chart */
  PAGES.sizeChart = function (box) {
    if (!box) return;
    const MIN = Math.log10(0.01), MAX = Math.log10(300);
    const pos = um => ((Math.log10(um) - MIN) / (MAX - MIN)) * 100;
    const ticks = [0.01, 0.1, 1, 10, 100];
    let s = '<div style="position:relative;padding:26px 0 6px;direction:ltr">';
    s += '<div style="position:absolute;inset-inline:0;top:26px;bottom:34px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.015)"></div>';
    ticks.forEach(t => {
      s += '<div style="position:absolute;inset-inline-start:' + pos(t) + '%;top:0;transform:translateX(50%);font-size:.68rem;color:var(--tx3)">' +
        (t < 1 ? t * 1000 + " nm" : t + " µm") + "</div>";
      s += '<div style="position:absolute;inset-inline-start:' + pos(t) + '%;top:26px;bottom:30px;width:1px;background:rgba(255,255,255,.08)"></div>';
    });
    D.SIZES.forEach((it, i) => {
      const a = pos(it.um[0]), b = pos(it.um[1]);
      s += '<div style="position:relative;height:30px">' +
        '<div title="' + esc(it.n) + " (" + it.um[0] + "–" + it.um[1] + ' µm)" style="position:absolute;inset-inline-start:' + a + '%;width:' + Math.max(1.2, b - a) + '%;top:8px;height:15px;border-radius:99px;background:linear-gradient(90deg,' + it.c + '88,' + it.c + ');box-shadow:0 0 12px ' + it.c + '44"></div>' +
        '<div style="position:absolute;inset-inline-start:0;bottom:-2px;font-size:.76rem;color:var(--tx2)">' + esc(it.n) + ' <span class="dim tiny">' + esc(it.note) + "</span></div></div>";
    });
    s += "</div>";
    s += '<div class="legend mt small"><span><i style="background:#a78bfa"></i>بكتيريا</span><span><i style="background:#a3e635"></i>فطريات/خمائر</span><span><i style="background:#67e8f9"></i>طفيليات</span><span><i style="background:#94a3b8"></i>فيروسات (EM)</span><span><i style="background:#fcd34d"></i>مكوّنات الغذاء</span></div>';
    box.innerHTML = s;
  };

  /* ======================================================== quiz widget */
  PAGES.quizWidget = function (box, topic, n, opts) {
    if (!box) return;
    const bank = (topic === "all" || !topic) ? Object.keys(D.Q).reduce((a, k) => a.concat(D.Q[k]), []) : (D.Q[topic] || []);
    const qs = VL.shuffle(bank).slice(0, n || 6);
    box.innerHTML = '<p class="small muted">' + (opts && opts.title ? opts.title : "أسئلة مختارة من بنك الاختبارات — تصحّح فورًا مع شرح لكل إجابة.") + "</p><div id='qbody'></div>";
    VL.renderQuiz($("#qbody", box), qs, {
      onDone(correct, total, pct) {
        VL.store.addXP(Math.round(pct / 4) + correct, "اختبار " + (topic || "عام"));
        if (pct === 100) VL.store.addBadge("perfect-" + (topic || "general"), "علامة كاملة في " + (topic || "الاختبار"));
      }
    });
  };

  /* ======================================================== pathogen encyclopaedia */
  PAGES.pathogens = function (gridBox, filterBox) {
    if (!gridBox) return;
    const TP = { bact: "بكتيريا", virus: "فيروسات", fungi: "فطريات وخمائر", para: "طفيليات", prio: "بريونات" };
    let cur = "all", term = "";
    const render = () => {
      const list = D.PATHOGENS.filter(p => (cur === "all" || p.tp === cur) &&
        (!term || (p.n + p.sci + (p.source || "") + (p.disease || "")).toLowerCase().indexOf(term.toLowerCase()) >= 0));
      gridBox.innerHTML = list.map(p => {
        const col = p.tp === "bact" ? (p.gram === "+" ? "#a78bfa" : "#f472b6") : p.tp === "virus" ? "#94a3b8" : p.tp === "fungi" ? "#a3e635" : p.tp === "para" ? "#67e8f9" : "#fbbf24";
        return '<article class="mcard" data-id="' + p.id + '">' +
          '<div class="figure">' + W.MB.svg(p.fig, p.gram === "+" ? { color: "#6d28d9", color2: "#c4b5fd" } : p.gram === "-" ? { color: "#be185d", color2: "#fbcfe8" } : {}) + "</div>" +
          "<b>" + esc(p.n) + "</b><span class=\"lat\">" + esc(p.sci) + "</span>" +
          '<span class="meta">' + (p.size ? esc(p.size.split(" ").slice(0, 5).join(" ")) : "") + "</span>" +
          '<div class="row" style="gap:6px"><span class="badge" style="border-color:' + col + "66;color:" + col + '">' + TP[p.tp] + (p.gram ? " · جرام " + p.gram : "") + "</span>" +
          (p.limit ? '<span class="badge">حدّ: ' + esc(p.limit.split("(")[0].split("؛")[0].slice(0, 26)) + "</span>" : "") + "</div></article>";
      }).join("") || '<p class="muted">لا نتائج مطابقة.</p>';
      $$(".mcard", gridBox).forEach(c => c.onclick = () => showPathogen(c.getAttribute("data-id")));
    };
    function showPathogen(id) {
      const p = D.PATHOGENS.find(x => x.id === id); if (!p) return;
      const rows = [["الاسم العلمي", p.sci], ["التصنيف", TP[p.tp] + (p.gram ? " · جرام " + p.gram : "")], ["الحجم/الشكل", p.size],
        ["الحركة", p.motile], ["المصادر الغذائية", p.source], ["المرض/الخطر", p.disease], ["جرعة الإصابة", p.dose],
        ["الظروف وظروف النمو", p.growth], ["المكافحة والوقاية", p.control], ["طرق الكشف المخبري", p.detect], ["الحدود المرجعية", p.limit]]
        .filter(r => r[1]);
      VL.UI.modal('<span class="badge c">' + TP[p.tp] + '</span> ' + esc(p.n),
        '<div class="grid g2"><div>' + W.MB.svg(p.fig, p.gram === "+" ? { color: "#6d28d9", color2: "#c4b5fd" } : p.gram === "-" ? { color: "#be185d", color2: "#fbcfe8" } : {}) + "</div>" +
        "<div><p class=\"small muted\">" + esc(p.sci) + "</p>" + (p.gram ? '<div class="row"><span class="badge ' + (p.gram === "+" ? "v" : "r") + '">جرام ' + p.gram + "</span></div>" : "") + "</div></div>" +
        '<div class="tblwrap mt"><table><tbody>' + rows.map(r => "<tr><th style=\"width:150px\">" + r[0] + "</th><td>" + r[1] + "</td></tr>").join("") + "</tbody></table></div>" +
        (p.tip ? '<div class="note s mt"><b>💡 نقطة عملية للامتحان والمعمل</b>' + p.tip + "</div>" : "") +
        '<div class="row mt"><button class="btn primary" id="addPath">🗂 أضف بطاقة للدفتر</button></div>');
      const b = document.getElementById("addPath");
      if (b) b.onclick = () => {
        VL.notebook.add({ session: "موسوعة الميكروبات", title: p.n + " (" + p.sci + ")", kind: "card",
          summary: "التصنيف: " + TP[p.tp] + (p.gram ? " · جرام " + p.gram : "") + " | المصادر: " + String(p.source || "").slice(0, 90) + " | الحدّ: " + (p.limit || "—"),
          data: { id: p.id } });
        VL.store.addXP(4, "إضافة بطاقة ميكروب للدفتر");
      };
    }
    if (filterBox) {
      filterBox.innerHTML = '<div class="chips mb">' +
        ['all'].concat(Object.keys(TP)).map(k => '<button class="chip' + (k === "all" ? " on" : "") + '" data-k="' + k + '">' + (k === "all" ? "الكل" : TP[k]) + "</button>").join("") +
        '</div><input type="text" id="pSearch" placeholder="ابحث باسم الكائن أو المصدر الغذائي أو المرض…">';
      $$(".chip", filterBox).forEach(c => c.onclick = () => {
        cur = c.getAttribute("data-k");
        $$(".chip", filterBox).forEach(x => x.classList.toggle("on", x === c));
        render();
      });
      $("#pSearch", filterBox).addEventListener("input", e => { term = e.target.value; render(); });
    }
    render();
  };

  /* ======================================================== media archive */
  PAGES.mediaArchive = function (box, searchBox) {
    if (!box) return;
    const render = (term) => {
      const list = D.MEDIA.filter(m => !term || (m.n + m.u + m.r + m.t).toLowerCase().indexOf(term.toLowerCase()) >= 0);
      box.innerHTML = '<div class="tblwrap"><table><thead><tr><th>الوسط</th><th>النوع</th><th>الاستخدام</th><th>القراءة / التفسير</th><th>المفتاح الانتقائي</th></tr></thead><tbody>' +
        list.map(m => "<tr><td><b>" + esc(m.n) + "</b></td><td><span class=\"badge\">" + esc(m.t) + "</span></td><td>" + esc(m.u) + "</td><td>" + esc(m.r) + "</td><td class=\"small muted\">" + esc(m.k) + "</td></tr>").join("") +
        "</tbody></table></div>";
    };
    if (searchBox) searchBox.addEventListener("input", e => render(e.target.value));
    render("");
  };

  /* ======================================================== sessions / curriculum */
  PAGES.sessions = function (box) {
    if (!box) return;
    box.innerHTML = D.SESSIONS.map(s =>
      '<details class="acc" id="s' + s.n + '"><summary><span class="badge c">الجلسة ' + s.n + "</span> " + s.icon + " " + esc(s.t) + "</summary>" +
      '<div class="body"><div class="grid g2"><div>' +
      "<h4>🎯 الأهداف العملية</h4><ul class=\"list-dot small\">" + s.aims.map(x => "<li>" + x + "</li>").join("") + "</ul>" +
      "<h4>🧰 الأجهزة والمواد</h4><ul class=\"list-dot small\">" + s.mats.map(x => "<li>" + x + "</li>").join("") + "</ul></div>" +
      "<div><h4>📋 خطوات التنفيذ</h4><ol class=\"steps small\">" + s.steps.map(x => "<li>" + x + "</li>").join("") + "</ol></div></div>" +
      (s.calc ? '<div class="eq">' + s.calc + "</div>" : "") +
      '<div class="grid g2 mt"><div class="note s"><b>📊 النتائج المتوقّعة</b><ul class="list-check small">' + s.res.map(x => "<li>" + x + "</li>").join("") + "</ul></div>" +
      '<div class="note w"><b>✍️ واجب الجلسة</b><p class="small" style="margin:0">' + s.assign + "</p></div></div>" +
      '<div class="row mt"><a class="btn primary sm" href="' + s.link + '">افتح الوحدة التفاعلية ←</a>' +
      '<button class="btn sm ghost" data-sess="' + s.n + '">🗂 سجّل إتمام الجلسة في الدفتر</button></div></div></details>').join("");
    $$("[data-sess]", box).forEach(b => b.onclick = () => {
      const s = D.SESSIONS.find(x => x.n === +b.getAttribute("data-sess"));
      VL.notebook.add({ session: "الجلسات العملية", title: "الجلسة " + s.n + ": " + s.t, kind: "session",
        summary: "تم إنهاء الجلسة — الأهداف: " + s.aims.join(" · "), data: { n: s.n } });
      VL.store.addXP(15, "إتمام الجلسة " + s.n);
    });
  };

  /* ======================================================== notebook */
  PAGES.notebook = function (box, opts) {
    if (!box) return;
    const KIND = { field: "🔬 حقل مجهري", gram: "🎨 صبغة جرام", dilution: "🧪 تخفيف وعدّ", cfu: "🧾 حساب CFU", media: "🧫 قراءة وسط", machine: "⚙️ تشغيل جهاز", card: "🦠 بطاقة ميكروب", session: "📚 جلسة" };
    const draw = (filter) => {
      const all = VL.notebook.all().filter(n => !filter || filter === "all" || n.session === filter);
      const sessions = Array.from(new Set(VL.notebook.all().map(n => n.session)));
      box.innerHTML =
        '<div class="between mb"><div class="chips"><button class="chip' + (!filter || filter === "all" ? " on" : "") + '" data-f="all">الكل (' + VL.notebook.all().length + ")</button>" +
        sessions.map(s => '<button class="chip' + (filter === s ? " on" : "") + '" data-f="' + esc(s) + '">' + esc(s) + " (" + VL.notebook.bySession(s).length + ")</button>").join("") + "</div>" +
        '<div class="row"><button class="btn sm" id="nbPrint">🖨 طباعة / PDF</button><button class="btn sm ghost" id="nbTxt">⬇ تصدير نصي</button><button class="btn sm red" id="nbClear">🗑 تفريغ الدفتر</button></div></div>' +
        (all.length ? all.map(n =>
          '<article class="card mb" data-id="' + n.id + '"><div class="between"><div class="row"><span class="badge c">' + (KIND[n.kind] || "ملاحظة") + "</span><b>" + esc(n.title) + "</b></div>" +
          '<span class="tiny dim">' + new Date(n.at).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" }) + "</span></div>" +
          '<p class="small muted mt" style="margin:6px 0">' + esc(n.summary || "") + "</p>" +
          (n.img ? '<img src="' + n.img + '" alt="مجال مجهري محفوظ" class="nbimg">' : "") +
          (n.data ? '<details class="mt"><summary class="small">بيانات تفصيلية</summary><pre class="screen" style="text-align:start">' + esc(JSON.stringify(n.data, null, 1)) + "</pre></details>" : "") +
          '<button class="btn xs ghost mt" data-del="' + n.id + '">حذف</button></article>').join("")
          : '<div class="card"><p class="muted">دفترك فارغ حتى الآن. ابدأ من <a href="microscope.html">المجهر</a> أو <a href="gram.html">صبغة جرام</a> أو <a href="dilution.html">التخفيف والعدّ</a> وستُحفظ نتائجك تلقائيًا هنا.</p></div>');
      $$("[data-f]", box).forEach(b => b.onclick = () => draw(b.getAttribute("data-f") === "all" ? "all" : b.getAttribute("data-f")));
      $$("[data-del]", box).forEach(b => b.onclick = () => { VL.notebook.remove(b.getAttribute("data-del")); draw(filter); });
      $("#nbPrint").onclick = () => {
        const st = VL.store.name();
        const win = window.open("", "_blank");
        const rows = VL.notebook.all().map(n => '<div style="border:1px solid #ccc;padding:8px;margin:8px 0;font-family:Tahoma">' +
          "<b>" + esc(n.title) + "</b> — <small>" + new Date(n.at).toLocaleString("ar-EG") + "</small><br><small>" + esc(n.summary || "") + "</small>" +
          (n.img ? '<br><img src="' + n.img + '" style="width:220px;border:1px solid #999">' : "") + "</div>").join("");
        win.document.write('<html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>دفتر المعمل</title></head><body style="font-family:Tahoma;padding:24px">' +
          "<h2>دفتر المعمل الافتراضي — ميكروبيولوجيا الغذاء</h2>" +
          "<p>الطالب: " + esc(st.name || "زائر") + " · الرقم: " + esc(st.id || "—") + " · التاريخ: " + new Date().toLocaleString("ar-EG") + "</p>" + rows +
          "</body></html>");
        win.document.close(); setTimeout(() => win.print(), 600);
      };
      $("#nbTxt").onclick = () => {
        const st = VL.store.name();
        const lines = ["دفتر المعمل الافتراضي — ميكروبيولوجيا الغذاء", "الطالب: " + (st.name || "زائر") + " | الرقم: " + (st.id || "—"), "=".repeat(60)];
        VL.notebook.all().forEach(n => lines.push("\n[" + new Date(n.at).toLocaleString("ar-EG") + "] " + (KIND[n.kind] || "") + " — " + n.title + "\n" + (n.summary || "")));
        VL.download("دفتر-المعمل.txt", lines.join("\n"));
      };
      $("#nbClear").onclick = () => { if (confirm("سيتم حذف كل ملاحظات الدفتر. متابعة؟")) { VL.notebook.clear(); draw("all"); } };
    };
    draw(opts && opts.filter ? opts.filter : "all");
  };

  /* ======================================================== quiz page */
  PAGES.quizPage = function (box, chipsBox) {
    if (!box) return;
    const TOPICS = { general: "أساسيات ميكروبيولوجيا الغذاء", safety: "السلامة المخبرية", microscope: "المجهر والقياس", gram: "صبغة جرام", media: "الأوساط والقراءة", dilution: "التخفيف وحساب CFU", pathogens: "مسببات الأمراض", techniques: "التقنيات المعقّمة", instruments: "الأجهزة", viruses: "الفيروسات", food: "جودة وسلامة الغذاء" };
    const state = VL.LS.get("quizStats", {});
    const run = (topic, n) => {
      const bank = topic === "all" ? Object.keys(D.Q).reduce((a, k) => a.concat(D.Q[k]), []) : D.Q[topic];
      const qs = VL.shuffle(bank).slice(0, n);
      const area = $("#quizArea", box);
      area.innerHTML = "<h3>" + (topic === "all" ? "اختبار شامل" : TOPICS[topic]) + " — " + qs.length + " أسئلة</h3><div id='qwrap'></div>";
      VL.renderQuiz($("#qwrap", area), qs, {
        onDone(c, t, pct) {
          state[topic] = Math.max(state[topic] || 0, pct); VL.LS.set("quizStats", state); drawStats();
          VL.store.addXP(5 + Math.round(pct / 3), "اختبار " + TOPICS[topic] + " (" + pct + "%)");
          if (pct >= 80) VL.store.addBadge("quiz-" + topic, "تفوّق في " + TOPICS[topic]);
        }
      });
      if (box.scrollIntoView) box.scrollIntoView({ behavior: "smooth" });
    };
    function drawStats() {
      const rows = Object.keys(TOPICS).map(k => {
        const v = state[k] || 0;
        return '<div class="mb"><div class="between"><span class="small">' + TOPICS[k] + '</span><span class="small ' + (v >= 70 ? "" : "muted") + '">' + (v ? v + "%" : "لم يُختبر") + "</span></div>" +
          '<div class="prog"><i style="width:' + v + '%"></i></div></div>';
      }).join("");
      $("#stats", box).innerHTML = rows;
    }
    chipsBox.innerHTML = '<div class="chips">' +
      Object.keys(TOPICS).map(k => '<button class="chip" data-k="' + k + '">' + TOPICS[k] + "</button>").join("") +
      '<button class="chip on" data-k="all">اختبار شامل (٧٥ سؤالًا)</button></div>' +
      '<div class="row mt"><label class="f" style="margin:0">عدد الأسئلة:</label><select id="qCount" style="width:auto"><option>5</option><option selected>10</option><option>15</option><option>20</option><option>30</option></select></div>';
    chipsBox.addEventListener("click", e => {
      const b = e.target.closest(".chip"); if (!b) return;
      $$(".chip", chipsBox).forEach(x => x.classList.toggle("on", x === b));
      run(b.getAttribute("data-k"), +$("#qCount", chipsBox).value || 10);
    });
    box.innerHTML = '<div id="quizArea"></div><div class="grid g2 mt"><div><h3>📊 نتائجك حسب الموضوع</h3><div id="stats"></div></div><div class="card"><h3>🎯 كيف تستفيد</h3><p class="small muted">تُحفظ أفضل نتيجة لكل موضوع في متصفحك، وتُضاف نقاط الخبرة والشارات تلقائيًا. للحصول على شارة «تفوّق» في موضوع يجب تحقيق 80% أو أكثر.</p>' +
      '<div class="row"><span class="pill">🏅 نقاط: <b data-xp>0</b></span><span class="pill">🎖️ شارات: <b data-badges>0</b></span></div>' +
      '<div class="mt"><a class="btn primary" href="curriculum.html">راجع الجلسات أولًا</a></div></div></div>';
    drawStats();
    run("all", 10);
  };

  /* ======================================================== offline animations */
  PAGES.anim = function (name, canvas, ctrl) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(2, W.devicePixelRatio || 1);
    let W0 = canvas.clientWidth || 600, H0 = 260;
    canvas.width = W0 * dpr; canvas.height = H0 * dpr;
    canvas.style.height = H0 + "px";
    ctx.scale(dpr, dpr);
    let t = 0, running = true, state = { oil: false, T: 121, D: 3, n0: 7 };

    function bg() { ctx.fillStyle = "#04140f"; ctx.fillRect(0, 0, W0, H0); ctx.strokeStyle = "rgba(134,239,172,.15)"; ctx.lineWidth = 1; }
    function axis(x0, y0, x1, y1, xl, yl) {
      ctx.strokeStyle = "rgba(134,239,172,.5)"; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.fillStyle = "#86efac"; ctx.font = "11px sans-serif"; ctx.textAlign = "left";
      ctx.fillText(xl, x1 - 34, y0 + 16); ctx.fillText(yl, x0 - 8, y1 - 6);
    }
    const draw = {
      growthCurve(dt) {
        t += dt * .22;
        bg(); axis(50, 190, W0 - 30, 30, "الزمن", "العدد اللوغاريتمي");
        const phases = [[0, .25, "Lag (تأقلم)", "#fbbf24"], [.25, .6, "Log (نمو أُسّي)", "#34d399"], [.6, .82, "Stationary (ثبات)", "#22d3ee"], [.82, 1, "Death (موت)", "#f87171"]];
        const X = u => 50 + u * (W0 - 90), Y = l => 190 - l / 9 * 160;
        ctx.lineWidth = 3; ctx.strokeStyle = "#86efac"; ctx.beginPath();
        for (let u = 0; u <= 1.001; u += .01) {
          let l; if (u < .25) l = 1.4 + u * .2; else if (u < .6) l = 1.45 + (u - .25) * 14.5; else if (u < .82) l = 6.5 + (u - .6) * 1.2; else l = 6.8 - (u - .82) * 26;
          if (l < .2) l = .2; u ? ctx.lineTo(X(u), Y(l)) : ctx.moveTo(X(u), Y(l));
        }
        ctx.stroke();
        phases.forEach(p => {
          ctx.fillStyle = p[3] + "22"; ctx.fillRect(X(p[0]), 30, X(p[1]) - X(p[0]), 160);
          ctx.fillStyle = p[3]; ctx.font = "11px sans-serif"; ctx.textAlign = "center";
          ctx.fillText(p[2], (X(p[0]) + X(p[1])) / 2, 46);
        });
        const uu = (t % 1.6) / 1.6;
        let l; if (uu < .25) l = 1.4 + uu * .2; else if (uu < .6) l = 1.45 + (uu - .25) * 14.5; else if (uu < .82) l = 6.5 + (uu - .6) * 1.2; else l = 6.8 - (uu - .82) * 26; l = Math.max(.2, l);
        ctx.fillStyle = "#eafff3"; ctx.beginPath(); ctx.arc(X(uu), Y(l), 6, 0, 7); ctx.fill();
        ctx.fillStyle = "#86efac"; ctx.font = "12px sans-serif"; ctx.textAlign = "left";
        ctx.fillText("عدد الخلايا ≈ 10^" + l.toFixed(1) + " CFU/مل", 60, 210);
        ctx.fillText("📍 في المعمل: Lag = تأقلم قبل النمو · Log = أسرع نمو · Stationary = توازن · Death = موت", 60, 228);
      },
      oilOptics(dt) {
        bg();
        const useOil = state.oil;
        const y0 = 60;
        ctx.fillStyle = "#0b1a24"; ctx.fillRect(60, 30, W0 - 120, 40);
        ctx.fillStyle = "#94a3b8"; ctx.font = "12px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("العدسة الشيئية 100× — " + (useOil ? "مع زيت الغمر NA=1.25" : "بدون زيت NA=0.65"), W0 / 2, 55);
        ctx.fillStyle = "#1e293b"; ctx.fillRect(60, 70, W0 - 120, 6);
        const oilH = useOil ? 60 : 0;
        if (useOil) { ctx.fillStyle = "rgba(251,191,36,.35)"; ctx.fillRect(W0 / 2 - 60, 76, 120, oilH); ctx.fillStyle = "#fbbf24"; ctx.font = "11px sans-serif"; ctx.fillText("زيت الغمر n≈1.515", W0 / 2, 110); }
        ctx.fillStyle = "#0b1a24"; ctx.fillRect(60, 140, W0 - 120, 14);
        ctx.fillStyle = "#67e8f9"; ctx.font = "11px sans-serif"; ctx.fillText("الشريحة والغاز/الزجاج", W0 / 2, 152);
        // rays
        for (let i = -3; i <= 3; i++) {
          const x = W0 / 2 + i * 34;
          ctx.strokeStyle = "rgba(134,239,172,.85)"; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(x, 154 + (useOil ? -40 : 0));
          const spread = useOil ? 0.12 : 0.55;
          ctx.lineTo(W0 / 2 + i * 34 * (1 + spread), 72);
          ctx.stroke();
        }
        ctx.fillStyle = "#86efac"; ctx.font = "12px sans-serif"; ctx.textAlign = "left";
        ctx.fillText(useOil ? "✔ الزيت يمنع انحراف الضوء: شعاع مستقيم، إيضاح أعلى، تفاصيل أدق" : "✘ الهواء يحرف الضوء المائل: تفقد العدسة أشعة، فتنخفض الدقة والإيضاح", 62, 210);
        ctx.fillText("💡 الزيت لا يزيد التكبير — يزيد الإيضاح فقط: d = 0.61λ/NA", 62, 230);
      },
      thermalDeath(dt) {
        bg();
        const Dv = state.D, n0 = state.n0;
        axis(50, 190, W0 - 30, 30, "الزمن (دقائق)", "Log (الخلايا الحية)");
        const tMax = 30;
        const X = m => 50 + m / tMax * (W0 - 90), Y = l => 190 - l / 8 * 160;
        ctx.strokeStyle = "#f87171"; ctx.lineWidth = 2.5; ctx.beginPath();
        for (let m = 0; m <= tMax; m += .5) { const l = Math.max(0, n0 - m / Dv); m ? ctx.lineTo(X(m), Y(l)) : ctx.moveTo(X(m), Y(l)); }
        ctx.stroke();
        ctx.setLineDash([4, 4]); ctx.strokeStyle = "rgba(251,191,36,.8)";
        ctx.beginPath(); ctx.moveTo(X(0), Y(n0 - 1)); ctx.lineTo(X(Dv), Y(n0 - 1)); ctx.lineTo(X(Dv), Y(n0 - 1)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(X(0), Y(n0)); ctx.lineTo(X(Dv), Y(n0 - 1)); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = "#fbbf24"; ctx.font = "12px sans-serif"; ctx.textAlign = "left";
        ctx.fillText("D = " + Dv + " دقائق → كل D يُنقص العدد بمقدار 10×", 60, 30);
        ctx.fillStyle = "#86efac";
        ctx.fillText("العدد الابتدائي 10^" + n0 + " خلية/غ", 60, 210);
        ctx.fillText("تحقيق 12-log reduction يحتاج " + (12 * Dv).toFixed(0) + " دقيقة عند نفس الحرارة", 60, 228);
      },
      pcr(dt) {
        bg();
        const cycle = Math.floor(t % 4), phase = (t % 4) - cycle;
        // temperature dial
        const temps = [95, 55, 72, 4], temp = temps[cycle];
        ctx.fillStyle = "#0b1a24"; ctx.fillRect(24, 20, 190, 90); ctx.strokeStyle = "#22d3ee"; ctx.strokeRect(24, 20, 190, 90);
        ctx.fillStyle = "#67e8f9"; ctx.font = "13px monospace"; ctx.textAlign = "left";
        ctx.fillText("BLOCK TEMP: " + temp + " °C", 40, 46);
        ctx.fillText("CYCLE: " + (cycle + 1) + " / 40", 40, 68);
        ctx.fillText("COPIES: 2^" + (cycle + 4) + " ≈ " + Math.pow(2, cycle + 4).toLocaleString("en-US"), 40, 90);
        // DNA drawing
        const cx = W0 / 2 + 60, cy = 140;
        ctx.strokeStyle = "#86efac"; ctx.lineWidth = 2;
        const sep = phase * 26;
        ctx.beginPath(); ctx.moveTo(cx - 160, cy - sep); ctx.bezierCurveTo(cx - 60, cy - sep - 20, cx + 40, cy - sep + 20, cx + 150, cy - sep); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 160, cy + sep); ctx.bezierCurveTo(cx - 60, cy + sep + 20, cx + 40, cy + sep - 20, cx + 150, cy + sep); ctx.stroke();
        ctx.fillStyle = "rgba(134,239,172,.25)";
        for (let i = 0; i < 14; i++) {
          const x = cx - 150 + i * 22, h = 6 + sep;
          ctx.fillRect(x, cy - h / 2, 5, h);
        }
        ctx.fillStyle = "#fbbf24"; ctx.font = "12px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(["95°م: تفكيك الخيط المزدوج (Denaturation)", "55°م: التصاق البريميرات (Annealing)", "72°م: استطالة بـ Taq polymerase (Extension)", "4°م: حفظ (Hold)"][cycle], cx, 235);
      }
    };
    function loop() {
      if (!running) return;
      const now = performance.now();
      const dt = Math.min(.05, (now - (loop.last || now)) / 1000); loop.last = now;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W0, H0);
      (draw[name] || function () { bg(); })(dt);
      requestAnimationFrame(loop);
    }
    if (ctrl) {
      if (ctrl.oil) { state.oil = ctrl.oil.dataset.on === "1"; const obs = setInterval(() => { state.oil = ctrl.oil.dataset.on === "1"; }, 200); }
      if (ctrl.D) ctrl.D.addEventListener("input", e => { state.D = +e.target.value; ctrl.Dv.textContent = state.D + " دقائق"; });
      if (ctrl.n0) ctrl.n0.addEventListener("input", e => { state.n0 = +e.target.value; ctrl.n0v.textContent = "10^" + state.n0; });
      if (ctrl.pause) ctrl.pause.addEventListener("click", () => { running = !running; ctrl.pause.textContent = running ? "⏸ إيقاف" : "▶ تشغيل"; if (running) loop(); });
    }
    loop();
    return { state, stop() { running = false; } };
  };
  PAGES.animationCard = function (box, name, title, desc, controls) {
    controls = controls || "";
    box.innerHTML = '<div class="card"><h3>' + title + "</h3><p class=\"small muted\">" + desc + "</p>" +
      '<canvas class="chart animCv"></canvas><div class="row mt animCtrl">' + controls +
      '<button class="btn sm ghost" data-pause>⏸ إيقاف</button></div></div>';
    const c = $(".animCv", box), ctrlBox = $(".animCtrl", box);
    const oilBtn = $("[data-oil]", ctrlBox);
    if (oilBtn) {
      oilBtn.setAttribute("data-oil", "1");
      oilBtn.addEventListener("click", () => { oilBtn.dataset.on = oilBtn.dataset.on === "1" ? "0" : "1"; oilBtn.textContent = oilBtn.dataset.on === "1" ? "أزل زيت الغمر 💧" : "أضف زيت الغمر 💧"; });
    }
    const ctrl = {
      oil: oilBtn,
      D: $("[data-d]", ctrlBox), Dv: $("[data-dv]", ctrlBox),
      n0: $("[data-n]", ctrlBox), n0v: $("[data-nv]", ctrlBox),
      pause: $("[data-pause]", ctrlBox)
    };
    setTimeout(() => PAGES.anim(name, c, ctrl), 30);
    return ctrl;
  };

  W.PAGES = PAGES;
})(window);
