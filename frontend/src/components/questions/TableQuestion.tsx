import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import Placeholder from '@tiptap/extension-placeholder'
import { Grid3x3 } from 'lucide-react'
import type { TableQuestion as TTableQuestion } from '../../types'

interface Props {
  question: TTableQuestion
  onChange: (q: TTableQuestion) => void
}

export default function TableQuestionEditor({ question, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({ placeholder: 'Type question here, or insert a table below…' }),
    ],
    content: question.content as Record<string, unknown>,
    onUpdate: ({ editor }) => onChange({ ...question, content: editor.getJSON() }),
  })

  if (!editor) return null

  const insertTable = () =>
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()

  return (
    <div>
      <div className="flex gap-1 mb-2 p-1 border-b border-gray-100">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); insertTable() }}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          <Grid3x3 size={12} />
          Insert Table
        </button>
      </div>
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none min-h-[80px] px-2 py-1 [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-gray-300 [&_.ProseMirror_td]:p-1 [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-gray-300 [&_.ProseMirror_th]:p-1 [&_.ProseMirror_th]:bg-gray-100"
      />
    </div>
  )
}
