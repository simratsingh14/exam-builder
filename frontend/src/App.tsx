import { Toaster } from 'sonner'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster richColors position="top-right" />
      <p className="p-4 text-gray-500">Exam Builder loading…</p>
    </div>
  )
}
