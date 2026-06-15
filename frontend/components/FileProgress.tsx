'use client'
import { useState } from 'react'
import { CheckCircle, XCircle, Loader2, Clock, FileText, RefreshCw, X, ChevronDown, Tag } from 'lucide-react'

export interface FileItem {
  id: string
  file: File
  status: 'queued' | 'uploading' | 'parsing' | 'classifying' | 'indexing' | 'indexed' | 'error'
  progress: number
  message?: string
  error?: string
  docId?: string
  summary?: string          // Auto-generated summary from classification
  keyEntities?: string[]    // Key entities extracted during classification
  documentType?: string     // Document type label
}

interface FileProgressProps {
  files: FileItem[]
  onRetry: (id: string) => void
  onRemove: (id: string) => void
}

// Ordered pipeline steps
const PIPELINE = [
  { key: 'uploading',   label: 'Upload',   short: '↑' },
  { key: 'parsing',     label: 'Parse',    short: '🔍' },
  { key: 'classifying', label: 'Classify', short: '🧠' },
  { key: 'indexing',    label: 'Index',    short: '🗄' },
  { key: 'indexed',     label: 'Done',     short: '✓' },
]

const STAGE_ORDER = ['queued', 'uploading', 'parsing', 'classifying', 'indexing', 'indexed']

