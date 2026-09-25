import { Fragment } from 'react'
import type { Lecture } from '../../../types'
import { useStore } from '../../../store'
import { tr } from '../../../i18n'
import { T } from '../../../components/ui'
import { generateMnemonics } from '../../../lib/mnemonic'

/** One-page cheat sheet: everything that matters before the exam. */
export default function CheatSheet({ lecture }: { lecture: Lecture }) {
  const { state } = useStore()
  const lang = state.settings.lang
  const a = lecture.analysis

  // Best mnemonic: student's saved choice → top generated option
  const list = a.lists.find((l) => l.items.length >= 3 && l.items.length <= 10)
  const options = list
    ? generateMnemonics(list.items, list.title)
    : a.steps.length >= 3
      ? generateMnemonics(a.steps.map((s) => s.title), a.stepsTitle)
      : []
  const mnText = lecture.customMnemonic || options[0]?.text

  const traps = [
    ...a.comparisons.map((c) => `${c.a} vs ${c.b} — don't mix them up.`),
    ...a.verbatim.filter((v) => /\b(never|always|must|only|not)\b/i.test(v)).slice(0, 3),
  ]

  const quick = [
    ...a.definitions.slice(0, 3).map((d) => `What is ${d.term}?`),
    ...(a.steps.length >= 3 ? [`Order of ${a.stepsTitle || 'the process'}?`] : []),
    ...(a.lists.length ? [`List: ${a.lists[0].title}`] : []),
  ].slice(0, 5)

  const has = (arr: unknown[]) => arr.length > 0

  return (
    <div className="cheat">
      <div className="row between no-print" style={{ marginBottom: 6 }}>
        <h2 style={{ margin: 0 }}>📋 {lecture.title}</h2>
        <button className="btn small" onClick={() => window.print()}>
          🖨 <T k="print" />
        </button>
      </div>

      <h3>⭐ {tr('mustKnowShort', lang)}</h3>
      <ul>
        {(has(a.verbatim) ? a.verbatim.slice(0, 4) : a.bigPicture.slice(0, 3)).map((v, i) => (
          <li key={i}>{v}</li>
        ))}
      </ul>

      <div className="row" style={{ gap: 24, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h3>🔑 {tr('keyTermsL', lang)}</h3>
          <div className="kv">
            {a.terms.slice(0, 8).map((t) => (
              <span key={t.term}>
                <b>{t.term}</b>
              </span>
            ))}
          </div>

          <h3>📖 {tr('defsL', lang)}</h3>
          <div className="kv">
            {a.definitions.slice(0, 6).map((d) => (
              <Fragment key={d.id}>
                <b>{d.term}</b>
                <span>{d.text.length > 130 ? d.text.slice(0, 130) + '…' : d.text}</span>
              </Fragment>
            ))}
          </div>

          <h3>🔢 NUMBERS</h3>
          <ul>
            {a.numbers.slice(0, 5).map((n) => (
              <li key={n.id}>
                <b>{n.value}</b> — {n.context.length > 100 ? n.context.slice(0, 100) + '…' : n.context}
              </li>
            ))}
            {!a.numbers.length ? <li className="muted">—</li> : null}
          </ul>
        </div>

        <div style={{ flex: 1, minWidth: 240 }}>
          <h3>🧭 {tr('stepsL', lang)}</h3>
          {a.steps.length ? (
            <div className="arrow-flow">
              {a.steps.map((s, i) => (
                <span key={s.id} className="row" style={{ gap: 6 }}>
                  <span className="step">
                    {i + 1}. {s.title.replace(/^\d+\.\s*/, '')}
                  </span>
                  {i < a.steps.length - 1 ? <span className="arr">→</span> : null}
                </span>
              ))}
            </div>
          ) : (
            <div className="muted">—</div>
          )}

          <h3>🧮 {tr('formulasL', lang)}</h3>
          <ul>
            {a.formulas.map((f) => (
              <li key={f.id} className="mono">
                {f.value}
              </li>
            ))}
            {!a.formulas.length ? <li className="muted">—</li> : null}
          </ul>

          <h3>🧠 {tr('mnemonicsL', lang)}</h3>
          {mnText ? (
            <div className="quote">
              <b>{mnText}</b>
              {options[0] && !lecture.customMnemonic ? (
                <div className="muted small-txt" style={{ marginTop: 4 }}>
                  {options[0].mapping.map((m) => `${m.letter}→${m.item}`).join('  ')}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="muted">—</div>
          )}
        </div>
      </div>

      <h3>🪤 COMMON EXAM TRAPS</h3>
      <ul>
        {traps.slice(0, 4).map((t, i) => (
          <li key={i}>{t}</li>
        ))}
        {!traps.length ? <li className="muted">—</li> : null}
      </ul>

      <h3>⚡ QUICK RECALL QUESTIONS</h3>
      <ul>
        {quick.map((q, i) => (
          <li key={i}>
            <b>{q}</b>
          </li>
        ))}
      </ul>

      <div className="row" style={{ marginTop: 10 }}>
        <span className="muted small-txt">Generated only from this lecture · UNCLEAR items are flagged, never invented.</span>
      </div>
    </div>
  )
}
