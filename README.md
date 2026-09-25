# 📚 StudyFlow — AI Learning + Memorization + Active Recall System

> **Understand → Simplify → Memorize → Recall → Review → Master**
>
> تطبيق يحوّل أي محاضرة جامعية إلى نظام مذاكرة وحفظ ومراجعة متكامل — ليس مولّد ملخصات.

StudyFlow takes a university lecture in any common format and automatically builds a complete
study system around it: analysis, four understanding levels, smart mnemonics, flashcards,
active recall, a 12-type quiz bank, exam mode, spaced repetition, weakness detection,
a study timer (90/20), a one-page cheat sheet, a 5-minute review, a 1-minute brain dump,
and a lecture-grounded AI tutor.

---

## 🚀 Quick start

```bash
npm install
npm run dev        # open the printed URL
```

Then in the app: **+ Upload Lecture → 🎓 Load demo lecture (HACCP)** to test the full pipeline
in seconds, or paste/upload your own lecture (PDF · PPTX · DOCX · TXT · MD).

```bash
npm run build      # production build (type-checked)
node scripts/smoke.ts is bundled via rolldown — see "Testing" below
```

## 🧭 The 60-second workflow

| Step | Where |
|---|---|
| 1. Upload → Analyze | **+ Upload Lecture** (drag & drop or paste) |
| 2. Understand | Lecture → **Levels** → L1 Big Picture / L2 Easy Explanation |
| 3. Simplify | Levels → L3 Exam Knowledge (MUST KNOW) |
| 4. Memorize | Lecture → **Mnemonics** (3–5 options, pick or edit) |
| 5. Flashcards | Lecture → **Cards** (flip + 🟥🟨🟩 grading → SRS) |
| 6. Active Recall | Lecture → **Recall** (answer first, then reveal) |
| 7. Quiz | Lecture → **Quiz** (12 question types, auto-scored) |
| 8. Exam simulation | Lecture → **EXAM MODE** (answers hidden, weakness report) |
| 9. Review | **Reviews** (spaced repetition: same day → +1 → +3 → +7 → +14 → exam) |
| 10. Mastery | **Progress** (topic map, weak/strong, personalized plan) |

## ✨ Feature map (spec → implementation)

| # | Requirement | Implementation |
|---|---|---|
| 2 | Deep lecture analysis (13 extraction types) | `src/lib/analyze.ts` — sections, topics, definitions, terms, numbers, formulas, steps, comparisons, lists, exam hints, verbatim vs understanding, relations, UNCLEAR / NEEDS VERIFICATION flags |
| 3 | 4 knowledge levels | Levels tab — Big Picture / Easy Explanation / Exam Knowledge / Memorization |
| 4–6 | Mnemonic engine, memory sentences, Original-Info rule | `src/lib/mnemonic.ts` — 3–5 scored candidates + story/visual/association fallback; always shows Original Information / Memory Trick / Meaning |
| 7 | 90/20 session timer with 6 phases | `src/screens/TimerScreen.tsx` — 0-10 Preview … 85-90 Rapid Review, auto 20-min break, auto new cycle |
| 8 | Active Recall (answer-first, 🟥🟨🟩) | `src/lib/recall.ts` + Recall tab |
| 9 | Spaced repetition that adapts | `src/lib/srs.ts` — green advances, yellow holds, red resets; capped at exam date |
| 10 | Flashcards (Front/Back/Trick/Example/Difficulty) | `src/lib/flashcards.ts` + Cards tab |
| 11 | 12 question types | `src/lib/quiz.ts` — MCQ, T/F, Fill, Matching, Short, List, Definition, Explain Why, Compare, Scenario, Case, Oral |
| 12 | Process → story | Story mnemonic + "What comes after X?" step cards + case-study questions |
| 14 | EXAM MODE | Exam tab — hides explanations/mnemonics/answers, scores, Strong/Weak/Review + wrong list |
| 15 | Weakness detection + study plan | `src/lib/mastery.ts` — per-topic accuracy → plan proportional to weakness |
| 16 | One-page cheat sheet | Sheet tab (printable) — MUST KNOW, terms, definitions, numbers, steps, formulas, mnemonics, traps, quick recall |
| 17 | 5-MINUTE REVIEW | Sheet tab → timed 5-page refresh |
| 18 | 1-MINUTE BRAIN DUMP | Recall tab → topic only, 60 s, What You Remembered / Forgot |
| 19 | Lecture compression ladder | Levels tab → Full → Detailed → Easy → Exam → One Page → 5-Min → 1-Min |
| 20 | English + Arabic + Bilingual | Settings — full RTL UI, bilingual mode, built-in EN→AR glossary for common terms |
| 21 | Academic accuracy | Rule-based extraction only; UNCLEAR + NEEDS VERIFICATION flags; tutor refuses to invent |
| 22 | Potential Exam Questions | Exam-hints section (definitions, lists, numbers, steps, comparisons, acronyms) |
| 23 | Study dashboard | Dashboard — today's stats, mastery, due reviews, streak, exam countdown, weak/strong |
| 24 | Upload (PDF/PPT/DOC/Images/TXT) | `src/lib/parse.ts` — pdfjs-dist, JSZip for OOXML, plain text; image OCR → paste fallback |
| 26 | Clean modern UI | `src/index.css` — cards, progress bars, large buttons, dark/light, RTL |
| 27 | Not a summary generator | Every screen makes the student **retrieve, test, and review** |
| 30 | AI Tutor | Tutor tab — intent detection (EN/AR), answers only from current lecture |

## 🧪 Testing

```bash
# unit-level smoke test of all engines against the demo HACCP lecture
node_modules/.bin/rolldown scripts/smoke.ts --file /tmp/smoke.cjs --format=cjs --platform=node
node /tmp/smoke.cjs
# → 🎉 ALL SMOKE TESTS PASSED
```

## 💾 Data

Everything lives in the browser (`localStorage` key `studyflow.v1`) — lectures, cards,
schedule, attempts, streaks. Nothing leaves the device. Reset from **Settings**.

## 📖 Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — architecture, screens, navigation,
  database schema, AI workflow and the internal prompt system.

## 🗣 Languages

واجهة كاملة بالعربية مع وضع ثنائي اللغة (English + شرح عربي بسيط) — الإعدادات ← Language.
