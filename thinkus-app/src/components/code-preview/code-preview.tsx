'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Copy,
  Check,
  File,
  Folder,
  ChevronRight,
  ChevronDown,
  Code,
  FileJson,
  FileType,
  FileCode,
  Loader2,
  Maximize2,
  Minimize2,
  Terminal,
  Play,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// File type icons
const FILE_ICONS: Record<string, React.ReactNode> = {
  ts: <FileCode className="h-4 w-4 text-blue-500" />,
  tsx: <FileCode className="h-4 w-4 text-blue-500" />,
  js: <FileCode className="h-4 w-4 text-yellow-500" />,
  jsx: <FileCode className="h-4 w-4 text-yellow-500" />,
  json: <FileJson className="h-4 w-4 text-orange-500" />,
  css: <FileType className="h-4 w-4 text-pink-500" />,
  scss: <FileType className="h-4 w-4 text-pink-500" />,
  md: <FileType className="h-4 w-4 text-gray-500" />,
  html: <FileCode className="h-4 w-4 text-orange-600" />,
}

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase()
  return FILE_ICONS[ext || ''] || <File className="h-4 w-4 text-gray-400" />
}

export interface CodeFile {
  path: string
  content: string
  language?: string
  status: 'pending' | 'generating' | 'complete' | 'error'
}

interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: FileTreeNode[]
  file?: CodeFile
}

interface CodePreviewProps {
  files: CodeFile[]
  currentFile?: string
  onFileSelect?: (path: string) => void
  streamingContent?: string
  isGenerating?: boolean
  className?: string
  enableSandbox?: boolean
}

