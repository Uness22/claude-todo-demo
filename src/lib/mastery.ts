// ============================================================
// mastery.ts — Mastery scoring, weakness detection,
// personalized study plan, streaks and today's stats.
// ============================================================

import type { AppState, Flashcard, Grade, Lecture, QuizAttempt, RecallEntry, StudyLog } from '../types'
import { todayKey } from '../types'

const gradeScore: Record<Grade, number> = { red: 0, yellow: 0.5, green: 1 }

/** Merge all performance signals into per-topic accuracy for one lecture. */
export function topicStatsFor(
  lectureId: string,
  attempts: QuizAttempt[],
  recalls: RecallEntry[],
  cards: Flashcard[],
): Record<string, { correct: number; total: number }> {
  const stats: Record<string, { correct: number; total: number }> = {}
  const add = (topic: string, c: number, t: number) => {
    if (!topic || !t) return
    if (!stats[topic]) stats[topic] = { correct: 0, total: 0 }
    stats[topic].correct += c
    stats[topic].total += t
  }
  for (const at of attempts.filter((x) => x.lectureId === lectureId)) {
    for (const [topic, st] of Object.entries(at.perTopic)) add(topic, st.correct, st.total)
  }
  for (const r of recalls.filter((x) => x.lectureId === lectureId)) {
    add(lectureTitleSafe(lectureId), gradeScore[r.grade], 1)
  }
  for (const c of cards.filter((x) => x.lectureId === lectureId)) {
    if (c.lastGrade) add(c.topic, gradeScore[c.lastGrade], 1)
  }
  return stats
}

function lectureTitleSafe(_id: string): string {
  return '__lecture__'
}

export function masteryOf(stats: Record<string, { correct: number; total: number }>): number {
  let c = 0
  let t = 0
  for (const st of Object.values(stats)) {
    c += st.correct
    t += st.total
  }
  if (!t) return 0
  return Math.round((c / t) * 100)
}

export interface TopicMastery {
  topic: string
  pct: number
  total: number
}

export function topicMasteryList(stats: Record<string, { correct: number; total: number }>): TopicMastery[] {
  return Object.entries(stats)
    .map(([topic, st]) => ({ topic: topic === '__lecture__' ? 'Overall recall' : topic, pct: st.total ? Math.round((st.correct / st.total) * 100) : 0, total: st.total }))
    .filter((x) => x.total > 0)
    .sort((a, b) => a.pct - b.pct)
}

export function classifyTopics(list: TopicMastery[]): {
  weak: TopicMastery[]
  strong: TopicMastery[]
  review: TopicMastery[]
} {
  return {
    weak: list.filter((t) => t.pct < 60),
    strong: list.filter((t) => t.pct >= 85),
    review: list.filter((t) => t.pct >= 60 && t.pct < 85),
  }
}

/** Personalized plan: weak topics get proportionally more minutes. */
export function studyPlan(list: TopicMastery[], totalMinutes = 90): { topic: string; minutes: number; pct: number; focus: boolean }[] {
  const need = list.filter((t) => t.pct < 90)
  const pool = need.length ? need : list
  if (!pool.length) return []
  const weights = pool.map((t) => Math.max(5, 100 - t.pct))
  const sum = weights.reduce((a, b) => a + b, 0)
  const plan = pool.map((t, i) => ({
    topic: t.topic,
    minutes: Math.max(5, Math.round((weights[i] / sum) * totalMinutes)),
    pct: t.pct,
    focus: t.pct < 60,
  }))
  // normalize to total
  const diff = totalMinutes - plan.reduce((a, p) => a + p.minutes, 0)
  if (plan.length && Math.abs(diff) >= 5) plan[0].minutes = Math.max(5, plan[0].minutes + diff)
  return plan.sort((a, b) => a.pct - b.pct)
}

// ---------- Streak ----------

export function touchStreak(streak: AppState['streak'], now = new Date()): AppState['streak'] {
  const day = todayKey(now)
  if (streak.lastDay === day) return streak
  const yesterday = todayKey(new Date(now.getTime() - 86400000))
  const current = streak.lastDay === yesterday ? streak.current + 1 : 1
  return { current, longest: Math.max(current, streak.longest), lastDay: day }
}

// ---------- Today ----------

export function todayLog(logs: AppState['logs']): StudyLog {
  return logs[todayKey()] || { date: todayKey(), minutes: 0, breakMinutes: 0, lectures: 0, cards: 0, questions: 0, dumps: 0 }
}

export function bumpLog(
  logs: AppState['logs'],
  patch: Partial<StudyLog>,
  now = new Date(),
): AppState['logs'] {
  const key = todayKey(now)
  const prev = logs[key] || { date: key, minutes: 0, breakMinutes: 0, lectures: 0, cards: 0, questions: 0, dumps: 0 }
  const next: StudyLog = { ...prev, ...patch }
  for (const k of ['minutes', 'breakMinutes', 'lectures', 'cards', 'questions', 'dumps'] as const) {
    if (patch[k] !== undefined) next[k] = Math.max(0, (prev[k] || 0) + (patch[k] as number))
  }
  next.date = key
  return { ...logs, [key]: next }
}

export function avgMastery(state: AppState): number {
  const all: number[] = []
  for (const lec of state.lectures) {
    const stats = topicStatsFor(lec.id, state.attempts, state.recalls, state.cards)
    const m = masteryOf(stats)
    if (stats && Object.keys(stats).length) all.push(m)
  }
  if (!all.length) return 0
  return Math.round(all.reduce((a, b) => a + b, 0) / all.length)
}

export function dueCount(state: AppState, now = Date.now()): number {
  return state.cards.filter((c) => c.due <= now).length
}

export function daysUntilExam(state: AppState): { days: number; lecture: Lecture } | null {
  const upcoming = state.lectures
    .filter((l) => l.examDate && l.examDate > Date.now())
    .sort((a, b) => (a.examDate || 0) - (b.examDate || 0))
  if (!upcoming.length) return null
  const l = upcoming[0]
  return { days: Math.ceil(((l.examDate || 0) - Date.now()) / 86400000), lecture: l }
}

export function questionsToday(state: AppState): number {
  const log = todayLog(state.logs)
  return log.questions
}
