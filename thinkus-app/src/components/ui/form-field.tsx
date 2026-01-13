'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Label } from './label'
import { Input } from './input'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

export interface ValidationRule {
  validate: (value: string) => boolean
  message: string
}

interface FormFieldProps extends React.ComponentProps<'input'> {
  label?: string
  error?: string
  success?: string
  hint?: string
  rules?: ValidationRule[]
  validateOnBlur?: boolean
  validateOnChange?: boolean
  showSuccessIcon?: boolean
}

function FormField({
  label,
  error: externalError,
  success,
  hint,
  rules = [],
  validateOnBlur = true,
  validateOnChange = false,
  showSuccessIcon = true,
  className,
  id,
  onChange,
  onBlur,
  ...props
}: FormFieldProps) {
  const [internalError, setInternalError] = React.useState<string | null>(null)
  const [touched, setTouched] = React.useState(false)
  const [isValid, setIsValid] = React.useState(false)
  const inputId = id || React.useId()

  const error = externalError || internalError

  const validate = React.useCallback((value: string) => {
    for (const rule of rules) {
      if (!rule.validate(value)) {
        setInternalError(rule.message)
        setIsValid(false)
        return false
      }
    }
    setInternalError(null)
    setIsValid(value.length > 0)
    return true
  }, [rules])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e)
    if (validateOnChange && touched) {
      validate(e.target.value)
    }
    // Clear error when user starts typing
    if (internalError && e.target.value) {
      setInternalError(null)
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    onBlur?.(e)
    setTouched(true)
    if (validateOnBlur) {
      validate(e.target.value)
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={inputId} className={cn(error && 'text-destructive')}>
          {label}
          {props.required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <div className="relative">
        <Input
          id={inputId}
          className={cn(
            error && 'border-destructive focus-visible:ring-destructive/20',
            isValid && showSuccessIcon && !error && touched && 'border-green-500 focus-visible:ring-green-500/20 pr-10',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          onChange={handleChange}
          onBlur={handleBlur}
          {...props}
        />
        {/* Status icons */}
        {touched && !error && isValid && showSuccessIcon && (
          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
        )}
        {error && (
          <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
        )}
      </div>
      {/* Error message */}
      {error && (
        <p
          id={`${inputId}-error`}
          className="text-sm text-destructive flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200"
        >
          {error}
        </p>
      )}
      {/* Success message */}
      {!error && success && touched && isValid && (
        <p className="text-sm text-green-600 dark:text-green-500 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
          {success}
        </p>
      )}
      {/* Hint text */}
      {hint && !error && !success && (
        <p id={`${inputId}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  )
}

// Common validation rules
export const validationRules = {
  required: (message = '此字段为必填项'): ValidationRule => ({
    validate: (value) => value.trim().length > 0,
    message,
  }),
  email: (message = '请输入有效的邮箱地址'): ValidationRule => ({
    validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message,
  }),
  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (value) => value.length >= min,
    message: message || `至少需要 ${min} 个字符`,
  }),
  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (value) => value.length <= max,
    message: message || `最多 ${max} 个字符`,
  }),
  phone: (message = '请输入有效的手机号'): ValidationRule => ({
    validate: (value) => /^1[3-9]\d{9}$/.test(value),
    message,
  }),
  password: (message = '密码需包含字母和数字，至少6位'): ValidationRule => ({
    validate: (value) => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/.test(value),
    message,
  }),
  match: (matchValue: string, message = '两次输入不一致'): ValidationRule => ({
    validate: (value) => value === matchValue,
    message,
  }),
}

export { FormField }
