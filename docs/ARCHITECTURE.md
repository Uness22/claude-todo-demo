# StudyFlow — Architecture

> Senior Educational App Architect notes: how the app is built, how data flows,
> how each engine works, and the internal prompt system that drives analysis.

---

## 1. High-level architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                           Browser (SPA)                            │
│                                                                    │
│  UI layer (React 19 + TypeScript)                                  │
│  ├── Screens: Dashboard · Upload · Lecture workspace · Reviews     │
│  │            Progress · Timer · Settings                          │
│  └── Components: cards, progress, tabs, flashcard flip, chat…      │
│           │ props / hooks                                          │
│  State layer — StoreProvider (React Context)                       │
│  ├── AppState (settings, lectures, cards, attempts, recalls,       │
│  │             logs, streak, tutor chats, timer)                   │
│  ├── actions: addLecture · gradeCard · recordAttempt · …           │
│  └── persistence: localStorage `studyflow.v1` (debounced)          │
│           │ pure function calls                                    │
│  Engine layer (deterministic, no network)                          │
│  ├── parse.ts     file → text (PDF/DOCX/PPTX/TXT)                  │
│  ├── analyze.ts   text → Analysis (13 extraction types)            │
│  ├── mnemonic.ts  list → 3–5 memory tricks (scored)                │
│  ├── flashcards.ts Analysis → deck (+SRS state)                    │
│  ├── quiz.ts      Analysis → 12-type question bank + grading       │
│  ├── recall.ts    Analysis → recall queue + brain-dump compare     │
│  ├── srs.ts       grade → next due date (adaptive intervals)       │
│  ├── mastery.ts   attempts/recalls/cards → per-topic mastery,      │
│  │                weakness map, study plan, streak                 │
│  ├── tutor.ts     message + lecture → grounded reply               │
│  └── text.ts / words.ts / glossary  (NLP helpers, EN+AR)           │
└────────────────────────────────────────────────────────────────────┘
```

**Design decisions**

- **All engines are pure functions** over `Lecture` / `Analysis` — trivially testable
  (`scripts/smoke.ts` runs the entire pipeline on a real lecture).
- **Rule-based MVP**: analysis, mnemonics and grading run offline with zero API cost.
  The *prompt system* (§7) defines the same pipeline stages so an LLM backend can be
  swapped in per-stage without changing the data model.
- **Never invent content**: every generated artifact (definition, question, mnemonic)
  carries or references original lecture text. Ambiguity → `UNCLEAR`,
  external claim → `NEEDS VERIFICATION`.

---

## 2. Screens & navigation

```
App shell
├── Sidebar (RTL-aware; collapses to top bar < 860px)
│   ├── 🏠 Dashboard          (also hosts the lecture list)
│   ├── ➕ Upload             (+ Upload Lecture)
│   ├── 🔁 Reviews            (badge = due card count)
│   ├── 📊 Progress
│   ├── ⏱️ Study Timer
│   └── ⚙️ Settings
│
└── Lecture workspace (opened from a Dashboard card)
    header: title · words · read-time · mastery% · exam date
    tabs:
    ├── 🏠 Overview    workflow stepper, big picture, topics, terms,
    │                  relations, accuracy flags, potential exam questions, full text
    ├── 🪜 Levels      L1–L4 + compression ladder
    │                  (Full → Detailed → Easy → Exam → OnePage → 5min → 1min)
    ├── 🧠 Mnemonics   original info + 3–5 candidates + choose/edit
    ├── 🃏 Cards       deck, flip, 🟥🟨🟩 grading, SRS schedule
    ├── 💭 Recall      active recall queue + 1-minute brain dump
    ├── ❓ Quiz        mixed quiz, 12 types, auto-score, weak-topic report
    ├── 🎯 EXAM MODE   hidden answers, simulated exam, strong/weak report
    ├── 📋 Sheet       one-page cheat sheet (print) + 5-minute review
    └── 🎓 Tutor       chat grounded in this lecture
