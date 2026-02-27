import { useRef, useCallback } from 'react'
import { Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { uploadImage } from '../../api'
import type { ImageQuestion as TImageQuestion } from '../../types'

interface Props {
  question: TImageQuestion
  onChange: (q: TImageQuestion) => void
}

export default function ImageQuestionEditor({ question, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed')
      return
    }
    try {
      const filename = await uploadImage(file)
      onChange({ ...question, filename })
    } catch (e) {
      toast.error(`Upload failed: ${e}`)
    }
  }, [question, onChange])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
    if (item) {
      const file = item.getAsFile()
      if (file) handleFile(file)
    }
  }, [handleFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div onPaste={handlePaste}>
      {!question.filename ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={24} className="mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500">Click to upload, drag & drop, or paste from clipboard</p>
          <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF, WebP — max 10 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
        </div>
      ) : (
        <div className="relative">
          <img
            src={`/api/uploads/${question.filename}`}
            alt="Question image"
            className="max-w-full max-h-64 rounded border border-gray-200"
          />
          <button
            type="button"
            onClick={() => onChange({ ...question, filename: '' })}
            className="absolute top-2 right-2 bg-white rounded-full p-1 shadow hover:bg-red-50 transition-colors"
          >
            <X size={14} className="text-red-500" />
          </button>
          <div className="mt-2">
            <input
              type="text"
              value={question.caption}
              onChange={(e) => onChange({ ...question, caption: e.target.value })}
              placeholder="Caption (optional)"
              className="w-full text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        </div>
      )}
    </div>
  )
}
