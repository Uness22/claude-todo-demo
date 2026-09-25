// ============================================================
// srs.ts — Spaced Repetition Engine (SM-2 inspired, interval-based)
// Schedule: Same day → +1 → +3 → +7 → +14 → Before Exam
// 🟥 wrong  → review much earlier (interval resets, lapse++)
// 🟨 partial → keep interval (review at current spacing)
// 🟩 correct → advance one interval
// ============================================================

import type { Flashcard, Grade, Lecture } from '../types'
import { SRS_INTERVALS_DAYS } from '../types'

export interface ScheduleInfo {
  nextIntervalDays: number
  nextDue: number
  intervalIndex: number
  label: string
}

export function scheduleFor(card: Flashcard, grade: Grade, examDate?: number, now = Date.now()): ScheduleInfo {
  let idx = card.intervalIndex
  if (grade === 'green') idx = Math.min(idx + 1, SRS_INTERVALS_DAYS.length - 1)
  else if (grade === 'yellow') idx = Math.max(0, idx) // hold
  else idx = 0 // red → restart early

  let days = SRS_INTERVALS_DAYS[idx]
  // "Before Exam": cap the last interval so the card lands before the exam
  if (examDate && idx === SRS_INTERVALS_DAYS.length - 1) {
    const untilExam = (examDate - now) / 86400000
    days = Math.max(1, Math.min(days, Math.floor(untilExam)))
  }
  if (grade === 'red') days = 0 // come back in this same day's queue
  if (grade === 'yellow' && days > 1) days = Math.max(1, Math.round(days / 2))

  return {
    nextIntervalDays: days,
    nextDue: now + days * 86400000,
    intervalIndex: idx,
    label: labelForInterval(idx, days, examDate),
  }
}

export function labelForInterval(idx: number, days: number, examDate?: number): string {
  if (days === 0) return 'Again — same day'
  if (idx === SRS_INTERVALS_DAYS.length - 1 && examDate) return 'Before Exam'
  if (days === 1) return 'Next day'
  return `In ${days} days`
}

export function applyGrade(card: Flashcard, grade: Grade, examDate?: number, now = Date.now()): Flashcard {
  const info = scheduleFor(card, grade, examDate, now)
  return {
    ...card,
    due: info.nextDue,
    intervalIndex: info.intervalIndex,
    reps: card.reps + 1,
    lapses: card.lapses + (grade === 'red' ? 1 : 0),
    lastGrade: grade,
    history: [...card.history, { t: now, grade }].slice(-50),
  }
}

export function dueCards(cards: Flashcard[], now = Date.now()): Flashcard[] {
  return cards
    .filter((c) => c.due <= now)
    .sort((a, b) => a.due - b.due || a.intervalIndex - b.intervalIndex)
}

/** The full human-readable review schedule for a freshly studied lecture. */
export function reviewSchedule(examDate?: number, now = Date.now()): { label: string; when: string }[] {
  const base = ['Same day', 'Next day', 'After 3 days', 'After 7 days', 'After 14 days']
  const out = base.map((when, i) => ({ label: `Review ${i + 1}`, when }))
  out.push({ label: 'Review 6', when: examDate ? formatWhen(examDate, now) : 'Before Exam' })
  return out
}

export function formatWhen(ts: number, now = Date.now()): string {
  const days = Math.round((ts - now) / 86400000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `In ${days} days`
}

export function lectureCardStats(cards: Flashcard[], lectureId: string): {
  total: number
  due: number
  mastered: number
  learning: number
  nextDue: number | null
} {
  const lc = cards.filter((c) => c.lectureId === lectureId)
  const now = Date.now()
  const due = lc.filter((c) => c.due <= now)
  const mastered = lc.filter((c) => c.intervalIndex >= 4)
  const learning = lc.filter((c) => c.intervalIndex < 4)
  const next = lc.length ? Math.min(...lc.map((c) => c.due)) : null
  return { total: lc.length, due: due.length, mastered: mastered.length, learning: learning.length, nextDue: next }
}

export function cardsForLecture(cards: Flashcard[], lecture: Lecture): Flashcard[] {
  return cards.filter((c) => c.lectureId === lecture.id)
}
