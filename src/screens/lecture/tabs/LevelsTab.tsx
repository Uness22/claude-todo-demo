import { useState } from 'react'
import type { Lecture } from '../../../types'
import { useStore } from '../../../store'
import { tr } from '../../../i18n'
import { Card, CardTitle, Pill, T } from '../../../components/ui'
import { easyExplain } from '../../../lib/analyze'
import CheatSheet from '../components/CheatSheet'
import RapidReview from '../components/RapidReview'
import BrainDump from '../components/BrainDump'

type Mode = 'levels' | 'full' | 'detailed' | 'easy' | 'exam' | 'onepage' | 'five' | 'one'

const LADDER: { id: Mode; label: string }[] = [
  { id: 'full', label: 'fullLecture' },
  { id: 'detailed', label: 'detailedNotes' },
  { id: 'easy', label: 'easyNotes' },
  { id: 'exam', label: 'examNotes' },
  { id: 'onepage', label: 'onePage' },
  { id: 'five', label: 'fiveMin' },
  { id: 'one', label: 'oneMin' },
]

export default function LevelsTab({ lecture }: { lecture: Lecture }) {
  const { state } = useStore()
  const lang = state.settings.lang
  const a = lecture.analysis
  const [mode, setMode] = useState<Mode>('levels')
  const easy = easyExplain(a)

  return (
    <div>
      {/* Compression ladder */}
      <div className="row no-print" style={{ marginBottom: 14 }}>
        <span className="muted small-txt" style={{ fontWeight: 800 }}>
          <T k="compressedLevels" />:
        </span>
        <div className="tabs" style={{ marginBottom: 0 }}>
          <button className={`tab ${mode === 'levels' ? 'active' : ''}`} onClick={() => setMode('levels')}>
            🪜 L1–L4
          </button>
          {LADDER.map((l, i) => (
            <button key={l.id} className={`tab ${mode === l.id ? 'active' : ''}`} onClick={() => setMode(l.id)}>
              {i + 1}. <T k={l.label} />
            </button>
          ))}
        </div>
      </div>

      {mode === 'levels' && (
        <div className="grid cols-2">
          {/* L1 Big picture */}
          <Card>
            <CardTitle title={<T k="level1" />} right={<Pill kind="primary">Level 1</Pill>} />
            {a.bigPicture.map((s, i) => (
              <div className="quote" key={i}>
                {s}
              </div>
            ))}
            {!a.bigPicture.length ? (
              <div className="muted">
                <T k="emptySection" />
              </div>
            ) : null}
          </Card>

          {/* L2 Easy explanation */}
          <Card>
            <CardTitle title={<T k="level2" />} right={<Pill kind="accent">Level 2</Pill>} />
            <div className="col" style={{ gap: 12 }}>
              {easy.slice(0, 6).map((e, i) => (
                <div key={i}>
                  <b>{e.term}</b>
                  <ul style={{ margin: '4px 0', paddingInlineStart: 18 }}>
                    {e.plain.map((p, j) => (
                      <li key={j}>{p}</li>
                    ))}
                  </ul>
                  {/\bbecause\b/i.test(e.original) && e.original.split(/\bbecause\b/i).length > 1 ? (
                    <div className="small-txt" style={{ color: 'var(--accent)' }}>
                      <T k="because" />: {e.original.split(/\bbecause\b/i)[0].trim()} → {e.original.split(/\bbecause\b/i)[1]?.trim()}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>

          {/* L3 Exam knowledge */}
          <Card>
            <CardTitle title={<T k="level3" />} right={<Pill kind="warn">Level 3</Pill>} />
            <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--primary)', letterSpacing: '0.06em' }}>
              <T k="mustKnow" />
            </h4>
            <ul className="kb">
              {(a.verbatim.length ? a.verbatim.slice(0, 6) : a.bigPicture).map((v, i) => (
                <li key={i}>{v}</li>
              ))}
              {a.steps.length ? (
                <li>
                  <span className="n">+</span> Order: {a.steps.map((s, i) => `${i + 1}. ${s.title.replace(/^\d+\.\s*/, '')}`).join(' → ')}
                </li>
              ) : null}
              {a.numbers.slice(0, 3).map((n) => (
                <li key={n.id}>
                  <span className="n">#</span> {n.value}
                </li>
              ))}
            </ul>
          </Card>

          {/* L4 Memorization */}
          <Card>
            <CardTitle title={<T k="level4" />} right={<Pill kind="danger">Level 4</Pill>} />
            <div className="col" style={{ gap: 8 }}>
              {a.verbatim.slice(0, 5).map((v, i) => (
                <div key={i} className="quote small-txt">
                  🔒 {v}
                </div>
              ))}
              {!a.verbatim.length ? <div className="muted small-txt">Nothing flagged as verbatim in this lecture.</div> : null}
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn small primary" onClick={() => setMode('five')}>
                ⚡ <T k="fiveMin" />
              </button>
              <button className="btn small" onClick={() => setMode('one')}>
                🧠 <T k="oneMin" />
              </button>
            </div>
            <p className="muted small-txt" style={{ marginTop: 8 }}>
              Mnemonics live in the Mnemonics tab — they never replace the original information.
            </p>
          </Card>
        </div>
      )}

      {mode === 'full' && (
        <Card>
          <CardTitle title={<T k="fullLecture" />} />
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.92rem', lineHeight: 1.65 }}>{lecture.rawText}</pre>
        </Card>
      )}

      {mode === 'detailed' && (
        <Card>
          <CardTitle title={<T k="detailedNotes" />} sub={`${a.sections.length} sections`} />
          {a.sections.map((sec) => (
            <div key={sec.id} style={{ marginBottom: 16 }}>
              <h3>{sec.title}</h3>
              <div className="muted small-txt" style={{ whiteSpace: 'pre-wrap' }}>
                {sec.body.slice(0, 900)}
                {sec.body.length > 900 ? '…' : ''}
              </div>
              {a.lists
                .filter((l) => l.sectionId === sec.id)
                .map((l) => (
                  <ul key={l.id} style={{ margin: '6px 0' }}>
                    {l.items.map((it, i) => (
                      <li key={i}>{it}</li>
                    ))}
                  </ul>
                ))}
            </div>
          ))}
        </Card>
      )}

      {mode === 'easy' && (
        <Card>
          <CardTitle title={<T k="easyNotes" />} sub="Short sentences · plain words · meaning preserved" />
          <div className="col" style={{ gap: 14 }}>
            {easy.map((e, i) => (
              <div key={i}>
                <b>{e.term}</b>
                <p style={{ margin: '4px 0 0' }}>{e.plain.join(' ')}</p>
                <p className="muted small-txt" style={{ margin: 0 }}>
                  ↳ {tr('originalInfo', lang)}: {e.original}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {mode === 'exam' && (
        <Card>
          <CardTitle title={<T k="examNotes" />} sub={<T k="potentialExamQ" />} />
          <ul className="kb">
            {a.examHints.map((h, i) => (
              <li key={h.id}>
                <span className="n">{i + 1}.</span>
                {h.text}
              </li>
            ))}
          </ul>
          <h4 style={{ marginTop: 14 }}>
            <T k="verbatim" />
          </h4>
          <ul>
            {a.verbatim.slice(0, 6).map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
          <h4>
            <T k="understandOnly" />
          </h4>
          <ul>
            {a.understandOnly.slice(0, 5).map((v, i) => (
              <li key={i} className="muted">
                {v}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {mode === 'onepage' && (
        <Card>
          <CheatSheet lecture={lecture} />
        </Card>
      )}

      {mode === 'five' && <RapidReview lecture={lecture} onClose={() => setMode('levels')} />}

      {mode === 'one' && <BrainDump lecture={lecture} onDone={() => setMode('levels')} />}
    </div>
  )
}
