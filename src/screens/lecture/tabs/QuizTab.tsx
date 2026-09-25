import { useMemo, useState } from 'react'
import type { Lecture, Question, TopicStat } from '../../../types'
import { uid } from '../../../types'
import { useStore } from '../../../store'
import { tr } from '../../../i18n'
import { Card, CardTitle, Pill, Progress, T } from '../../../components/ui'
import { evaluateAnswer, generateQuestions } from '../../../lib/quiz'
import { truncate } from '../../../lib/text'
import { classifyTopics, topicMasteryList } from '../../../lib/mastery'

interface Answered {
  qid: string
  topic: string
  score: 0 | 0.5 | 1
  userText: string
}

const KIND_LABEL: Record<string, string> = {
  mcq: 'MCQ',
  tf: 'True / False',
  fill: 'Fill in the Blank',
  matching: 'Matching',
  short: 'Short Answer',
  list: 'List Question',
  definition: 'Definition Question',
  explain: 'Explain Why',
  compare: 'Compare',
  scenario: 'Scenario',
  case: 'Case Study',
  oral: 'Oral Recall',
}

export default function QuizTab({ lecture }: { lecture: Lecture }) {
  const { state, recordAttempt } = useStore()
  const lang = state.settings.lang
  const bank = useMemo(() => generateQuestions(lecture), [lecture])

  const [count, setCount] = useState(10)
  const [pool, setPool] = useState<Question[]>([])
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<'intro' | 'run' | 'result'>('intro')
  const [sel, setSel] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [checked, setChecked] = useState<{ score: 0 | 0.5 | 1; status: string } | null>(null)
  const [answered, setAnswered] = useState<Answered[]>([])
  // matching state
  const [pairs, setPairs] = useState<Record<string, string>>({})
  const [pickTerm, setPickTerm] = useState<string | null>(null)

  const q = pool[idx]
  // stable shuffled definition column for matching questions
  const shuffledPairs = useMemo(() => (q?.pairs ? shuffle(q.pairs) : []), [q?.pairs])

  function start(usePool?: Question[]) {
    const p = usePool || shuffle(bank).slice(0, count)
    setPool(p)
    setIdx(0)
    setAnswered([])
    setSel(null)
    setText('')
    setChecked(null)
    setPairs({})
    setPickTerm(null)
    setPhase('run')
  }

  function record(a: Answered) {
    setAnswered((prev) => [...prev, a])
  }

  function nextQuestion() {
    setSel(null)
    setText('')
    setChecked(null)
    setPairs({})
    setPickTerm(null)
    if (idx + 1 >= pool.length) {
      finish([...answered])
    } else setIdx((i) => i + 1)
  }

  function finish(list: Answered[]) {
    const perTopic: Record<string, TopicStat> = {}
    for (const a of list) {
      if (!perTopic[a.topic]) perTopic[a.topic] = { correct: 0, total: 0 }
      perTopic[a.topic].correct += a.score
      perTopic[a.topic].total += 1
    }
    const correct = list.reduce((s, a) => s + a.score, 0)
    recordAttempt({
      id: uid('att'),
      lectureId: lecture.id,
      at: Date.now(),
      mode: 'quiz',
      correct,
      total: list.length,
      perTopic,
      wrongQuestionIds: list.filter((a) => a.score < 1).map((a) => a.qid),
    })
    setAnswered(list)
    setPhase('result')
  }

  function checkCurrent() {
    if (!q) return
    let score: 0 | 0.5 | 1 = 0
    if (q.kind === 'mcq' || q.kind === 'tf') {
      if (!sel) return
      score = sel === q.answer ? 1 : 0
    } else if (q.kind === 'matching') {
      if (Object.keys(pairs).length < (q.pairs?.length || 0)) return
      let hits = 0
      for (const p of q.pairs || []) if (pairs[p.a] === p.b) hits++
      score = hits / (q.pairs?.length || 1) >= 0.99 ? 1 : hits / (q.pairs?.length || 1) >= 0.5 ? 0.5 : 0
    } else if (q.kind === 'oral') {
      return // self-graded on reveal
    } else {
      const ev = evaluateAnswer(q, text)
      score = ev.score
    }
    setChecked({ score, status: score === 1 ? 'correct' : score === 0.5 ? 'partial' : 'incorrect' })
    record({ qid: q.id, topic: q.topic, score, userText: q.kind === 'matching' ? JSON.stringify(pairs) : text || sel || '' })
  }

  function selfGrade(ok: boolean) {
    if (!q) return
    const score: 0 | 1 = ok ? 1 : 0
    setChecked({ score, status: ok ? 'correct' : 'incorrect' })
    record({ qid: q.id, topic: q.topic, score, userText: '(oral)' })
  }

  // ---------- Result view ----------
  if (phase === 'result') {
    const total = answered.length
    const correct = answered.reduce((s, a) => s + a.score, 0)
    const pct = total ? Math.round((correct / total) * 100) : 0
    const topics = topicMasteryList(
      answered.reduce<Record<string, TopicStat>>((acc, a) => {
        if (!acc[a.topic]) acc[a.topic] = { correct: 0, total: 0 }
        acc[a.topic].correct += a.score
        acc[a.topic].total += 1
        return acc
      }, {}),
    )
    const cls = classifyTopics(topics)
    const wrongs = pool.filter((qq) => answered.some((a) => a.qid === qq.id && a.score < 1))

    return (
      <Card>
        <div className="analyzing">
          <div className="result-ring" style={{ ['--pct' as string]: pct }}>
            <span>{pct}%</span>
          </div>
          <h2>
            {tr('yourResult', lang)}: {correct}/{total}
          </h2>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Pill kind={pct >= 85 ? 'success' : pct >= 60 ? 'primary' : 'danger'}>
              {pct >= 85 ? '💪 Strong' : pct >= 60 ? '📈 Getting there' : '🎯 Keep reviewing'}
            </Pill>
          </div>
        </div>

        <div className="grid cols-2">
          <div>
            <h3 style={{ color: 'var(--success)' }}>✅ {tr('strongResults', lang)}</h3>
            {cls.strong.length ? (
              <ul className="kb">
                {cls.strong.map((t) => (
                  <li key={t.topic}>
                    {t.topic} — {t.pct}%
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small-txt">None yet — review and try again.</p>
            )}
            <h3 style={{ color: 'var(--danger)', marginTop: 12 }}>❌ {tr('weakResults', lang)}</h3>
            {cls.weak.length ? (
              <ul className="kb">
                {cls.weak.map((t) => (
                  <li key={t.topic}>
                    {t.topic} — {t.pct}%
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small-txt">Nothing weak. 🎉</p>
            )}
            {cls.review.length ? (
              <>
                <h3 style={{ color: 'var(--warn)', marginTop: 12 }}>🔁 {tr('reviewTopics', lang)}</h3>
                <ul className="kb">
                  {cls.review.map((t) => (
                    <li key={t.topic}>
                      {t.topic} — {t.pct}%
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>

          <div>
            <h3>🟥 {tr('wrongQuestions', lang)}</h3>
            {wrongs.length ? (
              <div className="col" style={{ gap: 8, maxHeight: 330, overflowY: 'auto' }}>
                {wrongs.map((wq) => {
                  const a = answered.find((x) => x.qid === wq.id)
                  return (
                    <div key={wq.id} className="card" style={{ padding: 12, boxShadow: 'none' }}>
                      <div className="small-txt" style={{ fontWeight: 700 }}>
                        [{KIND_LABEL[wq.kind]}] {truncate(wq.prompt, 130)}
                      </div>
                      {a?.userText ? <div className="small-txt muted">You: {truncate(a.userText, 90)}</div> : null}
                      <div className="small-txt" style={{ color: 'var(--success)' }}>✓ {truncate(wq.answer, 130)}</div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="muted small-txt">Perfect run — no wrong questions.</p>
            )}
          </div>
        </div>

        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn primary" onClick={() => start(shuffle(bank).slice(0, count))}>
            ↻ New quiz
          </button>
          {wrongs.length ? (
            <button
              className="btn accent"
              onClick={() => {
                start(wrongs)
              }}
            >
              🎯 Retry wrong ({wrongs.length})
            </button>
          ) : null}
        </div>
      </Card>
    )
  }

  // ---------- Intro ----------
  if (phase === 'intro' || !q) {
    return (
      <Card>
        <CardTitle title={<T k="quiz" />} sub={bank.length ? `${bank.length} ${tr('questionBank', lang)}` : ''} />
        {!bank.length ? (
          <p className="muted">Not enough content detected to build questions. Try a richer lecture.</p>
        ) : (
          <>
            <div className="row" style={{ gap: 8 }}>
              {[6, 10, 15, 20].map((n) => (
                <button key={n} className={`btn small ${count === n ? 'primary' : ''}`} onClick={() => setCount(n)} disabled={n > bank.length}>
                  {n} {tr('questionCount', lang)}
                </button>
              ))}
            </div>
            <div className="row" style={{ gap: 6, marginTop: 12 }}>
              {[...new Set(bank.map((b) => b.kind))].map((k) => (
                <Pill key={k} kind="accent">
                  {KIND_LABEL[k]}
                </Pill>
              ))}
            </div>
            <div className="hint" style={{ marginTop: 12 }}>
              {lang === 'ar' ? 'أجب أولًا — لا تُظهر الإجابة إلا بعد محاولتك.' : 'Answer first — the app reveals the answer only after your attempt.'}
            </div>
            <button className="btn primary big" style={{ marginTop: 14 }} onClick={() => start()}>
              ▶ {tr('startQuiz', lang)}
            </button>
          </>
        )}
      </Card>
    )
  }

  // ---------- Running ----------
  const isChoice = q.kind === 'mcq' || q.kind === 'tf'
  const isText = !isChoice && q.kind !== 'matching' && q.kind !== 'oral'
  const canCheck = isChoice ? !!sel : q.kind === 'matching' ? Object.keys(pairs).length === (q.pairs?.length || 0) : q.kind === 'oral' ? true : text.trim().length > 0

  return (
    <Card>
      <div className="row between no-print">
        <Pill kind="primary">
          {idx + 1} / {pool.length}
        </Pill>
        <div className="row" style={{ gap: 6 }}>
          <Pill kind="accent">{KIND_LABEL[q.kind]}</Pill>
          <Pill kind={q.difficulty === 'hard' ? 'danger' : q.difficulty === 'medium' ? 'warn' : 'success'}>{tr(q.difficulty, lang)}</Pill>
          <Pill>{q.topic}</Pill>
        </div>
      </div>
      <div style={{ margin: '10px 0' }}>
        <Progress pct={(idx / pool.length) * 100} thin />
      </div>

      <div className="q-prompt">{q.prompt}</div>

      {/* MCQ / TF */}
      {isChoice && q.options ? (
        <div className="q-options">
          {q.options.map((o, i) => {
            let cls = 'q-opt'
            if (!checked && sel === o) cls += ' selected'
            if (checked) {
              if (o === q.answer) cls += ' correct'
              else if (sel === o) cls += ' wrong'
            }
            return (
              <button key={i} className={cls} disabled={!!checked} onClick={() => setSel(o)}>
                <span className="key">{String.fromCharCode(65 + i)}.</span> {o}
              </button>
            )
          })}
        </div>
      ) : null}

      {/* Matching */}
      {q.kind === 'matching' && q.pairs ? (
        <div className="grid cols-2">
          <div className="col" style={{ gap: 8 }}>
            <label className="field">Terms</label>
            {q.pairs.map((p) => (
              <button
                key={p.a}
                className={`q-opt ${pickTerm === p.a ? 'selected' : ''} ${checked ? (pairs[p.a] === p.b ? 'correct' : 'wrong') : ''}`}
                disabled={!!checked}
                onClick={() => setPickTerm(p.a)}
              >
                <b>{p.a}</b>
                {pairs[p.a] ? <span className="muted small-txt"> → {truncate(pairs[p.a], 40)}</span> : null}
              </button>
            ))}
          </div>
          <div className="col" style={{ gap: 8 }}>
            <label className="field">Definitions — click to pair</label>
            {shuffledPairs.map((p) => (
              <button
                key={p.b}
                className={`q-opt ${checked && pairs[pickTerm || q.pairs![0].a] === p.b ? 'selected' : ''}`}
                disabled={!!checked || !pickTerm}
                onClick={() => {
                  if (!pickTerm) return
                  setPairs((pr) => ({ ...pr, [pickTerm]: p.b }))
                  setPickTerm(null)
                }}
              >
                {truncate(p.b, 90)}
              </button>
            ))}
          </div>
          {checked && q.pairs ? (
            <div className="hint" style={{ gridColumn: '1 / -1' }}>
              {q.explanation}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Text answers */}
      {isText ? (
        <textarea
          className="textarea"
          style={{ minHeight: 110 }}
          value={text}
          disabled={!!checked}
          onChange={(e) => setText(e.target.value)}
          placeholder={q.kind === 'list' ? '1. … 2. …' : lang === 'ar' ? 'اكتب إجابتك…' : 'Type your answer…'}
        />
      ) : null}

      {/* Oral */}
      {q.kind === 'oral' && !checked ? (
        <div className="hint">🗣 Say it out loud first, then reveal and self-grade.</div>
      ) : null}

      {/* Feedback */}
      {checked ? (
        <div style={{ marginTop: 12 }}>
          <div
            className="hint"
            style={{
              borderColor: checked.score === 1 ? 'var(--success)' : checked.score === 0.5 ? 'var(--warn)' : 'var(--danger)',
              fontWeight: 700,
            }}
          >
            {checked.score === 1 ? '✅ ' + tr('correct', lang) : checked.score === 0.5 ? '🟡 ' + tr('partialScore', lang) : '❌ ' + tr('incorrect', lang)}
          </div>
          <div className="quote" style={{ marginTop: 10, whiteSpace: 'pre-wrap' }}>
            <b>{tr('answer', lang)}:</b> {q.answer}
          </div>
          {q.explanation && q.explanation !== q.answer ? (
            <div className="muted small-txt" style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>
              📎 {q.explanation}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Actions */}
      <div className="row" style={{ marginTop: 14 }}>
        {!checked ? (
          q.kind === 'oral' ? (
            <>
              <button className="btn primary" onClick={() => setChecked({ score: 0, status: 'revealed' })}>
                👁 {tr('showAnswer', lang)}
              </button>
            </>
          ) : (
            <button className="btn primary" disabled={!canCheck} onClick={checkCurrent}>
              ✅ Check answer
            </button>
          )
        ) : q.kind === 'oral' && checked.status === 'revealed' ? (
          <>
            <button className="btn success" onClick={() => selfGrade(true)}>
              👍 {tr('yes', lang)}
            </button>
            <button className="btn danger" onClick={() => selfGrade(false)}>
              👎 {tr('no', lang)}
            </button>
          </>
        ) : (
          <button className="btn primary" onClick={nextQuestion}>
            {idx + 1 >= pool.length ? `${tr('finish', lang)} →` : `${tr('next', lang)} →`}
          </button>
        )}
      </div>
    </Card>
  )
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
