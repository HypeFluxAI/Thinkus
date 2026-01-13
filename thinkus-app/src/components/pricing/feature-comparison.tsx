'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Check, X, Minus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from '@/lib/config/subscription-plans'

interface FeatureItem {
  name: string
  description?: string
  values: Record<SubscriptionPlan, boolean | string | number>
}

const featureCategories: { category: string; features: FeatureItem[] }[] = [
  {
    category: 'AI 对话能力',
    features: [
      {
        name: '每日消息数',
        description: '每天可发送的消息数量',
        values: { free: 30, starter: 100, professional: 500, enterprise: '无限' },
      },
      {
        name: '每月讨论数',
        description: '每月可发起的讨论数量',
        values: { free: 5, starter: 20, professional: 100, enterprise: '无限' },
      },
      {
        name: '消息历史保留',
        description: '消息历史记录保留时长',
        values: { free: '7天', starter: '30天', professional: '90天', enterprise: '永久' },
      },
      {
        name: '上下文记忆',
        description: 'AI 是否记住历史对话',
        values: { free: false, starter: true, professional: true, enterprise: true },
      },
    ],
  },
  {
    category: 'AI 高管团队',
    features: [
      {
        name: '可用高管数量',
        description: '可以咨询的AI高管数量',
        values: { free: 3, starter: 6, professional: 12, enterprise: '全部' },
      },
      {
        name: '高管专业领域',
        description: '高管覆盖的专业领域',
        values: { free: '基础', starter: '扩展', professional: '高级', enterprise: '全部' },
      },
      {
        name: '自定义高管',
        description: '创建自定义AI高管',
        values: { free: false, starter: false, professional: true, enterprise: true },
      },
      {
        name: '高管团队讨论',
        description: '多位高管协同讨论',
        values: { free: false, starter: true, professional: true, enterprise: true },
      },
    ],
  },
  {
    category: '项目管理',
    features: [
      {
        name: '项目数量',
        description: '可创建的项目数量',
        values: { free: 1, starter: 5, professional: 20, enterprise: '无限' },
      },
      {
        name: '团队成员',
        description: '项目团队成员数量',
        values: { free: 1, starter: 3, professional: 10, enterprise: '无限' },
      },
      {
        name: '文件存储',
        description: '项目文件存储空间',
        values: { free: '100MB', starter: '1GB', professional: '10GB', enterprise: '100GB' },
      },
      {
        name: '项目模板',
        description: '访问项目模板库',
        values: { free: false, starter: true, professional: true, enterprise: true },
      },
    ],
  },
  {
    category: '高级功能',
    features: [
      {
        name: '代码生成',
        description: 'AI 自动生成代码',
        values: { free: false, starter: false, professional: true, enterprise: true },
      },
      {
        name: '部署服务',
        description: '一键部署到云端',
        values: { free: false, starter: false, professional: true, enterprise: true },
      },
      {
        name: 'API 访问',
        description: '通过 API 集成',
        values: { free: false, starter: false, professional: true, enterprise: true },
      },
      {
        name: '数据分析',
        description: '项目数据分析报告',
        values: { free: false, starter: true, professional: true, enterprise: true },
      },
    ],
  },
  {
    category: '支持服务',
    features: [
      {
        name: '社区支持',
        description: '社区论坛支持',
        values: { free: true, starter: true, professional: true, enterprise: true },
      },
      {
        name: '邮件支持',
        description: '邮件技术支持',
        values: { free: false, starter: true, professional: true, enterprise: true },
      },
      {
        name: '优先支持',
        description: '优先响应支持',
        values: { free: false, starter: false, professional: true, enterprise: true },
      },
      {
        name: '专属客服',
        description: '1对1专属客服',
        values: { free: false, starter: false, professional: false, enterprise: true },
      },
    ],
  },
]

const plans: SubscriptionPlan[] = ['free', 'starter', 'professional', 'enterprise']

function FeatureValue({ value }: { value: boolean | string | number }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className="h-5 w-5 text-green-500 mx-auto" />
    ) : (
      <X className="h-5 w-5 text-muted-foreground/40 mx-auto" />
    )
  }
  return <span className="text-sm font-medium">{value}</span>
}

interface FeatureComparisonProps {
  className?: string
  highlightPlan?: SubscriptionPlan
}

export function FeatureComparison({ className, highlightPlan = 'professional' }: FeatureComparisonProps) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse">
        {/* Header */}
        <thead>
          <tr className="border-b">
            <th className="text-left py-4 px-4 font-medium text-muted-foreground w-64">
              功能对比
            </th>
            {plans.map((plan) => (
              <th
                key={plan}
                className={cn(
                  'text-center py-4 px-4 min-w-[140px]',
                  highlightPlan === plan && 'bg-primary/5 rounded-t-lg'
                )}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="font-semibold">{SUBSCRIPTION_PLANS[plan].nameCn}</span>
                  {highlightPlan === plan && (
                    <Badge variant="default" className="text-xs">推荐</Badge>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {featureCategories.map((category, categoryIndex) => (
            <React.Fragment key={category.category}>
              {/* Category header */}
              <tr className="bg-muted/50">
                <td
                  colSpan={plans.length + 1}
                  className="py-3 px-4 font-semibold text-sm"
                >
                  {category.category}
                </td>
              </tr>

              {/* Features in category */}
              {category.features.map((feature, featureIndex) => (
                <tr
                  key={feature.name}
                  className={cn(
                    'border-b hover:bg-muted/30 transition-colors',
                    featureIndex === category.features.length - 1 && 'border-b-2'
                  )}
                >
                  <td className="py-3 px-4">
                    <div>
                      <span className="font-medium text-sm">{feature.name}</span>
                      {feature.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {feature.description}
                        </p>
                      )}
                    </div>
                  </td>
                  {plans.map((plan) => (
                    <td
                      key={plan}
                      className={cn(
                        'text-center py-3 px-4',
                        highlightPlan === plan && 'bg-primary/5'
                      )}
                    >
                      <FeatureValue value={feature.values[plan]} />
                    </td>
                  ))}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
