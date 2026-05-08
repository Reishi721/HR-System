import type { LucideIcon } from 'lucide-react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Breadcrumb {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  breadcrumbs?: Breadcrumb[]
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, icon: Icon, breadcrumbs, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between mb-8 animate-fade-in-up', className)}>
      <div className="flex flex-col gap-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 mb-2 px-3 py-1.5 rounded-full bg-white/60 border border-slate-200/60 shadow-sm backdrop-blur-md w-fit">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
                <span className={cn(
                  i === breadcrumbs.length - 1 ? 'text-indigo-700 font-semibold' : 'hover:text-indigo-600 transition-colors cursor-pointer font-medium'
                )}>{crumb.label}</span>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Icon className="h-5 w-5 text-indigo-600" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
            {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
          </div>
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 ml-4">{actions}</div>}
    </div>
  )
}
