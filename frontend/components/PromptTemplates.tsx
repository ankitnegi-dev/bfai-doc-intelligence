'use client'
import { useState, useRef, useEffect } from 'react'
import { Wand2, Plus, Trash2, ChevronDown, Check } from 'lucide-react'
import {
  DEFAULT_TEMPLATES,
  PromptTemplate,
  loadCustomTemplates,
  saveCustomTemplate,
  deleteCustomTemplate,
  applyTemplate,
} from '@/lib/storage'

interface Props {
  currentInput: string
  onApply: (text: string) => void
}

export default function PromptTemplates({ currentInput, onApply }: Props) {
  const [open, setOpen]               = useState(false)
  const [customTemplates, setCustom]  = useState<PromptTemplate[]>([])
  const [addingNew, setAddingNew]     = useState(false)
  const [newLabel, setNewLabel]       = useState('')
  const [newTemplate, setNewTemplate] = useState('')
  const [applied, setApplied]         = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Load custom templates from localStorage
  useEffect(() => {
    if (open) setCustom(loadCustomTemplates())
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleApply = (tpl: PromptTemplate) => {
    const result = applyTemplate(tpl, currentInput)
    onApply(result)
    setApplied(tpl.id)
    setTimeout(() => {
      setApplied(null)
      setOpen(false)
    }, 600)
  }

  const handleSaveCustom = () => {
    if (!newLabel.trim() || !newTemplate.trim()) return
    const tpl: PromptTemplate = {
      id: crypto.randomUUID(),
      label: newLabel.trim(),
      template: newTemplate.trim(),
      isCustom: true,
      createdAt: new Date().toISOString(),
    }
    saveCustomTemplate(tpl)
    setCustom(prev => [tpl, ...prev])
    setNewLabel('')
    setNewTemplate('')
    setAddingNew(false)
  }

  const handleDeleteCustom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteCustomTemplate(id)
    setCustom(prev => prev.filter(t => t.id !== id))
  }

  const allTemplates = [...customTemplates, ...DEFAULT_TEMPLATES]

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
          open
            ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
        title="Prompt templates"
      >
        <Wand2 className="w-3.5 h-3.5" />
        <span>Templates</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute bottom-full mb-2 left-0 z-50 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Prompt Templates</p>
            <button
              onClick={() => setAddingNew(o => !o)}
              className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-600 transition-colors"
            >
              <Plus className="w-3 h-3" /> New
            </button>
          </div>

          {/* Add new template form */}
          {addingNew && (
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 bg-blue-50 dark:bg-blue-900/20">
              <input
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="Template name"
                className="w-full text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md px-2 py-1.5 mb-1.5 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-400"
                autoFocus
              />
              <textarea
                value={newTemplate}
                onChange={e => setNewTemplate(e.target.value)}
                placeholder="Template text (use {query} as placeholder)"
                rows={2}
                className="w-full text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md px-2 py-1.5 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-400 resize-none"
              />
              <div className="flex gap-1.5 mt-1.5">
                <button
                  onClick={handleSaveCustom}
                  disabled={!newLabel.trim() || !newTemplate.trim()}
                  className="flex-1 text-xs bg-blue-600 text-white py-1 rounded-md hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                  Save template
                </button>
                <button
                  onClick={() => setAddingNew(false)}
                  className="px-3 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Template list */}
          <div className="max-h-56 overflow-y-auto py-1">
            {customTemplates.length > 0 && (
              <>
                <p className="px-3 pt-1 pb-0.5 text-[9px] font-bold text-slate-400 uppercase tracking-wide">Custom</p>
                {customTemplates.map(tpl => (
                  <TemplateRow
                    key={tpl.id}
                    tpl={tpl}
                    applied={applied === tpl.id}
                    onApply={handleApply}
                    onDelete={handleDeleteCustom}
                  />
                ))}
                <div className="mx-3 my-1 border-t border-slate-100 dark:border-slate-700" />
              </>
            )}
            <p className="px-3 pt-1 pb-0.5 text-[9px] font-bold text-slate-400 uppercase tracking-wide">Built-in</p>
            {DEFAULT_TEMPLATES.map(tpl => (
              <TemplateRow
                key={tpl.id}
                tpl={tpl}
                applied={applied === tpl.id}
                onApply={handleApply}
              />
            ))}
          </div>

          <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
            <p className="text-[9px] text-slate-400">
              {'{query}'} is replaced with your current input
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function TemplateRow({
  tpl,
  applied,
  onApply,
  onDelete,
}: {
  tpl: PromptTemplate
  applied: boolean
  onApply: (tpl: PromptTemplate) => void
  onDelete?: (id: string, e: React.MouseEvent) => void
}) {
  return (
    <button
      onClick={() => onApply(tpl)}
      className="w-full group flex items-center justify-between gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
    >
      <div className="flex items-center gap-2 min-w-0">
        {applied ? (
          <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
        ) : (
          <Wand2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{tpl.label}</p>
          <p className="text-[9px] text-slate-400 truncate">{tpl.template}</p>
        </div>
      </div>
      {tpl.isCustom && onDelete && (
        <button
          onClick={(e) => onDelete(tpl.id, e)}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-all flex-shrink-0"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </button>
  )
}
