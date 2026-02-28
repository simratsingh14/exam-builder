import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import Layout from './components/Layout'
import PaperEditor from './components/PaperEditor'
import { createEmptyPaper, listPapers, getPaper, savePaper, deletePaper } from './api'
import type { Paper, PaperSummary } from './types'

export default function App() {
  const [paper, setPaper] = useState<Paper>(createEmptyPaper)
  const [summaries, setSummaries] = useState<PaperSummary[]>([])
  const [loading, setLoading] = useState(false)

  const refreshList = useCallback(async () => {
    try {
      setSummaries(await listPapers())
    } catch {
      // first load may fail in dev before backend is up
    }
  }, [])

  useEffect(() => { refreshList() }, [refreshList])

  const handleNew = () => setPaper(createEmptyPaper())

  const handleLoad = async (id: string) => {
    setLoading(true)
    try {
      setPaper(await getPaper(id))
    } catch (e) {
      toast.error(`Failed to load paper: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = useCallback(async (p: Paper) => {
    try {
      const saved = await savePaper(p)
      setPaper(saved)
      await refreshList()
      toast.success('Paper saved')
    } catch (e) {
      toast.error(`Save failed: ${e}`)
    }
  }, [refreshList])

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      savePaper(paper).then(() => refreshList()).catch(() => {})
    }, 30_000)
    return () => clearInterval(interval)
  }, [paper, refreshList])

  const handleDelete = async (id: string) => {
    try {
      await deletePaper(id)
      await refreshList()
      if (paper.id === id) setPaper(createEmptyPaper())
      toast.success('Paper deleted')
    } catch (e) {
      toast.error(`Delete failed: ${e}`)
    }
  }

  return (
    <Layout
      summaries={summaries}
      currentPaperId={paper.id}
      onNew={handleNew}
      onLoad={handleLoad}
      onDelete={handleDelete}
    >
      {loading ? (
        <div className="flex h-full items-center justify-center text-gray-500">Loading…</div>
      ) : (
        <PaperEditor paper={paper} onChange={setPaper} onSave={handleSave} />
      )}
    </Layout>
  )
}
