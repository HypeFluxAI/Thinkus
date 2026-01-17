/**
 * Librarian Agent Types
 * 研究员角色，专门负责技术调研、文档查找、开源实现研究
 */

export interface ResearchResult {
  topic: string
  findings: ResearchFinding[]
  codeExamples: CodeExample[]
  recommendations: string[]
  references: Reference[]
  confidence: number
  searchedSources: string[]
}

export interface ResearchFinding {
  title: string
  content: string
  source?: string
  relevance: 'high' | 'medium' | 'low'
}

export interface CodeExample {
  title: string
  code: string
  language: string
  source?: string
  description?: string
}

export interface Reference {
  title: string
  url: string
  type: 'documentation' | 'github' | 'article' | 'stackoverflow' | 'other'
  relevance: number
}

export interface ResearchQuery {
  topic: string
  context?: string
  depth: 'quick' | 'standard' | 'deep'
  preferredSources?: string[]
  excludeSources?: string[]
}

export interface LibrarianConfig {
  model: string
  maxTokens: number
  enableMCP: boolean
  mcpTools: string[]
  cacheEnabled: boolean
  cacheTTL: number
}
