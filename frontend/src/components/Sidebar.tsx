import { FilePlus, FileText, Trash2 } from 'lucide-react'
import type { PaperSummary } from '../types'

interface Props {
  summaries: PaperSummary[]
  currentPaperId: string
  onNew: () => void
  onLoad: (id: string) => void
  onDelete: (id: string) => void
}

export default function Sidebar({ summaries, currentPaperId, onNew, onLoad, onDelete }: Props) {
  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-white flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900">Exam Builder</h1>
      </div>

      <div className="p-3">
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <FilePlus size={16} />
          New Paper
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {summaries.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">No saved papers yet</p>
        )}
        {summaries.map((s) => (
          <div
            key={s.id}
            className={`group flex items-start gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              s.id === currentPaperId ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
            }`}
            onClick={() => onLoad(s.id)}
          >
            <FileText size={16} className="mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{s.title || 'Untitled'}</div>
              <div className="text-xs text-gray-400 truncate">{s.subject}</div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(s.id) }}
              className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </aside>
  )
}
