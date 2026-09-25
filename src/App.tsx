import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { StoreProvider, useStore } from './store'
import { tr } from './i18n'
import Dashboard from './screens/Dashboard'
import Upload from './screens/Upload'
import LectureView from './screens/lecture/LectureView'
import Reviews from './screens/Reviews'
import ProgressScreen from './screens/ProgressScreen'
import TimerScreen from './screens/TimerScreen'
import SettingsScreen from './screens/SettingsScreen'
import { dueCount } from './lib/mastery'

export type Route =
  | { name: 'dash' }
  | { name: 'upload' }
  | { name: 'reviews' }
  | { name: 'progress' }
  | { name: 'timer' }
  | { name: 'settings' }
  | { name: 'lecture'; id: string; tab: string }

function Sidebar({ route, go }: { route: Route; go: (r: Route) => void }) {
  const { state } = useStore()
  const lang = state.settings.lang
  const due = useMemo(() => dueCount(state), [state])

  const items: { key: Route['name']; ico: string; labelKey: string; badge?: number }[] = [
    { key: 'dash', ico: '🏠', labelKey: 'dashboard' },
    { key: 'upload', ico: '➕', labelKey: 'upload' },
    { key: 'reviews', ico: '🔁', labelKey: 'reviews', badge: due },
    { key: 'progress', ico: '📊', labelKey: 'progress' },
    { key: 'timer', ico: '⏱️', labelKey: 'timer' },
    { key: 'settings', ico: '⚙️', labelKey: 'settings' },
  ]

  return (
    <aside className="sidebar no-print">
      <div className="brand">
        <div className="logo">S</div>
        <div>
          {tr('appName', lang)}
          <span className="tag">{tr('tagline', lang)}</span>
        </div>
      </div>
      {items.map((it) => {
        const activeKey = route.name === 'lecture' ? 'dash' : route.name
        return (
          <button key={it.key} className={`nav-item ${activeKey === it.key ? 'active' : ''}`} onClick={() => go({ name: it.key } as Route)}>
            <span className="ico">{it.ico}</span>
            <span className="lbl">{tr(it.labelKey, lang)}</span>
            {it.badge ? <span className="badge-count">{it.badge}</span> : null}
          </button>
        )
      })}
      <div className="sidebar-foot">
        <div>
          {tr('streak', lang)}: 🔥 {state.streak.current} {tr('days', lang)}
        </div>
        <div style={{ marginTop: 4, opacity: 0.7 }}>{tr('footerTagline', lang)}</div>
      </div>
    </aside>
  )
}

function Router() {
  const [route, setRoute] = useState<Route>({ name: 'dash' })
  const go = (r: Route) => {
    setRoute(r)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  let screen: ReactNode
  switch (route.name) {
    case 'upload':
      screen = <Upload go={go} />
      break
    case 'reviews':
      screen = <Reviews go={go} />
      break
    case 'progress':
      screen = <ProgressScreen go={go} />
      break
    case 'timer':
      screen = <TimerScreen go={go} />
      break
    case 'settings':
      screen = <SettingsScreen />
      break
    case 'lecture':
      screen = <LectureView id={route.id} tab={route.tab} go={go} />
      break
    default:
      screen = <Dashboard go={go} />
  }

  return (
    <div className="shell">
      <Sidebar route={route} go={go} />
      <main className="main">{screen}</main>
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Router />
    </StoreProvider>
  )
}
