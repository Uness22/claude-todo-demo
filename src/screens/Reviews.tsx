import { useMemo, useState } from 'react'
import type { Route } from '../App'
import type { Grade } from '../types'
import { useStore } from '../store'
import { tr } from '../i18n'
import { Card, CardTitle, Empty, Pill, Progress, T } from '../components/ui'
import { dueCards, formatWhen } from '../lib/srs'

const GRADE_LABELS: { g: Grade; cls: string; k: string }[] = [
  { g: 'red', cls: 'r', k: 'didntKnow' },
  { g: 'yellow', cls: 'y', k: 'partial' },
  { g: 'green', cls: 'g', k: 'remembered' },
]

export default function Reviews({ go }: { go: (r: Route) => void }) {
  const { state, gradeCard } = useStore()
  const lang = state.settings.lang
  const due = useMemo(() => dueCards(state.cards), [state.cards])
  // Snapshot "now" once per mount so the upcoming list renders purely from state.
  const [now] = useState(() => Date.now())
  const upcoming = useMemo(
    () =>
      [...state.cards]
        .filter((c) => c.due > now)
        .sort((a, b) => a.due - b.due)
        .slice(0, 8),
    [state.cards, now],
  )

  const [queue, setQueue] = useState<string[] | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [graded, setGraded] = useState(0)

  const activeId = queue && queue.length ? queue[0] : null
  const active = activeId ? state.cards.find((c) => c.id === activeId) : null
  const activeLec = active ? state.lectures.find((l) => l.id === active.lectureId) : null

  function grade(g: Grade) {
    if (!active) return
    gradeCard(active.id, g)
    setGraded((n) => n + 1)
    setFlipped(false)
    setQueue((q) => (q ? q.slice(1) : q))
  }

  return (
    <div>
      <h1>
        🔁 <T k="reviews" />
      </h1>
      <p className="muted">
        <T k="gradeHint" />
      </p>

      {active ? (
        <Card>
          <div className="row between">
            <Pill kind="primary">
              {graded + 1} / {graded + (queue?.length || 0)}
            </Pill>
            <Pill kind="accent">{activeLec?.title || '—'}</Pill>
          </div>
          <div style={{ margin: '10px 0' }}>
            <Progress pct={(graded / Math.max(1, graded + (queue?.length || 0))) * 100} thin />
          </div>

          <div className={`fcard ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped((f) => !f)}>
            <div className="fcard-inner">
              <div className="fcard-face front">
                <span className="side">{tr('front', lang)}</span>
                <div className="q">{active.front}</div>
                <span className="muted small-txt">tap to flip</span>
              </div>
              <div className="fcard-face back">
                <span className="side">{tr('back', lang)}</span>
                <div className="a">{active.back}</div>
                {active.memoryTrick ? <div className="small-txt" style={{ color: 'var(--accent)' }}>💡 {active.memoryTrick}</div> : null}
              </div>
            </div>
          </div>

          {flipped ? (
            <>
              <div className="muted small-txt" style={{ textAlign: 'center', margin: '10px 0 6px' }}>
                Be honest — 🟥 brings this card back sooner today.
              </div>
              <div className="grade-row">
                {GRADE_LABELS.map((gl) => (
                  <button key={gl.g} className={`grade-btn ${gl.cls}`} onClick={() => grade(gl.g)}>
                    {gl.g === 'red' ? '🟥' : gl.g === 'yellow' ? '🟨' : '🟩'} {tr(gl.k, lang)}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <button className="btn primary block" style={{ marginTop: 12 }} onClick={() => setFlipped(true)}>
              👁 {tr('showAnswer', lang)}
            </button>
          )}
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn small ghost" onClick={() => setQueue(null)}>
              ✕ Quit
            </button>
          </div>
        </Card>
      ) : queue && queue.length === 0 ? (
        <Card>
          <div className="analyzing">
            <div style={{ fontSize: '2.4rem' }}>🎉</div>
            <h2>{graded} cards reviewed!</h2>
            <p className="muted">Intervals updated. Come back when the next review is due.</p>
            <button className="btn primary" onClick={() => setQueue(null)}>
              <T k="done" />
            </button>
          </div>
        </Card>
      ) : (
        <>
          <Card>
            <CardTitle
              title={`${due.length} due ${tr('dueToday', lang)}`}
              right={
                due.length ? (
                  <button className="btn primary" onClick={() => setQueue(due.slice(0, 40).map((c) => c.id))}>
                    ▶ {tr('startReviews', lang)}
                  </button>
                ) : (
                  <Pill kind="success">✅ {tr('noReviews', lang)}</Pill>
                )
              }
            />
            {due.length ? (
              <div className="col" style={{ gap: 6, maxHeight: 330, overflowY: 'auto' }}>
                {due.slice(0, 30).map((c) => {
                  const lec = state.lectures.find((l) => l.id === c.lectureId)
                  return (
                    <div key={c.id} className="row between small-txt" style={{ padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8 }}>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.front.replace(/\n/g, ' ')}
                      </span>
                      <span className="row" style={{ gap: 6 }}>
                        <Pill kind={c.difficulty === 'hard' ? 'danger' : 'warn'}>{tr(c.difficulty, lang)}</Pill>
                        <span className="muted">{lec?.title.slice(0, 22)}</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <Empty icon="🌤" text={tr('noReviews', lang)} />
            )}
          </Card>

          <Card style={{ marginTop: 14 }}>
            <CardTitle title="Upcoming" sub="Spaced repetition queue" />
            {upcoming.length ? (
              <div className="col" style={{ gap: 7 }}>
                {upcoming.map((c) => (
                  <div key={c.id} className="row between small-txt">
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.front.replace(/\n/g, ' ')}
                    </span>
                    <Pill>{formatWhen(c.due)}</Pill>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted small-txt">No scheduled cards yet — study a lecture first.</p>
            )}
          </Card>

          {state.lectures.length ? (
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn" onClick={() => go({ name: 'dash' })}>
                📚 <T k="lectures" />
              </button>
              <button className="btn" onClick={() => go({ name: 'progress' })}>
                📊 <T k="progress" />
              </button>
            </div>
          ) : (
            <Card style={{ marginTop: 14 }}>
              <Empty icon="🚀" text={tr('noLectures', lang)} action={<button className="btn primary" onClick={() => go({ name: 'upload' })}><T k="upload" /></button>} />
            </Card>
          )}
        </>
      )}
    </div>
  )
}
