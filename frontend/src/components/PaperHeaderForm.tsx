import type { PaperHeader } from '../types'

interface Props {
  header: PaperHeader
  onChange: (header: PaperHeader) => void
}

const fields: { key: keyof PaperHeader; label: string; type?: string }[] = [
  { key: 'institution', label: 'Institution / School Name' },
  { key: 'title', label: 'Exam Title' },
  { key: 'subject', label: 'Subject' },
  { key: 'date', label: 'Date' },
  { key: 'duration', label: 'Duration (e.g. 2 hours)' },
  { key: 'total_marks', label: 'Total Marks', type: 'number' },
]

export default function PaperHeaderForm({ header, onChange }: Props) {
  const update = (key: keyof PaperHeader, value: string | number) =>
    onChange({ ...header, [key]: value })

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Paper Details</h2>
      <div className="grid grid-cols-2 gap-4">
        {fields.map(({ key, label, type }) => (
          <div key={key} className={key === 'institution' || key === 'title' ? 'col-span-2' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
              type={type ?? 'text'}
              value={header[key] as string | number}
              onChange={(e) => update(key, type === 'number' ? Number(e.target.value) : e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
