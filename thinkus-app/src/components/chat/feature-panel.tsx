'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Circle, Loader2, Plus, Pencil, X } from 'lucide-react'

export interface Feature {
  id: string
  name: string
  description: string
  priority: 'P0' | 'P1' | 'P2' | 'high' | 'medium' | 'low'
  status: 'pending' | 'identified' | 'confirmed' | 'new' | 'modified' | 'removed'
  expertNotes?: string
}

interface FeaturePanelProps {
  features: Feature[]
  isAnalyzing?: boolean
}

export function FeaturePanel({ features, isAnalyzing = false }: FeaturePanelProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P0':
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'P1':
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'P2':
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'P0'
      case 'medium': return 'P1'
      case 'low': return 'P2'
      default: return priority
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'identified':
        return <Circle className="h-4 w-4 text-blue-500 fill-blue-500" />
      case 'new':
        return <Plus className="h-4 w-4 text-purple-500" />
      case 'modified':
        return <Pencil className="h-4 w-4 text-orange-500" />
      case 'removed':
        return <X className="h-4 w-4 text-red-500" />
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">已确认</Badge>
      case 'new':
        return <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">新增</Badge>
      case 'modified':
        return <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">已调整</Badge>
      case 'removed':
        return <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">建议移除</Badge>
      default:
        return null
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">识别的功能</CardTitle>
          {isAnalyzing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              分析中...
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {features.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">开始对话后，AI将自动识别功能需求</p>
          </div>
        ) : (
          features
            .filter(f => f.status !== 'removed')
            .map((feature) => (
            <div
              key={feature.id}
              className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                feature.status === 'confirmed'
                  ? 'bg-green-50/50 dark:bg-green-900/10 border border-green-200/50'
                  : feature.status === 'new'
                  ? 'bg-purple-50/50 dark:bg-purple-900/10 border border-purple-200/50'
                  : feature.status === 'modified'
                  ? 'bg-orange-50/50 dark:bg-orange-900/10 border border-orange-200/50'
                  : 'bg-muted/50 hover:bg-muted'
              }`}
            >
              <div className="mt-0.5">{getStatusIcon(feature.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium text-sm truncate">{feature.name}</span>
                  <Badge variant="secondary" className={getPriorityColor(feature.priority)}>
                    {getPriorityLabel(feature.priority)}
                  </Badge>
                  {getStatusBadge(feature.status)}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {feature.description}
                </p>
                {feature.expertNotes && (
                  <p className="text-xs text-primary/70 mt-1 italic">
                    {feature.expertNotes}
                  </p>
                )}
              </div>
            </div>
          ))}
        )}
      </CardContent>
    </Card>
  )
}
