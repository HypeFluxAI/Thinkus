'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Check, Copy } from 'lucide-react'

interface CodeBlockProps {
  code: string
  language?: string
  showLineNumbers?: boolean
  showCopyButton?: boolean
  className?: string
  maxHeight?: string
}

// Simple syntax highlighting patterns
const highlightPatterns: Record<string, { pattern: RegExp; className: string }[]> = {
  javascript: [
    { pattern: /(\/\/.*$)/gm, className: 'text-gray-500' }, // Comments
    { pattern: /(\/\*[\s\S]*?\*\/)/g, className: 'text-gray-500' }, // Multi-line comments
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, className: 'text-green-500 dark:text-green-400' }, // Strings
    { pattern: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|throw|new|this|typeof|instanceof)\b/g, className: 'text-purple-500 dark:text-purple-400' }, // Keywords
    { pattern: /\b(true|false|null|undefined|NaN|Infinity)\b/g, className: 'text-orange-500 dark:text-orange-400' }, // Literals
    { pattern: /\b(\d+\.?\d*)\b/g, className: 'text-blue-500 dark:text-blue-400' }, // Numbers
    { pattern: /(\{|\}|\[|\]|\(|\))/g, className: 'text-yellow-600 dark:text-yellow-500' }, // Brackets
  ],
  typescript: [
    { pattern: /(\/\/.*$)/gm, className: 'text-gray-500' },
    { pattern: /(\/\*[\s\S]*?\*\/)/g, className: 'text-gray-500' },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, className: 'text-green-500 dark:text-green-400' },
    { pattern: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|throw|new|this|typeof|instanceof|interface|type|enum|implements|extends|public|private|protected|readonly|as|is)\b/g, className: 'text-purple-500 dark:text-purple-400' },
    { pattern: /\b(true|false|null|undefined|NaN|Infinity|void|never|any|unknown|string|number|boolean|object)\b/g, className: 'text-orange-500 dark:text-orange-400' },
    { pattern: /\b(\d+\.?\d*)\b/g, className: 'text-blue-500 dark:text-blue-400' },
    { pattern: /(\{|\}|\[|\]|\(|\))/g, className: 'text-yellow-600 dark:text-yellow-500' },
  ],
  python: [
    { pattern: /(#.*$)/gm, className: 'text-gray-500' },
    { pattern: /("""[\s\S]*?"""|'''[\s\S]*?''')/g, className: 'text-gray-500' },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, className: 'text-green-500 dark:text-green-400' },
    { pattern: /\b(def|class|import|from|return|if|elif|else|for|while|try|except|finally|with|as|lambda|yield|raise|pass|break|continue|and|or|not|in|is|True|False|None)\b/g, className: 'text-purple-500 dark:text-purple-400' },
    { pattern: /\b(\d+\.?\d*)\b/g, className: 'text-blue-500 dark:text-blue-400' },
  ],
  json: [
    { pattern: /("(?:[^"\\]|\\.)*")\s*:/g, className: 'text-purple-500 dark:text-purple-400' }, // Keys
    { pattern: /:\s*("(?:[^"\\]|\\.)*")/g, className: 'text-green-500 dark:text-green-400' }, // String values
    { pattern: /\b(true|false|null)\b/g, className: 'text-orange-500 dark:text-orange-400' },
    { pattern: /\b(\d+\.?\d*)\b/g, className: 'text-blue-500 dark:text-blue-400' },
  ],
  bash: [
    { pattern: /(#.*$)/gm, className: 'text-gray-500' },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, className: 'text-green-500 dark:text-green-400' },
    { pattern: /\b(sudo|npm|yarn|pnpm|git|cd|ls|mkdir|rm|cp|mv|cat|echo|export|source|chmod|chown)\b/g, className: 'text-purple-500 dark:text-purple-400' },
    { pattern: /(\$\w+|\$\{\w+\})/g, className: 'text-blue-500 dark:text-blue-400' }, // Variables
  ],
  html: [
    { pattern: /(<!--[\s\S]*?-->)/g, className: 'text-gray-500' },
    { pattern: /(<\/?[\w-]+)/g, className: 'text-purple-500 dark:text-purple-400' }, // Tags
    { pattern: /\s([\w-]+)=/g, className: 'text-orange-500 dark:text-orange-400' }, // Attributes
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, className: 'text-green-500 dark:text-green-400' }, // Strings
  ],
  css: [
    { pattern: /(\/\*[\s\S]*?\*\/)/g, className: 'text-gray-500' },
    { pattern: /([\.\#][\w-]+)/g, className: 'text-purple-500 dark:text-purple-400' }, // Selectors
    { pattern: /([\w-]+)\s*:/g, className: 'text-blue-500 dark:text-blue-400' }, // Properties
    { pattern: /:\s*([^;{}]+)/g, className: 'text-green-500 dark:text-green-400' }, // Values
  ],
}

// Language aliases
const languageAliases: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  jsx: 'javascript',
  tsx: 'typescript',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
}

function highlightCode(code: string, language: string): string {
  const lang = languageAliases[language] || language
  const patterns = highlightPatterns[lang]

  if (!patterns) {
    return escapeHtml(code)
  }

  let result = escapeHtml(code)

  // Apply patterns in order
  patterns.forEach(({ pattern, className }) => {
    result = result.replace(pattern, (match) => {
      // Check if already wrapped
      if (match.includes('<span')) return match
      return `<span class="${className}">${match}</span>`
    })
  })

  return result
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function CodeBlock({
  code,
  language = 'text',
  showLineNumbers = true,
  showCopyButton = true,
  className,
  maxHeight = '400px',
}: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const lines = code.split('\n')
  const highlightedCode = highlightCode(code, language)

  return (
    <div className={cn('relative group rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/80 border-b">
        <span className="text-xs font-mono text-muted-foreground uppercase">
          {language}
        </span>
        {showCopyButton && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 mr-1 text-green-500" />
                <span className="text-xs">已复制</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" />
                <span className="text-xs">复制</span>
              </>
            )}
          </Button>
        )}
      </div>

      {/* Code content */}
      <div
        className="overflow-auto bg-muted/50"
        style={{ maxHeight }}
      >
        <pre className="p-4 text-sm font-mono leading-relaxed">
          {showLineNumbers ? (
            <table className="border-collapse w-full">
              <tbody>
                {lines.map((line, index) => (
                  <tr key={index} className="hover:bg-muted/50">
                    <td className="text-right pr-4 select-none text-muted-foreground/50 w-8 align-top">
                      {index + 1}
                    </td>
                    <td
                      className="whitespace-pre-wrap break-all"
                      dangerouslySetInnerHTML={{
                        __html: highlightCode(line, language) || '&nbsp;',
                      }}
                    />
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <code
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
            />
          )}
        </pre>
      </div>
    </div>
  )
}

// Inline code component
interface InlineCodeProps {
  children: React.ReactNode
  className?: string
}

export function InlineCode({ children, className }: InlineCodeProps) {
  return (
    <code
      className={cn(
        'px-1.5 py-0.5 rounded bg-muted font-mono text-sm',
        className
      )}
    >
      {children}
    </code>
  )
}
