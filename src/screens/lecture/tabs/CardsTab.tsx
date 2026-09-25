import { useMemo, useState } from 'react'
import type { Flashcard, Grade, Lecture } from '../../../types'
import { REVIEW_LABELS } from '../../../types'
import { useStore } from '../../../store'
import { tr } from '../../../i18n'
import { Card, CardTitle, Empty, Pill, Progress, T } from '../../../components/ui'
import { dueCards, formatWhen } from '../../../lib/srs'

const GRADE_LABELS: { g: Grade; cls: string; k: string }[] = [
  { g: 'red', cls: 'r', k: 'didntKnow' },
  { g: 'yellow', cls: 'y', k: 'partial' },
  { g: 'green', cls: 'g', k: 'remembered' },
]

export default function CardsTab({ lecture }: { lecture: Lecture }) {
  const { state, gradeCard } = useStore()
  const lang = state.settings.lang
  const cards = useMemo(() => state.cards.filter((c) => c.lectureId === lecture.id), [state.cards, lecture.id])
  const due = useMemo(() => dueCards(cards), [cards])

  const [queue, setQueue] = useState<string[] | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [answered, setAnswered] = useState<Record<string, Grade>>({})

  const activeId = queue && queue.length ? queue[0] : null
  const active = activeId ? cards.find((c) => c.id === activeId) : null

  function start(ids: string[]) {
    setQueue(ids)
    setFlipped(false)
    setAnswered({})
  }

  function grade(g: Grade) {
    if (!active) return
    gradeCard(active.id, g)
    setAnswered((a) => ({ ...a, [active.id]: g }))
    setFlipped(false)
    setQueue((q) => (q ? q.slice(1) : q))
  }

  const doneCount = queue ? Object.keys(answered).length : 0
  const totalCount = queue ? doneCount + queue.length : 0
  const summary = queue !== null && queue.length === 0

  const schedule = useMemo(() => {
    return REVIEW_LABELS.map((label, i) => {
      if (i === 0) return { label, when: tr('today', lang) }
      if (i === 5 && lecture.examDate) return { label, when: formatWhen(lecture.examDate) }
      const days = [0, 1, 3, 7, 14, 30][i]
      return { label, when: `+${days}d` }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lecture.examDate, cards.length, lang])

  return (
    <div>
      {/* Header stats */}
      <div className="grid cols-4" style={{ marginBottom: 14 }}>
        <Card>
          <div className="stat">
            <span className="k">Total cards</span>
            <span className="v">{cards.length}</span>
          </div>
        </Card>
        <Card>
          <div className="stat">
            <span className="k">Due now</span>
            <span className="v" style={{ color: due.length ? 'var(--warn)' : 'var(--success)' }}>{due.length}</span>
          </div>
        </Card>
        <Card>
          <div className="stat">
            <span className="k">Mastered (L5+)</span>
            <span className="v">{cards.filter((c) => c.intervalIndex >= 4).length}</span>
          </div>
        </Card>
        <Card>
          <div className="stat">
            <span className="k">Lapses 🟥</span>
            <span className="v">{cards.reduce((a, c) => a + c.lapses, 0)}</span>
          </div>
        </Card>
      </div>

      {/* Review queue */}
      {active ? (
        <Card>
          <div className="row between">
            <Pill kind="primary">
              {doneCount + 1} / {totalCount}
            </Pill>
            <Pill kind={active.difficulty === 'hard' ? 'danger' : active.difficulty === 'medium' ? 'warn' : 'success'}>
              {tr(active.difficulty, lang)} · {active.type}
            </Pill>
          </div>
          <div style={{ margin: '10px 0' }}>
            <Progress pct={(doneCount / Math.max(1, totalCount)) * 100} thin />
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
                {active.example ? <div className="small-txt muted">📌 {active.example}</div> : null}
              </div>
            </div>
          </div>

          {flipped ? (
            <>
              <div className="muted small-txt" style={{ textAlign: 'center', margin: '10px 0 6px' }}>
                {tr('gradeHint', lang)}
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
            <button className="btn small ghost" onClick={() => setQueue((q) => (q && q.length > 1 ? [...q.slice(1), q[0]] : q))}>
              ⏭ {tr('skip', lang)}
            </button>
            <button className="btn small ghost" onClick={() => setQueue(null)}>
              ✕ Quit
            </button>
          </div>
        </Card>
      ) : summary ? (
        <Card>
          <div className="analyzing">
            <div style={{ fontSize: '2.4rem' }}>🎉</div>
            <h2>
              {doneCount} cards · {Object.values(answered).filter((g) => g === 'green').length} 🟩{' '}
              {Object.values(answered).filter((g) => g === 'yellow').length} 🟨{' '}
              {Object.values(answered).filter((g) => g === 'red').length} 🟥
            </h2>
            <p className="muted">SRS schedule updated — wrong cards return sooner.</p>
            <button className="btn primary" onClick={() => setQueue(null)}>
              <T k="done" />
            </button>
          </div>
        </Card>
      ) : (
        <Card>
          <CardTitle
            title={<T k="flashcards" />}
            right={
              due.length ? (
                <button className="btn primary" onClick={() => start(due.slice(0, 30).map((c) => c.id))}>
                  🔁 {tr('reviewNow', lang)} ({due.length})
                </button>
              ) : null
            }
          />
          {cards.length === 0 ? (
            <Empty icon="🃏" text={tr('noCards', lang)} />
          ) : (
            <>
              {!due.length ? <div className="hint">✅ {tr('noReviews', lang)}</div> : null}
              <div className="row" style={{ marginTop: 12 }}>
                <button className="btn" onClick={() => start(shuffleIds(cards))}>
                  🎲 {tr('shuffle', lang)} ({cards.length})
                </button>
                <button className="btn" onClick={() => start(cards.slice(0, 15).map((c) => c.id))}>
                  ▶ Study all
                </button>
              </div>
              <div className="divider" />
              <div className="col" style={{ gap: 6, maxHeight: 320, overflowY: 'auto' }}>
                {cards.slice(0, 40).map((c) => (
                  <CardRow key={c.id} card={c} lang={lang} />
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      {/* SRS schedule */}
      <Card style={{ marginTop: 14 }}>
        <CardTitle title={<T k="reviewSchedule" />} sub="Intervals grow when you succeed, shrink when you fail" />
        <div className="row" style={{ gap: 8 }}>
          {schedule.map((s, i) => (
            <div key={i} className="card" style={{ padding: '10px 14px', flex: '1 1 130px', minWidth: 130, boxShadow: 'none' }}>
              <div className="small-txt" style={{ fontWeight: 800, color: 'var(--primary)' }}>
                {s.label}
              </div>
              <div className="small-txt muted">{s.when}</div>
            </div>
          ))}
        </div>
        <p className="muted small-txt" style={{ marginTop: 10 }}>
          🟥 Incorrect → Review earlier · 🟨 Partial → keep interval · 🟩 Remembered → increase interval
        </p>
      </Card>
    </div>
  )
}

function shuffleIds(cards: Flashcard[]): string[] {
  const ids = cards.map((c) => c.id)
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }
  return ids
}

function CardRow({ card, lang }: { card: Flashcard; lang: import('../../../types').Lang }) {
  const dueLabel = card.reps === 0 ? 'new' : formatWhen(card.due)
  return (
    <div className="row between small-txt" style={{ padding: '7px 10px', background: 'var(--surface-2)', borderRadius: 8 }}>
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {card.front.replace(/\n/g, ' ')}
      </span>
      <span className="row" style={{ gap: 6 }}>
        <Pill kind={card.difficulty === 'hard' ? 'danger' : card.difficulty === 'medium' ? 'warn' : 'success'}>{tr(card.difficulty, lang)}</Pill>
        <span className="muted">{dueLabel}</span>
        {card.lastGrade ? <span>{card.lastGrade === 'green' ? '🟩' : card.lastGrade === 'yellow' ? '🟨' : '🟥'}</span> : null}
      </span>
    </div>
  )
}
