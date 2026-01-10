'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  BASIC_TYPES,
  PROFESSIONAL_TYPES,
  type ProductType,
} from '@/lib/config/product-types'
import { Check, ChevronRight, Info } from 'lucide-react'

interface ProductTypeSelectorProps {
  selectedType?: string
  onSelect: (type: ProductType) => void
  className?: string
}

export function ProductTypeSelector({
  selectedType,
  onSelect,
  className,
}: ProductTypeSelectorProps) {
  const [detailType, setDetailType] = useState<ProductType | null>(null)

  const renderTypeCard = (type: ProductType) => {
    const Icon = type.icon
    const isSelected = selectedType === type.id

    return (
      <Card
        key={type.id}
        className={cn(
          'cursor-pointer transition-all hover:border-primary/50',
          isSelected && 'border-primary bg-primary/5'
        )}
        onClick={() => onSelect(type)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{type.name}</span>
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="text-sm text-muted-foreground">{type.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {type.examples.slice(0, 3).map(example => (
                    <Badge key={example} variant="secondary" className="text-xs">
                      {example}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={e => {
                e.stopPropagation()
                setDetailType(type)
              }}
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
            <span className="text-muted-foreground">起步价</span>
            <span className="font-medium">${type.basePrice}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      <Tabs defaultValue="basic">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">基础类型</TabsTrigger>
          <TabsTrigger value="professional">专业类型</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-4">
          <div className="grid gap-4">
            {BASIC_TYPES.map(renderTypeCard)}
          </div>
        </TabsContent>

        <TabsContent value="professional" className="mt-4">
          <div className="grid gap-4">
            {PROFESSIONAL_TYPES.map(renderTypeCard)}
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!detailType} onOpenChange={() => setDetailType(null)}>
        <DialogContent className="max-w-lg">
          {detailType && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <detailType.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <DialogTitle>{detailType.name}</DialogTitle>
                    <DialogDescription>{detailType.description}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                {/* Examples */}
                <div>
                  <h4 className="text-sm font-medium mb-2">适用场景</h4>
                  <div className="flex flex-wrap gap-2">
                    {detailType.examples.map(example => (
                      <Badge key={example} variant="secondary">
                        {example}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Tech Stack */}
                <div>
                  <h4 className="text-sm font-medium mb-2">技术栈</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">前端</p>
                      {detailType.techStack.frontend.map(tech => (
                        <Badge key={tech} variant="outline" className="mr-1 mb-1">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">后端</p>
                      {detailType.techStack.backend.map(tech => (
                        <Badge key={tech} variant="outline" className="mr-1 mb-1">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">数据库</p>
                      {detailType.techStack.database.map(tech => (
                        <Badge key={tech} variant="outline" className="mr-1 mb-1">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {detailType.techStack.extras && (
                    <div className="mt-2">
                      <p className="text-muted-foreground mb-1">特色功能</p>
                      {detailType.techStack.extras.map(extra => (
                        <Badge key={extra} className="mr-1 mb-1">
                          {extra}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pricing */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <span className="text-sm text-muted-foreground">起步价格</span>
                    <div className="text-2xl font-bold">${detailType.basePrice}</div>
                  </div>
                  <Button onClick={() => {
                    onSelect(detailType)
                    setDetailType(null)
                  }}>
                    选择此类型
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
