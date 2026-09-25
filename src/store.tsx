import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { AppState, Flashcard, Grade, Lecture, QuizAttempt, RecallEntry, TutorMessage } from './types'
import { uid } from './types'
import { analyze } from './lib/analyze'
import { deriveTitle } from './lib/parse'
import { generateCards } from './lib/flashcards'
import { applyGrade } from './lib/srs'
import { bumpLog, touchStreak } from './lib/mastery'

const KEY = 'studyflow.v1'

const initial: AppState = {
  settings: { lang: 'en', theme: 'dark', dailyGoalMinutes: 90, userName: '' },
  lectures: [],
  cards: [],
  attempts: [],
  recalls: [],
  logs: {},
  streak: { current: 0, longest: 0, lastDay: null },
  tutorChats: {},
  timer: { cycleStart: null, pausedAt: null, running: false, cyclesDone: 0, loggedCycle: 0 },
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return initial
    const parsed = JSON.parse(raw) as Partial<AppState>
    return {
      ...initial,
      ...parsed,
      settings: { ...initial.settings, ...(parsed.settings || {}) },
      timer: { ...initial.timer, ...(parsed.timer || {}) },
      streak: { ...initial.streak, ...(parsed.streak || {}) },
    }
  } catch {
    return initial
  }
}

interface Ctx {
  state: AppState
  set: (fn: (s: AppState) => AppState) => void
  addLecture: (text: string, fileName?: string, title?: string) => Lecture
  deleteLecture: (id: string) => void
  setExamDate: (lectureId: string, ts: number | undefined) => void
  chooseMnemonic: (lectureId: string, optionId: string, customText?: string) => void
  gradeCard: (cardId: string, grade: Grade) => void
  recordAttempt: (attempt: QuizAttempt) => void
  recordRecall: (entry: RecallEntry) => void
  logExtra: (patch: Partial<AppState['logs'][string]>) => void
  addTutorMsg: (lectureId: string, msg: TutorMessage) => void
  resetAll: () => void
}

const StoreCtx = createContext<Ctx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => load())
  const saveTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(state))
      } catch (e) {
        console.warn('persist failed', e)
      }
    }, 150)
    return () => window.clearTimeout(saveTimer.current)
  }, [state])

  // theme class
  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme
    document.documentElement.lang = state.settings.lang === 'ar' ? 'ar' : 'en'
    document.documentElement.dir = state.settings.lang === 'ar' ? 'rtl' : 'ltr'
  }, [state.settings.theme, state.settings.lang])

  const set = useCallback((fn: (s: AppState) => AppState) => setState((s) => fn(s)), [])

  const addLecture = useCallback((text: string, fileName?: string, title?: string): Lecture => {
    const clean = text.trim()
    const lecture: Lecture = {
      id: uid('lec'),
      title: (title || deriveTitle(clean, fileName)).trim().slice(0, 120) || 'Untitled lecture',
      fileName,
      rawText: clean,
      createdAt: Date.now(),
      analysis: analyze(clean),
    }
    setState((s) => {
      let logs = bumpLog(s.logs, { lectures: 1 })
      const streak = touchStreak(s.streak)
      return {
        ...s,
        lectures: [lecture, ...s.lectures],
        cards: [...s.cards, ...generateCards(lecture)],
        logs,
        streak,
      }
    })
    return lecture
  }, [])

  const deleteLecture = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      lectures: s.lectures.filter((l) => l.id !== id),
      cards: s.cards.filter((c) => c.lectureId !== id),
      attempts: s.attempts.filter((a) => a.lectureId !== id),
      recalls: s.recalls.filter((r) => r.lectureId !== id),
      tutorChats: Object.fromEntries(Object.entries(s.tutorChats).filter(([k]) => k !== id)),
    }))
  }, [])

  const setExamDate = useCallback((lectureId: string, ts: number | undefined) => {
    setState((s) => ({
      ...s,
      lectures: s.lectures.map((l) => (l.id === lectureId ? { ...l, examDate: ts } : l)),
    }))
  }, [])

  const chooseMnemonic = useCallback((lectureId: string, optionId: string, customText?: string) => {
    setState((s) => ({
      ...s,
      lectures: s.lectures.map((l) =>
        l.id === lectureId ? { ...l, mnemonicChoice: optionId, customMnemonic: customText ?? l.customMnemonic } : l,
      ),
    }))
  }, [])

  const gradeCard = useCallback((cardId: string, grade: Grade) => {
    setState((s) => {
      const card = s.cards.find((c) => c.id === cardId)
      if (!card) return s
      const lec = s.lectures.find((l) => l.id === card.lectureId)
      const next = applyGrade(card, grade, lec?.examDate)
      let logs = bumpLog(s.logs, { cards: 1 })
      const streak = touchStreak(s.streak)
      return { ...s, cards: s.cards.map((c) => (c.id === cardId ? next : c)), logs, streak }
    })
  }, [])

  const recordAttempt = useCallback((attempt: QuizAttempt) => {
    setState((s) => {
      const logs = bumpLog(s.logs, { questions: attempt.total })
      const streak = touchStreak(s.streak)
      return { ...s, attempts: [...s.attempts, attempt], logs, streak }
    })
  }, [])

  const recordRecall = useCallback((entry: RecallEntry) => {
    setState((s) => {
      const logs = bumpLog(s.logs, { questions: 1 })
      const streak = touchStreak(s.streak)
      return { ...s, recalls: [...s.recalls, entry], logs, streak }
    })
  }, [])

  const logExtra = useCallback((patch: Partial<AppState['logs'][string]>) => {
    setState((s) => ({ ...s, logs: bumpLog(s.logs, patch), streak: touchStreak(s.streak) }))
  }, [])

  const addTutorMsg = useCallback((lectureId: string, msg: TutorMessage) => {
    setState((s) => ({
      ...s,
      tutorChats: { ...s.tutorChats, [lectureId]: [...(s.tutorChats[lectureId] || []), msg].slice(-100) },
    }))
  }, [])

  const resetAll = useCallback(() => setState({ ...initial, settings: initial.settings }), [])

  const value = useMemo<Ctx>(
    () => ({
      state,
      set,
      addLecture,
      deleteLecture,
      setExamDate,
      chooseMnemonic,
      gradeCard,
      recordAttempt,
      recordRecall,
      logExtra,
      addTutorMsg,
      resetAll,
    }),
    [state, set, addLecture, deleteLecture, setExamDate, chooseMnemonic, gradeCard, recordAttempt, recordRecall, logExtra, addTutorMsg, resetAll],
  )

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore(): Ctx {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}

export function useLang() {
  const { state } = useStore()
  return state.settings.lang
}

export type { Flashcard, Lecture }
