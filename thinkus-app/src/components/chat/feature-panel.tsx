'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Circle, Loader2 } from 'lucide-react'

export interface Feature {
  id: string
  name: string
  description: string
  priority: 'P0' | 'P1' | 'P2'
  status: 'pending' | 'identified' | 'confirmed'
}

interface FeaturePanelProps {
  features: Feature[]
  isAnalyzing?: boolean
}

export function FeaturePanel({ features, isAnalyzing = false }: FeaturePanelProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P0':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'P1':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'P2':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'identified':
        return <Circle className="h-4 w-4 text-blue-500 fill-blue-500" />
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />
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
          features.map((feature) => (
            <div
              key={feature.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="mt-0.5">{getStatusIcon(feature.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm truncate">{feature.name}</span>
                  <Badge variant="secondary" className={getPriorityColor(feature.priority)}>
                    {feature.priority}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {feature.description}
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
