/* ==========================================================================
   studio.js — استوديو المعمل: التعليق الصوتي (عربي/إنجليزي) + تسجيل الشاشة
   --------------------------------------------------------------------------
   * شرح منطوق لكل صفحة ولكل خطوة عملية، بصوت المتصفح (Web Speech) أو بمقاطع
     صوتية مسجّلة مضمّنة (assets/audio/...) عند توفّرها.
   * تسجيل شاشة الطالب (شاشة كاملة أو مجال المعمل) مع الصوت: ميكروفون الطالب
     و/أو التعليق الآلي — لإنتاج تقرير مصوّر جاهز للتسليم (.webm).
   لا يعتمد على أي مكتبة خارجية.
   ========================================================================== */
(function (W) {
  "use strict";
  const V = W.VL;
  if (!V) { console.warn("studio.js بحاجة إلى core.js قبله"); return; }
  const { $, $$, el, esc, LS, UI } = V;

  /* =====================================================================
     ١) نصوص التعليق — كل مدخل: { ar, en }
     ===================================================================== */
  const N = (ar, en) => ({ ar, en });

  const PAGES = {
    "index.html": N(
      "مرحبًا بك في المعمل الافتراضي لميكروبيولوجيا الأغذية. هذه الصفحة خريطة المعمل: ثلاث عشرة وحدة تدريبية تغطي العمل العقيم، الزرع، التخفيف والعدّ، صبغة جرام، المجهر، الأوساط الغذائية، موسوعة الميكروبات، الأجهزة، الجلسات العملية، الفيديوهات والاختبارات ودفتر المعمل. ابدأ من خريطة المعمل بالأسفل، ثم انتقل إلى الوحدة التي تريد التدريب عليها. كل خطوة تنفّذها تُحتسب لك نقاط خبرة، وكل نتيجة تُحفظ في دفترك.",
      "Welcome to the virtual food microbiology laboratory. This page is your lab map: thirteen training modules covering aseptic technique, plating, serial dilution and counting, Gram staining, the microscope, culture media, a pathogen encyclopaedia, instruments, practical sessions, videos, quizzes and the lab notebook. Start from the lab map below, then open the module you want to train on. Every step you complete earns experience points, and every result is saved to your notebook."
    ),
    "safety.html": N(
      "قبل أي عمل عملي، السلامة أولًا. في هذه الوحدة: معدات الوقاية الشخصية، قواعد المعمل، المخاطر البيولوجية والكيميائية والحرارية، التعامل مع الانسكابات، غسل اليدين، إدارة النفايات الحيوية، وأساسيات نظام تحليل المخاطر HACCP. الطالب الذي يفهم السلامة يوفّر على نفسه أسوأ أنواع الأخطاء المعملية. أكمل الاختبار في نهاية الصفحة لتثبيت المعلومة.",
      "Before any bench work, safety comes first. In this module you will cover personal protective equipment, laboratory rules, biological, chemical and thermal hazards, spill response, hand hygiene, biohazard waste management, and the basics of HACCP. A student who understands safety avoids the worst kind of laboratory errors. Finish the quiz at the end of the page to lock the knowledge in."
    ),
    "bench.html": N(
      "الزرع والعزل: هذه مهارة اليدين التي يحتاجها كل ميكروبيولوجي. ستتدرّب أولًا على ترتيب العمل العقيم بسبع خطوات، ثم على تخطيط الطبق بالأرباع للحصول على مستعمرات منفصلة، مع تعقيم الإبرة باللهب بين كل ربع. الهدف العملي: مستعمرة منفصلة واحدة تعني أن كل خطوة لاحقة ممكنة — تعريف، عدّ، وتشخيص.",
      "Plating and isolation is the hands-on skill every microbiologist needs. You will first practise the seven-step aseptic sequence, then the four-quadrant streaking technique to obtain single, well-isolated colonies, flaming the loop between quadrants. The practical goal: one isolated colony makes everything downstream possible — identification, counting and characterisation."
    ),
    "dilution.html": N(
      "التخفيف المتسلسل والعدّ هو لسان حال ميكروبيولوجيا الغذاء بالأرقام. في هذا التدريب: ستة أنابيب بتخفيف عشري متتابع، خلط دقيق، ثم طبق بكمية معروفة، فتحضين، فعدّ المستعمرات. بعدها تحسب عدد الوحدات المكوّنة للمستعمرة في الغرام. تذكّر: نطاق العدّ المقبول من ثلاثين إلى ثلاثمئة مستعمرة في الطبق، والخارج عن ذلك يُهمل أو يُعاد.",
      "Serial dilution and counting is how food microbiology speaks in numbers. In this exercise you get six tubes of ten-fold dilutions, careful mixing, plating of a known volume, incubation, and then colony counting. You then calculate the number of colony-forming units per gram. Remember: the countable range is thirty to three hundred colonies per plate; anything outside it is discarded or repeated."
    ),
    "gram.html": N(
      "صبغة جرام هي أهم صبغة تفريقية في العمل الميكروبيولوجي، وهي الخطوة الأولى في أي تشخيص. الخطوات بالترتيب: تحضير المسحة، التثبيت الحراري، الكريستال البنفسجي، محلول اليود المثبّت، مزيل اللون، السافرانين، الغسل والتجفيف، ثم الفحص بالعدسة المئة مع زيت الغمر. الخطوة الحرجة هي مزيل اللون: من ثانية إلى ثلاث ثوانٍ. التقصير يجعل السالبة تبدو موجبة، والإفراط يجعل الموجبة تبدو سالبة.",
      "The Gram stain is the most important differential stain in microbiology and the first step of any identification. The order is: prepare the smear, heat-fix, crystal violet, iodine mordant, decolouriser, safranin, wash and air-dry, then examine at one hundred times with immersion oil. The critical step is the decolouriser: one to three seconds. Too short and Gram-negative cells look positive; too long and Gram-positive cells look negative."
    ),
    "microscope.html": N(
      "المجهر هو عين الميكروبيولوجي. هنا ستتدرب على البصريات الحقيقية: اختيار العدسة، ضبط البؤرة، شدة الإضاءة، فتحة المكثّف، ثم إضافة زيت الغمر عند العدسة المئة لأن معامل الانكسار المطابق يرفع الفتحة العددية إلى واحد وربع. وتذكّر: كبّر الفحص الأخير قبل الحكم على الشكل والماليّات؛ قِس خلية بالميكرومتر لتتأكد من الحجم.",
      "The microscope is the microbiologist's eye. Here you will train real optics: choosing the objective, focusing, adjusting light intensity and condenser aperture, then adding immersion oil at one hundred times because a matching refractive index raises the numerical aperture to one point two five. And remember: sharpen the critical focus before judging shape and motility, and measure a cell in micrometres to confirm its size."
    ),
    "media.html": N(
      "الأوساط الغذائية: كل وسط له وظيفة. وسط PCA للعد الكلي، وVRBA لمجموعة القولونيات، وMacConkey للمخمّرات وغير المخمّرات، وXLD لسالمونيلا وشيغيلا، وMSA للعنقوديات الذهبية. في هذه الوحدة ستحضّر وسطًا بالحساب الصحيح للكتلة، وتذوّب وتعقّم وتسكب في الأطباق، ثم تقرأ أطباقًا حقيقية بالألوان والمظاهر الصحيحة.",
      "Culture media: every medium has a job. Plate count agar for total counts, VRBA for coliforms, MacConkey to separate lactose fermenters from non-fermenters, XLD for Salmonella and Shigella, and mannitol salt agar for Staphylococcus aureus. In this module you will prepare a medium with correct mass calculations, dissolve, sterilise and pour plates, and then read real plates using the correct colours and appearances."
    ),
    "pathogens.html": N(
      "موسوعة الميكروبات: أربع وثلاثون بطاقة، من الإشريكية القولونية والسالمونيلا والليستيريا، إلى النوروفيروس والروتا فيروس، والأعفان المنتجة للسموم، وطفيليات المياه والأغذية. كل بطاقة تعطيك الشكل تحت المجهر، والصبغة، والمقاس، والمصدر الغذائي، والمرض، والجرعة المعدية، والحد التنظيمي، وطرق الكشف والمكافحة. ابحث وصفِّ حسب النوع، وأضف ما يهمك إلى دفترك.",
      "The pathogen encyclopaedia: thirty four cards, from Escherichia coli, Salmonella and Listeria, to norovirus and rotavirus, toxin-producing moulds, and food and water parasites. Each card gives you the microscopic shape, the Gram reaction, the size, the food source, the disease, the infective dose, the regulatory limit, and detection and control methods. Filter by type and add what matters to your notebook."
    ),
    "instruments.html": N(
      "الأجهزة: الأوتوكلاف يقتل بالأبخرة المشبعة عند مئة وواحد وعشرين درجة لخمس عشرة دقيقة على الأقل، والتحقق يكون بشريط بوغ ومؤشر كيميائي. الحاضنة تعطي الحرارة والجو المناسبين. جهاز PCR يضخّم الحمض النووي ليصل إلى حد الكشف. جهاز الـ pH، ومقياس النشاط المائي، والطرد المركزي، والسبكتروفوتومتر لقياس العكارة وتحويلها إلى عدد تقديري للخلايا، وسلسلة التبريد التي تمنع تضاعف الأعداد.",
      "Instruments: the autoclave kills with saturated steam at one hundred and twenty one degrees for at least fifteen minutes, and verification uses a spore strip plus a chemical indicator. The incubator supplies the right temperature and atmosphere. PCR amplifies DNA down to the detection limit. Then the pH meter, the water activity meter, the centrifuge, the spectrophotometer for turbidity as an estimate of cell numbers, and the cold chain that stops numbers from multiplying."
    ),
    "curriculum.html": N(
      "الجلسات العملية: أربع عشرة جلسة كاملة الأهداف والمواد والخطوات وأسئلة النقاش، مبنية على منهج عملي حقيقي لميكروبيولوجيا الغذاء. رتّبها كما هي أو بحسب مسارك المهني: مسار فحص الجودة، أو مسار سلامة الغذاء والالتزام التنظيمي، أو المسار البحثي. في النهاية خطة عمل قابلة للتصدير وشهادة إتمام باسمك.",
      "Practical sessions: fourteen complete sessions with objectives, materials, procedures and discussion questions, modelled on a real food microbiology laboratory course. Take them in order or by career track: quality control testing, food safety and regulatory compliance, or research. At the end you get an exportable action plan and a certificate in your name."
    ),
    "videos.html": N(
      "الفيديوهات العملية: ثلاثة وثلاثون مقطعًا مصنّفًا حسب الوسم واللغة، من صبغة جرام وتخطيط الطبق إلى حساب قيمة D ومحاكاة PCR. بعضها عربي وبعضها إنجليزي، وتُفتح داخل الصفحة. وإلى جانبها أربع محاكيات حركية تعمل دون إنترنت: منحنى النمو البكتيري، بصريات زيت الغمر، منحنى القتل الحراري، ودورات PCR.",
      "Practical videos: thirty three clips tagged by topic and language, from the Gram stain and quadrant streaking to D-value calculation and a PCR simulation. Some are in Arabic and some in English, and they open right inside the page. Alongside them are four animated simulators that work offline: the bacterial growth curve, immersion oil optics, the thermal death curve, and PCR cycles."
    ),
    "quiz.html": N(
      "الاختبارات: ثمانية وسبعون سؤالًا في أحد عشر موضوعًا. اختر الموضوع وعدد الأسئلة، وستُصحَّح إجاباتك فورًا مع شرح لكل سؤال. النتائج تُحفظ لكل موضوع حتى تعرف نقطة ضعفك بالضبط وتعود إليها من الجلسة العملية المناسبة.",
      "Quizzes: seventy eight questions across eleven topics. Choose a topic and the number of questions; your answers are marked instantly with an explanation for each question. Scores are stored per topic so you can see exactly where your weak point is and go back to the matching practical session."
    ),
    "notebook.html": N(
      "دفتر المعمل: كل نتيجة سجّلتها في هذا التطبيق تجتمع هنا — الحقول المجهرية بمقاساتها، نتائج صبغة جرام وحكم أخطائها، تسلسلات التخفيف وحسابات الـ CFU، قراءات الأوساط، ودورات الأجهزة. صنّف، احذف، واطبع أو صدّر الدفتر نصيًّا أو كملف CSV، وضع بياناتك ليظهر اسمك في التقارير والشهادة.",
      "The lab notebook: every result you have recorded in this application comes together here — microscopic fields with their measurements, Gram stain outcomes and error verdicts, dilution series and CFU calculations, media readings, and instrument runs. Filter, delete, and print or export the notebook as text or CSV, and set your details so your name appears in reports and the certificate."
    )
  };

  /* ---- خطوات المحاكيات: المفتاح = "الوحدة.الخطوة" ---- */
  const STEPS = {
    /* ------------------------------------------------ المجهر */
    "micro.enter": N("ابدأ بأقل تكبير لتحديد موضع الشريحة، ثم ارفع التكبير تدريجيًا. لا تنتقل إلى عدسة أقوى قبل أن تكون البؤرة مضبوطة على الحالية.",
      "Start at the lowest magnification to locate the specimen, then increase magnification gradually. Never move to a stronger objective before the current one is in sharp focus."),
    "micro.objective": N("غيّر العدسة من القرص الدوّار. مع كل تكبير جديد أعد ضبط البؤرة، لأن عمق الميدان يضيق كلما ارتفع التكبير.",
      "Change the objective on the rotating nosepiece. Refocus with every new objective, because depth of field narrows as magnification rises."),
    "micro.focus": N("اضبط البؤرة الدقيقة. الحكم على الشكل والحركة لا يكون إلا في المستوى البؤري: خلية باهتة أو هالة واسعة تعني أن البؤرة غير مضبوطة.",
      "Adjust the fine focus. You can only judge shape and motility in the focal plane: a blurred cell with a wide halo means you are out of focus."),
    "micro.illum": N("اضبط شدة الإضاءة وفتحة المكثّف. الإضاءة الزائدة تغسل التفاصيل، والمنخفضة تُظهر ضجيجًا ولا تُظهر الخلية.",
      "Adjust light intensity and condenser aperture. Too much light washes out detail; too little shows only noise, not the cell."),
    "micro.oil": N("أضف زيت الغمر مع العدسة المئة. الزيت له معامل انكسار قريب من الزجاج، فيمنع انحراف الأشعة ويرفع الفتحة العددية إلى واحد وربع، وهذا ما يجعل الصورة واضحة تمامًا. لا تستخدم زيت الغمر مع أي عدسة أخرى.",
      "Add immersion oil with the hundred times objective. Its refractive index matches glass, so light rays no longer bend away, raising the numerical aperture to one point two five — that is what makes the image crisp. Never use immersion oil with any other objective."),
    "micro.measure": N("اضغط على خلية واحدة لقياسها بالميكرومتر. القياس هو ما يميّز بين كائن وآخر متشابه في الشكل، وبين خلية وشيء غير حي.",
      "Click a single cell to measure it in micrometres. Measurement is what separates two organisms of similar shape, and separates a cell from something non-living."),
    "micro.save": N("احفظ الحقل في دفتر المعمل. التدوين الفوري على المنصة أفضل من الذاكرة، وهو أول ما يُطلب منك في التقرير.",
      "Save the field to the lab notebook. Recording on the spot beats memory, and it is the first thing your report will ask for."),
    "micro.challenge": N("تحدٍّ للعين: افحص الحقل بعناية، ثم حدّد الشكل الصحيح. ستظهر لك ملاحظة علمية تشرح الفرق بين البدائل.",
      "An eye challenge: examine the field carefully, then pick the correct morphology. A scientific note will explain the difference between the options."),
    "micro.dust": N("لاحظ البقع الثابتة في مواضعها. إذا كانت لا تتحرك مع تحريك الشريحة فهي غبار على العدسة أو على المكثّف، وليست جزءًا من العيّنة.",
      "Notice the spots that stay in place. If they do not move when you move the slide, they are dust on the lens or condenser, not part of the specimen."),

    /* ------------------------------------------------ صبغة جرام */
    "gram.s0": N("الخطوة الأولى: حضّر مسحة رقيقة من مزرعة مختلطة على الشريحة، ووزّعها بمساحة بحجم قطعة نقود صغيرة، ثم اتركها تجف في الهواء.",
      "Step one: prepare a thin smear from a mixed culture, spread it over an area the size of a small coin, and let it air-dry."),
    "gram.s1": N("ثبّت المسحة. التمرير السريع فوق اللهب ثلاث مرات يقتل الخلايا ويلصقها بالزجاج، فلا تُغسل في الخطوات التالية. الإفراط في التسخين يحرق الشكل ويفسد النتيجة.",
      "Heat-fix the smear. Three quick passes through the flame kill the cells and stick them to the glass so they are not washed away later. Overheating distorts the shapes and ruins the result."),
    "gram.s2": N("صبغة الكريستال البنفسجي لمدة ستين ثانية. هذه الصبغة تدخل جميع الخلايا، الموجبة والسالبة، فتصبح كل الخلايا بنفسجية حتى الآن.",
      "Crystal violet for sixty seconds. This primary stain enters all cells, Gram-positive and Gram-negative alike, so at this point everything is violet."),
    "gram.s3": N("محلول اليود لمدة ستين ثانية. اليود يعمل كمثبّت، فيتحد مع الصبغة داخل الخلية مكوّنًا معقدًا كبيرًا يصعب خروجه من الجدار السميك للخلايا الموجبة.",
      "Iodine for sixty seconds. Iodine acts as a mordant: it forms a large complex with the dye inside the cell that is hard to remove through the thick wall of Gram-positive cells."),
    "gram.s4": N("مزيل اللون: الكحول أو الأسيتون. اضغط مع الاستمرار وأفلت في الوقت المناسب. من ثانية إلى ثلاث ثوانٍ للعصويات. هذه هي الخطوة الحرجة التي تحدد النتيجة كلها.",
      "The decolouriser: alcohol or acetone. Press and hold, then release at the right moment. One to three seconds for smears like this one. This is the decisive step that determines the entire result."),
    "gram.s5": N("صبغة السافرانين لمدة ستين ثانية. الخلايا السالبة التي فقدت اللون البنفسجي تلتقط اللون الوردي، فتصبح الموجبة بنفسجية والسالبة وردية. هذه هي الصورة التفريقية.",
      "Safranin for sixty seconds. The decolourised Gram-negative cells take up the pink counterstain, so Gram-positives appear violet and Gram-negatives pink. That is the differential picture."),
    "gram.s6": N("اغسل بالماء بلطف ثم جفّف في الهواء. لا تفرك الشريحة، فالمسحة رقيقة جدًا والفرك يزيل الخلايا كلها.",
      "Wash gently with water, then air-dry. Do not rub the slide: the smear is very thin and rubbing removes all the cells."),
    "gram.s7": N("افحص الآن بالعدسة المئة مع زيت الغمر. ابدأ من حافة المسحة حيث تكون الخلايا مفردة وأوضح.",
      "Now examine at one hundred times with immersion oil. Begin at the edge of the smear where the cells are single and clearest."),
    "gram.wrong": N("الكاشف المستخدم لا يخص هذه الخطوة. الترتيب في صبغة جرام ليس اختياريًا؛ أي تبديل يُفسد النتيجة التفريقية ويُسجَّل في تقريرك.",
      "That reagent does not belong to this step. The order in a Gram stain is not optional: any swap ruins the differential result and is recorded in your report."),
    "gram.res1": N("النتيجة صحيحة تفريقية: الكرويات العنقودية بنفسجية لأن الجدار السميك حبس معقد الكريستال البنفسجي، والعصويات وردية لأن الطبقة الدهنية الخارجية أُزيلت بالكحول فتلقّت السافرانين. هكذا تبدو مزرعة مختلطة حقيقية.",
      "Correct differential result: the staphylococci are violet because the thick wall retained the crystal violet complex, and the bacilli are pink because the outer lipid layer was removed by alcohol and took up safranin. This is what a real mixed culture looks like."),
    "gram.res2": N("كل الخلايا وردية: هذا إفراط في إزالة اللون أو حذف لخطوة حاسمة. أشهر خطأ معملي، ويؤدي إلى تشخيص خاطئ تمامًا. أعد التحضير بمسحة جديدة.",
      "All cells are pink: the smear was over-decolourised or a critical step was skipped. This is the most common bench error and it leads to a completely wrong identification. Prepare a fresh smear and repeat."),
    "gram.res3": N("كل الخلايا بنفسجية: زمن مزيل اللون كان أقل من ثانية، فاحتفظت الخلايا السالبة بالمعقد البنفسجي. أعد الخطوة مع عدّ الثواني بصوت مسموع.",
      "All cells are violet: the decolouriser was applied for less than a second, so the Gram-negative cells kept the violet complex. Repeat while counting the seconds out loud."),
    "gram.res4": N("الشريحة باهتة: الشطف الزائد أضعف الصبغة، والنتيجة غير موثوقة. النتيجة غير الموثوقة أسوأ من نتيجة خاطئة واضحة، لأنها قد تُقبل بالخطأ.",
      "The slide looks faded: excessive washing weakened the stain and the result is unreliable. An unreliable result is worse than a clearly wrong one, because it may be accepted by mistake."),
    "gram.res5": N("الشريحة فارغة: المسحة لم تُثبّت بالحرارة، فغُسلت الخلايا كلها في أول شطف. لا يمكن قراءة أي شيء؛ أعد التحضير مع تثبيت صحيح.",
      "The slide is empty: the smear was never heat-fixed, so all the cells were washed away at the first rinse. Nothing can be read; prepare again with proper fixation."),

    /* ------------------------------------------------ الزرع */
    "bench.a0": N("أشعل اللهب أولًا، قبل فتح أي أنبوب أو طبق. منطقة العمل في نطاق الهواء الساخن الصاعد تكون أقل تلوثًا.",
      "Light the burner first, before opening any tube or plate. The rising column of hot air keeps the working zone cleaner."),
    "bench.a1": N("برّد الإبرة أو الحلقة بعد التعقيم. الإبرة الساخنة تقتل الخلايا وتشوّه النتيجة، والانتظار ثواني قليلة.",
      "Cool the loop or needle after sterilisation. A hot loop kills the cells and ruins the result; wait just a few seconds."),
    "bench.a2": N("افتح الأنبوب أو الطبق بأقل زاوية ممكنة ولفترة قصيرة، ثم أعده فورًا. كل ثانية مفتوحة تعني احتمال تلوث أعلى.",
      "Open the tube or plate at the smallest possible angle and for the shortest time, then close it at once. Every second it stays open raises the chance of contamination."),
    "bench.a3": N("خذ العيّنة بحلقة معقّمة ومبرّدة: لمسة واحدة خفيفة تكفي. لا تغمس الحلقة في المزرعة الأصلية أكثر من مرة حتى لا تلوث الحاوية.",
      "Take the sample with a sterile, cooled loop: one light touch is enough. Never dip the loop back into the stock culture, to avoid contaminating the container."),
    "bench.a4": N("وزّع العيّنة على سطح الطبق بحركات خفيفة دون أن تخدش الأجار. الخدوش تجعل المستعمرات تنمو داخل الأجار وتمنع العدّ الصحيح.",
      "Spread the sample over the agar surface with light strokes without digging into the agar. Cuts let colonies grow inside the gel and prevent correct counting."),
    "bench.a5": N("أعد تعقيم الحلقة على اللهب قبل أن تلمس أي شيء آخر، حتى نهاية الجلسة يبقى اللهب مشتعلًا.",
      "Flame the loop again before it touches anything else, and keep the burner lit until the session ends."),
    "bench.a6": N("أغلق الأنبوب والطبق، اقلب الطبق، وسمّ عليه بالمعلومات: التاريخ، العيّنة، التخفيف، واسمك. الطبق غير المسمّى طبق مفقود.",
      "Close the tube and plate, invert the plate, and label it: date, sample, dilution and your name. An unlabelled plate is a lost plate."),
    "bench.flame": N("عقّم الإبرة باللهب ثم انتظر حتى تبرد قبل لمس الأجار. الحلقة الباردة هي شرط الحصول على مستعمرات بلا تلوث.",
      "Sterilise the loop in the flame and let it cool before touching the agar. A cool loop is the condition for contamination-free colonies."),
    "bench.quad": N("حرّك الحلقة ذهابًا وإيابًا داخل حدود الربع ثم ادخل قليلًا إلى الربع التالي. الأول يحتوي خلايا كثيرة، وكل ربع يخفف السابق، حتى تحصل على مستعمرات مفردة في الربع الأخير.",
      "Stroke the loop back and forth inside one quadrant, then pass once or twice into the next quadrant. The first quadrant holds many cells, and each quadrant dilutes the previous one until single colonies appear in the last quadrant."),
    "bench.incub": N("اقلبه وضعه في الحاضنة على سبعة وثلاثين درجة لمدة أربع وعشرين ساعة. القلب يمنع تكوّن قطرات التكاثف التي تتساقط وتدمج المستعمرات.",
      "Invert it and incubate at thirty seven degrees for twenty four hours. Inverting prevents condensation droplets from falling and merging the colonies."),
    "bench.streakDone": N("أحسنت. العدد المطلوب عشر إلى مئة مستعمرة مفردة في الربع الأخير؛ ما زاد يعني تخفيفًا ناقصًا وإعادة الزرع.",
      "Well done. The target is ten to one hundred well-isolated colonies in the final quadrant; more than that means insufficient dilution and the plate should be re-streaked."),

    /* ------------------------------------------------ التخفيف والعدّ */
    "dil.mix": N("اخلط الأنبوب بالخلاط الدوّامي عشر ثوانٍ. الخلط غير الكافي أشهر سبب لتباين النتائج بين التكرارات، لأنه يترك الخلايا متكتلة.",
      "Mix the tube on the vortex for ten seconds. Insufficient mixing is the most common cause of variation between replicates, because clusters of cells stay together."),
    "dil.transfer": N("انقل واحد مليلتر إلى الأنبوب التالي باستخدام ماصة جديدة لكل نقل. تغيير الماصة بين الأنابيب شرط للحصول على تخفيف دقيق؛ استخدام الماصة نفسها ينقل خلايا زائدة.",
      "Transfer one millilitre into the next tube using a fresh pipette for each transfer. A new pipette per step is what makes the dilution accurate; reusing one carries extra cells along."),
    "dil.plate": N("انقل عشرة أجزاء من المليلتر إلى الطبق، ووزّعها بالتوزيع السطحي أو اسكب معها الأجار المذاب. الحجم المعروف هو أساس الحساب لاحقًا.",
      "Pipette zero point one millilitre onto the plate and spread it, or add molten agar for the pour plate method. That known volume is the basis of the calculation later."),
    "dil.incub": N("حضّن على سبعة وثلاثين درجة أربعًا وعشرين ساعة. الأطباق بالقلب دائمًا. بعد التحضين اعدّ الأطباق التي تحتوي من ثلاثين إلى ثلاثمئة مستعمرة فقط.",
      "Incubate at thirty seven degrees for twenty four hours, plates always inverted. After incubation, count only the plates that hold between thirty and three hundred colonies."),
    "dil.count": N("اعدد المستعمرات بالنقر عليها واحدة واحدة. المستعمرة هي كل نقطة منفصلة نمت في مكانها؛ النقاط المتلاصقة تُعد مستعمرة واحدة. سجّل الثقة في العدّ: قارن بالتكرارات.",
      "Count the colonies by clicking them one by one. One colony is each separate point that grew in place; merged spots count as one colony. Keep confidence in the count by comparing replicates."),
    "dil.calc": N("احسب الآن عدد الوحدات المكوّنة للمستعمرة في الغرام: عدد المستعمرات مقسومًا على حجم الطبق مضروبًا في معامل التخفيف. المفاجأة المعتادة: أخطاء بسيطة في الخلط تظهر كفروق كبيرة في النتيجة.",
      "Now calculate the colony-forming units per gram: the colony count divided by the plated volume, multiplied by the dilution factor. The usual surprise is how small mixing errors show up as large differences in the result."),
    "dil.cfu": N("مدرّب الحساب: أدخل عدد المستعمرات ومعامل التخفيف واحصل على النتيجة بالصيغة العلمية. تحقّق من الوحدة النهائية دائمًا — لكل غرام أم لكل مليلتر.",
      "Calculation trainer: enter the colony count and dilution factor and get the result in scientific notation. Always check the final unit — per gram or per millilitre."),
    "dil.mpn": N("طريقة العدد الأكثر احتمالًا MPN تُستخدم مع الأوساط السائلة عند الأعداد المنخفضة. تقرأ عدد الأنابيب الموجبة في كل تخفيف ثم تبحث عن النمط في الجدول.",
      "The most probable number, MPN, is used with liquid media at low counts. You read how many positive tubes each dilution has and then look the pattern up in the table."),

    /* ------------------------------------------------ الأوساط */
    "media.prep": N("الحساب أولًا: الكتلة بالغرام تساوي التركيز بالغرام لكل لتر مضروبًا في حجم الماء بالمليلتر مقسومًا على ألف. خطأ في الحساب يعني وسطًا بتركيز خاطئ، وانتقائية مفقودة.",
      "Calculate first: the mass in grams equals the concentration in grams per litre times the volume of water in millilitres divided by one thousand. A calculation error means the wrong concentration and lost selectivity."),
    "media.cook": N("ذوّب بالسخن مع التحريك حتى الغليان، ثم عقّم في الأوتوكلاف على مئة وواحد وعشرين درجة لخمس عشرة دقيقة. سوائل حجمها كبير تحتاج وقتًا أطول. الوسط يخرج ساخنًا فيُبرّد إلى خمسين درجة قبل السكب.",
      "Dissolve with heat and stirring until it boils, then sterilise in the autoclave at one hundred and twenty one degrees for fifteen minutes — larger volumes need longer. The medium comes out hot, so cool it to about fifty degrees before pouring."),
    "media.pour": N("اسكب في الأطباق طبقة بسماكة أربع إلى خمس ملليمترات، أي خمسة عشر إلى عشرين ملليلترًا للطبق القياسي. لا تسكب قبل أن يبرد الوسط ولا بعد أن يتجمد، والفترة الذهبية قصيرة.",
      "Pour a layer four to five millimetres deep, which is fifteen to twenty millilitres for a standard plate. Do not pour while it is still hot, and do not wait until it sets; the window is short."),
    "media.read": N("اقرأ الطبق بترتيب ثابت: العدد، الحجم، اللون، الشكل، الحافة، والأثر على الوسط. اللون يعطيك الهوية الكيميائية للكائن، والشكل يعطيك الجنس.",
      "Read the plate in a fixed order: number, size, colour, shape, margin, and effect on the medium. Colour gives you the organism's biochemistry; shape narrows the genus."),
    "media.colony": N("المفردات أساس القراءة: دائري، مخاطي، منتشر، جاف، مطويّ، خيطي، ومركزيّ. وصفك للشكل يساوي نتيجة تحليلية، ويجب أن يكون بلغة موحّدة يفهمها كل مختبر.",
      "Vocabulary is the root of reading plates: circular, mucoid, spreading, dry, wrinkled, filamentous, and concentric. Your description of morphology is an analytical result, and it must use the standard vocabulary the whole laboratory understands."),
    "media.challenge": N("تحدي القراءة: ثلاثة أطباق بوسائط انتقائية. حدّد أي مستعمرة تدل على الكائن الممرض. راجع جدول الأوساط إن احتجت؛ الألوان هي اللغة التي يخاطبك بها الطبق.",
      "Reading challenge: three plates on selective media. Identify which colony indicates the pathogen. Review the media table if needed; colour is the language the plate speaks to you."),

    /* ------------------------------------------------ الأجهزة */
    "inst.autoclave": N("اختر الحمولة: أطباق أو أنابيب أو نفايات حيوية أو سوائل. لكل حمولة زمن مختلف، والنفايات الحيوية تحتاج مئة وواحد وعشرين درجة لمدة ثلاثين دقيقة على الأقل. لا تُحكم إغلاق الأغطية: البخار يجب أن يدخل، وإلا فالمعقم أفخاخ لا أكثر.",
      "Choose the load: plates, tubes, biohazard waste, or liquids. Each load needs a different time, and biohazard waste needs one hundred and twenty one degrees for at least thirty minutes. Never seal the caps tightly: steam must get in, otherwise the steriliser is just a steamer."),
    "inst.incubator": N("اضبط الحاضنة حسب الكائن: سبعة وثلاثون درجة لمعظم البكتيريا الممرضة، وثلاثون لبعض الأعفان والخمائر، وأربعون إلى خمسة وأربعين للحرارية. التحضين الخاطئ لا يعطي نتيجة سلبية، بل يعطي نتيجة كاذبة.",
      "Set the incubator for the organism: thirty seven degrees for most pathogens, thirty for many moulds and yeasts, and forty to forty five for thermophiles. Wrong incubation does not give a negative result; it gives a false one."),
    "inst.pcr": N("في PCR الطهارة كل شيء: كل كاشف بكميته الدقيقة، والعداد يتضاعف مع عدد الأنابيب مع زيادة عشرة بالمئة للفاقد. ثم الدورات الحرارية: تسع وخمسون درجة للالتحام، واثنتان وسبعون للاستطالة، ومحرار التلدين هو الفيصل بين نجاح الخبر وفشله.",
      "In PCR, purity is everything: each reagent in its exact volume, and the master mix scales with the number of reactions plus ten per cent for pipetting loss. Then the thermal cycles: annealing, extension, and the annealing temperature is what decides between a successful assay and a failed one."),
    "inst.ph": N("معايرة جهاز الأس الهيدروجيني بالمنظمين قبل الاستخدام، ثم قياس العيّنة. الأس الهيدروجيني يحدد بقاء الكائن وصلاحيته، والقياس دون معايرة مجرد رقم.",
      "Calibrate the pH meter with both buffers before use, then measure the sample. pH decides survival and validity, and a measurement without calibration is just a number."),
    "inst.aw": N("النشاط المائي يحدد ما إذا كان الغذاء يدعم النمو. أكثر البكتيريا تحتاج تسعة أعشار أو أكثر، وبعض الخمائر والأعفان تتحمل أقل من ذلك، والملح والسكر يخفضانه بالارتباط بالماء.",
      "Water activity decides whether a food supports growth. Most bacteria need zero point nine or more; some yeasts and moulds tolerate far less, and salt or sugar lower it by binding water."),
    "inst.centrifuge": N("اتزان الحمولة قبل التشغيل: أنابيب متقابلة بالكتلة نفسها. اختلال التوازن يولّد اهتزازًا قد يكسر الأنابيب ويوقف التشغيل، والسرعة تحدد قوة الطرد المركزي.",
      "Balance the load before spinning: opposing tubes must have the same mass. Imbalance causes vibration that can break tubes and stop the run, and speed sets the relative centrifugal force."),
    "inst.spectro": N("قياس العكارة عند ستمئة نانومتر يعطيك عددًا تقديريًا للخلايا. العلاقة خطية فقط في المدى الوسط، لذلك لا بد من التخفيف قبل القياس إن كانت العيّنة كثيفة.",
      "Turbidity at six hundred nanometres gives an estimate of cell numbers. The relationship is linear only in the middle range, so dilute dense samples before reading."),
    "inst.cold": N("سلسلة التبريد تحفظ النتيجة لا الكائن فقط. كل كسر في السلسلة يسمح بتضاعف الأعداد، وقد يُنتج عددًا لا يعكس التلوث الأصلي في العيّنة.",
      "The cold chain preserves your result, not just the organism. Every break in the chain allows numbers to multiply and can produce a count that no longer reflects the original contamination."),

    /* ------------------------------------------------ السلامة والموسوعة والاختبارات */
    "safety.ppe": N("معدات الوقاية الشخصية بالترتيب: المعطف، ثم النظارات، ثم القفازات الطبية، ثم تغطية الشعر إن لزم. القفازات لا تُعوّض غسل اليدين، بل تُكملها.",
      "Personal protective equipment in order: lab coat, then eye protection, then gloves, then hair covering if required. Gloves do not replace hand washing; they complete it."),
    "safety.spill": N("عند الانسكاب: أوقف العمل، أعلِم من حولك، ابدأ من الحافة نحو المركز بمنطقة مطهرة، واترك زمن التلامس المذكور على المطهر، ثم ارمِ النفايات في حاوية النفايات الحيوية.",
      "In a spill: stop work, alert those nearby, work from the edge towards the centre with disinfectant, respect the contact time stated on the label, and dispose of the waste in the biohazard container."),
    "safety.haccp": N("تحليل المخاطر ونقاط التحكم الحرجة يعمل بخمس خطوات: تحليل المخاطر، تحديد نقاط التحكم الحرجة، الحدود الحرجة، الرصد، ثم الإجراء التصحيحي. الفحص الميكروبي هو أداة التحقق من سلامة هذا النظام.",
      "HACCP works in five steps: hazard analysis, identifying critical control points, setting critical limits, monitoring, and corrective action. Microbiological testing is the verification tool that shows the system is working."),
    "path.browse": N("اقرأ البطاقة بترتيب: الشكل والمقاس، ثم المصدر الغذائي والدisease، ثم الجرعة المعدية وطرق الكشف والمكافحة. الربط بين الشكل والسلوك هو هدف الموسوعة.",
      "Read each card in order: shape and size, then food source and disease, then infective dose and detection and control. Linking morphology to behaviour is the point of this encyclopaedia."),
    "quiz.start": N("ابدأ الاختبار بعد مراجعة الجلسة العملية. الخطأ هنا فرصة، لأن الشرح الفوري لكل سؤال يثبّت المعلومة أطول من الحفظ.",
      "Start the quiz after reviewing the practical session. A mistake here is an opportunity, because the instant explanation for each question fixes the knowledge far longer than memorising.")
  };

  /* ---- مقاطع صوتية مسجّلة (تُضاف عند توفّرها في assets/audio) ---- */
  const CLIPS = {
    "index.html":      { ar: "assets/audio/ar/tour.mp3",            en: "assets/audio/en/tour.mp3" },
    "gram.html":       { ar: "assets/audio/ar/gram.mp3",            en: "assets/audio/en/gram.mp3" },
    "dilution.html":   { ar: "assets/audio/ar/dilution.mp3",        en: "assets/audio/en/dilution.mp3" },
    "bench.html":      { ar: "assets/audio/ar/bench.mp3",           en: "assets/audio/en/bench.mp3" },
    "microscope.html": { ar: "assets/audio/ar/microscope.mp3",      en: "assets/audio/en/microscope.mp3" }
  };

  /* =====================================================================
     ٢) محرّك الصوت
     ===================================================================== */
  const voice = {
    lang: LS.get("narr.lang", "ar"),
    on: LS.get("narr.on", true),
    rate: LS.get("narr.rate", 0.96),
    lastKey: null,
    speaking: false,

    setLang(l) { this.lang = l; LS.set("narr.lang", l); if (W.UI) UI.toast(l === "ar" ? "🎧 التعليق الصوتي بالعربية" : "🎧 Narration set to English", "c"); this.sayPage(); },
    setOn(v) { this.on = !!v; LS.set("narr.on", this.on); if (!this.on) this.stop(); },
    setRate(r) { this.rate = +r; LS.set("narr.rate", this.rate); },
    text(key) {
      if (!key) return null;
      const set = key.indexOf(".") >= 0 ? STEPS[key] : PAGES[key];
      if (!set) { const p = PAGES[key + ".html"]; return p ? p : null; }
      return set;
    },
    /* المقطع المسجّل إن وُجد لهذا المفتاح */
    clipFor(key) {
      const slim = key.replace(/\.html$/, "");
      const c = CLIPS[key] || CLIPS[key + ".html"] || CLIPS[slim + ".html"];
      if (!c) return null;
      return c[this.lang] || c.ar || null;
    },
    isRecorded(key) { return !!this.clipFor(key); },

    /* نطق نص حرّ */
    utter(text) {
      if (!text || !this.on) return;
      try {
        W.speechSynthesis.cancel();
        const u = new W.SpeechSynthesisUtterance(text);
        const arabic = this.lang === "ar";
        u.lang = arabic ? "ar-SA" : "en-US";
        u.rate = this.rate; u.pitch = 1;
        const vs = W.speechSynthesis.getVoices() || [];
        const want = arabic ? ["ar-SA", "ar-EG", "ar-AE", "ar"] : ["en-US", "en-GB", "en"];
        let v = null;
        want.forEach(code => { if (!v) v = vs.find(x => (x.lang || "").replace("_", "-").toLowerCase() === code.toLowerCase()); });
        if (!v) v = vs.find(x => (x.lang || "").toLowerCase().indexOf(arabic ? "ar" : "en") === 0);
        if (v) u.voice = v;
        u.onstart = () => { voice.speaking = true; dock.badge(true); };
        u.onend = () => { voice.speaking = false; dock.badge(false); };
        u.onerror = () => { voice.speaking = false; dock.badge(false); };
        W.speechSynthesis.speak(u);
      } catch (e) { /* لا صوت متاح */ }
    },
    /* نطق مفتاح: يفضّل المقطع المسجّل ثم النصّ المحلي */
    say(key, force) {
      if (!this.on && !force) return;
      this.lastKey = key;
      const t = this.text(key);
      const url = this.clipFor(key);
      if (url) { player.play(url, t ? t[this.lang] : null, this.lang); return; }
      const txt = t ? t[this.lang] : null;
      if (txt) this.utter(txt);
      else this.utter(this.lang === "ar" ? "لا يوجد تعليق مسجّل لهذه الخطوة بعد." : "No narration has been recorded for this step yet.");
    },
    sayPage() { this.say(location.pathname.split("/").pop() || "index.html"); },
    step(lab, id) { const k = lab + "." + id; if (STEPS[k]) this.say(k); },
    stop() {
      try { W.speechSynthesis.cancel(); } catch (e) {}
      player.stop();
      this.speaking = false; dock.badge(false);
    },
    /* هل يملك المتصفح أصواتًا عربية؟ */
    hasArabicVoice() {
      try {
        const vs = W.speechSynthesis.getVoices() || [];
        return vs.some(v => (v.lang || "").toLowerCase().indexOf("ar") === 0);
      } catch (e) { return false; }
    }
  };

  /* ---- مشغّل المقاطع المسجّلة (يمرّ عبر Web Audio ليُسجَّل داخل الفيديو) ---- */
  const player = {
    el: null, node: null,
    init() {
      if (this.el) return this.el;
      const a = document.createElement("audio");
      a.preload = "auto"; a.crossOrigin = "anonymous";
      a.addEventListener("ended", () => dock.badge(false));
      a.addEventListener("play", () => dock.badge(true));
      document.body.appendChild(a);
      this.el = a;
      return a;
    },
    /* يوصله بمسار التسجيل إن وُجد */
    route() {
      const ac = rec.ctx; if (!ac || !this.el || this.node) return;
      try { this.node = ac.createMediaElementSource(this.el); this.node.connect(ac.destination); if (rec.narrGain) this.node.connect(rec.narrGain); } catch (e) {}
    },
    play(url, fallbackText, lang) {
      this.stop();
      const a = this.init();
      this.route();
      let fell = false;
      const fail = () => { if (fell) return; fell = true; voice.utter(fallbackText); };
      a.onerror = fail;
      a.src = url;
      const p = a.play();
      if (p && p.catch) p.catch(fail);
      /* لو لم يبدأ التشغيل خلال ٩٠٠ مللي ثانية (ملف غير موجود) استخدم النصّ */
      setTimeout(() => { if (!fell && (a.paused || a.currentTime === 0)) fail(); }, 900);
    },
    stop() { if (this.el) { try { this.el.pause(); this.el.currentTime = 0; } catch (e) {} } }
  };

  /* =====================================================================
     ٣) مسجّل الشاشة والصوت
     ===================================================================== */
  const rec = {
    on: false, paused: false, ctx: null, narrGain: null, dest: null,
    mr: null, chunks: [], t0: 0, timer: null, micStream: null, dispStream: null, cvStream: null,
    lastBlob: null, lastUrl: null,

    support() {
      const okMR = typeof W.MediaRecorder !== "undefined";
      const okCV = !!(document.createElement("canvas").captureStream);
      const okGM = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
      const okMIC = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      return { mediaRecorder: okMR, canvasStream: okCV, screen: okGM, mic: okMIC };
    },
    ensureCtx() {
      if (this.ctx) return this.ctx;
      const AC = W.AudioContext || W.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.narrGain = this.ctx.createGain();
      this.narrGain.gain.value = 1;
      this.dest = this.ctx.createMediaStreamDestination();
      this.narrGain.connect(this.dest);
      return this.ctx;
    },
    /* أكبر canvas ظاهر في الصفحة = مجال المعمل */
    mainCanvas() {
      const list = $$("canvas").filter(c => c.clientWidth > 120 && c.clientHeight > 120);
      if (!list.length) return null;
      list.sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight));
      return list[0];
    },
    state: "idle",

    async start(opts) {
      opts = Object.assign({ source: "lab", mic: false, narration: true }, opts || {});
      const sup = this.support();
      if (!sup.mediaRecorder) { UI.toast("متصفحك لا يدعم التسجيل (MediaRecorder)", "r"); return false; }
      try {
        this.ensureCtx();
        if (this.ctx && this.ctx.state === "suspended") await this.ctx.resume();
        player.init(); player.route();

        const audioTracks = [];
        /* --- الصورة --- */
        let vt = null;
        if (opts.source === "screen") {
          if (!sup.screen) { UI.toast("متصفحك لا يدعم تسجيل الشاشة", "r"); return false; }
          this.dispStream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: true });
          vt = this.dispStream.getVideoTracks()[0];
          this.dispStream.getAudioTracks().forEach(t => audioTracks.push(t));
          this.dispStream.getVideoTracks()[0].addEventListener("ended", () => this.stop());
        } else {
          const cv = this.mainCanvas();
          if (!cv || !sup.canvasStream) { UI.toast("لا يوجد مجال معمل قابل للتسجيل في هذه الصفحة — اختر «شاشة كاملة»", "w"); return false; }
          this.cvStream = cv.captureStream(30);
          vt = this.cvStream.getVideoTracks()[0];
        }
        /* --- الميكروفون --- */
        if (opts.mic && sup.mic) {
          this.micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
          const src = this.ctx.createMediaStreamSource(this.micStream);
          const g = this.ctx.createGain(); g.gain.value = 1;
          src.connect(g); g.connect(this.dest);
        }
        /* --- صوت التعليق داخل التسجيل --- */
        if (opts.narration && this.narrGain) { try { this.narrGain.connect(this.dest); } catch (e) {} }

        audioTracks.push.apply(audioTracks, this.dest.stream.getAudioTracks());
        const streams = [vt].concat(audioTracks);
        const mixed = new MediaStream(streams.filter(Boolean));
        const mime = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find(m => {
          try { return W.MediaRecorder.isTypeSupported(m); } catch (e) { return false; } }) || "";
        this.chunks = [];
        this.mr = new W.MediaRecorder(mixed, mime ? { mimeType: mime, videoBitsPerSecond: 4000000, audioBitsPerSecond: 128000 } : undefined);
        this.mr.ondataavailable = e => { if (e.data && e.data.size) this.chunks.push(e.data); };
        this.mr.onstop = () => this.finish();
        this.mr.start(1000);
        this.on = true; this.paused = false; this.t0 = Date.now(); this.state = "rec";
        this.tickStart();
        VL.store.addXP(5, "بدء تسجيل جلسة عملية");
        UI.toast("⏺ التسجيل بدأ — " + (opts.source === "screen" ? "شاشة كاملة" : "مجال المعمل") + (opts.mic ? " + ميكروفون" : "") + (opts.narration ? " + التعليق الآلي" : ""), "g", 5000);
        dock.paint();
        return true;
      } catch (err) {
        this.cleanup();
        UI.toast("تعذّر بدء التسجيل: " + (err && err.message ? err.message : err), "r", 5200);
        return false;
      }
    },
    pause() { if (this.mr && this.mr.state === "recording") { this.mr.pause(); this.paused = true; this.state = "pause"; dock.paint(); } },
    resume() { if (this.mr && this.mr.state === "paused") { this.mr.resume(); this.paused = false; this.state = "rec"; this.t0 = Date.now() - (this._ms || 0); dock.paint(); } },
    stop() { if (this.mr && this.mr.state !== "inactive") { this.state = "stop"; try { this.mr.stop(); } catch (e) { this.finish(); } } },
    finish() {
      const type = (this.mr && this.mr.mimeType) || "video/webm";
      const blob = new Blob(this.chunks, { type });
      this.lastBlob = blob;
      const ext = type.indexOf("mp4") >= 0 ? "mp4" : "webm";
      const st = VL.store.name();
      const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
      const name = "تجربة-معملية-" + (st.name ? st.name.replace(/\s+/g, "_") + "-" : "") + stamp + "." + ext;
      const url = URL.createObjectURL(blob);
      this.lastUrl = url;
      /* نافذة المشاركة/التحميل */
      const mb = (blob.size / 1048576).toFixed(1);
      UI.modal("🎥 تم إنهاء التسجيل — جاهز للتسليم",
        '<div class="note s"><b>تم حفظ فيديو جلستك العملية ✔</b>' +
        'المدة: ' + this.fmt(this._ms || 0) + ' · الحجم: ' + mb + ' ميجابايت · التنسيق: ' + ext.toUpperCase() +
        '<br>يمكنك تحميله ومشاركته كتقرير عملي مصوّر مع التعليق الصوتي.</div>' +
        '<video src="' + url + '" controls playsinline style="width:100%;border-radius:12px;border:1px solid var(--line2);margin:10px 0"></video>' +
        '<div class="small muted">إن لم يعمل العرض داخل الصفحة، استخدم زر التحميل ثم افتح الملف بمشغّل الفيديو.</div>',
        { onMount(box) {
            const row = el("div", { class: "row mt" });
            const dl = el("a", { class: "btn primary", href: url, download: name }, "⬇ تحميل الفيديو");
            const again = el("button", { class: "btn ghost" }, "⏺ تسجيل جديد");
            const nb = el("button", { class: "btn" }, "🗂 أضف سطرًا للدفتر");
            again.onclick = () => { UI.closeModal(); };
            nb.onclick = () => {
              VL.notebook.add({ session: "تسجيل جلسة", title: "تسجيل فيديو عملي — " + (st.name || "زائر"), kind: "session",
                summary: "سجّلت جلسة عملية مصوّرة بمدة " + rec.fmt(rec._ms || 0) + " وبحجم " + mb + " ميجابايت مع التعليق الصوتي " + (voice.lang === "ar" ? "بالعربية" : "بالإنجليزية") + ".", data: { file: name, mb: +mb, lang: voice.lang } });
              UI.toast("أُضيف السطر إلى دفتر المعمل ✔", "g");
            };
            row.appendChild(dl); row.appendChild(nb); row.appendChild(again);
            box.appendChild(row);
          } });
      this.cleanup();
      dock.paint();
    },
    cleanup() {
      try { if (this.micStream) this.micStream.getTracks().forEach(t => t.stop()); } catch (e) {}
      try { if (this.dispStream) this.dispStream.getTracks().forEach(t => t.stop()); } catch (e) {}
      try { if (this.cvStream) this.cvStream.getTracks().forEach(t => t.stop()); } catch (e) {}
      try { if (this.narrGain && this.dest) this.narrGain.disconnect(this.dest); } catch (e) {}
      this.micStream = this.dispStream = this.cvStream = null;
      this.mr = null; this.on = false; this.paused = false; this.state = "idle";
      if (this.timer) { cancelAnimationFrame(this.timer); this.timer = null; }
    },
    tickStart() {
      const t = () => {
        if (!this.on) return;
        if (!this.paused) this._ms = Date.now() - this.t0;
        const lab = $("#recTime"); if (lab) lab.textContent = this.fmt(this._ms || 0);
        this.timer = requestAnimationFrame(t);
      };
      this.timer = requestAnimationFrame(t);
    },
    fmt(ms) {
      const s = Math.max(0, Math.round(ms / 1000));
      return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
    },
    /* واجهة سريعة للصفحات: زرّ صغير يبدأ/ينهي التسجيل */
    quickButton(label) {
      const b = el("button", { class: "btn sm primary" });
      const paint = () => { b.innerHTML = rec.on ? "⏹ أنهِ التسجيل (" + rec.fmt(rec._ms || 0) + ")" : (label || "🎥 سجّل جلستك (شاشة وصوت)"); };
      b.onclick = () => { if (rec.on) rec.stop(); else { dock.toggle(true); dock.paint(); } };
      setInterval(paint, 700); paint();
      return b;
    }
  };

  /* =====================================================================
     ٤) لوحة الاستوديو العائمة
     ===================================================================== */
  const dock = {
    el: null, open: false,
    mount() {
      if (this.el) return;
      const d = el("div", { class: "studio noprint", id: "studio" });
      d.innerHTML = `
        <button class="studio-fab" id="stFab" title="الاستوديو: صوت وتسجيل">
          <span class="ic">🎧</span><span class="lab">الاستوديو</span>
        </button>
        <div class="studio-panel hide" id="stPanel">
          <div class="studio-head">
            <b>🎧 استوديو المعمل — صوت وتسجيل</b>
            <button class="x" id="stClose" title="إغلاق">✕</button>
          </div>

          <div class="studio-sec">
            <div class="row between">
              <span class="small"><b>التعليق الصوتي</b></span>
              <span class="chips tiny">
                <button class="chip on" data-lang="ar">عربي</button>
                <button class="chip" data-lang="en">English</button>
              </span>
            </div>
            <div class="row mt">
              <button class="btn sm primary" id="stPlay">▶ اسمع شرح هذه الصفحة</button>
              <button class="btn sm ghost" id="stStop">⏹ إيقاف</button>
            </div>
            <div class="row mt small">
              <label class="switch"><input type="checkbox" id="stOn"> تشغيل التعليق تلقائيًا مع كل خطوة</label>
            </div>
            <div class="row mt small">
              <label class="f" style="min-width:70px">السرعة</label>
              <input type="range" id="stRate" min="0.7" max="1.3" step="0.02">
              <span class="badge c" id="stRateV">1.0×</span>
            </div>
            <p class="tiny dim" id="stVoiceNote"></p>
          </div>

          <div class="studio-sec">
            <b class="small">🎥 تسجيل الشاشة والصوت</b>
            <div class="row mt small">
              <label class="f" style="min-width:70px">المصدر</label>
              <select id="stSrc">
                <option value="lab">مجال المعمل (الرسم التفاعلي)</option>
                <option value="screen">الشاشة كاملة (شرح من المتصفح)</option>
              </select>
            </div>
            <div class="row mt small">
              <label class="f" style="min-width:70px">الصوت</label>
              <select id="stAud">
                <option value="n">التعليق الآلي فقط</option>
                <option value="m">ميكروفوني فقط (صوتي)</option>
                <option value="mn" selected>ميكروفوني + التعليق الآلي</option>
              </select>
            </div>
            <div class="row mt">
              <button class="btn sm primary" id="stRec">⏺ ابدأ التسجيل</button>
              <button class="btn sm hide" id="stPause">⏸ إيقاف مؤقت</button>
              <button class="btn sm red hide" id="stFin">⏹ إنهاء وحفظ</button>
              <span class="badge r hide" id="stLive">⏺ <b id="recTime">00:00</b></span>
            </div>
            <div class="note mt tiny" id="stRecNote">
              نصيحة: ابدأ التسجيل، ثم افتح الشرح الصوتي ونفّذ الخطوات. التعليق الآلي يُدمج داخل الفيديو،
              وميكروفونك يضيف شرحك الشخصي — فيخرج تقرير عملي مصوّر جاهز للتسليم.
            </div>
          </div>

          <div class="studio-sec tiny dim" id="stStatus"></div>
        </div>`;
      document.body.appendChild(d);
      this.el = d;

      const chip = (sel, on) => $$(sel, d).forEach(b => b.classList.toggle("on", b === on));
      $$("[data-lang]", d).forEach(b => b.onclick = () => { const l = b.getAttribute("data-lang"); voice.setLang(l); voice.setOn(true); $("#stOn").checked = true; chip("[data-lang]", b); this.paint(); });
      $("#stFab").onclick = () => this.toggle(true);
      $("#stClose").onclick = () => this.toggle(false);
      $("#stPlay").onclick = () => { voice.setOn(true); $("#stOn").checked = true; voice.sayPage(); };
      $("#stStop").onclick = () => voice.stop();
      $("#stOn").onchange = e => voice.setOn(e.target.checked);
      const r = $("#stRate"); r.value = voice.rate;
      $("#stRateV").textContent = (+voice.rate).toFixed(2) + "×";
      r.oninput = e => { voice.setRate(e.target.value); $("#stRateV").textContent = (+e.target.value).toFixed(2) + "×"; };
      $("#stOn").checked = voice.on;
      chip("[data-lang]", $$("[data-lang='" + voice.lang + "']", d)[0]);

      $("#stRec").onclick = async () => {
        const src = $("#stSrc").value, aud = $("#stAud").value;
        const ok = await rec.start({ source: src, mic: aud.indexOf("m") >= 0, narration: aud.indexOf("n") >= 0 });
        if (ok) this.paint();
      };
      $("#stPause").onclick = () => { if (rec.paused) rec.resume(); else rec.pause(); this.paint(); };
      $("#stFin").onclick = () => rec.stop();
      this.paint();
      this.voiceNote();
    },
    voiceNote() {
      const n = $("#stVoiceNote"); if (!n) return;
      const vs = (W.speechSynthesis && W.speechSynthesis.getVoices()) || [];
      const ar = vs.filter(v => (v.lang || "").toLowerCase().indexOf("ar") === 0).length;
      const en = vs.filter(v => (v.lang || "").toLowerCase().indexOf("en") === 0).length;
      const recorded = Object.keys(CLIPS).length;
      n.innerHTML = "أصوات المتصفح المتاحة: " + ar + " عربي · " + en + " إنجليزي. " +
        (ar === 0 ? "لا يوجد صوت عربي مثبّت — سيُستخدم الشرح المسجّل المضمّن، ويمكنك تثبيت حزمة الصوت العربي من إعدادات نظامك. " : "") +
        "مقاطع الشرح المسجّلة: " + recorded + " وحدة.";
    },
    badge(on) { const f = $("#stFab"); if (f) f.classList.toggle("speaking", !!on); },
    tab() {},
    toggle(open) { this.open = open; $("#stPanel").classList.toggle("hide", !open); },
    paint() {
      const d = this.el; if (!d) return;
      const rec0 = rec.on;
      $("#stRec").classList.toggle("hide", rec0);
      $("#stPause").classList.toggle("hide", !rec0);
      $("#stFin").classList.toggle("hide", !rec0);
      $("#stLive").classList.toggle("hide", !rec0);
      $("#stPause").innerHTML = rec.paused ? "▶ متابعة" : "⏸ إيقاف مؤقت";
      $("#stSrc").disabled = rec0; $("#stAud").disabled = rec0;
      const sup = rec.support(), st = $("#stStatus");
      if (st) st.innerHTML = "الدعم في متصفحك: التسجيل " + (sup.mediaRecorder ? "✔" : "✘") +
        " · رسم المعمل " + (sup.canvasStream ? "✔" : "✘") +
        " · الشاشة " + (sup.screen ? "✔" : "✘") +
        " · الميكروفون " + (sup.mic ? "✔" : "✘") +
        "<br>يُحفظ الفيديو بصيغة WEBM ويمكن رفعه أو تحويله إلى MP4 بأي محوّل.";
    }
  };

  /* =====================================================================
     ٥) الربط بالصفحات + أزرار سريعة
     ===================================================================== */
  V.voice = voice;
  V.rec = rec;
  V.studio = dock;
  V.NARRATION = { PAGES, STEPS };

  /* واجهة مريحة للمحاكيات: VL.say("gram.s2") */
  V.say = k => voice.say(k);

  function autowire() {
    dock.mount();
    /* أزرار "اسمع الشرح" التي تضعها الصفحات */
    $$("[data-narrate]").forEach(b => b.onclick = () => voice.say(b.getAttribute("data-narrate")));
    /* أزرار التسجيل السريع */
    $$("[data-record]").forEach(host => host.appendChild(rec.quickButton(host.getAttribute("data-record"))));
    /* تشغيل تلقائي للصفحة عند أول تفاعل (المتصفحات تمنع التشغيل قبل ذلك) */
    if (voice.on && LS.get("narr.autoplay", true)) {
      const once = () => {
        document.removeEventListener("pointerdown", once); document.removeEventListener("keydown", once);
        if (!voice.speaking) voice.sayPage();
      };
      document.addEventListener("pointerdown", once, { once: true });
      document.addEventListener("keydown", once, { once: true });
    }
    /* تحديث قائمة الأصوات */
    try { if (W.speechSynthesis) W.speechSynthesis.onvoiceschanged = () => dock.voiceNote(); } catch (e) {}
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", autowire);
  else autowire();
})(window);
