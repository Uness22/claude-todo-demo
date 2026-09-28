/* -----------------------------------------------------------------------------
   اختبار آلي لصفحات "المعمل الافتراضي" (headless)
   -----------------------------------------------------------------------------
   يشغّل كل صفحة HTML داخل jsdom بمحرّك رسم وهمي، ثم ينفّذ سلسلة نقرات على كل
   محاكي في الصفحة ويتحقّق من عدم وجود أخطاء وقت التشغيل.

   المتطلبات (أدوات تطوير فقط، ليست جزءًا من الموقع نفسه):
       npm install jsdom
   ثم:
       node tests/headless.js          # فحص التحميل + التفاعلات
       node tests/headless.js --boot   # فحص التحميل فقط (أسرع)

   ملاحظة: لا يمكن اختبار Canvas الحقيقي هنا (وهمي بالكامل)؛ الغرض هو كشف
   أخطاء الـ JS: عناصر ناقصة، دوال غير معرّفة، ترتيب خطوات، إلخ.
------------------------------------------------------------------------------ */
"use strict";
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
let JSDOM, VirtualConsole;
try { ({ JSDOM, VirtualConsole } = require("jsdom")); }
catch (e) {
  console.error("✘ jsdom غير مثبّت. نفّذ:  npm install jsdom");
  process.exit(2);
}
const wait = ms => new Promise(r => setTimeout(r, ms));

/* ------------------------------------------------------------------ mock canvas */
function mockCtx() {
  const grad = { addColorStop() {} };
  return {
    canvas: null, globalAlpha: 1, fillStyle: "", strokeStyle: "", lineWidth: 1, font: "", textAlign: "",
    lineCap: "", shadowColor: "", shadowBlur: 0, imageSmoothingEnabled: true, globalCompositeOperation: "source-over",
    save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, setTransform() {}, resetTransform() {}, transform() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, bezierCurveTo() {}, arc() {}, arcTo() {},
    ellipse() {}, rect() {}, fill() {}, stroke() {}, fillRect() {}, strokeRect() {}, clearRect() {}, clip() {},
    fillText() {}, strokeText() {}, measureText() { return { width: 10 }; }, setLineDash() {}, drawImage() {},
    createLinearGradient() { return grad; }, createRadialGradient() { return grad; }, createPattern() { return null; },
    getImageData(x, y, w, h) { return { width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) }; },
    putImageData() {}, createImageData(w, h) { return { width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) }; },
    isPointInPath() { return false; }
  };
}

