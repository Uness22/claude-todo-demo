import { useMemo, useState } from 'react'
import type { Lecture, MnemonicOption } from '../../../types'
import { useStore } from '../../../store'
import { tr } from '../../../i18n'
import { Card, CardTitle, Pill, T } from '../../../components/ui'
import { generateMnemonics, mnemonicKindLabel } from '../../../lib/mnemonic'

export default function MnemonicsTab({ lecture }: { lecture: Lecture }) {
  const { state, chooseMnemonic } = useStore()
  const lang = state.settings.lang
  const a = lecture.analysis

  // Which list benefits most from a mnemonic?
  const target = useMemo(() => {
    const list = a.lists.filter((l) => l.items.length >= 3 && l.items.length <= 12)
    if (list.length) {
      list.sort((x, y) => x.items.length - y.items.length)
      return { title: list[0].title, items: list[0].items }
    }
    if (a.steps.length >= 3) return { title: a.stepsTitle || a.mainTopics[0] || 'Process', items: a.steps.map((s) => s.title.replace(/^\d+\.\s*/, '')) }
    return null
  }, [a])

  const [seed, setSeed] = useState(0)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const options: MnemonicOption[] = useMemo(() => (target ? generateMnemonics(target.items, target.title + seed) : []), [target, seed])

  const saved = lecture.customMnemonic || ''
  const selectedId = lecture.mnemonicChoice

  if (!target) {
    return (
      <Card>
        <div className="empty">
          <div className="ico">🧠</div>
          No list or process with 3+ items was found in this lecture, so a first-letter mnemonic does not apply.
          <div className="muted small-txt" style={{ marginTop: 8 }}>Try a lecture with steps, principles, or lists.</div>
        </div>
      </Card>
    )
  }

  return (
    <div>
      <Card>
        <CardTitle
          title={<>🧠 {tr('mnemonics', lang)}</>}
          sub={`${target.title} — ${target.items.length} items`}
          right={
            <button className="btn small" onClick={() => setSeed((s) => s + 1)}>
              🎲 {tr('generateOptions', lang)}
            </button>
          }
        />

        {/* ORIGINAL INFORMATION — never altered */}
        <h4 style={{ color: 'var(--primary)', letterSpacing: '0.06em', fontSize: '0.8rem' }}>
          {tr('originalInfo', lang).toUpperCase()}
        </h4>
        <ol className="kb">
          {target.items.map((it, i) => (
            <li key={i}>
              <span className="n">{i + 1}.</span>
              {it}
            </li>
          ))}
        </ol>
      </Card>

      {/* Saved mnemonic */}
      {saved ? (
        <Card>
          <CardTitle
            title="✅ Saved Memory Trick"
            right={
              <div className="row" style={{ gap: 6 }}>
                <button
                  className="btn small"
                  onClick={() => {
                    setDraft(saved)
                    setEditing(true)
                  }}
                >
                  ✏️ {tr('editSave', lang)}
                </button>
                <button className="btn small ghost" onClick={() => chooseMnemonic(lecture.id, '', '')}>
                  ✕
                </button>
              </div>
            }
          />
          <div className="quote" style={{ fontSize: '1.05rem', fontWeight: 650 }}>
            {saved}
          </div>
          <div className="muted small-txt" style={{ marginTop: 6 }}>
            {tr('memoryTrick', lang)} — the original list above stays the source of truth.
          </div>
        </Card>
      ) : null}

      {/* Candidates */}
      <div className="grid cols-2" style={{ marginTop: 14 }}>
        {options.map((o, i) => (
          <Card key={o.id} className={selectedId === o.id ? 'selected' : ''} style={selectedId === o.id ? { borderColor: 'var(--primary)' } : undefined}>
            <div className="row between">
              <Pill kind={i === 0 ? 'success' : 'primary'}>{i === 0 ? `⭐ ${tr('easiest', lang)}` : `#${i + 1}`}</Pill>
              <Pill>{mnemonicKindLabel(o.kind)}</Pill>
            </div>
            <div className="quote" style={{ fontSize: '1.02rem', fontWeight: 650, marginTop: 10 }}>
              {o.text}
            </div>

            <h4 style={{ margin: '12px 0 4px', fontSize: '0.78rem', color: 'var(--text-muted)', letterSpacing: '0.07em' }}>
              {tr('meaning', lang).toUpperCase()}
            </h4>
            <div className="small-txt mono" style={{ lineHeight: 1.7 }}>
              {o.mapping.map((m) => (
                <div key={m.letter + m.item}>
                  <b style={{ color: 'var(--primary)' }}>{m.letter}</b> = {m.item}
                </div>
              ))}
            </div>

            <div className="row" style={{ marginTop: 12 }}>
              <button
                className={`btn small ${saved === o.text ? 'success' : 'primary'}`}
                disabled={saved === o.text}
                onClick={() => chooseMnemonic(lecture.id, o.id, o.text)}
              >
                {saved === o.text ? '✓ ' : ''}
                {tr('chooseFavorite', lang)}
              </button>
              <button
                className="btn small"
                onClick={() => {
                  setDraft(o.text)
                  setEditing(true)
                }}
              >
                ✏️ {tr('editSave', lang)}
              </button>
            </div>
          </Card>
        ))}
      </div>

      {editing && (
        <Card>
          <CardTitle title="✏️ Edit memory trick" />
          <textarea className="textarea" style={{ minHeight: 90 }} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="row" style={{ marginTop: 10 }}>
            <button
              className="btn primary"
              onClick={() => {
                chooseMnemonic(lecture.id, 'custom', draft.trim())
                setEditing(false)
              }}
            >
              💾 {tr('saved', lang)}
            </button>
            <button className="btn ghost" onClick={() => setEditing(false)}>
              <T k="cancel" />
            </button>
          </div>
          <p className="muted small-txt">
            Rule: the mnemonic is only a memory hook — it must never change the scientific meaning of the original items.
          </p>
        </Card>
      )}
    </div>
  )
}
