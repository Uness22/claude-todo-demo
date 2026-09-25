import { useMemo, useState } from 'react'
import type { Route } from '../App'
import { useStore } from '../store'
import { tr } from '../i18n'
import { Bar, Card, CardTitle, Empty, Pill, Progress, Stat, T, fmtDate } from '../components/ui'
import { avgMastery, classifyTopics, daysUntilExam, dueCount, todayLog, topicMasteryList, topicStatsFor } from '../lib/mastery'
import { formatWhen, lectureCardStats } from '../lib/srs'

export default function Dashboard({ go }: { go: (r: Route) => void }) {
  const { state, setExamDate, deleteLecture } = useStore()
  const lang = state.settings.lang
  const log = todayLog(state.logs)
  const mastery = avgMastery(state)
  const due = dueCount(state)
  const exam = daysUntilExam(state)
  const [examFor, setExamFor] = useState<string>('')

  const allTopics = useMemo(() => {
    const merged: Record<string, { correct: number; total: number }> = {}
    for (const lec of state.lectures) {
      const st = topicStatsFor(lec.id, state.attempts, state.recalls, state.cards)
      for (const [t, v] of Object.entries(st)) {
        if (!merged[t]) merged[t] = { correct: 0, total: 0 }
        merged[t].correct += v.correct
        merged[t].total += v.total
      }
    }
    return topicMasteryList(merged)
  }, [state])
  const { weak, strong } = classifyTopics(allTopics)

  const goalPct = Math.min(100, Math.round((log.minutes / Math.max(1, state.settings.dailyGoalMinutes)) * 100))

  return (
    <div>
      <div className="row between" style={{ marginBottom: 18 }}>
        <div>
          <h1>
            {state.settings.userName ? `${greeting()}, ${state.settings.userName}` : greeting()} 👋
          </h1>
          <div className="muted">
            <T k="tagline" />
          </div>
        </div>
        <button className="btn primary big" onClick={() => go({ name: 'upload' })}>
          <T k="upload" />
        </button>
      </div>

      {/* Today + progress */}
      <div className="grid cols-4" style={{ marginBottom: 14 }}>
        <div className="card stat">
          <div className="k">
            <T k="todayStudy" />
          </div>
          <div className="v">{log.minutes}m</div>
          <div className="sub">
            📖 {log.lectures} <T k="todayLectures" /> · 🃏 {log.cards} <T k="todayCards" /> · ❓ {log.questions} <T k="todayQuestions" />
          </div>
          <div style={{ marginTop: 6 }}>
            <Progress pct={goalPct} thin />
            <small>
              {goalPct >= 100 ? `✅ ${tr('goalReached', lang)}` : `${goalPct}% ${tr('dailyGoal', lang)}`}
            </small>
          </div>
        </div>
        <Stat v={`${mastery}%`} k={<T k="overallMastery" />} sub={state.lectures.length ? `${state.lectures.length} ${tr('lectures', lang)}` : '—'} />
        <div className="card stat clickable" style={{ cursor: due ? 'pointer' : 'default' }} onClick={() => due && go({ name: 'reviews' })}>
          <div className="k">
            <T k="dueReviews" />
          </div>
          <div className="v">{due}</div>
          <div className="sub">{due ? `🔁 ${tr('startReviews', lang)}` : `✅ ${tr('noReviews', lang)}`}</div>
        </div>
        <div className="card stat">
          <div className="k">
            <T k="streak" />
          </div>
          <div className="v">🔥 {state.streak.current}</div>
          <div className="sub">Best {state.streak.longest} {tr('days', lang)}</div>
        </div>
      </div>

      {/* Exam countdown + plan */}
      <div className="grid cols-2" style={{ marginBottom: 14 }}>
        <Card>
          <CardTitle
            title={<T k="examCountdown" />}
            right={exam ? <Pill kind="warn">🗓 {fmtDate(exam.lecture.examDate!)}</Pill> : <Pill>—</Pill>}
          />
          {exam ? (
            <div className="countdown">
              <span className="n">{exam.days}</span>
              <span className="muted">
                <T k="daysLeft" /> — {exam.lecture.title}
              </span>
            </div>
          ) : (
            <div className="col">
              <div className="muted small-txt">
                <T k="setExamDate" />
              </div>
              <div className="row">
                <select className="input" style={{ maxWidth: 260 }} value={examFor} onChange={(e) => setExamFor(e.target.value)}>
                  <option value="">—</option>
                  {state.lectures.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  className="input"
                  style={{ maxWidth: 190 }}
                  disabled={!examFor}
                  onChange={(e) => {
                    if (examFor && e.target.value) {
                      const ts = new Date(e.target.value + 'T23:59:00').getTime()
                      setExamDate(examFor, ts)
                    }
                  }}
                />
              </div>
            </div>
          )}
        </Card>
        <Card>
          <CardTitle title={<T k="weakTopics" />} sub={<T k="studyPlan" />} />
          {weak.length ? (
            <div className="col">
              {weak.slice(0, 4).map((t) => (
                <Bar key={t.topic} pct={t.pct} label={t.topic} />
              ))}
            </div>
          ) : strong.length ? (
            <div className="row">
              <Pill kind="success">💪 {strong.slice(0, 3).map((t) => t.topic).join(' · ') || '—'}</Pill>
            </div>
          ) : (
            <div className="muted small-txt">Take a quiz to reveal weak topics.</div>
          )}
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn small" onClick={() => go({ name: 'progress' })}>
              <T k="progress" /> →
            </button>
          </div>
        </Card>
      </div>

      {/* Lectures */}
      <h2 style={{ marginTop: 22 }}>
        <T k="lectures" />
      </h2>
      {state.lectures.length === 0 ? (
        <Card>
          <Empty
            icon="📚"
            text={tr('noLectures', lang)}
            action={
              <div className="row" style={{ justifyContent: 'center' }}>
                <button className="btn primary" onClick={() => go({ name: 'upload' })}>
                  <T k="upload" />
                </button>
              </div>
            }
          />
        </Card>
      ) : (
        <div className="grid cols-2">
          {state.lectures.map((lec) => {
            const cs = lectureCardStats(state.cards, lec.id)
            const st = topicStatsFor(lec.id, state.attempts, state.recalls, state.cards)
            const m = Object.keys(st).length ? Math.round((Object.values(st).reduce((a, b) => a + b.correct, 0) / Math.max(1, Object.values(st).reduce((a, b) => a + b.total, 0))) * 100) : 0
            const stats = topicMasteryList(st)
            const cls = classifyTopics(stats)
            return (
              <Card key={lec.id} className="clickable" onClick={() => go({ name: 'lecture', id: lec.id, tab: 'overview' })}>
                <CardTitle
                  title={lec.title}
                  right={
                    <div className="row" style={{ gap: 6 }}>
                      {lec.examDate ? <Pill kind="warn">🗓 {formatWhen(lec.examDate)}</Pill> : null}
                      <Pill kind={m >= 85 ? 'success' : m >= 60 ? 'primary' : 'danger'}>{m}%</Pill>
                    </div>
                  }
                />
                <div className="row muted small-txt" style={{ marginBottom: 8 }}>
                  <span>
                    {lec.analysis.stats.words} {tr('words', lang)}
                  </span>
                  <span>·</span>
                  <span>
                    ⏳ {lec.analysis.stats.readMinutes} {tr('readMin', lang)}
                  </span>
                  <span>·</span>
                  <span>
                    🃏 {cs.total}
                  </span>
                  {cs.due ? (
                    <>
                      <span>·</span>
                      <Pill kind="accent">
                        {cs.due} {tr('dueToday', lang)}
                      </Pill>
                    </>
                  ) : null}
                </div>
                <Progress pct={m} variant={m >= 85 ? 'success' : m < 50 ? 'danger' : ''} thin />
                <div className="row between" style={{ marginTop: 12 }}>
                  <div className="row" style={{ gap: 6 }}>
                    {cls.weak.length ? <Pill kind="danger">weak: {cls.weak[0].topic}</Pill> : null}
                    {cls.strong.length ? <Pill kind="success">✓ {cls.strong.slice(0, 2).map((s) => s.topic).join(', ')}</Pill> : null}
                  </div>
                  <button
                    className="btn small danger"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(tr('confirmDelete', lang))) deleteLecture(lec.id)
                    }}
                  >
                    <T k="delete" />
                  </button>
                </div>
                <div className="row" style={{ marginTop: 10 }}>
                  <button className="btn primary small" onClick={(e) => { e.stopPropagation(); go({ name: 'lecture', id: lec.id, tab: 'overview' }) }}>
                    ▶ <T k="studyNow" />
                  </button>
                  {cs.due ? (
                    <button className="btn small" onClick={(e) => { e.stopPropagation(); go({ name: 'reviews' }) }}>
                      🔁 {cs.due}
                    </button>
                  ) : null}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}
