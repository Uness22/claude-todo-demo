/* ==========================================================================
   labs-instruments.js — autoclave · incubator · PCR · pH · a_w · centrifuge ·
   spectrophotometer · cold chain
   ========================================================================== */
(function (W) {
  "use strict";
  const VL = W.VL;
  const L = W.LABS = W.LABS || {};

  /* ============================================================= AUTOCLAVE */
  L.autoclave = function (box) {
    if (!box) return;
    const ITEMS = [
      { k: "media", t: "قوارير وسط مغذٍّ 500 مل", liquid: true },
      { k: "tubes", t: "أنابيب محلول ملحي 9 مل", liquid: true },
      { k: "glass", t: "زجاجيات فارغة (أطباق ومساحيق)", liquid: false },
      { k: "pouch", t: "أدوات في أكياس تعقيم (Pouches)", liquid: false },
      { k: "waste", t: "كيس نفايات حيوية", liquid: false },
      { k: "tips", t: "علبة أطراف ماصات", liquid: false }
    ];
    const st = { items: { media: true, tubes: true, glass: true, pouch: true, waste: true, tips: false }, temp: 121, time: 20, caps: "loose", fill: "safe", running: false, done: null };
    function render() {
      box.innerHTML = '<div class="grid" style="grid-template-columns:1fr 1.1fr;gap:16px">' +
        '<div class="inst"><h3 style="margin:0 0 8px">⚙️ محاكي الأوتوكلاف</h3>' +
        '<div class="between"><span class="led ' + (st.running ? "warn" : st.done === null ? "" : st.done.ok ? "on" : "err") + '"></span><span class="pill">الغرفة: ' + (st.running ? "بخار مشبع" : "مغلقة") + "</span></div>" +
        '<div class="dial mt"><div class="hub"></div><div class="needle" id="acNeedle"></div><div class="lab" id="acDialLab">0 °C / 0 بار</div></div>' +
        '<div class="screen mt" id="acScreen">READY. اختر الحمولة والإعدادات ثم ابدأ الدورة.<span class="dim"></span>\n</div>' +
        '<div class="prog mt"><i id="acProg" style="width:0%"></i></div></div>' +
        '<div><div class="card"><h3>📦 الحمولة</h3><div class="grid g2">' +
        ITEMS.map(i => '<label class="switch"><input type="checkbox" data-item="' + i.k + '"' + (st.items[i.k] ? " checked" : "") + "> " + i.t + "</label>").join("") + "</div>" +
        '<div class="grid g2 mt"><div><label class="f">درجة الحرارة</label><select id="acTemp">' + [100, 115, 121, 134].map(t => '<option value="' + t + '"' + (t === st.temp ? " selected" : "") + ">" + t + " °م</option>").join("") + "</select></div>" +
        '<div><label class="f">المدة (دقائق): <b id="acTv">' + st.time + "</b></label><input type=\"range\" id=\"acTime\" min=\"5\" max=\"60\" step=\"1\" value=\"" + st.time + '"></div></div>' +
        '<div class="grid g2 mt"><div><label class="f">حالة الأغطية</label><select id="acCaps"><option value="loose"' + (st.caps === "loose" ? " selected" : "") + '>مرخيّة قليلًا (صحيح)</option><option value="tight"' + (st.caps === "tight" ? " selected" : "") + ">محكمة تمامًا</option></select></div>" +
        '<div><label class="f">مستوى الملء</label><select id="acFill"><option value="safe"' + (st.fill === "safe" ? " selected" : "") + ">أقل من ⅔ الحجم</option><option value=\"full\"" + (st.fill === "full" ? " selected" : "") + ">ممتلئ تمامًا</option></select></div></div>" +
        '<div class="row mt"><button class="btn primary" id="acRun">▶ ابدأ دورة التعقيم</button><button class="btn ghost sm" id="acReset">♻ إعادة الضبط</button></div>' +
        '<div id="acOut" class="mt"></div>' +
        '<details class="acc mt"><summary>📖 قواعد ذهبية للأوتوكلاف</summary><div class="body"><ul class="list-check small">' +
        "<li>121°م عند 1 بار (15 psi) لمدة 15–20 دقيقة = الشروط المعيارية</li>" +
        "<li>الأغطية مرخيّة لمنع الانفجار ودفع الهواء خارجًا</li>" +
        "<li>الملء ≤ ⅔ والحمولة ليست مضغوطة (يجب أن يمر البخار)</li>" +
        "<li>النفايات الحيوية: 121°م/30 دقيقة على الأقل</li>" +
        "<li>التحقق دائمًا: شريط بوغ + مؤشر كيميائي + تسجيل الدورة</li>" +
        "<li>لا تفتح الباب بسرعة عند دورة السوائل (خطر الغليان الفوري)</li></ul></div></details></div></div></div>";
      box.querySelectorAll("[data-item]").forEach(c => c.onchange = () => { st.items[c.getAttribute("data-item")] = c.checked; });
      box.querySelector("#acTemp").onchange = e => { st.temp = +e.target.value; };
      box.querySelector("#acTime").oninput = e => { st.time = +e.target.value; box.querySelector("#acTv").textContent = st.time; };
      box.querySelector("#acCaps").onchange = e => { st.caps = e.target.value; };
      box.querySelector("#acFill").onchange = e => { st.fill = e.target.value; };
      box.querySelector("#acRun").onclick = run;
      box.querySelector("#acReset").onclick = () => {
      if (W.VL.say) W.VL.say("inst.autoclave"); st.done = null; st.running = false; render(); };
    }
    function log(msg) { const s = box.querySelector("#acScreen"); s.textContent += msg + "\n"; s.scrollTop = s.scrollHeight; }
    function run() {
      if (st.running) return;
      const anyItem = Object.keys(st.items).some(k => st.items[k]);
      if (!anyItem) { VL.UI.toast("اختر حمولة واحدة على الأقل", "w"); return; }
      st.running = true;
      box.querySelector("#acScreen").textContent = "INIT: تهيئة الغرفة وطرد الهواء…\n";
      const target = st.temp, pressure = target >= 134 ? 2 : target >= 121 ? 1 : target >= 115 ? .7 : 0;
      let t = 0, prog = 0;
      const iv = setInterval(() => {
        t += target / 12 * .6; prog += 2.2;
        if (t > target) t = target;
        if (prog > 100) prog = 100;
        const ang = -90 + (t / 140) * 180;
        box.querySelector("#acNeedle").style.transform = "translateX(-50%) rotate(" + ang + "deg)";
        box.querySelector("#acDialLab").textContent = t.toFixed(0) + " °C / " + (pressure * (t / target)).toFixed(2) + " bar";
        box.querySelector("#acProg").style.width = prog + "%";
        if (prog % 10 < 3) log("T=" + t.toFixed(0) + "°C  P=" + (pressure * t / target).toFixed(2) + " bar  t=" + (prog / 100 * st.time).toFixed(1) + " min");
        if (prog >= 100) { clearInterval(iv); finish(target, pressure); }
      }, 90);
    }
    function finish(target, pressure) {
      const issues = [];
      const liquids = (st.items.media ? 1 : 0) + (st.items.tubes ? 1 : 0);
      if (target < 115) issues.push("درجة الحرارة أقل من المطلوب للتعقيم — حتى الحرارة 100°م تُطبع (Coagulate) ولا تقتل السبور.");
      if (target === 115 && st.time < 30) issues.push("115°م تحتاج ≥30 دقيقة للتعقيم الفعلي (تعقيم بالبخار المباشر).");
      if (target === 121 && st.time < 15) issues.push("121°م تحتاج ≥15 دقيقة عند 1 بار.");
      if (target === 134 && st.time < 3) issues.push("134°م تحتاج ≥3 دقائق (دورة سريعة).");
      if (st.caps === "tight" && liquids) issues.push("الأغطية المحكمة أفسدت الدورة: انفجار/انحراف القوارير أو احتراق الوسط.");
      if (st.fill === "full") issues.push("الملء الزائد يمنع دوران البخار ويسبب فورانًا للسائل.");
      if (st.items.waste && !(target >= 121 && st.time >= 30)) issues.push("النفايات الحيوية تحتاج 121°م/30 دقيقة على الأقل.");
      if (st.items.pouch && target >= 121 && st.time > 40) issues.push("الأكياس البلاستيكية تتلف مع الدورة الطويلة — استخدم دورة أدوات جافة.");
      const ok = issues.length === 0;
      st.done = { ok }; st.running = false;
      log("--- نهاية الدورة ---");
      log("المؤشر البيولوجي (شريط البوغ): " + (ok ? "تغير إلى اللون الأسود ✔ (نجاح)" : "لم يتغير ✘ (فشل)"));
      box.querySelector("#acOut").innerHTML = '<div class="note ' + (ok ? "s" : "d") + '"><b>' + (ok ? "✔ التعقيم ناجح" : "✘ التعقيم غير كافٍ") + "</b>" +
        (ok ? "تحققت الظروف القياسية: " + target + "°م / " + pressure + " بار / " + st.time + " دقيقة. تُسجَّل الدورة بالتاريخ ورقم التشغيل."
            : '<ul class="list-check small">' + issues.map(i => '<li class="no">' + i + "</li>").join("") + "</ul>") + "</div>" +
        '<div class="row mt"><button class="btn sm ' + (ok ? "" : "primary") + '" onclick="document.getElementById(\'acSave\').click()">🗂 سجّل الدورة</button></div>' +
        '<button id="acSave" class="hide"></button>';
      box.querySelector("#acSave").onclick = () => {
        VL.notebook.add({ session: "الأجهزة", title: "دورة أوتوكلاف", kind: "machine",
          summary: target + "°م / " + st.time + " دقيقة · أغطية " + (st.caps === "loose" ? "مرخيّة" : "محكمة") + " · النتيجة: " + (ok ? "نجاح" : "فشل") + (issues.length ? " | " + issues.join("؛ ") : ""),
          data: { temp: target, time: st.time, items: st.items, ok } });
      };
      VL.store.addXP(ok ? 40 : 12, ok ? "إتمام دورة تعقيم صحيحة" : "تجربة أوتوكلاف (راجع الأخطاء)");
      VL.store.setModule("instruments", Math.max(35, VL.store.getModule("instruments")));
      if (ok) VL.store.setModule("instruments", 70);
    }
    render();
  };

  /* ============================================================= INCUBATOR */
  L.incubator = function (box) {
    if (!box) return;
    const ORGS = [
      { k: "tapc", t: "العدّ الكلي الهوائي (PCA)", temp: [30, 35], time: 48, atm: "aerobic", note: "30°م/72 ساعة لعدّ الفلورا الكلية، أو 35°م/48 ساعة حسب المواصفة." },
      { k: "ecoli", t: "E. coli على MacConkey", temp: [37], time: 24, atm: "aerobic", note: "37°م/24 ساعة — مستعمرات وردية." },
      { k: "sal", t: "Salmonella على XLD", temp: [37], time: 24, atm: "aerobic", note: "37°م/24 ساعة بعد الإثراء في RV عند 41.5°م." },
      { k: "campy", t: "Campylobacter على CCDA", temp: [41, 42], time: 48, atm: "micro", note: "42°م في جو دقيق الأكسجين (5% O₂) — لا ينمو في الهواء العادي." },
      { k: "clost", t: "Clostridium على TSC", temp: [37], time: 24, atm: "anaerobic", note: "37°م لاهوائيًا — عنبر/جرة لاهوائية." },
      { k: "yeast", t: "الخمائر والأعفان على YGC", temp: [25, 28], time: 120, atm: "aerobic", note: "25°م لـ5 أيام — النمو الفطري أبطأ بكثير من البكتيري." },
      { k: "lacto", t: "اللاكتوباسيلس على MRS", temp: [30, 37], time: 72, atm: "micro", note: "30–37°م لاهوائيًا صغريًا 48–72 ساعة." }
    ];
    const st = { org: "ecoli", temp: 37, time: 24, atm: "aerobic", running: false, hours: 0 };
    const render = () => {
      const o = ORGS.find(x => x.k === st.org);
      box.innerHTML = '<div class="grid" style="grid-template-columns:1fr 1fr;gap:16px">' +
        '<div class="inst"><h3 style="margin:0 0 10px">🌡️ محاكي الحاضنة</h3>' +
        '<canvas id="incCv" width="360" height="300" style="width:100%;border-radius:12px;background:#0a1420"></canvas>' +
        '<div class="tempgauge mt"><span class="tiny">20°</span><div class="tempbar"><div id="incMark" style="position:relative;top:-3px;width:10px;height:16px;border-radius:3px;background:#e2f6ff;margin-inline-start:' + ((st.temp - 20) / 40 * 100) + '%"></div></div><span class="tiny">60°</span></div>' +
        '<div class="screen mt">INCUBATOR: ' + st.temp + ' °C · ' + (st.atm === "aerobic" ? "هوائي" : st.atm === "micro" ? "دقيق الأكسجين (5% O₂)" : "لاهوائي") + " · الزمن: " + Math.round(st.hours) + " ساعة / " + st.time + "</div></div>" +
        '<div><div class="card"><h3>⚙️ إعدادات التحضين</h3>' +
        '<label class="f">الكائن/الوسط المطلوب</label><select id="incOrg">' + ORGS.map(x => '<option value="' + x.k + '"' + (x.k === st.org ? " selected" : "") + ">" + x.t + "</option>").join("") + "</select>" +
        '<div class="grid g2 mt"><div><label class="f">درجة الحرارة: <b id="incTt">' + st.temp + "</b>°م</label><input type=\"range\" id=\"incT\" min=\"20\" max=\"60\" step=\"1\" value=\"" + st.temp + '"></div>' +
        '<div><label class="f">الجو</label><select id="incAtm">' + [["aerobic", "هوائي"], ["micro", "دقيق الأكسجين 5% O₂"], ["anaerobic", "لاهوائي"]].map(a => '<option value="' + a[0] + '"' + (a[0] === st.atm ? " selected" : "") + ">" + a[1] + "</option>").join("") + "</select></div></div>" +
        '<div class="mt"><label class="f">الزمن المطلوب (ساعة): <b id="incHt">' + st.time + "</b></label><input type=\"range\" id=\"incH\" min=\"6\" max=\"168\" step=\"6\" value=\"" + st.time + '"></div>' +
        '<div class="row mt"><button class="btn primary" id="incRun">▶ شغّل التحضين</button><button class="btn ghost sm" id="incFast">⌛ سارع الزمن</button></div>' +
        '<div id="incOut" class="mt"></div>' +
        '<div class="note s mt small"><b>المتطلبات المرجعية</b>' + o.note + "</div></div></div></div>";
      box.querySelector("#incOrg").onchange = e => { st.org = e.target.value; const x = ORGS.find(y => y.k === st.org); st.temp = x.temp[0]; st.time = x.time; st.atm = x.atm; render(); };
      box.querySelector("#incT").oninput = e => { st.temp = +e.target.value; box.querySelector("#incTt").textContent = st.temp; box.querySelector("#incMark").style.marginInlineStart = ((st.temp - 20) / 40 * 100) + "%"; };
      box.querySelector("#incAtm").onchange = e => { st.atm = e.target.value; };
      box.querySelector("#incH").oninput = e => { st.time = +e.target.value; box.querySelector("#incHt").textContent = st.time; };
      box.querySelector("#incRun").onclick = () => run();
      box.querySelector("#incFast").onclick = () => run(true);
      drawInc(0);
    };
    function conditions() {
      if (W.VL.say) W.VL.say("inst.incubator");
      const o = ORGS.find(x => x.k === st.org);
      const tempOk = st.temp >= o.temp[0] - 1 && st.temp <= o.temp[o.temp.length - 1] + 1;
      const atmOk = st.atm === o.atm;
      const timeOk = st.time >= o.time;
      return { o, tempOk, atmOk, timeOk };
    }
    function drawInc(growth) {
      const cv = box.querySelector("#incCv"); if (!cv) return;
      const ctx = cv.getContext("2d"), cx = 180, cy = 150, R = 118;
      ctx.clearRect(0, 0, 360, 300);
      const g = ctx.createRadialGradient(cx - 40, cy - 40, 20, cx, cy, R);
      g.addColorStop(0, "#f6ecd6"); g.addColorStop(1, "#d6c8a4");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
      ctx.strokeStyle = "rgba(150,130,90,.6)"; ctx.lineWidth = 4; ctx.stroke();
      const n = Math.round(growth * 120);
      for (let i = 0; i < n; i++) {
        const a = (i * 2.39996) % 6.283, rr = Math.sqrt(i / 120) * (R - 18);
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 1.6 + growth * 2.6, 0, 7);
        ctx.fillStyle = "rgba(250,250,246,.95)"; ctx.fill();
      }
      ctx.fillStyle = "#67e8f9"; ctx.font = "12px monospace";
      ctx.fillText("colonies: " + n + "   t=" + Math.round(st.hours) + "h", 12, 288);
    }
    function run(fast) {
      if (st.running) return; st.running = true; st.hours = 0;
      const c = conditions();
      const speed = fast ? 60 : 240;
      const iv = setInterval(() => {
        st.hours = Math.min(st.time, st.hours + st.time / 12);
        const prog = st.hours / st.time;
        let growth = 0;
        if (c.tempOk && c.atmOk) growth = Math.min(1, Math.pow(prog, .6));
        else if (c.tempOk) growth = Math.min(.45, prog * .45);
        drawInc(growth);
        box.querySelector(".screen").textContent = "INCUBATOR: " + st.temp + " °C · " + (st.atm === "aerobic" ? "هوائي" : st.atm === "micro" ? "دقيق الأكسجين (5% O₂)" : "لاهوائي") + " · الزمن: " + Math.round(st.hours) + " ساعة / " + st.time;
        if (st.hours >= st.time) {
          clearInterval(iv); st.running = false; done(c);
        }
      }, speed);
    }
    function done(c) {
      const issues = [];
      if (!c.tempOk) issues.push("درجة الحرارة " + st.temp + "°م غير مناسبة — المتطلب " + c.o.temp.join("–") + "°م. سيظهر نمو ضعيف أو فلورا غير مستهدفة.");
      if (!c.atmOk) issues.push("الجو غير مناسب: " + c.o.note);
      if (!c.timeOk) issues.push("الزمن أقل من المطلوب (" + c.o.time + " ساعة) — المستعمرات صغيرة ويصعب عدّها.");
      const ok = issues.length === 0;
      box.querySelector("#incOut").innerHTML = '<div class="note ' + (ok ? "s" : "d") + '"><b>' + (ok ? "✔ التحضين ناجح" : "⚠ راجع الإعدادات") + "</b>" +
        (ok ? "الظروف مطابقة للإجراء المعياري: " + c.o.t + " — " + c.o.note : '<ul class="list-check small">' + issues.map(i => '<li class="no">' + i + "</li>").join("") + "</ul>") + "</div>" +
        (ok ? '<div class="row mt"><button class="btn sm primary" id="incSave">🗂 سجّل التحضين في الدفتر</button></div>' : "");
      const sv = box.querySelector("#incSave");
      if (sv) sv.onclick = () => VL.notebook.add({ session: "الأجهزة", title: "تحضين " + c.o.t, kind: "machine",
        summary: st.temp + "°م / " + st.time + " ساعة / جو " + st.atm + " — " + (ok ? "نتيجة صحيحة" : issues.join("؛ ")), data: { temp: st.temp, time: st.time, atm: st.atm, ok } });
      VL.store.addXP(ok ? 30 : 10, ok ? "تحضين بالظروف الصحيحة" : "تجربة تحضين (راجع الشروط)");
      VL.store.setModule("instruments", Math.max(45, VL.store.getModule("instruments")));
    }
    render();
  };

  /* ============================================================= PCR */
  L.pcr = function (box) {
    if (!box) return;
    const st = { n: 8, cycles: 35, den: 95, ann: 58, ext: 72, tden: 15, tann: 30, text: 45, running: false, samples: 4 };
    const render = () => {
      const rxn = { mix2: 12.5, f: 1, r: 1, tpl: 5, water: 5.5 };
      const total = Object.values(rxn).reduce((a, b) => a + b, 0);
      const extra = Math.ceil(st.n * 1.1);
      box.innerHTML = '<div class="grid" style="grid-template-columns:1fr 1.1fr;gap:16px">' +
        '<div class="inst"><h3 style="margin:0 0 8px">🧬 محاكي المُدَوِّر الحراري (Thermal Cycler)</h3>' +
        '<canvas id="pcrCv" width="420" height="200" style="width:100%;border-radius:10px;background:#04140f"></canvas>' +
        '<div class="screen mt" id="pcrScreen">PROGRAM: ' + st.den + "°C/" + st.tden + "s → " + st.ann + "°C/" + st.tann + "s → " + st.ext + "°C/" + st.text + "s × " + st.cycles + " cycles\nREADY.\n</div>" +
        '<div class="prog mt"><i id="pcrProg" style="width:0%"></i></div></div>' +
        '<div><div class="card"><h3>🧪 تحضير خليط التفاعل (25 ميكرولتر/تفاعل)</h3><div class="tblwrap"><table><tbody>' +
        "<tr><th>2× Master Mix</th><td>" + (rxn.mix2 * extra).toFixed(1) + " µL <span class='dim tiny'>(" + rxn.mix2 + " µL × " + extra + ")</span></td></tr>" +
        "<tr><th>البريمير الأمامي (10 µM)</th><td>" + (rxn.f * extra).toFixed(1) + " µL</td></tr>" +
        "<tr><th>البريمير العكسي (10 µM)</th><td>" + (rxn.r * extra).toFixed(1) + " µL</td></tr>" +
        "<tr><th>القالب (Template)</th><td>" + (rxn.tpl * extra).toFixed(1) + " µL</td></tr>" +
        "<tr><th>ماء خالٍ من النيوكلياز</th><td>" + (rxn.water * extra).toFixed(1) + " µL</td></tr>" +
        "<tr><th>الحجم لكل تفاعل</th><td>" + total + " µL (يُحسب " + extra + " تفاعلًا = " + st.n + " + " + (extra - st.n) + " احتياطي)</td></tr>" +
        "</tbody></table></div>" +
        '<div class="grid g2 mt"><div><label class="f">عدد التفاعلات</label><input type="number" id="pcrN" value="' + st.n + '" min="1"></div>' +
        '<div><label class="f">عدد الدورات</label><input type="number" id="pcrC" value="' + st.cycles + '" min="10" max="45"></div></div>' +
        '<div class="grid g2 mt"><div><label class="f">التفكيك (°م)</label><input type="number" id="pcrDen" value="' + st.den + '"></div>' +
        '<div><label class="f">الالتحام (°م)</label><input type="number" id="pcrAnn" value="' + st.ann + '"></div></div>' +
        '<div class="grid g2 mt"><div><label class="f">الاستطالة (°م)</label><input type="number" id="pcrExt" value="' + st.ext + '"></div>' +
        '<div><label class="f">عدد العينات <span class="tiny dim">(pos/neg controls مطلوبة)</span></label><input type="number" id="pcrS" value="' + st.samples + '" min="1" max="8"></div></div>' +
        '<div class="row mt"><button class="btn primary" id="pcrRun">▶ شغّل البرنامج</button><button class="btn ghost sm" id="pcrGel">🧫 اعرض الجلّ</button></div>' +
        '<div id="pcrOut" class="mt"></div></div></div></div>';
      ["pcrN|n", "pcrC|cycles", "pcrDen|den", "pcrAnn|ann", "pcrExt|ext", "pcrS|samples"].forEach(kv => {
        const [id, key] = kv.split("|");
        box.querySelector("#" + id).onchange = e => { st[key] = +e.target.value; render(); };
      });
      box.querySelector("#pcrRun").onclick = run;
      box.querySelector("#pcrGel").onclick = gel;
      drawCurve();
    };
    function drawCurve(progress) {
      if (W.VL.say) W.VL.say("inst.pcr");
      const cv = box.querySelector("#pcrCv"); if (!cv) return;
      const ctx = cv.getContext("2d"), w = 420, h = 200;
      ctx.clearRect(0, 0, w, h);
      const tempY = T => h - 20 - (T - 40) / 70 * (h - 46);
      ctx.strokeStyle = "rgba(134,239,172,.25)";
      [40, 60, 80, 100].forEach(T => { ctx.beginPath(); ctx.moveTo(30, tempY(T)); ctx.lineTo(w - 6, tempY(T)); ctx.stroke(); ctx.fillStyle = "#86efac"; ctx.font = "10px monospace"; ctx.fillText(T + "°", 4, tempY(T) + 3); });
      const stages = [["den", st.den], ["ann", st.ann], ["ext", st.ext]];
      ctx.lineWidth = 2.4; ctx.strokeStyle = "#34d399"; ctx.beginPath();
      let x = 30;
      const cyclesShown = 3;
      ctx.moveTo(x, tempY(25));
      for (let c = 0; c < cyclesShown; c++) {
        stages.forEach(s => {
          x += 16; ctx.lineTo(x, tempY(s[1])); x += 22; ctx.lineTo(x, tempY(s[1]));
        });
      }
      ctx.stroke();
      ctx.fillStyle = "#a5f3fc"; ctx.font = "11px monospace";
      ctx.fillText("95°", 40, tempY(95) - 4); ctx.fillText(st.ann + "°", 74, tempY(st.ann) - 4); ctx.fillText("72°", 108, tempY(72) - 4);
      if (progress != null) { ctx.fillStyle = "rgba(34,211,238,.9)"; ctx.fillRect(30, h - 8, (w - 36) * progress, 4); }
    }
    function run() {
      if (st.running) return; st.running = true;
      const s = box.querySelector("#pcrScreen");
      s.textContent = "PROGRAM: " + st.den + "°C/" + st.tden + "s → " + st.ann + "°C/" + st.tann + "s → " + st.ext + "°C/" + st.text + "s × " + st.cycles + " cycles\n";
      let c = 0;
      const iv = setInterval(() => {
        c++;
        s.textContent += "cycle " + c + "/" + st.cycles + " — copies ≈ 2^" + c + " = " + Math.pow(2, c).toExponential(2) + "\n";
        s.scrollTop = s.scrollHeight;
        box.querySelector("#pcrProg").style.width = (c / st.cycles * 100) + "%";
        drawCurve(c / st.cycles);
        if (c >= st.cycles) {
          clearInterval(iv); st.running = false;
          const issues = [];
          if (st.ann < 50 || st.ann > 68) issues.push("درجة الالتحام " + st.ann + "°م خارج المدى النموذجي (50–68°م): التصاق غير نوعي أو عدم التصاق.");
          if (st.cycles < 25) issues.push("عدد الدورات قليل — الحساسية منخفضة.");
          if (st.cycles > 42) issues.push("دورات كثيرة جدًا — خطر نواتج غير نوعية (تشكّل حزم زائفة).");
          if (st.den > 98) issues.push("التفكيك أعلى من 98°م يُسرّع تلف الإنزيم.");
          s.textContent += "\n--- انتهى البرنامج ---\n";
          box.querySelector("#pcrOut").innerHTML = '<div class="note ' + (issues.length ? "w" : "s") + '"><b>' + (issues.length ? "⚠ راجع البرمجة" : "✔ البرنامج صحيح") + "</b>" +
            (issues.length ? '<ul class="list-check small">' + issues.map(i => '<li class="no">' + i + "</li>").join("") + "</ul>" : "شروط التفاعل مطابقة، وسيعطي الحمض المستهدف ناتجًا نوعيًا.") + "</div>";
          VL.store.addXP(issues.length ? 12 : 35, "تشغيل PCR افتراضي");
          VL.store.setModule("instruments", Math.max(80, VL.store.getModule("instruments")));
        }
      }, 90);
    }
    function gel() {
      const lanes = st.samples + 2;   // + positive + negative control
      const cv = box.querySelector("#pcrCv");
      const ctx = cv.getContext("2d");
      ctx.clearRect(0, 0, 420, 200);
      ctx.fillStyle = "#0b1220"; ctx.fillRect(0, 0, 420, 200);
      const laneW = (420 - 30) / lanes;
      // ladder
      const ladder = [1000, 700, 500, 300, 200, 100];
      ladder.forEach(bp => {
        const y = 190 - (Math.log10(bp) / 3.1) * 170;
        ctx.fillStyle = "rgba(148,163,184,.9)"; ctx.fillRect(8, y, laneW * .6, 3);
      });
      ctx.fillStyle = "#94a3b8"; ctx.font = "9px monospace"; ctx.fillText("L", 12, 198);
      for (let i = 0; i < lanes - 1; i++) {
        const x = 30 + i * laneW;
        const isCtrl = i === lanes - 2, isNeg = i === lanes - 3;
        const positive = isCtrl ? true : isNeg ? false : Math.random() > .45;
        if (positive) {
          const bp = 300;
          const y = 190 - (Math.log10(bp) / 3.1) * 170;
          ctx.fillStyle = "rgba(190,255,220,.95)"; ctx.fillRect(x + 6, y, laneW * .62, 3.6);
          ctx.fillStyle = "rgba(190,255,220,.25)"; ctx.fillRect(x + 6, y - 2, laneW * .62, 8);
        }
        ctx.fillStyle = "#64748b"; ctx.font = "9px monospace";
        ctx.fillText(isCtrl ? "+C" : isNeg ? "-C" : "S" + (i + 1), x + 6, 198);
      }
      ctx.fillStyle = "#86efac"; ctx.font = "11px monospace";
      ctx.fillText("أحجام الحزم (bp) — الهدف 300bp · السالب/المعدّل يظهر أو لا يظهر", 40, 14);
      box.querySelector("#pcrOut").innerHTML = '<div class="note s"><b>قراءة الجلّ</b>حزمة عند 300 pb = نتيجة موجبة (وجود الحمض المستهدف). الضابط الموجب يجب أن يظهر دائمًا، والضابط السالب يجب ألا يظهر — وإلا فالنتيجة غير مقبولة تحليليًا (تلوث أو خطأ في التفاعل).</div>' +
        '<button class="btn sm primary mt" id="pcrSave">🗂 سجّل النتيجة</button>';
      box.querySelector("#pcrSave").onclick = () => VL.notebook.add({ session: "الأجهزة", title: "تشغيل PCR وقراءة الجلّ", kind: "machine",
        summary: "دورات " + st.cycles + " · التفكيك " + st.den + "°م · الالتحام " + st.ann + "°م · الاستطالة " + st.ext + "°م · حجم الهدف 300 pb",
        data: { cycles: st.cycles, den: st.den, ann: st.ann, ext: st.ext } });
      VL.store.addXP(15, "قراءة جلّ PCR");
    }
    render();
  };

  /* ============================================================= pH meter */
  L.phMeter = function (box) {
    if (!box) return;
    const SAMPLES = [{ t: "لبن طازج", ph: 6.7 }, { t: "زبادي", ph: 4.2 }, { t: "عصير برتقال", ph: 3.8 }, { t: "لحم مفروم", ph: 5.8 }, { t: "زيتون مخلل", ph: 3.6 }, { t: "بيض", ph: 7.6 }];
    let s = 0, delta = 0;
    const render = () => {
      const ph = Math.max(1, Math.min(11, SAMPLES[s].ph + delta));
      const zone = ph > 4.6 ? "بكتيريا ممرضة قادرة على النمو (بما فيها C. botulinum)" : ph > 4.0 ? "معظم البكتيريا تتوقف، والخمائر/الأعفان تنمو" : "خمائر وأعفان متحمّلة الحمض فقط (فساد مميز)";
      box.innerHTML = '<div class="grid" style="grid-template-columns:1fr 1fr;gap:16px">' +
        '<div class="inst"><h3 style="margin:0 0 10px">🧪 محاكي مقياس pH</h3>' +
        '<div class="between"><div class="screen" style="flex:1;min-height:70px"><span style="font-size:1.8rem;color:#86efac">' + ph.toFixed(2) + "</span>  pH\n" + SAMPLES[s].t + (delta ? "  (أُضيف " + (delta > 0 ? "حمض" : "قلوي") + ")" : "") + "</div>" +
        '<div style="font-size:3rem">🧫</div></div>' +
        '<div class="mt"><label class="f">أضف حمضًا (يمين) أو قلويًا (يسار) — تغيّر pH</label><input type="range" id="phR" min="-2.5" max="2.5" step="0.05" value="' + delta + '">' +
        '<div class="gauge"><span>حمضي جدًا</span><span>متوسط</span><span>قلوي</span></div></div>' +
        '<div class="note ' + (ph > 4.6 ? "w" : "s") + ' mt"><b>ماذا يعني هذا الرقم؟</b>' + zone + "</div></div>" +
        '<div class="card"><h3>🎚 اختر العيّنة</h3><div class="chips">' + SAMPLES.map((x, i) => '<button class="chip' + (i === s ? " on" : "") + '" data-s="' + i + '">' + x.t + "</button>").join("") + "</div>" +
        '<div class="tblwrap mt"><table><thead><tr><th>المدى</th><th>ما ينمو</th><th>مثال غذائي</th></tr></thead><tbody>' +
        "<tr><td>4.6 – 9</td><td>معظم البكتيريا (سبب خطر كبير)</td><td>لحوم، ألبان، معلبات منخفضة الحموضة</td></tr>" +
        "<tr><td>4.0 – 4.6</td><td>بكتيريا مقاومة للحمض (لاكتيك، بعض المطثيات)</td><td>طماطم، خضروات مخمرة</td></tr>" +
        "<tr><td>2.5 – 4.0</td><td>خمائر وأعفان متحمّلة (فساد ملوّن/تعكر)</td><td>عصائر، مربّى، مخللات</td></tr>" +
        "<tr><td>&lt; 2.5</td><td>بعض الخمائر فقط، ونادرًا ما تنتقل المسببات</td><td>ليمون، خلّ، مشروبات حمضية</td></tr>" +
        "</tbody></table></div>" +
        '<div class="note s mt small"><b>قاعدة عملية</b>pH 4.6 هو الحد الفاصل لخطر المطثية الوشيقية في المعلبات؛ لذلك تُصنّف المعلبات إلى «حمضية» و«منخفضة الحموضة» (تحتاج تعقيمًا أقوى).</div></div></div>';
      box.querySelector("#phR").oninput = e => { delta = +e.target.value; render(); };
      box.querySelectorAll("[data-s]").forEach(b => b.onclick = () => { s = +b.getAttribute("data-s"); delta = 0; if (W.VL.say) W.VL.say("inst.ph"); render(); });
      VL.store.setModule("instruments", Math.max(20, VL.store.getModule("instruments")));
    };
    render();
  };

  /* ============================================================= water activity */
  L.awMeter = function (box) {
    if (!box) return;
    const PRODUCTS = [{ t: "لحم طازج", aw: .99 }, { t: "جبن نصف جاف", aw: .95 }, { t: "خبز", aw: .94 }, { t: "جبن مُعتّق/طري", aw: .91 }, { t: "مربّى", aw: .85 }, { t: "عسل", aw: .60 }, { t: "حبوب مقرمشة", aw: .35 }, { t: "حليب مجفف", aw: .20 }];
    let i = 0, addSalt = 0;
    const render = () => {
      const aw = Math.max(.1, PRODUCTS[i].aw - addSalt * .006);
      const zone = aw >= .91 ? "خطر عالٍ: البكتيريا (بما فيها الأكثر خطورة) تنمو" : aw >= .6 ? "خمائر/أعفان متوسمية فقط — مع إمكانية نمو بطيء" : "لا نمو ميكروبي فعلي — حفظ طويل الأمد";
      box.innerHTML = '<div class="grid" style="grid-template-columns:1fr 1fr;gap:16px">' +
        '<div class="inst"><h3 style="margin:0 0 10px">💧 محاكي النشاط المائي (a<sub>w</sub>)</h3>' +
        '<div class="screen" style="min-height:80px"><span style="font-size:1.8rem;color:#86efac">' + aw.toFixed(2) + "</span>  a<sub>w</sub>\n" + PRODUCTS[i].t + (addSalt ? "  (+" + (addSalt * 2).toFixed(0) + "% ملح/سكر)" : "") + "</div>" +
        '<div class="mt"><label class="f">أضف ملحًا/سكرًا (يقلل المتاح من الماء)</label><input type="range" id="awR" min="0" max="12" step=".5" value="' + addSalt + '"></div>' +
        '<div class="note ' + (aw >= .91 ? "d" : aw >= .6 ? "w" : "s") + ' mt"><b>التفسير</b>' + zone + "</div>" +
        '<div class="tblwrap mt"><table><thead><tr><th>المدى</th><th>الميكروبات</th></tr></thead><tbody>' +
        "<tr><td>&gt; 0.98</td><td>معظم البكتيريا الممرضة والفسادية</td></tr>" +
        "<tr><td>0.95 – 0.98</td><td>معظم البكتيريا (Listeria حتى 0.92)</td></tr>" +
        "<tr><td>0.91 – 0.95</td><td>Staphylococcus aureus (يُنتج التوكسين >0.86)</td></tr>" +
        "<tr><td>0.80 – 0.91</td><td>أعفان وخمائر متوسمية</td></tr>" +
        "<tr><td>&lt; 0.60</td><td>لا نمو (حفظ بفعل الجفاف)</td></tr></tbody></table></div></div>" +
        '<div class="card"><h3>🥫 اختر المنتج</h3><div class="chips">' + PRODUCTS.map((p, k) => '<button class="chip' + (k === i ? " on" : "") + '" data-p="' + k + '">' + p.t + "</button>").join("") + "</div>" +
        '<div class="note s mt small"><b>الفرق المهم</b>a<sub>w</sub> ليس «نسبة الماء» بل <b>الماء المتاح</b>: العسل يحتوي ماءً كثيرًا لكن aw منخفض جدًا لأن السكر يرتبط بالماء. لهذا لا ينمو فيه إلا القليل جدًا من الخمائر المتوسمية.</div>' +
        '<div class="note w mt small"><b>تطبيق صناعي</b>خفض aw بالتمليح أو التجفيف أو إضافة السكر هو أحد أقدم وأقوى أساليب الحفظ — ويُقاس للتحكم في درجة الحفظ (Hurdle Technology).</div></div></div>';
      box.querySelector("#awR").oninput = e => { addSalt = +e.target.value; render(); };
      box.querySelectorAll("[data-p]").forEach(b => b.onclick = () => { i = +b.getAttribute("data-p"); addSalt = 0; if (W.VL.say) W.VL.say("inst.aw"); render(); });
      VL.store.setModule("instruments", Math.max(20, VL.store.getModule("instruments")));
    };
    render();
  };

  /* ============================================================= centrifuge + spectrophotometer */
  L.centrifuge = function (box) {
    if (!box) return;
    const st = { r: 10, rpm: 8000, running: false };
    const render = () => {
      const rcf = 1.118e-5 * st.r * st.rpm * st.rpm / 100 * 100;   // RCF = 1.118e-5 × r(cm) × rpm²
      box.innerHTML = '<div class="inst"><h3 style="margin:0 0 10px">🌀 محاكي جهاز الطرد المركزي</h3>' +
        '<div class="grid g2"><div><label class="f">نصف قطر الدوّار (سم)</label><input type="number" id="cfR" value="' + st.r + '" min="3" max="30">' +
        '<label class="f">السرعة (دورة/دقيقة)</label><input type="number" id="cfRpm" value="' + st.rpm + '" min="500" max="18000" step="500"></div>' +
        '<div class="screen" id="cfScreen">RCF = ' + (rcf / 100).toFixed(0) + " × g\n" + (st.rpm > 12000 ? "⚠ سرعة عالية: استخدم أنابيب متوازنة ومقاومة" : "وضع طبيعي") + "</div></div>" +
        '<div class="row mt"><button class="btn primary" id="cfRun">▶ شغّل</button><button class="btn ghost sm" id="cfInfo">💡 لماذا g وليس RPM؟</button></div>' +
        '<div id="cfOut" class="mt"></div></div>';
      const upd = () => {
        const rcf2 = 1.118e-5 * st.r * st.rpm * st.rpm;
        box.querySelector("#cfScreen").innerHTML = "RCF = " + rcf2.toFixed(0) + " × g\n" + (st.rpm > 12000 ? "⚠ سرعة عالية: تأكد من التوازن الدقيق" : "الجاذبية المحسوبة تعتمد على نصف القطر والسرعة");
      };
      box.querySelector("#cfR").oninput = e => { st.r = +e.target.value; upd(); };
      box.querySelector("#cfRpm").oninput = e => { st.rpm = +e.target.value; upd(); };
      box.querySelector("#cfRun").onclick = () => {
      if (W.VL.say) W.VL.say("inst.centrifuge");
        const rcf2 = 1.118e-5 * st.r * st.rpm * st.rpm;
        const ok = rcf2 > 3000;
        box.querySelector("#cfOut").innerHTML = '<div class="note ' + (ok ? "s" : "w") + '"><b>' + (ok ? "ترسيب مناسب للخلايا البكتيرية" : "قوة طرد منخفضة") + "</b>" +
          "الخلايا البكتيرية تحتاج عادة 3000–8000 × g لمدة 10 دقائق. محاكاة نتيجة: " + (ok ? "روبة مرئية في قاع الأنبوب ✔" : "العينات لم تترسب بشكل واضح ✘") +
          '<div class="mt small">RCF = 1.118×10⁻⁵ × r(cm) × (RPM)² = ' + rcf2.toFixed(0) + " × g</div></div>" +
          '<button class="btn sm primary mt" id="cfSave">🗂 سجّل التشغيل</button>';
        box.querySelector("#cfSave").onclick = () => { if (W.VL.say) W.VL.say("inst.centrifuge");
          VL.notebook.add({ session: "الأجهزة", title: "تشغيل جهاز الطرد المركزي", kind: "machine",
            summary: st.rpm + " دورة/دقيقة عند r=" + st.r + " سم → " + rcf2.toFixed(0) + " × g (" + (ok ? "ترسيب جيد" : "غير كافٍ") + ")", data: { rpm: st.rpm, r: st.r, rcf: rcf2 } });
          VL.store.addXP(15, "حساب قوة الطرد المركزي"); };
      };
      box.querySelector("#cfInfo").onclick = () => VL.UI.modal("RPM أم g؟", '<p>RPM تصف سرعة الدوران فقط، لكن قوة الطرد الفعلية تعتمد على نصف قطر الدوّار:</p>' +
        '<div class="eq">RCF = 1.118 × 10⁻⁵ × r (cm) × (RPM)²</div><p>جهازان بسرعة 8000 دورة/دقيقة وبنصف قطر مختلف يُنتجان قوتين مختلفتين تمامًا. لذلك تُكتب بروتوكولات الطرد دائمًا بـ <b>×g</b>.</p>');
    };
    render();
  };
  L.spectro = function (box) {
    if (!box) return;
    let od = 0.35, dil = 1;
    const render = () => {
      const cells = od * 8e8 * dil;
      const linear = od <= 1.0;
      box.innerHTML = '<div class="inst"><h3 style="margin:0 0 10px">📈 محاكي مقياس الطيف الضوئي (OD600)</h3>' +
        '<div class="between"><div class="screen" style="flex:1">WAVELENGTH 600 nm\nABS = <b style="color:#a5f3fc">' + od.toFixed(3) + "</b>" + (dil > 1 ? "\nمعامل التخفيف: ×" + dil : "") + "</div>" +
        '<div style="font-size:2.4rem">💡</div></div>' +
        '<div class="grid g2 mt"><div><label class="f">العيّنة: صلابة اللون في الأنبوب <span class="tiny dim">(قياس OD)</span></label><input type="range" id="spOd" min="0" max="2" step="0.01" value="' + od + '"></div>' +
        '<div><label class="f">معامل التخفيف قبل القياس</label><select id="spDil">' + [1, 2, 5, 10, 100].map(d => '<option value="' + d + '"' + (d === dil ? " selected" : "") + ">1 : " + d + "</option>").join("") + "</select></div></div>" +
        '<div class="note ' + (linear ? "s" : "w") + ' mt"><b>' + (linear ? "قياس في النطاق الخطي ✔" : "خارج النطاق الخطي ✘") + "</b>" +
        (linear ? "قيمة OD بين 0.1 و1.0 تُعطي ارتباطًا جيدًا مع عدد الخلايا." : "القياس عالٍ (>1.0): العيّنة تُشتّت الضوء بشكل غير خطي — خفّف العيّنة وأعد القياس ثم اضرب في معامل التخفيف.") + "</div>" +
        '<div class="disc mt"><div class="eq">العدد التقديري = OD × 8 × 10⁸ × معامل التخفيف = <b>' + cells.toExponential(2) + "</b> CFU/مل</div></div>" +
        '<div class="row mt"><button class="btn sm primary" id="spSave">🗂 سجّل القياس</button><a class="btn sm ghost" href="dilution.html">🧪 قارن مع العدّ على الطبق</a></div>' +
        '<div class="note w mt small"><b>حدود الطريقة</b>OD يقيس كل الجسيمات (حتى الميتة منها) ولا يميّز النوع أو الحيوية؛ لذا يُستخدم للمتابعة السريعة، ويُعتمد العدّ على الأطباق أو طرق الأحياء المجهرية عند الحاجة لدقة قانونية.</div></div>';
      box.querySelector("#spOd").oninput = e => { od = +e.target.value; render(); };
      box.querySelector("#spDil").onchange = e => { dil = +e.target.value; render(); };
      box.querySelector("#spSave").onclick = () => { if (W.VL.say) W.VL.say("inst.spectro");
        VL.notebook.add({ session: "الأجهزة", title: "قياس الكثافة الضوئية OD600", kind: "machine",
          summary: "OD = " + od.toFixed(3) + " · تخفيف 1:" + dil + " → " + cells.toExponential(2) + " خلية/مل تقديريًا", data: { od, dil, cells } }); };
    };
    render();
  };

  /* ============================================================= cold chain */
  L.coldChain = function (box) {
    if (!box) return;
    const ROWS = [
      { t: "لحم ودواجن مبرّدة", temp: "0 إلى 4°م", risk: "الليستيريا تنمو في التبريد — العمر محدود والأهم سلسلة مستمرة" },
      { t: "أسماك مبرّدة", temp: "0 إلى 2°م (ثلج)", risk: "Pseudomonas سريع، وفساد أميني (هيستامين) في التونة" },
      { t: "حليب مبستر", temp: "≤ 4°م", risk: "الحمل الميكروبي يتضاعف بمعدل يومي — لا تُعد البسترة حماية أبدية" },
      { t: "منتجات مخبوزة محشوة", temp: "≤ 5°م", risk: "كريمات القشدة بيئة ممتازة لـ S. aureus والتوكسين" },
      { t: "مجمّد −18°م", temp: "−18°م أو أقل", risk: "التجميد يوقف النمو لكنه لا يقتل — الخلايا تستأنف بعد الإذابة" }
    ];
    box.innerHTML = '<div class="tblwrap"><table><thead><tr><th>المنتج</th><th>الحرارة المثالية</th><th>الخطر الميكروبي الأساسي</th></tr></thead><tbody>' +
      ROWS.map(r => "<tr><td><b>" + r.t + "</b></td><td>" + r.temp + "</td><td>" + r.risk + "</td></tr>").join("") +
      '</tbody></table></div><div class="note w mt"><b>قاعدة «2 ساعة / 4 ساعات»</b>الأغذية القابلة للفساد لا تبقى في «منطقة الخطر» (5–60°م) أكثر من ساعتين. وإذا تجاوزت 4 ساعات فإن الحل الوحيد الآمن هو التخلص منها — التبريد المتأخر لا يعيد سلامة الغذاء.</div>';
    VL.store.setModule("instruments", Math.max(60, VL.store.getModule("instruments")));
  };

  W.LABS = L;
})(window);
