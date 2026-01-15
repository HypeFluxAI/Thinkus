'use client'

import * as React from 'react'
import { useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  renewalReminder,
  ServiceRecord,
  RenewalSummary,
  ServiceType
} from '@/lib/services/renewal-reminder'

export interface RenewalReminderPanelProps {
  /** 项目ID */
  projectId: string
  /** 续费回调 */
  onRenew?: (serviceId: string) => void
  /** 自定义样式 */
  className?: string
}

// 服务类型图标和颜色
const SERVICE_STYLES: Record<ServiceType, { icon: string; color: string }> = {
  domain: { icon: '🌐', color: 'text-blue-600' },
  hosting: { icon: '☁️', color: 'text-purple-600' },
  ssl: { icon: '🔒', color: 'text-green-600' },
  database: { icon: '🗄️', color: 'text-orange-600' },
  storage: { icon: '💾', color: 'text-cyan-600' },
  email: { icon: '📧', color: 'text-pink-600' },
  cdn: { icon: '🚀', color: 'text-indigo-600' },
  monitoring: { icon: '📊', color: 'text-yellow-600' },
  support: { icon: '👨‍💻', color: 'text-teal-600' },
  subscription: { icon: '📋', color: 'text-red-600' }
}

/**
 * 续费提醒面板组件
 */
