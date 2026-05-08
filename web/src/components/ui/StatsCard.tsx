import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: number // percentage change
  trendLabel?: string
  description?: string
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet' | 'cyan' | 'teal'
  className?: string
  loading?: boolean
  chartData?: any[] // array of { value: number }
}

const colorMap = {
  indigo: {
    bg: 'bg-indigo-50',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    chartStroke: '#4f46e5',
    chartFill: '#e0e7ff',
  },
  emerald: {
    bg: 'bg-emerald-50',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    chartStroke: '#10b981',
    chartFill: '#d1fae5',
  },
  amber: {
    bg: 'bg-amber-50',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    chartStroke: '#f59e0b',
    chartFill: '#fef3c7',
  },
  rose: {
    bg: 'bg-rose-50',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    chartStroke: '#f43f5e',
    chartFill: '#ffe4e6',
  },
  violet: {
    bg: 'bg-violet-50',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    chartStroke: '#8b5cf6',
    chartFill: '#ede9fe',
  },
  cyan: {
    bg: 'bg-cyan-50',
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
    chartStroke: '#06b6d4',
    chartFill: '#cffafe',
  },
  teal: {
    bg: 'bg-teal-50',
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    chartStroke: '#14b8a6',
    chartFill: '#ccfbf1',
  },
}

export function StatsCard({
  title, value, icon: Icon, trend, trendLabel, description, color = 'indigo', className, loading, chartData,
}: StatsCardProps) {
  const colors = colorMap[color]

  if (loading) {
    return (
      <div className={cn('card-premium p-5 flex flex-col', className)}>
        <div className="flex items-start justify-between mb-4">
          <div className="h-10 w-10 rounded-xl shimmer-bg" />
          <div className="h-4 w-16 rounded shimmer-bg" />
        </div>
        <div className="h-8 w-24 rounded shimmer-bg mb-2" />
        <div className="h-3 w-32 rounded shimmer-bg" />
      </div>
    )
  }

  return (
    <div className={cn('card-premium p-5 group cursor-default relative overflow-hidden flex flex-col justify-between', className)}>
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110', colors.iconBg)}>
            <Icon className={cn('h-5 w-5', colors.iconColor)} />
          </div>
          {trend !== undefined && (
            <div className={cn(
              'flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg backdrop-blur-md',
              trend > 0 ? 'text-emerald-700 bg-emerald-100/80 border border-emerald-200' 
                : trend < 0 ? 'text-rose-700 bg-rose-100/80 border border-rose-200' 
                : 'text-slate-600 bg-slate-100/80 border border-slate-200'
            )}>
              {trend > 0 ? <TrendingUp className="h-3 w-3" /> : trend < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <p className="text-2xl font-bold font-display text-slate-800 tabular-nums">
            {value}
          </p>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-sm font-medium text-slate-500">{title}</p>
              {(description || trendLabel) && (
                <p className="text-xs text-slate-400 mt-1">{description || trendLabel}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {chartData && chartData.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-20 opacity-40 group-hover:opacity-100 transition-opacity pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.chartStroke} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={colors.chartStroke} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={colors.chartStroke} 
                strokeWidth={2}
                fillOpacity={1} 
                fill={`url(#gradient-${color})`} 
                isAnimationActive={true}
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
