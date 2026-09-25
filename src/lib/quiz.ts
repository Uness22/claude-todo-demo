// ============================================================
// quiz.ts — Quiz Engine
// Builds a mixed question bank from the lecture analysis using
// 12 question types (MCQ, T/F, Fill, Matching, Short, List,
// Definition, Explain Why, Compare, Scenario, Case, Oral).
// All questions derive strictly from lecture content.
// ============================================================

import type { Difficulty, Flashcard, Lecture, Question, QuestionKind } from '../types'
import { uid } from '../types'
import { gradeText, keywords, matchCount, splitSentences, truncate } from './text'

function diffOf(text: string): Difficulty {
  if (text.length > 180) return 'hard'
  if (text.length > 90) return 'medium'
  return 'easy'
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.floor(Math.random() * (i + 1)))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function capPerKind(questions: Question[], per = 3): Question[] {
  const count: Record<string, number> = {}
  return questions.filter((q) => {
    count[q.kind] = (count[q.kind] || 0) + 1
    return count[q.kind] <= per
  })
}

/** Build a mixed question bank (max ~30 questions). */
export function generateQuestions(lecture: Lecture): Question[] {
  const a = lecture.analysis
  const topic = (sectionId?: string) => a.sections.find((s) => s.id === sectionId)?.title || a.mainTopics[0] || lecture.title
  const qs: Question[] = []
  const otherTerms = (self: string, n = 3) =>
    shuffle(a.definitions.map((d) => d.term).filter((t) => t.toLowerCase() !== self.toLowerCase())).slice(0, n)

  // ---------- Definition → MCQ ----------
  for (const d of a.definitions.slice(0, 6)) {
    const distractors = otherTerms(d.term)
    if (distractors.length >= 2) {
      qs.push({
        id: uid('q'),
        lectureId: lecture.id,
        kind: 'mcq',
        topic: a.mainTopics.find((t) => d.text.toLowerCase().includes(t.toLowerCase())) || a.mainTopics[0] || lecture.title,
        prompt: `Which term matches this definition?\n“${truncate(d.text, 150)}”`,
        options: shuffle([d.term, ...distractors]),
        answer: d.term,
        keywords: keywords(d.term, 3),
        explanation: `${d.term} — ${truncate(d.text, 160)}`,
        difficulty: 'medium',
      })
    }
    // inverse MCQ
    const wrongDefs = shuffle(a.definitions.filter((x) => x.term !== d.term))
      .slice(0, 3)
      .map((x) => truncate(x.text, 110))
    if (wrongDefs.length >= 2) {
      qs.push({
        id: uid('q'),
        lectureId: lecture.id,
        kind: 'mcq',
        topic: a.mainTopics[0] || lecture.title,
        prompt: `What is ${d.term}?`,
        options: shuffle([truncate(d.text, 130), ...wrongDefs]),
        answer: truncate(d.text, 130),
        keywords: keywords(d.text, 5),
        explanation: d.text,
        difficulty: 'easy',
      })
    }
  }

  // ---------- True / False ----------
  for (const d of shuffle(a.definitions).slice(0, 4)) {
    const makeFalse = Math.random() < 0.5
    if (makeFalse) {
      const others = otherTerms(d.term, 1)
      if (!others.length) continue
      const falseText = d.text.replace(new RegExp(`\\b${d.term.split(/\s+/)[0]}\\b`, 'i'), others[0])
      if (falseText === d.text) continue
      qs.push({
        id: uid('q'),
        lectureId: lecture.id,
        kind: 'tf',
        topic: a.mainTopics[0] || lecture.title,
        prompt: `True or False?\n“${truncate(falseText, 170)}”`,
        options: ['True', 'False'],
        answer: 'False',
        keywords: keywords(d.text, 4),
        explanation: `Correct statement: “${truncate(d.text, 170)}”`,
        difficulty: 'medium',
      })
    } else {
      qs.push({
        id: uid('q'),
        lectureId: lecture.id,
        kind: 'tf',
        topic: a.mainTopics[0] || lecture.title,
        prompt: `True or False?\n“${truncate(d.text, 170)}”`,
        options: ['True', 'False'],
        answer: 'True',
        keywords: keywords(d.text, 4),
        explanation: `As stated in the lecture: “${truncate(d.text, 170)}”`,
        difficulty: 'easy',
      })
    }
  }

  // ---------- Fill in the Blank ----------
  for (const d of shuffle(a.definitions).slice(0, 4)) {
    const keyTerm = d.term.split(/\s+/)[0].replace(/[^\w\u0600-\u06FF-]/g, '')
    if (keyTerm.length < 4 || /^\d/.test(keyTerm)) continue
    const re = new RegExp(`\\b${keyTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (!re.test(d.text)) continue
    const blanked = d.text.replace(re, '________')
    qs.push({
      id: uid('q'),
      lectureId: lecture.id,
      kind: 'fill',
      topic: a.mainTopics[0] || lecture.title,
      prompt: `Fill in the blank:\n“${truncate(blanked, 170)}”`,
      answer: keyTerm,
      keywords: [keyTerm],
      explanation: `${d.term}: ${truncate(d.text, 140)}`,
      difficulty: 'medium',
    })
  }

  // ---------- Matching ----------
  const matchable = a.definitions.slice(0, 6)
  if (matchable.length >= 4) {
    const chosen = matchable.slice(0, 4)
    qs.push({
      id: uid('q'),
      lectureId: lecture.id,
      kind: 'matching',
      topic: a.mainTopics[0] || lecture.title,
      prompt: 'Match each term with its correct definition.',
      pairs: chosen.map((d) => ({ a: d.term, b: truncate(d.text, 90) })),
      answer: chosen.map((d) => d.term).join(' | '),
      keywords: chosen.map((d) => d.term.split(/\s+/)[0].toLowerCase()),
      explanation: chosen.map((d) => `${d.term} → ${truncate(d.text, 80)}`).join('\n'),
      difficulty: 'hard',
    })
  }

  // ---------- Definition / Short answer ----------
  for (const d of shuffle(a.definitions).slice(0, 3)) {
    qs.push({
      id: uid('q'),
      lectureId: lecture.id,
      kind: 'definition',
      topic: a.mainTopics[0] || lecture.title,
      prompt: `Define: ${d.term}`,
      answer: d.text,
      keywords: keywords(d.text, 6),
      explanation: d.text,
      difficulty: diffOf(d.text),
    })
  }

  // ---------- List questions ----------
  for (const l of a.lists.slice(0, 3)) {
    if (l.items.length < 3 || l.items.length > 10) continue
    qs.push({
      id: uid('q'),
      lectureId: lecture.id,
      kind: 'list',
      topic: topic(l.sectionId),
      prompt: `List: ${l.title}`,
      answer: l.items.join(' • '),
      keywords: l.items.map((it) => keywords(it, 2)[0]).filter(Boolean),
      explanation: l.items.map((it, i) => `${i + 1}. ${it}`).join('\n'),
      difficulty: l.items.length > 6 ? 'hard' : 'medium',
    })
  }
  if (a.steps.length >= 3 && a.steps.length <= 10) {
    qs.push({
      id: uid('q'),
      lectureId: lecture.id,
      kind: 'list',
      topic: a.stepsTitle || a.mainTopics[0] || lecture.title,
      prompt: `List the steps of ${a.stepsTitle || 'the process'} in order.`,
      answer: a.steps.map((s) => s.title).join(' → '),
      keywords: a.steps.map((s) => keywords(s.title, 1)[0]).filter(Boolean),
      explanation: a.steps.map((s, i) => `${i + 1}. ${s.title}`).join('\n'),
      difficulty: 'hard',
    })
  }

  // ---------- Explain Why ----------
  for (const { s, sectionId } of allSentences(a.sections)) {
    const m = s.match(/^(.{20,220}?)\s+because\s+(.{10,180})$/i)
    if (m) {
      qs.push({
        id: uid('q'),
        lectureId: lecture.id,
        kind: 'explain',
        topic: topic(sectionId),
        prompt: `Explain why: ${m[1].trim().replace(/^\w/, (c) => c.toUpperCase())}?`,
        answer: `Because ${m[2].trim()}`,
        keywords: keywords(m[2], 5),
        explanation: s,
        difficulty: 'hard',
      })
      break
    }
  }

  // ---------- Compare ----------
  for (const c of a.comparisons.slice(0, 3)) {
    qs.push({
      id: uid('q'),
      lectureId: lecture.id,
      kind: 'compare',
      topic: a.mainTopics[0] || lecture.title,
      prompt: `Compare: ${c.a} vs ${c.b}`,
      answer: c.text,
      keywords: keywords(c.text, 7),
      explanation: c.text,
      difficulty: 'hard',
    })
  }

  // ---------- Scenario (condition → outcome from the lecture) ----------
  for (const { s, sectionId } of allSentences(a.sections)) {
    const m = s.match(/^(?:If|When)\s+(.{8,120}?)[,]\s+(?:then\s+)?(.{15,180})$/i)
    if (m) {
      qs.push({
        id: uid('q'),
        lectureId: lecture.id,
        kind: 'scenario',
        topic: topic(sectionId),
        prompt: `Scenario — What happens if ${m[1].trim()}?`,
        answer: m[2].trim(),
        keywords: keywords(m[2], 5),
        explanation: s,
        difficulty: 'hard',
      })
    }
    const w = s.match(/^What happens (?:if|when)\s+(.{8,100})\?$/i)
    if (w && qs.filter((q) => q.kind === 'scenario').length < 2) {
      qs.push({
        id: uid('q'),
        lectureId: lecture.id,
        kind: 'scenario',
        topic: topic(sectionId),
        prompt: s,
        answer: splitSentences(a.sections.find((x) => x.id === sectionId)?.body || '').find((x) => !x.startsWith(s)) || s,
        keywords: keywords(s, 5),
        explanation: 'Answer from the lecture content.',
        difficulty: 'medium',
      })
    }
  }

  // ---------- Case study (walk the process) ----------
  if (a.steps.length >= 4) {
    qs.push({
      id: uid('q'),
      lectureId: lecture.id,
      kind: 'case',
      topic: a.stepsTitle || a.mainTopics[0] || lecture.title,
      prompt: `Case study: A student must perform “${a.stepsTitle || 'the process'}” from start to finish. Write the full sequence of steps and briefly note what happens at each one.`,
      answer: a.steps.map((s) => `${s.title}${s.detail ? ` — ${s.detail}` : ''}`).join(' → '),
      keywords: a.steps.map((s) => keywords(s.title, 2)[0]).filter(Boolean),
      explanation: a.steps.map((s, i) => `${i + 1}. ${s.title}`).join('\n'),
      difficulty: 'hard',
    })
  }

  // ---------- Oral recall (from flashcards / verbatim) ----------
  const oralSrc: { q: string; ans: string }[] = [
    ...a.verbatim.slice(0, 3).map((v) => ({ q: `Say aloud — without looking — the exact rule about: ${truncate(v, 40)}…`, ans: v })),
    ...a.definitions.slice(0, 2).map((d) => ({ q: `Explain ${d.term} out loud in 20 seconds.`, ans: d.text })),
  ]
  for (const o of shuffle(oralSrc).slice(0, 2)) {
    qs.push({
      id: uid('q'),
      lectureId: lecture.id,
      kind: 'oral',
      topic: a.mainTopics[0] || lecture.title,
      prompt: o.q,
      answer: o.ans,
      keywords: keywords(o.ans, 6),
      explanation: o.ans,
      difficulty: 'medium',
    })
  }

  return shuffle(capPerKind(qs, 3)).slice(0, 30)
}

function allSentences(sections: { id: string; body: string }[]): { s: string; sectionId: string }[] {
  const out: { s: string; sectionId: string }[] = []
  for (const sec of sections) for (const s of splitSentences(sec.body)) out.push({ s, sectionId: sec.id })
  return out
}

// ---------- Answer evaluation ----------

export interface EvalResult {
  status: 'correct' | 'partial' | 'incorrect'
  score: 0 | 0.5 | 1
  hits: string[]
}

/** Evaluate a typed answer against a question (keyword coverage). */
export function evaluateAnswer(q: Question, userText: string): EvalResult {
  const ans = userText.trim()
  if (!ans) return { status: 'incorrect', score: 0, hits: [] }

  if (q.kind === 'tf') {
    const ok = ans.toLowerCase().startsWith(q.answer.toLowerCase()[0])
    return { status: ok ? 'correct' : 'incorrect', score: ok ? 1 : 0, hits: [] }
  }
  if (q.kind === 'mcq' && q.options) {
    const ok = ans === q.answer
    return { status: ok ? 'correct' : 'incorrect', score: ok ? 1 : 0, hits: [] }
  }
  if (q.kind === 'fill') {
    const { hit, hits } = matchCount(ans, q.keywords.length ? q.keywords : [q.answer])
    const ok = hit > 0 || ans.toLowerCase() === q.answer.toLowerCase()
    return { status: ok ? 'correct' : 'incorrect', score: ok ? 1 : 0, hits }
  }
  const score = gradeText(ans, q.keywords.length ? q.keywords : keywords(q.answer, 5))
  const { hits } = matchCount(ans, q.keywords)
  return { status: score === 1 ? 'correct' : score === 0.5 ? 'partial' : 'incorrect', score, hits }
}

/** Random exam-style subset from the bank. */
export function examSet(bank: Question[], n = 12): Question[] {
  const byKind = new Map<string, Question[]>()
  for (const q of bank) {
    const arr = byKind.get(q.kind) || []
    arr.push(q)
    byKind.set(q.kind, arr)
  }
  const out: Question[] = []
  // round-robin across kinds for variety
  let added = true
  while (out.length < n && added) {
    added = false
    for (const [, arr] of byKind) {
      if (out.length >= n) break
      const pick = arr[Math.floor(Math.random() * arr.length)]
      if (pick && !out.some((q) => q.id === pick.id)) {
        out.push(pick)
        added = true
      }
    }
  }
  return shuffle(out)
}

export function questionsFromCards(cards: Flashcard[]): Question[] {
  return cards.slice(0, 20).map((c) => ({
    id: uid('q'),
    lectureId: c.lectureId,
    kind: 'short' as QuestionKind,
    topic: c.topic,
    prompt: c.front,
    answer: c.back,
    keywords: c.keywords.length ? c.keywords : keywords(c.back, 6),
    explanation: c.back,
    difficulty: c.difficulty,
  }))
}
