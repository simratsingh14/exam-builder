import { useState } from 'react'
import { Download, FileKey } from 'lucide-react'
import { toast } from 'sonner'
import { exportPaper, exportAnswerKey } from '../api'
import type { Paper } from '../types'

interface Props {
  paper: Paper
}

export default function ExportPanel({ paper }: Props) {
  const [exporting, setExporting] = useState(false)
  const [exportingKey, setExportingKey] = useState(false)

  const hasAnswers = paper.questions.some(
    (q) => q.type === 'mcq' && q.options.some((o) => o.is_correct)
  )

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportPaper(paper)
    } catch (e) {
      toast.error(`Export failed: ${e}`)
    } finally {
      setExporting(false)
    }
  }

  const handleExportKey = async () => {
    setExportingKey(true)
    try {
      await exportAnswerKey(paper)
    } catch (e) {
      toast.error(`Export failed: ${e}`)
    } finally {
      setExportingKey(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Export</h2>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Download size={16} />
          {exporting ? 'Generating…' : 'Download .docx'}
        </button>

        {hasAnswers && (
          <button
            onClick={handleExportKey}
            disabled={exportingKey}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            <FileKey size={16} />
            {exportingKey ? 'Generating…' : 'Download Answer Key'}
          </button>
        )}
      </div>
      {hasAnswers && (
        <p className="text-xs text-gray-400 mt-2">Answer key available — MCQ correct answers are marked</p>
      )}
    </div>
  )
}
