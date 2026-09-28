/* ==========================================================================
   microscope.js — virtual microscope engine + interactive bench
   .  infinite procedural smear (tile based, deterministic)
   .  objectives 4x/10x/40x/100x(oil) or EM magnifications
   .  focus (coarse+fine), illumination, condenser iris, immersion oil
   .  live scale-bar in µm, click-to-measure, training/quiz mode
   ========================================================================== */
(function (W) {
  "use strict";
  const MB = W.MB;

  /* ---------------------------------------------------------------- utilities */
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry(seed) {
    let a = seed >>> 0;
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const R = r => (r() * 2 - 1);
  const mod = (n, m) => ((n % m) + m) % m;

  /* ---------------------------------------------------------------- objectives */
  const MAGS = {
    light: [
      { k: "4x", lab: "4×", field: 25000, oil: false, na: .10 },
      { k: "10x", lab: "10×", field: 10000, oil: false, na: .25 },
      { k: "40x", lab: "40×", field: 2500, oil: false, na: .65 },
      { k: "100x", lab: "100×", field: 1000, oil: true, na: 1.25 }
    ],
    em: [
      { k: "10k", lab: "10,000×", field: 1000, oil: false },
      { k: "30k", lab: "30,000×", field: 333, oil: false },
      { k: "60k", lab: "60,000×", field: 167, oil: false },
      { k: "150k", lab: "150,000×", field: 66, oil: false }
    ]
  };
  const FIELD_PX = 520;                    // logical pixel diameter of the field of view

  /* ---------------------------------------------------------------- slide library */
  const GP = { color: "#6d28d9", color2: "#c4b5fd" };   // Gram positive (violet)
  const GN = { color: "#be185d", color2: "#fbcfe8" };   // Gram negative (pink/red)
  const UNS = { color: "#8fa3b8", color2: "#e2e8f0" };  // unstained
  const MBL = { color: "#1d4ed8", color2: "#bfdbfe" };  // methylene blue
  const GRY = { color: "#4b5563", color2: "#e5e7eb" };  // electron microscopy

  const LIGHT_BG = ["#e9eef3", "#cfdae5"], EM_BG = ["#0b1319", "#05090d"];
  const light = (o) => Object.assign({ mode: "light", umPerUnit: 0.18, objective: 3, density: 110, matrix: "smear", halo: false, stain: "Gram", bg: LIGHT_BG }, o);
  const em = (o) => Object.assign({ mode: "em", umPerUnit: 0.005, objective: 1, density: 40, matrix: "em", halo: true, stain: "مجهر إلكتروني", bg: EM_BG }, o);

  const SLIDES = [
    /* ============================ bacteria ============================ */
    light({
      id: "ecoli_gram", name: "إشريكية قولونية (E. coli) — جرام سالب", cat: "bact", gram: "-", objective: 3, density: 130,
      bg: ["#e9eef3", "#cfdae5"],
      pop: [{ kind: "bacillus", w: 1, size: [8, 13], col: GN, motion: "brownian" }],
      note: "عصويات قصيرة سالبة الجرام (وردية/حمراء بسبب السافرانين) — مؤشر تلوث برازي.",
      org: "Escherichia coli", teach: "بكتيريا سالبة الجرام لا تحتفظ بالبلور البنفسجي (لأن طبقة الببتيدوجليكان رقيقة والدهون الخارجية تُذيب مركّب اليود)، فتُصبغ بلون الصبغة الثانوية (سافرانين = أحمر وردي)."
    }),
    light({
      id: "staph_gram", name: "عنقودية ذهبية (S. aureus) — جرام موجب", cat: "bact", gram: "+", objective: 3, density: 90,
      bg: ["#e9eef3", "#cfdae5"],
      pop: [{ kind: "coccus_cluster", w: 1, size: [20, 30], col: GP, motion: "still" }],
      note: "كرويات بنفسجية متراكمة كعناقيد العنب — مميزة للمكورات العنقودية.",
      org: "Staphylococcus aureus", teach: "المكورات العنقودية موجبة الجرام: تحتفظ بمركّب البلور البنفسجي-اليود، وتظهر في تجمعات غير منتظمة كعناقيد العنب. سبب التجمّع: الانقسام في مستويات متعددة."
    }),
    light({
      id: "strep_gram", name: "مكورات سبحية (Streptococcus) — سلاسل جرام موجبة", cat: "bact", gram: "+", objective: 3, density: 90,
      bg: ["#e9eef3", "#cfdae5"],
      pop: [{ kind: "coccus_chain", w: 1, size: [26, 38], col: GP, motion: "still", n: [4, 9] }],
      note: "سلاسل من الكرويات البنفسجية — دلالة على المجموعة السبحية.",
      org: "Streptococcus spp.", teach: "الانقسام في مستوى واحد ينتج سلاسل. للمكورات السبحية أهمية كبرى في سلامة الغذاء (تلوث من العاملين) وفي إنتاج الألبان المتخمرة (مجموعة Lactococcus المفيدة)."
    }),
    light({
      id: "bacillus_spore", name: "عصويات وسبور داخلية (Bacillus cereus)", cat: "bact", gram: "+", objective: 3, density: 95,
      bg: ["#e9eef3", "#cfdae5"],
      pop: [
        { kind: "bacillus_spore", w: .7, size: [12, 16], col: GP, motion: "still" },
        { kind: "bacillus", w: .4, size: [12, 16], col: GP, motion: "still" },
        { kind: "spore", w: .35, size: [5, 7], col: { color: "#cbd5e1", color2: "#ffffff" }, motion: "still" }
      ],
      note: "أشكال بيضاوية بيضاء لامعة داخل/خارج الخلية = سبور (أبواغ) داخلية مقاومة للحرارة.",
      org: "Bacillus cereus", teach: "السبور الداخلية مقاومة للحرارة والجفاف والمنظفات، لذا تنتشر مع الأرز المطبوخ المترك لساعات في درجة الغرفة، وتفرز سُمّين (احدي مسببات التسمم الغذائي)."
    }),
    light({
      id: "listeria_gram", name: "ليستيريا (Listeria monocytogenes)", cat: "bact", gram: "+", objective: 3, density: 80,
      bg: ["#e9eef3", "#cfdae5"],
      pop: [{ kind: "bacillus", w: 1, size: [7, 10], col: GP, motion: "brownian" }],
      note: "عصويات قصيرة موجبة الجرام (تشبه الدفتيرويدات) منفردة أو ثنائية.",
      org: "Listeria monocytogenes", teach: "من أخطر مسببات الأمراض المنقولة بالغذاء؛ ينمو في درجات التبريد (4°م) وله قدرة على اختراق الحاجز المعوي والمشيمي. يُحرَّر ويُغنى في 30°م ثم يُزرع على وسط Palcam."
    }),
    light({
      id: "salmonella_gram", name: "سالمونيلا (Salmonella) — عصويات جرام سالبة", cat: "bact", gram: "-", objective: 3, density: 110,
      bg: ["#e9eef3", "#cfdae5"],
      pop: [{ kind: "bacillus", w: 1, size: [9, 14], col: GN, motion: "swim" }],
      note: "عصويات وردية سالبة الجرام متحركة (أسواط متعددة).",
      org: "Salmonella enterica", teach: "تُعزل بـ Rappaport-Vassiliadis ثم على XLD حيث تظهر مستعمرات حمراء بمركز أسود (H₂S موجب). التحقق بالببتيد المصلّي والتايبينغ بالعاثيات."
    }),
    light({
      id: "lacto_gram", name: "لاكتوباسيلس من الزبادي", cat: "food", gram: "+", objective: 3, density: 140, matrix: "milkDots",
      bg: ["#e9eef3", "#cfdae5"],
      pop: [
        { kind: "bacillus", w: 1, size: [14, 22], col: GP, motion: "still" },
        { kind: "coccus_chain", w: .3, size: [18, 26], col: GP, motion: "still", n: [3, 6] }
      ],
      note: "عصويات طويلة نحيلة بنفسجية + سلاسل كروية (مكوّنات بادي الزبادي) فوق خلفية حبيبات دهنية.",
      org: "Lactobacillus bulgaricus / Streptococcus thermophilus", teach: "البادي (Starter) التقليدي للزبادي يتكون من لاكتوباسيلس ديلبروكي تحت نوع بلغاريكوس و ستربتوكوكس ثيرموفيلوس بنسبة ~1:1 في علاقة تعاون غذائي (بروت-سينرجية)."
    }),
    light({
      id: "mixed_gram", name: "مزرعة مختلطة (جرام موجب وسالب)", cat: "bact", gram: "±", objective: 3, density: 130,
      bg: ["#e9eef3", "#cfdae5"],
      pop: [
        { kind: "bacillus", w: .5, size: [8, 13], col: GN, motion: "brownian" },
        { kind: "coccus", w: .3, size: [5, 7], col: GP, motion: "still" },
        { kind: "coccus_cluster", w: .2, size: [18, 24], col: GP, motion: "still" },
        { kind: "spirillum", w: .12, size: [18, 26], col: GN, motion: "wriggle" }
      ],
      note: "دليل مباشر على نجاح التلوين التفريقي: مجموعتان بلونين مختلفين في نفس الحقل.",
      org: "Mixed culture", teach: "شرط صحة صبغة جرام: أن يظهر في الحقل نفس لونان مختلفان لعصيات وكرويات؛ إذا كان كل شيء بلون واحد فاحتمال خطأ في الخطوات (نسيان السافرانين أو زيادة شطف البلور)."
    }),
    light({
      id: "vibrio", name: "الضمة الكوليرية (Vibrio cholerae) — لطخة حية", cat: "bact", gram: "-", objective: 3, density: 70,
      bg: ["#dfe9ee", "#c3d2dd"], stain: "لطخة رطبة (بدون تلوين)", halo: true,
      pop: [{ kind: "vibrio", w: 1, size: [11, 15], col: UNS, motion: "wriggle" }],
      note: "عصويات منحنية على شكل فاصلة أو علامة (,) تتحرك حركة دوّامية سريعة.",
      org: "Vibrio cholerae", teach: "الحركة السريعة (حركة \"كوكتيل\" لولبية) معلَمة في اللطخة الرطبة، وتُثبَّط بضد مصلي O1/O139. تكشف على وسط TCBS بمستعمرات صفراء."
    }),
    light({
      id: "spirillum", name: "بكتيريا حلزونية (Spirillum) — لطخة رطبة", cat: "bact", gram: "-", objective: 3, density: 55,
      bg: ["#dfe9ee", "#c3d2dd"], stain: "لطخة رطبة", halo: true,
      pop: [
        { kind: "spirillum", w: .8, size: [24, 40], col: UNS, motion: "wriggle" },
        { kind: "spirochete", w: .2, size: [60, 110], col: UNS, motion: "wriggle" }
      ],
      note: "أشكال لولبية متحركة بحركة انحلالية مميزة.",
      org: "Spirillum / Spirochaeta", teach: "البكتيريا اللولبية رقيقة جدًا فتحتاج مجهر مجال مظلم (Dark-field) أو مجهر تداخل تباين (DIC) لأن قطرها أصغر من حد الإيضاح للمجهر الضوئي العادي."
    }),
    light({
      id: "yogurt_smear", name: "لطخة زبادي (بكتيريا + حبيبات دهن)", cat: "food", gram: "+", objective: 3, density: 120, matrix: "milkDots",
      bg: ["#e9eef3", "#cfdae5"],
      pop: [
        { kind: "bacillus", w: .7, size: [12, 18], col: GP, motion: "still" },
        { kind: "coccus", w: .3, size: [5, 8], col: GP, motion: "still" }
      ],
      extras: [{ kind: "fat_globule", density: 260, size: [7, 14], motion: "still" }],
      note: "لطخة من منتج لبني: بكتيريا حمض اللاكتيك + كريات دهن ملوّنة.",
      org: "Yoghurt smear", teach: "كريات الدهن تظهر كأقراص مضيئة كبيرة حدودها دائرية؛ ليس من الصحيح عدّها بكتيريا. تُميَّز بحجمها الكبير وعدم تلونها بالصبغة."
    }),
    light({
      id: "milk_mb", name: "لبن طازج — صبغة أزرق الميثيلين", cat: "food", gram: null, objective: 3, density: 60, matrix: "milkDots",
      bg: ["#dce7f1", "#bccfe0"], stain: "Methylene blue", halo: true,
      pop: [
        { kind: "bacillus", w: .5, size: [8, 13], col: MBL, motion: "brownian" },
        { kind: "coccus", w: .5, size: [5, 8], col: MBL, motion: "brownian" }
      ],
      extras: [{ kind: "fat_globule", density: 300, size: [6, 12], motion: "still" }],
      note: "عدد قليل جدًا من الخلايا البكتيرية = لبن بحالة جيدة (اختبار الصبغة الأزرق يقيس بشكل تقريبي كثافة الحمل الميكروبي).",
      org: "Fresh milk", teach: "اختبار التلوين بصبغة الميثيلين الأزرق (Methylene Blue Reduction Test) يقيس القدرة الاختزالية للبكتيريا؛ اختفاء اللون بسرعة يعني حِمْلًا ميكروبيًا كبيرًا."
    }),
    light({
      id: "meat_smear", name: "لطخة لحم مفروم (نسيج + بكتيريا)", cat: "food", gram: "-", objective: 3, density: 95, matrix: "meat",
      bg: ["#e7e2da", "#cdc4b6"],
      pop: [
        { kind: "bacillus", w: .6, size: [8, 14], col: GN, motion: "still" },
        { kind: "coccus", w: .4, size: [5, 8], col: GN, motion: "still" }
      ],
      extras: [{ kind: "fiber", density: 70, size: [80, 220], motion: "still" }, { kind: "fat_globule", density: 40, size: [14, 26], motion: "still" }],
      note: "ألياف عضلية طويلة + شوائب نسيجية + عصويات وردية (سالب جرام) من الفلورا الطبيعية.",
      org: "Minced meat smear", teach: "اللحم المفروم غني بفلورا متنوعة؛ لهذا يُفحص للكشف عن Salmonella و E. coli O157:H7 و حساب العدد الكلي للكائنات الدقيقة الهوائية (TAPC)."
    }),
    light({
      id: "poultry_swab", name: "مسحة دواجن (Filth test / تلوث)", cat: "food", gram: "±", objective: 3, density: 100, matrix: "meat",
      bg: ["#e7e2da", "#cdc4b6"],
      pop: [
        { kind: "bacillus", w: .5, size: [8, 14], col: GN, motion: "still" },
        { kind: "coccus_cluster", w: .3, size: [18, 24], col: GP, motion: "still" },
        { kind: "yeast", w: .2, size: [22, 34], motion: "still" }
      ],
      extras: [{ kind: "dust", density: 60, size: [16, 42], motion: "still" }, { kind: "fiber", density: 20, size: [80, 180], motion: "still" }],
      note: "خليط: بكتيريا، خمائر، وشوائب عضوية = دليل على مستوى نظافة منخفض في الذبح أو التبريد.",
      org: "Poultry swab", teach: "في مراقبة الحاصلات تُستخدم المسحات (swabs) لتقدير الحمل الميكروبي على الأسطح، ويصحبها عد شوائب عضوية تقريبية للدلالة على مستوى النظافة."
    }),
    /* ============================ fungi & yeast ============================ */
    light({
      id: "yeast_bud", name: "خميرة الخبز (Saccharomyces cerevisiae)", cat: "fungi", objective: 2, density: 110,
      bg: ["#e6ece6", "#cbd8cb"], stain: "لطخة رطبة/ميثيلين", halo: true,
      pop: [
        { kind: "yeast_budding", w: .55, size: [34, 52], motion: "still" },
        { kind: "yeast", w: .45, size: [34, 50], motion: "still" }
      ],
      note: "خلايا بَيضاوية كبيرة (5–8 ميكرومتر) وأخرى متبرعمة (برعم صغير ملتصق). أضعاف حجم البكتيريا.",
      org: "Saccharomyces cerevisiae", teach: "الخمائر حقيقية النواة أكبر بكثير من البكتيريا (5–10 µm مقابل 0.5–2 µm)، تتكاثر بالتبرعم، وتنتج الإيثانول وثاني أكسيد الكربون — أساس صناعات الخبز والتخمير."
    }),
    light({
      id: "candida", name: "كانديدا خمائرية مع خيوط كاذبة", cat: "fungi", objective: 2, density: 75,
      bg: ["#e6ece6", "#cbd8cb"], stain: "لطخة رطبة", halo: true,
      pop: [
        { kind: "yeast_budding", w: .6, size: [30, 46], motion: "still" },
        { kind: "hypha", w: .4, size: [160, 320], motion: "still", col: { color: "#65a30d", color2: "#d9f99d" } }
      ],
      note: "خلايا خميرية مع سلاسل مستطيلة متصلة (خيوط كاذبة Pseudohyphae) = دلالة على Candida أو على تلف منتج غذائي.",
      org: "Candida albicans", teach: "الخيوط الكاذبة تنتج من التبرعم المتتالي دون انفصال؛ تُشاهد أيضًا في منتجات غذائية ملوثة وتسبب فسادًا مع تدهور مقاومة المستهلك."
    }),
    light({
      id: "aspergillus", name: "عفن أسود (Aspergillus niger)", cat: "fungi", objective: 1, density: 24,
      bg: ["#e8e8de", "#cfcfc2"], stain: "لطخة رطبة", halo: true,
      pop: [
        { kind: "aspergillus", w: .7, size: [240, 400], motion: "still", col: { color: "#4d7c0f", color2: "#84cc16" } },
        { kind: "hypha", w: .45, size: [500, 1000], motion: "still", col: { color: "#65a30d", color2: "#d9f99d" } },
        { kind: "spore", w: .4, size: [10, 16], col: { color: "#a16207", color2: "#78350f" }, motion: "still" }
      ],
      note: "رؤوس كونيدية كروية تحمل سلاسل السبور السوداء — سبب اللون الأسود للمستعمرة.",
      org: "Aspergillus niger", teach: "الأعفان الجنسية (Aspergillus) تسبب تعفن الفواكه والبقوليات المنتجة للسموم (الأفلاتوكسينات في A. flavus). تُقرأ على وسط Czapek أو على شريحة مع محلول مُلطّف لتفادي تطاير السبور."
    }),
    light({
      id: "penicillium", name: "عفن أزرق أخضر (Penicillium)", cat: "fungi", objective: 1, density: 24,
      bg: ["#e8e8de", "#cfcfc2"], stain: "لطخة رطبة", halo: true,
      pop: [
        { kind: "penicillium", w: .8, size: [200, 330], motion: "still", col: { color: "#166534", color2: "#4ade80" } },
        { kind: "hypha", w: .4, size: [450, 900], motion: "still", col: { color: "#22c55e", color2: "#bbf7d0" } }
      ],
      note: "تركيب فرشائي (Brush-like) في نهاية الخيط الفطري = العلامة المميزة لجنس Penicillium.",
      org: "Penicillium spp.", teach: "من أكثر مسببات فساد الخبز والحمضيات؛ ينتج ميكوتوكسين الباتولين (Patulin) في التفاح وعصيره. الملاحظة الشكلية: الفياليدات تحمل سلاسل السبور كفرشاة."
    }),
    light({
      id: "mucor", name: "عفن خبز (Mucor / Rhizopus)", cat: "fungi", objective: 1, density: 15,
      bg: ["#e8e8de", "#cfcfc2"], stain: "لطخة رطبة", halo: true,
      pop: [
        { kind: "hypha", w: .8, size: [600, 1200], motion: "still", col: { color: "#78716c", color2: "#d6d3d1" } },
        { kind: "spore", w: .3, size: [14, 22], col: { color: "#78350f", color2: "#451a03" }, motion: "still" }
      ],
      note: "خيوط عريضة غير مُحوَّزة (الفرق الأساسي عن Aspergillus و Penicillium المُحوَّزين).",
      org: "Rhizopus stolonifer", teach: "الخيوط غير المحوّزة (coenocytic) علامة مميزة لعفن الخبز الأسود (Rhizopus). يسقط باكستاني/سبور المنزل بسهولة ويؤدي لتعفن سريع للخبز الرطب."
    }),
    light({
      id: "bread_mold", name: "سطح خبز متعفن", cat: "food", objective: 1, density: 28, matrix: "bread",
      bg: ["#eae3d4", "#cdc2ac"], stain: "لطخة رطبة", halo: true,
      pop: [
        { kind: "hypha", w: .5, size: [420, 900], motion: "still", col: { color: "#65a30d", color2: "#d9f99d" } },
        { kind: "aspergillus", w: .3, size: [200, 340], motion: "still", col: { color: "#4d7c0f", color2: "#84cc16" } },
        { kind: "spore", w: .3, size: [10, 18], col: { color: "#78350f", color2: "#451a03" }, motion: "still" },
        { kind: "yeast_budding", w: .2, size: [28, 42], motion: "still" }
      ],
      note: "شبكة خيوط فطرية تغزو النسيج النشوي مع سبور متناثرة.",
      org: "Moldy bread", teach: "الخبز (نشا + رطوبة aw~0.95) بيئة مثالية للأعفان؛ تقطيع الجزء المتعفن لا يكفي لأن الخيوط تتغلغل في النسيج وتفرز ميكوتوكسينات."
    }),
    /* ============================ viruses (EM) ============================ */
    em({
      id: "norovirus_em", name: "نوروفيروس (مجهر إلكتروني)", cat: "virus", objective: 0, density: 34,
      pop: [{ kind: "norovirus", w: 1, size: [5, 7], col: GRY, motion: "still" }],
      note: "جسيمات كروية صغيرة (27–40 نانومتر) ذات تجويفات كأسية الشكل على السطح.",
      org: "Norovirus (Caliciviridae)", teach: "أكثر مسببات التهاب المعدة والأمعاء الفيروسي المتفشي، ومسؤول عن أغلب حالات التفشي المرتبطة بالمطاعم. جرعة الإصابة منخفضة جدًا (18–1000 جسيم) ويقاوم الحرارة والكحول جزئيًا."
    }),
    em({
      id: "rotavirus_em", name: "روتا فيروس (مجهر إلكتروني)", cat: "virus", objective: 0, density: 26,
      pop: [{ kind: "rotavirus", w: 1, size: [8, 11], col: GRY, motion: "still" }],
      note: "شكل عجلة (Rota = عجلة باللاتينية) من ثلاث طبقات محيطة بالنواة.",
      org: "Rotavirus (Reoviridae)", teach: "يؤثر أساسًا على الأطفال، يُنقل بالمياه والأغذية الملوثة، ويتميز ببنية قفيصة ثلاثية الطبقات تمنحه ثباتًا عاليًا في البيئة."
    }),
    em({
      id: "corona_em", name: "كورونا فيروس (مجهر إلكتروني)", cat: "virus", objective: 0, density: 22,
      pop: [{ kind: "coronavirus", w: 1, size: [12, 16], col: GRY, motion: "still" }],
      note: "تاج من نتوءات سكرية (Spikes) يحيط بالغلاف الليبيدي = سبب الاسم كورونا.",
      org: "SARS-CoV-2 (Coronaviridae)", teach: "غلاف ليبيدي يجعل الفيروس شديد الحساسية للصابون والكحول. ينتقل عبر القطيرات الهوائية والأسطح الملوثة، ولهذا لا يُعد من أخطر التهديدات الغذائية مقارنة بالنوروفيروس."
    }),
    em({
      id: "hav_em", name: "فيروس الكبد الوبائي A (EM)", cat: "virus", objective: 0, density: 30,
      pop: [{ kind: "hav", w: 1, size: [5, 7], col: GRY, motion: "still" }],
      note: "جسيم صغير عشري السطوح عاري (بدون غلاف) — شديد المقاومة للبيئة.",
      org: "Hepatitis A virus (Picornaviridae)", teach: "ينتقل بالغذاء والماء الملوث (المحار، الخضروات غير المغسولة) وعبّر أيدي العاملين. لا غلاف له فيقاوم الحموضة والحرارة المعتدلة، وفترة حضانته طويلة (15–50 يومًا)."
    }),
    em({
      id: "phage_em", name: "عاثية بكتيرية (Bacteriophage)", cat: "virus", objective: 0, density: 20,
      pop: [{ kind: "phage", w: 1, size: [9, 13], col: GRY, motion: "still" }],
      note: "شكل \"رجل الفضاء\": رأس سداسي + ذيل + ألياف سفلية تلتصق بالبكتيريا.",
      org: "Escherichia phage T4", teach: "العاثيات تهاجم البكتيريا فقط وتُلتصق بمستقبلات على جدار الخلية ثم تحقن DNA. تُستخدم اليوم في تشخيص البكتيريا (Typing) ومكافحة التلوث الحيوي في مصانع الأغذية."
    }),
    em({
      id: "virus_mix_em", name: "خليط فيروسات منقولة بالغذاء", cat: "virus", objective: 1, density: 30,
      pop: [
        { kind: "norovirus", w: .5, size: [5, 7], col: GRY, motion: "still" },
        { kind: "rotavirus", w: .25, size: [8, 11], col: GRY, motion: "still" },
        { kind: "hav", w: .25, size: [5, 7], col: GRY, motion: "still" }
      ],
      note: "مقارنة الأحجام مهمة: الفيروسات أصغر 100 مرة من البكتيريا وتحتاج مجهرًا إلكترونيًا.",
      org: "Foodborne viruses", teach: "لا يمكن رؤية الفيروسات بالمجهر الضوئي (حد الإيضاح ~200 نانومتر). الكشف المخبري يعتمد على RT-PCR أو على الزرع الخلوي والفحص الميكروي المتخصص."
    }),
    /* ============================ parasites ============================ */
    light({
      id: "giardia", name: "كيسة جيارديا (Giardia cyst)", cat: "para", objective: 1, density: 26, umPerUnit: 0.3,
      bg: ["#e7edf5", "#cdd8e6"], stain: "لطخة رطبة/يود", halo: true,
      pop: [{ kind: "giardia_cyst", w: 1, size: [40, 60], motion: "still" }],
      note: "أكياس بَيضاوية صغيرة (8–12 ميكرومتر) — الشكل المُعدي المقاوم في البيئة.",
      org: "Giardia lamblia", teach: "ينتقل بالماء غير المعالج، ويُحتجز بفلاتر المصافي. الشكل المُعدي (الكيسة) مقاوم للكلور بتركيزاته العادية، وتُشخَّص بالفحص الميكروي أو بوقود الأجسام المضادة."
    }),
    light({
      id: "crypto", name: "بويضة كريبتوسبوريديوم (Oocyst)", cat: "para", objective: 1, density: 22, umPerUnit: 0.3,
      bg: ["#e7edf5", "#cdd8e6"], stain: "صبغة حمضية سريعة", halo: true,
      pop: [{ kind: "oocyst", w: 1, size: [34, 52], motion: "still" }],
      note: "أجسام كروية صغيرة شديدة الانكسار (4–6 ميكرومتر) تشبه الخمائر الصغيرة.",
      org: "Cryptosporidium parvum", teach: "مقاوم للكلور بشكل ملحوظ، ويرتبط بالحالات المتفشية من الماء ومياه الصرف الزراعي؛ يتطلب مرشحات 1 ميكرومتر مطلق لاحتجازه."
    }),
    light({
      id: "ascaris", name: "بيضة أسكارس (دودة مستديرة)", cat: "para", objective: 1, density: 14, umPerUnit: 0.3,
      bg: ["#e7edf5", "#cdd8e6"], stain: "لطخة رطبة", halo: true,
      pop: [{ kind: "helminth_egg", w: 1, size: [110, 170], motion: "still" }],
      note: "بيضاوية بجدار سميك متعدد الطبقات (45–75 ميكرومتر) وكتلة داخلية داكنة.",
      org: "Ascaris lumbricoides", teach: "مرتبطة بالخضروات المسمّدة بالسماد العضوي غير المعالج وبالمياه الملوثة؛ تدل على تلوث برازي حقيقي للأغذية."
    }),
    light({
      id: "cyst_mix", name: "خليط ميكروي متقدم (تحدي)", cat: "para", objective: 1, density: 45, umPerUnit: 0.3,
      bg: ["#e7edf5", "#cdd8e6"], stain: "لطخة رطبة", halo: true,
      pop: [
        { kind: "giardia_cyst", w: .35, size: [40, 58], motion: "still" },
        { kind: "oocyst", w: .25, size: [30, 46], motion: "still" },
        { kind: "yeast_budding", w: .2, size: [26, 44], motion: "still" },
        { kind: "ciliate", w: .2, size: [70, 140], motion: "swim" }
      ],
      note: "عيّنة بيئية/مائية حقيقية: يجب التفرقة بين الأكياس والخمائر والبويضات بقياس الأبعاد بدقة.",
      org: "Environmental sample", teach: "التفريق بين (كيسة جيارديا) و(خميرة) يعتمد على الحجم والشكل والانكسار الضوئي؛ القياس بالسلم المعاير هو الأداة الأهم في ميكروبيولوجيا الغذاء."
    }),
    /* ============================ food matrix ============================ */
    light({
      id: "starch", name: "نشا بطاطس تحت المجهر", cat: "food", objective: 1, density: 40, umPerUnit: 0.3,
      bg: ["#eef1f5", "#d3dae3"], stain: "بدون تلوين (مستقطب/برايت)",
      pop: [{ kind: "starch_granule", w: 1, size: [110, 220], motion: "still" }],
      note: "حبيبات بَيضاوية بأحجام مميزة (15–100 ميكرومتر) وحلقات نمو حول النواة.",
      org: "Potato starch", teach: "لكل نوع نشا شكل وحجم مميزان (بطاطس بَيضاوي كبير، قمح دائري صغير، أرز متعدد الأضلاع)؛ يُستخدم الفحص الميكروي في كشف الغش في مساحيق النشا وجبن المطبوخ."
    }),
    light({
      id: "milk_fat", name: "مستحلب اللبن — كريات الدهن", cat: "food", objective: 2, density: 60, matrix: "milkDots",
      bg: ["#eef1f5", "#d3dae3"], stain: "لطخة رطبة",
      pop: [
        { kind: "fat_globule", w: .85, size: [24, 60], motion: "brownian" },
        { kind: "coccus", w: .15, size: [5, 8], col: MBL, motion: "brownian" }
      ],
      note: "كريات دهنية بأحجام متفاوتة (0.1–15 ميكرومتر) تمثل حركة براونية في مستحلب اللبن.",
      org: "Milk emulsion", teach: "ثبات اللبن يعتمد على الغشاء الفسفوري البروتيني المحيط بكرية الدهن؛ تكسر هذا الغلاف (Churning) هو أساس صناعة الزبد."
    }),
    light({
      id: "salad_leaf", name: "سطح خضراوات (خلايا نباتية)", cat: "food", objective: 1, density: 30, matrix: "leaf", umPerUnit: 0.3,
      bg: ["#e6f0e6", "#c8dcc8"], stain: "لطخة رطبة",
      pop: [
        { kind: "coccus", w: .5, size: [5, 9], col: UNS, motion: "still" },
        { kind: "bacillus", w: .5, size: [9, 15], col: UNS, motion: "still" },
        { kind: "yeast", w: .25, size: [28, 44], motion: "still" }
      ],
      extras: [{ kind: "starch_granule", density: 12, size: [40, 90], motion: "still" }, { kind: "air_bubble", density: 8, size: [40, 90], motion: "still" }],
      note: "بلاستيدات وخلايا نباتية مربعة الشكل كخلفية، مع عدد قليل من الخلايا البكتيرية على السطح.",
      org: "Leaf surface", teach: "الخضراوات الورقية تحمل حِملًا ميكروبيًا سطحياً كبيرًا من التربة ومياه الري؛ الطريقة الموصى بها هي الغسل بمحلول مطهر مناسب (كلور 50–100 ppm) وإزالة الأوراق التالفة."
    }),
    light({
      id: "canned_mix", name: "غذاء معلب فاسد (مصحة طبيعية)", cat: "food", gram: "±", objective: 3, density: 90,
      bg: ["#efeadd", "#d6cdb8"], stain: "صبغة جرام",
      pop: [
        { kind: "bacillus_spore", w: .4, size: [12, 17], col: GP, motion: "still" },
        { kind: "bacillus", w: .35, size: [10, 15], col: GN, motion: "still" },
        { kind: "spore", w: .25, size: [5, 8], col: { color: "#cbd5e1", color2: "#fff" }, motion: "still" }
      ],
      extras: [{ kind: "dust", density: 30, size: [14, 34], motion: "still" }],
      note: "سبور وعصويات مقاومة للحرارة في معلّب متضخم = مؤشر فساد ميكروبي (Clostridium / Bacillus).",
      org: "Canned food spoilage", teach: "المعلبات المتضخمة تشير إلى نمو بكتيريا مولّدة للغاز (Clostridium botulinum خطير جدًا). التعقيم الصناعي يُقاس بقيمة F0، ويُقييم باختبار التضخم والفحص الميكروي وحساب الغاز."
    }),
    light({
      id: "dirty_bench", name: "سطح غير نظيف (مسحة بيئية)", cat: "food", gram: "±", objective: 3, density: 150,
      bg: ["#e6e9ec", "#cbd1d8"], stain: "صبغة جرام", matrix: "smear",
      pop: [
        { kind: "bacillus", w: .45, size: [8, 14], col: GN, motion: "still" },
        { kind: "coccus_cluster", w: .25, size: [18, 26], col: GP, motion: "still" },
        { kind: "yeast_budding", w: .3, size: [26, 40], motion: "still" }
      ],
      extras: [{ kind: "fat_globule", density: 60, size: [10, 22], motion: "still" }, { kind: "dust", density: 60, size: [14, 36], motion: "still" }],
      note: "حِمل ميكروبي كبير متنوع + شوائب عضوية = سطح يحتاج إعادة تنظيف وتطهير.",
      org: "Environmental swab", teach: "تُقيس جودة النظافة بمسح أسطح (10×10 سم) وعد المستعمرات على Plate Count Agar؛ تُستخدم أيضًا مسحات ATP لإعطاء نتيجة سريعة في دقائق."
    })
  ];
  const BY_ID = {}; SLIDES.forEach(s => BY_ID[s.id] = s);
  /** register a generated slide at runtime (used by the Gram-staining simulator) */
  function register(spec) { BY_ID[spec.id] = spec; if (!SLIDES.some(s => s.id === spec.id)) SLIDES.push(spec); return spec; }
  const CATS = { bact: "بكتيريا", fungi: "فطريات وخمائر", virus: "فيروسات (EM)", para: "طفيليات", food: "أغذية وبيئة" };

  /* ---------------------------------------------------------------- sprite cache */
  const sprites = new Map();
  function sprite(kind, sizePx, c1, c2, glow) {
    sizePx = Math.max(3, Math.round(sizePx));
    const key = kind + "|" + sizePx + "|" + c1 + "|" + c2;
    let sp = sprites.get(key);
    if (sp) return sp;
    const pad = sizePx * 1.6 + 6, c = document.createElement("canvas");
    c.width = c.height = Math.ceil(pad);
    const x = c.getContext("2d");
    x.translate(c.width / 2, c.height / 2);
    if (glow) {
      const g = x.createRadialGradient(0, 0, sizePx * .1, 0, 0, sizePx * .85);
      g.addColorStop(0, "rgba(255,255,255,.55)"); g.addColorStop(.55, "rgba(255,255,255,.16)"); g.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, sizePx * .85, 0, 7); x.fill();
    }
    if (kind === "hypha") {
      /* real mould hyphae are long but thin (ratio ≈ 1:50) — draw them as such in the microscope */
      const L = sizePx, th = Math.max(.8, sizePx * .048), half = L / 2;
      const gc = x.createLinearGradient(-half, 0, half, 0);
      gc.addColorStop(0, c1); gc.addColorStop(.5, c2 || c1); gc.addColorStop(1, c1);
      x.strokeStyle = gc; x.lineWidth = th; x.lineCap = "round";
      x.beginPath(); x.moveTo(-half, 0);
      for (let i = 1; i <= 26; i++) { const t = i / 26; x.lineTo((t - .5) * L, Math.sin(t * 7.5) * L * .045); }
      x.stroke();
      if (th > 1.6) {                                    // septa only when the optics can resolve them
        x.strokeStyle = "rgba(20,50,30,.45)"; x.lineWidth = Math.max(.5, th * .3);
        for (let k = -3; k <= 3; k++) {
          if (k === 0) continue;
          const px2 = (k / 3.4) * half;
          x.beginPath(); x.moveTo(px2, -th * .6); x.lineTo(px2, th * .6); x.stroke();
        }
      }
    } else MB.draw(x, kind, 0, 0, sizePx, 0, { color: c1, color2: c2 });
    sprites.set(key, c);
    if (sprites.size > 900) sprites.clear();
    return c;
  }

  /* ------------------------------------------------ seamless screen-space textures */
  let _grain = null, _emNoise = null;
  function grainPattern() {
    if (_grain) return _grain;
    const c = document.createElement("canvas"); c.width = c.height = 160;
    const x = c.getContext("2d");
    for (let i = 0; i < 160 * 160; i++) {
      const v = Math.random();
      x.fillStyle = v < .48 ? "rgba(255,255,255,.05)" : v < .8 ? "rgba(120,132,146,.045)" : "rgba(60,72,86,.05)";
      x.fillRect(i % 160, (i / 160) | 0, 1, 1);
    }
    return (_grain = c);
  }
  function emNoisePattern() {
    if (_emNoise) return _emNoise;
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const x = c.getContext("2d");
    for (let i = 0; i < 128 * 128; i++) {
      const v = Math.random() * 255;
      x.fillStyle = "rgba(" + (v | 0) + "," + (v | 0) + "," + ((v * .96) | 0) + ",.16)";
      x.fillRect(i % 128, (i / 128) | 0, 1, 1);
    }
    return (_emNoise = c);
  }

  /* ---------------------------------------------------------------- tile generation */
  function genTile(slide, tx, ty, objIdx, view) {
    const idx = MAGS[slide.mode][objIdx];
    const tileSize = view.tileSize, scale = view.scale;
    const px = Math.max(2, tileSize * scale);
    const seed = hash(slide.id + ":" + tx + ":" + ty + ":" + objIdx);
    const r = mulberry(seed);
    const x0 = tx * tileSize, y0 = ty * tileSize;

    /* ---- static background tile ---- */
    const c = document.createElement("canvas");
    c.width = c.height = Math.ceil(px + 2);
    const g = c.getContext("2d");
    g.clearRect(0, 0, px, px);                 // transparent: only the matrix texture lives here
    // food matrix texture
    drawMatrix(g, slide, px, r, scale, tileSize);
    /* ---- dynamic objects ----
       slide.density = approximate number of cells visible in ONE field of view
       at the slide's ideal objective; the count scales with (field/fieldIdeal)².
       tilesPerFieldArea = 25 because tileSize = field/5                                    */
    const objs = [];
    const fNow = MAGS[slide.mode][objIdx].field;
    const fIdeal = MAGS[slide.mode][slide.ideal == null ? (slide.objective || 0) : slide.ideal].field;
    const scaleArea = (fNow / fIdeal) * (fNow / fIdeal);
    const pops = slide.pop || [];
    const extras = slide.extras || [];
    const total = Math.max(0, Math.min(320, Math.round(slide.density * scaleArea / 25 * (.55 + r() * .9))));
    const cellScale = { light: 1, em: 1 }[slide.mode] || 1;
    /* cells smaller than ~1 px are below the resolution of the optics: bake them into the tile bitmap
       (they keep their true position, so clumps/chains and even distribution stay physically right) */
    const subPx = 1.05 / scale;
    for (let i = 0; i < total; i++) {
      const p = weighted(r, slide.pop);
      if (!p) continue;
      const sz = (p.size[0] + r() * (p.size[1] - p.size[0])) * cellScale;
      const col = p.col || (p.cols ? p.cols[Math.floor(r() * p.cols.length)] : { color: "#8899aa", color2: "#e5e7eb" });
      if (sz < subPx) {
        /* a dot of stain, ~1 px, alpha/tint scaled by how far below resolution it is.
           drawn with wrap-around so the tiled bitmap shows no seams */
        const k = Math.min(1, sz / subPx);
        g.globalAlpha = .28 + .5 * k;
        g.fillStyle = jitter(col.color, r);
        const dx = (r() * tileSize) * scale, dy = (r() * tileSize) * scale, rr = .55 + .75 * k;
        const xs = dx < rr ? [0, px] : dx > px - rr ? [0, -px] : [0];
        const ys = dy < rr ? [0, px] : dy > px - rr ? [0, -px] : [0];
        xs.forEach(ox => ys.forEach(oy => { g.beginPath(); g.arc(dx + ox, dy + oy, rr, 0, 7); g.fill(); }));
        g.globalAlpha = 1;
        continue;
      }
      objs.push({
        kind: p.kind, kindAlt: null, x: x0 + r() * tileSize, y: y0 + r() * tileSize,
        size: sz, a: (p.motion === "swim" || p.motion === "wriggle") ? r() * 6.28 : r() * 6.28,
        n: p.n ? p.n[0] + Math.floor(r() * (p.n[1] - p.n[0] + 1)) : (p.kind === "coccus_chain" ? 5 : 4),
        motion: p.motion || "still", vx: R(r) * 4, vy: R(r) * 4,
        speed: p.motion === "swim" ? 45 + r() * 55 : 22 + r() * 45,
        heading: r() * 6.28, t: r() * 1.2, phase: r() * 6.28,
        c1: jitter(col.color, r), c2: jitter(col.color2, r), tile: [tx, ty], scale
      });
    }
    extras.forEach(ex => {
      const n = Math.max(0, Math.min(120, Math.round((ex.density || 40) * scaleArea / 25 * (.5 + r()))));
      for (let i = 0; i < n; i++) {
        const sz = ex.size[0] + r() * (ex.size[1] - ex.size[0]);
        objs.push({
          kind: ex.kind, x: x0 + r() * tileSize, y: y0 + r() * tileSize, size: sz, a: r() * 6.28,
          motion: ex.motion || "still", vx: R(r) * 3, vy: R(r) * 3, speed: 20, heading: r() * 6.28,
          t: r(), phase: r() * 6.28, c1: ex.col ? ex.col.color : "#cbd5e1", c2: ex.col ? ex.col.color2 : "#ffffff",
          tile: [tx, ty], scale, static: ex.kind === "fiber" || ex.kind === "dust"
        });
      }
    });
    return { cv: c, objs, key: slide.id + "|" + tx + "|" + ty + "|" + objIdx, x0, y0, px };
  }
  function weighted(r, pop) {
    if (!pop || !pop.length) return null;
    let tot = 0; pop.forEach(p => tot += (p.w || 0));
    let v = r() * tot;
    for (const p of pop) { v -= (p.w || 0); if (v <= 0) return p; }
    return pop[pop.length - 1];
  }
  function jitter(hex, r) {
    if (!hex) return hex;
    const f = .88 + r() * .24;
    const m = /^#([0-9a-f]{6})$/i.exec(hex); if (!m) return hex;
    const n = parseInt(m[1], 16);
    const cl = v => Math.max(0, Math.min(255, Math.round(v * f)));
    return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => cl(v).toString(16).padStart(2, "0")).join("");
  }
  function drawMatrix(g, slide, px, r, scale, tileSize) {
    const m = slide.matrix;
    if (m === "milkDots" && scale > .03) {
      const n = 90;
      for (let i = 0; i < n; i++) {
        const x = r() * px, y = r() * px, rad = (1 + r() * 3.2) * Math.max(1, scale * tileSize / 1000 * 30);
        g.globalAlpha = .18 + r() * .22; g.strokeStyle = "#ffffff"; g.lineWidth = 1.1;
        g.beginPath(); g.arc(x, y, rad, 0, 7); g.stroke();
        g.globalAlpha = .07; g.fillStyle = "#ffffff"; g.fill();
      }
      g.globalAlpha = 1;
    } else if (m === "meat" && scale > .03) {
      g.globalAlpha = .16;
      for (let i = 0; i < 7; i++) {
        g.strokeStyle = i % 2 ? "#b9a68d" : "#8e7a63"; g.lineWidth = 2 + r() * 4;
        g.beginPath(); const y = r() * px;
        g.moveTo(-10, y); g.bezierCurveTo(px * .3, y + R(r) * px * .3, px * .7, y + R(r) * px * .3, px + 10, y + R(r) * px * .2);
        g.stroke();
      }
      g.globalAlpha = 1;
    } else if (m === "leaf" && scale > .03) {
      /* the cell wall grid is a real structure → wrap it across tile borders so it looks continuous */
      const step0 = Math.max(8, scale * tileSize * .06);
      g.globalAlpha = .35; g.strokeStyle = "#7fae7f"; g.lineWidth = 1.4;
      const s = Math.max(8, scale * tileSize * .06);
      for (let y = -s; y < px + s; y += s) for (let x = -s; x < px + s; x += s) {
        g.beginPath(); g.rect(x + R(r) * 2, y + R(r) * 2, s - 2, s - 2); g.stroke();
      }
      g.globalAlpha = .18; g.fillStyle = "#65a30d";
      for (let i = 0; i < 12; i++) { g.beginPath(); g.ellipse(r() * px, r() * px, s * .35, s * .22, r() * 3, 0, 7); g.fill(); }
      g.globalAlpha = 1;
    } else if (m === "bread" && scale > .03) {
      g.globalAlpha = .2; g.fillStyle = "#b08e5e";
      for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(r() * px, r() * px, 2 + r() * 5, 2 + r() * 4, 0, 0, 7); g.fill(); }
      g.globalAlpha = 1;
    }
  }

  /* ---------------------------------------------------------------- Viewer */
  function Viewer(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.slide = BY_ID[opts.slide] || SLIDES[0];
    this.objIdx = this.slide.objective == null ? 3 : this.slide.objective;
    this.focus = opts.focus == null ? .78 : opts.focus;   // 0..1 (ideal .78)
    this.illum = opts.illum == null ? .62 : opts.illum;
    this.iris = opts.iris == null ? .55 : opts.iris;
    this.oil = false;
    this.panX = 0; this.panY = 0;
    this.tiles = new Map();
    this.dustOn = true;
    this.running = false;
    this.t = 0;
    this.onFrame = opts.onFrame;
    this.selected = null;
    this.timeScale = 1;
    this._scene = document.createElement("canvas");
    this.resize();
  }
  Viewer.prototype.mag = function () { return MAGS[this.slide.mode][this.objIdx]; };
  Viewer.prototype.setSlide = function (id) {
    const s = BY_ID[id]; if (!s) return;
    this.slide = s; this.objIdx = s.objective == null ? 3 : s.objective;
    this.tiles.clear(); sprites.clear();
    this.panX = 0; this.panY = 0; this.selected = null; this.oil = false;
  };
  Viewer.prototype.setObjective = function (i) { this.objIdx = Math.max(0, Math.min(3, i)); this.tiles.clear(); };
  Viewer.prototype.resize = function () {
    const dpr = Math.min(2, W.devicePixelRatio || 1);
    const w = this.canvas.clientWidth || this.canvas.parentElement && this.canvas.parentElement.clientWidth || FIELD_PX;
    const h = this.canvas.clientHeight || w;
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    this._scene.width = this.canvas.width; this._scene.height = this.canvas.height;
    this.cssW = w; this.cssH = h; this.dpr = dpr;
  };
  Viewer.prototype.view = function () {
    const mag = this.mag();
    const fieldUnits = mag.field;                        // world units across the field
    const scale = (this.cssW / fieldUnits);              // px (css) per world unit
    const cx = this.panX + fieldUnits / 2, cy = this.panY + fieldUnits / 2;
    return { fieldUnits, scale, tileSize: mag.field / 5, cx, cy, x0: cx - fieldUnits / 2, y0: cy - fieldUnits / 2 };
  };
  /* world → css px */
  Viewer.prototype.w2p = function (x, y) { const v = this.view(); return { x: (x - v.x0) * v.scale, y: (y - v.y0) * v.scale }; };
  Viewer.prototype.p2w = function (x, y) { const v = this.view(); return { x: v.x0 + x / v.scale, y: v.y0 + y / v.scale }; };

  Viewer.prototype.focusBlur = function () {
    const dof = [.30, .16, .065, .028][this.objIdx];
    let b = Math.min(1, Math.abs(this.focus - .78) / dof);
    if (this.slide.mode === "light" && this.mag().oil && !this.oil) b = Math.max(b, .42);
    return b * (1 - .35 * this.iris);
  };
  Viewer.prototype.collect = function (v) {
    const list = [], T = v.tileSize;
    /* only the tiles that intersect the field (the 9-position wrap in render covers the edges) */
    const tx0 = Math.floor(v.x0 / T), tx1 = Math.floor((v.x0 + v.fieldUnits) / T);
    const ty0 = Math.floor(v.y0 / T), ty1 = Math.floor((v.y0 + v.fieldUnits) / T);
    let count = 0;
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const key = this.slide.id + "|" + tx + "|" + ty + "|" + this.objIdx;
      let tl = this.tiles.get(key);
      if (!tl) { tl = genTile(this.slide, tx, ty, this.objIdx, { tileSize: T, scale: v.scale }); this.tiles.set(key, tl); if (this.tiles.size > 260) { /* drop oldest */ const k0 = this.tiles.keys().next().value; this.tiles.delete(k0); } }
      list.push(tl);
      count += tl.objs.length;
    }
    this.tilesInView = list;
    return list;
  };
  Viewer.prototype.step = function (dt) {
    dt = dt * this.timeScale;
    const slide = this.slide;
    const visible = this.tilesInView || [];
    visible.forEach(tl => {
      const T = this.view().tileSize;
      tl.objs.forEach(o => {
        switch (o.motion) {
          case "swim":
            o.t -= dt; if (o.t <= 0) { o.t = .25 + Math.random() * .9; o.heading += (Math.random() - .5) * 3.6; }
            o.x += Math.cos(o.heading) * o.speed * dt; o.y += Math.sin(o.heading) * o.speed * dt; o.a = o.heading; break;
          case "wriggle":
            o.heading += Math.sin(this.t * 3 + o.phase) * dt * 4;
            o.x += Math.cos(o.heading) * o.speed * dt; o.y += Math.sin(o.heading) * o.speed * dt;
            o.a = o.heading + Math.sin(this.t * 5 + o.phase) * .7; break;
          case "brownian":
            o.vx += (Math.random() - .5) * dt * 90; o.vy += (Math.random() - .5) * dt * 90;
            o.vx *= .95; o.vy *= .95; o.x += o.vx * dt; o.y += o.vy * dt;
            o.a += (Math.random() - .5) * dt * 3; break;
          case "drift": o.x += o.vx * dt; o.y += o.vy * dt; break;
          default: o.a += Math.sin(this.t * .7 + o.phase) * dt * .04;
        }
        const dx = o.x - tl.x0, dy = o.y - tl.y0;
        o.x = tl.x0 + mod(dx, T); o.y = tl.y0 + mod(dy, T);
      });
    });
    this.t += dt;
  };
  Viewer.prototype.render = function () {
    const ctx = this.ctx, scene = this._scene.getContext("2d");
    const v = this.view(), dpr = this.dpr;
    const blur = this.focusBlur();
    /* ---------- scene ---------- */
    scene.setTransform(1, 0, 0, 1, 0, 0);
    scene.clearRect(0, 0, this._scene.width, this._scene.height);
    scene.save(); scene.scale(dpr, dpr);
    const BG = this.slide.bg || (this.slide.mode === "em" ? EM_BG : LIGHT_BG);
    const bgGrad2 = scene.createLinearGradient(0, 0, this.cssW, this.cssH);
    bgGrad2.addColorStop(0, BG[0]); bgGrad2.addColorStop(1, BG[1]);
    scene.fillStyle = bgGrad2; scene.fillRect(0, 0, this.cssW, this.cssH);
    /* seamless film grain (light) / electron-noise (EM) — screen space, so no tile edges */
    scene.save();
    if (this.slide.mode === "em") { scene.globalAlpha = .5; scene.fillStyle = scene.createPattern(emNoisePattern(), "repeat"); }
    else { scene.fillStyle = scene.createPattern(grainPattern(), "repeat"); }
    scene.fillRect(0, 0, this.cssW, this.cssH);
    scene.restore();
    const tiles = this.collect(v);
    const T = v.tileSize;
    // additive background (wrap tiles so the field is seamless)
    const drawTiles = (fn) => {
      tiles.forEach(tl => {
        const px0 = (tl.x0 - v.x0) * v.scale, py0 = (tl.y0 - v.y0) * v.scale;
        const size = T * v.scale;
        [-1, 0, 1].forEach(i => [-1, 0, 1].forEach(j => {
          const X = px0 + i * size, Y = py0 + j * size;
          if (X > this.cssW + size || Y > this.cssH + size || X < -size * 2 || Y < -size * 2) return;
          fn(tl, X, Y, size);
        }));
      });
    };
    scene.imageSmoothingEnabled = false;               // pixel-exact matrix texture → no seams
    drawTiles((tl, X, Y, size) => { scene.drawImage(tl.cv, X, Y, size, size); });
    scene.imageSmoothingEnabled = true;                 // smooth sprites again
    /* uneven illumination of the field (köhler not perfect on student scopes) — screen-space, seamless */
    {
      scene.save();
      const blot = [[.22, .30, .34, .05], [.74, .44, .30, .045], [.44, .78, .38, .04], [.86, .14, .22, .035]];
      blot.forEach(([bx, by, br, al]) => {
        const g2 = scene.createRadialGradient(this.cssW * bx, this.cssH * by, 1, this.cssW * bx, this.cssH * by, this.cssW * br);
        g2.addColorStop(0, "rgba(255,255,255," + al + ")"); g2.addColorStop(1, "rgba(255,255,255,0)");
        scene.fillStyle = g2; scene.fillRect(0, 0, this.cssW, this.cssH);
      });
      scene.restore();
    }
    /* ---------- objects ---------- */
    const glowOn = this.slide.halo || this.slide.mode === "em";
    const t = this.t;
    tiles.forEach(tl => {
      tl.objs.forEach(o => {
        const pxSize = o.size * v.scale;
        const tiny = pxSize < 1.05;                   // below the resolution of the optics → a dot of light/stain
        const sp = tiny ? null : sprite(o.kind, pxSize, o.c1, o.c2, glowOn && this.slide.halo);
        const bx = (o.x - v.x0) * v.scale, by = (o.y - v.y0) * v.scale;
        const size = T * v.scale;
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
          const X = bx + i * size, Y = by + j * size;
          if (tiny) {
            if (X < -2 || Y < -2 || X > this.cssW + 2 || Y > this.cssH + 2 || pxSize < .14) continue;
            scene.globalAlpha = Math.min(.85, .22 + pxSize * .8);
            scene.fillStyle = o.c1 || "#94a3b8";
            const d = pxSize < .45 ? 1 : 1.4;
            scene.fillRect(X - d / 2, Y - d / 2, d, d);
            scene.globalAlpha = 1;
            continue;
          }
          if (X < -sp.width || Y < -sp.height || X > this.cssW + sp.width || Y > this.cssH + sp.height) continue;
          scene.save();
          scene.translate(X, Y); scene.rotate(o.a);
          if (this.selected === o) {
            scene.shadowColor = "rgba(34,211,238,.95)"; scene.shadowBlur = 14;
          } else if (this.slide.mode === "em") {
            scene.globalAlpha = .97;
          }
          scene.drawImage(sp, -sp.width / 2, -sp.height / 2);
          scene.restore();
          if (this.selected === o) {
            scene.save(); scene.translate(X, Y);
            scene.strokeStyle = "rgba(34,211,238,.85)"; scene.lineWidth = 1.6; scene.setLineDash([4, 3]);
            scene.beginPath(); scene.arc(0, 0, Math.max(12, pxSize * .78), 0, 7); scene.stroke(); scene.restore();
          }
        }
      });
    });
    scene.restore();

    /* ---------- main: defocus + light ---------- */
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const samples = blur > .03 ? 9 : 1;
    const rad = blur * 16 * dpr;
    ctx.save();
    if (samples === 1) ctx.drawImage(this._scene, 0, 0);
    else {
      for (let s = 0; s < samples; s++) {
        const th = s / samples * 6.283;
        const dx = Math.cos(th) * rad * (.5 + Math.random() * .6), dy = Math.sin(th) * rad * (.5 + Math.random() * .6);
        ctx.globalAlpha = s === 0 ? .5 : .5 / samples;
        ctx.drawImage(this._scene, dx, dy);
      }
      ctx.globalAlpha = 1;
      // defocus lowers contrast
      ctx.fillStyle = (this.slide.bg || LIGHT_BG)[0];
      ctx.globalAlpha = blur * .38; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); ctx.globalAlpha = 1;
    }
    /* illumination */
    const I = this.illum;
    if (I < .95) { ctx.fillStyle = "rgba(2,6,12," + (Math.pow(1 - I, 1.35) * .93) + ")"; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); }
    if (I > .72) { ctx.fillStyle = "rgba(255,255,235," + ((I - .72) * 1.5) + ")"; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); }
    if (I < .16 && this.slide.mode === "light") {           // noise when light is too low
      const n = 900; ctx.fillStyle = "rgba(255,255,255," + (.05 + (0.16 - I) * .5) + ")";
      for (let i = 0; i < n; i++) ctx.fillRect(Math.random() * this.canvas.width, Math.random() * this.canvas.height, 1, 1);
    }
    /* vignette (field stop) */
    const cx = this.canvas.width / 2, cy = this.canvas.height / 2, rad0 = Math.min(cx, cy);
    const vg = ctx.createRadialGradient(cx, cy, rad0 * .68, cx, cy, rad0);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, this.slide.mode === "em" ? "rgba(0,0,0,.55)" : "rgba(20,28,38,.42)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    /* immersion oil / NA resolution hint */
    const mag = this.mag();
    if (mag.oil && !this.oil && this.slide.mode === "light") {
      ctx.fillStyle = "rgba(120,170,200,.10)"; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    /* dust on the lens (constant screen position = optics, not specimen) */
    if (this.dustOn && this.slide.mode === "light") {
      const spots = [[.18, .24, 26], [.82, .3, 18], [.66, .82, 30], [.3, .68, 14]];
      ctx.save();
      spots.forEach(([px, py, rr]) => {
        const g = ctx.createRadialGradient(cx * 2 * px, cy * 2 * py, 1, cx * 2 * px, cy * 2 * py, rr * dpr);
        g.addColorStop(0, "rgba(20,26,34,.30)"); g.addColorStop(.7, "rgba(20,26,34,.12)"); g.addColorStop(1, "rgba(20,26,34,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx * 2 * px, cy * 2 * py, rr * dpr, 0, 7); ctx.fill();
      });
      ctx.restore();
    }
    ctx.restore();
    if (this.onFrame) this.onFrame(this, blur);
  };
  Viewer.prototype.loop = function () {
    if (this.running) return; this.running = true;
    let last = performance.now();
    const tick = (now) => {
      if (!this.running) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      this.collect(this.view());
      this.step(dt);
      this.render();
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  };
  Viewer.prototype.stop = function () { this.running = false; if (this._raf) cancelAnimationFrame(this._raf); };
  Viewer.prototype.hit = function (px, py) {
    const v = this.view();
    let best = null, bd = 1e9;
    (this.tilesInView || []).forEach(tl => tl.objs.forEach(o => {
      const p = this.w2p(o.x, o.y);
      const d = Math.hypot(p.x - px, p.y - py);
      const r = Math.max(9, o.size * v.scale * .7);
      if (d < r && d < bd) { bd = d; best = o; }
    }));
    return best;
  };
  Viewer.prototype.scaleBar = function () {
    const mag = this.mag();
    const umPerWorld = this.slide.umPerUnit;
    const umAcross = mag.field * umPerWorld;
    const cands = [.1, .2, .5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
    let best = cands[0];
    cands.forEach(c => { if (c <= umAcross * .28) best = c; });
    const px = (best / umPerWorld) * (this.cssW / mag.field);
    const lab = best >= 1 ? best + " µm" : (best * 1000) + " nm";
    return { px: Math.round(px), lab, umAcross, barUm: best, nm: best < 1 };
  };
  Viewer.prototype.objectInfo = function (o) {
    const um = this.slide.umPerUnit;
    const wUm = o.size * um, hUm = o.size * um * (o.kind.indexOf("coccus") === 0 ? 1 : .45);
    return { kind: o.kind, name: MB.Morph[o.kind] || o.kind, sizeUm: wUm, hUm, motion: o.motion };
  };

  /* ================================================================== bench UI */
  function bench(root) {
    root.innerHTML = TEMPLATE();
    const $ = s => root.querySelector(s), $$ = s => Array.from(root.querySelectorAll(s));
    const canvas = $("#scopeCanvas");
    const viewer = new Viewer(canvas, { focus: .40, illum: .5, iris: .5 });
    const steps = { slide: 0, order: 0, oil: 0, light: 0, iris: 0, focus: 0, measure: 0, notebook: 0 };
    let orderLog = [];
    let curCat = "all";

    /* ---- slide rack ---- */
    function renderRack() {
      const box = $("#rack"); box.innerHTML = "";
      const cats = ["all"].concat(Object.keys(CATS));
      const chips = $("#rackCats");
      chips.innerHTML = cats.map(c => '<button class="chip' + (c === curCat ? " on" : "") + '" data-c="' + c + '">' + (c === "all" ? "الكل" : CATS[c]) + "</button>").join("");
      SLIDES.filter(s => curCat === "all" || s.cat === curCat).forEach(s => {
        const b = document.createElement("button");
        b.className = "spec-btn" + (viewer.slide.id === s.id ? " on" : "");
        b.innerHTML = '<span class="sbName">' + s.name + "</span><span class=\"sbMeta\">" + CATS[s.cat] + " · " + (MAGS[s.mode][s.objective || 0].lab) + "</span>";
        b.onclick = () => { pickSlide(s.id); };
        box.appendChild(b);
      });
      chips.querySelectorAll("button").forEach(c => c.onclick = () => { curCat = c.dataset.c; renderRack(); });
    }
    function pickSlide(id) {
      viewer.setSlide(id); viewer.setObjective(BY_ID[id].objective == null ? 3 : BY_ID[id].objective);
      viewer.focus = .40; syncUI(); renderRack(); updateSteps();
      toast("تم وضع الشريحة: " + BY_ID[id].name, "c");
      updateInfoPanel();
    }
    /* ---- objective wheel ---- */
    function renderObjectives() {
      const m = MAGS[viewer.slide.mode];
      $("#objectives").innerHTML = m.map((o, i) =>
        '<button class="objbtn' + (i === viewer.objIdx ? " on" : "") + '" data-i="' + i + '">' +
        '<span class="objlab">' + o.lab + "</span><span class=\"objna\">" + (o.oil ? "زيت" : "هواء") + "</span></button>").join("");
      $$("#objectives .objbtn").forEach(b => b.onclick = () => setObjective(+b.dataset.i));
      const cur = m[viewer.objIdx];
      $("#magOut").innerHTML = cur.lab;
      const umAcross = cur.field * viewer.slide.umPerUnit;
      $("#fovOut").textContent = (umAcross >= 1000 ? (umAcross / 1000).toFixed(2) + " mm" : umAcross.toFixed(0) + " µm");
      $("#naOut").textContent = cur.na ? "NA " + cur.na.toFixed(2) : "—";
      const sb = viewer.scaleBar();
      const bar = $("#scalebar"); bar.style.width = sb.px + "px"; $("#scalebarLab").textContent = sb.lab;
      $("#oilBtn").classList.toggle("on", viewer.oil);
      $("#oilBtn").classList.toggle("hide", !cur.oil);
      $("#oilHint").classList.toggle("hide", !cur.oil || viewer.oil);
    }
    function setObjective(i) {
      const mags = MAGS[viewer.slide.mode];
      const was = viewer.objIdx;
      if (i === was) return;
      if (i > was && viewer.focusBlur() > .45 && steps.order) toast("انتبه: البؤرة غير مضبوطة — في العمل الحقيقي ابدأ دائمًا بالعدسة الصغرى واصعد تدريجيًا.", "w");
      viewer.setObjective(i);
      orderLog.push(i);
      if (i >= 3 && mags[i].oil) { /* oil needed */ }
      renderObjectives(); updateSteps(); updateInfoPanel();
      toast("العدسة الشيئية: " + mags[i].lab, "c");
    }
    /* ---- controls ---- */
    function syncUI() {
      $("#focusSlider").value = viewer.focus; $("#focusVal").textContent = (viewer.focus * 100).toFixed(0) + "%";
      $("#illum").value = viewer.illum; $("#illumVal").textContent = Math.round(viewer.illum * 100) + "%";
      $("#iris").value = viewer.iris; $("#irisVal").textContent = Math.round(viewer.iris * 100) + "%";
      const b = viewer.focusBlur();
      $("#focusState").innerHTML = b < .12 ? '<span class="badge g">بؤرة دقيقة ✔</span>' : b < .4 ? '<span class="badge a">بؤرة قريبة</span>' : '<span class="badge r">خارج البؤرة</span>';
      renderObjectives();
    }
    let benchDone = false;
    function updateSteps() {
      $("#chkSlide").checked = !!steps.slide;
      $("#chkOrder").checked = !!steps.order;
      $("#chkOil").checked = !!steps.oil;
      $("#chkLight").checked = !!steps.light;
      $("#chkIris").checked = !!steps.iris;
      $("#chkFocus").checked = !!steps.focus;
      $("#chkMeasure").checked = !!steps.measure;
      $("#chkNote").checked = !!steps.notebook;
      const done = Object.keys(steps).filter(k => steps[k]).length;
      const pct = Math.round(done / 8 * 100);
      $("#benchProg").style.width = pct + "%";
      $("#benchPct").textContent = pct + "%";
      if (pct === 100 && !benchDone) {
        benchDone = true;
        W.VL.store.setModule("microscope", 100);
        W.VL.store.addBadge("bench-master", "أتقن تشغيل المجهر");
        W.VL.store.addXP(60, "إتمام قائمة تشغيل المجهر");
      } else if (pct < 100) W.VL.store.setModule("microscope", pct);
    }
    function checkLight() {
      if (viewer.illum > .42 && viewer.illum < .82 && !steps.light) { steps.light = 1; W.VL.store.addXP(8, "ضبط الإضاءة"); }
      if (viewer.iris > .3 && viewer.iris < .78 && !steps.iris) { steps.iris = 1; W.VL.store.addXP(8, "ضبط المكثف (فتحة العدسة)"); }
      updateSteps();
    }
    function checkFocus() {
      if (viewer.focusBlur() < .1 && !steps.focus) { steps.focus = 1; W.VL.store.addXP(12, "ضبط البؤرة"); }
      updateSteps();
    }
    function checkOrder() {
      const need = viewer.slide.mode === "light" ? [0, 1, 2, 3] : [0, 1, 2, 3];
      let ok = 0;
      for (const v of orderLog) { if (v === need[ok]) ok++; if (ok === need.length) break; }
      if (ok >= 3 && !steps.order) { steps.order = 1; W.VL.store.addXP(10, "الانتقال التدريجي بين العدسات"); updateSteps(); }
      const m = viewer.mag();
      if (m.oil && viewer.oil && !steps.oil) { steps.oil = 1; W.VL.store.addXP(12, "استخدام زيت الغمر"); updateSteps(); }
    }
    function clickField(ev) {
      const rect = canvas.getBoundingClientRect();
      const px = ev.clientX - rect.left, py = ev.clientY - rect.top;
      const o = viewer.hit(px, py);
      viewer.selected = o;
      updateInfoPanel(o);
      if (o && !steps.measure) { steps.measure = 1; W.VL.store.addXP(10, "قياس خلية بالميكرومتر"); updateSteps(); }
    }
    function updateInfoPanel(o) {
      o = o || viewer.selected;
      const box = $("#cellInfo");
      if (!o) {
        box.innerHTML = '<p class="dim small">اضغط على أي جسم داخل مجال الرؤية لقياس أبعاده ومقارنتها بالمقياس المدرج. تذكّر: المسطرة موجودة على العدسة العينية ✱ (لكل عدسة شيئية قيمتها).</p>';
        return;
      }
      const info = viewer.objectInfo(o);
      const um = info.sizeUm;
      box.innerHTML =
        '<div class="between"><b>' + info.name + "</b>" + (viewer.slide.gram ? '<span class="badge ' + (viewer.slide.gram === "+" ? "v" : "r") + '">جرام ' + viewer.slide.gram + "</span>" : "") + "</div>" +
        '<table class="mt"><tbody>' +
        "<tr><th>الطول المقاس</th><td>" + um.toFixed(2) + " µm</td></tr>" +
        "<tr><th>العرض التقديري</th><td>" + info.hUm.toFixed(2) + " µm</td></tr>" +
        "<tr><th>الحركة</th><td>" + ({ still: "ثابتة/اهتزاز براوني بسيط", brownian: "حركة براونية", swim: "سباحة بأسواط", wriggle: "حركة دوّامية", drift: "انجراف" }[info.motion] || info.motion) + "</td></tr>" +
        "<tr><th>طول المجال</th><td>" + (viewer.mag().field * viewer.slide.umPerUnit).toFixed(0) + " µm</td></tr>" +
        "</tbody></table>";
    }
    function saveField() {
      const v = viewer;
      const tmp = document.createElement("canvas");
      tmp.width = 520; tmp.height = 520;
      const c = tmp.getContext("2d");
      c.drawImage(canvas, 0, 0, tmp.width, tmp.height);
      const d = c.getImageData(0, 0, 520, 520).data;
      const px = new Uint8ClampedArray(520 * 520 * 4);
      for (let i = 0; i < px.length; i += 4) { const g = (d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11); px[i] = g; px[i + 1] = g; px[i + 2] = g; px[i + 3] = 255; }
      c.putImageData(new ImageData(px, 520, 520), 0, 0);
      const dataURL = tmp.toDataURL("image/jpeg", .62);
      const sb = v.scaleBar();
      W.VL.notebook.add({
        session: "المجهر", title: v.slide.name, kind: "field",
        summary: "عدسة " + v.mag().lab + " · مجال " + (v.mag().field * v.slide.umPerUnit).toFixed(0) + " µm · سلم " + sb.lab +
          (v.selected ? " · قياس: " + (v.selected.size * v.slide.umPerUnit).toFixed(2) + " µm (" + (MB.Morph[v.selected.kind] || "") + ")" : ""),
        img: dataURL, data: { slide: v.slide.id, mag: v.mag().lab, um: v.slide.umPerUnit, measured: v.selected ? v.selected.size * v.slide.umPerUnit : null },
        mode: "gray"
      });
      steps.notebook = 1; W.VL.store.addXP(15, "حفظ صورة حقل في الدفتر"); updateSteps();
    }
    function toast(m, k) { W.VL.UI.toast(m, k); }

    /* ---- wire ---- */
    renderRack(); renderObjectives(); syncUI(); updateSteps(); updateInfoPanel();
    $("#focusSlider").addEventListener("input", e => { viewer.focus = +e.target.value; syncUI(); checkFocus(); });
    $("#illum").addEventListener("input", e => { viewer.illum = +e.target.value; syncUI(); checkLight(); });
    $("#iris").addEventListener("input", e => { viewer.iris = +e.target.value; syncUI(); checkLight(); });
    $("#oilBtn").onclick = () => { viewer.oil = !viewer.oil; viewer.setObjective(viewer.objIdx); syncUI(); checkOrder(); toast(viewer.oil ? "تمت إضافة قطرة زيت الغمر ✔" : "تمت إزالة الزيت وتنظيف العدسة", viewer.oil ? "g" : "c"); };
    $("#cleanBtn").onclick = () => { viewer.dustOn = false; toast("تم تنظيف عدسات المجهر — لم يعد هناك أثر لشوائب العدسة", "g"); };
    $("#fieldbox").addEventListener("click", clickField);
    $("#fieldbox").addEventListener("pointerdown", e => {
      const box = $("#fieldbox"); box.classList.add("grabbing");
      let lx = e.clientX, ly = e.clientY, moved = 0;
      const move = ev => {
        const dx = ev.clientX - lx, dy = ev.clientY - ly; lx = ev.clientX; ly = ev.clientY;
        moved += Math.abs(dx) + Math.abs(dy);
        const v = viewer.view();
        viewer.panX -= dx / v.scale; viewer.panY -= dy / v.scale;
      };
      const up = () => { box.classList.remove("grabbing"); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); if (moved < 4) clickField(e); };
      window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
    });
    $("#saveField").onclick = saveField;
    $("#resetPan").onclick = () => { viewer.panX = 0; viewer.panY = 0; toast("إعادة مركز الشريحة إلى منتصف المسحة", "c"); };
    $$("[data-jump]").forEach(b => b.onclick = () => { viewer.panX = +b.dataset.x; viewer.panY = +b.dataset.y; });

    /* --- training mode --- */
    function startChallenge() {
      const pool = SLIDES.filter(s => s.pop && s.pop[0] && ["coccus", "coccus_cluster", "coccus_chain", "bacillus", "vibrio", "spirillum", "yeast", "yeast_budding", "aspergillus", "penicillium", "giardia_cyst", "oocyst", "helminth_egg", "norovirus", "rotavirus", "coronavirus", "phage", "hav", "ciliate", "fat_globule", "starch_granule"].indexOf(s.pop[0].kind) >= 0);
      const s = pool[Math.floor(Math.random() * pool.length)];
      viewer.setSlide(s.id); viewer.setObjective(s.objective == null ? 2 : s.objective);
      viewer.focus = .78; viewer.illum = .62; viewer.iris = .55; viewer.oil = true;
      syncUI(); renderRack(); orderLog = [0, 1, 2, 3]; updateSteps();
      const morphOk = MB.Morph[s.pop[0].kind];
      const others = MB.KINDS.filter(k => k !== s.pop[0].kind);
      const opts = W.VL.shuffle([morphOk, ...W.VL.shuffle(others).slice(0, 3)]);
      const ansIdx = opts.indexOf(morphOk);
      W.VL.UI.modal("🎯 تحدي المجهر — ما الشكل الذي تراه؟",
        '<p class="muted small">هذه الشريحة عشوائية ببؤرة مضبوطة. افحص مجال الرؤية ثم أجب.</p>' +
        opts.map((o, i) => '<button class="btn optq" data-i="' + i + '" style="display:block;width:100%;text-align:start;margin:6px 0">' + o + "</button>").join("") +
        '<div id="qres" class="mt"></div>',
        { onMount(box, m) {
            box.querySelectorAll(".optq").forEach(b => b.onclick = () => {
              const ok = +b.dataset.i === ansIdx;
              box.querySelectorAll(".optq").forEach((x, i) => {
                if (i === ansIdx) x.classList.add("btn", "green");
                else if (+x.dataset.i === +b.dataset.i) x.classList.add("btn", "red");
                x.disabled = true;
              });
              document.getElementById("qres").innerHTML = '<div class="note ' + (ok ? "s" : "d") + '"><b>' + (ok ? "إجابة صحيحة ✔" : "إجابة غير صحيحة") + "</b>" +
                "الشريحة: <b>" + s.name + "</b><br>" + (s.org ? "<b>الكائن: " + s.org + "</b><br>" : "") + s.note + "<br><br><b>ملاحظة علمية:</b> " + s.teach + "</div>";
              if (ok) W.VL.store.addXP(25, "إجابة صحيحة في تحدي المجهر"); else W.VL.store.addXP(5, "محاولة في تحدي المجهر");
            });
          } });
      toast("تم تحميل شريحة عشوائية — حدد الشكل في نافذة التحدي", "c");
    }

    $("#challenge").onclick = startChallenge;
    /* loop */
    viewer.loop();
    window.addEventListener("resize", () => { viewer.resize(); renderObjectives(); });
    $("#exportBench").onclick = () => {
      const lines = [
        "تقرير جلسة المجهر الافتراضي — ميكروبيولوجيا الغذاء",
        "الطالب: " + (W.VL.store.name().name || "زائر"),
        "التاريخ: " + new Date().toLocaleString("ar-EG"),
        "الشريحة الحالية: " + viewer.slide.name + " (" + (viewer.slide.org || "") + ")",
        "العدسة: " + viewer.mag().lab + " · قطر المجال: " + (viewer.mag().field * viewer.slide.umPerUnit).toFixed(0) + " µm",
        "درجة إتمام قائمة التشغيل: " + $("#benchPct").textContent,
        "",
        "خطوات منجزة:",
        "  - وضع الشريحة: " + (steps.slide ? "نعم" : "لا"),
        "  - الانتقال التدريجي بين العدسات: " + (steps.order ? "نعم" : "لا"),
        "  - زيت الغمر: " + (steps.oil ? "نعم" : "لا"),
        "  - ضبط الإضاءة: " + (steps.light ? "نعم" : "لا"),
        "  - ضبط فتحة المكثف: " + (steps.iris ? "نعم" : "لا"),
        "  - ضبط البؤرة: " + (steps.focus ? "نعم" : "لا"),
        "  - قياس خلية بالميكرومتر: " + (steps.measure ? "نعم" : "لا"),
        "  - حفظ حقل في الدفتر: " + (steps.notebook ? "نعم" : "لا"),
        "",
        "ملاحظات علمية على الشريحة:", viewer.slide.note, "", viewer.slide.teach
      ];
      W.VL.download("تقرير-جلسة-المجهر.txt", lines.join("\n"));
    };
    const objToDraw = steps;
    steps.slide = 1; updateSteps();
    return viewer;
  }
  function TEMPLATE() {
    return `
<div class="grid" style="grid-template-columns:1.5fr 1fr;gap:16px" id="benchGrid">
  <div>
    <div class="inst">
      <div class="between mb">
        <div class="row">
          <span class="pill">🔬 عدسة شيئية: <b id="magOut">100×</b></span>
          <span class="pill">قطر المجال: <b id="fovOut">—</b></span>
          <span class="pill">فتحة عدسية: <b id="naOut">—</b></span>
          <span id="focusState"></span>
        </div>
        <button class="btn xs ghost" id="cleanBtn">🧽 تنظيف العدسات</button>
      </div>
      <div class="scope-body">
        <div id="fieldbox" class="fieldbox">
          <canvas id="scopeCanvas"></canvas>
          <div class="fovlabel">مجال الرؤية — اسحب للتحرك على الشريحة</div>
          <div class="scalebar" id="scalebarWrap"><div id="scalebarLab">20 µm</div><div class="b" id="scalebar" style="width:60px"></div></div>
        </div>
        <div class="scope-arm"></div><div class="scope-base"></div>
      </div>
      <div class="row mt" style="justify-content:center">
        <button class="btn sm" id="resetPan">🎯 توسيط الشريحة</button>
        <button class="btn sm" id="saveField">🗂 حفظ الحقل في الدفتر</button>
        <button class="btn sm primary" id="challenge">🎯 تحدي تحديد الشكل</button>
      </div>
      <div class="row mt" style="justify-content:center">
        <span class="tiny dim">مساحة تحتوي خلايا موزعة عشوائيًا (مسحة حقيقية):</span>
        <button class="btn xs ghost" data-jump data-x="-3000" data-y="-1200">φ موقع ١</button>
        <button class="btn xs ghost" data-jump data-x="1800" data-y="2400">φ موقع ٢</button>
        <button class="btn xs ghost" data-jump data-x="-900" data-y="3200">φ موقع ٣</button>
      </div>
    </div>
    <div class="card mt">
      <h3>🎛 لوحة التحكم بالمجهر</h3>
      <div class="grid g2">
        <div>
          <label class="f">🎚 بؤرة دقيقة (Fine Focus) / خشنة</label>
          <input type="range" id="focusSlider" min="0" max="1" step="0.005" value="0.4">
          <div class="gauge"><span>0%</span><span id="focusVal">40%</span><span>100%</span></div>
          <div class="row mt">
            <button class="btn sm" onclick="document.getElementById('focusSlider').value=Math.max(0,+document.getElementById('focusSlider').value-0.02);document.getElementById('focusSlider').dispatchEvent(new Event('input'))">◀ خطوة صغيرة</button>
            <button class="btn sm" onclick="document.getElementById('focusSlider').value=Math.min(1,+document.getElementById('focusSlider').value+0.02);document.getElementById('focusSlider').dispatchEvent(new Event('input'))">خطوة صغيرة ▶</button>
          </div>
        </div>
        <div>
          <label class="f">💡 شدة الإضاءة (المصباح)</label>
          <input type="range" id="illum" min="0" max="1" step="0.01" value="0.5">
          <div class="gauge"><span>مظلم</span><span id="illumVal">50%</span><span>ساطح/محروق</span></div>
          <label class="f">🔆 فتحة المكثف (Iris Diaphragm) — تتحكم في التباين وعمق الميدان</label>
          <input type="range" id="iris" min="0" max="1" step="0.01" value="0.5">
          <div class="gauge"><span>مغلقة (تباين عالٍ)</span><span id="irisVal">50%</span><span>مفتوحة</span></div>
        </div>
      </div>
      <div class="panel2 mt">
        <div class="row between">
          <div><b>💧 زيت الغمر (Immersion Oil)</b><div class="tiny dim">يُضاف فقط مع العدسة 100× ويرفع الفتحة العدسية حتى 1.25 فيزيد الإيضاح (Resolution) لا التكبير.</div></div>
          <button class="btn" id="oilBtn">إضافة زيت الغمر</button>
        </div>
        <div class="note w hide" id="oilHint"><b>مطلوب زيت الغمر</b>مع العدسة 100× لن تتمكن من رؤية تفاصيل واضحة بدون قطرة زيت بين العدسة والشريحة؛ الزيت له معامل انكسار قريب من الزجاج فلا ينحرف الضوء.</div>
      </div>
      <div class="mt">
        <div class="row" style="justify-content:space-between">
          <b>🔭 العدسات الشيئية (ابدأ من الأصغر دائمًا)</b>
          <span class="small dim">اكتمال قائمة التشغيل: <b id="benchPct">0%</b></span>
        </div>
        <div class="objrow mt" id="objectives"></div>
        <div class="prog mt"><i id="benchProg" style="width:0%"></i></div>
      </div>
    </div>
  </div>
  <div>
    <div class="card">
      <h3>🧾 حامل الشرائح (Slide Rack)</h3>
      <div class="chips mb" id="rackCats"></div>
      <div id="rack" class="rack"></div>
    </div>
    <div class="card mt">
      <h3>📏 نتيجة القياس</h3>
      <div id="cellInfo"></div>
    </div>
    <div class="card mt">
      <h3>✅ قائمة تشغيل الجلسة العملية</h3>
      <ul class="list-check small">
        <li><label class="switch"><input type="checkbox" id="chkSlide" disabled> ضع الشريحة على المنصة (اختر من الحامل)</label></li>
        <li><label class="switch"><input type="checkbox" id="chkOrder" disabled> 4× ← 10× ← 40× ← 100× لا تبدأ بالعدسة الكبرى</label></li>
        <li><label class="switch"><input type="checkbox" id="chkLight" disabled> اضبط شدة الإضاءة (بين 42%–82%)</label></li>
        <li><label class="switch"><input type="checkbox" id="chkIris" disabled> اضبط فتحة المكثف</label></li>
        <li><label class="switch"><input type="checkbox" id="chkFocus" disabled> ضع البؤرة في المستوى البؤري للشريحة</label></li>
        <li><label class="switch"><input type="checkbox" id="chkOil" disabled> استخدم زيت الغمر مع العدسة 100×</label></li>
        <li><label class="switch"><input type="checkbox" id="chkMeasure" disabled> قِس خلية واحدة بالميكرومتر (اضغط عليها)</label></li>
        <li><label class="switch"><input type="checkbox" id="chkNote" disabled> احفظ الحقل في دفتر المعمل</label></li>
      </ul>
      <div class="row"><button class="btn sm ghost" id="exportBench">⬇ تصدير تقرير الجلسة</button></div>
    </div>
  </div>
</div>`;
  }

  /* ================================================================== embed */
  function embed(box, slideId, opts) {
    opts = opts || {};
    box.innerHTML =
      '<div class="grid" style="grid-template-columns:1.6fr 1fr;gap:14px">' +
      '<div><div class="fieldbox" id="embField"><canvas id="embCanvas"></canvas>' +
      '<div class="fovlabel">' + (opts.hint || "اسحب للتحرك داخل الشريحة") + "</div>" +
      '<div class="scalebar"><div id="embLab">20 µm</div><div class="b" id="embBar" style="width:60px"></div></div></div></div>' +
      '<div><div class="objrow" id="embObjs"></div>' +
      '<div class="mt"><label class="f">البؤرة الدقيقة (Focus)</label><input type="range" id="embFocus" min="0" max="1" step="0.005" value="0.5">' +
      '<div class="gauge"><span id="embFocusV">50%</span><span></span><span id="embFocusS"></span></div></div>' +
      '<div class="mt"><label class="f">الإضاءة</label><input type="range" id="embIllum" min="0" max="1" step="0.01" value="0.62"></div>' +
      '<div class="mt"><label class="f">فتحة المكثف</label><input type="range" id="embIris" min="0" max="1" step="0.01" value="0.55"></div>' +
      '<div class="note mt small" id="embNote"></div></div></div>';
    const $ = s => box.querySelector(s);
    const viewer = new Viewer($("#embCanvas"), { slide: slideId });
    const mags = MAGS[viewer.slide.mode];
    $("#embObjs").innerHTML = mags.map((m, i) => '<button class="objbtn' + (i === viewer.objIdx ? " on" : "") + '" data-i="' + i + '">' + m.lab + "</button>").join("") +
      (viewer.slide.mode === "light" ? '<button class="btn sm ghost" id="embOil">💧 زيت الغمر</button>' : "");
    const upd = () => {
      const sb = viewer.scaleBar();
      box.querySelectorAll(".objbtn").forEach(b => b.classList.toggle("on", +b.dataset.i === viewer.objIdx));
      $("#embBar").style.width = sb.px + "px"; $("#embLab").textContent = sb.lab;
      $("#embFocusV").textContent = Math.round(viewer.focus * 100) + "%";
      const b = viewer.focusBlur();
      $("#embFocusS").innerHTML = b < .12 ? '<span class="badge g">بؤرة دقيقة</span>' : b < .4 ? '<span class="badge a">قريبة</span>' : '<span class="badge r">خارج البؤرة</span>';
      const m = viewer.mag();
      $("#embNote").innerHTML = "<b>المقاس الحقيقي:</b> قطر مجال الرؤية = " + (m.field * viewer.slide.umPerUnit).toFixed(0) + " µm. " +
        (m.oil && !viewer.oil ? "أضف زيت الغمر مع العدسة 100× لتحصل على الإيضاح الكامل. " : "") + viewer.slide.note;
    };
    box.querySelectorAll(".objbtn").forEach(b => b.onclick = () => { viewer.setObjective(+b.dataset.i); upd(); });
    if ($("#embOil")) $("#embOil").onclick = e => { viewer.oil = !viewer.oil; e.target.classList.toggle("on", viewer.oil); upd(); };
    $("#embFocus").addEventListener("input", e => { viewer.focus = +e.target.value; upd(); });
    $("#embIllum").addEventListener("input", e => { viewer.illum = +e.target.value; upd(); });
    $("#embIris").addEventListener("input", e => { viewer.iris = +e.target.value; upd(); });
    $("#embField").addEventListener("pointerdown", e => {
      let lx = e.clientX, ly = e.clientY;
      const move = ev => { const v = viewer.view(); viewer.panX -= (ev.clientX - lx) / v.scale; viewer.panY -= (ev.clientY - ly) / v.scale; lx = ev.clientX; ly = ev.clientY; };
      const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
      window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
    });
    if (viewer.slide.mode === "light") { viewer.focus = .78; viewer.oil = true; $("#embFocus").value = .78; }
    viewer.loop();
    setTimeout(() => { viewer.resize(); upd(); }, 60);
    window.addEventListener("resize", () => { viewer.resize(); upd(); });
    return viewer;
  }

  W.SCOPE = { SLIDES, BY_ID, CATS, MAGS, Viewer, bench, embed, register, FIELD_PX };
})(window);