function stageIndex(status: string): number {
  return STAGE_ORDER.indexOf(status)
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Circular ring progress for active files
function RingProgress({ pct, active, done, error }: { pct: number; active: boolean; done: boolean; error: boolean }) {
  const r = 16
  const circ = 2 * Math.PI * r
  const fill = error ? 0 : done ? circ : (pct / 100) * circ

  return (
    <svg width="44" height="44" className="flex-shrink-0 -rotate-90">
      {/* Track */}
      <circle cx="22" cy="22" r={r} fill="none" strokeWidth="3"
        className="stroke-slate-200 dark:stroke-slate-700" />
      {/* Progress */}
      <circle cx="22" cy="22" r={r} fill="none" strokeWidth="3"
        strokeLinecap="round"
        style={{
          strokeDasharray: circ,
          strokeDashoffset: circ - fill,
          transition: 'stroke-dashoffset 0.5s ease',
        }}
        className={
          error ? 'stroke-red-400' :
          done  ? 'stroke-emerald-500' :
          active ? 'stroke-blue-500' :
          'stroke-slate-300 dark:stroke-slate-600'
        }
      />
      {/* Center icon */}
      <g className="rotate-90" style={{ transformOrigin: '22px 22px' }}>
        {error ? (
          <text x="22" y="26" textAnchor="middle" fontSize="12" className="fill-red-500">✕</text>
        ) : done ? (
          <text x="22" y="26" textAnchor="middle" fontSize="12" className="fill-emerald-500">✓</text>
        ) : active ? (
          <text x="22" y="26" textAnchor="middle" fontSize="10" className="fill-blue-500 font-medium">{pct}%</text>
        ) : (
          <text x="22" y="26" textAnchor="middle" fontSize="10" className="fill-slate-400">-</text>
        )}
      </g>
    </svg>
  )
}

function SummaryCard({ item }: { item: FileItem }) {
  const [expanded, setExpanded] = useState(false)
  if (!item.summary) return null

  return (
    <div className="mt-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <div className="flex items-center gap-1.5">
          <Tag className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
            Auto-Summary
          </span>
          {item.documentType && (
            <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-medium">
              {item.documentType}
            </span>
          )}
        </div>
        <ChevronDown className={`w-3 h-3 text-emerald-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="px-3 pb-3">
          <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
            {item.summary}
          </p>
          {item.keyEntities && item.keyEntities.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.keyEntities.slice(0, 6).map((entity, i) => (
                <span
                  key={i}
                  className="text-[9px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full"
                >
                  {entity}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function FileProgress({ files, onRetry, onRemove }: FileProgressProps) {
  if (files.length === 0) return null

  const PROGRESS_MAP: Record<string, number> = {
    queued: 0, uploading: 20, parsing: 42, classifying: 65, indexing: 85, indexed: 100, error: 0,
  }

  return (
    <div className="mt-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Processing Queue
          <span className="ml-2 text-xs font-normal text-slate-400">{files.length} file{files.length !== 1 ? 's' : ''}</span>
        </h3>
        <div className="flex gap-3 text-xs">
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            {files.filter(f => f.status === 'indexed').length} indexed
          </span>
          {files.filter(f => f.status === 'error').length > 0 && (
            <span className="text-red-500 font-medium">
              {files.filter(f => f.status === 'error').length} failed
            </span>
          )}
        </div>
      </div>

      {files.map((item, fileIdx) => {
        const isActive = ['uploading', 'parsing', 'classifying', 'indexing'].includes(item.status)
        const isDone = item.status === 'indexed'
        const isError = item.status === 'error'
        const pct = PROGRESS_MAP[item.status] || item.progress
        const currentStageIdx = stageIndex(item.status)

        return (
          <div
            key={item.id}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm animate-message-in"
            style={{ animationDelay: `${fileIdx * 60}ms` }}
          >
            <div className="flex items-start gap-3">
              {/* Ring progress */}
              <RingProgress pct={pct} active={isActive} done={isDone} error={isError} />

              {/* File info + pipeline */}
              <div className="flex-1 min-w-0">
                {/* Filename + actions */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{item.file.name}</p>
                    <span className="text-xs text-slate-400 flex-shrink-0">{formatFileSize(item.file.size)}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isError && (
                      <button onClick={() => onRetry(item.id)}
                        className="p-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded text-slate-400 hover:text-blue-600 transition-colors"
                        title="Retry">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {(isDone || isError) && (
                      <button onClick={() => onRemove(item.id)}
                        className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-slate-300 hover:text-red-500 transition-colors"
                        title="Remove">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Pipeline stepper */}
                {item.status !== 'queued' && !isError && (
                  <div className="flex items-center gap-0">
                    {PIPELINE.map((stage, si) => {
                      const stageI = stageIndex(stage.key)
                      const completed = currentStageIdx > stageI
                      const active    = currentStageIdx === stageI
                      const upcoming  = currentStageIdx < stageI

                      return (
                        <div key={stage.key} className="flex items-center flex-1">
                          {/* Node */}
                          <div className="flex flex-col items-center">
                            <div className={`
                              w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                              ${completed ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200 dark:shadow-emerald-900' :
                                active    ? 'bg-blue-500 text-white shadow-sm shadow-blue-200 dark:shadow-blue-900 ring-2 ring-blue-300 dark:ring-blue-700' :
                                            'bg-slate-100 dark:bg-slate-700 text-slate-400'}
                            `}>
                              {completed ? '✓' : active ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : stage.short}
                            </div>
                            <span className={`text-[9px] mt-0.5 font-medium ${
                              completed ? 'text-emerald-600 dark:text-emerald-400' :
                              active    ? 'text-blue-600 dark:text-blue-400' :
                                          'text-slate-400 dark:text-slate-500'
                            }`}>
                              {stage.label}
                            </span>
                          </div>

                          {/* Connector (not after last) */}
                          {si < PIPELINE.length - 1 && (
                            <div className={`flex-1 h-0.5 mb-3.5 mx-0.5 rounded transition-all duration-500 ${
                              completed ? 'bg-emerald-400' :
                              active    ? 'bg-gradient-to-r from-blue-500 to-slate-200 dark:to-slate-600' :
                                          'bg-slate-200 dark:bg-slate-600'
                            }`} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Queued state */}
                {item.status === 'queued' && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    Waiting to start…
                  </div>
                )}

                {/* Error state */}
                {isError && (
                  <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
                    <XCircle className="w-3.5 h-3.5" />
                    {item.error || 'Upload failed'}
                  </div>
                )}

                {/* Status message */}
                {item.message && !isError && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{item.message}</p>
                )}

                {/* Done badge */}
                {isDone && (
                  <div className="flex items-center gap-1 mt-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      Successfully indexed - ready to chat
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Auto-summary card (shown after indexing) */}
            {isDone && <SummaryCard item={item} />}
          </div>
        )
      })}
    </div>
  )
}
