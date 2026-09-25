import { useEffect, useMemo, useRef, useState } from 'react'
import type { Lecture } from '../../../types'
import { Pill, T, fmtTime } from '../../../components/ui'
import { generateMnemonics } from '../../../lib/mnemonic'

const PAGES = 5
const TOTAL = 5 * 60 * 1000 // 5 minutes

/**
 * 5-MINUTE REVIEW — refresh the entire lecture in 5 minutes.
 * Big timer + auto-advancing pages of only the highest-value info.
 */
export default function RapidReview({ lecture, onClose }: { lecture: Lecture; onClose: () => void }) {
  const a = lecture.analysis
  const [running, setRunning] = useState(false)
  const [left, setLeft] = useState(TOTAL)
  const [page, setPage] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    if (!running) return
    const iv = window.setInterval(() => setLeft((l) => Math.max(0, l - 1000)), 1000)
    return () => window.clearInterval(iv)
  }, [running])

  useEffect(() => {
    const elapsedPct = 1 - left / TOTAL
    setPage(Math.min(PAGES - 1, Math.max(0, Math.floor(elapsedPct * PAGES))))
    if (left === 0) setRunning(false)
  }, [left])

  const list = a.lists.find((l) => l.items.length >= 3)
  const mn = useMemo(() => {
    const src = list ? list.items : a.steps.length ? a.steps.map((s) => s.title) : []
    return src.length ? generateMnemonics(src)[0] : null
  }, [list, a.steps])

  const pages: { title: string; items: string[] }[] = [
    {
      title: '⭐ MUST KNOW',
      items: (a.verbatim.length ? a.verbatim.slice(0, 5) : a.bigPicture).slice(0, 5),
    },
    {
      title: '📖 DEFINITIONS',
      items: a.definitions.slice(0, 6).map((d) => `${d.term} — ${d.text.length > 110 ? d.text.slice(0, 110) + '…' : d.text}`),
    },
    {
      title: '🧭 STEPS + 🔢 NUMBERS',
      items: [
        ...(a.steps.length ? [a.steps.map((s, i) => `${i + 1}. ${s.title.replace(/^\d+\.\s*/, '')}`).join(' → ')] : []),
        ...a.numbers.slice(0, 4).map((n) => `${n.value}`),
      ],
    },
    {
      title: '📋 LISTS + COMPARISONS',
      items: [
        ...a.lists.slice(0, 2).map((l) => `${l.title}: ${l.items.slice(0, 7).join(', ')}`),
        ...a.comparisons.slice(0, 2).map((c) => `${c.a} vs ${c.b}: ${c.text.length > 100 ? c.text.slice(0, 100) + '…' : c.text}`),
      ],
    },
    {
      title: '🧠 MNEMONIC + EXAM HINTS',
      items: [
        ...(mn ? [mn.text] : []),
        ...a.examHints.slice(0, 5).map((h) => h.text),
      ],
    },
  ].map((p) => ({ ...p, items: p.items.filter(Boolean) }))

  const current = pages[Math.min(page, pages.length - 1)]

  if (!running && left === TOTAL && !started.current) {
    return (
      <div className="card">
        <div className="analyzing">
          <div style={{ fontSize: '2.6rem' }}>⚡</div>
          <h2>
            <T k="fiveMinReview" />
          </h2>
          <p className="muted">
            <T k="fiveMinGoal" />
          </p>
          <button
            className="btn primary big"
            onClick={() => {
              started.current = true
              setRunning(true)
            }}
          >
            ▶ Start
          </button>
          <button className="btn ghost" onClick={onClose}>
            <T k="close" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="row between no-print">
        <div className="timer-clock" style={{ fontSize: '2.6rem', color: left < 60000 ? 'var(--danger)' : 'var(--primary)' }}>
          {fmtTime(left)}
        </div>
        <div className="row">
          <span className="pill primary">
            Page {page + 1}/{pages.length}
          </span>
          <button className="btn small" onClick={() => setRunning((r) => !r)}>
            {running ? '⏸' : '▶'}
          </button>
          <button className="btn small danger" onClick={onClose}>
            <T k="close" />
          </button>
        </div>
      </div>
      <div className="progress thin" style={{ margin: '10px 0 16px' }}>
        <div style={{ width: `${(1 - left / TOTAL) * 100}%` }} />
      </div>

      <h2>{current.title}</h2>
      <ul className="kb">
        {current.items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>

      <div className="row no-print" style={{ marginTop: 16 }}>
        <button className="btn small" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
          ← Prev
        </button>
        <button className="btn small" disabled={page >= pages.length - 1} onClick={() => setPage((p) => Math.min(pages.length - 1, p + 1))}>
          Next →
        </button>
        {left === 0 ? <Pill kind="success">✅ 5 minutes done — lecture refreshed!</Pill> : null}
      </div>
    </div>
  )
}
