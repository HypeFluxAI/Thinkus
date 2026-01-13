'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  Users,
  MessageSquare,
  Target,
  Calendar,
  Brain,
  Sparkles,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Rocket,
} from 'lucide-react'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  features: string[]
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: '欢迎来到 Thinkus',
    description: '您的专属 AI 高管团队已就位。我们将帮助您更高效地管理项目和做出决策。',
    icon: <Sparkles className="h-12 w-12 text-primary" />,
    features: [
      '5 位 AI 高管各司其职',
      '24/7 全天候为您服务',
      '智能分析与建议',
    ],
  },
  {
    id: 'team',
    title: '认识您的 AI 团队',
    description: '每位高管都有独特的专业领域，协同工作为您提供全方位支持。',
    icon: <Users className="h-12 w-12 text-blue-500" />,
    features: [
      'CEO - 战略规划与整体协调',
      'CTO - 技术架构与研发',
      'CPO - 产品设计与用户体验',
      'CMO - 市场策略与推广',
      'CFO - 财务分析与预算',
    ],
  },
  {
    id: 'discussion',
    title: '团队讨论',
    description: '发起话题，让 AI 高管团队进行深入讨论，获取多维度的专业见解。',
    icon: <MessageSquare className="h-12 w-12 text-green-500" />,
    features: [
      '多轮对话，逐步深入',
      '自动生成行动项',
      '保存讨论记录和洞察',
    ],
  },
  {
    id: 'decision',
    title: '决策支持',
    description: '重要决策不再孤独。AI 团队会分析利弊，评估风险，帮您做出明智选择。',
    icon: <Target className="h-12 w-12 text-orange-500" />,
    features: [
      '风险等级自动评估',
      '多方案对比分析',
      '历史决策追溯',
    ],
  },
  {
    id: 'standup',
    title: '每日站会',
    description: '自动化的每日站会，让您始终掌握项目进度和团队动态。',
    icon: <Calendar className="h-12 w-12 text-purple-500" />,
    features: [
      '自动生成会议议程',
      '进度跟踪与汇报',
      '问题识别与解决',
    ],
  },
  {
    id: 'memory',
    title: '智能记忆',
    description: '系统会记住您的偏好、项目背景和过往决策，提供越来越精准的建议。',
    icon: <Brain className="h-12 w-12 text-pink-500" />,
    features: [
      '用户偏好学习',
      '项目知识积累',
      '决策经验沉淀',
    ],
  },
]

interface OnboardingGuideProps {
  onComplete?: () => void
  forceShow?: boolean
}

export function OnboardingGuide({ onComplete, forceShow = false }: OnboardingGuideProps) {
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [completed, setCompleted] = useState<string[]>([])

  // 检查是否需要显示引导
  useEffect(() => {
    if (forceShow) {
      setOpen(true)
      return
    }

    const hasCompletedOnboarding = localStorage.getItem('thinkus_onboarding_completed')
    if (!hasCompletedOnboarding) {
      setOpen(true)
    }
  }, [forceShow])

  const step = ONBOARDING_STEPS[currentStep]
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1

  const handleNext = () => {
    if (!completed.includes(step.id)) {
      setCompleted([...completed, step.id])
    }

    if (isLastStep) {
      handleComplete()
    } else {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    localStorage.setItem('thinkus_onboarding_completed', 'true')
    setOpen(false)
    onComplete?.()
  }

  const handleSkip = () => {
    localStorage.setItem('thinkus_onboarding_completed', 'true')
    setOpen(false)
    onComplete?.()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {ONBOARDING_STEPS.map((s, index) => (
                <div
                  key={s.id}
                  className={cn(
                    'w-2 h-2 rounded-full transition-colors cursor-pointer',
                    index === currentStep
                      ? 'bg-primary'
                      : completed.includes(s.id)
                      ? 'bg-primary/50'
                      : 'bg-muted'
                  )}
                  onClick={() => setCurrentStep(index)}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {currentStep + 1} / {ONBOARDING_STEPS.length}
            </span>
          </div>
        </DialogHeader>

        <div className="py-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-full bg-muted/50">
              {step.icon}
            </div>
            <DialogTitle className="text-2xl">{step.title}</DialogTitle>
            <DialogDescription className="text-base max-w-md">
              {step.description}
            </DialogDescription>
          </div>

          <div className="mt-6 space-y-3">
            {step.features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
              >
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <Progress value={progress} className="h-1" />

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handlePrevious}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                上一步
              </Button>
            )}
            <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
              跳过引导
            </Button>
          </div>
          <Button onClick={handleNext}>
            {isLastStep ? (
              <>
                <Rocket className="h-4 w-4 mr-1" />
                开始使用
              </>
            ) : (
              <>
                下一步
                <ArrowRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
