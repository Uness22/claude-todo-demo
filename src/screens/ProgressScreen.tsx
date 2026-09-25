import { useMemo, useState } from 'react'
import type { Route } from '../App'
import { useStore } from '../store'
import { tr } from '../i18n'
import { Bar, Card, CardTitle, Empty, Pill, Progress, Stat, T, fmtDate } from '../components/ui'
import { avgMastery, classifyTopics, dueCount, studyPlan, topicMasteryList, topicStatsFor } from '../lib/mastery'

export default function ProgressScreen({ go }: { go: (r: Route) => void }) {
  const { state } = useStore()
  const lang = state.settings.lang
  const [planMinutes, setPlanMinutes] = useState(90)

  const merged = useMemo(() => {
    const out: Record<string, { correct: number; total: number }> = {}
    for (const lec of state.lectures) {
      const st = topicStatsFor(lec.id, state.attempts, state.recalls, state.cards)
      for (const [t, v] of Object.entries(st)) {
        if (!out[t]) out[t] = { correct: 0, total: 0 }
        out[t].correct += v.correct
        out[t].total += v.total
      }
    }
    return out
  }, [state])

  const topics = topicMasteryList(merged)
  const cls = classifyTopics(topics)
  const plan = studyPlan(topics, planMinutes)
  const mastery = avgMastery(state)
  const due = dueCount(state)

  const recentAttempts = [...state.attempts].sort((a, b) => b.at - a.at).slice(0, 8)
  const totalQ = state.attempts.reduce((s, a) => s + a.total, 0)
  const totalC = state.attempts.reduce((s, a) => s + a.correct, 0)

  return (
    <div>
      <h1>
        📊 <T k="progress" />
      </h1>

      <div className="grid cols-4" style={{ marginBottom: 14 }}>
        <Stat v={`${mastery}%`} k={<T k="overallMastery" />} />
        <Stat v={totalQ ? `${Math.round((totalC / totalQ) * 100)}%` : '—'} k="Quiz accuracy" sub={`${totalQ} questions`} />
        <Stat v={due} k={<T k="dueReviews" />} />
        <Stat v={`🔥 ${state.streak.current}`} k={<T k="streak" />} sub={`best ${state.streak.longest}`} />
      </div>

      {!topics.length ? (
        <Card>
          <Empty
            icon="📈"
            text="No performance data yet. Study a lecture, run Active Recall or take a Quiz — your weakness map builds automatically."
            action={
              <button className="btn primary" onClick={() => go({ name: 'dash' })}>
                <T k="backToDash" />
              </button>
            }
          />
        </Card>
      ) : (
        <div className="grid cols-2">
          {/* Topic mastery */}
          <Card>
            <CardTitle title="Topic Mastery Map" sub="Accuracy per topic across all activity" />
            <div className="tprog">
              {[...topics]
                .sort((a, b) => b.pct - a.pct)
                .map((t) => (
                  <Bar
                    key={t.topic}
                    pct={t.pct}
                    label={t.topic}
                    right={
                      <span className="row" style={{ gap: 6 }}>
                        {t.pct >= 85 ? <Pill kind="success">{tr('mastered', lang)}</Pill> : t.pct < 60 ? <Pill kind="danger">weak</Pill> : <Pill kind="warn">{tr('learning', lang)}</Pill>}
                        {t.pct}%
                      </span>
                    }
                  />
                ))}
            </div>
          </Card>

          {/* Classified + plan */}
          <div className="col" style={{ gap: 14 }}>
            <Card>
              <CardTitle title="Weakness Detection" />
              <div className="row">
                <Pill kind="danger">🟥 Weak ({cls.weak.length}): {cls.weak.map((t) => t.topic).join(', ') || '—'}</Pill>
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <Pill kind="warn">🟨 Review ({cls.review.length}): {cls.review.map((t) => t.topic).join(', ') || '—'}</Pill>
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <Pill kind="success">🟩 Strong ({cls.strong.length}): {cls.strong.map((t) => t.topic).join(', ') || '—'}</Pill>
              </div>
            </Card>

            <Card>
              <CardTitle
                title={<T k="studyPlan" />}
                sub="Weak topics get proportionally more time"
                right={
                  <div className="row" style={{ gap: 6 }}>
                    {[60, 90, 120].map((m) => (
                      <button key={m} className={`btn small ${planMinutes === m ? 'primary' : ''}`} onClick={() => setPlanMinutes(m)}>
                        {m}m
                      </button>
                    ))}
                  </div>
                }
              />
              <div className="col" style={{ gap: 8 }}>
                {plan.slice(0, 6).map((p, i) => (
                  <div key={p.topic} className="row between small-txt" style={{ background: 'var(--surface-2)', padding: '8px 12px', borderRadius: 8 }}>
                    <span>
                      {i === 0 ? '🎯 ' : ''}
                      <b>{p.topic}</b> {i === 0 ? <span className="muted">({tr('focusFirst', lang)})</span> : null}
                    </span>
                    <span className="row" style={{ gap: 8 }}>
                      <Pill kind={p.pct < 60 ? 'danger' : p.pct >= 85 ? 'success' : 'warn'}>{p.pct}%</Pill>
                      <b style={{ color: 'var(--primary)' }}>
                        {p.minutes} {tr('minutes', lang)}
                      </b>
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Per-lecture */}
      {state.lectures.length ? (
        <Card style={{ marginTop: 14 }}>
          <CardTitle title={<T k="lectures" />} />
          <div className="col" style={{ gap: 12 }}>
            {state.lectures.map((lec) => {
              const st = topicStatsFor(lec.id, state.attempts, state.recalls, state.cards)
              const list = topicMasteryList(st)
              const m = list.length ? Math.round(list.reduce((a, t) => a + (t.pct * t.total) / 100, 0) / Math.max(1, list.reduce((a, t) => a + t.total, 0)) * 100) : 0
              const atts = state.attempts.filter((x) => x.lectureId === lec.id)
              const last = atts.sort((a, b) => b.at - a.at)[0]
              return (
                <div key={lec.id}>
                  <div className="row between small-txt" style={{ marginBottom: 4 }}>
                    <button className="btn small ghost" style={{ padding: 0, minHeight: 'auto' }} onClick={() => go({ name: 'lecture', id: lec.id, tab: 'overview' })}>
                      📖 {lec.title}
                    </button>
                    <span className="muted">
                      {last ? `${fmtDate(last.at)}: ${last.correct}/${last.total}` : tr('notStarted', lang)}
                    </span>
                  </div>
                  <Progress pct={m} variant={m >= 85 ? 'success' : m < 50 ? 'danger' : ''} thin />
                </div>
              )
            })}
          </div>
        </Card>
      ) : null}

      {/* Attempt history */}
      {recentAttempts.length ? (
        <Card style={{ marginTop: 14 }}>
          <CardTitle title="Recent attempts" />
          <div className="col" style={{ gap: 7 }}>
            {recentAttempts.map((at) => {
              const lec = state.lectures.find((l) => l.id === at.lectureId)
              const pct = Math.round((at.correct / Math.max(1, at.total)) * 100)
              return (
                <div key={at.id} className="row between small-txt" style={{ background: 'var(--surface-2)', padding: '8px 12px', borderRadius: 8 }}>
                  <span>
                    {at.mode === 'exam' ? '🎯' : at.mode === 'recall' ? '💭' : '❓'} {lec?.title || '—'}{' '}
                    <span className="muted">· {new Date(at.at).toLocaleDateString()}</span>
                  </span>
                  <span className="row" style={{ gap: 8 }}>
                    <Pill kind={pct >= 85 ? 'success' : pct >= 60 ? 'primary' : 'danger'}>{pct}%</Pill>
                    <span className="muted">
                      {at.correct}/{at.total}
                    </span>
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      ) : null}
    </div>
  )
}
