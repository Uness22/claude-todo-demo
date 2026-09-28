/* ==========================================================================
   labs-dilution.js — serial dilution · spread plating · colony counting ·
   CFU calculation · MPN (3-tube) reading
   ========================================================================== */
(function (W) {
  "use strict";
  const VL = W.VL;
  const L = W.LABS = W.LABS || {};

  function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function poisson(l) { if (l < 25) { let L0 = Math.exp(-l), k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L0); return k - 1; } return Math.max(0, Math.round(l + Math.sqrt(l) * randn())); }

  /* ======================================================= serial dilution */
  L.dilution = function (box, plateBox) {
    if (!box) return;
    const N0POW = 5 + Math.random() * 2;                 // log CFU/g of the sample (unknown to the student)
    const N0 = Math.pow(10, N0POW);
    const TUBES = 6;                                     // 10-1 … 10-6
    let level = 0;                                       // how many transfers done
    let plated = null;                                   // {tube, count, expected}
    let colonies = [], counted = 0, incubated = false;

    const conc = i => N0 / Math.pow(10, i + 1);           // CFU per mL in tube i (i=0 → 10-1)

    function tubeRow() {
      return '<div class="tube-row2">' + Array.from({ length: TUBES }, (_, i) => {
        const c = conc(i);
        const alpha = Math.min(.92, .12 + (Math.log10(c) / 8) * .9);
        const active = i <= level;
        return '<div class="dil-tube' + (i === level && level < TUBES - 1 ? " on" : "") + '">' +
          '<div class="gl"><div class="lq" style="height:' + (active ? 62 : 0) + "%;background:linear-gradient(180deg,rgba(226,232,240," + alpha + "),rgba(203,213,225," + alpha + '))"></div>' +
          '<div class="lbl">10<sup>-' + (i + 1) + "</sup></div></div>" +
          '<div class="tiny">' + (i === 0 ? "متجانس" : "أنبوب " + (i + 1)) + "</div>" +
          '<button class="btn xs ghost mt" data-plate="' + i + '"' + (active && !plated ? "" : " disabled") + ">ازرع</button></div>";
      }).join("") + "</div>";
    }
    function render() {
      box.innerHTML =
        '<div class="grid" style="grid-template-columns:1.4fr 1fr;gap:16px"><div><div class="inst">' +
        '<div class="between"><h3 style="margin:0">🧪 منصة التخفيف المتسلسل</h3><span class="pill">مخفف: محلول ملحي فسيولوجي 0.85% — 9 مل/أنبوب</span></div>' +
        '<div class="note mt"><b>الخطوة الأولى</b>وزن 10 غ من العيّنة + 90 مل مخفف = تخفيف 10⁻¹ (المتجان). ثم نقل 1 مل إلى 9 مل = تخفيف 10⁻² وهكذا.</div>' +
        '<div class="mt">' + tubeRow() + "</div>" +
        '<div class="row mt" style="justify-content:center"><button class="btn primary" id="mix">🌀 اخلط (Vortex)</button>' +
        '<button class="btn" id="transfer" ' + (level >= TUBES - 1 ? "disabled" : "") + ">💧 انقل 1 مل إلى الأنبوب التالي</button>" +
        '<button class="btn ghost sm" id="newSample">🧫 عيّنة عشوائية جديدة</button></div>' +
        '<div class="prog mt"><i style="width:' + (level / (TUBES - 1) * 100) + '%"></i></div>' +
        '<p class="small muted mt" id="dilMsg">كل نقل لا بد أن يكون من الأنبوب السابق مع تغيير الطرف/الماصة — هذا شرط الدقة.</p>' +
        "</div>" +
        '<div class="card mt"><h3>📊 سجل التخفيف</h3><div class="tblwrap"><table><thead><tr><th>الأنبوب</th><th>معامل التخفيف</th><th>مستوى الخلط</th></tr></thead><tbody>' +
        Array.from({ length: TUBES }, (_, i) => "<tr><td>10<sup>-" + (i + 1) + "</sup></td><td>" + Math.pow(10, i + 1).toLocaleString("en-US") + "×</td><td>" + (i <= level ? "مخلوط ✔" : "—") + "</td></tr>").join("") +
        "</tbody></table></div></div></div>" +
        '<div><div class="card"><h3>🎯 خطواتك</h3><ul class="steps small">' +
        '<li class="' + (level >= 0 ? "" : "") + '">حضّر المتجانس 10⁻¹ (وزن + مخفف)</li>' +
        '<li>انقل 1 مل تباعًا مع الخلط قبل كل نقل</li>' +
        '<li>ازرع 0.1 مل على طبق PCA ووزّعها بمدفع زجاجي</li>' +
        '<li>أحضن 30°م/72 ساعة (أو 37°م/48 ساعة)</li>' +
        "<li>عدّ الأطباق في نطاق 30–300 واحسب CFU/غ</li></ul>" +
        '<div class="note s mt small"><b>تذكّر</b>الهدف هو الحصول على طبق يقع عدّه في نطاق 30–300 مستعمرة؛ إذا كان الطبق ممتلئًا فاختر تخفيفًا أعلى.</div></div>' +
        '<div class="card mt"><h3>🧮 النتيجة المحسوبة</h3><div id="dilResult"><p class="small muted">— لم تُزرع أي عيّنة بعد —</p></div></div></div></div>';

      box.querySelector("#transfer").onclick = () => {
        if (level >= TUBES - 1) return;
        level++;
        VL.UI.toast("تم نقل 1 مل → 10⁻" + (level + 1) + " (مع خلط الأنبوب المصدر قبل النقل)", "c");
        render();
        box.querySelector("#dilMsg").innerHTML = "أصبح لديك تخفيف 10⁻" + (level + 1) + ". " + (level >= 3 ? "جرّب الزرع من تخفيف عالٍ لرؤية مستعمرات قابلة للعدّ." : "استمر في التسلسل.");
      };
      box.querySelector("#mix").onclick = () => { VL.UI.toast("🌀 خلط جيد — التوزيع أصبح متجانسًا", "g"); VL.store.addXP(2, "خلط الأنبوب"); };
      box.querySelector("#newSample").onclick = () => location.reload();
      box.querySelectorAll("[data-plate]").forEach(b => b.onclick = () => {
        const i = +b.getAttribute("data-plate");
        plated = { tube: i, expected: conc(i) * 0.1 };
        colonies = []; counted = 0; incubated = false;
        renderPlate();
      });
      renderPlate();
    }
    function renderPlate() {
      if (!plateBox) return;
      if (!plated) { plateBox.innerHTML = '<div class="card"><p class="muted small">اختر أنبوبًا واضغط «ازرع» لتظهر لك طبق البتري والنمو المتوقع بعد التحضين.</p></div>'; return; }
      plateBox.innerHTML =
        '<div class="inst"><div class="between"><h3 style="margin:0">🧫 طبق النشر — تخفيف 10<sup>-' + (plated.tube + 1) + "</sup> (0.1 مل)</h3>" +
        '<span class="badge ' + (plated.expected >= 30 && plated.expected <= 300 ? "g" : "a") + '">العدد المتوقع في النطاق القابل للعدّ: ' + (plated.expected >= 30 && plated.expected <= 300 ? "نعم ✔" : "لا ✘") + "</span></div>" +
        '<div class="grid" style="grid-template-columns:1fr 1fr;gap:14px" class="mt">' +
        '<div><canvas id="plateCv" width="360" height="360" style="width:100%;max-width:340px;border-radius:50%;background:#e9dcbb;cursor:pointer"></canvas>' +
        '<div class="row mt"><button class="btn sm primary" id="incub">🌡 احضن 30°م / 72 ساعة</button>' +
        '<button class="btn sm ghost" id="autoCount" disabled>🔎 عدّ تلقائي (للمقارنة)</button></div></div>' +
        '<div><div class="panel2"><b>العدّ اليدوي:</b> اضغط كل مستعمرة لتسجيلها. <span class="badge c" id="cntBadge">0</span>' +
        '<p class="tiny dim mt">القاعدة: عدّ المستعمرات المنفصلة فقط، وتجاهل المستعمرات المندمجة، واعتمد نطاق 30–300.</p></div>' +
        '<div class="mt"><label class="f">عدد المستعمرات التي عددتها</label><input type="number" id="cntIn" min="0" placeholder="مثال: 78">' +
        '<label class="f">الحجم المزروع (مل)</label><input type="number" id="volIn" value="0.1" step="0.1">' +
        '<label class="f">معامل التخفيف للأنبوب</label><input type="text" id="dilIn" value="10⁻' + (plated.tube + 1) + '" readonly>' +
        '<div class="row mt"><button class="btn primary" id="calcBtn">🧮 احسب CFU/غ</button><button class="btn ghost sm" id="hintBtn">💡 اشرح لي</button></div>' +
        '<div id="calcOut" class="mt"></div></div></div></div></div>';
      const cv = plateBox.querySelector("#plateCv"), ctx = cv.getContext("2d");
      const CX = 180, CY = 180, R = 168;
      function drawPlate() {
        ctx.clearRect(0, 0, 360, 360);
        const g = ctx.createRadialGradient(CX - 40, CY - 50, 30, CX, CY, R);
        g.addColorStop(0, "#f7edd6"); g.addColorStop(.8, "#e6d8b4"); g.addColorStop(1, "#c9b78c");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(CX, CY, R, 0, 7); ctx.fill();
        ctx.strokeStyle = "rgba(120,100,60,.55)"; ctx.lineWidth = 4; ctx.stroke();
        colonies.forEach(c => {
          ctx.beginPath(); ctx.arc(c.x, c.y, 3.4, 0, 7);
          ctx.fillStyle = c.counted ? "#86efac" : "#fbfbf7"; ctx.fill();
          ctx.strokeStyle = c.counted ? "#16a34a" : "rgba(120,110,80,.5)"; ctx.lineWidth = 1; ctx.stroke();
          if (c.counted) { ctx.strokeStyle = "rgba(22,163,74,.55)"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(c.x, c.y, 6.4, 0, 7); ctx.stroke(); }
        });
      }
      cv.addEventListener("click", e => {
        if (!incubated) { VL.UI.toast("احضن الطبق أولًا 🙃", "w"); return; }
        const r = cv.getBoundingClientRect(), sx = 360 / r.width, sy = 360 / r.height;
        const p = { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
        let best = null, bd = 11;
        colonies.forEach(c => { if (c.counted) return; const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < bd) { bd = d; best = c; } });
        if (best) {
          best.counted = true; counted++;
          plateBox.querySelector("#cntBadge").textContent = counted;
          plateBox.querySelector("#cntIn").value = counted;
          drawPlate();
          if (counted === 5) VL.store.addXP(5, "بدأت العدّ اليدوي");
        }
      });
      plateBox.querySelector("#incub").onclick = () => {
        if (incubated) return;
        incubated = true;
        const lambda = Math.max(0, plated.expected);
        const n = poisson(lambda);
        colonies = []; counted = 0;
        const inner = R - 16;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * 6.283, rr = Math.sqrt(Math.random()) * inner;
          colonies.push({ x: CX + Math.cos(a) * rr, y: CY + Math.sin(a) * rr, counted: false });
        }
        drawPlate();
        plateBox.querySelector("#autoCount").disabled = false;
        plateBox.querySelector("#autoCount").onclick = () => {
          colonies.forEach(c => c.counted = true); counted = colonies.length;
          plateBox.querySelector("#cntBadge").textContent = counted;
          plateBox.querySelector("#cntIn").value = counted;
          drawPlate();
          VL.UI.toast("العدّ الآلي: " + counted + " مستعمرة (استخدمه للمقارنة فقط — العدّ اليدوي هو المهارة المطلوبة)", "c");
        };
        VL.UI.toast("بعد التحضين ظهرت المستعمرات — ابدأ العدّ بالضغط عليها", "g");
      };
      plateBox.querySelector("#calcBtn").onclick = () => {
        const cnt = +plateBox.querySelector("#cntIn").value;
        const vol = +plateBox.querySelector("#volIn").value;
        if (!cnt || !vol) { VL.UI.toast("أدخل عدد المستعمرات والحجم المزروع", "w"); return; }
        const df = Math.pow(10, plated.tube + 1);
        const cfuPerMl = cnt / (vol * (1 / df));                    // per mL of tube-1 (homogenate)
        const cfuPerG = cfuPerMl / 1;                                // 10 g in 90 mL → 1 mL homogenate ≈ 0.1 g sample
        const perGram = cnt / (vol * (1 / df)) / 10;                 // sample mass factor
        const trueVal = N0;
        const deviation = Math.abs(perGram - trueVal) / trueVal * 100;
        const ok = deviation <= 25;
        plateBox.querySelector("#calcOut").innerHTML =
          '<div class="eq">CFU/g = العدد ÷ (الحجم × معامل التخفيف) ÷ وزن العيّنة المرجعي<br>' +
          "CFU/g = " + cnt + " ÷ (0.1 × 10⁻" + (plated.tube + 1) + ") ÷ 10 = " + perGram.toExponential(2) + " CFU/g</div>" +
          '<div class="note ' + (ok ? "s" : "w") + '"><b>' + (ok ? "حساب مطابق ✔" : "راجع حسابك ⚠") + "</b>" +
          "القيمة المرجعية (الحقيقية للعيّنة) ≈ " + trueVal.toExponential(2) + " CFU/g، والفرق " + deviation.toFixed(1) + "%.</div>";
        VL.store.addXP(ok ? 25 : 8, "حساب CFU");
        VL.notebook.add({ session: "التخفيف والعدّ", title: "حساب CFU/غ من طبق النشر", kind: "cfu",
          summary: "التخفيف 10⁻" + (plated.tube + 1) + " · حجم 0.1 مل · عدد " + cnt + " مستعمرة → " + perGram.toExponential(2) + " CFU/g (خطأ " + deviation.toFixed(1) + "%)",
          data: { tube: plated.tube + 1, colonies: cnt, cfu: perGram } });
        if (VL.store.getModule("dilution") < 60) VL.store.setModule("dilution", 60);
      };
      plateBox.querySelector("#hintBtn").onclick = () => VL.UI.modal("كيف أحسب؟",
        '<div class="eq">CFU/g = (عدد المستعمرات) ÷ (حجم المزروع × معامل التخفيف) ÷ وزن العيّنة الذي يمثله 1 مل</div>' +
        '<ol class="steps small"><li>معامل التخفيف للأنبوب: 10⁻' + (plated.tube + 1) + " ← أي 1/10<sup>" + (plated.tube + 1) + "</sup></li>" +
        "<li>نقسم على حجم المزروع (0.1 مل) لتحصل على CFU/مل في الأنبوب</li>" +
        "<li>نضرب في معامل التخفيف للرجوع إلى المتجان 10⁻¹</li>" +
        "<li>نقسم على 10 لأن المتجان يحتوي 10 غ في 100 مل ← كل 1 مل يمثل 0.1 غ</li></ol>");
    }
    render();
  };

  /* ======================================================= CFU calculator trainer */
  L.cfuCalc = function (box) {
    if (!box) return;
    let ex = newEx();
    function newEx() {
      const counts = [40, 66, 88, 120, 145, 172, 210, 236];
      return { counts, vol: VL.pick([0.1, 0.2, 1]), dil: VL.pick([3, 4, 5]), c: VL.pick(counts), mass: VL.pick([10, 25]) };
    }
    function answer() { const e = ex; return e.c / (e.vol * Math.pow(10, -e.dil)) / (e.mass / (e.mass * 9 + e.mass)) * 1; }
    function target() {   // sample of W g in 9W diluent → 1 ml homogenate = W/10W... simpler: sample 10 g + 90 mL
      const e = ex;
      const perMlHomog = e.c / (e.vol * Math.pow(10, -e.dil));
      const perG = perMlHomog / 10;   // 10 g in 100 mL total
      return perG;
    }
    function render() {
      box.innerHTML = '<div class="card"><h3>🧮 تدريب حسابات CFU</h3>' +
        '<p class="small muted">عيّنة وزنها 10 غ مخلوطة مع 90 مل مخفف (المتجان 10⁻¹). وُزع 0.1 مل على الطبق من التخفيف 10⁻' + ex.dil + "، وكان عدد المستعمرات في النطاق القابل للعدّ = " + ex.c + ".</p>" +
        '<div class="grid g2"><div><label class="f">احسب CFU/غ (استخدم الصيغة العلمية أو رقمًا عاديًا)</label>' +
        '<input type="text" id="cfuIn" placeholder="مثال: 8.8e5 أو 880000"><div class="row mt">' +
        '<button class="btn primary" id="cfuCheck">تحقّق من إجابتي</button><button class="btn ghost sm" id="cfuNew">🔄 تمرين جديد</button></div>' +
        '<div id="cfuMsg" class="mt"></div></div><div><div class="eq">CFU/g = العدد ÷ (الحجم × معامل التخفيف) ÷ وزن العيّنة المعادل</div>' +
        '<p class="small muted">بما أن 1 مل من المتجان يمثل 0.1 غ من العيّنة (10 غ في 100 مل)، فإن القسمة النهائية تكون ÷10.</p></div></div></div>';
      box.querySelector("#cfuCheck").onclick = () => {
        const v = parseFloat(String(box.querySelector("#cfuIn").value).replace(/[×x*]/gi, "e").replace(/[^\deE.+-]/g, ""));
        const t = target();
        if (!isFinite(v)) { VL.UI.toast("اكتب قيمة عددية (يمكن استخدام الصيغة العلمية مثل 8.8e5)", "w"); return; }
        const dev = Math.abs(v - t) / t * 100;
        const ok = dev <= 10;
        box.querySelector("#cfuMsg").innerHTML = '<div class="note ' + (ok ? "s" : "d") + '"><b>' + (ok ? "إجابة صحيحة ✔" : "غير مطابق") + "</b>" +
          "الإجابة المرجعية: " + t.toExponential(2) + " CFU/g. الفرق " + dev.toFixed(1) + "%.</div>";
        if (ok) { VL.store.addXP(20, "حساب CFU صحيح"); VL.store.setModule("dilution", Math.max(80, VL.store.getModule("dilution"))); }
      };
      box.querySelector("#cfuNew").onclick = () => { ex = newEx(); render(); };
    }
    render();
  };

  /* ======================================================= MPN game */
  const MPN_TABLE = { "000": "<3", "100": "3.6", "101": "7.2", "110": "7.4", "111": "11", "200": "9.2", "201": "14", "210": "15", "211": "20", "300": "23", "301": "38", "310": "43", "311": "75", "320": "93", "321": "150", "322": "210", "330": "240", "331": "460", "332": "1100", "333": ">2400" };
  L.mpn = function (box) {
    if (!box) return;
    const combos = Object.keys(MPN_TABLE).filter(k => k !== "000");
    let key = VL.pick(combos);
    let marked = ["", "", ""];
    function render() {
      box.innerHTML = '<div class="card"><h3>🧾 اختبار MPN — طريقة الأنابيب الثلاثية</h3>' +
        '<p class="small muted">ثلاثة أنابيب من مرق اللاكتوز المُرّي لكل تخفيف (10⁻¹ · 10⁻² · 10⁻³). كل أنبوب موجب يظهر عكارة و/أو غازًا. اقرأ النمط ثم استخرج القيمة من جدول MPN.</p>' +
        '<div class="grid g3">' + [0, 1, 2].map(d => '<div class="panel2"><b>تخفيف 10⁻' + (d + 1) + "</b><div class=\"row mt\">" +
          [0, 1, 2].map(i => {
            const on = marked[d] && marked[d][i] === "1";
            return '<button class="btn xs ' + (on ? "green" : "ghost") + '" data-t="' + d + '-' + i + '">' + (on ? "🧫 موجب (غاز)" : "💧 سالب") + "</button>";
          }).join("") + "</div></div>").join("") + "</div>" +
        '<div class="row mt"><button class="btn primary" id="mpnRead">🔍 اكشف الأنابيب الحقيقية واقرأ النمط</button>' +
        '<button class="btn ghost sm" id="mpnNew">🎲 اختبار جديد</button></div>' +
        '<div id="mpnOut" class="mt"></div>' +
        '<details class="acc mt"><summary>📖 جدول MPN المرجعي (أنابيب 3 × تخفيفات 0.1 و0.01 و0.001 غ/مل)</summary><div class="body"><div class="tblwrap"><table><thead><tr><th>النمط (٣ أنابيب لكل تخفيف)</th><th>MPN/g</th></tr></thead><tbody>' +
        Object.keys(MPN_TABLE).map(k => "<tr><td>" + k.split("").join(" ") + "</td><td>" + MPN_TABLE[k] + "</td></tr>").join("") +
        "</tbody></table></div><p class='small dim mt'>القيم لمستويات الثقة 95% القياسية؛ وتُعتمد الجداول الرسمية في التشريع.</p></div></details></div>";
      box.querySelectorAll("[data-t]").forEach(b => b.onclick = () => {
        const [d, i] = b.getAttribute("data-t").split("-").map(Number);
        marked[d] = (marked[d] || "000").split("").map((x, j) => j === i ? (x === "1" ? "0" : "1") : x).join("");
        render();
      });
      box.querySelector("#mpnRead").onclick = () => {
        marked = key.split("");
        render();
        const val = MPN_TABLE[key];
        box.querySelector("#mpnOut").innerHTML = '<div class="note s"><b>النمط الحقيقي: ' + key.split("").join(" ") + "</b>" +
          "ابحث عنه في الجدول ثم أدخل النتيجة: " + '<div class="row mt"><input type="text" id="mpnIn" placeholder="مثال: 150" style="max-width:160px">' +
          '<button class="btn sm primary" id="mpnChk">تحقّق</button></div><div id="mpnMsg" class="mt"></div></div>';
        box.querySelector("#mpnChk").onclick = () => {
          const v = String(box.querySelector("#mpnIn").value).trim();
          const exp = val.replace(">", "").trim();
          const ok = v === exp || (val[0] === ">" && +v >= +exp) || Math.abs(parseFloat(v) - parseFloat(exp)) < .05;
          box.querySelector("#mpnMsg").innerHTML = '<b class="' + (ok ? "" : "") + '">' + (ok ? "✔ صحيح — القيمة المرجعية " + val + " MPN/g" : "✘ القيمة المرجعية " + val + " MPN/g") + "</b><br>" +
            "طريقة MPN تعطي تقديرًا إحصائيًا (لا عدًا مباشرًا) وهي الأنسب للأعداد المنخفضة أو الميكروبات المتضررة.";
          if (ok) VL.store.addXP(20, "قراءة MPN صحيحة");
        };
      };
      box.querySelector("#mpnNew").onclick = () => { key = VL.pick(combos); marked = ["", "", ""]; render(); };
      if (VL.store.getModule("dilution") < 100) VL.store.setModule("dilution", Math.max(80, VL.store.getModule("dilution")));
    }
    render();
  };

  /* ======================================================= reference limits */
  L.limits = function (box) {
    if (!box) return;
    box.innerHTML = '<div class="tblwrap"><table><thead><tr><th>المؤشر</th><th>الحدّ المرجعي الشائع</th><th>ملاحظة</th></tr></thead><tbody>' +
      W.DATA.LIMITS.map(l => "<tr><td><b>" + l.t + "</b></td><td>" + l.lim + "</td><td class=\"small muted\">" + l.n + "</td></tr>").join("") +
      "</tbody></table></div><p class=\"small dim mt\">الحدود تختلف بحسب الدولة ونوع المنتج ومرحلة الاستخدام (خام/جاهز للاستهلاك). المرجع الرسمي هو اللائحة المحلية أو المواصفة القياسية للمنتج.</p>";
  };

  W.LABS = L;
})(window);
