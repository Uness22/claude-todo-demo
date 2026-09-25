// ============================================================
// analyze.ts — Lecture Analyzer
// Reads the full lecture and extracts: main topics, subtopics,
// definitions, key terms, numbers/formulas, steps, comparisons,
// lists, exam predictions, verbatim vs understanding points,
// concept relations — plus quality flags (UNCLEAR / NEEDS VERIFICATION).
// Rule-based and deterministic: never invents content beyond the text.
// ============================================================

import type {
  Analysis,
  Comparison,
  ConceptRelation,
  Definition,
  ExamHint,
  ExtractedList,
  NumberFact,
  QualityFlag,
  Section,
  TermDef,
} from '../types'
import { uid } from '../types'
import { glossary } from './words'
import { keywords, normalizeText, simplifySentence, splitSentences, termFreq, words } from './text'

const PROCESS_WORDS = /\b(process|steps?|procedure|flow|cycle|stages?|method|sequence|order|preparation|production|lifecycle|life cycle|خطوات|عملية|سير)\b/i
const SUMMARY_HEAD = /\b(summary|overview|introduction|intro|objectives?|abstract|ملخص|مقدمة|أهداف)\b/i

function headingCandidate(line: string): { depth: number; title: string } | null {
  const t = line.trim()
  if (!t || t.length > 90) return null

  // Markdown headings
  const md = t.match(/^(#{1,6})\s+(.+)$/)
  if (md) return { depth: md[1].length <= 2 ? 1 : 2, title: md[2].replace(/[#*]+/g, '').trim() }

  // Bold-only line
  const bold = t.match(/^\*\*([^*]{3,70})\*\*[:.]?$/)
  if (bold) return { depth: 1, title: bold[1].trim() }

  // Numbered heading: 1. Title  /  1.1 Title  /  (2) Title
  // Only when the rest looks like a title: short, NO sentence-ending punctuation.
  // (A numbered line with a period is a list item, not a heading.)
  const num = t.match(/^(\d+(?:\.\d+)+|\d{1,2})[.)\-–]\s+(.{2,})$/)
  if (num && num[2].length <= 80) {
    const rest = num[2].trim()
    const isSub = num[1].includes('.') || /^\d+\.\d+/.test(t)
    if (rest.length <= 60 && !/[.!?]/.test(rest)) {
      return { depth: isSub ? 2 : 1, title: rest.replace(/:$/, '') }
    }
    return null // long / sentence-like numbered line = list item
  }

  // Line ending with ':' (classic slide heading)
  if (t.endsWith(':') && t.length <= 80 && !/^\d+\.\s*$/.test(t) && t.split(/\s+/).length <= 14) {
    const title = t.replace(/[:：]\s*$/, '').trim()
    if (title.length >= 3 && !/^(e\.g|i\.e|etc|note|vs)$/i.test(title)) {
      return { depth: 1, title }
    }
  }

  // ALL-CAPS latin heading
  if (/^[A-Z][A-Z0-9\s\-/&()]{3,60}$/.test(t) && /[A-Z]{3}/.test(t) && /\s/.test(t)) {
    return { depth: 1, title: t.replace(/[:.]+$/, '') }
  }

  // Short standalone line without terminal punctuation → title-like
  // (e.g. "Summary", "Main Topics", "Introduction: Why It Matters")
  if (
    t.length <= 40 &&
    !/[-*•–—●▪◦]/.test(t[0]) &&
    !/[.!?;,]$/.test(t) &&
    /^[A-Z\u0600-\u06FF]/.test(t) &&
    t.split(/\s+/).length <= 6 &&
    (t.includes(' ') || (t.split(/\s+/).length === 1 && t.length <= 16))
  ) {
    return { depth: 1, title: t.replace(/[:：]+$/, '') }
  }

  return null
}

function isBullet(line: string): boolean {
  return /^[-*•–—●▪◦]\s+/.test(line.trim()) || /^\d{1,2}[.)\-–]\s+/.test(line.trim())
}

function inlineNumberedList(line: string): string[] | null {
  const matches = [...line.matchAll(/(?:^|\s)(\d{1,2})[.)]\s+([^(]+?)(?=\s+\d{1,2}[.)]\s+|$)/g)]
  if (matches.length >= 3) return matches.map((m) => m[2].trim()).filter(Boolean)
  return null
}

function cleanTerm(t: string): string {
  return t
    .replace(/\*\*/g, '')
    .replace(/\s*\(.*?\)\s*$/,'')
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/[:.]+$/, '')
    .trim()
}

const BAD_TERM_START = /^(it|this|that|there|these|those|he|she|they|we|you|i|if|when|while|because|therefore|however|each|one|some|all|most|the\s+same|it\s+is)\b/i

function validTerm(t: string): boolean {
  const w = t.trim()
  if (w.length < 2 || w.length > 60) return false
  if (BAD_TERM_START.test(w)) return false
  if (w.split(/\s+/).length > 8) return false
  if (/^\d/.test(w)) return false
  return true
}

function tryDefinition(line: string): { term: string; text: string } | null {
  const s = line.trim().replace(/\*\*/g, '')
  if (s.length < 15) return null

  // Term: definition  /  Term — definition  /  Term - definition
  let m = s.match(/^([A-Za-z\u0600-\u06FF][\w\u0600-\u06FF\s\-/()]{1,60}?)\s*(?:\([^)]*\))?\s*[:：—–]\s+(.{12,})$/)
  if (m && validTerm(cleanTerm(m[1]))) {
    return { term: cleanTerm(m[1]), text: splitSentences(m[2])[0] || m[2].trim() }
  }

  // X is a/an ... / X refers to ... / X is defined as ... / X means ...
  m = s.match(/^(?:The\s+)?([A-Za-z\u0600-\u06FF][\w\u0600-\u06FF-]*(?:\s*\([^)]{0,60}\))?(?:\s+[\w\u0600-\u06FF-]+){0,5}?)\s+(?:is defined as|is known as|refers to|are defined as|means|is|are)\s+(?:a|an|the)?\s*(?:simple\s+|basic\s+|type\s+of\s+|kind\s+of\s+|form\s+of\s+|system\s+for\s+|method\s+of\s+)?(.{15,})$/)
  if (m && validTerm(cleanTerm(m[1])) && !/^(is|are)\b/i.test(m[1])) {
    const term = cleanTerm(m[1])
    const rest = m[2]
    // avoid "X is verb-ing ..." false positives loosely: require article/noun-ish start or noun
    if (/^(?:a|an|the|any|every|each|one|used|made|known|responsible|the\s+process|something)/i.test(rest) || /^\d/.test(rest) || /^[A-Z]/.test(rest)) {
      return { term, text: splitSentences(s)[0] || s }
    }
  }
  return null
}

