import { useMemo } from 'react'
import type { Route } from '../../../App'
import type { Lecture } from '../../../types'
import { useStore } from '../../../store'
import { tr } from '../../../i18n'
import { Card, CardTitle, Empty, Pill, Progress, T } from '../../../components/ui'
import { lectureCardStats } from '../../../lib/srs'

interface Props {
  lecture: Lecture
  go: (r: Route) => void
  onTab: (tab: string) => void
}

export default function OverviewTab({ lecture, go, onTab }: Props) {
  const { state } = useStore()
  const lang = state.settings.lang
  const a = lecture.analysis
  const cs = lectureCardStats(state.cards, lecture.id)
  const attempts = state.attempts.filter((x) => x.lectureId === lecture.id)
  const recalls = state.recalls.filter((x) => x.lectureId === lecture.id)

  const stepsDone = useMemo(() => {
    const done = new Set<string>()
    done.add('upload')
    done.add('analyze')
    if (a.bigPicture.length || a.definitions.length) done.add('understand')
    if (a.terms.length) done.add('simplify')
    if (lecture.mnemonicChoice || recalls.length) done.add('mnemonics')
    if (cs.total) done.add('flashcards')
    if (recalls.length) done.add('recall')
    if (attempts.length) done.add('quiz')
    if (state.cards.some((c) => c.lectureId === lecture.id && c.reps > 0)) done.add('review')
    if (attempts.some((x) => x.correct / Math.max(1, x.total) >= 0.8)) done.add('mastery')
    return done
  }, [a, cs.total, lecture.mnemonicChoice, recalls.length, attempts, state.cards])

  const flow = [
    { id: 'upload', t: 'Upload Lecture', d: 'PDF · PPT · Word · text' },
    { id: 'analyze', t: 'Analyze', d: 'Topics, definitions, lists, numbers' },
    { id: 'understand', t: 'Understand', d: 'Big Picture + Easy Explanation' },
    { id: 'simplify', t: 'Simplify', d: 'Exam Knowledge (MUST KNOW)' },
    { id: 'mnemonics', t: 'Create Mnemonics', d: 'Memory sentences & stories' },
    { id: 'flashcards', t: 'Flashcards', d: `${cs.total} cards generated` },
    { id: 'recall', t: 'Active Recall', d: 'Answer first — then reveal' },
    { id: 'quiz', t: 'Quiz', d: '12 question types' },
    { id: 'review', t: 'Review', d: 'Spaced repetition schedule' },
    { id: 'mastery', t: 'Mastery Score', d: 'Strong vs weak topics' },
  ]

  let activeSet = false

  return (
    <div>
      <div className="grid cols-2">
        {/* Workflow */}
        <Card>
          <CardTitle title={<T k="workflow" />} sub={(() => { const d = [...stepsDone].length; return `${d}/${flow.length}` })()} />
          <div className="flow-steps">
            {flow.map((f, i) => {
              const done = stepsDone.has(f.id)
              const isActive = !done && !activeSet && (activeSet = true)
              return (
                <div key={f.id} className={`flow-step ${done ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                  <div className="dot-col">
                    <div className="dot">{done ? '✓' : i + 1}</div>
                    {i < flow.length - 1 && <div className="line" />}
                  </div>
                  <div className="body">
                    <div className="t">{f.t}</div>
                    <div className="d">{f.d}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <div className="col" style={{ gap: 14 }}>
          {/* Big picture — Level 1 */}
          <Card>
            <CardTitle
              title={<T k="level1" />}
              right={<Pill kind="primary">L1</Pill>}
            />
            {a.bigPicture.length ? (
              a.bigPicture.map((s, i) => (
                <div className="quote" key={i}>
                  {s}
                </div>
              ))
            ) : (
              <div className="muted">
                <T k="emptySection" />
              </div>
            )}
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn small primary" onClick={() => onTab('levels')}>
                🪜 <T k="levels" /> →
              </button>
              <button className="btn small" onClick={() => onTab('sheet')}>
                ⚡ <T k="fiveMin" />
              </button>
            </div>
          </Card>

          {/* Main topics */}
          <Card>
            <CardTitle title={<T k="mainTopics" />} />
            <div className="row">
              {a.mainTopics.map((t, i) => (
                <Pill key={i} kind="accent">
                  {t}
                </Pill>
              ))}
            </div>
            {a.subtopics.length ? (
              <>
                <h3 style={{ marginTop: 14, fontSize: '0.9rem' }}>
                  <T k="subtopics" />
                </h3>
                {a.subtopics.slice(0, 6).map((st, i) => (
                  <div key={i} className="small-txt" style={{ marginBottom: 6 }}>
                    <b>{st.topic}:</b>{' '}
                    <span className="muted">{st.items.slice(0, 4).join(' · ')}</span>
                  </div>
                ))}
              </>
            ) : null}
          </Card>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid cols-4" style={{ marginTop: 14 }}>
        <Card>
          <div className="stat">
            <span className="k">Definitions</span>
            <span className="v">{a.definitions.length}</span>
          </div>
        </Card>
        <Card>
          <div className="stat">
            <span className="k">Lists</span>
            <span className="v">{a.lists.length}</span>
          </div>
        </Card>
        <Card>
          <div className="stat">
            <span className="k">Numbers</span>
            <span className="v">{a.numbers.length + a.formulas.length}</span>
          </div>
        </Card>
        <Card>
          <div className="stat">
            <span className="k">Exam hints</span>
            <span className="v">{a.examHints.length}</span>
          </div>
        </Card>
      </div>

      <div className="grid cols-2" style={{ marginTop: 14 }}>
        {/* Key terms */}
        <Card>
          <CardTitle title={<T k="keyTerms" />} sub={`${a.terms.length} terms`} />
          {a.terms.length ? (
            <div className="col" style={{ gap: 8 }}>
              {a.terms.slice(0, 10).map((t, i) => (
                <div key={i} className="small-txt">
                  <b>{t.term}</b>
                  {t.arabic && lang !== 'en' ? <span className="muted"> — {t.arabic}</span> : null}
                  <div className="muted">{t.definition}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="muted">
              <T k="emptySection" />
            </div>
          )}
        </Card>

        {/* Relations + flags */}
        <div className="col" style={{ gap: 14 }}>
          <Card>
            <CardTitle title={<T k="relations" />} />
            {a.relations.length ? (
              <div className="col" style={{ gap: 6 }}>
                {a.relations.slice(0, 6).map((r, i) => (
                  <div key={i} className="small-txt">
                    <b>{r.from}</b> <span className="muted">↔</span> <b>{r.to}</b>
                    <div className="muted" style={{ fontSize: '0.78rem' }}>{r.evidence.slice(0, 110)}…</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="muted small-txt">No explicit relationships detected.</div>
            )}
          </Card>

          {a.flags.length ? (
            <Card>
              <CardTitle title="⚠ Academic Accuracy" sub="Flagged instead of guessed" />
              <div className="col" style={{ gap: 6 }}>
                {a.flags.slice(0, 5).map((f, i) => (
                  <div key={i} className="small-txt">
                    <span className={`flag ${f.kind === 'unclear' ? 'unclear' : 'verify'}`}>{f.kind === 'unclear' ? tr('unclear', lang) : tr('needsVerification', lang)}</span>{' '}
                    <span className="muted">{f.text}</span>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      </div>

      {/* Exam predictions */}
      <Card style={{ marginTop: 14 }}>
        <CardTitle
          title={<T k="potentialExamQ" />}
          sub={<T k="professorNote" />}
          right={<Pill kind="warn">🎯 {a.examHints.length}</Pill>}
        />
        <ul className="kb">
          {a.examHints.slice(0, 10).map((h, i) => (
            <li key={h.id}>
              <span className="n">{i + 1}.</span>
              {h.text} <span className="muted small-txt">({h.reason})</span>
            </li>
          ))}
        </ul>
        {!a.examHints.length ? <div className="muted"><T k="emptySection" /></div> : null}
      </Card>

      {/* Full lecture */}
      <Card style={{ marginTop: 14 }}>
        <CardTitle
          title={<T k="fullLecture" />}
          right={
            <button className="btn small" onClick={() => go({ name: 'upload' })}>
              ➕ <T k="newLecture" />
            </button>
          }
        />
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
            📖 {lecture.title} — {lecture.rawText.split(/\s+/).length} words
          </summary>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.9rem', lineHeight: 1.6, marginTop: 10 }}>{lecture.rawText}</pre>
        </details>
        {a.stats.languages.length ? (
          <div className="row" style={{ marginTop: 8 }}>
            {a.stats.languages.map((l) => (
              <Pill key={l}>{l}</Pill>
            ))}
            <div style={{ width: 140 }}>
              <Progress pct={Math.min(100, (a.stats.words / 3000) * 100)} thin />
            </div>
            <span className="muted small-txt">{a.stats.readMinutes} min read</span>
          </div>
        ) : null}
      </Card>

      {!a.bigPicture.length && !a.definitions.length ? (
        <Card style={{ marginTop: 14 }}>
          <Empty icon="🧩" text="Very little structured content was detected. Try pasting cleaner text or a text-based PDF." />
        </Card>
      ) : null}
    </div>
  )
}
