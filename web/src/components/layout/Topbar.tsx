import { useState, useEffect, useRef } from 'react'
import { Bell, LogOut, User, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { Notification } from '@/types/database'

export function Topbar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showNotif, setShowNotif] = useState(false)
  const [showUser, setShowUser] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  // Fetch notifications via React Query (auto-invalidated by useRealtimeSync)
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(15)
      return (data || []) as Notification[]
    },
    enabled: !!profile?.id,
  })

  const unreadCount = notifications.filter(n => !n.is_read).length

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('notifications').update({ is_read: true }).eq('is_read', false)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUser(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-end px-4 md:px-6 gap-3 sticky top-0 z-20 shadow-sm">
      {/* Notifications */}
      <div className="relative" ref={notifRef}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => { setShowNotif(v => !v); setShowUser(false) }}
          className={cn(
            'relative h-9 w-9 rounded-xl transition-colors hover:bg-slate-100',
            showNotif ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'
          )}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse-ring">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>

        {showNotif && (
          <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-fade-in-up">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-sm">Notifikasi</h3>
              {unreadCount > 0 && (
                <Button variant="link" size="sm" onClick={() => markAllReadMutation.mutate()} className="h-auto p-0 text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                  Tandai semua dibaca
                </Button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">Tidak ada notifikasi</div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className={cn('px-4 py-3 border-b border-slate-50 last:border-0', !n.is_read && 'bg-indigo-50/40')}>
                    <div className="flex gap-3">
                      <div className={cn('h-2 w-2 rounded-full mt-1.5 shrink-0', !n.is_read ? 'bg-indigo-500' : 'bg-slate-200')} />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {new Date(n.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* User menu */}
      <div className="relative" ref={userRef}>
        <Button
          variant="ghost"
          onClick={() => { setShowUser(v => !v); setShowNotif(false) }}
          className={cn(
            'flex items-center gap-2.5 px-3 py-6 rounded-xl transition-colors h-auto hover:bg-slate-100',
            showUser ? 'bg-indigo-50' : ''
          )}
        >
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {profile?.full_name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-semibold text-slate-700 leading-tight">{profile?.full_name}</p>
            <p className="text-[11px] text-slate-400 leading-tight capitalize font-normal">{profile?.role}</p>
          </div>
          <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform hidden sm:block', showUser && 'rotate-180')} />
        </Button>

        {showUser && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-fade-in-up">
            <div className="p-1 flex flex-col gap-1">
              <Button variant="ghost" className="w-full justify-start gap-3 px-3 py-2.5 rounded-xl text-slate-700">
                <User className="h-4 w-4 text-slate-500" /> Profil Saya
              </Button>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full justify-start gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 hover:text-red-600 text-red-500"
              >
                <LogOut className="h-4 w-4" /> Keluar
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
