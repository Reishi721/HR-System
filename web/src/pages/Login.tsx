import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Lock, Mail, ChevronRight, Fingerprint, Activity } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Link } from 'react-router-dom'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { session, profile } = useAuth()
  const navigate = useNavigate()

  if (session && profile) {
    if (profile.role === 'hr') return <Navigate to="/hr" />
    if (profile.role === 'manager') return <Navigate to="/manager" />
    return <Navigate to="/employee" />
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      // ── Defensive cleanup ──
      // If there are stale auth keys left in localStorage from a previous
      // session that was not properly signed out, Supabase may refuse to
      // create a new session.  Force-wipe them before every login attempt.
      try {
        await supabase.auth.signOut()
      } catch {
        // signOut can throw if the stored token is corrupted — ignore
      }
      // Belt & suspenders: also nuke raw localStorage keys
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
          localStorage.removeItem(key)
        }
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      }
      // Kita biarkan AuthContext yang mengambil profile di background via onAuthStateChange
      // Begitu profile didapat, useEffect di line atas (session && profile) akan berpindah halaman.
    } catch (err: any) {
      console.error("Runtime exception during login:", err)
      setError(err.message || "Terjadi masalah jaringan atau server.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      
      {/* Left side: Premium Animated Banner */}
      <div className="hidden lg:flex w-1/2 bg-indigo-900 relative overflow-hidden items-center justify-center">
        {/* Abstract shapes and gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-violet-600/30 blur-[100px] animate-pulse"></div>
          <div className="absolute top-[20%] right-[10%] w-[30%] h-[40%] rounded-full bg-indigo-400/20 blur-[80px] animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[50%] rounded-full bg-blue-500/20 blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
        
        {/* Glassmorphism content */}
        <div className="relative z-10 w-full max-w-lg p-12 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-violet-500 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-indigo-500/30">
            <Activity className="text-white w-8 h-8" />
          </div>
          <h1 className="text-4xl font-black text-white leading-tight mb-4 tracking-tight">
            Ultimate<br/>HRIS Platform.
          </h1>
          <p className="text-indigo-100 text-lg leading-relaxed font-medium">
            One platform to manage your workforce. Attendance, Payroll, Leave, and more in a beautiful premium interface.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-xl p-4 border border-white/5">
              <p className="text-indigo-200 text-sm font-semibold mb-1">Web & Mobile</p>
              <p className="text-white text-xs">Seamless experience across all devices.</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 border border-white/5">
              <p className="text-indigo-200 text-sm font-semibold mb-1">Real-time Data</p>
              <p className="text-white text-xs">Instant sync for notifications and GPS.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white/50 backdrop-blur-xl relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
        
        <div className="max-w-md w-full relative z-10">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight text-slate-800">Selamat Datang</h2>
            <p className="text-slate-500 mt-2 text-sm">Masuk ke akun perusahaan Anda</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-100 flex items-start gap-3 animate-in slide-in-from-top-2">
              <div className="mt-0.5 text-rose-500"><Lock className="w-4 h-4" /></div>
              <div>
                <h3 className="text-sm font-semibold text-rose-800">Autentikasi Gagal</h3>
                <p className="text-xs text-rose-600 mt-1">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 h-12 bg-white border border-slate-200 rounded-xl focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500"
                  placeholder="name@company.com"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Fingerprint className="h-5 w-5 text-slate-400" />
                </div>
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 h-12 bg-white border border-slate-200 rounded-xl focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500"
                  placeholder="Password anda"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch id="remember" className="data-[state=checked]:bg-indigo-600" />
                <Label htmlFor="remember" className="text-sm font-medium text-slate-700 cursor-pointer">Ingat saya</Label>
              </div>
              <div className="text-sm">
                <Link to="/forgot-password" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">Lupa sandi?</Link>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl text-white bg-slate-900 hover:bg-indigo-600 transition-all font-semibold shadow-lg hover:shadow-indigo-500/25 group"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                  Memproses...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Masuk Sekarang
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </Button>
          </form>

          <p className="mt-10 text-center text-xs text-slate-400">
            &copy; {new Date().getFullYear()} HRIS Platform. Dilindungi Hak Cipta.
          </p>
        </div>
      </div>
    </div>
  )
}
