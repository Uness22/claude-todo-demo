// ============================================================
// recall.ts — Active Recall Engine
// Turns lecture parts into retrieval questions of 8 shapes.
// The student must answer BEFORE anything is revealed, then
// self-grades 🟥 / 🟨 / 🟩 which feeds SRS + mastery.
// ============================================================

import type { Grade, Lecture, Question } from '../types'
import { uid } from '../types'
import { keywords, splitSentences, truncate } from './text'

const SHAPES = [
  'What is...?',
  'Why...?',
  'How...?',
  'List...',
  'Compare...',
  'Give an example...',
  'What happens if...?',
  'What is the difference between...?',
] as const

/** Build an ordered recall queue covering different question shapes. */
export function recallQuestions(lecture: Lecture): Question[] {
  const a = lecture.analysis
  const out: Question[] = []
  const topic0 = a.mainTopics[0] || lecture.title

  const push = (kind: Question['kind'], prompt: string, answer: string, topic: string, extra: Partial<Question> = {}) => {
    out.push({
      id: uid('q'),
      lectureId: lecture.id,
      kind,
      topic,
      prompt,
      answer,
      keywords: keywords(answer, 6),
      difficulty: answer.length > 150 ? 'hard' : 'medium',
      ...extra,
    })
  }

  // List... (from lists and steps)
  for (const l of a.lists.slice(0, 2)) {
    push('list', `List: ${l.title}`, l.items.map((i, n) => `${n + 1}. ${i}`).join('\n'), a.mainTopics[0] || topic0, {
      explanation: l.items.join(' • '),
    })
  }
  if (a.steps.length >= 3) {
    push(
      'list',
      `Without looking: what comes in order in “${a.stepsTitle || topic0}”?`,
      a.steps.map((s, i) => `${i + 1}. ${s.title}`).join('\n'),
      a.stepsTitle || topic0,
    )
  }

  // What is...? / definition-style
  for (const d of a.definitions.slice(0, 4)) {
    push('short', `What is ${d.term}?`, d.text, topic0, { explanation: d.term })
  }

  // Why...? (because-sentences)
  for (const sec of a.sections) {
    const m = splitSentences(sec.body).find((s) => /\s+because\s+/i.test(s))
    if (m) {
      const mm = m.match(/^(.{15,140}?)[,]?\s+because\s+(.{10,160})$/i)
      push(
        'explain',
        mm ? `Why does / do ${mm[1].trim()}?` : `Why — explain: ${truncate(m, 90)}…`,
        mm ? `Because ${mm[2].trim()}` : m,
        sec.title || topic0,
      )
      break
    }
  }

  // Compare... / difference between
  for (const c of a.comparisons.slice(0, 2)) {
    push('compare', `What is the difference between ${c.a} and ${c.b}?`, c.text, topic0)
  }

  // What happens if...? (If/When sentences)
  for (const sec of a.sections) {
    const m = splitSentences(sec.body).find((s) => /^(If|When)\s+/i.test(s) && s.length > 30)
    if (m) {
      const mm = m.match(/^(?:If|When)\s+(.{5,110}?)[,]\s+(?:then\s+)?(.{10,180})$/i)
      push(
        'scenario',
        mm ? `What happens if ${mm[1].trim()}?` : `What happens if — ${truncate(m, 100)}?`,
        mm ? mm[2].trim() : m,
        sec.title || topic0,
      )
      break
    }
  }

  // Give an example... (for-example sentences)
  for (const sec of a.sections) {
    const m = splitSentences(sec.body).find((s) => /\b(for example|for instance|e\.g\.?)\b/i.test(s))
    if (m) {
      push('short', `Give an example of: ${sec.title || topic0}`, m, sec.title || topic0)
      break
    }
  }

  // How...? (process questions)
  if (a.steps.length >= 3) {
    push('short', `How is ${a.stepsTitle || topic0} carried out? Explain the flow.`, a.steps.map((s) => s.title).join(' → '), a.stepsTitle || topic0)
  }

  // Highest-value verbatim question
  if (a.verbatim.length) {
    push('short', `State this rule exactly: ${truncate(a.verbatim[0], 70)}…`, a.verbatim[0], topic0)
  }

  // Guarantee a minimum queue using big-picture
  if (out.length < 4 && a.bigPicture.length) {
    push('short', `Explain the big picture of this lecture in your own words.`, a.bigPicture.join(' '), topic0)
  }

  return out.slice(0, 12)
}

export const SHAPE_LIST: readonly string[] = SHAPES

export interface RecallResult {
  remembered: string[]
  forgot: string[]
  coverage: number
}

/** Compare a brain-dump against expected keywords (1-minute dump). */
export function compareDump(userText: string, expected: { text: string; keys: string[] }[]): RecallResult {
  const remembered: string[] = []
  const forgot: string[] = []
  const user = userText.toLowerCase()
  for (const exp of expected) {
    const hit = exp.keys.some((k) => {
      const lk = k.toLowerCase()
      if (!lk || lk.length < 3) return false
      return new RegExp(`(^|[^\\p{L}])${lk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\p{L}]|$)`, 'u').test(user)
    })
    if (hit) remembered.push(exp.text)
    else forgot.push(exp.text)
  }
  const total = expected.length || 1
  return { remembered, forgot, coverage: remembered.length / total }
}

/** Expected items for the brain dump of a lecture (top knowledge atoms). */
export function dumpExpected(lecture: Lecture): { text: string; keys: string[] }[] {
  const a = lecture.analysis
  const out: { text: string; keys: string[] }[] = []
  for (const d of a.definitions.slice(0, 6)) out.push({ text: `${d.term} — ${truncate(d.text, 90)}`, keys: [d.term.split(/\s+/)[0].toLowerCase(), ...keywords(d.text, 3)] })
  if (a.steps.length >= 3) out.push({ text: `Process: ${a.steps.map((s) => s.title).join(' → ')}`, keys: a.steps.slice(0, 4).map((s) => keywords(s.title, 1)[0] || s.title.toLowerCase()) })
  for (const l of a.lists.slice(0, 2)) out.push({ text: `${l.title}: ${l.items.slice(0, 6).join(', ')}`, keys: l.items.slice(0, 6).map((i) => keywords(i, 1)[0] || '') })
  for (const n of a.numbers.slice(0, 3)) out.push({ text: `Number to remember: ${n.value}`, keys: [n.value] })
  for (const v of a.verbatim.slice(0, 2)) out.push({ text: v, keys: keywords(v, 4) })
  return out.slice(0, 14)
}

export function gradeFromScore(score: 0 | 0.5 | 1): Grade {
  if (score === 1) return 'green'
  if (score === 0.5) return 'yellow'
  return 'red'
}
