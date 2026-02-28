import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { Plus, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import QuestionCard from './QuestionCard'
import { createEmptyQuestion } from '../api'
import type { Question } from '../types'

interface Props {
  questions: Question[]
  onChange: (questions: Question[]) => void
}

const QUESTION_TYPES: { type: Question['type']; label: string }[] = [
  { type: 'text', label: 'Text Question' },
  { type: 'mcq', label: 'Multiple Choice (MCQ)' },
  { type: 'table', label: 'Table Question' },
  { type: 'image', label: 'Image Question' },
]

export default function QuestionList({ questions, onChange }: Props) {
  const [showAddMenu, setShowAddMenu] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = questions.findIndex((q) => q.id === active.id)
      const newIndex = questions.findIndex((q) => q.id === over.id)
      onChange(arrayMove(questions, oldIndex, newIndex))
    }
  }

  const addQuestion = (type: Question['type']) => {
    onChange([...questions, createEmptyQuestion(type)])
    setShowAddMenu(false)
  }

  const updateQuestion = (index: number, q: Question) => {
    const next = [...questions]
    next[index] = q
    onChange(next)
  }

  const deleteQuestion = (index: number) => {
    onChange(questions.filter((_, i) => i !== index))
  }

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4 mb-4">
            {questions.map((q, i) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={i}
                onChange={(updated) => updateQuestion(i, updated)}
                onDelete={() => deleteQuestion(i)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add question button */}
      <div className="relative">
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          <Plus size={16} />
          Add Question
          <ChevronDown size={14} className={`transition-transform ${showAddMenu ? 'rotate-180' : ''}`} />
        </button>

        {showAddMenu && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-10 overflow-hidden">
            {QUESTION_TYPES.map(({ type, label }) => (
              <button
                key={type}
                onClick={() => addQuestion(type)}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
