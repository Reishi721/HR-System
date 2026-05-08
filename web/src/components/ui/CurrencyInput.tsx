import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface CurrencyInputProps extends Omit<React.ComponentProps<"input">, 'onChange'> {
  value?: number | string
  onValueChange?: (value: number | undefined) => void
  prefix?: string
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onValueChange, prefix = 'Rp ', ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState('')

    // Format initial value
    useEffect(() => {
      if (value !== undefined && value !== null && value !== '') {
        const formatted = formatToCurrencyString(String(value))
        setDisplayValue(formatted)
      } else {
        setDisplayValue('')
      }
    }, [value])

    const formatToCurrencyString = (val: string) => {
      // Remove all non-numeric chars
      const numericString = val.replace(/\D/g, '')
      if (!numericString) return ''
      
      // Format with dot separators
      const num = parseInt(numericString, 10)
      return new Intl.NumberFormat('id-ID').format(num)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputVal = e.target.value
      
      const formatted = formatToCurrencyString(inputVal)
      setDisplayValue(formatted)
      
      const rawNumeric = parseInt(inputVal.replace(/\D/g, ''), 10)
      if (onValueChange) {
        onValueChange(isNaN(rawNumeric) ? undefined : rawNumeric)
      }
    }

    return (
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-slate-500 font-medium text-sm">{prefix}</span>
        </div>
        <Input
          {...props}
          ref={ref}
          type="text"
          value={displayValue}
          onChange={handleChange}
          className={cn('pl-10 font-mono tracking-wider', className)}
        />
      </div>
    )
  }
)
CurrencyInput.displayName = 'CurrencyInput'
