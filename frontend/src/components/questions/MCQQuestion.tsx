import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import type { MCQQuestion as TMCQQuestion, MCQOption } from '../../types'

interface Props {
  question: TMCQQuestion
  onChange: (q: TMCQQuestion) => void
}

export default function MCQQuestionEditor({ question, onChange }: Props) {
  const stemEditor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Type question stem here…' }),
    ],
    content: question.stem as Record<string, unknown>,
    onUpdate: ({ editor }) => onChange({ ...question, stem: editor.getJSON() }),
  })

  const updateOption = (index: number, patch: Partial<MCQOption>) => {
    const options = question.options.map((o, i) => i === index ? { ...o, ...patch } : o)
    onChange({ ...question, options })
  }

  const setCorrect = (index: number) => {
    const options = question.options.map((o, i) => ({ ...o, is_correct: i === index }))
    onChange({ ...question, options })
  }

  if (!stemEditor) return null

  return (
    <div>
      <EditorContent
        editor={stemEditor}
        className="prose prose-sm max-w-none min-h-[48px] px-2 py-1 border border-gray-100 rounded mb-3"
      />
      <div className="space-y-2">
        {question.options.map((opt, i) => (
          <div key={opt.label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCorrect(i)}
              title="Mark as correct answer"
              className={`w-6 h-6 rounded-full border-2 text-xs font-bold shrink-0 transition-colors ${
                opt.is_correct
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-gray-300 text-gray-500 hover:border-green-400'
              }`}
            >
              {opt.label}
            </button>
            <input
              type="text"
              value={opt.text}
              onChange={(e) => updateOption(i, { text: e.target.value })}
              placeholder={`Option ${opt.label}`}
              className="flex-1 text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-2">Click a letter to mark the correct answer (for answer key)</p>
    </div>
  )
}
