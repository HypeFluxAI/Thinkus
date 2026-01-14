'use client'

import { Card } from '@/components/ui/card'
import { ExpertAvatar } from './expert-avatar'
import { Expert } from '@/lib/ai/experts/config'
import { cn } from '@/lib/utils'

interface ExpertMessageProps {
  expert: Expert
  content: string
  isStreaming?: boolean
  timestamp?: Date
}

// 简单的 Markdown 渲染函数
function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null

  // 分割成段落
  const paragraphs = text.split(/\n\n+/)

  return paragraphs.map((paragraph, pIndex) => {
    // 处理列表
    if (paragraph.match(/^[\s]*[-*]\s/m)) {
      const listItems = paragraph.split(/\n/).filter(line => line.trim())
      return (
        <ul key={pIndex} className="list-disc list-inside space-y-1 my-2">
          {listItems.map((item, iIndex) => {
            const content = item.replace(/^[\s]*[-*]\s+/, '')
            return <li key={iIndex}>{renderInlineMarkdown(content)}</li>
          })}
        </ul>
      )
    }

    // 处理数字列表
    if (paragraph.match(/^[\s]*\d+\.\s/m)) {
      const listItems = paragraph.split(/\n/).filter(line => line.trim())
      return (
        <ol key={pIndex} className="list-decimal list-inside space-y-1 my-2">
          {listItems.map((item, iIndex) => {
            const content = item.replace(/^[\s]*\d+\.\s+/, '')
            return <li key={iIndex}>{renderInlineMarkdown(content)}</li>
          })}
        </ol>
      )
    }

    // 普通段落
    return (
      <p key={pIndex} className="my-1">
        {renderInlineMarkdown(paragraph)}
      </p>
    )
  })
}

// 渲染行内 Markdown（bold、italic、code）
function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return null

  // 使用正则分割文本，保留分隔符
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let key = 0

  // 匹配 **bold**、*italic*、`code`
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g
  let match

  while ((match = regex.exec(text)) !== null) {
    // 添加匹配前的普通文本
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    const matchedText = match[0]

    if (matchedText.startsWith('**') && matchedText.endsWith('**')) {
      // Bold
      parts.push(
        <strong key={key++} className="font-semibold">
          {matchedText.slice(2, -2)}
        </strong>
      )
    } else if (matchedText.startsWith('*') && matchedText.endsWith('*')) {
      // Italic
      parts.push(
        <em key={key++} className="italic">
          {matchedText.slice(1, -1)}
        </em>
      )
    } else if (matchedText.startsWith('`') && matchedText.endsWith('`')) {
      // Code
      parts.push(
        <code key={key++} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
          {matchedText.slice(1, -1)}
        </code>
      )
    }

    lastIndex = regex.lastIndex
  }

  // 添加剩余的文本
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : text
}

export function ExpertMessage({
  expert,
  content,
  isStreaming = false,
  timestamp,
}: ExpertMessageProps) {
  return (
    <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <ExpertAvatar expert={expert} isSpeaking={isStreaming} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{expert.name}</span>
          <span className="text-xs text-muted-foreground">{expert.title}</span>
          {timestamp && (
            <span className="text-xs text-muted-foreground ml-auto">
              {timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <Card className={cn('p-3 overflow-hidden', expert.color.replace('bg-', 'border-l-4 border-l-'))}>
          <div className="text-sm prose prose-sm dark:prose-invert max-w-none break-words">
            {renderMarkdown(content)}
          </div>
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-foreground/50 animate-pulse ml-1" />
          )}
        </Card>
      </div>
    </div>
  )
}
