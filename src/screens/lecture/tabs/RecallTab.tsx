import { useMemo, useState } from 'react'
import type { Grade, Lecture, Question } from '../../../types'
import { useStore } from '../../../store'
import { tr } from '../../../i18n'
import { Card, CardTitle, Pill, Progress, T } from '../../../components/ui'
import { gradeText } from '../../../lib/text'
import { recallQuestions } from '../../../lib/recall'
import BrainDump from '../components/BrainDump'

const GRADES: { g: Grade; cls: string; k: string; ico: string }[] = [
  { g: 'red', cls: 'r', k: 'didntKnow', ico: '🟥' },
  { g: 'yellow', cls: 'y', k: 'partial', ico: '🟨' },
  { g: 'green', cls: 'g', k: 'remembered', ico: '🟩' },
]

export default function RecallTab({ lecture }: { lecture: Lecture }) {
  const { state, recordRecall } = useStore()
  const lang = state.settings.lang
  const questions = useMemo(() => recallQuestions(lecture), [lecture])
  const [sub, setSub] = useState<'recall' | 'dump'>('recall')

  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [answer, setAnswer] = useState('')
  const [autoScore, setAutoScore] = useState<0 | 0.5 | 1 | null>(null)
  const [results, setResults] = useState<Grade[]>([])

  const q: Question | undefined = questions[idx]
  const finished = idx >= questions.length

  function gradeAll(g: Grade) {
    if (!q) return
    recordRecall({ lectureId: lecture.id, question: q.prompt, grade: g, at: Date.now() })
    setResults((r) => [...r, g])
    setRevealed(false)
    setAnswer('')
    setAutoScore(null)
    setIdx((i) => i + 1)
  }

  function reveal() {
    if (!q) return
    setRevealed(true)
    if (answer.trim()) setAutoScore(gradeText(answer, q.keywords.length ? q.keywords : [q.answer]))
  }

  return (
    <div>
      <div className="tabs no-print">
        <button className={`tab ${sub === 'recall' ? 'active' : ''}`} onClick={() => setSub('recall')}>
          💭 {tr('activeRecall', lang)}
        </button>
        <button className={`tab ${sub === 'dump' ? 'active' : ''}`} onClick={() => setSub('dump')}>
          🧠 {tr('oneMin', lang)}
        </button>
      </div>

      {sub === 'dump' ? (
        <BrainDump lecture={lecture} />
      ) : (
        <>
          {/* progress header */}
          {questions.length > 0 && !finished ? (
            <div className="row between no-print" style={{ marginBottom: 10 }}>
              <Pill kind="primary">
                {idx + 1} / {questions.length}
              </Pill>
              <div style={{ flex: 1, maxWidth: 320 }}>
                <Progress pct={(idx / questions.length) * 100} thin />
              </div>
              <Pill>{q?.kind}</Pill>
            </div>
          ) : null}

          {finished ? (
            <Card>
              <div className="analyzing">
                <div style={{ fontSize: '2.4rem' }}>💭</div>
                <h2>
                  {results.filter((r) => r === 'green').length} 🟩 · {results.filter((r) => r === 'yellow').length} 🟨 ·{' '}
                  {results.filter((r) => r === 'red').length} 🟥
                </h2>
                <p className="muted">Recall attempts saved — your review intervals adapt to these grades.</p>
                <button className="btn primary" onClick={() => { setIdx(0); setResults([]) }}>
                  ↻ Restart queue
                </button>
              </div>
            </Card>
          ) : !q ? (
            <Card>
              <div className="empty">
                <div className="ico">💭</div>
                Not enough extractable content for recall questions yet.
              </div>
            </Card>
          ) : (
            <Card>
              <CardTitle title={<T k="activeRecall" />} right={<Pill kind="accent">{q.topic}</Pill>} />
              <div className="hint" style={{ marginBottom: 12 }}>
                🔒 {tr('gradeHint', lang)}
              </div>
              <div className="q-prompt">{q.prompt}</div>

              {!revealed ? (
                <>
                  <textarea
                    dir="auto"
                    className="textarea"
                    style={{ minHeight: 120 }}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder={tr('typeAnswer', lang)}
                  />
                  <div className="row" style={{ marginTop: 12 }}>
                    <button className="btn primary big" onClick={reveal}>
                      👁 {tr('showAnswer', lang)}
                    </button>
                    <button className="btn ghost" onClick={() => setIdx((i) => i + 1)}>
                      {tr('skip', lang)} →
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {autoScore !== null ? (
                    <div className={`hint`} style={{ borderColor: autoScore === 1 ? 'var(--success)' : autoScore === 0.5 ? 'var(--warn)' : 'var(--danger)', marginBottom: 10 }}>
                      {autoScore === 1 ? '✅' : autoScore === 0.5 ? '🟡' : '❌'} Auto-check:{' '}
                      {autoScore === 1 ? tr('correct', lang) : autoScore === 0.5 ? tr('partialScore', lang) : tr('incorrect', lang)} — now grade yourself honestly:
                    </div>
                  ) : null}
                  <div className="quote" style={{ whiteSpace: 'pre-wrap' }}>
                    <b>{tr('answer', lang)}:</b> {q.answer}
                  </div>
                  {q.explanation && q.explanation !== q.answer ? (
                    <div className="muted small-txt" style={{ marginTop: 6 }}>
                      📎 {q.explanation}
                    </div>
                  ) : null}
                  <div className="grade-row" style={{ marginTop: 14 }}>
                    {GRADES.map((gl) => (
                      <button key={gl.g} className={`grade-btn ${gl.cls}`} onClick={() => gradeAll(gl.g)}>
                        {gl.ico} {tr(gl.k, lang)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  )
}
