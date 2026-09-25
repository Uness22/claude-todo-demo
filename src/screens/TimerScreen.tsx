import { useEffect, useState } from 'react'
import type { Route } from '../App'
import { useStore } from '../store'
import { tr } from '../i18n'
import { Card, CardTitle, Pill, Progress, T, fmtTime } from '../components/ui'

const MIN = 60_000
const STUDY_MS = 90 * MIN
const BREAK_MS = 20 * MIN
const CYCLE_MS = STUDY_MS + BREAK_MS

const PHASES: { name: string; from: number; to: number; hint: string }[] = [
  { name: 'Preview', from: 0, to: 10, hint: 'Scan headings, lists, diagrams — get the map' },
  { name: 'Understand', from: 10, to: 30, hint: 'Read for meaning — explain it simply' },
  { name: 'Simplify', from: 30, to: 50, hint: 'Turn content into notes & mnemonics' },
  { name: 'Active Recall', from: 50, to: 70, hint: 'Close everything — retrieve from memory' },
  { name: 'Practice Questions', from: 70, to: 85, hint: 'Quiz / flashcards under pressure' },
  { name: 'Rapid Review', from: 85, to: 90, hint: '1-page cheat sheet pass' },
  { name: 'Break', from: 90, to: 110, hint: 'Stand up, water, eyes off screens' },
]

