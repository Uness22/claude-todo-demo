import { useRef, useState } from 'react'
import type { Route } from '../App'
import { useStore } from '../store'
import { tr } from '../i18n'
import { Card, CardTitle, T } from '../components/ui'
import { DEMO_TEXT, DEMO_TITLE } from '../lib/demo'
import { deriveTitle, extractText } from '../lib/parse'

type Phase = 'idle' | 'analyzing' | 'done'

const ANALYZE_STEPS = [
  'Reading full lecture...',
  'Finding main topics & subtopics...',
  'Extracting definitions, terms, numbers...',
  'Detecting steps, lists & comparisons...',
  'Building levels & mnemonics...',
  'Generating flashcards & questions...',
  'Scheduling spaced reviews...',
]

export default function Upload({ go }: { go: (r: Route) => void }) {
  const { addLecture, state } = useStore()
  const lang = state.settings.lang
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [stepIdx, setStepIdx] = useState(0)
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [drag, setDrag] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const busy = phase === 'analyzing'

  async function handleFiles(files: FileList | File[]) {
    setErr('')
    const list = [...files]
    if (!list.length) return
    const parts: string[] = []
    let anyOk = false
    for (const f of list) {
      const res = await extractText(f)
      if (res.ok) {
        anyOk = true
        parts.push(res.text)
        setNote(res.note)
      } else {
        setErr((e) => (e ? e + ' · ' : '') + `${f.name}: ${res.error}`)
      }
    }
    if (anyOk) {
      const merged = parts.join('\n\n---\n\n')
      setText((t) => (t ? t + '\n\n' + merged : merged))
      if (!title && list.length === 1) setTitle(deriveTitle(merged, list[0].name))
    }
  }

  function analyze(useText: string, useTitle: string, fileName?: string) {
    if (!useText.trim()) {
      setErr(lang === 'ar' ? 'الصق المحاضرة أولًا' : 'Paste the lecture first.')
      return
    }
    setPhase('analyzing')
    setStepIdx(0)
    const iv = window.setInterval(() => setStepIdx((i) => Math.min(i + 1, ANALYZE_STEPS.length - 1)), 260)
    window.setTimeout(() => {
      window.clearInterval(iv)
      const lec = addLecture(useText, fileName, useTitle || undefined)
      setPhase('done')
      window.setTimeout(() => go({ name: 'lecture', id: lec.id, tab: 'overview' }), 850)
    }, 2050)
  }

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      <h1>
        <T k="uploadTitle" />
      </h1>
      <p className="muted">
        <T k="uploadHint" />
      </p>

      {phase === 'analyzing' ? (
        <Card>
          <div className="analyzing">
            <div className="spinner" />
            <h2>
              <T k="analyzing" />
            </h2>
            <div className="muted">{ANALYZE_STEPS[stepIdx]}</div>
            <div className="muted small-txt">
              <T k="analyzingStep" />
            </div>
          </div>
        </Card>
      ) : phase === 'done' ? (
        <Card>
          <div className="analyzing">
            <div style={{ fontSize: '2.6rem' }}>✅</div>
            <h2 style={{ color: 'var(--success)' }}>
              <T k="converted" />
            </h2>
            <div className="muted">Opening your study workspace…</div>
          </div>
        </Card>
      ) : (
        <>
          <Card>
            <div
              className={`dropzone ${drag ? 'drag' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDrag(true)
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDrag(false)
                handleFiles(e.dataTransfer.files)
              }}
            >
              <div className="big-ico">📄</div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>
                <T k="chooseFiles" />
              </div>
              <div className="muted small-txt">PDF · PPTX · DOCX · TXT · MD</div>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.md,.markdown"
                hidden
                onChange={(e) => {
                  if (e.target.files) handleFiles(e.target.files)
                  e.target.value = ''
                }}
              />
            </div>
            {note ? <div className="hint" style={{ marginTop: 10 }}>✅ {note}</div> : null}
            {err ? <div className="hint" style={{ marginTop: 10, borderColor: 'var(--danger)' }}>⚠️ {err}</div> : null}

            <div className="divider" />
            <label className="field">
              <T k="lectureTitle" />
            </label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={lang === 'ar' ? 'مثال: محاضرة HACCP' : 'e.g. HACCP Lecture 1'} />
          </Card>

          <Card>
            <CardTitle title={<T k="orPaste" />} sub={lang === 'ar' ? 'الصق نص المحاضرة أو ملاحظاتك كاملة — بدون الحاجة لتحريرها' : 'Paste the full text or your notes — no cleanup needed'} />
            <textarea
              dir="auto"
              className="textarea"
              style={{ minHeight: 220 }}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={'1. Topic\n- point one\n- point two\n\nTerm: definition of the term ...'}
            />
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn primary big" disabled={busy} onClick={() => analyze(text, title)}>
                🔬 <T k="analyze" />
              </button>
              <button
                className="btn big"
                onClick={() => analyze(DEMO_TEXT, DEMO_TITLE, 'demo-haccp.txt')}
                title="Test the full pipeline on a real lecture"
              >
                🎓 {tr('demoLecture', lang)}
              </button>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
