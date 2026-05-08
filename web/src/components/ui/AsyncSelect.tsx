import * as React from 'react'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export interface Option {
  value: string
  label: string
}

interface AsyncSelectProps {
  value?: string
  onValueChange: (value: string) => void
  fetcher: (query: string) => Promise<Option[]>
  placeholder?: string
  emptyMessage?: string
  delay?: number
  disabled?: boolean
  className?: string
}

export function AsyncSelect({
  value,
  onValueChange,
  fetcher,
  placeholder = 'Select item...',
  emptyMessage = 'No results found.',
  delay = 500,
  disabled = false,
  className,
}: AsyncSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [options, setOptions] = React.useState<Option[]>([])
  const [loading, setLoading] = React.useState(false)
  const [search, setSearch] = React.useState('')

  React.useEffect(() => {
    let active = true

    const loadOptions = async () => {
      setLoading(true)
      try {
        const results = await fetcher(search)
        if (active) {
          setOptions(results)
        }
      } catch (err) {
        console.error('AsyncSelect fetch error:', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    const timer = setTimeout(() => {
      if (open) loadOptions()
    }, delay)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [search, open, fetcher, delay])

  // Get selected label
  const selectedLabel = React.useMemo(() => {
    if (!value) return ''
    const found = options.find((o) => o.value === value)
    return found ? found.label : 'Selected Item' // Fallback if option is purged from list
  }, [value, options])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-slate-500',
            className
          )}
        >
          <span className="truncate">
            {value ? selectedLabel : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 flex flex-col" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                </div>
              ) : (
                 emptyMessage
              )}
            </CommandEmpty>
            <CommandGroup>
              {!loading && options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? '' : option.value)
                    setOpen(false)
                    setSearch('')
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
