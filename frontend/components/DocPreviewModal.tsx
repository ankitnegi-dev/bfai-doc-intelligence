'use client'
import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, FileText, ZoomIn } from 'lucide-react'
import { DocumentMetadata, getPageImageUrl } from '@/lib/api'

interface Props {
  doc: DocumentMetadata
  onClose: () => void
}

export default function DocPreviewModal({ doc, onClose }: Props) {
  const [page, setPage]   = useState(1)
  const [errors, setErrors] = useState<Set<number>>(new Set())
  const totalPages = doc.page_count || 1

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setPage(p => Math.min(p + 1, totalPages))
      if (e.key === 'ArrowLeft')  setPage(p => Math.max(p - 1, 1))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, totalPages])

  const imgUrl = getPageImageUrl(doc.doc_id, page)

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-2xl mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{doc.original_filename}</p>
            {doc.classification?.document_type && (
              <span className="text-xs bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full flex-shrink-0">
                {doc.classification.document_type}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Page view */}
        <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4 min-h-0">
          {errors.has(page) ? (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <FileText className="w-16 h-16" />
              <p className="text-sm">No preview for page {page}</p>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={imgUrl}
              src={imgUrl}
              alt={`${doc.original_filename} - page ${page}`}
              className="max-w-full max-h-full rounded-lg shadow-lg object-contain"
              onError={() => setErrors(prev => new Set(prev).add(page))}
            />
          )}
        </div>

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-slate-700 flex-shrink-0 bg-white dark:bg-slate-900">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:text-slate-900 dark:hover:text-white transition-colors px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>

            {/* Page thumbnails strip */}
            <div className="flex items-center gap-1 overflow-x-auto max-w-xs">
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded text-xs font-medium flex-shrink-0 transition-all ${
                    p === page
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {p}
                </button>
              ))}
              {totalPages > 10 && (
                <span className="text-xs text-slate-400 ml-1">+{totalPages - 10} more</span>
              )}
            </div>

            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:text-slate-900 dark:hover:text-white transition-colors px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Meta strip */}
        {doc.classification?.summary && (
          <div className="px-5 py-2.5 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-900 flex-shrink-0">
            <p className="text-xs text-blue-700 dark:text-blue-300 line-clamp-2">
              <ZoomIn className="w-3 h-3 inline mr-1" />
              {doc.classification.summary}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
