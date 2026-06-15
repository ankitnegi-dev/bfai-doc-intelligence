'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { Send, Trash2, LayoutList, GitCompare, History, X } from 'lucide-react'
import ChatWindow, { Message } from '@/components/ChatWindow'
import VoiceInput from '@/components/VoiceInput'
import DocumentsSidebar from '@/components/DocumentsSidebar'
import ExportButton from '@/components/ExportButton'
import CmdKSearch from '@/components/CmdKSearch'
import PromptTemplates from '@/components/PromptTemplates'
import { streamChatMessage } from '@/lib/api'
import {
  saveChatSession,
  loadChatSessions,
  deleteChatSession,
  makeChatSession,
  saveQueryToHistory,
  ChatSession,
} from '@/lib/storage'

export default function ChatPage() {
  const [messages, setMessages]       = useState<Message[]>([])
  const [input, setInput]             = useState('')
  const [isLoading, setIsLoading]     = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [comparisonMode, setComparisonMode] = useState(false)
  const [sessionId, setSessionId]     = useState<string>(() => crypto.randomUUID())
  const [sessions, setSessions]       = useState<ChatSession[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef    = useRef<AbortController | null>(null)

  // Load sessions from localStorage on mount
  useEffect(() => {
    setSessions(loadChatSessions())
  }, [])

  // Clean up any in-flight stream on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  // Auto-save session whenever messages change (debounced)
  useEffect(() => {
    if (messages.length === 0) return
    const timer = setTimeout(() => {
      const session = makeChatSession(messages)
      if (!session) return
      const saved: ChatSession = { ...session, id: sessionId }
      saveChatSession(saved)
      setSessions(loadChatSessions())
    }, 800)
    return () => clearTimeout(timer)
  }, [messages, sessionId])

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`
  }

  const handleVoiceTranscript = useCallback((text: string) => {
    setInput(text)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
    }
  }, [])

  const handleSubmit = useCallback(async (queryOverride?: string) => {
    const query = (queryOverride ?? input).trim()
    if (!query || isLoading) return

    // Save to query history
    saveQueryToHistory(query)

    // Cancel any active stream
    abortRef.current?.abort()

    // Add user message
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query,
      timestamp: new Date(),
    }

    // Add a placeholder streaming assistant message
    const streamId = crypto.randomUUID()
    const streamMsg: Message = {
      id: streamId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg, streamMsg])
    setInput('')
    setComparisonMode(false)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setIsLoading(true)

    // Build history snapshot (exclude current streaming placeholder)
    const historySnapshot = messages.slice(-8).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    abortRef.current = streamChatMessage(
      query,
      historySnapshot,
      // onText
      (delta) => {
        setMessages(prev =>
          prev.map(m =>
            m.id === streamId ? { ...m, content: m.content + delta } : m
          )
        )
      },
      // onDone
      (data) => {
        if (data.comparison_mode) setComparisonMode(true)
        setMessages(prev =>
          prev.map(m =>
            m.id === streamId
              ? {
                  ...m,
                  isStreaming: false,
                  citations: data.citations,
                  sources_found: data.sources_found,
                  follow_ups: data.follow_ups,
                }
              : m
          )
        )
        setIsLoading(false)
      },
      // onError
      (message) => {
        setMessages(prev =>
          prev.map(m =>
            m.id === streamId
              ? {
                  ...m,
                  isStreaming: false,
                  content: m.content || `⚠️ ${message}`,
                  sources_found: false,
                }
              : m
          )
        )
        setIsLoading(false)
      }
    )
  }, [input, isLoading, messages])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleClearChat = () => {
    abortRef.current?.abort()
    setMessages([])
    setIsLoading(false)
    setComparisonMode(false)
    setSessionId(crypto.randomUUID())  // Start a fresh session
  }

  const handleFollowUp = useCallback((question: string) => {
    setInput(question)
    setTimeout(() => handleSubmit(question), 0)
  }, [handleSubmit])

  // Load a previous session
  const loadSession = (session: ChatSession) => {
    abortRef.current?.abort()
    setMessages(session.messages)
    setSessionId(session.id)
    setIsLoading(false)
    setComparisonMode(false)
    setHistoryOpen(false)
  }

  const removeSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteChatSession(id)
    setSessions(loadChatSessions())
  }

  const userCount = messages.filter(m => m.role === 'user').length

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* Cmd+K global search */}
      <CmdKSearch onSelectQuery={handleFollowUp} />

      {/* Documents sidebar */}
      <DocumentsSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)} />

      {/* Chat history panel */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setHistoryOpen(false)} />
          {/* Panel */}
          <div className="relative ml-auto w-72 h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-700 animate-slide-up">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Chat History</h2>
              <button onClick={() => setHistoryOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {sessions.length === 0 ? (
                <p className="text-xs text-slate-400 text-center mt-8 px-4">No saved sessions yet. Start chatting!</p>
              ) : (
                sessions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => loadSession(s)}
                    className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group ${s.id === sessionId ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{s.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {s.messages.filter(m => m.role === 'user').length} questions · {new Date(s.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => removeSession(s.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-all flex-shrink-0"
                        title="Delete session"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={handleClearChat}
                className="w-full text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                + New chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-6'}`}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            {/* Sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-all"
              aria-label="Toggle documents sidebar"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            {/* Comparison mode badge */}
            {comparisonMode && (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-700">
                <GitCompare className="w-3 h-3" /> Comparison mode
              </span>
            )}
            {userCount > 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {userCount} question{userCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Right-side actions */}
          <div className="flex items-center gap-1">
            {/* Cmd+K hint */}
            <span className="hidden sm:flex items-center text-[10px] text-slate-300 dark:text-slate-600 mr-1">
              <kbd className="bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-1 py-0.5 rounded text-[9px] font-mono">⌘K</kbd>
              <span className="ml-1">search</span>
            </span>
            {/* Export button */}
            <ExportButton messages={messages} />
            {/* History button */}
            <button
              onClick={() => setHistoryOpen(o => !o)}
              className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Chat history"
            >
              <History className="w-3.5 h-3.5" />
              {sessions.length > 0 && (
                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-medium">
                  {sessions.length}
                </span>
              )}
            </button>
            {/* Clear chat */}
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-950">
          <ChatWindow
            messages={messages}
            isLoading={false}
            onFollowUp={handleFollowUp}
          />
        </div>

        {/* Input bar */}
        <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-3">
          <div className="max-w-4xl mx-auto">
            {/* Template picker row */}
            <div className="flex items-center gap-2 mb-1.5 px-1">
              <PromptTemplates
                currentInput={input}
                onApply={(text) => {
                  setInput(text)
                  if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto'
                    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
                    textareaRef.current.focus()
                  }
                }}
              />
            </div>

            <div className="flex items-end gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2 shadow-sm focus-within:border-blue-300 dark:focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/50 transition-all">
              <VoiceInput
                onTranscript={handleVoiceTranscript}
                disabled={isLoading}
              />
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your documents… (Enter to send, ⌘K to search)"
                rows={1}
                disabled={isLoading}
                className="flex-1 resize-none bg-transparent text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none py-1.5 max-h-40 leading-relaxed disabled:opacity-60"
              />
              <button
                onClick={() => handleSubmit()}
                disabled={!input.trim() || isLoading}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0 shadow-sm"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 text-center">
              Answers grounded in your uploaded documents · page citations included
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