```

**UI/UX principles** — clean cards, one primary action per screen, large buttons
(min-height 44–54 px), visible progress bars, high-contrast dark/light themes,
full RTL layout for Arabic, minimal chrome while a timer/quiz is active.

---

## 3. Database schema (client-side)

Persisted as one JSON document in `localStorage["studyflow.v1"]`.

```ts
AppState {
  settings { lang: 'en'|'ar'|'bi', theme, dailyGoalMinutes, userName }
  lectures: Lecture[]
  cards:    Flashcard[]
  attempts: QuizAttempt[]
  recalls:  RecallEntry[]
  logs:     { [YYYY-MM-DD]: StudyLog }
  streak:   { current, longest, lastDay }
  tutorChats: { [lectureId]: TutorMessage[] }
  timer:    { cycleStart, pausedAt, running, cyclesDone, loggedCycle }
}

Lecture {
  id, title, fileName?, rawText, createdAt, examDate?,
  analysis: Analysis,               // see §4
  mnemonicChoice?, customMnemonic?  // chosen / edited memory trick (text)
}

Analysis {
  bigPicture: string[]              // extractive summary (≤3 sentences)
  sections: Section[]               // { id, title, depth 1|2, body, lines }
  mainTopics, subtopics[]
  definitions: Definition[]         // { term, text, source, unclear? }
  terms: TermDef[]                  // + optional Arabic gloss
  lists: ExtractedList[]            // { title, items[], ordered? }
  numbers, formulas: NumberFact[]
  steps: ProcessStep[], stepsTitle?
  comparisons: Comparison[]
  examHints: ExamHint[]             // predicted exam points + reason
  verbatim: string[]                // memorize word-for-word
  understandOnly: string[]          // understand, don't rote-memorize
  relations: ConceptRelation[]      // co-occurrence edges with evidence
  flags: { text, 'unclear'|'needs-verification' }[]
  stats { words, chars, readMinutes, languages[] }
}

Flashcard {
  id, lectureId, front, back, memoryTrick?, example?, difficulty, type, topic, keywords[]
  // SRS state:
  due, intervalIndex (0..5), reps, lapses, lastGrade?, history[]
}

Question {
  id, lectureId, kind (12 types), topic, prompt, options?, answer,
  keywords[] (auto-grading anchors), pairs? (matching), explanation?, difficulty
}

QuizAttempt { id, lectureId, at, mode: quiz|exam|recall|dump,
              correct, total, perTopic: {topic:{correct,total}}, wrongQuestionIds[] }

RecallEntry { lectureId, question, grade: red|yellow|green, at }
StudyLog    { date, minutes, breakMinutes, lectures, cards, questions, dumps }
```

**Relationships**: `Lecture 1—N Flashcard`, `Lecture 1—N Question(bank, computed)`,
`Lecture 1—N QuizAttempt`, `Lecture 1—N RecallEntry`, `Flashcard 1—N grade history`.
Deleting a lecture cascades (cards, attempts, recalls, chat).

---

## 4. Lecture parser (`parse.ts` + `analyze.ts`)

**Input adapters**

| Format | Method |
|---|---|
| TXT / MD | direct read |
| PDF | `pdfjs-dist` text layer (per-page line reconstruction by y-offset) |
| DOCX | JSZip → `word/document.xml` → `<w:t>` runs |
| PPTX | JSZip → `ppt/slides/slideN.xml` → `<a:t>` runs (slide headers kept) |
| Images | no offline OCR → clear message, paste fallback |

**Analysis stages** (all deterministic)

1. **Normalize** whitespace/lines.
2. **Sectionize**: heading detection — markdown `#`, `**bold**`, numbered titles
   (only when the tail has no sentence punctuation), `Line ending with ':'`,
   ALL-CAPS, short standalone titles; duplicate consecutive titles merge;
   paragraph fallback when no headings exist.
3. **Lists**: bullet/numbered runs (per section), inline `1. … 2. …` runs.
4. **Definitions**: `Term: text`, `Term — text`, `X is/are a/an …`,
   `X refers to / is defined as / means …`, heading + “It is …” pronoun opening,
   plus glossary-backed terms.
5. **Numbers & formulas**: measurement regex (units, %, °C…) with enumeration
   artifacts stripped; `name = expression` → formulas.
6. **Steps**: arrow chains (`A → B → C`), then ordered lists whose section title
   matches process vocabulary or whose items are verb-initial.
7. **Comparisons**: `difference between X and Y`, `X vs Y`,
   `…, whereas/while/unlike …` (nearest noun-phrase labels).
