// ============================================================
// mnemonic.ts — Smart Mnemonic Engine
// Generates 3–5 candidate memory tricks from first letters:
//   1. extract first letters of the items
//   2. find easy words starting with those letters
//   3. build short, vivid, slightly odd sentences
//   4. score + rank, mark "Easiest to Remember"
// Fallbacks: story mnemonic / visual mnemonic / association.
// NEVER alters the original information — always shown alongside.
// ============================================================

import type { MnemonicOption } from '../types'
import { uid } from '../types'
import { imageable, oddWords, wordBank, arabicStop, englishStop } from './words'
import { isArabic } from './text'

const AR_LETTER_WORDS: Record<string, string> = {
  'ا': 'أرنب', 'أ': 'أسد', 'إ': 'إبريق', 'ب': 'بيت', 'ت': 'تفاحة', 'ث': 'ثعلب', 'ج': 'جبل',
  'ح': 'حصان', 'خ': 'خروف', 'د': 'دب', 'ذ': 'ذرة', 'ر': 'رمان', 'ز': 'زرافة', 'س': 'سمكة',
  'ش': 'شمس', 'ص': 'صقر', 'ض': 'ضفدع', 'ط': 'طائر', 'ظ': 'ظرف', 'ع': 'عين', 'غ': 'غزال',
  'ف': 'فلفل', 'ق': 'قمر', 'ك': 'كتاب', 'ل': 'ليمون', 'م': 'موز', 'ن': 'نجمة', 'ه': 'هدهد',
  'و': 'وردة', 'ي': 'يد', 'ة': 'ة', 'ى': 'ي',
}

/** First meaningful word of an item (articles / stopwords skipped). */
function firstMeaningful(item: string): string {
  const toks = item
    .replace(/^\d+[.)\-–]\s*/, '')
    .replace(/\*\*/g, '')
    .split(/[\s,;:]+/)
    .filter(Boolean)
  for (const t of toks) {
    const lt = t.toLowerCase()
    if (englishStop.has(lt) || arabicStop.has(lt)) continue
    if (/^(of|the|a|an)$/i.test(t)) continue
    return t
  }
  return toks[0] || item
}

export function extractLetters(items: string[]): { letter: string; item: string }[] {
  return items.map((item) => {
    const w = firstMeaningful(item)
    const ch = (w[0] || item[0] || '?').toUpperCase()
    return { letter: ch, item }
  })
}

function scoreWord(w: string): number {
  const lw = w.toLowerCase()
  let s = 0
  if (imageable.has(lw)) s += 3
  if (oddWords.has(lw)) s += 4
  if (w.length <= 5) s += 2
  else if (w.length <= 8) s += 1
  else s -= 1
  return s
}

function prefixBonus(bankWord: string, item: string): number {
  const a = bankWord.toLowerCase()
  const b = item.toLowerCase().replace(/[^a-z]/g, '')
  if (b.length < 3) return 0
  const n = Math.min(3, b.length)
  return a.slice(0, n) === b.slice(0, n) ? 4 : 0
}

interface Build {
  text: string
  mapping: { letter: string; item: string }[]
  score: number
}

function buildSentenceOptions(
  pairs: { letter: string; item: string }[],
  attempts = 60,
): Build[] {
  const results: Build[] = []
  const seen = new Set<string>()
  for (let i = 0; i < attempts; i++) {
    const mapping: { letter: string; item: string }[] = []
    const chosen: string[] = []
    let score = 0
    const usedWords = new Set<string>()
    for (const p of pairs) {
      const bank = wordBank[p.letter]
      mapping.push({ letter: p.letter, item: p.item })
      if (!bank || !bank.length) {
        score -= 5
        continue
      }
      // sample 3 and pick the best-scoring — biased randomness keeps options diverse
      const samples = [...bank].sort(() => Math.random() - 0.5).slice(0, 3)
      let best = samples[0]
      let bestS = -Infinity
      for (const s of samples) {
        const sc = scoreWord(s) + prefixBonus(s, p.item)
        if (sc > bestS) {
          bestS = sc
          best = s
        }
      }
      score += bestS
      if (usedWords.has(best)) score -= 3
      usedWords.add(best)
      chosen.push(best)
    }
    const text = chosen.join(' ')
    // sentence-level shaping
    if (text.length > 64) score -= 4
    if (new Set(chosen.map((w) => w.toLowerCase())).size === chosen.length) score += 3
    if (seen.has(text)) continue
    seen.add(text)
    results.push({ text, mapping, score })
  }
  return results.sort((a, b) => b.score - a.score)
}

const STORY_TEMPLATES = [
  (items: string[]) => {
    const mid = items.slice(1, -1)
    const bridge = mid.length ? `, then ${mid.join(', then ')}` : ''
    return `Story: You walk onto a stage. First comes ${items[0]}${bridge}, and finally ${items[items.length - 1]}. The order never changes — replay the stage in your head.`
  },
  (items: string[]) =>
    `Story: A taxi stops. In hops ${items[0]}${items.slice(1).map((it) => `, followed by ${it}`).join('')}. Each one pays with the next item on the list — drive the route again and you have them all.`,
  (items: string[]) =>
    `Mini-story: ${items.join(' → ')}. Picture each name as a signpost on one road; walking the road once gives you the whole list.`,
]

