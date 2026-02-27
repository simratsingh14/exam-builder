import type { ReactNode } from 'react'
import Sidebar from './Sidebar'
import type { PaperSummary } from '../types'

interface Props {
  summaries: PaperSummary[]
  currentPaperId: string
  onNew: () => void
  onLoad: (id: string) => void
  onDelete: (id: string) => void
  children: ReactNode
}

export default function Layout({ summaries, currentPaperId, onNew, onLoad, onDelete, children }: Props) {
  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <Sidebar
        summaries={summaries}
        currentPaperId={currentPaperId}
        onNew={onNew}
        onLoad={onLoad}
        onDelete={onDelete}
      />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-4xl">
          {children}
        </div>
      </main>
    </div>
  )
}
