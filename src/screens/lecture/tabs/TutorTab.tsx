import { useEffect, useMemo, useRef, useState } from 'react'
import type { Lecture, TutorMessage } from '../../../types'
import { uid } from '../../../types'
import { useStore } from '../../../store'
import { Card, CardTitle, T } from '../../../components/ui'
import { TUTOR_SUGGESTIONS, tutorReply } from '../../../lib/tutor'

export default function TutorTab({ lecture }: { lecture: Lecture }) {
  const { state, addTutorMsg } = useStore()
  const lang = state.settings.lang
  const msgs = state.tutorChats[lecture.id] || []
  const [input, setInput] = useState('')
  const [hideAnswers, setHideAnswers] = useState(false)
  const [thinking, setThinking] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs.length, thinking])

  // Snapshot the timestamp once; the welcome text itself stays memoized on title+lang.
  const [welcomeAt] = useState(() => Date.now())
  const welcome = useMemo<TutorMessage>(
    () => ({
      id: 'welcome',
      role: 'bot',
      text:
        lang === 'ar'
          ? `🎓 أنا معلّمك لمحاضرة “${lecture.title}”. \nأجيب فقط من هذه المحاضرة — وإن لم تكن في المادة سأقول: تحتاج تحقّقًا (NEEDS VERIFICATION). \nاسألني أي شيء (عربي أو English).`
          : `🎓 I'm your tutor for “${lecture.title}”. \nI answer ONLY from this lecture — if it's not in the material, I'll say NEEDS VERIFICATION. \nAsk me anything (English or عربي).`,
      at: welcomeAt,
    }),
    [lecture.title, lang, welcomeAt],
  )

  function send(text: string) {
    const t = text.trim()
    if (!t) return
    setInput('')
    // oxlint-disable-next-line react/purity -- Date.now() runs inside the send() event handler, not during render
    const userMsg: TutorMessage = { id: uid('msg'), role: 'user', text: t, at: Date.now() }
    addTutorMsg(lecture.id, userMsg)
    setThinking(true)
    window.setTimeout(() => {
      const reply = tutorReply(t, lecture, { hideAnswers })
      addTutorMsg(lecture.id, { id: uid('msg'), role: 'bot', text: reply.text, at: Date.now() })
      if (/show answer/i.test(t)) setHideAnswers(false)
      if (/(do ?n.?t|don't|without).*(show|give).*answer/i.test(t)) setHideAnswers(true)
      setThinking(false)
    }, 350)
  }

  const list = msgs.length ? msgs : [welcome]

  return (
    <Card>
      <CardTitle
        title={<T k="tutor" />}
        sub={<T k="basedOnLecture" />}
        right={
          <label className="row small-txt" style={{ cursor: 'pointer', gap: 6 }}>
            <input type="checkbox" checked={hideAnswers} onChange={(e) => setHideAnswers(e.target.checked)} />
            🙈 <T k="hideAnswers" />
          </label>
        }
      />

      <div className="chat-box" ref={boxRef}>
        {list.map((m) => (
          <div key={m.id} className={`bubble ${m.role}`}>
            {m.text}
          </div>
        ))}
        {thinking ? <div className="bubble bot">…</div> : null}
      </div>

      <div className="row" style={{ overflowX: 'auto', margin: '10px 0', gap: 6 }}>
        {TUTOR_SUGGESTIONS.map((s) => (
          <button key={s.en} className="chip" onClick={() => send(lang === 'ar' ? s.ar : s.en)}>
            {lang === 'ar' ? s.ar : s.en}
          </button>
        ))}
      </div>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          if (!input.trim()) return
          send(input)
        }}
        style={{ gap: 8 }}
      >
        <input
          className="input"
          style={{ flex: 1 }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={lang === 'ar' ? 'اسأل أي شيء عن هذه المحاضرة...' : 'Ask anything about this lecture...'}
        />
        <button className="btn primary" type="submit" disabled={!input.trim()}>
          ➤ <T k="send" />
        </button>
      </form>
      <div className="muted small-txt" style={{ marginTop: 6 }}>
        💡 {lang === 'ar' ? 'جرّب: اشرحها ببساطة · اصنع جملة تذكّر · اختبرني بدون إجابة' : 'Try: Explain this like I’m a beginner · Make a mnemonic · Test me, no answer'}
      </div>
    </Card>
  )
}
