/* ==========================================================================
   labs-bench.js — aseptic transfer + four-quadrant streak plate simulator
   ========================================================================== */
(function (W) {
  "use strict";
  const VL = W.VL;
  const L = W.LABS = W.LABS || {};

  /* =============================== aseptic transfer trainer */
  const ASEPTIC = [
    { id: "flame1", t: "🔥 عقّم العروة على اللهب حتى الاحمرار", ok: "عقّمت العروة. تذكّر: العمل قرب اللهب يقلل تلوث الهواء.", bad: "الترتيب خاطئ — عقّم العروة أولًا قبل لمس أي شيء." },
    { id: "cool", t: "❄️ برّد العروة قرب اللهب (بدون لمس المنصة)", ok: "التبريد ضروري: العروة الساخنة تقتل اللقاح وتُصدر رذاذًا ملوثًا.", bad: "الترتيب خاطئ — العروة لا تزال ساخنة أو لم تُعقَّم." },
    { id: "open", t: "🧪 افتح أنبوب اللقاح بحمل الغطاء بين الأصابع قرب اللهب", ok: "فتح الأنبوب قرب اللهب يمنع دخول الجراثيم.", bad: "الترتيب خاطئ — افتح الأنبوب بعد تعقيم العروة وتبريدها." },
    { id: "take", t: "💧 خذ اللقاح بحركة واحدة سريعة ثم أعد غطاء الأنبوب", ok: "الحركة السريعة تقلل فرصة التلوث.", bad: "الترتيب خاطئ — لم تأخذ اللقاح بعد." },
    { id: "plate", t: "🧫 ارفع غطاء الطبق بزاوية وأجرِ الخط الأول", ok: "الغطاء يُرفع جزئيًا فقط لتقليل تعرض الأجار للهواء.", bad: "الترتيب خاطئ — ابدأ الخطوط بعد أخذ اللقاح." },
    { id: "flame2", t: "🔥 أعِد تعقيم العروة قبل الخط التالي", ok: "التعقيم بين الخطوط هو سرّ الحصول على مستعمرات منفصلة.", bad: "الترتيب خاطئ." },
    { id: "close", t: "🔒 أعد غطاء الطبق وألصق التسمية الثلاثية", ok: "التسمية: رقم العيّنة + الوسط + التاريخ/المجموعة قبل التحضين.", bad: "الترتيب خاطئ." }
  ];
  L.aseptic = function (box) {
    if (!box) return;
    let i = 0, errors = 0;
    const render = () => {
      box.innerHTML =
        '<p class="small muted">اضغط على الإجراءات بالترتيب الصحيح لتمثيل نقل لقاح من أنبوب إلى طبق بتقنية معقّمة. أي خطأ في الترتيب سيُسجَّل.</p>' +
        '<div class="grid g2"><div>' + VL.shuffle(ASEPTIC.slice()).map(s => '<button class="btn sm mb" style="display:block;width:100%;text-align:start" data-a="' + s.id + '">' + s.t + "</button>").join("") + "</div>" +
        '<div><div class="panel2" id="asepLog"><b>سجل الخطوات:</b><ol class="steps small mt" id="asepSteps"></ol></div>' +
        '<div class="note ' + (errors ? "w" : "s") + ' mt" id="asepMsg">الخطوة الحالية: <b>' + (i < ASEPTIC.length ? ASEPTIC[i].t : "انتهى التمرين ✔") + "</b></div>" +
        '<div class="small muted mt">عدد الأخطاء: <b id="asepErr">' + errors + "</b></div></div></div>";
      box.querySelectorAll("[data-a]").forEach(b => b.onclick = () => {
        const id = b.getAttribute("data-a");
        if (i >= ASEPTIC.length) return;
        const want = ASEPTIC[i];
        if (id === want.id) {
          VL.UI.toast("✔ " + want.ok, "g");
          const li = document.createElement("li"); li.innerHTML = want.t;
          document.getElementById("asepSteps").appendChild(li);
          i++;
          if (i === ASEPTIC.length) {
            VL.store.setModule("bench", 100);
            VL.store.addXP(40, "إتمام تمرين النقل المعقّم");
            VL.notebook.add({ session: "الزرع والتقنيات", title: "تمرين النقل المعقّم", kind: "session",
              summary: "أُنجزت جميع خطوات النقل المعقّم بأخطاء: " + errors, data: { steps: ASEPTIC.length, errors } });
          }
          render();
        } else {
          errors++;
          VL.UI.toast("✘ " + (ASEPTIC.find(x => x.id === id).bad || "ترتيب غير صحيح"), "r");
          render();
        }
      });
    };
    render();
  };

  /* =============================== streak plate simulator */
  L.streak = function (box) {
    if (!box) return;
    const PZ = [];   // strokes: [{sector, pts:[{x,y}]}]
    let sector = 0, flamed = true, streakDone = [false, false, false, false], incubated = false, colonies = [];
    let drawing = false, curPts = [], lastFlame = true, trayState = "idle";

    box.innerHTML =
      '<div class="grid" style="grid-template-columns:1.1fr 1fr;gap:16px">' +
      '<div><div class="panel" style="text-align:center"><canvas id="plate" width="360" height="360" style="max-width:100%;cursor:crosshair;border-radius:50%"></canvas>' +
      '<div class="row mt" style="justify-content:center">' +
      '<button class="btn sm amber" id="flame">🔥 عقّم العروة</button>' +
      '<button class="btn sm primary" id="incubate">🌡 احضن 37°م / 24 ساعة</button>' +
      '<button class="btn sm ghost" id="reset">♻ طبق جديد</button></div>' +
      '<div class="mt small" id="plateMsg">ارسم الخط الأول في المنطقة المظللة (1) بالسحب على الأجار.</div></div></div>' +
      '<div><div class="card"><h3>🧫 خطة الزرع بالخطوط الأربعة</h3>' +
      '<ol class="steps small"><li>المنطقة ١: خطوط متقاربة من مركز اللقاح (نمو كثيف) — ثم عقّم العروة</li>' +
      '<li>المنطقة ٢: خط ٣–٤ خطوط تعبر نهاية المنطقة ١ — ثم عقّم</li>' +
      '<li>المنطقة ٣: نفس الأسلوب مع تخفيف الخلايا أكثر — ثم عقّم</li>' +
      '<li>المنطقة ٤: خطوط متباعدة دون ملامسة السابقة → مستعمرات منفصلة</li></ol>' +
      '<div class="note s mt"><b>الهدف النهائي</b>مستعمرات منفصلة (منفردة) في المنطقة ٤ تُعطيك مزرعة نقية.</div>' +
      '<div class="tblwrap mt"><table><tbody>' +
      '<tr><th>حالة العروة</th><td id="stFlame">معقّمة وجاهزة</td></tr>' +
      '<tr><th>المنطقة الحالية</th><td id="stSector">١</td></tr>' +
      '<tr><th>المستعمرات المنفصلة (منطقة ٤)</th><td id="stCount">—</td></tr>' +
      '<tr><th>التقييم</th><td id="stScore">—</td></tr></tbody></table></div>' +
      '<div class="row mt"><button class="btn sm" id="saveStreak">🗂 احفظ النتيجة في الدفتر</button></div></div></div></div>';

    const cv = box.querySelector("#plate"), ctx = cv.getContext("2d");
    const R = 168, CX = 180, CY = 180;

    function sectorOf(p) {
      const dx = p.x - CX, dy = p.y - CY;
      const ang = Math.atan2(dy, dx) * 180 / Math.PI;      // -180..180
      if (ang >= -135 && ang < -45) return 0;               // top
      if (ang >= -45 && ang < 45) return 1;                 // right (RTL plate ok)
      if (ang >= 45 && ang < 135) return 2;                 // bottom
      return 3;                                             // left
    }
    function drawPlate() {
      ctx.clearRect(0, 0, 360, 360);
      // agar
      const g = ctx.createRadialGradient(CX - 40, CY - 50, 30, CX, CY, R);
      g.addColorStop(0, "#f6ead0"); g.addColorStop(.75, "#eadcb9"); g.addColorStop(1, "#cbb98f");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(CX, CY, R, 0, 7); ctx.fill();
      ctx.strokeStyle = "rgba(120,100,60,.5)"; ctx.lineWidth = 3; ctx.stroke();
      // sector guides
      ctx.save(); ctx.setLineDash([6, 7]); ctx.strokeStyle = "rgba(60,70,80,.35)"; ctx.lineWidth = 1.4;
      for (let k = 0; k < 4; k++) {
        const a = (-135 + k * 90) * Math.PI / 180;
        ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(CX + Math.cos(a) * R, CY + Math.sin(a) * R); ctx.stroke();
      }
      ctx.restore();
      // sector labels
      const lab = ["١", "٢", "٣", "٤"], la = [-90, 0, 90, 180];
      la.forEach((a, k) => {
        const rad = a * Math.PI / 180;
        ctx.fillStyle = streakDone[k] ? "rgba(16,120,80,.75)" : "rgba(70,80,95,.55)";
        ctx.font = "bold 20px Tahoma"; ctx.textAlign = "center";
        ctx.fillText(lab[k], CX + Math.cos(rad) * (R - 42), CY + Math.sin(rad) * (R - 42) + 7);
      });
      // current sector highlight
      if (sector < 4 && !incubated) {
        const a0 = ((-135 + sector * 90) * Math.PI) / 180, a1 = a0 + Math.PI / 2;
        ctx.beginPath(); ctx.moveTo(CX, CY); ctx.arc(CX, CY, R - 4, a0, a1); ctx.closePath();
        ctx.fillStyle = "rgba(34,211,238,.10)"; ctx.fill();
        ctx.strokeStyle = "rgba(34,211,238,.55)"; ctx.lineWidth = 2; ctx.stroke();
      }
      // strokes
      PZ.forEach(st => {
        ctx.strokeStyle = "rgba(210,215,225,.85)"; ctx.lineWidth = 3; ctx.lineCap = "round";
        ctx.beginPath();
        st.pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
        ctx.stroke();
      });
      // colonies
      colonies.forEach(c => {
        ctx.fillStyle = c.c; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, 7); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = .8; ctx.stroke();
      });
    }
    function grab(ev) {
      const r = cv.getBoundingClientRect();
      const sx = 360 / r.width, sy = 360 / r.height;
      return { x: (ev.clientX - r.left) * sx, y: (ev.clientY - r.top) * sy };
    }
    cv.addEventListener("pointerdown", e => {
      if (incubated || sector > 3) return;
      drawing = true; curPts = [grab(e)];
      if (!lastFlame) VL.UI.toast("⚠ لم تُعقَّم العروة قبل هذا الخط — ستقل المستعمرات المنفصلة", "w");
      cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener("pointermove", e => {
      if (!drawing) return;
      const p = grab(e);
      if (Math.hypot(p.x - CX, p.y - CY) > R - 5) return;
      curPts.push(p); drawPlate();
      ctx.strokeStyle = "rgba(210,215,225,.85)"; ctx.lineWidth = 3;
      ctx.beginPath(); curPts.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.stroke();
    });
    cv.addEventListener("pointerup", () => {
      if (!drawing) return;
      drawing = false;
      if (curPts.length < 4) return;
      const sec = sectorOf(curPts[Math.floor(curPts.length / 2)]);
      if (sec !== sector) {
        VL.UI.toast("هذا الخط خارج المنطقة المطلوبة (" + (sector + 1) + ") — انتقل حسب الخطة", "w");
        return;
      }
      PZ.push({ sector: sec, pts: curPts, flamed: lastFlame });
      streakDone[sec] = true;
      lastFlame = false;
      sector++;
      updateUI();
      drawPlate();
      if (sector > 3) { box.querySelector("#plateMsg").innerHTML = "أكملت الخطوط الأربعة ✔ اضغط <b>احضن</b> لرؤية النتيجة بعد ٢٤ ساعة."; }
    });
    box.querySelector("#flame").onclick = () => {
      lastFlame = true; streakDone[sector] = streakDone[sector];
      VL.UI.toast("🔥 العروة معقّمة الآن — اتركها تبرد لحظة قبل الاستخدام", "c");
      updateUI();
    };
    box.querySelector("#reset").onclick = () => { PZ.length = 0; sector = 0; streakDone = [false, false, false, false]; colonies = []; incubated = false; lastFlame = true; updateUI(); drawPlate(); };
    function updateUI() {
      box.querySelector("#stFlame").textContent = lastFlame ? "معقّمة وجاهزة ✔" : "تحتاج تعقيمًا ✘";
      box.querySelector("#stSector").textContent = sector > 3 ? "انتهت المناطق" : ["١", "٢", "٣", "٤"][sector];
      box.querySelector("#plateMsg").innerHTML = sector > 3 ? "أكملت الخطوط الأربعة ✔ اضغط <b>احضن</b>." :
        "ارسم الخط في المنطقة (" + (sector + 1) + ") بالسحب على سطح الأجار.";
    }
    box.querySelector("#incubate").onclick = () => {
      if (sector < 4) { VL.UI.toast("أكمل الخطوط الأربعة أولًا (المنطقة " + (sector + 1) + ")", "w"); return; }
      incubated = true;
      const unflamed = PZ.filter(p => !p.flamed).length;
      const colFor = ["#f4f1de", "#f4f1de", "#f4f1de", "#f4f1de"];
      let prog = 0;
      box.querySelector("#plateMsg").innerHTML = "⏳ التحضين جارٍ: 37°م / 24 ساعة…";
      const iv = setInterval(() => {
        prog += 1;
        if (prog > 20) {
          clearInterval(iv);
          colonies = [];
          const counts = [];
          [170, 70, 18, 0].forEach((n, sec) => {
            let c = Math.round(n * (PZ[sec] && PZ[sec].flamed ? 1 : .82));
            if (sec === 3) c = Math.max(3, Math.round(9 - unflamed * 2));
            counts.push(c);
            const a0 = (-135 + sec * 90) * Math.PI / 180;
            for (let i = 0; i < c; i++) {
              const a = a0 + Math.random() * Math.PI / 2, rr = Math.sqrt(Math.random()) * (R - 26);
              const r = sec === 3 ? 3.4 : Math.max(1.4, 4 - sec * .7);
              colonies.push({ x: CX + Math.cos(a) * rr, y: CY + Math.sin(a) * rr, r: r, c: "#f8fafc", sec });
            }
          });
          drawPlate();
          const isolated = colonies.filter(c => c.sec === 3).length;
          box.querySelector("#stCount").textContent = isolated + " مستعمرة منفصلة";
          const good = isolated >= 4 && unflamed === 0;
          box.querySelector("#stScore").innerHTML = good ? '<span class="badge g">نجاح ممتاز ✔</span>' :
            isolated >= 4 ? '<span class="badge a">مقبول — لكن كان يجب تعقيم العروة بين الخطوط</span>' : '<span class="badge r">فشل في العزل — أعد الزرع بخطوط أكثر تباعدًا</span>';
          box.querySelector("#plateMsg").innerHTML = "✅ قراءة الطبق: منطقة ١ نمو كثيف (Confluent) · منطقة ٢ كثافة عالية · منطقة ٣ متوسطة · منطقة ٤ " + isolated + " مستعمرة منفصلة";
          VL.store.addXP(good ? 45 : 20, good ? "عزل ناجح بالخطوط الأربعة" : "تمرين زرع (يحتاج تحسينًا)");
          if (good) VL.store.setModule("bench", 100);
          VL.notebook.add({ session: "الزرع والتقنيات", title: "زرع بطبق الخطوط الأربعة", kind: "media",
            summary: "المنطقة ٤: " + isolated + " مستعمرة منفصلة · خطوط بدون تعقيم: " + unflamed + " · " + (good ? "عزل ناجح" : "يحتاج إعادة"),
            data: { sectors: [0, 1, 2, 3].map(i => colonies.filter(c => c.sec === i).length) } });
        } else {
          const pct = Math.round(prog / 20 * 100);
          box.querySelector("#plateMsg").innerHTML = '⏳ التحضين: ' + pct + '% <div class="prog mt"><i style="width:' + pct + '%"></i></div>';
        }
      }, 120);
    };
    box.querySelector("#saveStreak").onclick = () => {
      VL.notebook.add({ session: "الزرع والتقنيات", title: "ملاحظات زرع الخطوط", kind: "media",
        summary: "خطوط: " + PZ.length + " · مناطق مكتملة: " + streakDone.filter(Boolean).length + " · مستعمرات منفصلة: " + colonies.filter(c => c.sec === 3).length,
        data: { strokes: PZ.length } });
    };
    updateUI(); drawPlate();
  };

  /* =============================== techniques gallery */
  L.techniqueGallery = function (box) {
    if (!box) return;
    const items = [
      { t: "الزرع بالخطوط (Streak Plate)", d: "الطريقة الأساسية للعزل والحصول على مزرعة نقية. تُستخدم مع الأوساط الصلبة.", svg: plateSVG("streak") },
      { t: "طبق النشر (Spread Plate)", d: "نقل 0.1–0.2 مل على سطح الأجار ثم التوزيع بمدفع زجاجي معتدل — مناسب للعدّ الكمي.", svg: plateSVG("spread") },
      { t: "طبق الصب (Pour Plate)", d: "مزج العيّنة مع الأجار السائل الدافئ (45–50°م) قبل التجمد — يُظهر المستعمرات سطحية وداخلية.", svg: plateSVG("pour") },
      { t: "الزرع الغَرزي (Stab)", d: "غَرز العروة عموديًا في الوسط العميق لاختبار الحركة والأنشطة اللاهوائية.", svg: plateSVG("stab") },
      { t: "الزرع المائل (Slant)", d: "لتنمية سطحية كبيرة تُحفظ في الأنابيب المائلة وتُستخدم للصيانة والنقل المختبرية.", svg: plateSVG("slant") },
      { t: "النقل بالأنبوب (Tube to tube)", d: "نقل اللقاح من وسط سائل لآخر — أساس تقنيات الاستنبات والتضخيم.", svg: plateSVG("tube") }
    ];
    box.innerHTML = items.map(i => '<div class="card"><h3>' + i.t + "</h3><div class=\"instrument-figure\">" + i.svg + "</div><p class=\"small muted\">" + i.d + "</p></div>").join("");
  };
  function plateSVG(kind) {
    const col = "rgba(226,232,240,.75)";
    let inner = '<circle cx="110" cy="110" r="92" fill="#e8dcbb" stroke="#8b7a4a" stroke-width="3"/>';
    if (kind === "streak") {
      for (let k = 0; k < 4; k++) {
        const a0 = (-135 + k * 90) * Math.PI / 180;
        for (let i = 0; i < 6 - k; i++) {
          const r = 26 + i * (12 + k * 5);
          inner += '<path d="M' + (110 + Math.cos(a0) * r) + ' ' + (110 + Math.sin(a0) * r) +
            ' A' + r + ' ' + r + ' 0 0 1 ' + (110 + Math.cos(a0 + Math.PI / 2) * r) + ' ' + (110 + Math.sin(a0 + Math.PI / 2) * r) +
            '" fill="none" stroke="' + col + '" stroke-width="2"/>';
        }
      }
      for (let i = 0; i < 7; i++) inner += '<circle cx="' + (54 + i * 16) + '" cy="' + (188 - i * 4) + '" r="3.2" fill="#f8fafc"/>';
    } else if (kind === "spread") {
      for (let i = 0; i < 60; i++) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 84;
        inner += '<circle cx="' + (110 + Math.cos(a) * r) + '" cy="' + (110 + Math.sin(a) * r) + '" r="2" fill="' + (i % 9 ? col : "#f8fafc") + '"/>'; }
    } else if (kind === "pour") {
      for (let i = 0; i < 24; i++) inner += '<circle cx="' + (48 + Math.random() * 120) + '" cy="' + (48 + Math.random() * 120) + '" r="' + (2 + Math.random() * 6) + '" fill="' + (i % 3 ? "rgba(255,255,255,.5)" : "#f8fafc") + '"/>';
    } else if (kind === "stab") {
      inner = '<rect x="70" y="30" width="80" height="170" rx="10" fill="#e8dcbb" stroke="#8b7a4a" stroke-width="3"/>' +
        '<line x1="110" y1="55" x2="110" y2="160" stroke="' + col + '" stroke-width="5" stroke-linecap="round"/>' +
        '<circle cx="110" cy="150" r="7" fill="#f8fafc"/>';
    } else if (kind === "slant") {
      inner = '<rect x="66" y="26" width="88" height="176" rx="10" fill="#e8dcbb" stroke="#8b7a4a" stroke-width="3"/>' +
        '<path d="M74 150 L146 60" stroke="' + col + '" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="M80 140 L140 62" stroke="' + col + '" stroke-width="6" stroke-linecap="round" opacity=".7"/>';
    } else if (kind === "tube") {
      inner = '<rect x="74" y="24" width="72" height="180" rx="12" fill="rgba(203,213,225,.3)" stroke="#94a3b8" stroke-width="3"/>' +
        '<rect x="80" y="120" width="60" height="78" rx="8" fill="rgba(226,232,240,.75)"/>' +
        '<ellipse cx="110" cy="206" rx="10" ry="4" fill="#f8fafc"/>';
    }
    return '<svg viewBox="0 0 220 220" width="180">' + inner + "</svg>";
  }

  W.LABS = L;
})(window);
