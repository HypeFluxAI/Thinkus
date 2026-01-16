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
    description: '您的专属 AI 高管团队已就位，帮您更高效地管理项目。',
    icon: <Sparkles className="h-8 w-8 sm:h-12 sm:w-12 text-primary" />,
    features: [
      '18位 AI 高管各司其职',
      '24/7 全天候服务',
      '智能分析与建议',
    ],
  },
  {
    id: 'team',
    title: '认识您的 AI 团队',
    description: '每位高管都有独特专业领域，协同为您提供全方位支持。',
    icon: <Users className="h-8 w-8 sm:h-12 sm:w-12 text-blue-500" />,
    features: [
      'CEO - 战略规划',
      'CTO - 技术架构',
      'CPO - 产品设计',
    ],
  },
  {
    id: 'discussion',
    title: '团队讨论',
    description: '发起话题，让 AI 高管团队深入讨论，获取专业见解。',
    icon: <MessageSquare className="h-8 w-8 sm:h-12 sm:w-12 text-green-500" />,
    features: [
      '多轮对话深入',
      '自动生成行动项',
      '保存讨论记录',
    ],
  },
  {
    id: 'decision',
    title: '决策支持',
    description: 'AI 团队分析利弊，评估风险，帮您做出明智选择。',
    icon: <Target className="h-8 w-8 sm:h-12 sm:w-12 text-orange-500" />,
    features: [
      '风险等级评估',
      '多方案对比',
      '历史决策追溯',
    ],
  },
  {
    id: 'standup',
    title: '每日站会',
    description: '自动化每日站会，让您始终掌握项目进度。',
    icon: <Calendar className="h-8 w-8 sm:h-12 sm:w-12 text-purple-500" />,
    features: [
      '自动生成议程',
      '进度跟踪汇报',
      '问题识别解决',
    ],
  },
  {
    id: 'memory',
    title: '智能记忆',
    description: '记住您的偏好和项目背景，提供越来越精准的建议。',
    icon: <Brain className="h-8 w-8 sm:h-12 sm:w-12 text-pink-500" />,
    features: [
      '偏好学习',
      '知识积累',
      '经验沉淀',
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
      <DialogContent className="max-w-[92vw] sm:max-w-xl p-4 sm:p-6">
        <DialogHeader className="pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 sm:gap-2 text-sm text-muted-foreground">
              {ONBOARDING_STEPS.map((s, index) => (
                <div
                  key={s.id}
                  className={cn(
                    'w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-colors cursor-pointer',
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
            <span className="text-xs sm:text-sm text-muted-foreground">
              {currentStep + 1}/{ONBOARDING_STEPS.length}
            </span>
          </div>
        </DialogHeader>

        <div className="py-3 sm:py-6">
          <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
            <div className="p-2.5 sm:p-4 rounded-full bg-muted/50">
              {step.icon}
            </div>
            <DialogTitle className="text-lg sm:text-2xl">{step.title}</DialogTitle>
            <DialogDescription className="text-xs sm:text-base max-w-md">
              {step.description}
            </DialogDescription>
          </div>

          <div className="mt-3 sm:mt-6 space-y-1.5 sm:space-y-3">
            {step.features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-muted/30"
              >
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 shrink-0" />
                <span className="text-xs sm:text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <Progress value={progress} className="h-0.5 sm:h-1" />

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2 pt-2 sm:pt-4">
          <div className="flex gap-1 sm:gap-2">
            {currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={handlePrevious} className="h-8 sm:h-9 px-2 sm:px-3">
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
                <span className="hidden sm:inline">上一步</span>
                <span className="sm:hidden">上一</span>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleSkip} className="h-8 sm:h-9 px-2 sm:px-3 text-muted-foreground text-xs sm:text-sm">
              跳过
            </Button>
          </div>
          <Button size="sm" onClick={handleNext} className="h-8 sm:h-9 px-3 sm:px-4">
            {isLastStep ? (
              <>
                <Rocket className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
                <span className="hidden sm:inline">开始使用</span>
                <span className="sm:hidden">开始</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">下一步</span>
                <span className="sm:hidden">下一</span>
                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-0.5 sm:ml-1" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