/* ------------------------------------------------------------------ page runner */
async function openPage(file, action) {
  const html = fs.readFileSync(path.join(ROOT, file), "utf8");
  const vc = new VirtualConsole();
  const errs = [];
  vc.on("jsdomError", e => {
    const msg = (e.detail && e.detail.stack) || e.message || String(e);
    if (/Not implemented: navigation/.test(msg)) return;      // تنزيل ملفات عبر <a download>: غير مدعوم في jsdom
    errs.push("jsdomError: " + msg);
  });
  vc.on("error", (...a) => errs.push("console.error: " + a.join(" ")));
  const dom = new JSDOM(html, { url: "https://vlab.local/" + file, runScripts: "outside-only", pretendToBeVisual: true, virtualConsole: vc });
  const { window } = dom;
  window.addEventListener("error", e => errs.push("window error: " + ((e.error && e.error.stack) || e.message)));

  window.HTMLCanvasElement.prototype.getContext = function () { const c = mockCtx(); c.canvas = this; return c; };
  window.HTMLCanvasElement.prototype.toDataURL = () => "data:image/jpeg;base64,AAAA";
  window.HTMLCanvasElement.prototype.setPointerCapture = () => {};
  if (!window.ImageData) window.ImageData = function (d, w, h) { return { data: d, width: w, height: h }; };
  if (!window.PointerEvent) window.PointerEvent = window.MouseEvent;
  if (!window.URL.createObjectURL) window.URL.createObjectURL = () => "blob:mock";
  /* --- واجهات الصوت والتسجيل (وهمية) --- */
  window.speechSynthesis = { getVoices: () => [{ lang: "ar-SA", name: "mock-ar" }, { lang: "en-US", name: "mock-en" }], speak(u) { if (u && u.onend) setTimeout(u.onend, 10); }, cancel() {}, onvoiceschanged: null };
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  window.HTMLMediaElement.prototype.play = function () { this.dispatchEvent(new window.Event("play")); return Promise.resolve(); };
  window.HTMLMediaElement.prototype.pause = function () {};
  const track = { addEventListener() {}, stop() {}, kind: "video" };
  window.HTMLCanvasElement.prototype.captureStream = () => ({ getVideoTracks: () => [track], getTracks: () => [track] });
  const mkCtx = () => ({ state: "running", destination: {}, currentTime: 0, resume: () => Promise.resolve(), createGain: () => ({ gain: { value: 1 }, connect() {}, disconnect() {} }), createMediaStreamDestination: () => ({ stream: { getAudioTracks: () => [{ kind: "audio" }] } }), createMediaElementSource: () => ({ connect() {}, disconnect() {} }), createMediaStreamSource: () => ({ connect() {} }) });
  window.AudioContext = mkCtx;
  window.MediaStream = function () {};
  window.MediaRecorder = function () { const self = this; this.state = "inactive"; this.mimeType = "video/webm";
    this.start = () => { self.state = "recording"; if (self.ondataavailable) self.ondataavailable({ data: new window.Blob(["x"], { type: "video/webm" }) }); };
    this.pause = () => { self.state = "paused"; }; this.resume = () => { self.state = "recording"; };
    this.stop = () => { self.state = "inactive"; if (self.onstop) self.onstop(); }; };
  window.MediaRecorder.isTypeSupported = () => true;
  Object.defineProperty(window.navigator, "mediaDevices", { value: { getDisplayMedia: () => Promise.resolve({ getVideoTracks: () => [track], getAudioTracks: () => [], getTracks: () => [track] }), getUserMedia: () => Promise.resolve({ getTracks: () => [{ stop() {} }] }) }, configurable: true });
  if (!window.URL.revokeObjectURL) window.URL.revokeObjectURL = () => {};
  window.confirm = () => true; window.print = () => {};
  window.open = () => ({ document: { write() {}, close() {} }, print() {}, focus() {} });
  ["clientWidth", "clientHeight"].forEach(k => Object.defineProperty(window.Element.prototype, k, { get() { return k === "clientWidth" ? 520 : 300; } }));
  window.Element.prototype.scrollIntoView = () => {};
  window.Element.prototype.setPointerCapture = () => {};
  window.Element.prototype.releasePointerCapture = () => {};
  window.Element.prototype.getBoundingClientRect = function () { return { left: 0, top: 0, width: 520, height: 520, right: 520, bottom: 520, x: 0, y: 0 }; };

  try {
    for (const s of Array.from(window.document.querySelectorAll("script"))) {
      const src = s.getAttribute("src");
      if (src) window.eval(fs.readFileSync(path.join(ROOT, src), "utf8"));
      else if (s.textContent.trim()) window.eval(s.textContent);
    }
  } catch (e) { errs.push("BOOT EXCEPTION: " + (e.stack || e.message)); }

  const $ = s => window.document.querySelector(s);
  const $$ = s => Array.from(window.document.querySelectorAll(s));
  const click = sel => {
    const el = typeof sel === "string" ? $(sel) : sel;
    if (!el) { errs.push("عنصر غير موجود: " + (typeof sel === "string" ? sel : "node")); return null; }
    try { el.dispatchEvent(new window.MouseEvent("click", { bubbles: true })); } catch (e) { errs.push("click: " + e.message); }
    return el;
  };
  const pointer = (el, type, x, y) => {
    if (!el) return;
    const ev = new window.MouseEvent(type, { bubbles: true, clientX: x || 10, clientY: y || 10 });
    ev.pointerId = 1; el.dispatchEvent(ev);
  };
  const setVal = (sel, v, ev = "input") => {
    const el = $(sel); if (!el) { errs.push("حقل غير موجود: " + sel); return; }
    el.value = v; el.dispatchEvent(new window.Event(ev, { bubbles: true })); el.dispatchEvent(new window.Event("change", { bubbles: true }));
  };

  if (action) { try { await action({ window, $, $$, click, pointer, setVal, errs, wait }); } catch (e) { errs.push("ACTION EXCEPTION: " + (e.stack || e.message)); } }
  await wait(600);                                   // timers / animation frames
  dom.window.close();
  return errs;
}

