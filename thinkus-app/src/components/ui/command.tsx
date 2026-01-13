'use client'

import * as React from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

// Dialog context
interface DialogContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

// Command Dialog
interface CommandDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

function CommandDialog({ open, onOpenChange, children }: CommandDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isOpen = open ?? internalOpen
  const handleOpenChange = onOpenChange ?? setInternalOpen

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleOpenChange(!isOpen)
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        handleOpenChange(false)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [isOpen, handleOpenChange])

  if (!isOpen) return null

  return (
    <DialogContext.Provider value={{ open: isOpen, setOpen: handleOpenChange }}>
      <div className="fixed inset-0 z-50 bg-black/80" onClick={() => handleOpenChange(false)} />
      <div className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-lg border bg-popover p-0 shadow-lg">
        {children}
      </div>
    </DialogContext.Provider>
  )
}

// Command
interface CommandProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const Command = React.forwardRef<HTMLDivElement, CommandProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Command.displayName = 'Command'

// Command Input
interface CommandInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string
  onValueChange?: (value: string) => void
}

const CommandInput = React.forwardRef<HTMLInputElement, CommandInputProps>(
  ({ className, value, onValueChange, ...props }, ref) => {
    return (
      <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <input
          ref={ref}
          value={value}
          onChange={(e) => onValueChange?.(e.target.value)}
          className={cn(
            'flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        />
      </div>
    )
  }
)
CommandInput.displayName = 'CommandInput'

// Command List
const CommandList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('max-h-[300px] overflow-y-auto overflow-x-hidden', className)}
    {...props}
  />
))
CommandList.displayName = 'CommandList'

// Command Empty
const CommandEmpty = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>((props, ref) => (
  <div
    ref={ref}
    className="py-6 text-center text-sm"
    {...props}
  />
))
CommandEmpty.displayName = 'CommandEmpty'

// Command Group
interface CommandGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  heading?: string
}

const CommandGroup = React.forwardRef<HTMLDivElement, CommandGroupProps>(
  ({ className, heading, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('overflow-hidden p-1 text-foreground', className)}
      {...props}
    >
      {heading && (
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {heading}
        </div>
      )}
      {children}
    </div>
  )
)
CommandGroup.displayName = 'CommandGroup'

// Command Separator
const CommandSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('-mx-1 h-px bg-border', className)}
    {...props}
  />
))
CommandSeparator.displayName = 'CommandSeparator'

// Command Item
interface CommandItemProps extends React.HTMLAttributes<HTMLDivElement> {
  onSelect?: () => void
  disabled?: boolean
  value?: string
}

const CommandItem = React.forwardRef<HTMLDivElement, CommandItemProps>(
  ({ className, onSelect, disabled, ...props }, ref) => {
    const dialogContext = React.useContext(DialogContext)

    const handleClick = () => {
      if (disabled) return
      onSelect?.()
      dialogContext?.setOpen(false)
    }

    return (
      <div
        ref={ref}
        onClick={handleClick}
        className={cn(
          'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground',
          disabled && 'pointer-events-none opacity-50',
          className
        )}
        {...props}
      />
    )
  }
)
CommandItem.displayName = 'CommandItem'

// Command Shortcut
const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        'ml-auto text-xs tracking-widest text-muted-foreground',
        className
      )}
      {...props}
    />
  )
}
CommandShortcut.displayName = 'CommandShortcut'

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
