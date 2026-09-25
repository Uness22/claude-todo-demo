import { useState } from 'react'
import type { Lecture } from '../../../types'
import { useStore } from '../../../store'
import { tr } from '../../../i18n'
import { Card } from '../../../components/ui'
import CheatSheet from '../components/CheatSheet'
import RapidReview from '../components/RapidReview'

export default function SheetTab({ lecture }: { lecture: Lecture }) {
  const { state } = useStore()
  const lang = state.settings.lang
  const [mode, setMode] = useState<'sheet' | 'five'>('sheet')

  return (
    <div>
      <div className="row no-print" style={{ marginBottom: 14 }}>
        <button className={`btn ${mode === 'sheet' ? 'primary' : ''}`} onClick={() => setMode('sheet')}>
          📋 {tr('cheatSheet', lang)}
        </button>
        <button className={`btn ${mode === 'five' ? 'primary' : ''}`} onClick={() => setMode('five')}>
          ⚡ {tr('fiveMinReview', lang)}
        </button>
      </div>

      {mode === 'sheet' ? (
        <Card>
          <CheatSheet lecture={lecture} />
        </Card>
      ) : (
        <RapidReview lecture={lecture} onClose={() => setMode('sheet')} />
      )}
    </div>
  )
}
