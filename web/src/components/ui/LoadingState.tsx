import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingStateProps {
  message?: string
  fullscreen?: boolean
  className?: string
}

export function LoadingState({ message = "Memuat Sistem...", fullscreen = true, className }: LoadingStateProps) {
  const content = (
    <div className={cn(
      "flex flex-col items-center justify-center p-8",
      fullscreen ? "min-h-screen w-full bg-slate-50/80 backdrop-blur-sm fixed inset-0 z-50" : "w-full h-full min-h-[400px]",
      className
    )}>
      <div className="relative flex items-center justify-center">
        {/* Outer glowing rings */}
        <div className="absolute inset-0 rounded-full blur-xl bg-indigo-500/20 animate-pulse"></div>
        <div className="absolute -inset-4 rounded-full border border-indigo-200/50 animate-[spin_3s_linear_infinite]"></div>
        <div className="absolute -inset-8 rounded-full border border-violet-200/30 animate-[spin_4s_linear_infinite_reverse]"></div>
        
        {/* Inner container */}
        <div className="relative bg-white shadow-xl shadow-indigo-100/50 rounded-2xl p-4 flex items-center justify-center ring-1 ring-slate-100">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        </div>
      </div>
      
      <div className="mt-8 flex flex-col items-center gap-2">
        <h3 className="text-lg font-semibold text-slate-800 tracking-tight animate-pulse">{message}</h3>
        <p className="text-sm text-slate-500 font-medium tracking-wide">Mohon tunggu sebentar</p>
      </div>

      {/* Decorative gradient orb at the bottom */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-32 bg-gradient-to-t from-indigo-100/50 to-transparent blur-2xl -z-10 pointer-events-none"></div>
    </div>
  )

  return content;
}
