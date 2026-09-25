// Smoke test for core engines — run with:
//   node_modules/.bin/esbuild scripts/smoke.ts --bundle --platform=node --format=cjs --outfile=/tmp/smoke.cjs && node /tmp/smoke.cjs
import { analyze, easyExplain } from '../src/lib/analyze'
import { DEMO_TEXT, DEMO_TITLE } from '../src/lib/demo'
import { generateCards } from '../src/lib/flashcards'
import { generateQuestions, examSet, evaluateAnswer } from '../src/lib/quiz'
import { generateMnemonics } from '../src/lib/mnemonic'
import { recallQuestions, dumpExpected, compareDump } from '../src/lib/recall'
import { applyGrade, dueCards } from '../src/lib/srs'
import { tutorReply } from '../src/lib/tutor'
import type { Flashcard, Lecture } from '../src/types'

let failures = 0
function check(name: string, cond: boolean, extra = '') {
  if (cond) console.log(`  ✅ ${name}${extra ? ' — ' + extra : ''}`)
  else {
    failures++
    console.log(`  ❌ ${name}${extra ? ' — ' + extra : ''}`)
  }
}

console.log('▶ Analyzer')
const a = analyze(DEMO_TEXT)
check('big picture sentences ≥2', a.bigPicture.length >= 2, `${a.bigPicture.length} sentences`)
check('main topics ≥4', a.mainTopics.length >= 4, a.mainTopics.join(' | '))
check('definitions ≥5', a.definitions.length >= 5, a.definitions.map((d) => d.term).slice(0, 6).join(', '))
check('lists ≥1', a.lists.length >= 1, `${a.lists.length} lists`)
const principles = a.lists.find((l) => l.items.length === 7)
check('HACCP 7-principle list found', !!principles)
check('steps (food flow) detected', a.steps.length >= 5, a.steps.map((s) => s.title).join('→'))
check('numbers ≥4', a.numbers.length >= 4, a.numbers.map((n) => n.value).join(', '))
check('comparisons ≥1', a.comparisons.length >= 1, a.comparisons.map((c) => `${c.a} vs ${c.b}`).join(' ; '))
check('verbatim ≥5', a.verbatim.length >= 5)
check('exam hints ≥8', a.examHints.length >= 8, `${a.examHints.length}`)
check('relations ≥1', a.relations.length >= 1)
console.log('    sections:', a.sections.map((s) => s.title).filter(Boolean).join(' | '))

console.log('▶ Level 2 easy explain')
const easy = easyExplain(a)
check('easy explanations ≥4', easy.length >= 4, easy[0]?.plain[0]?.slice(0, 60) || '')

console.log('▶ Mnemonic engine')
const items = principles ? principles.items : []
const opts = generateMnemonics(items, 'HACCP Principles')
check('3–5 options generated', opts.length >= 3 && opts.length <= 5, `${opts.length} options`)
check('first is sentence/acronym', opts[0].kind === 'sentence' || opts[0].kind === 'acronym', opts[0].text)
check('mapping covers all items', opts[0].mapping.length === items.length)
console.log('    sample:', opts[0].text)
if (opts[1]) console.log('    alt   :', opts[1].text)

console.log('▶ Flashcards')
const lec: Lecture = { id: 'l1', title: DEMO_TITLE, rawText: DEMO_TEXT, createdAt: Date.now(), analysis: a }
const cards = generateCards(lec)
check('cards ≥15', cards.length >= 15, `${cards.length} cards`)
check('cards have front/back', cards.every((c) => c.front && c.back))
check('first card due today', cards[0].due <= Date.now() + 1000)

console.log('▶ Quiz engine')
const qs = generateQuestions(lec)
const kinds = new Set(qs.map((q) => q.kind))
check('questions ≥12', qs.length >= 12, `${qs.length} questions`)
check('≥7 question kinds', kinds.size >= 7, [...kinds].join(', '))
const mcq = qs.find((q) => q.kind === 'mcq' && q.options)
if (mcq) {
  check('MCQ has options+answer', !!q_opt(mcq.options!), mcq.answer)
}
function q_opt(opts: string[]) {
  return opts.length >= 2 && opts.every((o) => typeof o === 'string')
}
const textQ = qs.find((q) => q.kind === 'definition' || q.kind === 'list')
if (textQ) {
  const ev = evaluateAnswer(textQ, textQ.answer)
  check('evaluate correct answer → 1', ev.score === 1, `${textQ.kind}: ${ev.status}`)
  const ev2 = evaluateAnswer(textQ, 'random unrelated gibberish')
  check('evaluate wrong answer → low', ev2.score < 1)
}
const ex = examSet(qs, 10)
check('exam set ≤10 unique', ex.length >= 6 && new Set(ex.map((q) => q.id)).size === ex.length, `${ex.length} qs`)

console.log('▶ Active recall')
const rq = recallQuestions(lec)
check('recall queue ≥5', rq.length >= 5, `${rq.length} questions`)
const dump = dumpExpected(lec)
check('dump expected ≥6', dump.length >= 6, `${dump.length} atoms`)
const cmp1 = compareDump('Hazard analysis CCP critical limits monitoring 5°C corrective actions verification records', dump)
check('good dump scores high', cmp1.coverage >= 0.5, `${Math.round(cmp1.coverage * 100)}%`)
const cmp2 = compareDump('nothing here', dump)
check('empty dump scores 0', cmp2.coverage === 0, `${Math.round(cmp2.coverage * 100)}%`)

console.log('▶ SRS')
const card: Flashcard = cards[0]
const green = applyGrade(card, 'green')
const red = applyGrade(card, 'red')
check('green advances interval', green.intervalIndex > card.intervalIndex, `idx ${card.intervalIndex}→${green.intervalIndex}`)
check('red resets interval', red.intervalIndex === 0 && red.due <= Date.now() + 5000)
check('due cards includes fresh card', dueCards([card]).length === 1)

console.log('▶ Tutor')
const t1 = tutorReply('test me', lec)
check('test me → question', !!t1.question || /question/i.test(t1.text))
const t2 = tutorReply('make a mnemonic', lec)
check('mnemonic reply shows original', /Original Information/i.test(t2.text))
const t3 = tutorReply('what is quantum blockchain farming?', lec)
check('unknown → NEEDS VERIFICATION', /NEEDS VERIFICATION/i.test(t3.text))
const t4 = tutorReply('explain like a beginner', lec)
check('beginner → grounded answer', t4.text.length > 40 && !/NEEDS VERIFICATION/.test(t4.text))
const t5 = tutorReply('Give me a 5-minute review', lec)
check('5-min review reply', /5-MINUTE REVIEW/i.test(t5.text))

console.log('')
if (failures) {
  console.log(`❌ ${failures} check(s) failed`)
  process.exit(1)
} else console.log('🎉 ALL SMOKE TESTS PASSED')
