'use client'
import { useEffect } from 'react'
import { X, FileText } from 'lucide-react'
import { getPageImageUrl } from '@/lib/api'

interface PageModalProps {
  docId: string
  docName: string
  pageNum: number
  onClose: () => void
}

export default function PageModal({ docId, docName, pageNum, onClose }: PageModalProps) {
  const imageUrl = getPageImageUrl(docId, pageNum)

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Prevent scroll on body
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            <div>
              <p className="font-semibold text-slate-800 text-sm">{docName}</p>
              <p className="text-xs text-slate-500">Page {pageNum}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={`${docName} page ${pageNum}`}
            className="max-w-full max-h-full object-contain rounded shadow-md"
            onError={e => {
              const target = e.currentTarget
              target.style.display = 'none'
              const parent = target.parentElement
              if (parent && !parent.querySelector('.error-msg')) {
                const msg = document.createElement('div')
                msg.className = 'error-msg text-center text-slate-400 p-8'
                msg.innerHTML = '<p class="text-lg mb-2">Page image not available</p><p class="text-sm">The document may still be processing.</p>'
                parent.appendChild(msg)
              }
            }}
          />
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 flex justify-between items-center bg-white">
          <p className="text-xs text-slate-400">Press Esc or click outside to close</p>
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
          >
            Open full size
          </a>
        </div>
      </div>
    </div>
  )
}
