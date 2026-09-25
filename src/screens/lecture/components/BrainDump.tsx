import { useEffect, useMemo, useRef, useState } from 'react'
import type { Lecture } from '../../../types'
import { useStore } from '../../../store'
import { tr } from '../../../i18n'
import { Card, CardTitle, Pill, T } from '../../../components/ui'
import { compareDump, dumpExpected } from '../../../lib/recall'

/** 1-MINUTE BRAIN DUMP — show topic only, 60s, then compare remembered vs forgot. */
export default function BrainDump({ lecture, onDone }: { lecture: Lecture; onDone?: () => void }) {
  const { state, logExtra, recordRecall } = useStore()
  const lang = state.settings.lang
  const a = lecture.analysis
  const topicName = a.mainTopics[0] || lecture.title
  const expected = useMemo(() => dumpExpected(lecture), [lecture])

  const [left, setLeft] = useState(60)
  const [running, setRunning] = useState(false)
  const [val, setVal] = useState('')
  const [finished, setFinished] = useState(false)
  const [result, setResult] = useState<ReturnType<typeof compareDump> | null>(null)

  function finish() {
    setRunning(false)
    setFinished(true)
    const res = compareDump(val, expected)
    setResult(res)
    logExtra({ dumps: 1 })
    recordRecall({ lectureId: lecture.id, question: `Brain dump: ${topicName}`, grade: res.coverage >= 0.6 ? 'green' : res.coverage >= 0.3 ? 'yellow' : 'red', at: Date.now() })
  }

  const finishRef = useRef(finish)
  finishRef.current = finish

  useEffect(() => {
    if (!running) return
    const iv = window.setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          window.clearInterval(iv)
          window.setTimeout(() => finishRef.current(), 0)
          return 0
        }
        return l - 1
      })
    }, 1000)
    return () => window.clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  function start() {
    setRunning(true)
    setFinished(false)
    setResult(null)
    setVal('')
    setLeft(60)
  }

  if (finished && result) {
    const pct = Math.round(result.coverage * 100)
    return (
      <Card>
        <CardTitle
          title={`🧠 ${topicName} — ${tr('done', lang)}`}
          right={<Pill kind={pct >= 60 ? 'success' : 'warn'}>{pct}% {tr('coverage', lang)}</Pill>}
        />
        <div className="dump-cmp">
          <div>
            <h3 style={{ color: 'var(--success)' }}>✅ {tr('whatRemembered', lang)}</h3>
            <ul className="kb">
              {result.remembered.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
              {!result.remembered.length ? <li className="muted">—</li> : null}
            </ul>
          </div>
          <div>
            <h3 style={{ color: 'var(--danger)' }}>❌ {tr('whatForgot', lang)}</h3>
            <ul className="kb">
              {result.forgot.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
              {!result.forgot.length ? <li className="muted">🎉 {lang === 'ar' ? 'لم تنسَ شيئًا!' : 'Nothing forgotten!'}</li> : null}
            </ul>
          </div>
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn primary" onClick={start}>
            ↻ {lang === 'ar' ? 'حاول مجددًا' : 'Try again'}
          </button>
          {onDone ? (
            <button className="btn" onClick={onDone}>
              <T k="done" />
            </button>
          ) : null}
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="timer-wrap" style={{ padding: '18px 10px' }}>
        <div className="muted" style={{ fontWeight: 700, letterSpacing: '0.08em' }}>TOPIC</div>
        <h1 style={{ fontSize: '2.2rem', margin: '4px 0 10px' }}>{topicName}</h1>
        <div className="timer-clock" style={{ color: left <= 10 ? 'var(--danger)' : 'var(--primary)' }}>
          00:{String(left).padStart(2, '0')}
        </div>
        <p className="muted" style={{ margin: '8px 0 14px' }}>
          <T k="rememberAll" />
        </p>
        <textarea
          dir="auto"
          className="textarea"
          style={{ minHeight: 160, textAlign: 'start' }}
          value={val}
          disabled={!running}
          onChange={(e) => setVal(e.target.value)}
          placeholder={running ? (lang === 'ar' ? 'اكتب كل ما تتذكره…' : 'Write everything you remember…') : tr('startDump', lang)}
        />
        <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
          {!running ? (
            <button className="btn primary big" onClick={start}>
              ▶ {tr('startDump', lang)}
            </button>
          ) : (
            <button className="btn accent big" onClick={finish}>
              ✅ {tr('revealToCompare', lang)}
            </button>
          )}
        </div>
      </div>
    </Card>
  )
}
