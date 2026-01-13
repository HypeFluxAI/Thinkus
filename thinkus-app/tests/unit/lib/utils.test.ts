import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('Utils', () => {
  describe('cn (className merge)', () => {
    it('should merge class names', () => {
      const result = cn('foo', 'bar')
      expect(result).toBe('foo bar')
    })

    it('should handle conditional classes', () => {
      const result = cn('base', true && 'active', false && 'disabled')
      expect(result).toBe('base active')
    })

    it('should handle arrays', () => {
      const result = cn(['foo', 'bar'])
      expect(result).toBe('foo bar')
    })

    it('should handle objects', () => {
      const result = cn({ foo: true, bar: false, baz: true })
      expect(result).toBe('foo baz')
    })

    it('should merge tailwind classes correctly', () => {
      const result = cn('px-2 py-1', 'px-4')
      expect(result).toBe('py-1 px-4')
    })

    it('should handle undefined and null', () => {
      const result = cn('foo', undefined, null, 'bar')
      expect(result).toBe('foo bar')
    })

    it('should handle empty inputs', () => {
      const result = cn()
      expect(result).toBe('')
    })

    it('should override conflicting tailwind classes', () => {
      const result = cn('text-red-500', 'text-blue-500')
      expect(result).toBe('text-blue-500')
    })

    it('should handle responsive classes', () => {
      const result = cn('md:flex', 'lg:flex')
      expect(result).toBe('md:flex lg:flex')
    })

    it('should handle complex combinations', () => {
      const result = cn(
        'base-class',
        { 'active': true, 'disabled': false },
        ['array-class'],
        undefined,
        'final-class'
      )
      expect(result).toBe('base-class active array-class final-class')
    })
  })
})
