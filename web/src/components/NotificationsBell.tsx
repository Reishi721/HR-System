import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Notification } from '@/types/database'

export function NotificationsBell() {
  const { session } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = async () => {
    if (!session?.user?.id) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (data) {
      setNotifications(data as Notification[])
      setUnreadCount(data.filter(n => !n.is_read).length)
    }
  }

  useEffect(() => {
    fetchNotifications()

    // Realtime subscription
    const channel = supabase
      .channel('notifications-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session?.user?.id}` }, () => {
        fetchNotifications()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [session])

  const markAsRead = async () => {
    if (!session?.user?.id || unreadCount === 0) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', session.user.id)
    setUnreadCount(0)
  }

  return (
    <Popover onOpenChange={(open) => open && markAsRead()}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-slate-600" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white leading-none">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b font-semibold text-sm">Notifikasi</div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 italic">Belum ada notifikasi.</div>
          ) : (
            notifications.map(n => (
              <div key={n.id} className={`p-4 border-b last:border-0 hover:bg-slate-50 transition ${!n.is_read ? 'bg-blue-50/50' : ''}`}>
                <div className="font-bold text-xs text-slate-900">{n.title}</div>
                <div className="text-xs text-slate-600 mt-1">{n.message}</div>
                <div className="text-[10px] text-slate-400 mt-2">{new Date(n.created_at).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
