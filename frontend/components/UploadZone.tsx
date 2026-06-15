'use client'
import { useCallback, useState } from 'react'
import { useDropzone, FileRejection } from 'react-dropzone'
import { Upload, FileText, AlertCircle } from 'lucide-react'
import clsx from 'clsx'

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
}

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
}

const MAX_SIZE = 20 * 1024 * 1024 // 20MB

export default function UploadZone({ onFilesSelected, disabled = false }: UploadZoneProps) {
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setError(null)

      if (rejectedFiles.length > 0) {
        const messages = rejectedFiles.map(({ file, errors }) => {
          const reason = errors[0]?.message || 'Invalid file'
          return `${file.name}: ${reason}`
        })
        setError(messages.join('\n'))
      }

      if (acceptedFiles.length > 0) {
        onFilesSelected(acceptedFiles)
      }
    },
    [onFilesSelected]
  )

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    disabled,
    multiple: true,
  })

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={clsx(
          'relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 cursor-pointer',
          {
            'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/30':
              !isDragActive && !isDragReject && !disabled,
            'border-blue-400 bg-blue-50 scale-[1.01]': isDragActive && !isDragReject,
            'border-red-300 bg-red-50': isDragReject,
            'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed': disabled,
          }
        )}
      >
        <input {...getInputProps()} />

        {/* Decorative background dots */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-blue-100 rounded-full opacity-20" />
          <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-purple-100 rounded-full opacity-20" />
        </div>

        <div className="relative">
          {/* Icon */}
          <div className={clsx(
            'mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors',
            isDragActive && !isDragReject ? 'bg-blue-100' : isDragReject ? 'bg-red-100' : 'bg-white border border-slate-200 shadow-sm'
          )}>
            {isDragReject ? (
              <AlertCircle className="w-7 h-7 text-red-500" />
            ) : isDragActive ? (
              <Upload className="w-7 h-7 text-blue-500 animate-bounce" />
            ) : (
              <Upload className="w-7 h-7 text-slate-400" />
            )}
          </div>

          {/* Text */}
          {isDragActive && !isDragReject ? (
            <p className="text-base font-semibold text-blue-600">Drop files here...</p>
          ) : isDragReject ? (
            <p className="text-base font-semibold text-red-600">Some files are not supported</p>
          ) : (
            <>
              <p className="text-base font-semibold text-slate-700">
                Drag & drop files here
              </p>
              <p className="text-sm text-slate-400 mt-1">
                or{' '}
                <span className="text-blue-600 font-medium underline underline-offset-2">
                  browse to select
                </span>
              </p>
            </>
          )}

          {/* Supported formats */}
          <div className="flex items-center justify-center gap-3 mt-5">
            {[
              { ext: 'PDF', color: 'bg-red-50 text-red-600 border-red-100' },
              { ext: 'TXT', color: 'bg-slate-50 text-slate-600 border-slate-200' },
            ].map(({ ext, color }) => (
              <div key={ext} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${color}`}>
                <FileText className="w-3.5 h-3.5" />
                {ext}
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-400 mt-3">Maximum file size: 20 MB</p>
        </div>
      </div>

      {/* Error messages */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              {error.split('\n').map((line, i) => (
                <p key={i} className="text-xs text-red-600">{line}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