function isUnclearLine(l: string): boolean {
  const t = l.trim()
  if (t.length < 12) return true
  if (/\b(TBD|TODO|FIXME|\?\?\?|\[fill|\[insert|lorem ipsum|xxx+)\b/i.test(t)) return true
  const letters = (t.match(/[A-Za-z\u0600-\u06FF]/g) || []).length
  const others = (t.match(/[^\sA-Za-z\u0600-\u06FF]/g) || []).length
  if (letters > 4 && others / t.length > 0.45) return true
  const ws = words(t)
  if (ws.length >= 4 && new Set(ws.map((w) => w.toLowerCase())).size === 1) return true
  return false
}

function isVerificationLine(l: string): boolean {
  return /\b(unconfirmed|unverified|needs? (a )?source|source needed|allegedly|reportedly|it is said|some (sources|say|people)|rumou?red|اسنده|غير مؤكد)\b/i.test(l)
}

export function analyze(raw: string): Analysis {
  const text = normalizeText(raw)
  const flags: QualityFlag[] = []
  const lines = text.split('\n').map((l) => l.trim())

  // ---------- 1. Sections (heading tree) ----------
  const sections: Section[] = []
  let current: Section | null = null
  let sawHeading = false
  const flush = () => {
    if (current) {
      current.body = current.lines.join('\n').trim()
      sections.push(current)
      current = null
    }
  }
  for (const line of lines) {
    if (!line) {
      if (current) current.lines.push('')
      continue
    }
    const h = headingCandidate(line)
    if (h) {
      // Dedup: a repeated title (e.g. "1. Topic" then "Topic:") stays as content
      if (current && current.title && current.title.toLowerCase() === h.title.toLowerCase()) {
        current.lines.push(line)
        continue
      }
      sawHeading = true
      flush()
      current = { id: uid('sec'), title: h.title, depth: h.depth, body: '', lines: [] }
    } else {
      if (!current) {
        current = { id: uid('sec'), title: '', depth: 1, body: '', lines: [] }
      }
      current.lines.push(line)
    }
  }
  flush()

  // Every section needs a name
  sections.forEach((s, i) => {
    if (!s.title) s.title = i === 0 ? 'Overview' : `Part ${i + 1}`
  })

  if (!sawHeading) {
    // Fallback: paragraphs as sections
    sections.length = 0
    const paras = text.split(/\n\s*\n/).filter((p) => p.trim())
    paras.forEach((p, i) => {
      const first = p.split(/\n/)[0].trim()
      const title = i === 0 ? deriveFallbackTitle(p) : first.length < 70 ? first : `Part ${i + 1}`
      sections.push({ id: uid('sec'), title, depth: 1, body: p.trim(), lines: p.split('\n') })
    })
  }
  if (sections.length === 1 && !sections[0].title) sections[0].title = 'Lecture'

  // ---------- 2. Sentences corpus ----------
  const allSentences = splitSentences(text)
  const bodySentences: { s: string; sectionId: string }[] = []
  for (const sec of sections) {
    for (const s of splitSentences(sec.body)) bodySentences.push({ s, sectionId: sec.id })
  }

  // ---------- 3. Lists ----------
  const lists: ExtractedList[] = []
  const seenListKeys = new Set<string>()
  sections.forEach((sec) => {
    let buf: string[] = []
    let kind: 'ordered' | 'unordered' = 'unordered'
    const pushList = () => {
      if (buf.length >= 2) {
        const items = buf.map((b) => b.replace(/^[-*•–—●▪◦]\s+/, '').replace(/^\d{1,2}[.)\-–]\s+/, '').trim()).filter((b) => b.length > 1)
        if (items.length >= 2) {
          const key = items[0].toLowerCase().slice(0, 40)
          if (!seenListKeys.has(key)) {
            seenListKeys.add(key)
            lists.push({ id: uid('list'), title: sec.title || `List ${lists.length + 1}`, items, kind, sectionId: sec.id })
          }
        }
      }
      buf = []
    }
    for (const line of sec.lines) {
      const inline = inlineNumberedList(line)
      if (inline) {
        pushList()
        const key = inline[0].toLowerCase().slice(0, 40)
        if (!seenListKeys.has(key)) {
          seenListKeys.add(key)
          lists.push({ id: uid('list'), title: sec.title || `List ${lists.length + 1}`, items: inline, kind: 'ordered', sectionId: sec.id })
        }
        continue
      }
      if (isBullet(line)) {
        if (!buf.length) kind = /^\d{1,2}[.)\-–]\s+/.test(line) ? 'ordered' : 'unordered'
        else if (/^\d{1,2}[.)\-–]\s+/.test(line)) kind = 'ordered'
        buf.push(line)
      } else {
        pushList()
      }
    }
    pushList()
  })

  // Arrow chains → process
  const arrowSteps: string[] = []
  for (const line of lines) {
    if (/→|->|⇒/.test(line)) {
      const parts = line.split(/→|->|⇒/).map((p) => p.trim()).filter(Boolean)
      if (parts.length >= 3) arrowSteps.push(...parts)
    }
  }

  // ---------- 4. Definitions & terms ----------
  const definitions: Definition[] = []
  const termsMap = new Map<string, TermDef>()
  const defKeys = new Set<string>()

  const addDef = (term: string, defText: string, source: Definition['source'], _sectionId?: string) => {
    const t = cleanTerm(term)
    if (!validTerm(t)) return
    const key = t.toLowerCase()
    if (defKeys.has(key)) return
    defKeys.add(key)
    const clean = defText.replace(/\s+/g, ' ').trim()
    definitions.push({ id: uid('def'), term: t, text: clean, source, unclear: isUnclearLine(clean) })
    const g = glossary[key] || glossary[t.toLowerCase().replace(/\s+/g, ' ')]
    termsMap.set(key, { term: t, definition: clean, arabic: g })
  }

  for (const { s, sectionId } of bodySentences) {
    const d = tryDefinition(s)
    if (d) addDef(d.term, d.text, 'pattern', sectionId)
  }

  // Heading + "It is ..." style definition
  for (const sec of sections) {
    if (!sec.title || sec.title.length < 3) continue
    const first = splitSentences(sec.body)[0]
    if (first && /^(?:It|This|That|The \w+)\s+(?:is|refers|means)\b/.test(first) && first.length > 25) {
      addDef(sec.title, first, 'heading', sec.id)
    }
    // acronym headings → expand later as terms without inventing
    if (/^[A-Z]{2,8}$/.test(sec.title.replace(/\s/g, '')) && !defKeys.has(sec.title.toLowerCase())) {
      termsMap.set(sec.title.toLowerCase(), { term: sec.title, definition: `${sec.title} (as used in this lecture)` })
    }
  }

  // Glossary hits for known terms present in text (bilingual support)
  for (const [k, ar] of Object.entries(glossary)) {
    if (termsMap.has(k)) continue
    const re = new RegExp(`(^|[^\\p{L}])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\p{L}]|$)`, 'iu')
    if (re.test(text)) {
      const existing = termsMap.get(k)
      if (!existing) termsMap.set(k, { term: k.replace(/\b\w/g, (c) => c.toUpperCase()), definition: `Key term used in this lecture`, arabic: ar })
    }
  }

  const terms = [...termsMap.values()]

  // ---------- 5. Numbers & formulas ----------
  const numbers: NumberFact[] = []
  const formulas: NumberFact[] = []
  const seenNum = new Set<string>()
  for (const { s } of bodySentences) {
    const f = s.match(/\b([A-Za-z\u0600-\u06FF][\w\s+\-*/^()]{0,40}=\s*[\w\s+\-*/^().\d]{2,50})/)
    if (f && /[A-Za-z]/.test(f[1].split('=')[0]) && /[0-9]/.test(f[1])) {
      const val = f[1].trim()
      if (!seenNum.has(val.toLowerCase())) {
        seenNum.add(val.toLowerCase())
        formulas.push({ id: uid('num'), value: val, context: s })
      }
      continue
    }
    // strip leading/trailing enumeration ("2. ", bare "2.", "…Principles: 1.")
    // so list artifacts don't fake numeric facts
    const s2 = s
      .replace(/^\s*\d{1,2}[.)](?:\s+|$)/, '')
      .replace(/\s+\d{1,2}[.)]\s*$/, '')
      .trim()
    const m = s2.match(/\b\d+(?:[.,]\d+)?\s*(?:%|°C|°F|℃|℉|kg|g|mg|μg|µg|ml|L|litre|liter|hours?|hrs?|minutes?|mins?|seconds?|days?|weeks?|months?|years?|times|ppm|kHz|MHz|GHz|kJ|calories?|kcal|Pa|bar|psi|cm|mm|km|m2|m³|rpm|IU|mg\/kg|g\/cm)\b|\b\d+(?:[.,]\d+)?/i)
    if (m) {
      const val = m[0].trim()
      if (!seenNum.has(val.toLowerCase()) && /\d/.test(val)) {
        seenNum.add(val.toLowerCase())
        numbers.push({ id: uid('num'), value: val, context: s2 || s })
      }
    }
  }

  // ---------- 6. Steps / processes ----------
  let steps = arrowSteps.map((t, i) => ({ id: uid('step'), title: `${i + 1}. ${t}` }))
  let stepsTitle: string | undefined
  if (steps.length >= 3) {
    stepsTitle = 'Process (from arrows in the lecture)'
  } else {
    steps = []
    for (const list of lists) {
      const sec = sections.find((x) => x.id === list.sectionId)
      const titleHit = sec && PROCESS_WORDS.test(sec.title)
      const verbish = list.items.filter((it) => /^(place|add|mix|heat|cool|store|receive|check|wash|cut|cook|measure|transfer|install|start|stop|open|close|apply|collect|review|prepare|test|scan|verify|log|report|disconnect|connect|pour|drain|sanitize|pack|ship|record|monitor|divide|multiply|select|enter|press|call|return|launch|deploy|build|run|save|read|write|convert|extract|analyze|classify|validate)\b/i.test(it.replace(/^\d+[.)\-–]\s*/, ''))).length
      if ((titleHit || list.kind === 'ordered') && list.items.length >= 3 && (titleHit || verbish >= Math.ceil(list.items.length / 2))) {
        steps = list.items.map((t) => ({ id: uid('step'), title: t.replace(/^\d+[.)\-–]\s*/, ''), detail: undefined }))
        stepsTitle = list.title
        break
      }
    }
  }

  // ---------- 7. Comparisons ----------
  const comparisons: Comparison[] = []
  const seenComp = new Set<string>()
  const pushComp = (a: string, b: string, t: string) => {
    const key = (a + '|' + b).toLowerCase()
    if (seenComp.has(key) || !a || !b || a.toLowerCase() === b.toLowerCase()) return
    seenComp.add(key)
    comparisons.push({ id: uid('cmp'), a: a.trim(), b: b.trim(), text: t })
  }
  for (const { s } of bodySentences) {
    let m = s.match(/(?:the\s+)?difference\s+between\s+([\w\u0600-\u06FF\s\-/]{2,40}?)\s+and\s+([\w\u0600-\u06FF\s\-/]{2,40}?)(?:\s+is|\s*:|\.|,|$)/i)
    if (m) { pushComp(m[1], m[2], s); continue }
    m = s.match(/\b([\w\u0600-\u06FF-]{2,30}(?:\s+[\w\u0600-\u06FF-]{1,20}){0,3}?)\s+(?:vs\.?|versus)\s+([\w\u0600-\u06FF-]{2,30}(?:\s+[\w\u0600-\u06FF-]{1,20}){0,3})/i)
    if (m) { pushComp(m[1], m[2], s); continue }
    if (/\bwhereas\b|\bwhile\b|\bunlike\b|\bin contrast\b|\bcompared (?:to|with)\b/i.test(s) && /\bwhile\b|\bwhereas\b|\bunlike\b/i.test(s)) {
      // capture around whereas/while/unlike (word-boundary start, optional comma)
      m = s.match(/\b([\w\u0600-\u06FF-][\w\u0600-\u06FF\s-]{2,40}?)\s*,?\s+(?:whereas|while|unlike)\s+([\w\u0600-\u06FF-][\w\u0600-\u06FF\s-]{2,40})/i)
      if (m) {
        // label with the nearest noun phrases (last ~3 words before / first ~3 after)
        const aWords = m[1].trim().split(/\s+/)
        let a = aWords.slice(-3).join(' ')
        let b = m[2].trim().split(/\s+/).slice(0, 3).join(' ')
        a = a.replace(/^(and|of|the|a|an|in|at|to)\s+/i, '')
        b = b.replace(/^(a|an|the)\s+/i, '')
        pushComp(a, b, s)
      }
    }
  }

  // ---------- 8. Verbatim vs understand-only ----------
  const verbatim: string[] = []
  const understandOnly: string[] = []
  const seenV = new Set<string>()
  for (const { s } of bodySentences) {
    const wcount = words(s).length
    const isRule = /\b(must|never|always|required?|shall|only| prohibited| prohibited|do not|does not|cannot)\b/i.test(s)
    const isDef = definitions.some((d) => d.text.slice(0, 40) && s.includes(d.text.slice(0, 40)))
    const isNum = /\d/.test(s) && /%|°|hours?|minutes?|days?|mg|kg|times|ppm|\bmust\b/i.test(s)
    if ((isRule || isDef || isNum) && wcount <= 26 && s.length <= 220) {
      const key = s.toLowerCase().slice(0, 60)
      if (!seenV.has(key)) {
        seenV.add(key)
        verbatim.push(s)
      }
    } else if ((wcount >= 26 || /\b(because|therefore|in order to|so that|however|which|whereas)\b/i.test(s)) && wcount >= 12) {
      if (understandOnly.length < 18) understandOnly.push(s)
    }
  }

  // ---------- 9. Topics ----------
  const depth1 = sections.filter((s) => s.depth === 1 && s.title)
  const depth2 = sections.filter((s) => s.depth === 2 && s.title)
  let mainTopics = [...new Set(depth1.map((s) => s.title))]
  if (!mainTopics.length) mainTopics = [...new Set(sections.map((s) => s.title).filter(Boolean))]
  if (!mainTopics.length) mainTopics = keywords(text, 5).map((k) => k.replace(/\b\w/g, (c) => c.toUpperCase()))

  const subtopics: { topic: string; items: string[] }[] = []
  if (depth2.length) {
    const groups = new Map<string, string[]>()
    let cur = depth1[0]?.title || mainTopics[0] || ''
    for (const sec of sections) {
      if (sec.depth === 1 && sec.title) cur = sec.title
      if (sec.depth === 2 && sec.title) {
        if (!groups.has(cur)) groups.set(cur, [])
        groups.get(cur)!.push(sec.title)
      }
    }
    for (const [topic, items] of groups) subtopics.push({ topic, items })
  } else {
    for (const sec of depth1.slice(0, 12)) {
      const items: string[] = []
      const secLists = lists.filter((l) => l.sectionId === sec.id)
      for (const l of secLists) items.push(...l.items.slice(0, 5))
      if (!items.length) items.push(...splitSentences(sec.body).slice(0, 3))
      if (items.length) subtopics.push({ topic: sec.title, items: items.slice(0, 6) })
    }
  }

  // ---------- 10. Exam predictions ----------
  const examHints: ExamHint[] = []
  for (const d of definitions.slice(0, 10)) {
    examHints.push({ id: uid('hint'), text: `Define: ${d.term}`, reason: 'definition' })
  }
  if (steps.length >= 3) {
    examHints.push({ id: uid('hint'), text: `Describe the steps of: ${stepsTitle || mainTopics[0] || 'the process'}`, reason: 'step' })
  }
  for (const n of numbers.slice(0, 6)) {
    examHints.push({ id: uid('hint'), text: `Remember this figure → ${n.value}`, reason: 'number' })
  }
  for (const l of lists.slice(0, 6)) {
    examHints.push({ id: uid('hint'), text: `List: ${l.title} (${l.items.length} items)`, reason: 'list' })
  }
  for (const c of comparisons.slice(0, 4)) {
    examHints.push({ id: uid('hint'), text: `Compare: ${c.a} vs ${c.b}`, reason: 'comparison' })
  }
  for (const t of mainTopics) {
    if (/^[A-Z]{2,8}$/.test(t.replace(/\s/g, ''))) {
      examHints.push({ id: uid('hint'), text: `What does ${t} stand for?`, reason: 'heading' })
    }
  }

  // ---------- 11. Relations ----------
  const keyTerms = [...new Set([...terms.map((t) => t.term), ...mainTopics, ...depth2.map((s) => s.title)])]
    .filter((t) => t && t.length > 2)
    .slice(0, 16)
  const relations: ConceptRelation[] = []
  const relSeen = new Set<string>()
  for (const { s } of bodySentences) {
    const low = s.toLowerCase()
    const present = keyTerms.filter((t) => low.includes(t.toLowerCase()))
    if (present.length >= 2) {
      for (let i = 0; i < present.length - 1; i++) {
        const a = present[i]
        const b = present[i + 1]
        const k = [a.toLowerCase(), b.toLowerCase()].sort().join('|')
        if (!relSeen.has(k) && a.toLowerCase() !== b.toLowerCase()) {
          relSeen.add(k)
          relations.push({ from: a, to: b, evidence: s.slice(0, 180) })
        }
      }
    }
  }

  // ---------- 12. Quality flags ----------
  for (const line of lines) {
    if (!line || line.length < 8) continue
    if (isVerificationLine(line)) flags.push({ text: line.slice(0, 160), kind: 'needs-verification' })
    else if (isUnclearLine(line) && !headingCandidate(line) && !isBullet(line)) flags.push({ text: line.slice(0, 160), kind: 'unclear' })
    if (flags.length > 30) break
  }

  // ---------- 13. Big picture (extractive) ----------
  const bigPicture = extractBigPicture(text, allSentences, SUMMARY_HEAD, mainTopics)

  // ---------- 14. Stats ----------
  const wordCount = words(text).length
  const hasAr = /[\u0600-\u06FF]/.test(text)
  const hasEn = /[A-Za-z]{4,}/.test(text)
  const stats = {
    words: wordCount,
    chars: text.length,
    readMinutes: Math.max(1, Math.round(wordCount / 200)),
    languages: [hasAr && 'Arabic', hasEn && 'English'].filter(Boolean) as string[],
  }

  return {
    bigPicture,
    sections,
    mainTopics: mainTopics.slice(0, 20),
    subtopics: subtopics.slice(0, 20),
    definitions,
    terms,
    lists,
    numbers,
    formulas,
    steps,
    stepsTitle,
    comparisons,
    examHints,
    verbatim: verbatim.slice(0, 20),
    understandOnly,
    relations: relations.slice(0, 25),
    flags,
    stats,
  }
}

