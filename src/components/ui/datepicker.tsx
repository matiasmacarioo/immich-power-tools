"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"

import { useLanguage } from "@/contexts/LanguageContext"

interface IProps {
  date?: Date | null
  onSelect?: (date?: Date | null) => any
  iconOnly?: boolean
}

/**
 * Custom robust DatePicker that doesn't use Radix Popover to avoid 
 * closure issues when interacting with native browser year/month selects.
 */
export function DatePicker({ date: _date, onSelect, iconOnly }: IProps) {
  const { t, formatDate } = useLanguage()
  const [date, setDate] = React.useState<Date | null>(_date || null)
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setDate(_date || null)
  }, [_date])

  // Handle outside clicks to close the manual popover
  React.useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // Special check for native select dropdowns which might be portaled or act weirdly
        const target = event.target as HTMLElement;
        if (target.closest('select') || target.closest('option')) {
          return;
        }
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open])

  const handleSelect = (date?: Date) => {
    setDate(date || null)
    onSelect?.(date)
    // We don't close on select anymore as per user request (only on X or explicit actions)
  }

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(!open);
  }

  const [month, setMonth] = React.useState<Date>(date || new Date())

  React.useEffect(() => {
    if (open && date) {
      setMonth(date)
    }
  }, [open, date])

  const handleYearUnknown = () => {
    if (!date) return;
    const newDate = new Date(1604, date.getMonth(), date.getDate());
    handleSelect(newDate);
  }

  return (
    <div className="relative inline-block" ref={containerRef}>
      <Button
        type="button"
        variant={"outline"}
        onClick={toggle}
        className={cn(
          "justify-start text-left font-normal flex gap-1",
          !date && "text-muted-foreground"
        )}
      >
        <CalendarIcon className="h-4 w-4" />
        {!iconOnly && <span>{date ? formatDate(date, "dd/MM/yyyy") : <span>{t("Pick a date")}</span>}</span>}
      </Button>

      {open && (
        <div 
          className="absolute left-0 mt-2 z-[999] bg-popover border rounded-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-left"
          style={{ width: 'max-content' }}
        >
          <div className="flex flex-col">
            <div className="flex items-center justify-between p-2 border-b bg-muted/30">
              <span className="text-xs font-semibold px-2 uppercase tracking-tight text-muted-foreground">{t("Select Birthday")}</span>
              <div className="flex items-center gap-1">
                {date && date.getFullYear() !== 1604 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-[10px] px-2"
                    onClick={handleYearUnknown}
                  >
                    {t("Year Unknown")}
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive transition-colors" 
                  onClick={() => setOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-1">
              <Calendar
                mode="single"
                selected={date || undefined}
                onSelect={handleSelect}
                month={month}
                onMonthChange={setMonth}
                startMonth={new Date(1600, 0)}
                endMonth={new Date(new Date().getFullYear() + 20, 11)}
                captionLayout="dropdown"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
