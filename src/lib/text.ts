// ============================================================
// text.ts — shared text processing utilities (EN + AR)
// ============================================================

import { arabicStop, englishStop } from './words'

export function normalizeText(t: string): string {
  return t
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u00A0\u200B]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim()
}

/** Split into sentences, tolerant of Arabic ؟ and missing final punctuation. */
export function splitSentences(text: string): string[] {
  const flat = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!flat) return []
  const parts = flat.split(/(?<=[.!?؟])\s+(?=[A-Z0-9\u0600-\u06FF"'(])/)
  const out: string[] = []
  for (const p of parts) {
    const s = p.trim()
    if (!s) continue
    if (s.length > 400) {
      // over-long chunk: split at semicolons / commas heuristically
      const sub = s.split(/;\s+|,\s+(?=(?:and|or|then|which)\s)/)
      for (const x of sub) {
        const y = x.trim()
        if (y) out.push(y)
      }
    } else out.push(s)
  }
  return out
}

export function words(t: string): string[] {
  return (t.match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) || []).map((w) => w.replace(/^['-]+|['-]+$/g, ''))
}

export function isArabic(t: string): boolean {
  const ar = (t.match(/[\u0600-\u06FF]/g) || []).length
  const en = (t.match(/[A-Za-z]/g) || []).length
  return ar > en
}

/** Content keywords (stopwords removed), most significant first. */
export function keywords(text: string, max = 8): string[] {
  const freq = new Map<string, number>()
  for (const w of words(text)) {
    const lw = w.toLowerCase()
    if (lw.length < 3) continue
    if (englishStop.has(lw) || arabicStop.has(lw)) continue
    if (/^\d+$/.test(lw)) continue
    freq.set(lw, (freq.get(lw) || 0) + 1)
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, max)
    .map(([w]) => w)
}

/** Frequency of each top term across a text. */
export function termFreq(text: string): Map<string, number> {
  const freq = new Map<string, number>()
  for (const w of words(text)) {
    const lw = w.toLowerCase()
    if (lw.length < 4 || englishStop.has(lw) || arabicStop.has(lw)) continue
    freq.set(lw, (freq.get(lw) || 0) + 1)
  }
  return freq
}

const SYN: Record<string, string> = {
  facilitate: 'help',
  utilizes: 'uses',
  utilize: 'use',
  utilized: 'used',
  numerous: 'many',
  sufficient: 'enough',
  however: 'but',
  therefore: 'so',
  additional: 'more',
  demonstrate: 'show',
  demonstrates: 'shows',
  purchase: 'buy',
  purchased: 'bought',
  attempt: 'try',
  assist: 'help',
  requires: 'needs',
  require: 'need',
  contained: 'had',
  contains: 'has',
  occur: 'happen',
  occurs: 'happens',
  approximately: 'about',
  indicates: 'shows',
  indicate: 'show',
  obtained: 'got',
  obtain: 'get',
  'e.g.': 'for example',
  'i.e.': 'that is',
  important: 'key',
  essential: 'necessary',
  primarily: 'mainly',
  currently: 'now',
  entire: 'whole',
  rapidly: 'fast',
  immediately: 'right away',
  'in order to': 'to',
  'due to the fact that': 'because',
  'a large number of': 'many',
  'in addition': 'also',
  'for instance': 'for example',
}

/** Simplify wording WITHOUT changing meaning: synonyms + short sentences. */
export function simplifySentence(s: string, maxWords = 16): string[] {
  let t = s
  for (const [k, v] of Object.entries(SYN)) {
    t = t.replace(new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), v)
  }
  const chunks: string[] = []
  // split long sentences at natural joints
  if (words(t).length > maxWords) {
    const pieces = t.split(/,\s+(?=(?:and|or|but|so|which|that|while|because|then)\s)|;\s+|\s+(?:while|whereas|because)\s+/i)
    for (let i = 0; i < pieces.length; i++) {
      let p = pieces[i].trim()
      if (i > 0 && /^(and|or|but|so|which|that|while|because|then)\b/i.test(p)) {
        p = p.replace(/^(and|or|but|so|which|that|while|because|then)\s+/i, '')
      }
      if (p) chunks.push(p)
    }
  } else chunks.push(t.trim())
  return chunks.map((c) => c.replace(/\s+/g, ' ').trim()).filter(Boolean)
}

/** Count how many `keys` appear in `text` (case-insensitive, word-aware). */
export function matchCount(text: string, keys: string[]): { hit: number; hits: string[] } {
  const lower = text.toLowerCase()
  const hits: string[] = []
  for (const k of keys) {
    const lk = k.toLowerCase().trim()
    if (!lk) continue
    const re = new RegExp(`(^|[^\\p{L}])${lk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\p{L}]|$)`, 'u')
    if (re.test(lower)) hits.push(lk)
  }
  return { hit: hits.length, hits }
}

/** Score a free-text answer against expected keywords → 0 | 0.5 | 1 */
export function gradeText(answer: string, keywordsList: string[]): 0 | 0.5 | 1 {
  if (!keywordsList.length) return answer.trim().length >= 10 ? 1 : 0
  const { hit } = matchCount(answer, keywordsList)
  const ratio = hit / keywordsList.length
  if (ratio >= 0.6) return 1
  if (ratio >= 0.3) return 0.5
  return 0
}

export function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…'
}
