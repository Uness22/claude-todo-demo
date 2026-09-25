// ============================================================
// flashcards.ts — automatic Flashcard generation from a lecture
// Every card: Front / Back / Memory Trick / Example / Difficulty
// ============================================================

import type { Analysis, Flashcard, Lecture } from '../types'
import { SRS_INTERVALS_DAYS, uid } from '../types'
import { extractLetters } from './mnemonic'
import { keywords, truncate } from './text'

export function generateCards(lecture: Lecture): Flashcard[] {
  const a: Analysis = lecture.analysis
  const cards: Omit<Flashcard, 'id' | 'createdAt' | 'due' | 'intervalIndex' | 'reps' | 'lapses' | 'history'>[] = []
  const now = Date.now()

  const topicOf = (sectionId?: string): string => {
    const sec = a.sections.find((s) => s.id === sectionId)
    return sec?.title || a.mainTopics[0] || lecture.title
  }

  // 1. Definitions
  for (const d of a.definitions.slice(0, 18)) {
    cards.push({
      lectureId: lecture.id,
      front: `What is ${d.term}?`,
      back: d.text,
      difficulty: d.text.length > 160 ? 'hard' : d.text.length > 80 ? 'medium' : 'easy',
      type: 'definition',
      topic: a.mainTopics[0] || lecture.title,
      keywords: keywords(d.text, 6),
    })
  }

  // 2. Lists (split long lists into chunks of ≤6 for recall quality)
  for (const l of a.lists.slice(0, 8)) {
    const topic = topicOf(l.sectionId)
    if (l.items.length <= 7) {
      cards.push({
        lectureId: lecture.id,
        front: `List: ${l.title} (${l.items.length} items)`,
        back: l.items.map((it, i) => `${i + 1}. ${it}`).join('\n'),
        memoryTrick: mnemonicHint(l.items),
        difficulty: l.items.length <= 4 ? 'medium' : 'hard',
        type: 'list',
        topic,
        keywords: l.items.map((it) => keywords(it, 1)[0]).filter(Boolean),
      })
    } else {
      const half = Math.ceil(l.items.length / 2)
      for (const [ci, chunk] of [l.items.slice(0, half), l.items.slice(half)].entries()) {
        cards.push({
          lectureId: lecture.id,
          front: `List (part ${ci + 1}): ${l.title}`,
          back: chunk.map((it, i) => `${i + 1}. ${it}`).join('\n'),
          difficulty: 'hard',
          type: 'list',
          topic,
          keywords: chunk.map((it) => keywords(it, 1)[0]).filter(Boolean),
        })
      }
    }
  }

  // 3. Numbers & formulas
  for (const n of [...a.numbers, ...a.formulas].slice(0, 10)) {
    cards.push({
      lectureId: lecture.id,
      front: `What number / formula applies here?\n${truncate(n.context.replace(new RegExp(n.value, 'gi'), '___'), 140)}`,
      back: n.value,
      difficulty: 'medium',
      type: 'number',
      topic: a.mainTopics[0] || lecture.title,
      keywords: [n.value],
      example: n.context,
    })
  }

  // 4. Steps / order questions
  if (a.steps.length >= 3) {
    const titles = a.steps.map((s) => s.title.replace(/^\d+\.\s*/, ''))
    cards.push({
      lectureId: lecture.id,
      front: `Put these in the correct order:\n${shuffleCopy(titles).join(' → ')}`,
      back: titles.map((t, i) => `${i + 1}. ${t}`).join('\n'),
      memoryTrick: mnemonicHint(titles),
      difficulty: 'hard',
      type: 'step',
      topic: a.stepsTitle || a.mainTopics[0] || lecture.title,
      keywords: keywords(titles.join(' '), 8),
    })
    for (let i = 0; i < titles.length - 1; i++) {
      cards.push({
        lectureId: lecture.id,
        front: `What comes after “${titles[i]}”?`,
        back: titles[i + 1],
        difficulty: 'easy',
        type: 'step',
        topic: a.stepsTitle || a.mainTopics[0] || lecture.title,
        keywords: keywords(titles[i + 1], 3),
      })
    }
  }

  // 5. Comparisons
  for (const c of a.comparisons.slice(0, 6)) {
    cards.push({
      lectureId: lecture.id,
      front: `Difference between ${c.a} and ${c.b}?`,
      back: c.text,
      difficulty: 'hard',
      type: 'comparison',
      topic: a.mainTopics[0] || lecture.title,
      keywords: keywords(c.text, 7),
    })
  }

  // 6. Verbatim points
  for (const v of a.verbatim.slice(0, 8)) {
    cards.push({
      lectureId: lecture.id,
      front: `State exactly: ${truncate(v, 60)}…`,
      back: v,
      difficulty: 'medium',
      type: 'verbatim',
      topic: a.mainTopics[0] || lecture.title,
      keywords: keywords(v, 7),
    })
  }

  return cards.map((c) => ({
    ...c,
    id: uid('card'),
    createdAt: now,
    due: now + SRS_INTERVALS_DAYS[0] * 86400000, // Review 1 = same day
    intervalIndex: 0,
    reps: 0,
    lapses: 0,
    history: [],
  }))
}

function shuffleCopy(arr: string[]): string[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** First-letter memory hint shown on the card back (never replaces the info). */
function mnemonicHint(items: string[]): string | undefined {
  if (items.length < 3 || items.length > 10) return undefined
  const pairs = extractLetters(items)
  const letters = pairs.map((p) => p.letter).join('')
  if (!/^[A-Z]{3,10}$/.test(letters)) return undefined
  return `Memory trick: remember the chain “${pairs.map((p) => p.letter).join(' ')}” and map it to the items.`
}
