/* ==========================================================================
   core.js — shared shell: nav, storage, XP, notebook, toasts, quiz engine
   No external dependencies. Works fully offline.
   ========================================================================== */
(function (W) {
  "use strict";

  /* ---------------- pages / navigation ---------------- */
  const PAGES = [
    { href: "index.html",       t: "المعمل",        ic: "🏛" },
    { href: "safety.html",      t: "السلامة",       ic: "🦺" },
    { href: "bench.html",       t: "الزرع والتقنيات", ic: "🧫" },
    { href: "dilution.html",    t: "التخفيف والعدّ", ic: "🧪" },
    { href: "gram.html",        t: "صبغة جرام",     ic: "🎨" },
    { href: "microscope.html",  t: "المجهر",        ic: "🔬" },
    { href: "media.html",       t: "الأوساط والأطباق", ic: "🧾" },
    { href: "pathogens.html",   t: "موسوعة الميكروبات", ic: "🦠" },
    { href: "instruments.html", t: "الأجهزة",       ic: "⚙️" },
    { href: "curriculum.html",  t: "الجلسات العملية", ic: "📚" },
    { href: "videos.html",      t: "فيديوهات عملية", ic: "🎬" },
    { href: "quiz.html",        t: "الاختبارات",    ic: "📝" },
    { href: "notebook.html",    t: "دفتر المعمل",   ic: "🗂" }
  ];

  /* ---------------- storage ---------------- */
  const LS = {
    get(k, d) { try { const v = localStorage.getItem("vlab." + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("vlab." + k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem("vlab." + k); } catch (e) {} }
  };

  const store = {
    name: () => LS.get("student", { name: "", id: "", group: "" }),
    setName(s) { LS.set("student", s); UI.refreshXP(); },
    xp: () => LS.get("xp", 0),
    addXP(n, why) {
      if (!n) return;
      LS.set("xp", store.xp() + n);
      UI.refreshXP();
      if (why) UI.toast("+" + n + " نقطة خبرة — " + why, "g");
    },
    badges: () => LS.get("badges", []),
    addBadge(id, title) {
      const b = store.badges();
      if (b.some(x => x.id === id)) return;
      b.push({ id, title, at: Date.now() });
      LS.set("badges", b);
      UI.toast("🎖️ شارة جديدة: " + title, "g");
      UI.refreshXP();
    },
    modules: () => LS.get("modules", {}),
    setModule(id, pct) {
      const m = store.modules(); m[id] = Math.max(m[id] || 0, Math.round(pct));
      LS.set("modules", m); UI.refreshXP();
    },
    getModule(id) { return store.modules()[id] || 0; }
  };

  /* ---------------- notebook ---------------- */
  const notebook = {
    all: () => LS.get("notes", []),
    add(entry) {                       // {session, title, kind, data, summary, img}
      const a = notebook.all();
      entry.id = "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      entry.at = Date.now();
      a.unshift(entry);
      if (a.length > 220) a.length = 220;
      LS.set("notes", a);
      UI.toast("🗂 تم حفظ النتيجة في دفتر المعمل", "g");
      return entry.id;
    },
    update(id, patch) {
      const a = notebook.all(); const i = a.findIndex(x => x.id === id);
      if (i >= 0) { a[i] = Object.assign(a[i], patch); LS.set("notes", a); }
    },
    remove(id) { LS.set("notes", notebook.all().filter(x => x.id !== id)); },
    clear() { LS.set("notes", []); },
    bySession(s) { return notebook.all().filter(x => x.session === s); }
  };

  /* ---------------- small helpers ---------------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const el = (tag, attrs, html) => {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) { if (k === "class") e.className = attrs[k]; else if (k === "html") e.innerHTML = attrs[k]; else e.setAttribute(k, attrs[k]); }
    if (html != null) e.innerHTML = html;
    return e;
  };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = n => (n == null || isNaN(n)) ? "—" : Number(n).toLocaleString("en-US");
  const sci = n => {
    if (!isFinite(n) || n === 0) return "0";
    if (n >= 0.01 && n < 1e5) return Number(n.toPrecision(4)).toLocaleString("en-US");
    const e = Math.floor(Math.log10(Math.abs(n))); const m = n / Math.pow(10, e);
    return m.toFixed(2) + " × 10<sup>" + e + "</sup>";
  };
  const now = () => new Date().toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const rndInt = (a, b) => Math.floor(rnd(a, b + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = a => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
  function download(fname, text, mime) {
    const b = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
    const u = URL.createObjectURL(b), a = el("a", { href: u, download: fname });
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
  }

  /* ---------------- UI ---------------- */
  const UI = {
    toast(msg, kind, ms) {
      let box = $("#toasts"); if (!box) { box = el("div", { id: "toasts" }); document.body.appendChild(box); }
      const t = el("div", { class: "toast " + (kind || "") }, msg);
      box.appendChild(t);
      setTimeout(() => { t.style.transition = ".4s"; t.style.opacity = "0"; t.style.transform = "translateY(10px)"; setTimeout(() => t.remove(), 420); }, ms || 3600);
    },
    modal(title, html, opts) {
      let m = $("#modal"); if (m) m.remove();
      m = el("div", { class: "modal on", id: "modal" });
      m.innerHTML = '<div class="box"><div class="between"><h3>' + title + '</h3><button class="x" title="إغلاق">✕</button></div><div class="mbody">' + html + "</div></div>";
      document.body.appendChild(m);
      m.addEventListener("click", e => { if (e.target === m || e.target.classList.contains("x")) m.classList.remove("on"); });
      if (opts && opts.onMount) opts.onMount($(".mbody", m), m);
      return m;
    },
    closeModal() { const m = $("#modal"); if (m) m.classList.remove("on"); },
    refreshXP() {
      const xp = store.xp();
      const lvl = Math.floor(xp / 250) + 1;
      const into = xp % 250;
      const box = $("#xpbox"); if (!box) return;
      box.innerHTML = '<span>🏅 <b>' + xp + '</b> نقطة</span><span class="dim small">مستوى ' + lvl + "</span>" +
        '<span class="xpbar"><i style="width:' + (into / 250 * 100) + '%"></i></span>';
      $$("[data-xp]").forEach(n => n.textContent = xp);
      $$("[data-level]").forEach(n => n.textContent = lvl);
      $$("[data-badges]").forEach(n => n.textContent = store.badges().length);
    },
    header() {
      const cur = location.pathname.split("/").pop() || "index.html";
      const st = store.name();
      const tb = el("div", { class: "topbar" });
      tb.innerHTML =
        '<div class="inner">' +
          '<a class="brand" href="index.html">' +
            '<span class="logo"><svg viewBox="0 0 24 24" fill="none" stroke="#a5f3fc" stroke-width="1.7">' +
            '<path d="M9 3h6M10 3v5.2L5.6 17A3 3 0 0 0 8.3 21h7.4a3 3 0 0 0 2.7-4.4L14 8.2V3"/>' +
            '<path d="M7 14h10" stroke="#fbbf24"/><circle cx="11" cy="17" r="1.3" fill="#a5f3fc" stroke="none"/>' +
            '<circle cx="14" cy="18.4" r=".8" fill="#a5f3fc" stroke="none"/></svg></span>' +
            '<span><b>المعمل الافتراضي لعلوم الأغذية</b><span>' + (st.name ? "الطالب: " + esc(st.name) : "ميكروبيولوجيا الغذاء — تطبيق عملي شامل") + "</span></span>" +
          "</a>" +
          '<nav class="nav" id="mainnav"></nav>' +
          '<div class="xpbox" id="xpbox"></div>' +
          '<button class="burger" id="burger" aria-label="القائمة">☰</button>' +
        "</div>";
      document.body.insertBefore(tb, document.body.firstChild);
      const nav = $("#mainnav", tb);
      PAGES.forEach(p => {
        const a = el("a", { href: p.href, class: p.href === cur ? "on" : "" });
        a.innerHTML = '<span class="ic">' + p.ic + "</span>" + p.t;
        nav.appendChild(a);
      });
      $("#burger", tb).addEventListener("click", () => nav.classList.toggle("open"));
      nav.addEventListener("click", e => { if (e.target.closest("a")) nav.classList.remove("open"); });
      UI.refreshXP();
    },
    footer() {
      const f = el("div", { class: "wrap noprint" });
      f.innerHTML = '<hr><p class="small dim center">المعمل الافتراضي لميكروبيولوجيا علوم الأغذية — نسخة تعليمية مفتوحة. ' +
        'جميع عمليات المحاكاة أُعدّت لأغراض التدريب الأكاديمي، وتُغني عن حضور الجلسة العملية عند تعذّر الحضور، ' +
        'ولا تُعد بديلاً عن التدريب المُشرَف داخل معمل حقيقي.<br>الطلاب: <span data-xp>0</span> نقطة خبرة · ' +
        '<span data-badges>0</span> شارات · <a href="notebook.html">دفتر المعمل</a> · <a href="curriculum.html">الدليل العملي</a></p>';
      document.body.appendChild(f);
    },
    tabs(root) {
      $$(".tabs", root).forEach(box => {
        const btns = $$("button", box);
        btns.forEach((b, i) => {
          b.addEventListener("click", () => {
            btns.forEach(x => x.classList.remove("on")); b.classList.add("on");
            const group = box.getAttribute("data-group") || "";
            $$('[data-tabgroup="' + group + '"]').forEach(p => p.classList.toggle("hide", p.getAttribute("data-tab") !== b.getAttribute("data-tab")));
          });
        });
        if (btns[0]) btns[0].click();
      });
    },
    requireStudent(cb) {
      const st = store.name();
      if (st.name) return cb(st);
      UI.modal("تسجيل الدخول للمعمل",
        '<p class="muted">أدخل بياناتك ليُسجَّل اسمك في تقارير المعمل والشهادات ودفتر النتائج.</p>' +
        '<label class="f">الاسم الكامل</label><input id="stName" type="text" placeholder="مثال: محمد أحمد علي">' +
        '<label class="f">الرقم الجامعي (اختياري)</label><input id="stId" type="text" placeholder="2024-12345">' +
        '<label class="f">الدفعة / الشعبة (اختياري)</label><input id="stGrp" type="text" placeholder="الشعبة الثانية — علوم الأغذية">' +
        '<div class="row mt"><button class="btn primary" id="stSave">دخول المعمل</button>' +
        '<button class="btn ghost" id="stSkip">متابعة كزائر</button></div>',
        { onMount(box, m) {
            $("#stSave", box).onclick = () => {
              const n = $("#stName", box).value.trim() || "طالب زائر";
              store.setName({ name: n, id: $("#stId", box).value.trim(), group: $("#stGrp", box).value.trim() });
              m.classList.remove("on"); UI.toast("أهلاً بك " + esc(n) + " في المعمل الافتراضي", "g"); cb(store.name());
            };
            $("#stSkip", box).onclick = () => { m.classList.remove("on"); cb(store.name()); };
          } });
    }
  };

  /* ---------------- quiz engine ---------------- */
  function renderQuiz(container, questions, opts) {
    opts = opts || {};
    const state = { answers: {}, done: false };
    container.innerHTML = "";
    questions.forEach((q, i) => {
      const d = el("div", { class: "q", "data-i": i });
      let html = '<div class="qt"><span class="qn">' + (i + 1) + "</span><span>" + q.q + "</span></div>";
      q.o.forEach((o, j) => { html += '<label class="opt" data-j="' + j + '"><input type="radio" name="q' + i + '" value="' + j + '">' + o + "</label>"; });
      html += '<div class="expl hide"></div>';
      d.innerHTML = html;
      d.addEventListener("change", e => {
        if (state.done) return;
        state.answers[i] = +e.target.value;
        $$(".opt", d).forEach(l => l.classList.remove("sel"));
        e.target.closest(".opt").classList.add("sel");
      });
      container.appendChild(d);
    });
    const bar = el("div", { class: "scorebox" });
    bar.innerHTML = '<div><b id="qstate">0</b> <span class="muted small">من ' + questions.length + " سؤالًا مُجابًا</span></div>" +
      '<div class="row"><button class="btn primary" id="qgo">تصحيح الاختبار</button>' +
      '<button class="btn ghost sm" id="qrst">إعادة</button></div>';
    container.appendChild(bar);
    container.addEventListener("change", () => {
      if (state.done) return;
      $("#qstate", bar).textContent = Object.keys(state.answers).length;
    });
    $("#qgo", bar).onclick = () => {
      if (state.done) return;
      state.done = true;
      let correct = 0;
      questions.forEach((q, i) => {
        const d = $('[data-i="' + i + '"]', container);
        $$(".opt", d).forEach(l => {
          const j = +l.getAttribute("data-j");
          if (j === q.a) l.classList.add("ok");
          else if (state.answers[i] === j) l.classList.add("bad");
          l.querySelector("input").disabled = true;
        });
        if (state.answers[i] === q.a) correct++;
        const ex = $(".expl", d);
        ex.innerHTML = "<b>" + (state.answers[i] === q.a ? "✔ إجابة صحيحة" : "✘ الإجابة الصحيحة: " + esc(q.o[q.a])) + "</b><br>" + (q.e || "");
        ex.classList.remove("hide");
      });
      const pct = Math.round(correct / questions.length * 100);
      const st = $("#qstate", bar).parentNode;
      st.innerHTML = '<b class="' + (pct >= 70 ? "" : "") + '" style="color:' + (pct >= 70 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)") + '">' + pct + "%</b> <span class=\"muted small\">(" + correct + " / " + questions.length + ") " +
        (pct >= 70 ? "نتيجة مقبولة ✔" : "يحتاج مراجعة ✘") + "</span>";
      $("#qgo", bar).classList.add("dis");
      if (opts.onDone) opts.onDone(correct, questions.length, pct);
    };
    $("#qrst", bar).onclick = () => renderQuiz(container, questions, opts);
    return state;
  }

  /* ---------------- autoboot ---------------- */
  function boot(opts) {
    opts = opts || {};
    if (!opts.noHeader) UI.header();
    if (!opts.noFooter) UI.footer();
    UI.tabs(document);
    const first = !store.name().name && !LS.get("seen", false);
    if (first) { LS.set("seen", true); setTimeout(() => UI.requireStudent(() => {}), 700); }
    // delegate data-modal triggers etc. (pages may add)
  }

  W.VL = { PAGES, LS, store, notebook, UI, boot, $, $$, el, esc, fmt, sci, now, clamp, rnd, rndInt, pick, shuffle, download, renderQuiz };
})(window);