export default function TimerScreen({ go }: { go: (r: Route) => void }) {
  const { state, set, logExtra } = useStore()
  const lang = state.settings.lang
  const t = state.timer
  const [now, setNow] = useState(Date.now())

  // tick
  useEffect(() => {
    if (!t.running) return
    const iv = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(iv)
  }, [t.running])

  const elapsed = t.running ? now - (t.cycleStart || now) : t.pausedAt || 0
  const cycleIdx = Math.floor(elapsed / CYCLE_MS)
  const within = elapsed % CYCLE_MS

  // auto-log sessions: 90 study minutes on break entry, 20 break minutes on cycle wrap
  useEffect(() => {
    if (!t.running) return
    if (within >= STUDY_MS && t.loggedCycle < cycleIdx + 1) {
      set((s) => ({ ...s, timer: { ...s.timer, loggedCycle: cycleIdx + 1 } }))
      logExtra({ minutes: 90 })
    }
    if (cycleIdx > t.cyclesDone) {
      set((s) => ({ ...s, timer: { ...s.timer, cyclesDone: cycleIdx } }))
      logExtra({ breakMinutes: 20 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [within >= STUDY_MS, cycleIdx, t.running])

  const inBreak = within >= STUDY_MS
  const phase = PHASES.find((p) => within >= p.from * MIN && within < p.to * MIN) || PHASES[PHASES.length - 1]
  const phaseLeft = phase.to * MIN - within
  const blockLeft = (inBreak ? CYCLE_MS : STUDY_MS) - within

  function start() {
    set((s) => ({ ...s, timer: { ...s.timer, cycleStart: Date.now(), pausedAt: null, running: true, loggedCycle: s.timer.cyclesDone } }))
  }
  function pause() {
    set((s) => ({ ...s, timer: { ...s.timer, pausedAt: elapsed, running: false } }))
  }
  function resume() {
    set((s) => ({ ...s, timer: { ...s.timer, cycleStart: Date.now() - (s.timer.pausedAt || 0), pausedAt: null, running: true } }))
  }
  function reset() {
    set((s) => ({ ...s, timer: { cycleStart: null, pausedAt: null, running: false, cyclesDone: 0, loggedCycle: 0 } }))
  }

  const sessionDone = t.cyclesDone > 0

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="row between">
        <h1 style={{ margin: 0 }}>
          ⏱ <T k="timer" />
        </h1>
        <Pill kind={t.running ? 'primary' : ''}>
          {t.running ? (lang === 'ar' ? 'يعمل' : 'RUNNING') : elapsed > 0 ? (lang === 'ar' ? 'متوقف' : 'PAUSED') : (lang === 'ar' ? 'جاهز' : 'READY')}
        </Pill>
      </div>

      <Card style={{ marginTop: 14 }}>
        {inBreak ? <div className="break-banner">🌴 {tr('breakPhase', lang)} — {fmtTime(phaseLeft)} left</div> : null}
        {!inBreak && t.running ? (
          <div className="hint" style={{ marginBottom: 10 }}>
            🎯 {tr('studying', lang)} — {tr('phase', lang)}: <b>{phase.name}</b> · {tr('endsIn', lang)} {fmtTime(phaseLeft)}
          </div>
        ) : null}
        {sessionDone && !t.running && within === 0 && elapsed === 0 ? (
          <div className="hint" style={{ marginBottom: 10 }}>
            ✅ {t.cyclesDone} × {tr('cyclesDone', lang)}
          </div>
        ) : null}

        <div className="timer-wrap">
          <div className="timer-phase">{inBreak ? `🌴 ${tr('onBreak', lang)}` : `${tr('phase', lang)}: ${phase.name}`}</div>
          <div className="timer-clock" style={{ color: inBreak ? 'var(--accent)' : 'var(--primary)' }}>
            {fmtTime(phaseLeft)}
          </div>
          <div className="timer-sub">
            {inBreak ? (lang === 'ar' ? 'الجلسة التالية تبدأ تلقائيًا' : 'Next 90-min session starts automatically') : `${tr('endsIn', lang)} ${fmtTime(blockLeft)} ${lang === 'ar' ? 'من جلسة الدراسة' : 'of study block'}`}
          </div>
          <div className="timer-sub">
            💪 {t.cyclesDone} {tr('cyclesDone', lang)}
          </div>

          <div className="row" style={{ justifyContent: 'center', marginTop: 18 }}>
            {!t.running && elapsed === 0 ? (
              <button className="btn primary big" onClick={start}>
                ▶ {lang === 'ar' ? 'ابدأ جلسة 90/20' : 'Start 90/20 session'}
              </button>
            ) : !t.running ? (
              <>
                <button className="btn primary big" onClick={resume}>
                  ▶ {tr('resume', lang)}
                </button>
                <button className="btn ghost" onClick={reset}>
                  ↺ {tr('reset', lang)}
                </button>
              </>
            ) : (
              <>
                <button className="btn big" onClick={pause}>
                  ⏸ {tr('pause', lang)}
                </button>
                <button className="btn ghost" onClick={reset}>
                  ↺ {tr('reset', lang)}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="row" style={{ marginTop: 8, justifyContent: 'center' }}>
          <div style={{ flex: 1, maxWidth: 420 }}>
            <Progress pct={(within / CYCLE_MS) * 100} thin />
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle title={<T k="phases" />} sub="90 minutes study + 20 minutes break, then repeat" />
        <div className="phase-list">
          {PHASES.map((p) => {
            const isActive = phase === p
            const isDone = within >= p.to * MIN || (inBreak && p.from < 90)
            return (
              <div key={p.name} className={`phase-item ${isActive ? 'active' : ''} ${isDone && !isActive ? 'done' : ''}`}>
                <span>
                  {p.from}–{p.to} min · {p.name}
                  <div className="muted" style={{ fontSize: '0.78rem', fontWeight: 500 }}>
                    {p.hint}
                  </div>
                </span>
                <span className="t">{isActive ? fmtTime(phaseLeft) : `${p.to - p.from}m`}</span>
              </div>
            )
          })}
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn small" onClick={() => go({ name: 'reviews' })}>
            🔁 {tr('reviews', lang)}
          </button>
          <button className="btn small" onClick={() => go({ name: 'dash' })}>
            📚 {tr('lectures', lang)}
          </button>
        </div>
      </Card>
    </div>
  )
}
