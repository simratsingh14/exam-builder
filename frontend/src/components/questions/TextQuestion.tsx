import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, Underline as UnderlineIcon } from 'lucide-react'
import type { TextQuestion as TTextQuestion } from '../../types'

interface Props {
  question: TTextQuestion
  onChange: (q: TTextQuestion) => void
}

export default function TextQuestionEditor({ question, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image.configure({ inline: true, allowBase64: false }),
      Placeholder.configure({ placeholder: 'Type question here…' }),
    ],
    content: question.content as Record<string, unknown>,
    onUpdate: ({ editor }) => onChange({ ...question, content: editor.getJSON() }),
  })

  if (!editor) return null

  const btn = (active: boolean, onClick: () => void, icon: React.ReactNode) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={`p-1.5 rounded transition-colors ${active ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}
    >
      {icon}
    </button>
  )

  return (
    <div>
      <div className="flex gap-1 mb-2 p-1 border-b border-gray-100">
        {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <Bold size={14} />)}
        {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <Italic size={14} />)}
        {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), <UnderlineIcon size={14} />)}
      </div>
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none min-h-[60px] px-2 py-1 focus-within:outline-none"
      />
    </div>
  )
}
