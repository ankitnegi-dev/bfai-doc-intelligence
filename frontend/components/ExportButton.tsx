'use client'
import { useState } from 'react'
import { Download, Check } from 'lucide-react'
import { Message } from '@/components/ChatWindow'

interface Props {
  messages: Message[]
}

function messagestoMarkdown(messages: Message[]): string {
  const lines: string[] = [
    '# DocIntel - Chat Export',
    `> Exported on ${new Date().toLocaleString()}`,
    '',
  ]

  for (const msg of messages) {
    if (msg.role === 'user') {
      lines.push(`## 🙋 Question`)
      lines.push('')
      lines.push(msg.content)
      lines.push('')
    } else {
      lines.push(`## 🤖 Answer`)
      lines.push('')
      lines.push(msg.content)
      lines.push('')

      if (msg.citations && msg.citations.length > 0) {
        lines.push('**Sources:**')
        for (const c of msg.citations) {
          lines.push(`- ${c.doc_name}, Page ${c.page_num}: "${c.excerpt}"`)
        }
        lines.push('')
      }

      if (msg.follow_ups && msg.follow_ups.length > 0) {
        lines.push('**Follow-up suggestions:**')
        for (const q of msg.follow_ups) {
          lines.push(`- ${q}`)
        }
        lines.push('')
      }
    }
    lines.push('---')
    lines.push('')
  }

  return lines.join('\n')
}

export default function ExportButton({ messages }: Props) {
  const [done, setDone] = useState(false)

  const handleExport = () => {
    const md = messagestoMarkdown(messages)
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `docintel-chat-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
    setDone(true)
    setTimeout(() => setDone(false), 2000)
  }

  if (messages.filter(m => m.role === 'assistant').length === 0) return null

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
      title="Export chat as Markdown"
    >
      {done ? (
        <><Check className="w-3.5 h-3.5 text-green-500" /> Exported</>
      ) : (
        <><Download className="w-3.5 h-3.5" /> Export</>
      )}
    </button>
  )
}