/* ------------------------------------------------------------------ scenarios */
const scenarios = {
  "index.html": null,
  "safety.html": async ({ click, wait }) => { click(".opt"); click("#qgo"); await wait(200); },
  "microscope.html": async ({ window, $, $$, click, setVal, pointer, wait }) => {
    $$("#objectives .objbtn").forEach(b => click(b));
    setVal("#focusSlider", "0.78"); setVal("#illum", "0.6"); setVal("#iris", "0.5");
    click("#oilBtn"); click("#saveField"); click("#challenge");
    await wait(200);
    $$(".optq").forEach(b => click(b));
    click("#rackCats .chip:nth-child(2)");
    $$("#rack .spec-btn").slice(0, 4).forEach(b => click(b));
    click("#resetPan"); click("#cleanBtn");
    $("#fieldbox").dispatchEvent(new window.MouseEvent("click", { bubbles: true, clientX: 200, clientY: 200 }));
    await wait(300);
    click("#exportBench");
    if (window.VL && window.VL.voice) { window.VL.voice.sayPage(); window.VL.say("micro.oil"); window.VL.voice.step("gram", "s4"); }
  },
  "bench.html": async ({ window, $, $$, click, pointer, setVal, wait, errs }) => {
    const order = ["flame1", "cool", "open", "take", "plate", "flame2", "close"];
    order.forEach(id => { const b = $$("#asepticMount [data-a]").find(x => x.getAttribute("data-a") === id); click(b || $("#asepticMount [data-a]")); });
    /* مقطع الخطوة الحرجة المسجّل يجب أن يكون هو المشغَّل (bench.a0 فما بعد) */
    const auRef = window.document.querySelector("audio");
    if (!auRef || !/bench\.a\d+\.mp3$/.test(auRef.src || "")) errs.push("لم يُشغَّل مقطع خطوة عقيمة مسجّل (src=" + (auRef && auRef.src) + ")");
    click("#asepticMount [data-a]");
    const cv = $("#plate");
    for (let q = 0; q < 4; q++) {
      click("#flame");
      const ang = (-135 + q * 90 + 45) * Math.PI / 180;
      for (let k = 0; k < 8; k++) {
        const r = 40 + k * 15;
        pointer(cv, "pointerdown", 180 + Math.cos(ang) * r, 180 + Math.sin(ang) * r);
        pointer(cv, "pointermove", 180 + Math.cos(ang) * (r + 6), 180 + Math.sin(ang) * (r + 4));
        pointer(cv, "pointerup", 180 + Math.cos(ang) * (r + 8), 180 + Math.sin(ang) * r);
      }
    }
    click("#incubate"); await wait(2600); click("#saveStreak");
    /* --- الاستوديو: تعليق + تسجيل شاشة وصوت --- */
    click("#stFab");
    click("#stPlay"); click("#stStop");
    $$("[data-lang]").forEach(b => click(b));
    click("#stPlay");
    setVal("#stRate", "1.2");
    setVal("#stSrc", "lab"); setVal("#stAud", "mn");
    click("#stRec"); await wait(300);
    click("#stPause"); await wait(150); click("#stPause");
    click("#stFin"); await wait(200); click(".modal .x");
    setVal("#stSrc", "screen"); click("#stRec"); await wait(200); click("#stFin"); await wait(200);
    const rq = $$("[data-record]")[0]; if (rq) click(rq.querySelector(".btn"));
  },
  "dilution.html": async ({ $, $$, click, setVal, wait }) => {
    click("#mix");
    for (let i = 0; i < 5; i++) { click("#transfer"); await wait(30); }
    const plates = $$("[data-plate]");
    click(plates[plates.length - 2]);
    click("#incub"); await wait(300);
    click("#autoCount"); click("#calcBtn"); click("#hintBtn"); click(".modal .x");
    click("#cfuNew"); setVal("#cfuIn", "100000"); click("#cfuCheck");
    click("#mpnRead"); await wait(200); setVal("#mpnIn", "150"); click("#mpnChk"); click("#mpnNew");
  },
  "gram.html": async ({ window, $, $$, click, pointer, wait, errs }) => {
    for (const r of ["smear", "fix", "cv", "iodine", "decolor", "safranin", "wash"]) {
      if (r === "decolor") {
        const hold = $("#gHoldBtn");
        /* زمن مزيل اللون ٢ ثانية = النتيجة الصحيحة (1–3 ث) */
        if (hold) { pointer(hold, "pointerdown", 10, 10); await wait(2100); window.dispatchEvent(new window.MouseEvent("pointerup", { bubbles: true })); await wait(150); }
      }
      click("[data-r='" + r + "']");
      await wait(60);
    }
    await wait(200);
    /* تحقّق أن مقطع الخطوة المسجّل هو ما يُشغَّل فعلًا */
    const au = window.document.querySelector("audio");
    if (!au || !/gram\.s\d+\.mp3$/.test(au.src || "")) errs.push("لم يُشغَّل مقطع خطوة مسجّل (src=" + (au && au.src) + ")");
    click("#gFinish"); await wait(600);
    if (au && !/gram\.res1\.mp3$/.test(au.src || "")) errs.push("لم يُشغَّل مقطع حكم النتيجة (src=" + au.src + ")");
    click("#gSave"); await wait(300); click(".modal .x");
    /* اللغة الإنجليزية: يجب أن تُشغَّل مقاطع en/gram.* */
    const langBtn = Array.from(window.document.querySelectorAll("[data-lang]")).find(b => b.getAttribute("data-lang") === "en");
    if (langBtn) {
      langBtn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
      await wait(120);
      window.VL.say("gram.s4"); await wait(120);
      const au2 = window.document.querySelector("audio");
      if (!au2 || !/audio\/en\/gram\.s4\.mp3$/.test(au2.src || "")) errs.push("التعليق الإنجليزي لم يُشغَّل (src=" + (au2 && au2.src) + ")");
      window.VL.say("gram.s2"); await wait(120);
      if (!/audio\/en\/gram\.s2\.mp3$/.test((window.document.querySelector("audio") || {}).src || "")) errs.push("انتقال مقطع إنجليزي آخر فشل");
    }
  },
  "media.html": async ({ $, $$, click, setVal, wait }) => {
    setVal("#mpGuess", "11.75"); setVal("#mpVes", "33"); click("#mpCheck");
    click("#mpCook"); await wait(2000);
    setVal("#prMed", "xld"); setVal("#prOrg", "1"); click("#prSave"); await wait(200);
    $$("#prChallenge [data-o]").forEach(b => click(b)); await wait(200);
    click("#prAgain");
  },
  "pathogens.html": async ({ window, $, $$, click }) => {
    $$(".pc, .pcard, [data-p]").slice(0, 3).forEach(c => { click(c); click("#addPath"); click(".modal .x"); });
    click("#pFilter .chip:nth-child(3)");
    const s = $("#pSearch"); if (s) { s.value = "سالمونيلا"; s.dispatchEvent(new window.Event("input", { bubbles: true })); }
  },
  "instruments.html": async ({ $, $$, click, setVal, wait }) => {
    click("#acRun"); await wait(5200); click("#acSave"); click("#acReset");
    click("#incFast"); await wait(1200); click("#incRun"); await wait(1500);
    click("#pcrRun"); await wait(4000); click("#pcrGel"); await wait(300); click("#pcrSave");
    setVal("#phR", "1.5"); setVal("#awR", "6");
    setVal("#cfRpm", "12000"); click("#cfRun"); click("#cfSave");
    setVal("#spOd", "1.4"); setVal("#spDil", "10"); click("#spSave");
  },
  "curriculum.html": async ({ $, $$, click, wait }) => {
    click("#s1 summary"); click("#s5 summary");
    const b = $("[data-sess]"); if (b) click(b);
    click("#certBtn"); await wait(300);
    const t = $("#certTxt"); if (t) click(t);
    click("#printAll"); click("#exportPlan");
  },
  "videos.html": async ({ window, $, $$, click, setVal, wait }) => {
    click("#vFilter .chip:nth-child(3)"); setVal("#vLang", "ar");
    const s = $("#vSearch"); s.value = "زرع"; s.dispatchEvent(new window.Event("input", { bubbles: true }));
    setVal("#vLang", "all");
    const th = $$(".vthumb")[0]; if (th) click(th);
    const oil = $("[data-oil]"); if (oil) click(oil);
    setVal("[data-d]", "6"); setVal("[data-n]", "9");
    click("[data-pause]"); await wait(200);
  },
  "quiz.html": async ({ window, $, $$, click, setVal, wait }) => {
    $$(".opt").slice(0, 12).forEach(o => { const i = o.querySelector("input"); if (i) { i.checked = true; i.dispatchEvent(new window.Event("change", { bubbles: true })); } });
    click("#qgo"); await wait(200); click("#qrst");
    setVal("#qCount", "5"); click("#chipsBox .chip:nth-child(4)"); await wait(200);
  },
  "notebook.html": async ({ $, $$, click }) => {
    click("#saveSt"); click("#nbPrint"); click("#nbTxt"); click("#nbCsv");
    const chips = $$("#nbFilter .chip"); if (chips[1]) click(chips[1]);
    const del = $("#nbBody [data-del]"); if (del) click(del);
  }
};

/* ------------------------------------------------------------------ main */
(async () => {
  const bootOnly = process.argv.includes("--boot");
  const pages = fs.readdirSync(ROOT).filter(f => f.endsWith(".html")).sort();
  let bad = 0, actions = 0;
  for (const p of pages) {
    const errs = await openPage(p, bootOnly ? null : scenarios[p]);
    if (!bootOnly && scenarios[p]) actions++;
    if (errs.length) { bad++; console.log("✘ " + p); errs.slice(0, 6).forEach(e => console.log("     " + e)); }
    else console.log("✔ " + p + (bootOnly || !scenarios[p] ? "" : "  (تفاعلات)"));
  }
  console.log("\n" + pages.length + " صفحة · " + actions + " سيناريو تفاعلي · " + (bad ? bad + " صفحة بها أخطاء" : "لا أخطاء ✔"));
  process.exit(bad ? 1 : 0);
})();