8. **Verbatim vs understand**: short rule/definition/number sentences → memorize;
   long causal/explanatory sentences → understanding only.
9. **Topics**: heading tree (depth 1 / 2), deduped; subtopic bodies/lists.
10. **Exam hints**: definitions, steps, numbers, lists, comparisons, acronym titles.
11. **Relations**: term co-occurrence within a sentence (with evidence quote).
12. **Quality flags**: short/gibberish/TBD → `UNCLEAR`;
    “unconfirmed / source needed / reportedly …” → `NEEDS VERIFICATION`.
13. **Big picture**: extractive summary — top-term scoring with intro/conclusion bias.

---

## 5. Engine specifications

### Smart Mnemonic Engine (`mnemonic.ts`)
1. Extract first letters (articles/stopwords skipped; Arabic letters supported).
2. Sample from a curated per-letter word bank; score each candidate word:
   imageability +3, odd/vivid +4, short +2, prefix match with the original item +4.
3. Build sentence candidates (≈60 attempts), score sentence-level
   (distinct words +3, over-length −4), keep 4 **diverse** options.
4. Always append fallbacks: acronym chain, **story**, **visual**, **association**.
5. Rank; option #1 is marked ⭐ *Easiest to Remember*; student can choose or edit.
6. **Invariant**: the original list is rendered unaltered above every candidate
   (Original Information → Memory Trick → Meaning mapping).

### Flashcards (`flashcards.ts`)
Definitions → Q: What is X? · Lists (chunked ≤6) → ordered recall ·
Numbers/formulas → fill the figure · Steps → ordering + “what comes after X?” ·
Comparisons → difference questions · Verbatim → exact-recall cards.
Every card: front, back, memory-trick hint (first-letter chain), example
(when lecture provides one), difficulty heuristic, keywords for grading,
SRS state starting at *Review 1 = today*.

### Quiz Engine (`quiz.ts`)
Generates up to 30 questions covering 12 types, capped per type, all derived from
`Analysis` (MCQ distractors = other terms/definitions from the same lecture;
T/F flips terms; fill blanks key terms; matching = 4 term/definition pairs;
scenario = if/when sentences; case = full process walk-through; oral = self-grade).
Auto-grading = keyword coverage (≥60% → correct, ≥30% → partial).

### Active Recall (`recall.ts`)
Builds a 4–12 question queue across 8 shapes (What/Why/How/List/Compare/Example/
If/ Difference). Flow: **prompt → student types (or thinks) → Show Answer →
self-grade 🟥🟨🟩** → grades stored as `RecallEntry` → feed mastery + SRS.
Brain dump: topic only → 60 s → keyword diff → Remembered / Forgot + coverage.

### Spaced Repetition (`srs.ts`)
Intervals `[same day, +1, +3, +7, +14, before-exam]`.
🟥 → reset to today (lapse++) · 🟨 → keep/halve · 🟩 → advance one step.
Final interval is capped so the card lands **before the exam date** when set.

### Mastery & weakness detection (`mastery.ts`)
Per-topic accuracy = Σ quiz/exam scores + recall grades + last card grade.
Mastery% = weighted correct/total. Classification: `<60% weak`, `60–84% review`,
`≥85% strong`. **Study plan**: minutes ∝ `(100 − topic%)` over weak topics only.
Streak touched by any logged activity; daily log aggregates minutes/cards/questions.

### Exam Mode
`examSet()` round-robins across question kinds (default 12). UI hides explanations,
mnemonics, and answers; requires all questions answered; scores per topic; produces
**Strong / Weak / Review topics + Questions You Got Wrong**; result written as
`QuizAttempt(mode:'exam')` → updates mastery & plan.

### 90/20 Timer
Cycle = 90 min study (0–10 Preview · 10–30 Understand · 30–50 Simplify ·
50–70 Active Recall · 70–85 Practice Questions · 85–90 Rapid Review)
+ 20 min break, then auto-restarts. State persists across reloads;
90/20 minutes are written to the daily log at phase transitions.

### AI Tutor (`tutor.ts`)
Intent detection (EN + AR): beginner-explain, example, mnemonic, test me,
hide answer, why-wrong, harder/easier, 5-minute review, flashcards,
easier-to-memorize, plus keyword search fallback. Answers quote lecture
sentences only; unknown topics → `NEEDS VERIFICATION`.

