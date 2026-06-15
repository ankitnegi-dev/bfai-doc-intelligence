'use client'
import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  disabled?: boolean
}

// Browser Speech Recognition API type definitions
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance
  }
}

export default function VoiceInput({ onTranscript, disabled = false }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [liveText, setLiveText] = useState('')
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      setIsSupported(true)
    }
  }, [])

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(
        Array.from({ length: event.results.length }, (_, i) => event.results[i])
      )
        .map(r => r[0].transcript)
        .join('')
      setLiveText(transcript)
      onTranscript(transcript)
    }

    recognition.onerror = () => {
      setIsListening(false)
      setLiveText('')
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
    setLiveText('')
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsListening(false)
  }

  const handleClick = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  if (!isSupported) {
    return (
      <button
        disabled
        title="Voice input not supported in this browser (use Chrome or Edge)"
        className="p-2 rounded-lg text-slate-300 cursor-not-allowed"
      >
        <MicOff className="w-5 h-5" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {isListening && liveText && (
        <span className="text-xs text-slate-400 max-w-32 truncate italic">
          {liveText}
        </span>
      )}
      {isListening && (
        <span className="text-xs text-red-500 font-medium animate-pulse">Listening...</span>
      )}
      <button
        onClick={handleClick}
        disabled={disabled}
        title={isListening ? 'Stop recording' : 'Start voice input'}
        className={`p-2 rounded-lg transition-all ${
          isListening
            ? 'bg-red-500 text-white mic-active'
            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isListening ? (
          <Mic className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>
    </div>
  )
}
