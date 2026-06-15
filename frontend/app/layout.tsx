import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'
import ThemeProvider from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: 'DocIntel - Document Intelligence + Agentic RAG',
  description: 'AI-powered document parsing, classification, and RAG chatbot with citations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
        <ThemeProvider>
          <Navbar />
          <main className="pt-14">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}
