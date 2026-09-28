/* ==========================================================================
   labs-media.js — media preparation calculator, plate reading simulator,
   colony morphology gallery
   ========================================================================== */
(function (W) {
  "use strict";
  const VL = W.VL;
  const L = W.LABS = W.LABS || {};

  /* ---------------------------------------------------------- recipes */
  const RECIPES = [
    { k: "pca", n: "Plate Count Agar (PCA)", g: 23.5, ph: 7.0, use: "العدّ الكلي للكائنات الهوائية", heat: "121°م / 15 دقيقة", notes: "يُسكب في أطباق (15 مل/طبق)" },
    { k: "na", n: "Nutrient Agar (NA)", g: 28, ph: 7.0, use: "الاستنبات العام وتدريب التقنيات", heat: "121°م / 15 دقيقة", notes: "مناسب لجلسات النقل المعقّم" },
    { k: "tsa", n: "Tryptic Soy Agar (TSA)", g: 40, ph: 7.3, use: "العدّ الكلي ومنتجات الألبان", heat: "121°م / 15 دقيقة", notes: "غني بالعناصر الغذائية" },
    { k: "mac", n: "MacConkey Agar", g: 50, ph: 7.1, use: "عزل وتفريق السالبة للجرام", heat: "121°م / 15 دقيقة", notes: "يُسلَّم ساخنًا 50°م للسكب" },
    { k: "xld", n: "XLD Agar", g: 55, ph: 7.4, use: "عزل السالمونيلا والشيغيلا", heat: "121°م / 15 دقيقة", notes: "لا تُسخّن أكثر من اللازم (حساس للحرارة)" },
    { k: "msa", n: "Mannitol Salt Agar", g: 111, ph: 7.4, use: "المكورات العنقودية", heat: "121°م / 15 دقيقة", notes: "ملح 7.5% — وسط انتقائي" },
    { k: "bp", n: "Baird-Parker Agar", g: 63, ph: 7.0, use: "عدّ S. aureus", heat: "121°م / 15 دقيقة", notes: "تُضاف المكمّلات (الإيمولسين + التلوريت) بعد التبريد" },
    { k: "vrbg", n: "VRB Glucose Agar", g: 41.5, ph: 7.4, use: "عدد إنتروبكتيريا", heat: "121°م / 15 دقيقة", notes: "لا يُسخّن طويلًا لتفادي القضاء على النظام الانتخابي" },
    { k: "mrs", n: "MRS Agar", g: 66, ph: 6.2, use: "البكتيريا اللاكتيكية", heat: "121°م / 15 دقيقة", notes: "حضن 30–37°م في جو لاهوائي صغري" },
    { k: "pda", n: "Potato Dextrose Agar", g: 39, ph: 5.6, use: "الفطريات", heat: "121°م / 15 دقيقة", notes: "حضن 25°م — لا تُسلَّم ساخنًا جدًا" },
    { k: "sab", n: "Sabouraud Agar", g: 65, ph: 5.6, use: "الفطريات والخمائر", heat: "121°م / 15 دقيقة", notes: "حموضة منخفضة تقلل نمو البكتيريا" },
    { k: "ygc", n: "YGC Agar", g: 62, ph: 6.6, use: "عدّ الخمائر والأعفان", heat: "121°م / 15 دقيقة", notes: "يُضاف الكلورامفينيكول لاحقًا" },
    { k: "bpw", n: "Buffered Peptone Water", g: 25.5, ph: 7.0, use: "الإثراء غير الانتقائي", heat: "121°م / 15 دقيقة", notes: "يُوزّع 225 مل في قوارير" },
    { k: "tsb", n: "Tryptic Soy Broth", g: 30, ph: 7.3, use: "الاستنبات السائل", heat: "121°م / 15 دقيقة", notes: "9 مل في أنابيب للجلسات" },
    { k: "tcbs", n: "TCBS Agar", g: 89, ph: 8.6, use: "الأنماط الضمية", heat: "121°م / 15 دقيقة", notes: "لا تُسخّن زائدًا عن اللزوم (البروموثيمول)" }
  ];

  L.mediaPrep = function (box) {
    if (!box) return;
    let cur = RECIPES[0], volume = 500, mode = "plates", vessels = 30;
    const render = () => {
      const grams = cur.g * volume / 1000;
      const perVessel = mode === "plates" ? 15 : 9;
      const needed = Math.floor(volume / perVessel);
      box.innerHTML = '<div class="grid" style="grid-template-columns:1fr 1fr;gap:16px">' +
        '<div class="inst"><h3 style="margin:0 0 10px">🧾 حاسبة تحضير الأوساط</h3>' +
        '<label class="f">الوسط المطلوب</label><select id="mpRec">' + RECIPES.map((r, i) => '<option value="' + r.k + '"' + (r.k === cur.k ? " selected" : "") + ">" + r.n + " — " + r.g + " غ/ل</option>").join("") + "</select>" +
        '<div class="grid g2 mt"><div><label class="f">حجم الماء المقطر (مل)</label><input type="number" id="mpVol" value="' + volume + '" step="50"></div>' +
        '<div><label class="f">التوزيع</label><select id="mpMode"><option value="plates"' + (mode === "plates" ? " selected" : "") + ">أطباق (15 مل)</option>" +
        '<option value="tubes"' + (mode === "tubes" ? " selected" : "") + ">أنابيب (9 مل)</option></select></div></div>" +
        '<div class="grid g2 mt"><div><label class="f">كمية الكاشف الموزانة (غ) — اكتب تقديرك ثم تحقّق</label><input type="text" id="mpGuess" placeholder="مثال: 11.75"></div>' +
        '<div><label class="f">عدد الأوعية المطلوبة</label><input type="text" id="mpVes" value="' + vessels + '"></div></div>' +
        '<div class="row mt"><button class="btn primary" id="mpCheck">تحقّق من الحساب</button><button class="btn" id="mpCook">🔥 ابدأ التحضير والتعقيم</button></div>' +
        '<div id="mpOut" class="mt"></div></div>' +
        '<div><div class="card"><h3>📋 بطاقة الوسط</h3><div class="tblwrap"><table><tbody>' +
        "<tr><th>الاستخدام</th><td>" + cur.use + "</td></tr>" +
        "<tr><th>الكمية القياسية</th><td>" + cur.g + " غ / لتر</td></tr>" +
        "<tr><th>الـ pH المستهدف</th><td>" + cur.ph + "</td></tr>" +
        "<tr><th>التعقيم</th><td>" + cur.heat + "</td></tr>" +
        "<tr><th>ملاحظات مهمة</th><td>" + cur.notes + "</td></tr>" +
        "</tbody></table></div></div>" +
        '<div class="card mt"><h3>🧮 الحساب الفوري</h3>' +
        '<div class="eq">الكتلة (غ) = (' + cur.g + ' غ/ل) × (' + volume + ' مل ÷ 1000) = <b id="mpG">' + grams.toFixed(2) + "</b> غ</div>" +
        '<div class="small muted">+ ' + volume + " مل ماء مقطر → " + (mode === "plates" ? needed + " طبقًا (15 مل)" : needed + " أنبوبًا (9 مل)") + "</div>" +
        '<div class="note w mt small"><b>تنبيهات عملية</b>الملء لا يزيد عن ⅔ حجم القارورة، والأغطية مرخيّة قليلًا أثناء التعقيم، والسكب عند 50°م، ولا يُسكب طبق قبل تجمد الطبقة تمامًا.</div>' +
        "</div></div></div>";
      box.querySelector("#mpRec").onchange = e => { cur = RECIPES.find(r => r.k === e.target.value); render(); };
      box.querySelector("#mpVol").oninput = e => { volume = +e.target.value || 0; render(); };
      box.querySelector("#mpMode").onchange = e => { mode = e.target.value; render(); };
      box.querySelector("#mpCheck").onclick = () => {
        if (W.VL.say) W.VL.say("media.prep");
        const g = parseFloat(String(box.querySelector("#mpGuess").value).replace(",", "."));
        const v = parseInt(box.querySelector("#mpVes").value, 10);
        const devG = Math.abs(g - grams) / grams * 100, devV = Math.abs(v - needed);
        box.querySelector("#mpOut").innerHTML =
          '<div class="note ' + (devG <= 3 && devV === 0 ? "s" : "w") + '"><b>نتيجة التحقق</b>' +
          "الكتلة المطلوبة: " + grams.toFixed(2) + " غ (خطؤك " + (isFinite(devG) ? devG.toFixed(1) + "%" : "غير محدد") + ") · عدد الأوعية: " +
          needed + " أوعية (إجابتك " + (isNaN(v) ? "—" : v) + ")</div>";
        if (devG <= 3 && devV === 0) VL.store.addXP(15, "حساب تحضير وسط صحيح");
      };
      box.querySelector("#mpCook").onclick = () => {
        if (W.VL.say) W.VL.say("media.cook");
        const steps = [
          ["وزن المسحوق على ورقة وزن على ميزان حساس", "✔ " + grams.toFixed(2) + " غ"],
          ["إضافة الماء المقطر " + volume + " مل + تحريك حتى الذوبان", "✔ محلول متجانس"],
          ["قياس pH وضبطه إلى " + cur.ph + " باستخدام NaOH أو HCl", "✔ pH مضبوط"],
          ["توزيع في " + (mode === "plates" ? "قوارير" : "أنابيب") + " وإغلاق الأغطية مرخيّة", "✔ " + needed + " وحدة"],
          ["تعقيم الأوتوكلاف " + cur.heat, "✔ الدورة مكتملة"],
          ["تبريد إلى 50°م ثم السكب/الاستخدام", "✔ جاهز للاستخدام"]
        ];
        let i = 0;
        box.querySelector("#mpOut").innerHTML = '<div class="panel2" id="mpSteps"><b>خطوات التحضير:</b><ul class="list-check small mt" id="mpList"></ul></div>';
        const iv = setInterval(() => {
          if (i >= steps.length) {
            clearInterval(iv);
            VL.UI.toast("🎉 الوسط جاهز ومعقّم — سُجّلت الوصفة في دفترك", "g");
            VL.store.addXP(30, "تحضير وسط كامل");
            VL.store.setModule("media", Math.max(70, VL.store.getModule("media")));
            VL.notebook.add({ session: "الأوساط والتحضير", title: "تحضير " + cur.n, kind: "media",
              summary: volume + " مل · " + grams.toFixed(2) + " غ مسحوق · " + needed + (mode === "plates" ? " طبقًا" : " أنبوبًا") + " · تعقيم " + cur.heat,
              data: { medium: cur.k, volume, grams: +grams.toFixed(2), vessels: needed } });
            return;
          }
          const li = document.createElement("li"); li.innerHTML = steps[i][0] + " — <b>" + steps[i][1] + "</b>";
          box.querySelector("#mpList").appendChild(li); i++;
        }, 550);
      };
    };
    render();
  };

  /* ---------------------------------------------------------- plate reading */
  const PLATES = {
    mac: {
      n: "MacConkey Agar", base: "#c2405a", tint: "#b8324c",
      rows: [
        { o: "E. coli", col: "#f472b6", halo: "#fde68a", txt: "مستعمرات وردية/أحمر بلمعان قد يظهر معدنيًا — مخمّرة لللاكتوز وتُنتج حمضًا فيتحول مؤشر الأسود الأحمر" },
        { o: "Klebsiella", col: "#fca5a5", halo: "#fef3c7", txt: "مستعمرات وردية مُخاطية كبيرة (محفظة) — مخمّرة للاكتوز" },
        { o: "Salmonella", col: "#f1f5f9", halo: null, txt: "مستعمرات شاحبة/عديمة اللون — غير مخمّرة لللاكتوز (سالبة)" },
        { o: "Shigella", col: "#e2e8f0", halo: null, txt: "شاحبة بلا لون — غير مخمّرة، وتُقرأ كسالبة/مشتبهة" },
        { o: "Pseudomonas", col: "#cbd5e1", halo: "#bbf7d0", txt: "شاحبة مع لون أخضر-مزرق أحيانًا ورائحة عطرية مميزة" },
        { o: "S. aureus", col: "#f1f5f9", halo: null, txt: "لا نمو أو نمو ضعيف جدًا — الوسط يثبّط الموجبة للجرام" }
      ]
    },
    xld: {
      n: "XLD Agar", base: "#c0392b", tint: "#a82c20",
      rows: [
        { o: "Salmonella", col: "#ef4444", black: true, txt: "مستعمرات حمراء بمركز أسود (إنتاج H₂S) — العلامة المميزة" },
        { o: "Shigella", col: "#ef4444", txt: "مستعمرات حمراء بلا مركز أسود — غير مُنتجة لـ H₂S" },
        { o: "E. coli", col: "#facc15", txt: "مستعمرات صفراء (تخمير الزيلوز واللاكتوز مع إنتاج حمض)" },
        { o: "Proteus", col: "#fb923c", black: true, txt: "مستعمرات برتقالية/حمراء بمركز أسود — شائع في الأغذية كمُنتج لـ H₂S" },
        { o: "Pseudomonas", col: "#f97316", txt: "نمو أحمر-برتقالي بلا مركز أسود — لا يُخمّر الزيلوز" }
      ]
    },
    msa: {
      n: "Mannitol Salt Agar", base: "#c05a3a", tint: "#a94a2f",
      rows: [
        { o: "S. aureus", col: "#fbbf24", halo: "#fde68a", txt: "مستعمرات صفراء/ذهبية مع اصطفار الوسط (تخمير المانيتول) = مشتبهة قوية" },
        { o: "Staphylococcus epidermidis", col: "#f8fafc", txt: "مستعمرات بيضاء/كريمية بلا اصطفار الوسط (لا تُخمّر المانيتول)" },
        { o: "Bacillus", col: "#e2e8f0", txt: "نمو أحيانًا بعد التحضين الطويل — تُستبعد بالشكل والنمط" },
        { o: "E. coli", col: "#f1f5f9", txt: "لا نمو — الملح 7.5% يثبّط الموجبة/السالبة الحساسة للملح" }
      ]
    },
    bp: {
      n: "Baird-Parker Agar", base: "#3f3f46", tint: "#27272a",
      rows: [
        { o: "S. aureus", col: "#111827", halo: "#a5f3fc", txt: "مستعمرات سوداء لامعة محاطة بهالة مضيئة (تحلل الدهون) — مؤكدة مبدئيًا" },
        { o: "Staphylococcus spp.", col: "#1f2937", txt: "مستعمرات سوداء بلا هالة مضيئة (لا تحلل الإيمولسين)" },
        { o: "Proteus", col: "#4b5563", txt: "مستعمرات بنية/سوداء مع «تنقيط» (Swarming) أحيانًا" }
      ]
    },
    tcbs: {
      n: "TCBS Agar", base: "#166534", tint: "#15803d",
      rows: [
        { o: "Vibrio cholerae", col: "#facc15", txt: "مستعمرات صفراء كبيرة (تخمير السكروز) — ضمّية مشتبهة" },
        { o: "V. parahaemolyticus", col: "#22c55e", txt: "مستعمرات خضراء/زرقاء مخضرة (لا تُخمّر السكروز)" },
        { o: "V. vulnificus", col: "#4ade80", txt: "مستعمرات خضراء/زرقاء مشابهة — تحتاج تأكيدًا بيوكيميائيًا" },
        { o: "Enterobacteriaceae", col: "#fde047", txt: "نمو محدود أصفر — يُستبعد بالتأكيد الكامل" }
      ]
    },
    aloa: {
      n: "ALOA / PALCAM (Listeria)", base: "#1e293b", tint: "#111827",
      rows: [
        { o: "L. monocytogenes", col: "#22c55e", halo: "#134e4a", txt: "مستعمرات خضراء-مزرقة بهالة معتمة (تحلل الإسكولين) — لموجب الليستيريا" },
        { o: "L. innocua", col: "#4ade80", txt: "مستعمرات مشابهة بلا هالة واضحة — تحتاج تأكيدًا جينيًا/مصليًا" },
        { o: "Enterococcus", col: "#a3e635", txt: "نمو أخضر محدود — يُستبعد بالتأكيد" }
      ]
    },
    pca: {
      n: "Plate Count Agar (PCA)", base: "#e8dcbb", tint: "#d9cba4",
      rows: [
        { o: "بكتيريا متنوعة", col: "#f8fafc", txt: "مستعمرات بيضاء/كريمية بأحجام وأشكال مختلفة = العدّ الكلي الهوائي" },
        { o: "Bacillus", col: "#f1f5f9", txt: "مستعمرات كبيرة مسطحة خيطية الحواف (تُشبه العفن) — مميزة بالشكل" },
        { o: "Yeasts", col: "#fef3c7", txt: "مستعمرات دائرية ملساء لامعة كبيرة — تُعدّ في العدّ الكلي عند 25–30°م" },
        { o: "Molds", col: "#86efac", txt: "مستعمرات زغبية ملوّنة — لا تدخل في العدّ الكلي البكتيري" }
      ]
    },
    ygc: {
      n: "YGC Agar", base: "#f3e8c8", tint: "#e5d6a8",
      rows: [
        { o: "Yeasts", col: "#fef9c3", txt: "مستعمرات كريمية/وردية دائرية ملساء — تُعدّ كخمائر" },
        { o: "Molds", col: "#4ade80", txt: "مستعمرات زغبية ملوّنة (أخضر/أسود/أصفر) — تُعدّ كأعفان" },
        { o: "Bacteria", col: "#e2e8f0", txt: "لا نمو — الكلورامفينيكول يثبّط البكتيريا" }
      ]
    }
  };
  L.plateReading = function (box, challengeBox) {
    if (!box) return;
    let key = "mac", org = 0;
    const render = () => {
      const p = PLATES[key], row = p.rows[org];
      box.innerHTML = '<div class="grid" style="grid-template-columns:300px 1fr;gap:16px">' +
        '<div><svg viewBox="0 0 220 220" width="100%"><circle cx="110" cy="110" r="96" fill="' + p.base + '" stroke="rgba(0,0,0,.35)" stroke-width="3"/>' +
        colonyField(p, row) + "</svg>" +
        '<div class="small muted center mt">' + p.n + " — " + row.o + "</div></div>" +
        '<div><label class="f">اختر الوسط</label><select id="prMed">' + Object.keys(PLATES).map(k => '<option value="' + k + '"' + (k === key ? " selected" : "") + ">" + PLATES[k].n + "</option>").join("") + "</select>" +
        '<label class="f">اختر الكائن المشتبه به</label><select id="prOrg">' + p.rows.map((r, i) => '<option value="' + i + '"' + (i === org ? " selected" : "") + ">" + r.o + "</option>").join("") + "</select>" +
        '<div class="note mt"><b>القراءة المخبرية</b>' + row.txt + "</div>" +
        '<div class="tblwrap mt"><table><thead><tr><th>الكائن</th><th>المظهر على الوسط</th></tr></thead><tbody>' +
        p.rows.map(r => "<tr><td><b>" + r.o + "</b></td><td>" + r.txt + "</td></tr>").join("") + "</tbody></table></div>" +
        '<div class="row mt"><a class="btn sm ghost" href="pathogens.html">🦠 تفاصيل الكائن وخطورته</a><button class="btn sm" id="prSave">🗂 سجّل القراءة</button></div></div></div>';
      box.querySelector("#prMed").onchange = e => { key = e.target.value; org = 0; render(); };
      box.querySelector("#prOrg").onchange = e => { org = +e.target.value; render(); };
      box.querySelector("#prSave").onclick = () => {
        if (W.VL.say) W.VL.say("media.read");
        VL.notebook.add({ session: "الأوساط والقراءة", title: "قراءة " + p.n + " — " + p.rows[org].o, kind: "media",
          summary: p.rows[org].txt, data: { medium: key, organism: p.rows[org].o } });
        VL.store.addXP(6, "تسجيل قراءة وسط");
        VL.store.setModule("media", Math.max(50, VL.store.getModule("media")));
      };
    };
    render();
    if (challengeBox) challengeBox.innerHTML = '<div id="prChallenge"></div>';
    if (challengeBox) {
      const c = challengeBox.querySelector("#prChallenge");
      let attempt = 0;
      const start = () => {
        const mk = VL.pick(Object.keys(PLATES)), pi = PLATES[mk], ri = Math.floor(Math.random() * pi.rows.length), row = pi.rows[ri];
        const others = VL.shuffle(pi.rows.filter((_, i) => i !== ri)).slice(0, 3);
        const opts = VL.shuffle([row.o, ...others.map(o => o.o)]);
        c.innerHTML = '<div class="card"><h3>🎯 تحدي قراءة الأطباق</h3><p class="small muted">على الوسط <b>' + pi.n + "</b> ظهر المظهر التالي — من هو الكائن؟</p>" +
          '<svg viewBox="0 0 220 220" width="200">' + '<circle cx="110" cy="110" r="96" fill="' + pi.base + '" stroke="rgba(0,0,0,.35)" stroke-width="3"/>' + colonyField(pi, row) + "</svg>" +
          '<div class="mt">' + opts.map(o => '<button class="btn sm mb" style="display:block;width:100%;text-align:start" data-o="' + VL.esc(o) + '">' + o + "</button>").join("") + "</div><div id='prRes' class='mt'></div></div>";
        if (W.VL.say) W.VL.say("media.challenge");
        c.querySelectorAll("[data-o]").forEach(b => b.onclick = () => {
          const ok = b.getAttribute("data-o") === row.o;
          c.querySelector("#prRes").innerHTML = '<div class="note ' + (ok ? "s" : "d") + '"><b>' + (ok ? "✔ صحيح" : "✘ الإجابة الصحيحة: " + row.o) + "</b>" + row.txt + "</div>" +
            '<button class="btn primary sm mt" id="prAgain">🎲 ظهور آخر</button>';
          c.querySelector("#prAgain").onclick = start;
          VL.store.addXP(ok ? 20 : 5, "تحدي قراءة الأطباق");
          if (ok) attempt++;
          if (attempt >= 3) VL.store.addBadge("plate-reader", "قارئ أطباق موثوق");
        });
      };
      start();
    }
  };
  function colonyField(p, row) {
    let s = "";
    const n = 26;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283 + Math.sin(i) * .6, r = 18 + Math.sqrt((i + 1) / n) * 74;
      const x = 110 + Math.cos(a) * r, y = 110 + Math.sin(a) * r, rad = 5 + (i % 3);
      if (row.halo) s += '<circle cx="' + x + '" cy="' + y + '" r="' + (rad + 6) + '" fill="' + row.halo + '" opacity=".45"/>';
      s += '<circle cx="' + x + '" cy="' + y + '" r="' + rad + '" fill="' + row.col + '" stroke="rgba(0,0,0,.35)"/>';
      if (row.black) s += '<circle cx="' + x + '" cy="' + y + '" r="' + (rad * .45) + '" fill="#111827"/>';
    }
    return s;
  }

  /* ---------------------------------------------------------- colony morphology */
  L.colonyMorph = function (box) {
    if (!box) return;
    const shapes = [
      { t: "دائرية (Circular)", d: "حواف منتظمة تمامًا", svg: '<circle cx="60" cy="60" r="34" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/>' },
      { t: "غير منتظمة (Irregular)", d: "حواف متعرجة", svg: '<path d="M30 60 q8 -28 30 -26 q26 -4 30 24 q6 28 -22 32 q-30 6 -38 -30z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/>' },
      { t: "خيطية (Filamentous)", d: "خطوط متشابكة كالقاعدة الفطرية", svg: '<g stroke="#94a3b8" stroke-width="2" fill="none"><path d="M18 80 q20 -40 44 -20 q22 18 40 -18"/><path d="M20 62 q22 -34 44 -14"/><path d="M30 92 q24 -34 50 -12"/></g>' },
      { t: "جذرية (Rhizoid)", d: "امتدادات جذرية من المركز", svg: '<g stroke="#94a3b8" stroke-width="3" fill="none"><path d="M60 60 L24 30"/><path d="M60 60 L96 30"/><path d="M60 60 L20 84"/><path d="M60 60 L100 88"/><path d="M60 60 L60 100"/></g><circle cx="60" cy="60" r="12" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/>' },
      { t: "نقطية (Punctiform)", d: "مستعمرات صغيرة جدًا كالنقاط", svg: '<g fill="#e2e8f0" stroke="#94a3b8"><circle cx="40" cy="45" r="4"/><circle cx="66" cy="38" r="3.4"/><circle cx="52" cy="62" r="4.4"/><circle cx="76" cy="66" r="3.2"/><circle cx="38" cy="76" r="3.6"/></g>' },
      { t: "مُغزلية (Spindle)", d: "بيضاوية مستطيلة الطرفين", svg: '<ellipse cx="60" cy="60" rx="40" ry="18" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/>' }
    ];
    const terms = [
      ["الشكل (Form)", "دائرية · غير منتظمة · خيطية · جذرية · نقطية · مغزلية"],
      ["الارتفاع (Elevation)", "مسطحة · محدبة · بلوطية (Pulvinate) · مرتفعة · غائرة"],
      ["الحافة (Margin)", "منتظمة · مشرشرة · مُلَوَّزة (Lobate) · زغبية (Filamentous) · متموجة"],
      ["اللون (Colour)", "وردي · أبيض · أصفر · سوداء · زرقاء-خضراء · بلا لون"],
      ["الملمح (Opacity)", "معتمة · شفافة · شبه شفافة (Translucent)"],
      ["السطح (Surface)", "لامع · جاف · مخاطي (Mucoid) · مسحوقي · مطوية (Rugose)"]
    ];
    box.innerHTML = '<div class="grid g3">' + shapes.map(s => '<div class="card center"><div class="instrument-figure"><svg viewBox="0 0 120 120" width="120">' + s.svg + "</svg></div><b>" + s.t + "</b><p class=\"small muted\">" + s.d + "</p></div>").join("") + "</div>" +
      '<div class="card mt"><h3>🏷 مفردات وصف المستعمرة</h3><div class="tblwrap"><table><tbody>' +
      terms.map(t => "<tr><th style=\"width:170px\">" + t[0] + "</th><td>" + t[1] + "</td></tr>").join("") +
      "</tbody></table></div><div class=\"note s mt small\"><b>نصيحة عملية</b>اكتب دائمًا وصفًا كاملًا: الحجم (مم) + الشكل + الحافة + الارتفاع + اللون + السطح. هذا يسمح لغيرك بإعادة التعرف على المستعمرة من وصفك.</div></div>";
  };

  W.LABS = L;
})(window);
