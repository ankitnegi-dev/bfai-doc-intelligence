'use client'
import { useRef, useEffect, useState } from 'react'
import { Bot, User, AlertCircle, Copy, Check, Zap } from 'lucide-react'
import CitationCard from './CitationCard'
import { Citation } from '@/lib/api'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  sources_found?: boolean
  follow_ups?: string[]
  isStreaming?: boolean
  timestamp: Date
}

interface ChatWindowProps {
  messages: Message[]
  isLoading: boolean
  onFollowUp?: (question: string) => void
}

// ─── Markdown renderer (no external dependency) ─────────────────────────────

function renderInline(text: string): React.ReactNode[] {
  // Handle **bold**, *italic*, `code`, and [Doc, Page N] citation markers
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+,\s*[Pp]age\s+\d+\])/g
  const parts = text.split(pattern)
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={i} className="font-semibold text-slate-900 dark:text-slate-100">{part.slice(2, -2)}</strong>
    }
    if (/^\*[^*]+\*$/.test(part)) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    if (/^`[^`]+`$/.test(part)) {
      return <code key={i} className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>
    }
    if (/^\[[^\]]+,\s*[Pp]age\s+\d+\]$/.test(part)) {
      return <span key={i} className="citation-marker">{part}</span>
    }
    return <span key={i}>{part}</span>
  })
}

function MarkdownBlock({ text, isStreaming }: { text: string; isStreaming?: boolean }) {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // h2
    if (/^##\s/.test(line)) {
      nodes.push(
        <h2 key={i} className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-3 mb-1 border-b border-slate-200 dark:border-slate-700 pb-0.5">
          {renderInline(line.slice(3))}
        </h2>
      )
      i++; continue
    }

    // h3
    if (/^###\s/.test(line)) {
      nodes.push(
        <h3 key={i} className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-2 mb-0.5">
          {renderInline(line.slice(4))}
        </h3>
      )
      i++; continue
    }

    // Table: collect rows
    if (/^\|/.test(line)) {
      const rows: string[][] = []
      while (i < lines.length && /^\|/.test(lines[i])) {
        // Skip separator rows (---|---|---)
        if (!/^\|[-\s|:]+\|?$/.test(lines[i])) {
          rows.push(lines[i].split('|').map(c => c.trim()).filter(c => c !== ''))
        }
        i++
      }
      if (rows.length > 0) {
        const [header, ...body] = rows
        nodes.push(
          <div key={i} className="overflow-x-auto my-2">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  {header.map((cell, ci) => (
                    <th key={ci} className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold px-2 py-1.5 border border-slate-200 dark:border-slate-600 text-left">
                      {renderInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 1 ? 'bg-slate-50 dark:bg-slate-800' : ''}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-2 py-1.5 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-300">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      continue
    }

    // Bullet list: collect consecutive bullet lines
    if (/^[-*]\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].slice(2))
        i++
      }
      nodes.push(
        <ul key={i} className="list-disc list-outside pl-4 my-1.5 space-y-0.5">
          {items.map((item, ii) => (
            <li key={ii} className="text-sm leading-relaxed text-slate-800 dark:text-slate-300">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''))
        i++
      }
      nodes.push(
        <ol key={i} className="list-decimal list-outside pl-4 my-1.5 space-y-0.5">
          {items.map((item, ii) => (
            <li key={ii} className="text-sm leading-relaxed text-slate-800 dark:text-slate-300">
              {renderInline(item)}
            </li>
          ))}
        </ol>
      )
      continue
    }

    // Blockquote
    if (/^>\s/.test(line)) {
      nodes.push(
        <blockquote key={i} className="border-l-4 border-blue-300 dark:border-blue-600 pl-3 italic text-slate-600 dark:text-slate-400 my-1.5 text-sm">
          {renderInline(line.slice(2))}
        </blockquote>
      )
      i++; continue
    }

    // Blank line → spacer
    if (line.trim() === '') {
      i++; continue
    }

    // Regular paragraph
    nodes.push(
      <p key={i} className="text-sm leading-relaxed text-slate-800 dark:text-slate-300 mb-1.5">
        {renderInline(line)}
        {isStreaming && i === lines.length - 1 && <span className="stream-cursor" />}
      </p>
    )
    i++
  }

  return <div className="space-y-0.5">{nodes}</div>
}

// ─── Copy button ─────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard not available
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
      aria-label="Copy to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-3 px-4 py-3">
      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-blue-600 dark:text-blue-300" />
      </div>
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ChatWindow({ messages, isLoading, onFollowUp }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <Bot className="w-12 h-12 text-blue-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
            Ask anything about your documents
          </h3>
          <p className="text-slate-400 dark:text-slate-500 text-sm leading-relaxed">
            I&apos;ll answer with citations showing the exact source page.
            Upload documents first using the Upload tab.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-2 text-left">
            {[
              'What is the total amount due on the invoice?',
              'What was the Q3 2024 revenue for GlobalTech?',
              'What are the key findings of the research paper?',
            ].map((q, i) => (
              <button
                key={i}
                onClick={() => onFollowUp?.(q)}
                className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-lg px-3 py-2 text-sm text-blue-700 dark:text-blue-300 text-left hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                &ldquo;{q}&rdquo;
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-1 py-2">
      {messages.map(msg => (
        <div
          key={msg.id}
          className={`px-4 py-2 animate-message-in ${msg.role === 'user' ? 'flex justify-end' : ''}`}
        >
          {msg.role === 'user' ? (
            // User message (right-aligned)
            <div className="flex items-start gap-2 max-w-[80%]">
              <div className="bg-blue-600 dark:bg-blue-700 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </div>
            </div>
          ) : (
            // Assistant message (left-aligned)
            <div className="flex gap-3 max-w-full">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                msg.isStreaming ? 'bg-blue-100 dark:bg-blue-900 animate-pulse' : 'bg-blue-100 dark:bg-blue-900'
              }`}>
                <Bot className="w-4 h-4 text-blue-600 dark:text-blue-300" />
              </div>

              <div className="flex-1 min-w-0">
                {/* Answer bubble */}
                <div className={`rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm max-w-3xl ${
                  msg.sources_found === false && !msg.isStreaming
                    ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                }`}>
                  {/* No-results banner */}
                  {msg.sources_found === false && !msg.isStreaming && (
                    <div className="flex items-center gap-1.5 mb-2 text-amber-600 dark:text-amber-400">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="text-xs font-medium">No relevant documents found</span>
                    </div>
                  )}

                  {/* Streaming indicator */}
                  {msg.isStreaming && (
                    <div className="flex items-center gap-1.5 mb-2 text-blue-500 dark:text-blue-400">
                      <Zap className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="text-xs font-medium">Generating…</span>
                    </div>
                  )}

                  {/* Markdown content */}
                  <MarkdownBlock text={msg.content} isStreaming={msg.isStreaming} />

                  {/* Footer: timestamp + copy */}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {!msg.isStreaming && msg.content && (
                      <CopyButton text={msg.content} />
                    )}
                  </div>
                </div>

                {/* Citations */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                      <span>📄</span>
                      <span>Sources ({msg.citations.length})</span>
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {msg.citations.map((citation, i) => (
                        <CitationCard key={`${citation.doc_id}-${citation.page_num}-${i}`} citation={citation} index={i} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Follow-up question chips */}
                {msg.follow_ups && msg.follow_ups.length > 0 && !msg.isStreaming && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                      <span>💡</span>
                      <span>Follow-up suggestions</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.follow_ups.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => onFollowUp?.(q)}
                          className="text-xs px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 hover:border-blue-300 dark:hover:border-blue-600 transition-all text-left"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {isLoading && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  )
}