const VISUAL_TEMPLATES = [
  (items: string[]) =>
    `Visual: Imagine ${items[0]} written in giant neon letters. Under it stands ${items.slice(1).join(', and beside it ')}. Freeze that picture for 5 seconds.`,
  (items: string[]) =>
    `Visual: Build a mental poster — ${items.map((it, i) => `${it} in box #${i + 1}`).join(', ')}. Number the boxes left to right.`,
]

const ASSOC_TEMPLATES = [
  (items: string[]) =>
    items
      .slice(0, -1)
      .map((it, i) => `“${it}” → link it to “${items[i + 1]}” (one crazy image joining them)`)
      .join('; ') + '. Follow the chain.',
]

function mappingOf(pairs: { letter: string; item: string }[]) {
  return pairs.map(({ letter, item }) => ({ letter, item }))
}

/**
 * Generate 3–5 mnemonic options for a list of items.
 * Returns ranked options; the first is pre-marked as easiest by the caller.
 */
export function generateMnemonics(items: string[], _title = ''): MnemonicOption[] {
  const clean = items.map((i) => i.replace(/^\d+[.)\-–]\s*/, '').trim()).filter(Boolean)
  if (clean.length < 2) return []
  const pairs = extractLetters(clean)
  const arabicMode = pairs.every((p) => /[\u0600-\u06FF]/.test(p.letter))

  const options: MnemonicOption[] = []

  if (arabicMode) {
    // Arabic first-letter sentence using built-in letter words
    const wordsInOrder = pairs.map((p) => AR_LETTER_WORDS[p.letter] || p.letter)
    options.push({
      id: uid('mn'),
      kind: 'sentence',
      text: wordsInOrder.join(' '),
      mapping: mappingOf(pairs),
      score: 10,
    })
  } else if (pairs.every((p) => wordBank[p.letter])) {
    const builds = buildSentenceOptions(pairs)
    const diverse: Build[] = []
    const sigs = new Set<string>()
    for (const b of builds) {
      const sig = b.text.split(' ').map((w) => w[0].toLowerCase()).join('')
      if (sigs.has(sig)) continue
      sigs.add(sig)
      diverse.push(b)
      if (diverse.length >= 4) break
    }
    for (const b of diverse) {
      options.push({
        id: uid('mn'),
        kind: 'sentence',
        text: b.text,
        mapping: b.mapping,
        score: b.score,
      })
    }
    // pure acronym variant (initials only)
    options.push({
      id: uid('mn'),
      kind: 'acronym',
      text: pairs.map((p) => p.letter).join('-') + `  →  remember the chain: ${pairs.map((p) => p.letter).join(' ')}`,
      mapping: mappingOf(pairs),
      score: 6,
    })
  }

  // Always include non-acronym fallbacks so the student has flexible choices
  const pool = [...STORY_TEMPLATES, ...VISUAL_TEMPLATES, ...ASSOC_TEMPLATES]
  const shuffled = pool.sort(() => Math.random() - 0.5)
  options.push({
    id: uid('mn'),
    kind: 'story',
    text: shuffled[0](clean),
    mapping: mappingOf(pairs),
    score: 5,
  })
  options.push({
    id: uid('mn'),
    kind: shuffled[1] === VISUAL_TEMPLATES[0] || shuffled[1] === VISUAL_TEMPLATES[1] ? 'visual' : 'association',
    text: shuffled[1](clean),
    mapping: mappingOf(pairs),
    score: 4,
  })
  if (options.filter((o) => o.kind === 'sentence').length === 0 && !arabicMode) {
    options.push({
      id: uid('mn'),
      kind: 'association',
      text: shuffled[2](clean),
      mapping: mappingOf(pairs),
      score: 3,
    })
  }

  // rank: sentence/acronym options with high scores first
  options.sort((a, b) => b.score - a.score)
  return options.slice(0, 5)
}

/** Pick the list most worth a mnemonic from the analysis shapes. */
export function bestListForMnemonic(
  lists: { title: string; items: string[]; id: string }[],
): { id: string; title: string; items: string[] } | null {
  const valid = lists.filter((l) => l.items.length >= 3 && l.items.length <= 12)
  if (!valid.length) return null
  valid.sort((a, b) => a.items.length - b.items.length || b.items.length - a.items.length)
  return valid[0]
}

export function mnemonicKindLabel(kind: MnemonicOption['kind']): string {
  switch (kind) {
    case 'sentence':
      return 'Memory sentence'
    case 'story':
      return 'Story mnemonic'
    case 'visual':
      return 'Visual mnemonic'
    case 'association':
      return 'Association chain'
    case 'acronym':
      return 'Initials chain'
  }
}

export function isLatinList(items: string[]): boolean {
  return !isArabic(items.join(' '))
}