function deriveFallbackTitle(p: string): string {
  const first = p.split(/\n/)[0].trim()
  if (first.length <= 70) return first.replace(/[:.]+$/, '')
  return words(first).slice(0, 8).join(' ')
}

function extractBigPicture(
  text: string,
  sentences: string[],
  summaryHead: RegExp,
  _mainTopics: string[],
): string[] {
  if (!sentences.length) return []
  // Prefer explicit summary/overview sections
  const idx = sentences.findIndex((s) => summaryHead.test(s) && s.length < 60)
  if (idx >= 0 && sentences[idx + 1]) {
    return [sentences[idx], sentences[idx + 1]].filter((s) => s.length > 20)
  }
  if (sentences.length <= 3) return sentences.slice(0, 3)

  const freq = termFreq(text)
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([w]) => w)
  const scored = sentences.map((s, i) => {
    const low = ' ' + s.toLowerCase() + ' '
    let score = 0
    for (const t of top) if (low.includes(` ${t}`)) score += freq.get(t) || 1
    score /= Math.sqrt(Math.max(8, words(s).length))
    const pos = i / sentences.length
    if (pos < 0.18) score *= 1.5
    if (pos > 0.9) score *= 1.3
    if (/figure|table|see |refer to|slide \d/i.test(s)) score *= 0.3
    return { s, score, i }
  })
  const picked = scored.sort((a, b) => b.score - a.score).slice(0, Math.min(3, Math.max(2, Math.ceil(sentences.length / 8))))
  picked.sort((a, b) => a.i - b.i)
  const out: string[] = []
  let w = 0
  for (const p of picked) {
    const n = words(p.s).length
    if (w + n > 70 && out.length >= 2) break
    out.push(p.s)
    w += n
  }
  return out
}

/** Level 2: plain-language restatement built ONLY from original wording. */
export function easyExplain(analysis: Analysis): { term: string; plain: string[]; original: string }[] {
  const out: { term: string; plain: string[]; original: string }[] = []
  const defs = analysis.definitions.slice(0, 14)
  for (const d of defs) {
    const plain = simplifySentence(d.text, 15).map((s) => (s.length > 2 ? s[0].toUpperCase() + s.slice(1) : s))
    out.push({ term: d.term, plain, original: d.text })
  }
  if (!out.length) {
    for (const sec of analysis.sections.slice(0, 8)) {
      const s = splitSentences(sec.body)[0]
      if (s) out.push({ term: sec.title || 'Concept', plain: simplifySentence(s, 15), original: s })
    }
  }
  return out
}
