'use client'

import { toast as sonnerToast } from 'sonner'

// 兼容层 - 使用 sonner 作为底层实现
export function useToast() {
  return {
    toast: ({
      title,
      description,
      variant = 'default',
    }: {
      title?: string
      description?: string
      variant?: 'default' | 'destructive'
    }) => {
      if (variant === 'destructive') {
        sonnerToast.error(title, { description })
      } else {
        sonnerToast.success(title, { description })
      }
    },
    dismiss: sonnerToast.dismiss,
  }
}

// 直接导出 toast 函数
export const toast = ({
  title,
  description,
  variant = 'default',
}: {
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}) => {
  if (variant === 'destructive') {
    sonnerToast.error(title, { description })
  } else {
    sonnerToast.success(title, { description })
  }
}
