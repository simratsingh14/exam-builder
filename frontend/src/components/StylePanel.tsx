import { useRef } from 'react'
import { Palette, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { uploadImage } from '../api'
import type { PaperStyle } from '../types'

const FONTS = ['Times New Roman', 'Arial', 'Calibri', 'Georgia', 'Helvetica']

interface Props {
  style: PaperStyle
  onChange: (style: PaperStyle) => void
}

export default function StylePanel({ style, onChange }: Props) {
  const logoRef = useRef<HTMLInputElement>(null)

  const update = <K extends keyof PaperStyle>(key: K, value: PaperStyle[K]) =>
    onChange({ ...style, [key]: value })

  const handleLogoUpload = async (file: File) => {
    try {
      const filename = await uploadImage(file)
      update('logo_filename', filename)
      toast.success('Logo uploaded')
    } catch (e) {
      toast.error(`Upload failed: ${e}`)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        <Palette size={14} />
        Styling
      </h2>

      <div className="grid grid-cols-2 gap-4">
        {/* Font family */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Font</label>
          <select
            value={style.font_family}
            onChange={(e) => update('font_family', e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {FONTS.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>

        {/* Font size */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Font Size (pt)</label>
          <input
            type="number"
            value={style.font_size}
            onChange={(e) => update('font_size', Number(e.target.value))}
            min={8} max={16}
            className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Margins */}
        {(['margin_top', 'margin_bottom', 'margin_left', 'margin_right'] as const).map((key) => (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">
              {key.replace(/_/g, ' ')} (in)
            </label>
            <input
              type="number"
              value={style[key]}
              onChange={(e) => update(key, Number(e.target.value))}
              min={0.5} max={3} step={0.25}
              className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}

        {/* Header text */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Header Text</label>
          <input
            type="text"
            value={style.header_text}
            onChange={(e) => update('header_text', e.target.value)}
            placeholder="e.g. Confidential — Do not distribute"
            className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Footer text */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Footer Text</label>
          <input
            type="text"
            value={style.footer_text}
            onChange={(e) => update('footer_text', e.target.value)}
            placeholder="e.g. Page 1 of N"
            className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Logo */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Logo</label>
          {style.logo_filename ? (
            <div className="flex items-center gap-2">
              <img
                src={`/api/uploads/${style.logo_filename}`}
                alt="Logo"
                className="h-12 rounded border border-gray-200"
              />
              <button
                onClick={() => update('logo_filename', null)}
                className="text-gray-400 hover:text-red-500"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => logoRef.current?.click()}
                className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                <Upload size={14} />
                Upload Logo
              </button>
              <input
                ref={logoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f) }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
