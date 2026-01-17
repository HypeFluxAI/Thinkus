'use client'

import * as React from 'react'
import { useState, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  visualConfigEditor,
  ConfigCategory,
  ConfigField,
  ConfigValues,
  ConfigType,
  ValidationResult
} from '@/lib/services/visual-config-editor'

export interface VisualConfigEditorProps {
  /** 初始配置值 */
  initialValues?: ConfigValues
  /** 保存回调 */
  onSave?: (values: ConfigValues) => void
  /** 预览回调 */
  onPreview?: (html: string) => void
  /** 自定义样式 */
  className?: string
}

/**
 * 可视化配置编辑器组件
 */
export function VisualConfigEditor({
  initialValues,
  onSave,
  onPreview,
  className
}: VisualConfigEditorProps) {
  const categories = useMemo(() => visualConfigEditor.getConfigCategories(), [])
  const defaultValues = useMemo(() => visualConfigEditor.getDefaultValues(), [])

  const [activeCategory, setActiveCategory] = useState<ConfigType>('site_info')
  const [values, setValues] = useState<ConfigValues>({ ...defaultValues, ...initialValues })
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  const currentCategory = categories.find(c => c.type === activeCategory)

  // 更新字段值
  const handleFieldChange = useCallback((key: string, value: unknown) => {
    setValues(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
    setValidation(null)
  }, [])

  // 验证并保存
  const handleSave = useCallback(() => {
    const result = visualConfigEditor.validateConfig(values)
    setValidation(result)

    if (result.valid) {
      onSave?.(values)
      setHasChanges(false)
    }
  }, [values, onSave])

  // 预览
  const handlePreview = useCallback(() => {
    const html = visualConfigEditor.generatePreviewHtml(values)
    onPreview?.(html)
  }, [values, onPreview])

  // 重置为默认值
  const handleReset = useCallback(() => {
    setValues({ ...defaultValues, ...initialValues })
    setHasChanges(false)
    setValidation(null)
  }, [defaultValues, initialValues])

  return (
    <div className={cn('flex gap-6', className)}>
      {/* 左侧分类导航 */}
      <div className="w-64 flex-shrink-0">
        <Card>
          <CardContent className="p-3">
            <nav className="space-y-1">
              {categories.map(category => (
                <button
                  key={category.type}
                  onClick={() => setActiveCategory(category.type)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                    activeCategory === category.type
                      ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  <span className="text-xl">{category.icon}</span>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{category.label}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {category.description}
                    </div>
                  </div>
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <div className="mt-4 space-y-2">
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={!hasChanges}
          >
            💾 保存配置
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={handlePreview}
          >
            👁️ 预览效果
          </Button>
          {hasChanges && (
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={handleReset}
            >
              ↩️ 重置更改
            </Button>
          )}
        </div>
      </div>

      {/* 右侧配置表单 */}
      <div className="flex-1 min-w-0">
        {/* 验证错误/警告 */}
        {validation && (
          <div className="mb-4 space-y-2">
            {validation.errors.map((error, index) => (
              <div
                key={`error-${index}`}
                className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300"
              >
                <span>❌</span>
                <span>{error.message}</span>
              </div>
            ))}
            {validation.warnings.map((warning, index) => (
              <div
                key={`warning-${index}`}
                className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-300"
              >
                <span>⚠️</span>
                <span>{warning.message}</span>
              </div>
            ))}
            {validation.valid && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300">
                <span>✅</span>
                <span>配置验证通过，已保存！</span>
              </div>
            )}
          </div>
        )}

        {/* 配置分组 */}
        {currentCategory?.groups.map(group => (
          <Card key={group.id} className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span>{group.icon}</span>
                {group.label}
              </CardTitle>
              <CardDescription>{group.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {group.fields.map(field => (
                <ConfigFieldInput
                  key={field.key}
                  field={field}
                  value={values[field.key]}
                  values={values}
                  onChange={(value) => handleFieldChange(field.key, value)}
                  error={validation?.errors.find(e => e.field === field.key)?.message}
                />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

/**
 * 配置字段输入组件
 */
function ConfigFieldInput({
  field,
  value,
  values,
  onChange,
  error
}: {
  field: ConfigField
  value: unknown
  values: ConfigValues
  onChange: (value: unknown) => void
  error?: string
}) {
  // 检查依赖条件
  if (field.dependsOn) {
    const dependValue = values[field.dependsOn.field]
    if (dependValue === field.dependsOn.value) {
      return null
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={field.key} className="flex items-center gap-2">
          {field.icon && <span>{field.icon}</span>}
          {field.label}
          {field.required && <span className="text-red-500">*</span>}
        </Label>
      </div>

      <p className="text-sm text-muted-foreground">{field.description}</p>

      {/* 根据字段类型渲染不同输入 */}
      {field.type === 'text' && (
        <Input
          id={field.key}
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={cn(error && 'border-red-500')}
        />
      )}

      {field.type === 'textarea' && (
        <Textarea
          id={field.key}
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className={cn(error && 'border-red-500')}
        />
      )}

      {field.type === 'email' && (
        <Input
          id={field.key}
          type="email"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={cn(error && 'border-red-500')}
        />
      )}

      {field.type === 'url' && (
        <Input
          id={field.key}
          type="url"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={cn(error && 'border-red-500')}
        />
      )}

      {field.type === 'password' && (
        <Input
          id={field.key}
          type="password"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={cn(error && 'border-red-500')}
        />
      )}

      {field.type === 'number' && (
        <Input
          id={field.key}
          type="number"
          value={(value as number) || ''}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={field.placeholder}
          min={field.validation?.min}
          max={field.validation?.max}
          className={cn(error && 'border-red-500')}
        />
      )}

      {field.type === 'boolean' && (
        <div className="flex items-center gap-3">
          <Switch
            id={field.key}
            checked={Boolean(value)}
            onCheckedChange={onChange}
          />
          <Label htmlFor={field.key} className="text-sm text-muted-foreground">
            {value ? '已启用' : '已禁用'}
          </Label>
        </div>
      )}

      {field.type === 'select' && field.options && (
        <select
          id={field.key}
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-full px-3 py-2 border rounded-md bg-background',
            error && 'border-red-500'
          )}
        >
          {field.options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      {field.type === 'color' && (
        <div className="flex items-center gap-3">
          <input
            type="color"
            id={field.key}
            value={(value as string) || '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="w-12 h-10 rounded border cursor-pointer"
          />
          <Input
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
            className="flex-1"
          />
        </div>
      )}

      {field.type === 'image' && (
        <div className="space-y-2">
          {typeof value === 'string' && value && (
            <div className="relative w-32 h-32 rounded-lg overflow-hidden border bg-gray-50 dark:bg-gray-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt={field.label}
                className="w-full h-full object-contain"
              />
            </div>
          )}
          <Input
            id={field.key}
            type="url"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="输入图片URL或上传"
            className={cn(error && 'border-red-500')}
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}

/**
 * 配置预览弹窗
 */
export function ConfigPreviewModal({
  html,
  onClose
}: {
  html: string
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>配置预览</CardTitle>
            <CardDescription>这是您的配置效果预览</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <iframe
            srcDoc={html}
            className="w-full h-96 border-0"
            title="配置预览"
          />
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * 配置快速入口卡片
 */
export function ConfigQuickAccess({
  onOpenEditor,
  className
}: {
  onOpenEditor: () => void
  className?: string
}) {
  return (
    <Card className={cn('cursor-pointer hover:shadow-md transition-shadow', className)} onClick={onOpenEditor}>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl">
            🎨
          </div>
          <div>
            <h3 className="font-semibold">可视化配置</h3>
            <p className="text-sm text-muted-foreground">
              通过简单的表单修改网站设置
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
