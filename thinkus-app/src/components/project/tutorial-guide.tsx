'use client'

import * as React from 'react'
import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Tutorial,
  TutorialStep,
  TutorialType
} from '@/lib/services/tutorial-generator'

export interface TutorialGuideProps {
  /** 教程数据 */
  tutorial: Tutorial
  /** 完成回调 */
  onComplete?: () => void
  /** 跳过回调 */
  onSkip?: () => void
  /** 自定义样式 */
  className?: string
}

/**
 * 交互式教程指南组件
 */
export function TutorialGuide({
  tutorial,
  onComplete,
  onSkip,
  className
}: TutorialGuideProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null)

  const totalSteps = tutorial.steps.length
  const progress = (completedSteps.size / totalSteps) * 100
  const step = tutorial.steps[currentStep]
  const isLastStep = currentStep === totalSteps - 1
  const allCompleted = completedSteps.size === totalSteps

  // 标记当前步骤完成并进入下一步
  const handleNext = useCallback(() => {
    setCompletedSteps(prev => new Set([...prev, currentStep]))

    if (isLastStep) {
      onComplete?.()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }, [currentStep, isLastStep, onComplete])

  // 返回上一步
  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  // 跳转到指定步骤
  const handleGoToStep = useCallback((stepIndex: number) => {
    setCurrentStep(stepIndex)
  }, [])

  // 教程类型图标
  const typeIcon: Record<TutorialType, string> = {
    quick_start: '🚀',
    admin_guide: '⚙️',
    feature_tour: '🎯',
    troubleshoot: '🔧',
    customization: '🎨'
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* 头部 */}
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{typeIcon[tutorial.type]}</span>
            <div>
              <CardTitle className="text-lg">{tutorial.title}</CardTitle>
              <CardDescription>{tutorial.description}</CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">
              预计 {tutorial.estimatedMinutes} 分钟
            </div>
            <div className="text-sm font-medium">
              {completedSteps.size}/{totalSteps} 步完成
            </div>
          </div>
        </div>

        {/* 进度条 */}
        <div className="mt-4">
          <Progress value={progress} className="h-2" />
        </div>

        {/* 步骤指示器 */}
        <div className="flex gap-1 mt-3 overflow-x-auto pb-2">
          {tutorial.steps.map((s, index) => (
            <button
              key={s.id}
              onClick={() => handleGoToStep(index)}
              className={cn(
                'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all',
                index === currentStep
                  ? 'bg-blue-500 text-white scale-110'
                  : completedSteps.has(index)
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300'
              )}
            >
              {completedSteps.has(index) ? '✓' : index + 1}
            </button>
          ))}
        </div>
      </CardHeader>

      {/* 当前步骤内容 */}
      <CardContent className="p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
              {step.order}
            </span>
            <h3 className="text-xl font-semibold">{step.title}</h3>
          </div>
          <p className="text-muted-foreground">{step.description}</p>
        </div>

        {/* 操作说明 */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">👆</span>
            <div>
              <div className="font-medium text-blue-700 dark:text-blue-300 mb-1">操作步骤</div>
              <div className="text-blue-600 dark:text-blue-400">{step.action}</div>
            </div>
          </div>
        </div>

        {/* 预期结果 */}
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <div className="font-medium text-green-700 dark:text-green-300 mb-1">预期结果</div>
              <div className="text-green-600 dark:text-green-400">{step.expectedResult}</div>
            </div>
          </div>
        </div>

        {/* 小贴士 */}
        {step.tips && step.tips.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <div className="font-medium text-yellow-700 dark:text-yellow-300 mb-1">小贴士</div>
                <ul className="text-yellow-600 dark:text-yellow-400 space-y-1">
                  {step.tips.map((tip, index) => (
                    <li key={index}>• {tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 常见问题 */}
        {step.faq && step.faq.length > 0 && (
          <div className="border rounded-lg overflow-hidden mb-4">
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 font-medium flex items-center gap-2">
              <span>❓</span>
              <span>常见问题</span>
            </div>
            <div className="divide-y">
              {step.faq.map((faq, index) => (
                <div key={index} className="p-4">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === `${step.id}-${index}` ? null : `${step.id}-${index}`)}
                    className="w-full text-left flex items-center justify-between gap-2"
                  >
                    <span className="font-medium">{faq.question}</span>
                    <span className="text-muted-foreground">
                      {expandedFaq === `${step.id}-${index}` ? '▲' : '▼'}
                    </span>
                  </button>
                  {expandedFaq === `${step.id}-${index}` && (
                    <p className="mt-2 text-muted-foreground pl-4 border-l-2 border-blue-500">
                      {faq.answer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 图片/GIF */}
        {step.imageUrl && (
          <div className="mb-4 rounded-lg overflow-hidden border">
            <img src={step.imageUrl} alt={step.title} className="w-full" />
          </div>
        )}
        {step.gifUrl && (
          <div className="mb-4 rounded-lg overflow-hidden border">
            <img src={step.gifUrl} alt={step.title} className="w-full" />
          </div>
        )}
      </CardContent>

      {/* 底部操作 */}
      <div className="border-t px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            ← 上一步
          </Button>
          {onSkip && (
            <Button variant="ghost" onClick={onSkip}>
              跳过教程
            </Button>
          )}
        </div>

        <Button onClick={handleNext}>
          {isLastStep ? (
            allCompleted ? '完成教程 🎉' : '完成此步骤'
          ) : (
            '下一步 →'
          )}
        </Button>
      </div>
    </Card>
  )
}

/**
 * 教程卡片列表组件
 */
export function TutorialCardList({
  tutorials,
  onSelect,
  className
}: {
  tutorials: Tutorial[]
  onSelect: (tutorial: Tutorial) => void
  className?: string
}) {
  const typeIcon: Record<TutorialType, string> = {
    quick_start: '🚀',
    admin_guide: '⚙️',
    feature_tour: '🎯',
    troubleshoot: '🔧',
    customization: '🎨'
  }

  const typeLabel: Record<TutorialType, string> = {
    quick_start: '快速入门',
    admin_guide: '管理指南',
    feature_tour: '功能导览',
    troubleshoot: '故障排查',
    customization: '自定义配置'
  }

  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-3', className)}>
      {tutorials.map(tutorial => (
        <Card
          key={tutorial.id}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onSelect(tutorial)}
        >
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <span className="text-4xl">{typeIcon[tutorial.type]}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground mb-1">
                  {typeLabel[tutorial.type]}
                </div>
                <h3 className="font-semibold truncate">{tutorial.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {tutorial.description}
                </p>
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  <span>⏱️ {tutorial.estimatedMinutes} 分钟</span>
                  <span>📝 {tutorial.steps.length} 步</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * 快速入门浮动按钮
 */
export function QuickStartButton({
  onClick,
  className
}: {
  onClick: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'w-14 h-14 rounded-full',
        'bg-gradient-to-r from-blue-500 to-indigo-500',
        'text-white text-2xl',
        'shadow-lg hover:shadow-xl',
        'transition-all hover:scale-110',
        'flex items-center justify-center',
        'animate-bounce-slow',
        className
      )}
      title="查看教程"
    >
      📖
    </button>
  )
}

/**
 * 教程完成庆祝组件
 */
export function TutorialComplete({
  tutorialTitle,
  onClose,
  onNextTutorial
}: {
  tutorialTitle: string
  onClose: () => void
  onNextTutorial?: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md mx-4 text-center">
        <CardContent className="pt-8 pb-6">
          <div className="text-6xl mb-4 animate-bounce">🎉</div>
          <h2 className="text-2xl font-bold mb-2">恭喜完成！</h2>
          <p className="text-muted-foreground mb-6">
            您已完成「{tutorialTitle}」教程
          </p>
          <div className="flex gap-3 justify-center">
            {onNextTutorial && (
              <Button onClick={onNextTutorial}>
                继续学习 →
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              关闭
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
