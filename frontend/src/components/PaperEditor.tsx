import type { Paper } from '../types'
import PaperHeaderForm from './PaperHeaderForm'
import QuestionList from './QuestionList'
import TemplatePanel from './TemplatePanel'
import StylePanel from './StylePanel'
import ExportPanel from './ExportPanel'

interface Props {
  paper: Paper
  onChange: (paper: Paper) => void
  onSave: (paper: Paper) => Promise<void>
}

export default function PaperEditor({ paper, onChange, onSave }: Props) {
  const update = (partial: Partial<Paper>) => onChange({ ...paper, ...partial })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {paper.header.title || 'New Paper'}
        </h2>
        <button
          onClick={() => onSave(paper)}
          className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          Save
        </button>
      </div>

      <PaperHeaderForm
        header={paper.header}
        onChange={(header) => update({ header })}
      />

      <TemplatePanel
        paper={paper}
        onLoad={(template) => update({
          header: template.header,
          questions: template.questions,
          style: template.style,
        })}
      />

      <StylePanel
        style={paper.style}
        onChange={(style) => update({ style })}
      />

      <QuestionList
        questions={paper.questions}
        onChange={(questions) => update({ questions })}
      />

      <div className="mt-6">
        <ExportPanel paper={paper} />
      </div>
    </div>
  )
}
