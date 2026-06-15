/**
 * localStorage utilities for chat session persistence, query history,
 * and custom prompt templates.
 */
import { Message } from '@/components/ChatWindow'

const SESSIONS_KEY    = 'docintel_sessions'
const HISTORY_KEY     = 'docintel_query_history'
const TEMPLATES_KEY   = 'docintel_prompt_templates'
const MAX_SESSIONS    = 20
const MAX_HISTORY     = 30

export interface ChatSession {
  id: string
  title: string          // First user message (truncated)
  messages: Message[]
  createdAt: string
  updatedAt: string
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export function saveChatSession(session: ChatSession): void {
  try {
    const all = loadChatSessions()
    const idx = all.findIndex(s => s.id === session.id)
    if (idx >= 0) {
      all[idx] = session
    } else {
      all.unshift(session)
    }
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(all.slice(0, MAX_SESSIONS)))
  } catch {
    // Quota exceeded or SSR - silently ignore
  }
}

export function loadChatSessions(): ChatSession[] {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]')
  } catch {
    return []
  }
}

export function deleteChatSession(id: string): void {
  try {
    const all = loadChatSessions().filter(s => s.id !== id)
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(all))
  } catch {}
}

export function makeChatSession(messages: Message[]): ChatSession | null {
  const userMessages = messages.filter(m => m.role === 'user')
  if (userMessages.length === 0) return null
  const firstQuery = userMessages[0].content.slice(0, 60)
  const title = firstQuery.length < userMessages[0].content.length
    ? firstQuery + '…'
    : firstQuery

  const now = new Date().toISOString()
  return {
    id: messages[0]?.id ?? crypto.randomUUID(),
    title,
    messages,
    createdAt: now,
    updatedAt: now,
  }
}

// ─── Query History ────────────────────────────────────────────────────────────

export function saveQueryToHistory(query: string): void {
  try {
    const trimmed = query.trim()
    if (!trimmed) return
    const history = loadQueryHistory().filter(q => q !== trimmed)
    history.unshift(trimmed)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)))
  } catch {}
}

export function loadQueryHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

export function clearQueryHistory(): void {
  try { localStorage.removeItem(HISTORY_KEY) } catch {}
}

// ─── Prompt Templates ─────────────────────────────────────────────────────────

export interface PromptTemplate {
  id: string
  label: string
  template: string   // May contain {query} placeholder
  isCustom: boolean
  createdAt?: string
}

/** Built-in templates - never persisted, always available. */
export const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'summarize',
    label: 'Summarize in bullet points',
    template: 'Summarize the key points of {query} in bullet points',
    isCustom: false,
  },
  {
    id: 'dates',
    label: 'Extract all dates',
    template: 'Extract all dates, deadlines, and time references from {query}',
    isCustom: false,
  },
  {
    id: 'financials',
    label: 'Key financial figures',
    template: 'What are the key financial figures, amounts, and metrics in {query}?',
    isCustom: false,
  },
  {
    id: 'parties',
    label: 'List all parties / people',
    template: 'List all parties, people, and organizations mentioned in {query}',
    isCustom: false,
  },
  {
    id: 'risks',
    label: 'Identify risks & concerns',
    template: 'What are the main risks, concerns, or caveats in {query}?',
    isCustom: false,
  },
  {
    id: 'compare',
    label: 'Compare documents',
    template: 'Compare and contrast the documents regarding {query}',
    isCustom: false,
  },
]

export function loadCustomTemplates(): PromptTemplate[] {
  try {
    return JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveCustomTemplate(template: PromptTemplate): void {
  try {
    const all = loadCustomTemplates().filter(t => t.id !== template.id)
    all.unshift(template)
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(all.slice(0, 20)))
  } catch {}
}

export function deleteCustomTemplate(id: string): void {
  try {
    const all = loadCustomTemplates().filter(t => t.id !== id)
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(all))
  } catch {}
}

/**
 * Apply a template to a query string.
 * If the template has a {query} placeholder, substitutes it.
 * Otherwise prepends the template to the query.
 */
export function applyTemplate(template: PromptTemplate, query: string): string {
  const q = query.trim() || 'the document'
  if (template.template.includes('{query}')) {
    return template.template.replace('{query}', q)
  }
  return query ? `${template.template}: ${query}` : template.template
}
