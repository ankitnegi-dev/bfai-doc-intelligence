'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, FileText, Clock, X, ArrowRight } from 'lucide-react'
import { getDocuments, DocumentMetadata } from '@/lib/api'
import { loadQueryHistory } from '@/lib/storage'

interface Props {
  onSelectQuery: (query: string) => void
}

export default function CmdKSearch({ onSelectQuery }: Props) {
  const [open, setOpen]         = useState(false)
  const [term, setTerm]         = useState('')
  const [docs, setDocs]         = useState<DocumentMetadata[]>([])
  const [history, setHistory]   = useState<string[]>([])
  const inputRef                = useRef<HTMLInputElement>(null)
  const params                  = useSearchParams()
  const qs                      = params.toString()

  // Open on Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
      getDocuments().then(d => setDocs(d.documents)).catch(() => {})
      setHistory(loadQueryHistory())
      setTerm('')
    }
  }, [open])

  const filteredDocs = term
    ? docs.filter(d => d.original_filename.toLowerCase().includes(term.toLowerCase()))
    : docs.slice(0, 5)

  const filteredHistory = term
    ? history.filter(q => q.toLowerCase().includes(term.toLowerCase())).slice(0, 5)
    : history.slice(0, 5)

  const handleSelectQuery = useCallback((q: string) => {
    onSelectQuery(q)
    setOpen(false)
  }, [onSelectQuery])

  const handleNavigate = useCallback((path: string) => {
    const href = qs ? `${path}?${qs}` : path
    window.location.href = href
  }, [qs])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      <div className="w-full max-w-xl mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-slide-up">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={term}
            onChange={e => setTerm(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && term.trim()) handleSelectQuery(term.trim())
            }}
            placeholder="Search documents or ask a question… (Enter to send)"
            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none"
          />
          <button onClick={() => setOpen(false)} className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
          {/* Ask as query */}
          {term.trim() && (
            <button
              onClick={() => handleSelectQuery(term.trim())}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-left transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Ask: &ldquo;{term}&rdquo;</p>
                <p className="text-xs text-slate-400">Send to chat</p>
              </div>
            </button>
          )}

          {/* Recent queries */}
          {filteredHistory.length > 0 && (
            <div>
              <p className="px-4 pt-2 pb-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Recent</p>
              {filteredHistory.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectQuery(q)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left transition-colors"
                >
                  <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{q}</span>
                </button>
              ))}
            </div>
          )}

          {/* Documents */}
          {filteredDocs.length > 0 && (
            <div>
              <p className="px-4 pt-2 pb-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Documents</p>
              {filteredDocs.map(doc => (
                <button
                  key={doc.doc_id}
                  onClick={() => handleNavigate('/upload')}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left transition-colors"
                >
                  <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{doc.original_filename}</p>
                    <p className="text-xs text-slate-400">{doc.classification?.document_type ?? 'Document'} · {doc.page_count}p</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!term && filteredHistory.length === 0 && filteredDocs.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-400">
              No documents indexed yet. <button onClick={() => handleNavigate('/upload')} className="text-blue-500 hover:underline">Upload some →</button>
            </div>
          )}
        </div>

        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex items-center gap-4 text-xs text-slate-400">
          <span><kbd className="bg-slate-200 dark:bg-slate-700 px-1 rounded">↵</kbd> send</span>
          <span><kbd className="bg-slate-200 dark:bg-slate-700 px-1 rounded">Esc</kbd> close</span>
          <span className="ml-auto"><kbd className="bg-slate-200 dark:bg-slate-700 px-1 rounded">⌘K</kbd> toggle</span>
        </div>
      </div>
    </div>
  )
}
