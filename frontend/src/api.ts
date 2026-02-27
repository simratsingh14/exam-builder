import { v4 as uuidv4 } from 'uuid'
import type { Paper, PaperSummary, Template, TemplateSummary, Question, MCQQuestion } from './types'

// ── Factories ────────────────────────────────────────────────────────────────

export function createEmptyPaper(): Paper {
  return {
    id: uuidv4(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    header: { institution: '', title: '', subject: '', date: '', duration: '', total_marks: 0 },
    questions: [],
    style: {
      font_family: 'Times New Roman',
      font_size: 12,
      logo_filename: null,
      header_text: '',
      footer_text: '',
      margin_top: 1.0,
      margin_bottom: 1.0,
      margin_left: 1.25,
      margin_right: 1.25,
      accent_color: '#000000',
    },
  }
}

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] }

export function createEmptyQuestion(type: Question['type']): Question {
  const base = { id: uuidv4(), section: '', marks: 0 }
  if (type === 'text') return { ...base, type: 'text', content: EMPTY_DOC }
  if (type === 'mcq') {
    const q: MCQQuestion = {
      ...base,
      type: 'mcq',
      stem: EMPTY_DOC,
      options: [
        { label: 'A', text: '', is_correct: false },
        { label: 'B', text: '', is_correct: false },
        { label: 'C', text: '', is_correct: false },
        { label: 'D', text: '', is_correct: false },
      ],
    }
    return q
  }
  if (type === 'table') return { ...base, type: 'table', content: EMPTY_DOC }
  return { ...base, type: 'image', filename: '', caption: '' }
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>
    throw new Error(String(body['detail'] ?? `HTTP ${res.status}`))
  }
  return res.json() as Promise<T>
}

// ── Papers ───────────────────────────────────────────────────────────────────

export const listPapers = (): Promise<PaperSummary[]> =>
  request('/api/papers')

export const getPaper = (id: string): Promise<Paper> =>
  request(`/api/papers/${id}`)

export const savePaper = (paper: Paper): Promise<Paper> =>
  request('/api/papers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paper),
  })

export const deletePaper = (id: string): Promise<void> =>
  request(`/api/papers/${id}`, { method: 'DELETE' })

// ── Templates ────────────────────────────────────────────────────────────────

export const listTemplates = (): Promise<TemplateSummary[]> =>
  request('/api/templates')

export const getTemplate = (id: string): Promise<Template> =>
  request(`/api/templates/${id}`)

export const saveTemplate = (template: Template): Promise<Template> =>
  request('/api/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template),
  })

export const deleteTemplate = (id: string): Promise<void> =>
  request(`/api/templates/${id}`, { method: 'DELETE' })

// ── Export ───────────────────────────────────────────────────────────────────

export async function exportPaper(paper: Paper): Promise<void> {
  const res = await fetch('/api/papers/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paper),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>
    throw new Error(String(body['detail'] ?? 'Export failed'))
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${paper.header.title || 'exam'}.docx`
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportAnswerKey(paper: Paper): Promise<void> {
  const res = await fetch('/api/papers/export-answer-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paper),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>
    throw new Error(String(body['detail'] ?? 'Export failed'))
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${paper.header.title || 'exam'}_answer_key.docx`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Image upload ─────────────────────────────────────────────────────────────

export async function uploadImage(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/uploads/image', { method: 'POST', body: form })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>
    throw new Error(String(body['detail'] ?? 'Upload failed'))
  }
  const data = await res.json() as Record<string, unknown>
  return data['filename'] as string
}
