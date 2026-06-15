'use client'
import { useState } from 'react'
import { FileText, Maximize2, ChevronDown, AlignLeft } from 'lucide-react'
import { Citation, getPageImageUrl } from '@/lib/api'
import PageModal from './PageModal'

// Badge colour per doc-name guess
function docColour(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('invoice'))   return 'bg-green-100 text-green-700  dark:bg-green-900/50 dark:text-green-300'
  if (n.includes('financial') || n.includes('report')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
  if (n.includes('contract') || n.includes('license')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
  if (n.includes('medical') || n.includes('record'))   return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
  if (n.includes('research') || n.includes('paper'))   return 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
  if (n.includes('meeting'))   return 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300'
  return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
}

interface CitationCardProps {
  citation: Citation
  index: number
}

export default function CitationCard({ citation, index }: CitationCardProps) {
  const [showModal, setShowModal]       = useState(false)
  const [imgError, setImgError]         = useState(false)
  const [excerptExpanded, setExcerptExpanded] = useState(false)
  const [chunkExpanded, setChunkExpanded]     = useState(false)
  const imageUrl = getPageImageUrl(citation.doc_id, citation.page_num)

  return (
    <>
      <div
        className={`
          group relative border rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm
          transition-all duration-200 ease-out
          hover:shadow-md hover:-translate-y-0.5 hover:border-blue-200 dark:hover:border-blue-700
          ${excerptExpanded || chunkExpanded ? 'border-blue-200 dark:border-blue-700 shadow-md' : 'border-slate-200 dark:border-slate-700'}
        `}
      >
        {/* Index ribbon */}
        <div className="absolute top-2 left-2 z-10 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
          {index + 1}
        </div>

        {/* Page thumbnail */}
        <button
          onClick={() => setShowModal(true)}
          className="block w-full relative overflow-hidden"
          aria-label={`View page ${citation.page_num} of ${citation.doc_name}`}
        >
          {!imgError ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={`${citation.doc_name} p.${citation.page_num}`}
                className="w-full h-28 object-cover object-top transition-transform duration-300 group-hover:scale-105"
                onError={() => setImgError(true)}
              />
              {/* Dark overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-center pb-2">
                <span className="text-white text-xs font-medium flex items-center gap-1">
                  <Maximize2 className="w-3.5 h-3.5" /> View page
                </span>
              </div>
            </>
          ) : (
            <div className="w-full h-28 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-8 h-8 text-slate-300 dark:text-slate-500 mx-auto mb-1" />
                <p className="text-xs text-slate-400">Page {citation.page_num}</p>
              </div>
            </div>
          )}
        </button>

        {/* Card footer */}
        <div className="px-2.5 pt-2 pb-2">
          {/* Doc name + page */}
          <div className="flex items-start justify-between gap-1 mb-1.5">
            <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 leading-tight line-clamp-2 flex-1">
              {citation.doc_name}
            </p>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${docColour(citation.doc_name)}`}>
              p.{citation.page_num}
            </span>
          </div>

          {/* Excerpt with expand toggle */}
          {citation.excerpt && (
            <div className="mb-1.5">
              <p className={`text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed transition-all duration-200 ${excerptExpanded ? '' : 'line-clamp-2'}`}>
                &ldquo;{citation.excerpt}&rdquo;
              </p>
              {citation.excerpt.length > 80 && (
                <button
                  onClick={() => setExcerptExpanded(e => !e)}
                  className="flex items-center gap-0.5 mt-0.5 text-[10px] text-blue-500 hover:text-blue-600 transition-colors"
                >
                  <ChevronDown className={`w-3 h-3 transition-transform ${excerptExpanded ? 'rotate-180' : ''}`} />
                  {excerptExpanded ? 'less' : 'more'}
                </button>
              )}
            </div>
          )}

          {/* Chunk text accordion */}
          {citation.chunk_text && (
            <div className="mt-1 border-t border-slate-100 dark:border-slate-700 pt-1.5">
              <button
                onClick={() => setChunkExpanded(e => !e)}
                className="flex items-center gap-1 w-full text-[10px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <AlignLeft className="w-3 h-3 flex-shrink-0" />
                <span className="font-medium">Source chunk</span>
                <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${chunkExpanded ? 'rotate-180' : ''}`} />
              </button>
              {chunkExpanded && (
                <div className="mt-1.5 max-h-40 overflow-y-auto rounded-md bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 px-2 py-1.5">
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap font-mono">
                    {citation.chunk_text}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <PageModal
          docId={citation.doc_id}
          docName={citation.doc_name}
          pageNum={citation.page_num}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