export function RenewalReminderPanel({
  projectId,
  onRenew,
  className
}: RenewalReminderPanelProps) {
  const [summary, setSummary] = useState<RenewalSummary | null>(null)
  const [loading, setLoading] = useState(true)

  // 加载续费摘要
  useEffect(() => {
    setLoading(true)
    // 模拟API调用
    setTimeout(() => {
      const data = renewalReminder.getRenewalSummary(projectId)
      setSummary(data)
      setLoading(false)
    }, 500)
  }, [projectId])

  // 处理续费
  const handleRenew = useCallback((serviceId: string) => {
    onRenew?.(serviceId)
  }, [onRenew])

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <div className="text-4xl animate-pulse mb-4">⏳</div>
          <p className="text-muted-foreground">加载续费信息...</p>
        </CardContent>
      </Card>
    )
  }

  if (!summary) {
    return null
  }

  const hasUrgent = summary.expiredServices.length > 0 || summary.expiringServices.length > 0

  return (
    <Card className={cn(
      hasUrgent && 'border-orange-200 dark:border-orange-800',
      className
    )}>
      <CardHeader className={cn(
        hasUrgent && 'bg-orange-50 dark:bg-orange-950/20'
      )}>
        <CardTitle className="flex items-center gap-2">
          {hasUrgent ? (
            <>
              <span className="text-2xl">⚠️</span>
              续费提醒
            </>
          ) : (
            <>
              <span className="text-2xl">✅</span>
              服务状态正常
            </>
          )}
        </CardTitle>
        <CardDescription>
          {hasUrgent
            ? `有 ${summary.expiredServices.length + summary.expiringServices.length} 项服务需要关注`
            : `共 ${summary.totalServices} 项服务运行正常`
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        {/* 已过期服务 */}
        {summary.expiredServices.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium text-red-600 dark:text-red-400 flex items-center gap-2 mb-3">
              <span>🚨</span>
              已过期 ({summary.expiredServices.length})
            </h4>
            <div className="space-y-2">
              {summary.expiredServices.map(service => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  urgent
                  onRenew={() => handleRenew(service.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* 即将到期服务 */}
        {summary.expiringServices.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium text-orange-600 dark:text-orange-400 flex items-center gap-2 mb-3">
              <span>⏰</span>
              即将到期 ({summary.expiringServices.length})
            </h4>
            <div className="space-y-2">
              {summary.expiringServices.map(service => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  warning
                  onRenew={() => handleRenew(service.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* 近期续费 */}
        {summary.upcomingRenewals.length > 0 && !hasUrgent && (
          <div className="mb-6">
            <h4 className="font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2 mb-3">
              <span>📅</span>
              近期续费
            </h4>
            <div className="space-y-2">
              {summary.upcomingRenewals.map(({ service, daysUntilExpiry }) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  daysLeft={daysUntilExpiry}
                  onRenew={() => handleRenew(service.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* 续费总计 */}
        {summary.totalRenewalCost > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">待续费总额</span>
              <span className="text-xl font-bold">
                {summary.currency === 'CNY' ? '¥' : '$'}{summary.totalRenewalCost}
              </span>
            </div>
            {hasUrgent && (
              <Button className="w-full mt-4" size="lg">
                一键续费全部
              </Button>
            )}
          </div>
        )}

        {/* 无需续费 */}
        {!hasUrgent && summary.totalServices > 0 && summary.upcomingRenewals.length === 0 && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-muted-foreground">所有服务运行正常，近期无需续费</p>
          </div>
        )}

        {/* 无服务 */}
        {summary.totalServices === 0 && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-muted-foreground">暂无需要管理的服务</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * 服务卡片组件
 */
function ServiceCard({
  service,
  urgent,
  warning,
  daysLeft,
  onRenew
}: {
  service: ServiceRecord
  urgent?: boolean
  warning?: boolean
  daysLeft?: number
  onRenew: () => void
}) {
  const style = SERVICE_STYLES[service.type]
  const days = daysLeft ?? renewalReminder.getDaysUntilExpiry(service.expiryDate)

  return (
    <div className={cn(
      'flex items-center justify-between p-4 rounded-lg border',
      urgent && 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800',
      warning && !urgent && 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800',
      !urgent && !warning && 'bg-gray-50 dark:bg-gray-800/50'
    )}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{style.icon}</span>
        <div>
          <div className="font-medium">{service.name}</div>
          <div className="text-sm text-muted-foreground">
            {renewalReminder.getServiceConfig(service.type).label}
            {' · '}
            {days < 0 ? (
              <span className="text-red-600 dark:text-red-400">
                已过期 {Math.abs(days)} 天
              </span>
            ) : days === 0 ? (
              <span className="text-red-600 dark:text-red-400">今日到期</span>
            ) : (
              <span className={cn(
                days <= 3 && 'text-red-600 dark:text-red-400',
                days > 3 && days <= 7 && 'text-orange-600 dark:text-orange-400',
                days > 7 && 'text-gray-600 dark:text-gray-400'
              )}>
                {days} 天后到期
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="font-medium">
            {service.currency === 'CNY' ? '¥' : '$'}{service.renewalPrice}
          </div>
          {service.autoRenew && (
            <div className="text-xs text-green-600 dark:text-green-400">
              自动续费
            </div>
          )}
        </div>
        <Button
          size="sm"
          variant={urgent ? 'default' : 'outline'}
          onClick={onRenew}
        >
          续费
        </Button>
      </div>
    </div>
  )
}

/**
 * 续费提醒徽章
 */
export function RenewalBadge({
  count,
  urgent,
  onClick,
  className
}: {
  count: number
  urgent?: boolean
  onClick?: () => void
  className?: string
}) {
  if (count === 0) return null

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
        urgent
          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200'
          : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 hover:bg-orange-200',
        className
      )}
    >
      <span>{urgent ? '🚨' : '⏰'}</span>
      <span>{count} 项{urgent ? '已过期' : '待续费'}</span>
    </button>
  )
}

/**
 * 自动续费开关组件
 */
export function AutoRenewalToggle({
  serviceId,
  initialEnabled,
  onToggle,
  className
}: {
  serviceId: string
  initialEnabled: boolean
  onToggle?: (enabled: boolean) => void
  className?: string
}) {
  const [enabled, setEnabled] = useState(initialEnabled)

  const handleToggle = useCallback((checked: boolean) => {
    setEnabled(checked)
    if (checked) {
      // 实际项目中这里会弹出支付方式选择
      renewalReminder.enableAutoRenewal(serviceId, 'pm_default')
    } else {
      renewalReminder.disableAutoRenewal(serviceId)
    }
    onToggle?.(checked)
  }, [serviceId, onToggle])

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Switch
        checked={enabled}
        onCheckedChange={handleToggle}
      />
      <span className="text-sm">
        {enabled ? (
          <span className="text-green-600 dark:text-green-400">
            ✅ 自动续费已开启
          </span>
        ) : (
          <span className="text-muted-foreground">
            自动续费已关闭
          </span>
        )}
      </span>
    </div>
  )
}

/**
 * 续费提醒悬浮按钮
 */
export function RenewalFloatingButton({
  count,
  urgent,
  onClick,
  className
}: {
  count: number
  urgent?: boolean
  onClick: () => void
  className?: string
}) {
  if (count === 0) return null

  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed bottom-6 right-24 z-50',
        'flex items-center gap-2 px-4 py-3 rounded-full',
        'shadow-lg hover:shadow-xl transition-all hover:scale-105',
        urgent
          ? 'bg-red-500 text-white animate-pulse'
          : 'bg-orange-500 text-white',
        className
      )}
    >
      <span className="text-xl">{urgent ? '🚨' : '⏰'}</span>
      <span className="font-medium">{count} 项{urgent ? '已过期' : '待续费'}</span>
    </button>
  )
}
