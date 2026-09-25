import { useMemo, useState } from 'react'
import type { Route } from '../../App'
import { useStore } from '../../store'
import { tr } from '../../i18n'
import { Pill, T } from '../../components/ui'
import { topicMasteryList, topicStatsFor } from '../../lib/mastery'
import OverviewTab from './tabs/OverviewTab'
import LevelsTab from './tabs/LevelsTab'
import MnemonicsTab from './tabs/MnemonicsTab'
import CardsTab from './tabs/CardsTab'
import RecallTab from './tabs/RecallTab'
import QuizTab from './tabs/QuizTab'
import ExamTab from './tabs/ExamTab'
import SheetTab from './tabs/SheetTab'
import TutorTab from './tabs/TutorTab'

const TABS = [
  { id: 'overview', label: 'overview', ico: '🏠' },
  { id: 'levels', label: 'levels', ico: '🪜' },
  { id: 'mnemonics', label: 'mnemonics', ico: '🧠' },
  { id: 'cards', label: 'flashcards', ico: '🃏' },
  { id: 'recall', label: 'activeRecall', ico: '💭' },
  { id: 'quiz', label: 'quiz', ico: '❓' },
  { id: 'exam', label: 'examMode', ico: '🎯' },
  { id: 'sheet', label: 'cheatSheet', ico: '📋' },
  { id: 'tutor', label: 'tutor', ico: '🎓' },
]

export default function LectureView({ id, tab, go }: { id: string; tab: string; go: (r: Route) => void }) {
  const { state, setExamDate } = useStore()
  const lang = state.settings.lang
  const lecture = state.lectures.find((l) => l.id === id)
  const [active, setActive] = useState(tab || 'overview')

  const mastery = useMemo(() => {
    if (!lecture) return 0
    const st = topicStatsFor(lecture.id, state.attempts, state.recalls, state.cards)
    const list = topicMasteryList(st)
    if (!list.length) return 0
    const c = list.reduce((a, t) => a + (t.pct * t.total) / 100, 0)
    const n = list.reduce((a, t) => a + t.total, 0)
    return n ? Math.round((c / n) * 100) : 0
  }, [lecture, state.attempts, state.recalls, state.cards])

  if (!lecture) {
    return (
      <div className="empty">
        <div className="ico">🔍</div>
        Lecture not found.
        <div style={{ marginTop: 12 }}>
          <button className="btn" onClick={() => go({ name: 'dash' })}>
            <T k="backToDash" />
          </button>
        </div>
      </div>
    )
  }

  const a = lecture.analysis

  return (
    <div>
      <div className="row between no-print" style={{ marginBottom: 12 }}>
        <button className="btn small ghost" onClick={() => go({ name: 'dash' })}>
          ← <T k="backToDash" />
        </button>
        <div className="row" style={{ gap: 6 }}>
          <Pill>
            {a.stats.words} {tr('words', lang)}
          </Pill>
          <Pill>
            ⏳ {a.stats.readMinutes} {tr('readMin', lang)}
          </Pill>
          <Pill kind={mastery >= 85 ? 'success' : mastery >= 60 ? 'primary' : 'danger'}>
            <T k="mastery" /> {mastery}%
          </Pill>
        </div>
      </div>

      <h1 style={{ marginBottom: 4 }}>{lecture.title}</h1>
      <div className="row no-print" style={{ marginBottom: 6 }}>
        <span className="muted small-txt">
          <T k="setExamDate" />:
        </span>
        <input
          type="date"
          className="input"
          style={{ width: 180, padding: '7px 10px', minHeight: 38 }}
          value={lecture.examDate ? new Date(lecture.examDate).toISOString().slice(0, 10) : ''}
          onChange={(e) => setExamDate(lecture.id, e.target.value ? new Date(e.target.value + 'T23:59:00').getTime() : undefined)}
        />
      </div>

      <div className="tabs no-print">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${active === t.id ? 'active' : ''}`} onClick={() => setActive(t.id)}>
            {t.ico} <T k={t.label} />
          </button>
        ))}
      </div>

      {active === 'overview' && <OverviewTab lecture={lecture} go={go} onTab={setActive} />}
      {active === 'levels' && <LevelsTab lecture={lecture} />}
      {active === 'mnemonics' && <MnemonicsTab lecture={lecture} />}
      {active === 'cards' && <CardsTab lecture={lecture} />}
      {active === 'recall' && <RecallTab lecture={lecture} />}
      {active === 'quiz' && <QuizTab lecture={lecture} />}
      {active === 'exam' && <ExamTab lecture={lecture} />}
      {active === 'sheet' && <SheetTab lecture={lecture} />}
      {active === 'tutor' && <TutorTab lecture={lecture} />}
    </div>
  )
}
