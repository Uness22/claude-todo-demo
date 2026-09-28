/* ==========================================================================
   labs-gram.js — interactive Gram-staining simulator
   order of reagents + timing of the decolouriser decide the result,
   then the outcome is examined in the virtual microscope.
   ========================================================================== */
(function (W) {
  "use strict";
  const VL = W.VL, SCOPE = W.SCOPE;
  const L = W.LABS = W.LABS || {};

  const STEPS = [
    { id: "smear", t: "🧫 حضّر مسحة رقيقة من مزرعة مختلطة ووزّعها على الشريحة" },
    { id: "fix", t: "🔥 ثبّت المسحة بالحرارة (تمرير سريع 3 مرات) أو بالميثانول" },
    { id: "cv", t: "🟣 صبغة الكريستال البنفسجي — 60 ثانية" },
    { id: "iodine", t: "🟤 محلول اليود (مثبّت) — 60 ثانية" },
    { id: "decolor", t: "🎯 مزيل اللون (كحول/أسيتون) — اضغط مع الاستمرار ثم أفلت في الوقت المناسب" },
    { id: "safranin", t: "🔴 السافرانين (الصبغة الثانوية) — 60 ثانية" },
    { id: "wash", t: "💧 اغسل بالماء بلطف ثم جفّف في الهواء (لا تفرك)" },
    { id: "view", t: "🔬 افحص بـ 100× مع زيت الغمر وسجّل النتيجة" }
  ];
  const REAGENTS = [
    { id: "cv", t: "الكريستال البنفسجي", c: "#7c3aed" },
    { id: "iodine", t: "محلول اليود", c: "#a16207" },
    { id: "decolor", t: "الكحول/الأسيتون (مزيل اللون)", c: "#94a3b8" },
    { id: "safranin", t: "السافرانين", c: "#f43f5e" },
    { id: "wash", t: "الماء (شطف)", c: "#0ea5e9" }
  ];

  L.gram = function (box, viewerBox) {
    if (!box) return;
    const st = { step: 0, errors: [], decolorSec: null, decoloring: false, started: 0, done: false, washCount: 0 };
    let timer = null, holdTimer = null;

    function render() {
      const cur = STEPS[st.step];
      box.innerHTML =
        '<div class="grid" style="grid-template-columns:1.25fr 1fr;gap:16px">' +
        '<div><div class="inst">' +
        '<div class="between mb"><span class="pill">الخطوة الحالية</span><span class="badge c" id="gIdx">' + Math.min(st.step + 1, STEPS.length) + " / " + STEPS.length + "</span></div>" +
        '<h3 style="margin:0 0 10px">' + (cur ? cur.t : "🎉 انتهت الخطوات — افحص النتيجة") + "</h3>" +
        '<div class="prog"><i id="gProg" style="width:' + (st.step / STEPS.length * 100) + '%"></i></div>' +
        '<div class="row mt" id="gTray"></div>' +
        '<div id="gHold" class="mt"></div>' +
        '<div class="note mt" id="gMsg">اختر الكاشف الصحيح من الحوض بالأعلى. أي خطأ في الترتيب يُسجَّل في تقريرك.</div>' +
        "</div>" +
        '<div class="card mt"><h3>📋 سجل الخطوات</h3><ol class="steps small" id="gLog"></ol></div></div>' +
        '<div class="card"><h3>🚨 الأخطاء المسجّلة</h3><div id="gErr" class="small muted">لا أخطاء حتى الآن ✔</div>' +
        '<h4 class="mt">⏱ حساسية الخطوة الحرجة</h4>' +
        '<p class="small muted">مزيل اللون (Decolouriser) هو الخطوة الحاسمة: 1–3 ثوانٍ للعصويات. الإفراط يزيل اللون من الموجبة، والتقصير يترك السالبة بنفسجية.</p>' +
        '<div class="tblwrap"><table><tbody>' +
        '<tr><th>الزمن</th><td id="gTime">لم تُنفّذ بعد</td></tr>' +
        '<tr><th>الحكم المبدئي</th><td id="gVerdict">—</td></tr></tbody></table></div>' +
        '<div class="row mt"><button class="btn sm ghost" id="gReset">♻ إعادة الجلسة</button>' +
        '<button class="btn sm primary" id="gFinish" disabled>🔬 افحص النتيجة بالمجهر</button></div>' +
        '<div class="note w mt small"><b>تنبيه</b>لا يُسمح بإعادة تشغيل الخطوات بعد التحضين؛ الفحص يكون بعد الانتهاء.</div></div></div>';
      drawLog(); drawTray(); drawErrors();
      if (st.step === 4) holdUI();
    }
    function drawTray() {
      const tray = box.querySelector("#gTray");
      if (st.step >= STEPS.length - 0) { tray.innerHTML = '<span class="badge g">اكتملت الخطوات</span>'; return; }
      const smearBtn = st.step === 0 ? '<button class="btn sm primary" data-r="smear">🧫 حضّر المسحة على الشريحة</button>' : "";
      tray.innerHTML = smearBtn + REAGENTS.map(r => '<button class="btn sm" data-r="' + r.id + '" style="border-color:' + r.c + '55">' +
        '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + r.c + '"></span> ' + r.t + "</button>").join("") +
        '<button class="btn sm ghost" data-r="fix">🔥 تثبيت حراري</button>';
      tray.querySelectorAll("[data-r]").forEach(b => b.onclick = () => use(b.getAttribute("data-r")));
      const f = box.querySelector("#gFinish");
      f.disabled = st.step < STEPS.length - 1;   // last step ("view") is performed by this very button
      f.onclick = () => showResult();
      box.querySelector("#gReset").onclick = () => location.reload();
    }
    function holdUI() {
      box.querySelector("#gHold").innerHTML =
        '<div class="row"><button class="btn red" id="gHoldBtn">🎯 اضغط مع الاستمرار لإضافة مزيل اللون…</button>' +
        '<span class="pill">الزمن: <b id="gSec">0.0</b> ثانية</span></div>' +
        '<p class="tiny dim mt">الهدف: 1–3 ثوانٍ (مسحة عادية). أفلت عند الزمن الصحيح.</p>';
      const btn = box.querySelector("#gHoldBtn"), sec = box.querySelector("#gSec");
      let t0 = 0;
      const start = e => {
        e.preventDefault();
        st.decoloring = true; t0 = performance.now();
        timer = setInterval(() => { const s = (performance.now() - t0) / 1000; sec.textContent = s.toFixed(1); }, 60);
      };
      const stop = () => {
        if (!st.decoloring) return;
        st.decoloring = false; clearInterval(timer);
        const s = (performance.now() - t0) / 1000;
        st.decolorSec = s; sec.textContent = s.toFixed(1);
        st.step++;
        judgeDecolor(s);
        render();
      };
      btn.addEventListener("pointerdown", start);
      window.addEventListener("pointerup", stop, { once: true });
    }
    function use(id) {
      if (st.step >= STEPS.length) return;
      const want = STEPS[st.step].id;
      const okMap = { cv: "cv", iodine: "iodine", decolor: "decolor", safranin: "safranin", wash: "wash", fix: "fix", smear: "smear" };
      if (id === want || (want === "wash" && id === "wash")) {
        st.step++;
        VL.UI.toast("✔ " + STEPS[st.step - 1].t.split("—")[0].trim(), "g");
      } else {
        st.errors.push("استُخدم " + (REAGENTS.find(r => r.id === id) || { t: id }).t + " في خطوة " + (st.step + 1) + " بدل الخطوة الصحيحة");
        VL.UI.toast("✘ كاشف غير مناسب في هذه الخطوة — سيؤثر على النتيجة النهائية", "r");
      }
      render();
      if (st.step >= STEPS.length) {
        box.querySelector("#gMsg").innerHTML = '<b>انتهت الخطوات ✔</b> اضغط «افحص النتيجة بالمجهر» لترى ما حدث فعلًا على الشريحة.';
      }
    }
    function judgeDecolor(s) {
      let v;
      if (s > 8) v = "إفراط شديد في إزالة اللون (Over-decolourised): كل البكتيريا ستظهر سالبة (وردية).";
      else if (s > 4) v = "إفراط في إزالة اللون: الموجبة تفقد اللون البنفسجي وقد تظهر وردية.";
      else if (s < 1) v = "تقصير في إزالة اللون (Under-decolourised): السالبة ستبقى بنفسجية وتُقرأ خطأً موجبة.";
      else v = "زمن مناسب ✔ 1–3 ثوانٍ: النتيجة التفريقية صحيحة.";
      box.querySelector("#gTime").textContent = s.toFixed(1) + " ثانية";
      box.querySelector("#gVerdict").innerHTML = v;
    }
    function drawLog() {
      box.querySelector("#gLog").innerHTML = STEPS.slice(0, st.step).map(s => "<li>" + s.t + "</li>").join("") ||
        '<li class="dim">لم تُنفّذ خطوات بعد — ابدأ بتثبيت المسحة.</li>';
      const p = box.querySelector("#gProg"); if (p) p.style.width = (st.step / STEPS.length * 100) + "%";
    }
    function drawErrors() {
      const e = box.querySelector("#gErr");
      e.innerHTML = st.errors.length ? '<ul class="list-check small">' + st.errors.map(x => '<li class="no">' + x + "</li>").join("") + "</ul>" : "لا أخطاء حتى الآن ✔";
    }

    function outcome() {
      const noIodine = !st.errors.some(e => e.indexOf("محلول اليود") >= 0) ? false : true;
      const skippedFix = st.errors.some(e => e.indexOf("تثبيت") >= 0);
      const s = st.decolorSec == null ? 2 : st.decolorSec;
      const skippedSafranin = st.errors.some(e => e.indexOf("السافرانين") >= 0 && e.indexOf("بدل") >= 0 && e.indexOf("خطوة " + STEPS.length) >= 0);
      const overCV = st.errors.some(e => e.indexOf("الكريستال") >= 0);
      if (skippedFix) return "empty";
      if (s > 8 || skippedSafranin || overCV) return "negative-looking";  // all pink / colourless
      if (s < 1) return "positive-looking";                              // all violet
      if (noIodine) return "allpink";
      if (s > 4) return "grampos-lost";
      return "correct";
    }
    function buildSlide(kind) {
      const id = "gram_" + kind;
      if (SCOPE.BY_ID[id]) return id;
      const GP = { color: "#6d28d9", color2: "#c4b5fd" }, GN = { color: "#be185d", color2: "#fbcfe8" };
      const PALE = { color: "#dfe6ee", color2: "#ffffff" };
      const base = {
        id: id, name: "شريحة صبغة جرام — نتيجتك التجريبية", cat: "bact", mode: "light", umPerUnit: 0.18,
        objective: 3, density: 130, matrix: "smear", bg: ["#e9eef3", "#cfdae5"], halo: false,
        gram: "+/-", org: "Mixed culture (S. aureus + E. coli)",
        note: "مزرعة مختلطة: مكورات عنقودية موجبة + عصويات سالبة.",
        teach: "النتيجة الصحيحة: بنفسجي للكرويات (موجبة) ووردي للعصويات (سالبة) في نفس الحقل."
      };
      const pops = {
        correct: [{ kind: "coccus_cluster", w: .3, size: [20, 30], col: GP, motion: "still" },
                  { kind: "bacillus", w: .7, size: [8, 13], col: GN, motion: "brownian" }],
        "negative-looking": [{ kind: "coccus_cluster", w: .3, size: [20, 30], col: GN, motion: "still" },
                  { kind: "bacillus", w: .7, size: [8, 13], col: GN, motion: "brownian" }],
        "positive-looking": [{ kind: "coccus_cluster", w: .3, size: [20, 30], col: GP, motion: "still" },
                  { kind: "bacillus", w: .7, size: [8, 13], col: GP, motion: "brownian" }],
        "grampos-lost": [{ kind: "coccus_cluster", w: .3, size: [20, 30], col: { color: "#d8b4fe", color2: "#f5f3ff" }, motion: "still" },
                  { kind: "bacillus", w: .7, size: [8, 13], col: GN, motion: "brownian" }],
        allpink: [{ kind: "coccus_cluster", w: .3, size: [20, 30], col: GN, motion: "still" },
                  { kind: "bacillus", w: .7, size: [8, 13], col: GN, motion: "brownian" }],
        empty: [{ kind: "dust", w: 1, size: [14, 30], col: { color: "#c8d0d8", color2: "#eef2f6" }, motion: "still" }]
      };
      SCOPE.register(Object.assign({}, base, { pop: pops[kind] || pops.correct }));
      return id;
    }
    function showResult() {
      if (st.step < STEPS.length - 1) { VL.UI.toast("أكمل خطوات الصبغة أولًا", "w"); return; }
      if (st.step === STEPS.length - 1) { st.step++; drawLog(); }   // count the "view" step as done
      st.done = true;
      const kind = outcome();
      const id = buildSlide(kind);
      const txt = {
        correct: { c: "s", t: "نتيجة صحيحة تفريقية ✔", b: "الكرويات بنفسجية (جرام موجب) والعصويات وردية (جرام سالب) — وهذا هو المطلوب." },
        "negative-looking": { c: "d", t: "نتيجة خاطئة: كل شيء وردي ✘", b: "تم إفراط في إزالة اللون أو حُذفت خطوة حاسمة، فأصبحت البكتيريا الموجبة تظهر سالبة — وهذا أشهر خطأ معملي." },
        "positive-looking": { c: "d", t: "نتيجة خاطئة: كل شيء بنفسجي ✘", b: "زمن إزالة اللون كان أقل من ثانية، فبقيت البكتيريا السالبة محتفظة بالمعقد البنفسجي." },
        "grampos-lost": { c: "w", t: "نتيجة غير موثوقة", b: "الموجبة باهتة (لون بنفسجي فاتح) بسبب زيادة الشطف: تحتاج إلى إعادة التحضين بمسحة جديدة." },
        allpink: { c: "d", t: "نتيجة خاطئة: فقدان التثبيت ✘", b: "لم يُستخدم محلول اليود (المثبّت)، فخرج الكريستال البنفسجي بالشطف." },
        empty: { c: "d", t: "الشريحة فارغة ✘", b: "المسحة غُسلت بالكامل لأنها لم تُثبت بالحرارة — لا يمكنك ملاحظة أي خلايا." }
      }[kind] || { c: "w", t: "نتيجة", b: "" };
      box.innerHTML = '<div class="note ' + txt.c + '"><b>' + txt.t + "</b>" + txt.b + "</div>" +
        '<div class="row"><button class="btn sm primary" id="gAgain">♻ أعد التحضين من البداية</button>' +
        '<button class="btn sm" id="gSave">🗂 سجّل النتيجة في الدفتر</button><a class="btn sm ghost" href="microscope.html">افتح المجهر المتقدم ←</a></div>' +
        '<div class="small muted mt">الفحص أدناه هو نفس شرائح المجهر الافتراضي: جرّب تكبير 100× مع زيت الغمر وقِس الخلايا بالميكرومتر.</div>';
      box.querySelector("#gAgain").onclick = () => location.reload();
      box.querySelector("#gSave").onclick = () => {
        VL.notebook.add({ session: "صبغة جرام", title: "جلسة صبغة جرام — " + txt.t, kind: "gram",
          summary: "زمن مزيل اللون: " + (st.decolorSec ? st.decolorSec.toFixed(1) + " ث" : "—") + " | أخطاء: " + (st.errors.length ? st.errors.join("؛ ") : "لا شيء") + " | " + txt.b,
          data: { outcome: kind, decolorSec: st.decolorSec, errors: st.errors } });
      };
      if (viewerBox) {
        viewerBox.innerHTML = "";
        SCOPE.embed(viewerBox, id, { hint: "اسحب للتحرك على شريحة نتيجتك" });
      }
      VL.store.setModule("gram", 100);
      VL.store.addXP(kind === "correct" ? 50 : 20, kind === "correct" ? "صبغة جرام ناجحة" : "تمرين صبغة جرام");
      if (kind === "correct") VL.store.addBadge("gram", "أتقن صبغة جرام");
    }
    render();
  };

  /* ---------- reference panel (static content built by JS for reuse) ---------- */
  L.gramReference = function (box) {
    if (!box) return;
    box.innerHTML =
      '<div class="grid g2"><div class="tblwrap"><table><thead><tr><th>الخطوة</th><th>الكاشف</th><th>الزمن</th><th>الوظيفة</th></tr></thead><tbody>' +
      "<tr><td>١</td><td>مسحة + تثبيت حراري</td><td>—</td><td>تثبيت الخلايا على الشريحة ومنع غسلها</td></tr>" +
      "<tr><td>٢</td><td>الكريستال البنفسجي (الصبغة الأساسية)</td><td>60 ث</td><td>صبغ جميع الخلايا بالبنفسجي</td></tr>" +
      "<tr><td>٣</td><td>محلول اليود (المثبّت Mordant)</td><td>60 ث</td><td>تكوين معقد CV–I داخل الخلية</td></tr>" +
      '<tr><td>٤</td><td>كحول/أسيتون (مزيل اللون)</td><td>1–3 ث <b>حرجة</b></td><td>إزالة اللون من السالبة فقط (الدهون الخارجية تُذاب)</td></tr>' +
      "<tr><td>٥</td><td>السافرانين (صبغة ثانوية)</td><td>60 ث</td><td>صبغ الخلايا المزالة بلون وردي/أحمر</td></tr>" +
      "</tbody></table></div>" +
      '<div><div class="card"><h3>🔬 تفسير النتيجة</h3><ul class="list-dot small">' +
      '<li><b>جرام موجب (بنفسجي):</b> طبقة ببتيدوجليكان سميكة تحتجز معقد الكريستال-اليود فلا يُذاب بالكحول.</li>' +
      '<li><b>جرام سالب (وردي):</b> غشاء خارجي دهني يذوب بالكحول فيخرج المعقد وتأخذ الصبغة الثانوية.</li>' +
      '<li><b>أهمية سريرية:</b> تُوجّه العلاج؛ فالموجبة (مثل S. aureus) تُعالج بالبنسلينات/السيفالوسبورينات، والسالبة تحتاج مضادات أخرى.</li></ul></div>' +
      '<div class="note w mt"><b>أخطاء تُفسد النتيجة</b><ul class="list-check small">' +
      "<li>مسحة سميكة جدًا (الكواشف لا تتخللها)</li><li>نسيان اليود أو تقديم السافرانين</li>" +
      "<li>إفراط/تقصير في إزالة اللون</li><li>استخدام مسحة بكتيرية قديمة أو وسط يحتوي حطامًا عكّر الصورة</li>" +
      "</ul></div></div></div>";
  };

  W.LABS = L;
})(window);
