import type { CSSProperties, ReactNode } from 'react'
import { Bi } from '../i18n'
import { useLang } from '../store'

export function Card({ children, className = '', style, onClick }: { children: ReactNode; className?: string; style?: CSSProperties; onClick?: () => void }) {
  return (
    <div className={`card ${className}`} style={style} onClick={onClick}>
      {children}
    </div>
  )
}

export function CardTitle({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="card-title">
      <div>
        <h3>{title}</h3>
        {sub ? <div className="muted small-txt">{sub}</div> : null}
      </div>
      {right}
    </div>
  )
}

export function Progress({ pct, variant = '', thin }: { pct: number; variant?: string; thin?: boolean }) {
  const v = Math.max(0, Math.min(100, Math.round(pct)))
  return (
    <div className={`progress ${variant} ${thin ? 'thin' : ''}`} role="progressbar" aria-valuenow={v}>
      <div style={{ width: `${v}%` }} />
    </div>
  )
}

export function Stat({ v, k, sub }: { v: ReactNode; k: ReactNode; sub?: ReactNode }) {
  return (
    <div className="card stat">
      <div className="v">{v}</div>
      <div className="k">{k}</div>
      {sub ? <div className="sub">{sub}</div> : null}
    </div>
  )
}

export function Pill({ kind = '', children }: { kind?: string; children: ReactNode }) {
  return <span className={`pill ${kind}`}>{children}</span>
}

export function T({ k }: { k: string }) {
  const lang = useLang()
  return <Bi k={k} lang={lang} />
}

export function Empty({ icon = '📭', text, action }: { icon?: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="ico">{icon}</div>
      <div>{text}</div>
      {action ? <div style={{ marginTop: 14 }}>{action}</div> : null}
    </div>
  )
}

export function masteryVariant(pct: number): string {
  if (pct >= 85) return 'success'
  if (pct >= 60) return ''
  if (pct >= 40) return 'warn'
  return 'danger'
}

export function Bar({ pct, label, right }: { pct: number; label: string; right?: ReactNode }) {
  return (
    <div className="item">
      <div className="row between">
        <span>{label}</span>
        <span className="muted">{right ?? `${pct}%`}</span>
      </div>
      <Progress pct={pct} variant={masteryVariant(pct)} />
    </div>
  )
}

export function fmtTime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
