import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertOctagon, RefreshCcw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
          {/* Background Decorations */}
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-rose-500/10 blur-[100px] pointer-events-none"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none"></div>

          <div className="relative bg-white shadow-2xl shadow-rose-100/50 rounded-3xl p-8 md:p-12 max-w-lg w-full text-center border border-rose-100 backdrop-blur-xl">
            
            <div className="mx-auto w-20 h-20 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 shadow-inner ring-1 ring-rose-100">
              <AlertOctagon className="h-10 w-10 text-rose-500" />
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight mb-3">
              Oops! Terjadi Kesalahan
            </h1>
            
            <p className="text-slate-500 mb-6 leading-relaxed">
              Sistem kami mendeteksi masalah tidak terduga saat memproses memuat halaman ini. Silakan coba kembali sesaat lagi.
            </p>

            {this.state.error && (
              <div className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100 text-left overflow-x-auto">
                <p className="text-xs font-mono font-medium text-rose-600 truncate">
                  {this.state.error.message || "Unknown Application Error"}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white gap-2 shadow-lg shadow-slate-200"
              >
                <RefreshCcw className="h-4 w-4" /> Muat Ulang Halaman
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/'} 
                className="w-full sm:w-auto gap-2 border-slate-200 hover:bg-slate-50"
              >
                <Home className="h-4 w-4" /> Kembali ke Home
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
