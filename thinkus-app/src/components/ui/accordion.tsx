'use client'

import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AccordionContextValue {
  value: string[]
  onValueChange: (value: string[]) => void
  type: 'single' | 'multiple'
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null)

interface AccordionProps {
  type?: 'single' | 'multiple'
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  collapsible?: boolean
  className?: string
  children: React.ReactNode
}

const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
  ({ type = 'single', value, defaultValue = [], onValueChange, className, children }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue)
    const currentValue = value ?? internalValue

    const handleValueChange = React.useCallback(
      (newValue: string[]) => {
        if (onValueChange) {
          onValueChange(newValue)
        } else {
          setInternalValue(newValue)
        }
      },
      [onValueChange]
    )

    return (
      <AccordionContext.Provider value={{ value: currentValue, onValueChange: handleValueChange, type }}>
        <div ref={ref} className={className}>
          {children}
        </div>
      </AccordionContext.Provider>
    )
  }
)
Accordion.displayName = 'Accordion'

interface AccordionItemContextValue {
  value: string
  isOpen: boolean
}

const AccordionItemContext = React.createContext<AccordionItemContextValue | null>(null)

interface AccordionItemProps {
  value: string
  className?: string
  children: React.ReactNode
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ value, className, children }, ref) => {
    const context = React.useContext(AccordionContext)
    if (!context) throw new Error('AccordionItem must be used within an Accordion')

    const isOpen = context.value.includes(value)

    return (
      <AccordionItemContext.Provider value={{ value, isOpen }}>
        <div ref={ref} className={cn('border-b', className)}>
          {children}
        </div>
      </AccordionItemContext.Provider>
    )
  }
)
AccordionItem.displayName = 'AccordionItem'

interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

const AccordionTrigger = React.forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(AccordionContext)
    const itemContext = React.useContext(AccordionItemContext)
    if (!context || !itemContext) throw new Error('AccordionTrigger must be used within an AccordionItem')

    const handleClick = () => {
      if (context.type === 'single') {
        context.onValueChange(itemContext.isOpen ? [] : [itemContext.value])
      } else {
        context.onValueChange(
          itemContext.isOpen
            ? context.value.filter((v) => v !== itemContext.value)
            : [...context.value, itemContext.value]
        )
      }
    }

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180',
          className
        )}
        data-state={itemContext.isOpen ? 'open' : 'closed'}
        onClick={handleClick}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
      </button>
    )
  }
)
AccordionTrigger.displayName = 'AccordionTrigger'

interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const AccordionContent = React.forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ className, children, ...props }, ref) => {
    const itemContext = React.useContext(AccordionItemContext)
    if (!itemContext) throw new Error('AccordionContent must be used within an AccordionItem')

    if (!itemContext.isOpen) return null

    return (
      <div
        ref={ref}
        className={cn('overflow-hidden text-sm transition-all', className)}
        {...props}
      >
        <div className="pb-4 pt-0">{children}</div>
      </div>
    )
  }
)
AccordionContent.displayName = 'AccordionContent'

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
