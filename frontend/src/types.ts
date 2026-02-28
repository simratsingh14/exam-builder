export interface PaperStyle {
  font_family: string
  font_size: number
  logo_filename: string | null
  header_text: string
  footer_text: string
  margin_top: number
  margin_bottom: number
  margin_left: number
  margin_right: number
  accent_color: string
}

export interface PaperHeader {
  institution: string
  title: string
  subject: string
  date: string
  duration: string
  total_marks: number
}

export interface TextQuestion {
  type: 'text'
  id: string
  section: string
  marks: number
  content: Record<string, unknown>  // TipTap JSON
}

export interface MCQOption {
  label: string
  text: string
  is_correct: boolean
}

export interface MCQQuestion {
  type: 'mcq'
  id: string
  section: string
  marks: number
  stem: Record<string, unknown>  // TipTap JSON
  options: MCQOption[]
}

export interface TableQuestion {
  type: 'table'
  id: string
  section: string
  marks: number
  content: Record<string, unknown>  // TipTap JSON
}

export interface ImageQuestion {
  type: 'image'
  id: string
  section: string
  marks: number
  filename: string
  caption: string
}

export type Question = TextQuestion | MCQQuestion | TableQuestion | ImageQuestion

export interface Paper {
  id: string
  created_at: string
  updated_at: string
  header: PaperHeader
  questions: Question[]
  style: PaperStyle
}

export interface PaperSummary {
  id: string
  title: string
  subject: string
  updated_at: string
}

export interface Template {
  id: string
  name: string
  created_at: string
  header: PaperHeader
  questions: Question[]
  style: PaperStyle
}

export interface TemplateSummary {
  id: string
  name: string
  created_at: string
}
