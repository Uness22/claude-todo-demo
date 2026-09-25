// ============================================================
// tutor.ts — AI Tutor (offline, lecture-grounded)
// Understands common student intents (EN + AR) and answers
// ONLY from the current lecture's extracted knowledge.
// If the answer is not in the lecture → says so (NEEDS VERIFICATION).
// ============================================================

import type { Lecture, Question } from '../types'
import { generateQuestions } from './quiz'
import { generateMnemonics, mnemonicKindLabel } from './mnemonic'
import { keywords, splitSentences, truncate } from './text'

export interface TutorReply {
  text: string
  /** Optional interactive element the UI can render */
  question?: Question
}

interface Intent {
  id: string
  patterns: RegExp[]
}

const INTENTS: Intent[] = [
  { id: 'beginner', patterns: [/explain.*(like|beginner|simple)/i, /what is/i, /bigger picture/i, /اشرح.*(مبسط|بسيط|مبسّط|ببساطة)/i, /^اشرح/i, /ما هو/i, /شو هو/i] },
  { id: 'example', patterns: [/give (me )?(an )?example/i, /example please/i, /for example/i, /مثال/i, /امثلة/i, /وضّح.*(بمثال)/i] },
  { id: 'mnemonic', patterns: [/mnemonic/i, /memory (sentence|trick|hook)/i, /memorize/i, /remember (this|it)/i, /جملة تذك/i, /أداة حفظ/i, /ادوات حفظ/i, /كيف.*أحفظ/i, /سهل.*حفظ/i] },
  { id: 'test', patterns: [/test me/i, /quiz me/i, /ask me/i, /question me/i, /اختبرني/i, /اسألني/i, /سؤال.*لي/i, /امتحنني/i] },
  { id: 'hide_answer', patterns: [/(do ?n.?t|don't|without|no)\s+(show|give).*(answer)/i, /لا تظهر.*(إجابة)/i, /بدون إجابة/i] },
  { id: 'why_wrong', patterns: [/why.*(my answer|wrong|incorrect)/i, /لماذا.*إجابتي/i, /غلط في اين/i, /ليش غلط/i] },
  { id: 'harder', patterns: [/harder/i, /more difficult/i, /tougher/i, /اسألني.*(صعب|اصعب)/i, /أصعب/i, /صعب/i] },
  { id: 'easier', patterns: [/easier/i, /simpler/i, /make.*easier/i, /أسهل/i, /امثل/i, /سهّل/i, /سهل/i] },
  { id: 'review5', patterns: [/5.?minute review/i, /five minute/i, /quick review/i, /مراجعة 5/i, /مراجعة سريعة/i] },
  { id: 'flashcards', patterns: [/flash ?cards?/i, /turn .* into/i, /بطاقات/i] },
  { id: 'hard_rules', patterns: [/hard rule/i] },
]

function detectIntent(msg: string): string | null {
  for (const it of INTENTS) {
    if (it.patterns.some((p) => p.test(msg))) return it.id
  }
  return null
}

/** Search the lecture for content about a phrase. */
function searchLecture(lecture: Lecture, phrase: string): { sentences: string[]; hasTerm: boolean } {
  const a = lecture.analysis
  const clean = phrase
    .replace(/^(what is|what are|define|explain|tell me about|ما هو|ما هي|اشرح|عرّف|عرف|وضّح)\s+/i, '')
    .replace(/[?.!،؟]+$/, '')
    .trim()
  if (!clean) return { sentences: [], hasTerm: false }
  const def = a.definitions.find((d) => d.term.toLowerCase().includes(clean.toLowerCase()) || clean.toLowerCase().includes(d.term.toLowerCase()))
  if (def) return { sentences: [`${def.term}: ${def.text}`], hasTerm: true }

  const low = clean.toLowerCase()
  const hits: string[] = []
  for (const sec of a.sections) {
    for (const s of splitSentences(sec.body)) {
      if (s.toLowerCase().includes(low)) hits.push(s)
      if (hits.length >= 4) break
    }
    if (hits.length >= 4) break
  }
  if (hits.length) {
    return { sentences: hits.slice(0, 3), hasTerm: true }
  }
  return { sentences: [], hasTerm: false }
}

function topKnowledge(lecture: Lecture, n = 6): string[] {
  const a = lecture.analysis
  const lines: string[] = []
  for (const bp of a.bigPicture.slice(0, 2)) lines.push(`• ${bp}`)
  for (const d of a.definitions.slice(0, 3)) lines.push(`• ${d.term} — ${truncate(d.text, 110)}`)
  if (a.steps.length >= 3) lines.push(`• Order: ${a.steps.map((s) => s.title.replace(/^\d+\.\s*/, '')).join(' → ')}`)
  for (const l of a.lists.slice(0, 1)) lines.push(`• ${l.title}: ${l.items.slice(0, 6).join(', ')}`)
  for (const num of a.numbers.slice(0, 2)) lines.push(`• Key figure: ${num.value}`)
  return lines.slice(0, n)
}

export function tutorReply(msg: string, lecture: Lecture, opts: { hideAnswers?: boolean } = {}): TutorReply {
  const a = lecture.analysis
  const intent = detectIntent(msg) || 'search'

  switch (intent) {
    case 'beginner': {
      const res = searchLecture(lecture, msg)
      if (res.hasTerm) {
        const body = res.sentences.map((s) => `• ${s}`).join('\n')
        const term = a.terms.find((t) => body.includes(t.term))
        const ar = term?.arabic ? `\n\nببساطة (عربي): ${term.arabic}` : ''
        return {
          text: `📘 ${lecture.title} — simple version:\n${body}${ar}\n\n(Based only on this lecture.)`,
        }
      }
      // generic asks (about the lecture itself) → big picture; specific unknown topic → flag it
      const stripped = msg.replace(/^(what is|what are|explain|tell me about|show me)\s*/i, '')
      const generic = /\b(lecture|this|big picture|about|it|beginner|simple|simpler|easy|basics?)\b/i.test(stripped)
      if (generic) {
        return {
          text: `The big picture of this lecture:\n${a.bigPicture.map((s) => `• ${s}`).join('\n') || '• ' + lecture.title}\n\nAsk about any specific term and I will explain it from the lecture.`,
        }
      }
      return {
        text: `I could not find “${truncate(msg, 80)}” in this lecture.\n\n⚠️ NEEDS VERIFICATION — I never invent information. Try different wording, or check the textbook / professor for this point.`,
      }
    }

    case 'example': {
      const res = searchLecture(lecture, msg.replace(/example/i, '').trim() || lecture.title)
      const exampleSentence = a.sections
        .flatMap((s) => splitSentences(s.body))
        .find((s) => /\b(for example|for instance|e\.g\.?)\b/i.test(s))
      if (res.hasTerm && res.sentences.length) {
        return { text: `🔎 From the lecture:\n${res.sentences.map((s) => `• ${s}`).join('\n')}` }
      }
      if (exampleSentence) return { text: `🔎 The lecture itself gives this example:\n“${exampleSentence}”` }
      return { text: `I could not find an explicit example in this lecture.\nNEEDS VERIFICATION — check the textbook or ask the professor for an example of “${msg.replace(/.*example\s*(of)?/i, '').trim() || lecture.title}”.` }
    }

    case 'mnemonic': {
      const list = a.lists.find((l) => l.items.length >= 3 && l.items.length <= 10) || (a.steps.length >= 3 ? { items: a.steps.map((s) => s.title), title: a.stepsTitle || 'process' } : null)
      if (!list) return { text: 'No suitable list found in this lecture for a mnemonic. Try a lecture with steps or lists.' }
      const items = (list as { items: string[]; title?: string }).items.slice(0, 8)
      const opts2 = generateMnemonics(items, (list as { title?: string }).title || '')
      if (!opts2.length) return { text: 'Could not build a mnemonic for this content.' }
      const best = opts2[0]
      const mapping = best.mapping.map((m) => `${m.letter} → ${m.item}`).join('\n')
      return {
        text:
          `🧠 Memory trick (${mnemonicKindLabel(best.kind)}):\n“${best.text}”\n\n` +
          `Original Information (unchanged):\n${items.map((it, i) => `${i + 1}. ${it}`).join('\n')}\n\n` +
          `Meaning (mapping):\n${mapping}\n\nThe mnemonic is only a hook — the original list stays the truth.`,
      }
    }

    case 'test':
    case 'harder':
    case 'easier': {
      const bank = generateQuestions(lecture)
      const pool = bank.filter((q) => (intent === 'harder' ? q.difficulty === 'hard' : intent === 'easier' ? q.difficulty === 'easy' : true))
      const pick = (pool.length ? pool : bank)[Math.floor(Math.random() * (pool.length || bank.length))]
      if (!pick) return { text: 'No questions could be built yet — analyze the lecture first.' }
      const hide = opts.hideAnswers || intent === 'test'
      const preface =
        intent === 'harder' ? '🔥 Harder question:' : intent === 'easier' ? '🌱 Easier question:' : '🎯 Question for you:'
      const body = pick.options
        ? `${pick.prompt}\n\n${pick.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n')}`
        : pick.prompt
      return {
        text: `${preface}\n${body}\n\nAnswer FIRST in your head. ${hide ? "I won't show the answer yet — say “show answer” when you're done." : ''}`,
        question: pick,
      }
    }

    case 'hide_answer':
      return { text: '✅ Understood — I will not reveal answers. Ask me “test me” and self-check only after you answer.' }

    case 'why_wrong':
      return {
        text:
          'To explain why an answer is wrong, send me:\n1) the question, and\n2) your answer.\n\nMeanwhile, remember the 3-step check:\n• Did I use the exact term from the lecture?\n• Did I include the key number / step / condition?\n• Did I reverse cause ↔ effect?\n\nI compare only against this lecture — if the lecture doesn’t cover it: NEEDS VERIFICATION.',
      }

    case 'review5': {
      return {
        text: `⏱ 5-MINUTE REVIEW — ${lecture.title}\n\n${topKnowledge(lecture, 8).join('\n')}\n\n👉 Open “Rapid Review” for the timed version.`,
      }
    }

    case 'flashcards': {
      const defs = a.definitions.slice(0, 3)
      if (!defs.length) return { text: 'No definitions detected to convert into flashcards. Open the Flashcards tab to see what was generated.' }
      return {
        text: `🃏 From this lecture I would make:\n${defs.map((d) => `• Q: What is ${d.term}?\n  A: ${truncate(d.text, 100)}`).join('\n')}\n\nOpen the Flashcards tab — the full deck was already generated from your lecture.`,
      }
    }

    default: {
      // keyword search fallback
      const res = searchLecture(lecture, msg)
      if (res.hasTerm) {
        return { text: `🔎 Found in this lecture:\n${res.sentences.map((s) => `• ${s}`).join('\n')}\n\n(Answers are based only on this lecture.)` }
      }
      const kw = keywords(msg, 3).filter((k) => k.length > 3)
      if (kw.length) {
        const again = searchLecture(lecture, kw.join(' '))
        if (again.hasTerm) return { text: `🔎 Found in this lecture:\n${again.sentences.map((s) => `• ${s}`).join('\n')}` }
      }
      return {
        text: `I could not find “${truncate(msg, 80)}” in this lecture.\n\n⚠️ NEEDS VERIFICATION — I never invent information. Try different wording, or check the textbook / professor for this point.`,
      }
    }
  }
}

export const TUTOR_SUGGESTIONS: { en: string; ar: string }[] = [
  { en: "Explain this like I'm a beginner", ar: 'اشرحها كأنني مبتدئ' },
  { en: 'Give me an example', ar: 'أعطِني مثالًا' },
  { en: 'Make a mnemonic', ar: 'اصنع جملة تذكّر' },
  { en: 'Test me', ar: 'اختبرني' },
  { en: "Don't show the answer", ar: 'لا تظهر الإجابة' },
  { en: 'Ask me a harder question', ar: 'اسألني سؤالًا أصعب' },
  { en: 'Give me a 5-minute review', ar: 'أعطِني مراجعة 5 دقائق' },
  { en: 'Turn this lecture into flashcards', ar: 'حوّل المحاضرة إلى بطاقات' },
  { en: 'Make this easier to memorize', ar: 'سهّل هذا الحفظ' },
  { en: 'Explain why my answer is wrong', ar: 'لماذا كانت إجابتي خاطئة؟' },
]
