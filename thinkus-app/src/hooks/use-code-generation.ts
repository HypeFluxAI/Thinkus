'use client'

import { useState, useCallback, useRef } from 'react'
import type { CodeFile } from '@/components/code-preview'

interface GenerationTask {
  path: string
  description: string
}

interface UseCodeGenerationOptions {
  onFileStart?: (path: string) => void
  onFileProgress?: (path: string, content: string) => void
  onFileComplete?: (path: string, content: string) => void
  onError?: (error: string) => void
  onComplete?: () => void
}

interface UseCodeGenerationReturn {
  files: CodeFile[]
  currentFile: string | null
  streamingContent: string
  isGenerating: boolean
  progress: number
  startGeneration: (projectId: string, tasks: GenerationTask[]) => Promise<void>
  stopGeneration: () => void
  reset: () => void
}

export function useCodeGeneration(options: UseCodeGenerationOptions = {}): UseCodeGenerationReturn {
  const [files, setFiles] = useState<CodeFile[]>([])
  const [currentFile, setCurrentFile] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)

  const abortControllerRef = useRef<AbortController | null>(null)

  const startGeneration = useCallback(async (projectId: string, tasks: GenerationTask[]) => {
    if (isGenerating) return

    // Initialize files
    const initialFiles: CodeFile[] = tasks.map(task => ({
      path: task.path,
      content: '',
      language: getLanguageFromPath(task.path),
      status: 'pending',
    }))
    setFiles(initialFiles)
    setIsGenerating(true)
    setProgress(0)

    abortControllerRef.current = new AbortController()

    try {
      for (let i = 0; i < tasks.length; i++) {
        if (abortControllerRef.current.signal.aborted) break

        const task = tasks[i]
        setCurrentFile(task.path)
        setStreamingContent('')
        options.onFileStart?.(task.path)

        // Update file status to generating
        setFiles(prev => prev.map(f =>
          f.path === task.path ? { ...f, status: 'generating' } : f
        ))

        try {
          // Stream code generation
          const response = await fetch('/api/code/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId,
              filePath: task.path,
              description: task.description,
            }),
            signal: abortControllerRef.current.signal,
          })

          if (!response.ok) {
            throw new Error('Generation failed')
          }

          const reader = response.body?.getReader()
          if (!reader) throw new Error('No response body')

          const decoder = new TextDecoder()
          let fullContent = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })

            // Parse SSE events
            const lines = chunk.split('\n')
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') continue

                try {
                  const parsed = JSON.parse(data)
                  if (parsed.content) {
                    fullContent += parsed.content
                    setStreamingContent(fullContent)
                    options.onFileProgress?.(task.path, fullContent)
                  }
                } catch {
                  // Not JSON, might be raw content
                  fullContent += data
                  setStreamingContent(fullContent)
                }
              }
            }
          }

          // File complete
          setFiles(prev => prev.map(f =>
            f.path === task.path ? { ...f, content: fullContent, status: 'complete' } : f
          ))
          options.onFileComplete?.(task.path, fullContent)

        } catch (error) {
          if ((error as Error).name === 'AbortError') {
            break
          }
          // Mark file as error
          setFiles(prev => prev.map(f =>
            f.path === task.path ? { ...f, status: 'error' } : f
          ))
          options.onError?.(`Failed to generate ${task.path}`)
        }

        setProgress(((i + 1) / tasks.length) * 100)
      }

      options.onComplete?.()
    } finally {
      setIsGenerating(false)
      setCurrentFile(null)
      abortControllerRef.current = null
    }
  }, [isGenerating, options])

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort()
    setIsGenerating(false)
  }, [])

  const reset = useCallback(() => {
    setFiles([])
    setCurrentFile(null)
    setStreamingContent('')
    setIsGenerating(false)
    setProgress(0)
  }, [])

  return {
    files,
    currentFile,
    streamingContent,
    isGenerating,
    progress,
    startGeneration,
    stopGeneration,
    reset,
  }
}

// Helper function to get language from file path
function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    css: 'css',
    scss: 'scss',
    html: 'html',
    md: 'markdown',
    py: 'python',
    go: 'go',
    rs: 'rust',
  }
  return langMap[ext || ''] || 'text'
}
