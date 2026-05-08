import * as React from "react"
import { format, parseISO } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { id } from 'date-fns/locale'

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  className?: string
  value?: string
  onChange?: (dateStr: string) => void
  placeholder?: string
  minDate?: Date
  maxDate?: Date
  disabled?: boolean
  /** Tahun paling awal di dropdown (default: 80 tahun lalu) */
  fromYear?: number
  /** Tahun paling akhir di dropdown (default: 10 tahun ke depan) */
  toYear?: number
}

export function DatePicker({
  className,
  value,
  onChange,
  placeholder = "Pilih tanggal",
  minDate,
  maxDate,
  disabled = false,
  fromYear,
  toYear,
}: DatePickerProps) {
  const now = new Date()
  const startMonth = minDate ?? new Date((fromYear ?? now.getFullYear() - 80), 0, 1)
  const endMonth   = maxDate ?? new Date((toYear   ?? now.getFullYear() + 10), 11, 31)
  const safeParse = (v?: string): Date | undefined => {
    if (!v) return undefined
    const d = parseISO(v)
    return isNaN(d.getTime()) ? undefined : d
  }

  const [internalDate, setInternalDate] = React.useState<Date | undefined>(
    safeParse(value)
  )
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    setInternalDate(safeParse(value))
  }, [value])

  const handleSelect = (newDate: Date | undefined) => {
    setInternalDate(newDate)
    if (onChange) {
      onChange(newDate ? format(newDate, "yyyy-MM-dd") : "")
    }
    setIsOpen(false)
  }

  return (
    <div className={cn("relative z-50", className)}>
      <Popover open={isOpen} onOpenChange={disabled ? undefined : setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal bg-white h-10 border-slate-200",
              !internalDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-indigo-500" />
            {internalDate ? format(internalDate, "d MMMM yyyy", { locale: id }) : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-white" align="start">
          <Calendar
            mode="single"
            selected={internalDate}
            onSelect={handleSelect}
            initialFocus
            locale={id}
            startMonth={startMonth}
            endMonth={endMonth}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
