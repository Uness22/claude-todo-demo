import { useStore } from '../store'
import type { Lang, Theme } from '../types'
import { tr } from '../i18n'
import { Card, CardTitle, T } from '../components/ui'

export default function SettingsScreen() {
  const { state, set, resetAll } = useStore()
  const lang = state.settings.lang

  return (
    <div style={{ maxWidth: 720 }}>
      <h1>
        ⚙️ <T k="settings" />
      </h1>

      <Card>
        <CardTitle title={<T k="langLabel" />} sub="UI language — content stays in its source language" />
        <div className="row">
          {(['en', 'ar', 'bi'] as Lang[]).map((l) => (
            <button
              key={l}
              className={`btn ${lang === l ? 'primary' : ''}`}
              onClick={() => set((s) => ({ ...s, settings: { ...s.settings, lang: l } }))}
            >
              {l === 'en' ? '🇬🇧 English' : l === 'ar' ? '🇸🇦 العربية' : '🌍 Bilingual'}
            </button>
          ))}
        </div>
        <p className="muted small-txt" style={{ marginTop: 10 }}>
          Bilingual shows English primary with Arabic beneath it. Known academic terms include a simple Arabic
          explanation (ببساطة) in lecture views.
        </p>
      </Card>

      <Card>
        <CardTitle title={<T k="themeLabel" />} />
        <div className="row">
          {(['dark', 'light'] as Theme[]).map((th) => (
            <button
              key={th}
              className={`btn ${state.settings.theme === th ? 'primary' : ''}`}
              onClick={() => set((s) => ({ ...s, settings: { ...s.settings, theme: th } }))}
            >
              {th === 'dark' ? '🌙 ' + tr('dark', lang) : '☀️ ' + tr('light', lang)}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle title={<T k="name" />} />
        <input
          className="input"
          value={state.settings.userName}
          onChange={(e) => set((s) => ({ ...s, settings: { ...s.settings, userName: e.target.value } }))}
          placeholder="Student"
        />
      </Card>

      <Card>
        <CardTitle title={<T k="dailyGoal" />} />
        <div className="row">
          {[30, 60, 90, 120].map((m) => (
            <button
              key={m}
              className={`btn ${state.settings.dailyGoalMinutes === m ? 'primary' : ''}`}
              onClick={() => set((s) => ({ ...s, settings: { ...s.settings, dailyGoalMinutes: m } }))}
            >
              {m} min
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle title="Data & Privacy" sub="Everything is stored locally in your browser (localStorage) — nothing leaves this device." />
        <button
          className="btn danger"
          onClick={() => {
            if (confirm(tr('resetConfirm', lang))) resetAll()
          }}
        >
          🗑 <T k="resetData" />
        </button>
      </Card>

      <Card>
        <CardTitle title={tr('aboutTitle', lang)} />
        <p className="small-txt muted">
          <T k="tagline" />
        </p>
        <p className="small-txt muted">
          {tr('aboutBlurb', lang)}
        </p>
        <p className="small-txt muted">
          {tr('aboutAcademic', lang)}
        </p>
      </Card>
    </div>
  )
}
