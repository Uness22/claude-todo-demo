import { useMemo, useState } from 'react'
import type { Lecture, Question, TopicStat } from '../../../types'
import { uid } from '../../../types'
import { useStore } from '../../../store'
import { tr } from '../../../i18n'
import { Card, Pill, Progress, T } from '../../../components/ui'
import { evaluateAnswer, examSet, generateQuestions } from '../../../lib/quiz'
import { truncate } from '../../../lib/text'
import { classifyTopics, topicMasteryList } from '../../../lib/mastery'

/**
 * EXAM MODE — hides explanations, mnemonics and answers.
 * Questions only, simulated conditions, scored with weakness report.
 */
export default function ExamTab({ lecture }: { lecture: Lecture }) {
  const { state, recordAttempt } = useStore()
  const lang = state.settings.lang
  const bank = useMemo(() => generateQuestions(lecture), [lecture])

  const [phase, setPhase] = useState<'intro' | 'run' | 'result'>('intro')
  const [qs, setQs] = useState<Question[]>([])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [marks, setMarks] = useState<Record<string, 0 | 0.5 | 1>>({})
  const [startedAt, setStartedAt] = useState(0)
  const [warn, setWarn] = useState('')

  const q = qs[idx]

  function begin() {
    if (!bank.length) return
    setQs(examSet(bank, Math.min(12, bank.length)))
    setIdx(0)
    setAnswers({})
    setMarks({})
    setWarn('')
    setStartedAt(Date.now())
    setPhase('run')
  }

  function finish() {
    const unanswered = qs.filter((x) => !answers[x.id])
    if (unanswered.length) {
      setWarn(`${tr('allAnswered', lang)} (${unanswered.length} left)`)
      const first = qs.findIndex((x) => !answers[x.id])
      if (first >= 0) setIdx(first)
      return
    }
    const perTopic: Record<string, TopicStat> = {}
    const wrong: string[] = []
    let correct = 0
    for (const qq of qs) {
      const a = answers[qq.id]
      let score: 0 | 0.5 | 1 = 0
      if (qq.kind === 'mcq' || qq.kind === 'tf') score = a === qq.answer ? 1 : 0
      else score = evaluateAnswer(qq, a).score
      if (score < 1) wrong.push(qq.id)
      correct += score
      if (!perTopic[qq.topic]) perTopic[qq.topic] = { correct: 0, total: 0 }
      perTopic[qq.topic].correct += score
      perTopic[qq.topic].total += 1
    }
    setMarks(Object.fromEntries(qs.map((x) => [x.id, answers[x.id] ? (x.kind === 'mcq' || x.kind === 'tf' ? (answers[x.id] === x.answer ? 1 : 0) : evaluateAnswer(x, answers[x.id]).score) : 0])) as Record<string, 0 | 0.5 | 1>)
    recordAttempt({
      id: uid('att'),
      lectureId: lecture.id,
      at: Date.now(),
      mode: 'exam',
      correct,
      total: qs.length,
      perTopic,
      wrongQuestionIds: wrong,
      durationMs: Date.now() - startedAt,
    })
    setPhase('result')
  }

  // ---------- Result ----------
  if (phase === 'result') {
    const correct = Object.values(marks).reduce<number>((s, m) => s + m, 0)
    const pct = qs.length ? Math.round((correct / qs.length) * 100) : 0
    const topics = topicMasteryList(
      Object.entries(marks).reduce<Record<string, TopicStat>>((acc, [qid, m]) => {
        const qq = qs.find((x) => x.id === qid)
        if (!qq) return acc
        if (!acc[qq.topic]) acc[qq.topic] = { correct: 0, total: 0 }
        acc[qq.topic].correct += m
        acc[qq.topic].total += 1
        return acc
      }, {}),
    )
    const cls = classifyTopics(topics)
    const wrongQs = qs.filter((x) => (marks[x.id] || 0) < 1)

    return (
      <Card>
        <div className="analyzing">
          <div className="result-ring" style={{ ['--pct' as string]: pct }}>
            <span>{pct}%</span>
          </div>
          <h2>
            {correct}/{qs.length} {tr('score', lang)}
          </h2>
          <Pill kind={pct >= 85 ? 'success' : pct >= 60 ? 'primary' : 'danger'}>
            {pct >= 85 ? '🏆 Exam ready' : pct >= 60 ? '📈 Almost there' : '📖 Needs review'}
          </Pill>
        </div>

        <div className="grid cols-3">
          <div>
            <h3 style={{ color: 'var(--success)' }}>💪 {tr('strongResults', lang)}</h3>
            {cls.strong.length ? (
              <ul className="kb">
                {cls.strong.map((t) => (
                  <li key={t.topic}>
                    {t.topic} ({t.pct}%)
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small-txt">—</p>
            )}
          </div>
          <div>
            <h3 style={{ color: 'var(--danger)' }}>⚠ {tr('weakResults', lang)}</h3>
            {cls.weak.length ? (
              <ul className="kb">
                {cls.weak.map((t) => (
                  <li key={t.topic}>
                    {t.topic} ({t.pct}%)
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small-txt">—</p>
            )}
          </div>
          <div>
            <h3 style={{ color: 'var(--warn)' }}>🔁 {tr('reviewTopics', lang)}</h3>
            {cls.review.length ? (
              <ul className="kb">
                {cls.review.map((t) => (
                  <li key={t.topic}>
                    {t.topic} ({t.pct}%)
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small-txt">—</p>
            )}
          </div>
        </div>

        <h3 style={{ marginTop: 14 }}>🟥 {tr('wrongQuestions', lang)}</h3>
        {wrongQs.length ? (
          <div className="col" style={{ gap: 8 }}>
            {wrongQs.map((wq) => (
              <div key={wq.id} className="card" style={{ padding: 12, boxShadow: 'none' }}>
                <div className="small-txt" style={{ fontWeight: 700 }}>
                  {truncate(wq.prompt, 150)}
                </div>
                <div className="small-txt" style={{ color: 'var(--success)' }}>✓ {truncate(wq.answer, 150)}</div>
                <div className="small-txt muted">You: {truncate(answers[wq.id] || '—', 120)}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted small-txt">🎉 No wrong answers.</p>
        )}

        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn primary" onClick={begin}>
            ↻ {tr('startExam', lang)}
          </button>
        </div>
      </Card>
    )
  }

  // ---------- Intro ----------
  if (phase === 'intro') {
    return (
      <Card>
        <div className="analyzing">
          <div style={{ fontSize: '2.6rem' }}>🎯</div>
          <h1>{tr('examMode', lang)}</h1>
          <div className="quote" style={{ textAlign: 'start', maxWidth: 560 }}>
            <T k="examIntro" />
            <ul style={{ margin: '8px 0 0', paddingInlineStart: 20 }}>
              <li>🚫 {lang === 'ar' ? 'لا شرح' : 'No explanations'}</li>
              <li>🚫 {lang === 'ar' ? 'لا جمل تذكّر' : 'No mnemonics'}</li>
              <li>🚫 {lang === 'ar' ? 'لا إجابات' : 'No answers until you finish'}</li>
              <li>✅ {lang === 'ar' ? 'نتيجة + مواضيع الضعف' : 'Score + weakness report at the end'}</li>
            </ul>
          </div>
          <p className="muted">
            {Math.min(12, bank.length)} {tr('questionCount', lang)} · {tr('professorNote', lang)}
          </p>
          <button className="btn primary big" onClick={begin} disabled={!bank.length}>
            {tr('startExam', lang)}
          </button>
        </div>
      </Card>
    )
  }

  // ---------- Running ----------
  const answeredNow = answers[q.id] || ''
  const isChoice = q.kind === 'mcq' || q.kind === 'tf'

  return (
    <Card>
      <div className="row between">
        <Pill kind="danger">🎯 {tr('examMode', lang)}</Pill>
        <Pill kind="primary">
          {idx + 1} / {qs.length}
        </Pill>
      </div>
      <div style={{ margin: '10px 0' }}>
        <Progress pct={((idx + 1) / qs.length) * 100} thin />
      </div>

      <div className="q-meta">
        <Pill kind="accent">{q.topic}</Pill>
        <Pill>{q.kind.toUpperCase()}</Pill>
      </div>
      <div className="q-prompt">{q.prompt}</div>

      {isChoice && q.options ? (
        <div className="q-options">
          {q.options.map((o, i) => (
            <button key={i} className={`q-opt ${answeredNow === o ? 'selected' : ''}`} onClick={() => setAnswers((a) => ({ ...a, [q.id]: o }))}>
              <span className="key">{String.fromCharCode(65 + i)}.</span> {o}
            </button>
          ))}
        </div>
      ) : (
        <textarea
          className="textarea"
          style={{ minHeight: 110 }}
          value={answeredNow}
          onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
          placeholder={lang === 'ar' ? 'اكتب إجابتك…' : 'Your answer…'}
        />
      )}

      {warn ? <div className="hint" style={{ marginTop: 10, borderColor: 'var(--danger)' }}>⚠ {warn}</div> : null}

      <div className="row between" style={{ marginTop: 16 }}>
        <button className="btn" disabled={idx === 0} onClick={() => setIdx((i) => Math.max(0, i - 1))}>
          ← <T k="goback" />
        </button>
        {idx + 1 < qs.length ? (
          <button className="btn primary" onClick={() => setIdx((i) => i + 1)}>
            {tr('next', lang)} →
          </button>
        ) : (
          <button className="btn success" onClick={finish}>
            🏁 {tr('finish', lang)}
          </button>
        )}
      </div>
    </Card>
  )
}