---

## 6. AI workflow

```
Upload → extractText(file)            [parse adapters]
      → analyze(text)                 [13 extraction stages]
      → buildArtifacts(lecture)
            ├── easyExplain()         Level 2
            ├── generateMnemonics()   Level 4
            ├── generateCards()       deck + SRS
            ├── generateQuestions()   quiz bank
            └── recallQuestions()     recall queue
      → UI consumes `Analysis` for every tab
      → student activity (grades, attempts, recalls)
      → mastery.update → weakness map → study plan → SRS schedule
```

Each arrow is a pure function — an LLM backend can replace any single stage
(see prompts below) without touching the schema.

---

## 7. Internal prompt system

The rule-based engines implement the pipeline below. These are the exact
stage prompts: ready to send to an LLM when one is connected, with the same
JSON output contracts as the current TypeScript types.

**P1 · Lecture Analysis**
```
You are a university study coach. Read the lecture verbatim.
Extract ONLY information present in the text. Never invent.
Return JSON: { mainTopics[], subtopics[], definitions[{term,text}],
lists[{title,items}], numbers[{value,context}], formulas[],
steps[], comparisons[{a,b,text}], examHints[{text,reason}],
verbatim[], understandOnly[], relations[{from,to,evidence}],
flags[{text,kind:'unclear'|'needs-verification'}], bigPicture[≤3 sentences] }
Mark anything ambiguous as 'unclear'; anything requiring outside
sources as 'needs-verification'.
```

**P2 · Easy Explanation (Level 2)**
```
Rewrite each concept for a student seeing it for the first time.
Rules: short sentences (≤15 words), plain words, cause→effect and
problem→solution structures when present in the source.
PRESERVE every fact, number and term exactly. Output: term, plain[],
original. If the source lacks an example, do not invent one.
```

**P3 · Mnemonic generation (per list)**
```
Given items A,B,C… build 4 candidate memory devices from their first
letters: short, vivid, slightly odd, easy to say and picture.
Prefer concrete/imageable words; keep letter order exactly; NEVER
alter or reorder the scientific items. Also provide 1 story and 1
visual fallback. Output: [{kind, text, mapping[{letter,item}], score}].
Always output Original Information / Memory Trick / Meaning.
```

**P4 · Flashcards**
```
Turn the analysis into cards: definitions → "What is X?", lists →
"List …" (chunk ≤6), figures → "What number applies?", steps →
ordering + next-step cards, comparisons → difference cards.
Front / Back / memoryTrick / example (only if in source) /
difficulty / keywords[6] for grading.
```

**P5 · Question generation**
```
Create questions of kinds: mcq, tf, fill, matching, short, list,
definition, explain, compare, scenario, case, oral — using ONLY
lecture content. Distractors must come from the same lecture.
Give answer + keywords[] for auto-grading + explanation quote.
```

**P6 · Tutor reply**
```
You tutor THIS lecture only. Answer from its text; quote sentences.
If the topic is absent, reply exactly: "NEEDS VERIFICATION — …".
Honor mode flags: [no-answer] before revealing, [harder]/[easier],
[5-min-review] = compressed top points only.
```

**P7 · Grading**
```
Compare the student's answer with expected keywords.
score: 1 (≥60% key points), 0.5 (30–59%), 0 (<30%).
Never award points for fluent but factually wrong statements.
```

---

## 8. Localization

- UI dictionary `i18n.tsx` (EN/AR) + `dir=rtl` for Arabic.
- Bilingual mode: English primary, Arabic beneath (`.bi` blocks).
- Built-in EN→AR glossary (`lib/words.ts`) attaches ببساطة explanations to
  recognized academic terms in any lecture.
- Arabic-native content: analyzers use Unicode-aware tokenization and
  Arabic sentence splits (`؟`), stopword lists, and Arabic first-letter
  mnemonic words.

## 9. Roadmap (post-MVP)

1. LLM backend per stage (P1–P7) with the same JSON contracts.
2. Real OCR for images (tesseract worker).
3. Sync across devices (optional account).
4. Import Anki decks (CSV) for flashcards.
5. Per-question spaced repetition (currently per-card; questions reuse SRS via recalls).
