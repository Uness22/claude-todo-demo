// ============================================================
// StudyFlow — Core types = client-side database schema
// Persisted in localStorage under `studyflow.v1.*`
// ============================================================

export type Lang = 'en' | 'ar' | 'bi' // English / Arabic / Bilingual
export type Theme = 'dark' | 'light'
export type Grade = 'red' | 'yellow' | 'green' // 🟥 🟨 🟩
export type Difficulty = 'easy' | 'medium' | 'hard'

/** A detected heading section of the lecture */
export interface Section {
  id: string
  title: string
  depth: number // 1 = main topic, 2 = subtopic
  body: string // full text under the heading
  lines: string[]
}

export interface Definition {
  id: string
  term: string
  text: string
  source: 'pattern' | 'heading' | 'glossary'
  unclear?: boolean
}

export interface TermDef {
  term: string
  definition: string
  arabic?: string // simple Arabic explanation (glossary / demo)
}

export interface ExtractedList {
  id: string
  title: string
  items: string[]
  kind: 'ordered' | 'unordered'
  sectionId?: string
}

export interface ProcessStep {
  id: string
  title: string
  detail?: string
}

export interface Comparison {
  id: string
  a: string
  b: string
  text: string
}

export interface NumberFact {
  id: string
  value: string // the number / formula token
  context: string // sentence around it
}

export interface ExamHint {
  id: string
  text: string
  reason: 'definition' | 'list' | 'number' | 'step' | 'comparison' | 'heading'
  sectionId?: string
}

export interface ConceptRelation {
  from: string
  to: string
  evidence: string // sentence where both appear
}

export interface QualityFlag {
  text: string
  kind: 'unclear' | 'needs-verification'
}

export interface Analysis {
  bigPicture: string[]
  sections: Section[]
  mainTopics: string[]
  subtopics: { topic: string; items: string[] }[]
  definitions: Definition[]
  terms: TermDef[]
  lists: ExtractedList[]
  numbers: NumberFact[]
  formulas: NumberFact[]
  steps: ProcessStep[]
  stepsTitle?: string
  comparisons: Comparison[]
  examHints: ExamHint[]
  verbatim: string[] // memorize word-for-word
  understandOnly: string[] // understanding required, no rote memorization
  relations: ConceptRelation[]
  flags: QualityFlag[]
  stats: { words: number; chars: number; readMinutes: number; languages: string[] }
}

export interface Lecture {
  id: string
  title: string
  fileName?: string
  rawText: string
  createdAt: number
  examDate?: number // ms timestamp of the exam for this lecture
  analysis: Analysis
  mnemonicChoice?: string // id of the chosen mnemonic (or 'custom')
  customMnemonic?: string
}

export interface MnemonicOption {
  id: string
  kind: 'sentence' | 'story' | 'visual' | 'association' | 'acronym'
  text: string
  mapping: { letter: string; item: string }[]
  score: number
}

export interface Flashcard {
  id: string
  lectureId: string
  front: string
  back: string
  memoryTrick?: string
  example?: string
  difficulty: Difficulty
  type: 'definition' | 'list' | 'number' | 'step' | 'comparison' | 'verbatim' | 'concept'
  topic: string
  keywords: string[]
  // SRS state
  due: number // ms timestamp
  intervalIndex: number
  reps: number
  lapses: number
  lastGrade?: Grade
  history: { t: number; grade: Grade }[]
  createdAt: number
}

export type QuestionKind =
  | 'mcq'
  | 'tf'
  | 'fill'
  | 'matching'
  | 'short'
  | 'list'
  | 'definition'
  | 'explain'
  | 'compare'
  | 'scenario'
  | 'case'
  | 'oral'

export interface Question {
  id: string
  lectureId: string
  kind: QuestionKind
  topic: string
  prompt: string
  options?: string[] // MCQ / TF options
  answer: string // expected answer text
  keywords: string[] // auto-grading anchors
  pairs?: { a: string; b: string }[] // matching
  explanation?: string
  difficulty: Difficulty
}

export interface TopicStat {
  correct: number
  total: number
}

export interface QuizAttempt {
  id: string
  lectureId: string
  at: number
  mode: 'quiz' | 'exam' | 'recall' | 'dump'
  correct: number
  total: number
  perTopic: Record<string, TopicStat>
  wrongQuestionIds: string[]
  durationMs?: number
}

export interface RecallEntry {
  lectureId: string
  question: string
  grade: Grade
  at: number
}

export interface StudyLog {
  date: string // YYYY-MM-DD
  minutes: number
  breakMinutes: number
  lectures: number
  cards: number
  questions: number
  dumps: number
}

export interface StreakState {
  current: number
  longest: number
  lastDay: string | null
}

export interface TutorMessage {
  id: string
  role: 'user' | 'bot'
  text: string
  at: number
}

export interface AppState {
  settings: {
    lang: Lang
    theme: Theme
    dailyGoalMinutes: number
    userName: string
  }
  lectures: Lecture[]
  cards: Flashcard[]
  attempts: QuizAttempt[]
  recalls: RecallEntry[]
  logs: Record<string, StudyLog>
  streak: StreakState
  tutorChats: Record<string, TutorMessage[]> // lectureId -> messages
  timer: {
    cycleStart: number | null // ms timestamp when current 90/20 cycle began
    pausedAt: number | null // ms offset when paused
    running: boolean
    cyclesDone: number
    loggedCycle: number // last cycle index whose 90 min were logged
  }
}

export const SRS_INTERVALS_DAYS = [0, 1, 3, 7, 14, 30] // Review1..5 + Before Exam default
export const REVIEW_LABELS = [
  'Review 1 — Same day',
  'Review 2 — Next day',
  'Review 3 — After 3 days',
  'Review 4 — After 7 days',
  'Review 5 — After 14 days',
  'Review 6 — Before Exam',
]

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
