import { useState, useEffect } from 'react'
import { BookMarked, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import { listTemplates, getTemplate, saveTemplate, deleteTemplate } from '../api'
import type { Paper, Template, TemplateSummary } from '../types'

interface Props {
  paper: Paper
  onLoad: (template: Template) => void
}

export default function TemplatePanel({ paper, onLoad }: Props) {
  const [summaries, setSummaries] = useState<TemplateSummary[]>([])
  const [name, setName] = useState('')
  const [open, setOpen] = useState(false)

  const refresh = async () => {
    try { setSummaries(await listTemplates()) } catch { /* ignore */ }
  }

  useEffect(() => { if (open) refresh() }, [open])

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Enter a template name'); return }
    const template: Template = {
      id: uuidv4(),
      name: name.trim(),
      created_at: new Date().toISOString(),
      header: paper.header,
      questions: paper.questions,
      style: paper.style,
    }
    try {
      await saveTemplate(template)
      setName('')
      await refresh()
      toast.success('Template saved')
    } catch (e) {
      toast.error(`Failed: ${e}`)
    }
  }

  const handleLoad = async (id: string) => {
    try {
      const t = await getTemplate(id)
      onLoad(t)
      setOpen(false)
      toast.success(`Template "${t.name}" loaded`)
    } catch (e) {
      toast.error(`Failed: ${e}`)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate(id)
      await refresh()
    } catch (e) {
      toast.error(`Failed: ${e}`)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-700 w-full"
      >
        <BookMarked size={16} />
        Templates
        <span className="ml-auto text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {/* Save current as template */}
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Template name…"
              className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700"
            >
              <Save size={14} />
              Save
            </button>
          </div>

          {/* Template list */}
          {summaries.length === 0 ? (
            <p className="text-sm text-gray-400">No templates saved yet</p>
          ) : (
            <ul className="space-y-1">
              {summaries.map((t) => (
                <li key={t.id} className="flex items-center gap-2 group">
                  <button
                    onClick={() => handleLoad(t.id)}
                    className="flex-1 text-left text-sm text-blue-600 hover:underline truncate"
                  >
                    {t.name}
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
