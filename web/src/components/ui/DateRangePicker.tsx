import * as React from "react"
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { id } from 'date-fns/locale'

export type DateRange = {
  from: Date | undefined;
  to?: Date | undefined;
};

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
  className?: string
  date?: DateRange
  onDateChange?: (date: DateRange | undefined) => void
  placeholder?: string
  /** Tahun paling awal di dropdown (default: 5 tahun lalu) */
  fromYear?: number
  /** Tahun paling akhir di dropdown (default: 5 tahun ke depan) */
  toYear?: number
}

export function DateRangePicker({
  className,
  date,
  onDateChange,
  placeholder = "Pilih tanggal mulai & selesai",
  fromYear,
  toYear,
}: DateRangePickerProps) {
  const now = new Date()
  const startMonth = new Date((fromYear ?? now.getFullYear() - 5), 0, 1)
  const endMonth   = new Date((toYear   ?? now.getFullYear() + 5), 11, 31)
  const [internalDate, setInternalDate] = React.useState<DateRange | undefined>(date)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    setInternalDate(date)
  }, [date])

  const handleSelect = (newDate: DateRange | undefined) => {
    setInternalDate(newDate)
    if (onDateChange) onDateChange(newDate)
  }

  const handlePreset = (range: DateRange) => {
    setInternalDate(range)
    if (onDateChange) onDateChange(range)
    setOpen(false)
  }

  // Quick Selectors
  const presets = [
    { label: "Hari Ini", getRange: () => ({ from: new Date(), to: new Date() }) },
    { label: "7 Hari Terakhir", getRange: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
    { label: "Bulan Ini", getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
    { label: "Tahun Ini", getRange: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
  ]

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal bg-white h-10",
              !internalDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-indigo-500" />
            {internalDate?.from ? (
              internalDate.to ? (
                <>
                  {format(internalDate.from, "d MMM yyyy", { locale: id })} -{" "}
                  {format(internalDate.to, "d MMM yyyy", { locale: id })}
                </>
              ) : (
                format(internalDate.from, "d MMM yyyy", { locale: id })
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 flex flex-col md:flex-row bg-white" align="start">
          <div className="flex flex-col gap-2 p-3 border-r border-slate-100 bg-slate-50 min-w-[150px]">
            <p className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Pintasan</p>
            {presets.map(preset => (
              <Button 
                key={preset.label} 
                variant="ghost" 
                size="sm" 
                className="justify-start text-slate-700 hover:text-indigo-700 hover:bg-indigo-50"
                onClick={() => handlePreset(preset.getRange())}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="p-3">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={internalDate?.from}
              selected={internalDate}
              onSelect={handleSelect}
              numberOfMonths={2}
              locale={id}
              startMonth={startMonth}
              endMonth={endMonth}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
