'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import {
  MessageSquare,
  Bug,
  Lightbulb,
  HelpCircle,
  Heart,
  MoreHorizontal,
  Loader2,
  Star,
  Send,
} from 'lucide-react'

type FeedbackType = 'bug' | 'feature' | 'improvement' | 'question' | 'praise' | 'other'

interface FeedbackTypeOption {
  value: FeedbackType
  label: string
  icon: React.ReactNode
  description: string
}

const FEEDBACK_TYPES: FeedbackTypeOption[] = [
  {
    value: 'bug',
    label: '问题反馈',
    icon: <Bug className="h-4 w-4" />,
    description: '报告系统问题或错误',
  },
  {
    value: 'feature',
    label: '功能建议',
    icon: <Lightbulb className="h-4 w-4" />,
    description: '建议新增功能',
  },
  {
    value: 'improvement',
    label: '改进建议',
    icon: <MessageSquare className="h-4 w-4" />,
    description: '现有功能改进',
  },
  {
    value: 'question',
    label: '使用问题',
    icon: <HelpCircle className="h-4 w-4" />,
    description: '使用中遇到的困惑',
  },
  {
    value: 'praise',
    label: '好评',
    icon: <Heart className="h-4 w-4" />,
    description: '分享您的好体验',
  },
  {
    value: 'other',
    label: '其他',
    icon: <MoreHorizontal className="h-4 w-4" />,
    description: '其他类型反馈',
  },
]

interface FeedbackDialogProps {
  trigger?: React.ReactNode
  page?: string
  projectId?: string
  onSuccess?: () => void
}

export function FeedbackDialog({ trigger, page, projectId, onSuccess }: FeedbackDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [type, setType] = useState<FeedbackType>('improvement')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [rating, setRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)

  const resetForm = () => {
    setType('improvement')
    setTitle('')
    setContent('')
    setRating(0)
    setHoverRating(0)
  }

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: '请填写完整',
        description: '标题和内容不能为空',
        variant: 'destructive',
      })
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title: title.trim(),
          content: content.trim(),
          page,
          projectId,
          rating: rating > 0 ? rating : undefined,
        }),
      })

      if (response.ok) {
        toast({
          title: '感谢您的反馈',
          description: '我们会认真处理您的意见',
        })
        resetForm()
        setOpen(false)
        onSuccess?.()
      } else {
        throw new Error('Failed to submit')
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      toast({
        title: '提交失败',
        description: '请稍后重试',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            反馈
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>提交反馈</DialogTitle>
          <DialogDescription>
            您的反馈对我们非常重要，帮助我们持续改进
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Feedback Type */}
          <div className="space-y-2">
            <Label>反馈类型</Label>
            <div className="grid grid-cols-3 gap-2">
              {FEEDBACK_TYPES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors',
                    type === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/30'
                  )}
                >
                  <div
                    className={cn(
                      type === option.value ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {option.icon}
                  </div>
                  <span className="text-xs font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="feedback-title">标题</Label>
            <Input
              id="feedback-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="简要描述您的反馈"
              maxLength={200}
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="feedback-content">详细描述</Label>
            <Textarea
              id="feedback-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="请详细描述您的反馈或建议..."
              rows={4}
              maxLength={5000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {content.length}/5000
            </p>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <Label>整体评分 (可选)</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value === rating ? 0 : value)}
                  onMouseEnter={() => setHoverRating(value)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-colors"
                >
                  <Star
                    className={cn(
                      'h-6 w-6 transition-colors',
                      (hoverRating || rating) >= value
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    )}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {rating === 1 && '非常不满意'}
                  {rating === 2 && '不满意'}
                  {rating === 3 && '一般'}
                  {rating === 4 && '满意'}
                  {rating === 5 && '非常满意'}
                </span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            提交反馈
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
