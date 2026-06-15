/**
 * API Client - centralized Axios wrapper + streaming fetch helpers for all backend calls.
 */
import axios, { AxiosProgressEvent } from 'axios'

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  timeout: 120000, // 2 min for large docs
})

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface Citation {
  doc_name: string
  doc_id: string
  page_num: number
  image_path: string
  excerpt: string
  chunk_text?: string   // Full source chunk for transparency
}

export interface ChatResponse {
  answer: string
  citations: Citation[]
  sources_found: boolean
}

export interface StreamDoneEvent {
  citations: Citation[]
  follow_ups: string[]
  sources_found: boolean
  comparison_mode?: boolean
}

export interface UploadResponse {
  doc_id: string
  filename: string
  status: string
  message?: string
}

export interface ProcessingStatus {
  doc_id: string
  filename: string
  status: 'queued' | 'parsing' | 'classifying' | 'indexing' | 'indexed' | 'error'
  progress: number
  message: string
  error?: string
}

export interface DocumentMetadata {
  doc_id: string
  original_filename: string
  upload_time: string
  page_count: number
  file_size: number
  classification?: {
    document_type: string
    topic_domain: string
    sensitivity_level: string
    summary: string
    key_entities: string[]
    classification_confidence: number
    content_characteristics?: {
      has_tables: boolean
      is_scanned: boolean
      text_density: string
    }
  }
  status: string
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Send a chat message to the RAG agent (non-streaming).
 */
export const sendChatMessage = async (
  query: string,
  history: ChatMessage[]
): Promise<ChatResponse> => {
  const response = await api.post<ChatResponse>('/chat', { query, history })
  return response.data
}

/**
 * Stream a chat message via SSE.
 * Calls onText for each delta, onDone when complete, onError on failure.
 * Returns an AbortController so callers can cancel mid-stream.
 */
export const streamChatMessage = (
  query: string,
  history: ChatMessage[],
  onText: (delta: string) => void,
  onDone: (data: StreamDoneEvent) => void,
  onError: (message: string) => void,
): AbortController => {
  const controller = new AbortController()

  const run = async () => {
    try {
      const response = await fetch(`${API_URL}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, history }),
        signal: controller.signal,
      })

      if (!response.ok || !response.body) {
        onError(`Request failed: ${response.status}`)
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE lines from buffer
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''  // Keep incomplete last line in buffer

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue
          const raw = trimmed.slice(6).trim()
          if (!raw) continue

          try {
            const event = JSON.parse(raw)
            if (event.type === 'text') {
              onText(event.delta ?? '')
            } else if (event.type === 'done') {
              onDone({
                citations: event.citations ?? [],
                follow_ups: event.follow_ups ?? [],
                sources_found: event.sources_found ?? false,
              })
            } else if (event.type === 'error') {
              onError(event.message ?? 'Unknown error')
            }
          } catch {
            // Ignore malformed JSON
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      onError(err instanceof Error ? err.message : 'Stream error')
    }
  }

  run()
  return controller
}

/**
 * Upload a single document.
 */
export const uploadDocument = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResponse> => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post<UploadResponse>('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event: AxiosProgressEvent) => {
      if (onProgress && event.total) {
        const progress = Math.round((event.loaded * 100) / event.total)
        onProgress(progress)
      }
    },
  })
  return response.data
}

/**
 * Poll processing status for a document.
 */
export const getProcessingStatus = async (docId: string): Promise<ProcessingStatus> => {
  const response = await api.get<ProcessingStatus>(`/status/${docId}`)
  return response.data
}

/**
 * Get all indexed documents.
 */
export const getDocuments = async (): Promise<{ documents: DocumentMetadata[]; total: number }> => {
  const response = await api.get('/documents')
  return response.data
}

/**
 * Delete a document by ID.
 */
export const deleteDocument = async (docId: string): Promise<void> => {
  await api.delete(`/documents/${docId}`)
}

/**
 * Get page image URL (served via backend endpoint).
 */
export const getPageImageUrl = (docId: string, pageNum: number): string => {
  return `${API_URL}/page-image?doc_id=${docId}&page=${pageNum}`
}

/**
 * Get a single document by ID.
 */
export const getDocumentById = async (docId: string): Promise<DocumentMetadata> => {
  const response = await api.get<DocumentMetadata>(`/documents/${docId}`)
  return response.data
}

/**
 * Health check.
 */
export const healthCheck = async (): Promise<{ status: string; indexed_chunks: number; api_configured: boolean }> => {
  const response = await api.get('/health')
  return response.data
}

export default api
