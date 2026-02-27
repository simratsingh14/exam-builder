import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import TextQuestionEditor from './questions/TextQuestion'
import MCQQuestionEditor from './questions/MCQQuestion'
import TableQuestionEditor from './questions/TableQuestion'
import ImageQuestionEditor from './questions/ImageQuestion'
import type { Question } from '../types'

const TYPE_LABELS: Record<Question['type'], string> = {
  text: 'Text', mcq: 'MCQ', table: 'Table', image: 'Image',
}
const TYPE_COLORS: Record<Question['type'], string> = {
  text: 'bg-blue-100 text-blue-700',
  mcq: 'bg-purple-100 text-purple-700',
  table: 'bg-orange-100 text-orange-700',
  image: 'bg-green-100 text-green-700',
}

interface Props {
  question: Question
  index: number
  onChange: (q: Question) => void
  onDelete: () => void
}

export default function QuestionCard({ question, index, onChange, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
        <button
          className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>
        <span className="text-sm font-semibold text-gray-600">Q{index + 1}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[question.type]}`}>
          {TYPE_LABELS[question.type]}
        </span>
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={question.section}
            onChange={(e) => onChange({ ...question, section: e.target.value } as Question)}
            placeholder="Section (optional)"
            className="text-xs border border-gray-200 rounded px-2 py-0.5 w-32 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={question.marks}
              onChange={(e) => onChange({ ...question, marks: Number(e.target.value) } as Question)}
              placeholder="Marks"
              className="text-xs border border-gray-200 rounded px-2 py-0.5 w-16 focus:outline-none focus:ring-1 focus:ring-blue-400"
              min={0}
            />
            <span className="text-xs text-gray-400">marks</span>
          </div>
        </div>
        <button onClick={onDelete} className="text-gray-400 hover:text-red-500 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Card body */}
      <div className="px-4 py-4">
        {question.type === 'text' && <TextQuestionEditor question={question} onChange={onChange} />}
        {question.type === 'mcq' && <MCQQuestionEditor question={question} onChange={onChange} />}
        {question.type === 'table' && <TableQuestionEditor question={question} onChange={onChange} />}
        {question.type === 'image' && <ImageQuestionEditor question={question} onChange={onChange} />}
      </div>
    </div>
  )
}
