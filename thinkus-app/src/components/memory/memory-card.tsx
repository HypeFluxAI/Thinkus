'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Trash2,
  MoreVertical,
  Clock,
  Eye,
  Tag,
  Sparkles,
  Archive,
  Snowflake,
  Database,
  Heart,
  GitBranch,
  FileText,
  Lightbulb,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react'

export interface MemoryItemData {
  id: string
  ownerId: string
  employeeId: string
  projectId: string
  type: string
  tier: string
  content: string
  summary: string
  keywords: string[]
  confidence: number
  status: string
  accessCount: number
  createdAt: string
  lastSeen: string
}

interface MemoryCardProps {
  memory: MemoryItemData
  onDelete?: (id: string) => void
  onTierChange?: (id: string, tier: 'CORE' | 'RELEVANT' | 'COLD') => void
  onClick?: (memory: MemoryItemData) => void
}

const TIER_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  CORE: { label: '核心', icon: Sparkles, className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  RELEVANT: { label: '相关', icon: Archive, className: 'bg-blue-100 text-blue-700 border-blue-200' },
  COLD: { label: '冷存', icon: Snowflake, className: 'bg-slate-100 text-slate-600 border-slate-200' },
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  fact: { label: '事实', icon: Database, className: 'bg-green-100 text-green-700' },
  preference: { label: '偏好', icon: Heart, className: 'bg-pink-100 text-pink-700' },
  decision: { label: '决策', icon: GitBranch, className: 'bg-purple-100 text-purple-700' },
  context: { label: '上下文', icon: FileText, className: 'bg-cyan-100 text-cyan-700' },
  insight: { label: '洞察', icon: Lightbulb, className: 'bg-yellow-100 text-yellow-700' },
}

export function MemoryCard({ memory, onDelete, onTierChange, onClick }: MemoryCardProps) {
  const tierConfig = TIER_CONFIG[memory.tier] || TIER_CONFIG.RELEVANT
  const typeConfig = TYPE_CONFIG[memory.type] || TYPE_CONFIG.fact
  const TierIcon = tierConfig.icon
  const TypeIcon = typeConfig.icon

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return '-'
    }
  }

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick?.(memory)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {/* 标签行 */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge variant="outline" className={tierConfig.className}>
                <TierIcon className="h-3 w-3 mr-1" />
                {tierConfig.label}
              </Badge>
              <Badge variant="secondary" className={typeConfig.className}>
                <TypeIcon className="h-3 w-3 mr-1" />
                {typeConfig.label}
              </Badge>
              {memory.confidence < 0.5 && (
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  低置信度
                </Badge>
              )}
              {memory.status === 'OUTDATED' && (
                <Badge variant="outline" className="text-red-600 border-red-200">
                  已过时
                </Badge>
              )}
            </div>

            {/* 内容 */}
            <p className="text-sm line-clamp-2 mb-2">
              {memory.summary || memory.content}
            </p>

            {/* 关键词 */}
            {memory.keywords.length > 0 && (
              <div className="flex items-center gap-1 mb-2 flex-wrap">
                <Tag className="h-3 w-3 text-muted-foreground" />
                {memory.keywords.slice(0, 3).map((keyword, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                  >
                    {keyword}
                  </span>
                ))}
                {memory.keywords.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{memory.keywords.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* 元信息 */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1" title="置信度">
                <span className="font-medium">{Math.round(memory.confidence * 100)}%</span>
              </span>
              <span className="flex items-center gap-1" title="访问次数">
                <Eye className="h-3 w-3" />
                {memory.accessCount}
              </span>
              <span className="flex items-center gap-1" title="创建时间">
                <Clock className="h-3 w-3" />
                {formatDate(memory.createdAt)}
              </span>
            </div>
          </div>

          {/* 操作菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {memory.tier !== 'CORE' && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onTierChange?.(memory.id, 'CORE')
                  }}
                >
                  <ArrowUpCircle className="h-4 w-4 mr-2 text-yellow-500" />
                  提升为核心记忆
                </DropdownMenuItem>
              )}
              {memory.tier !== 'RELEVANT' && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onTierChange?.(memory.id, 'RELEVANT')
                  }}
                >
                  <Archive className="h-4 w-4 mr-2 text-blue-500" />
                  设为相关记忆
                </DropdownMenuItem>
              )}
              {memory.tier !== 'COLD' && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onTierChange?.(memory.id, 'COLD')
                  }}
                >
                  <ArrowDownCircle className="h-4 w-4 mr-2 text-slate-500" />
                  移至冷存储
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete?.(memory.id)
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                删除记忆
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}
