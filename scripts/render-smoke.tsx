// Render smoke test — SSR-renders every screen and lecture tab.
//   node_modules/.bin/rolldown scripts/render-smoke.tsx --file /tmp/render.cjs --format=cjs --platform=node
//   node /tmp/render.cjs
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { analyze } from '../src/lib/analyze'
import { DEMO_TEXT, DEMO_TITLE } from '../src/lib/demo'
import { generateCards } from '../src/lib/flashcards'
import type { AppState, Lecture, QuizAttempt } from '../src/types'
import { uid } from '../src/types'

// ---- browser globals mocked for SSR ----
const storage = new Map<string, string>()
;(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k) => storage.get(k) ?? null,
  setItem: (k, v) => void storage.set(k, v),
  removeItem: (k) => void storage.delete(k),
  clear: () => storage.clear(),
  key: () => null,
  get length() {
    return storage.size
  },
}
;(globalThis as unknown as { window: unknown }).window = {
  setTimeout: setTimeout.bind(globalThis),
  clearTimeout: clearTimeout.bind(globalThis),
  setInterval: () => 0,
  clearInterval: () => undefined,
  scrollTo: () => undefined,
  confirm: () => false,
  print: () => undefined,
}

async function main() {
  const { StoreProvider } = await import('../src/store')
  const App = (await import('../src/App')).default
  const LectureView = (await import('../src/screens/lecture/LectureView')).default
  const Dashboard = (await import('../src/screens/Dashboard')).default
  const Upload = (await import('../src/screens/Upload')).default
  const Reviews = (await import('../src/screens/Reviews')).default
  const ProgressScreen = (await import('../src/screens/ProgressScreen')).default
  const TimerScreen = (await import('../src/screens/TimerScreen')).default
  const SettingsScreen = (await import('../src/screens/SettingsScreen')).default

  // seed state with a analyzed demo lecture + performance data
  const analysis = analyze(DEMO_TEXT)
  const lecture: Lecture = {
    id: 'lec_demo',
    title: DEMO_TITLE,
    rawText: DEMO_TEXT,
    createdAt: Date.now(),
    examDate: Date.now() + 12 * 86400000,
    analysis,
    customMnemonic: 'HOT Chickens Can Make Crispy Very Delicious Records',
  }
  const cards = generateCards(lecture).slice(0, 8)
  const attempt: QuizAttempt = {
    id: uid('att'),
    lectureId: lecture.id,
    at: Date.now(),
    mode: 'quiz',
    correct: 7,
    total: 10,
    perTopic: { 'HACCP Principles': { correct: 4, total: 5 }, Microbiology: { correct: 3, total: 5 } },
    wrongQuestionIds: [],
  }
  const seed: AppState = {
    settings: { lang: 'bi', theme: 'dark', dailyGoalMinutes: 90, userName: 'Sara' },
    lectures: [lecture],
    cards,
    attempts: [attempt],
    recalls: [{ lectureId: lecture.id, question: 'What is a CCP?', grade: 'yellow', at: Date.now() }],
    logs: {},
    streak: { current: 3, longest: 9, lastDay: null },
    tutorChats: {},
    timer: { cycleStart: null, pausedAt: null, running: false, cyclesDone: 0, loggedCycle: 0 },
  }
  storage.set('studyflow.v1', JSON.stringify(seed))

  let fail = 0
  const ok = (name: string, html: string) => {
    if (html && html.length > 200) console.log(`  ✅ ${name} (${html.length} chars)`)
    else {
      fail++
      console.log(`  ❌ ${name} — empty render`)
    }
  }
  const crash = (name: string, fn: () => string) => {
    try {
      ok(name, fn())
    } catch (e) {
      fail++
      console.log(`  ❌ ${name} — ${(e as Error).message}`)
    }
  }

  const go = () => undefined

  console.log('▶ Screens')
  crash('App', () => renderToString(createElement(App)))
  crash('Dashboard', () => renderToString(createElement(StoreProvider, null, createElement(Dashboard, { go }))))
  crash('Upload', () => renderToString(createElement(StoreProvider, null, createElement(Upload, { go }))))
  crash('Reviews', () => renderToString(createElement(StoreProvider, null, createElement(Reviews, { go }))))
  crash('Progress', () => renderToString(createElement(StoreProvider, null, createElement(ProgressScreen, { go }))))
  crash('Timer', () => renderToString(createElement(StoreProvider, null, createElement(TimerScreen, { go }))))
  crash('Settings', () => renderToString(createElement(StoreProvider, null, createElement(SettingsScreen))))

  console.log('▶ Lecture tabs')
  for (const tab of ['overview', 'levels', 'mnemonics', 'cards', 'recall', 'quiz', 'exam', 'sheet', 'tutor']) {
    crash(`tab:${tab}`, () =>
      renderToString(
        createElement(StoreProvider, null, createElement(LectureView, { id: 'lec_demo', tab, go })),
      ),
    )
  }

  // Arabic theme + RTL variant
  const arSeed = { ...seed, settings: { ...seed.settings, lang: 'ar' as const } }
  storage.set('studyflow.v1', JSON.stringify(arSeed))
  console.log('▶ Arabic UI')
  crash('App(ar)', () => renderToString(createElement(App)))

  console.log('')
  if (fail) {
    console.log(`❌ ${fail} render failure(s)`)
    process.exit(1)
  }
  console.log('🎉 ALL RENDER TESTS PASSED')
}

main().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