// Build tree structure from file paths
function buildFileTree(files: CodeFile[]): FileTreeNode[] {
  const root: Record<string, FileTreeNode> = {}

  for (const file of files) {
    const parts = file.path.split('/')
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isFile = i === parts.length - 1
      const currentPath = parts.slice(0, i + 1).join('/')

      if (!current[part]) {
        current[part] = {
          name: part,
          path: currentPath,
          type: isFile ? 'file' : 'folder',
          children: isFile ? undefined : {} as unknown as FileTreeNode[],
          file: isFile ? file : undefined,
        }
      }

      if (!isFile) {
        current = current[part].children as unknown as Record<string, FileTreeNode>
      }
    }
  }

  function convertToArray(obj: Record<string, FileTreeNode>): FileTreeNode[] {
    return Object.values(obj)
      .map(node => ({
        ...node,
        children: node.children ? convertToArray(node.children as unknown as Record<string, FileTreeNode>) : undefined,
      }))
      .sort((a, b) => {
        // Folders first, then files
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  }

  return convertToArray(root)
}

// File tree component
function FileTreeItem({
  node,
  depth = 0,
  selectedPath,
  expandedPaths,
  onSelect,
  onToggle,
}: {
  node: FileTreeNode
  depth?: number
  selectedPath?: string
  expandedPaths: Set<string>
  onSelect: (path: string) => void
  onToggle: (path: string) => void
}) {
  const isExpanded = expandedPaths.has(node.path)
  const isSelected = selectedPath === node.path

  if (node.type === 'folder') {
    return (
      <div>
        <button
          className={cn(
            'w-full flex items-center gap-1 px-2 py-1 text-sm hover:bg-muted/50 rounded',
            isSelected && 'bg-muted'
          )}
          style={{ paddingLeft: depth * 12 + 8 }}
          onClick={() => onToggle(node.path)}
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <Folder className="h-4 w-4 text-yellow-500" />
          <span>{node.name}</span>
        </button>
        {isExpanded && node.children && (
          <div>
            {node.children.map(child => (
              <FileTreeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                expandedPaths={expandedPaths}
                onSelect={onSelect}
                onToggle={onToggle}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1 text-sm hover:bg-muted/50 rounded',
        isSelected && 'bg-primary/10 text-primary'
      )}
      style={{ paddingLeft: depth * 12 + 24 }}
      onClick={() => onSelect(node.path)}
    >
      {getFileIcon(node.name)}
      <span className="truncate">{node.name}</span>
      {node.file?.status === 'generating' && (
        <Loader2 className="h-3 w-3 animate-spin ml-auto" />
      )}
      {node.file?.status === 'complete' && (
        <Check className="h-3 w-3 text-green-500 ml-auto" />
      )}
    </button>
  )
}

// Syntax highlighting (simplified)
function highlightCode(code: string, language: string): string {
  // This is a simplified version - in production, use a library like Prism or Shiki
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/(\/\/.*$)/gm, '<span class="text-gray-500">$1</span>')
    .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-gray-500">$1</span>')
    .replace(/(['"`])((?:[^'"`\\]|\\.)*)(['"`])/g, '<span class="text-green-500">$1$2$3</span>')
    .replace(/\b(import|export|from|const|let|var|function|return|if|else|for|while|class|interface|type|extends|implements|async|await|try|catch|throw|new)\b/g, '<span class="text-purple-500">$1</span>')
    .replace(/\b(true|false|null|undefined|this)\b/g, '<span class="text-orange-500">$1</span>')
    .replace(/\b(\d+)\b/g, '<span class="text-blue-400">$1</span>')
}

// Generate sandbox HTML for preview
function generateSandboxHTML(files: CodeFile[]): string {
  // Find HTML file
  const htmlFile = files.find(f => f.path.endsWith('.html'))
  // Find CSS files
  const cssFiles = files.filter(f => f.path.endsWith('.css') || f.path.endsWith('.scss'))
  // Find JS/TS files
  const jsFiles = files.filter(f =>
    f.path.endsWith('.js') || f.path.endsWith('.jsx') ||
    f.path.endsWith('.ts') || f.path.endsWith('.tsx')
  )

  // If we have an HTML file, use it as base
  if (htmlFile?.content) {
    let html = htmlFile.content

    // Inject CSS
    const cssContent = cssFiles.map(f => f.content).filter(Boolean).join('\n')
    if (cssContent) {
      html = html.replace('</head>', `<style>${cssContent}</style></head>`)
    }

    // Inject JS (simplified - won't handle imports)
    const jsContent = jsFiles
      .map(f => f.content)
      .filter(Boolean)
      .join('\n')
    if (jsContent) {
      html = html.replace('</body>', `<script>${jsContent}</script></body>`)
    }

    return html
  }

  // Generate a simple HTML wrapper for React/JS code
  const cssContent = cssFiles.map(f => f.content).filter(Boolean).join('\n')
  const jsContent = jsFiles.map(f => f.content).filter(Boolean).join('\n')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>代码预览</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; padding: 16px; }
    ${cssContent}
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${jsContent}

    // Try to render if there's a default export or App component
    const root = ReactDOM.createRoot(document.getElementById('root'));
    if (typeof App !== 'undefined') {
      root.render(<App />);
    } else if (typeof Main !== 'undefined') {
      root.render(<Main />);
    } else {
      root.render(<div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>
        <p>代码已加载，但未找到可渲染的组件</p>
        <p style={{ fontSize: '12px', marginTop: '8px' }}>请确保导出 App 或 Main 组件</p>
      </div>);
    }
  </script>
</body>
</html>`
}

export function CodePreview({
  files,
  currentFile,
  onFileSelect,
  streamingContent,
  isGenerating,
  className,
  enableSandbox = true,
}: CodePreviewProps) {
  const [selectedFile, setSelectedFile] = useState(currentFile || files[0]?.path)
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeTab, setActiveTab] = useState<'preview' | 'sandbox' | 'terminal'>('preview')
  const [sandboxKey, setSandboxKey] = useState(0)
  const codeRef = useRef<HTMLPreElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const fileTree = buildFileTree(files)
  const selected = files.find(f => f.path === selectedFile)

  // Auto-expand folders containing the selected file
  useEffect(() => {
    if (selectedFile) {
      const parts = selectedFile.split('/')
      const paths = new Set<string>()
      for (let i = 1; i < parts.length; i++) {
        paths.add(parts.slice(0, i).join('/'))
      }
      setExpandedPaths(prev => new Set([...prev, ...paths]))
    }
  }, [selectedFile])

  // Auto-scroll when streaming
  useEffect(() => {
    if (streamingContent && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [streamingContent])

  const handleCopy = async () => {
    const content = streamingContent || selected?.content || ''
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFileSelect = (path: string) => {
    setSelectedFile(path)
    onFileSelect?.(path)
  }

  const toggleFolder = (path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const displayContent = selectedFile === currentFile && streamingContent
    ? streamingContent
    : selected?.content || ''

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden bg-background flex flex-col',
        isFullscreen && 'fixed inset-4 z-50',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">代码预览</span>
          {isGenerating && (
            <Badge variant="secondary" className="text-xs">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              生成中...
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* File Tree */}
        <div className="w-48 border-r bg-muted/10 flex-shrink-0">
          <ScrollArea className="h-full">
            <div className="p-2">
              {fileTree.map(node => (
                <FileTreeItem
                  key={node.path}
                  node={node}
                  selectedPath={selectedFile}
                  expandedPaths={expandedPaths}
                  onSelect={handleFileSelect}
                  onToggle={toggleFolder}
                />
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Code Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'preview' | 'sandbox' | 'terminal')} className="flex-1 flex flex-col">
            <div className="border-b px-2 flex items-center justify-between">
              <TabsList className="h-9 bg-transparent">
                <TabsTrigger value="preview" className="text-xs">
                  <Code className="h-3 w-3 mr-1" />
                  {selectedFile?.split('/').pop() || '代码'}
                </TabsTrigger>
                {enableSandbox && (
                  <TabsTrigger value="sandbox" className="text-xs">
                    <Play className="h-3 w-3 mr-1" />
                    预览
                  </TabsTrigger>
                )}
                <TabsTrigger value="terminal" className="text-xs">
                  <Terminal className="h-3 w-3 mr-1" />
                  终端
                </TabsTrigger>
              </TabsList>
              {activeTab === 'sandbox' && enableSandbox && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setSandboxKey(k => k + 1)}
                    title="刷新预览"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      const html = generateSandboxHTML(files)
                      const blob = new Blob([html], { type: 'text/html' })
                      const url = URL.createObjectURL(blob)
                      window.open(url, '_blank')
                    }}
                    title="在新窗口打开"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            <TabsContent value="preview" className="flex-1 m-0 overflow-hidden">
              <ScrollArea ref={scrollRef} className="h-full">
                <pre
                  ref={codeRef}
                  className="p-4 text-sm font-mono leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: highlightCode(displayContent, selected?.language || 'typescript')
                  }}
                />
                {isGenerating && selectedFile === currentFile && (
                  <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                )}
              </ScrollArea>
            </TabsContent>

            {enableSandbox && (
              <TabsContent value="sandbox" className="flex-1 m-0 overflow-hidden">
                {files.some(f => f.status === 'complete') ? (
                  <iframe
                    key={sandboxKey}
                    ref={iframeRef}
                    srcDoc={generateSandboxHTML(files)}
                    className="w-full h-full border-0 bg-white"
                    sandbox="allow-scripts allow-modals"
                    title="代码预览沙箱"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin mb-2" />
                        <p className="text-sm">正在生成代码...</p>
                        <p className="text-xs mt-1">代码生成完成后将自动预览</p>
                      </>
                    ) : (
                      <>
                        <Play className="h-8 w-8 mb-2" />
                        <p className="text-sm">暂无可预览的代码</p>
                        <p className="text-xs mt-1">生成代码后可在此查看实时效果</p>
                      </>
                    )}
                  </div>
                )}
              </TabsContent>
            )}

            <TabsContent value="terminal" className="flex-1 m-0 overflow-hidden bg-black">
              <ScrollArea className="h-full">
                <div className="p-4 font-mono text-sm text-green-400">
                  <p>$ npm run dev</p>
                  <p className="text-gray-500">Waiting for code generation...</p>
                  {isGenerating && (
                    <p className="mt-2 flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Generating code...</span>
                    </p>
                  )}
                  {!isGenerating && files.some(f => f.status === 'complete') && (
                    <>
                      <p className="text-green-400 mt-2">✓ Code generation complete</p>
                      <p className="text-blue-400">→ Switch to Preview tab to see the result</p>
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t bg-muted/30 text-xs text-muted-foreground">
        <span>
          {files.filter(f => f.status === 'complete').length}/{files.length} 文件已完成
        </span>
        <span>
          {displayContent.split('\n').length} 行
        </span>
      </div>
    </div>
  )
}
