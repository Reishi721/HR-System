import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

// Map table names to React Query keys that need to be invalidated
const TABLE_QUERY_MAP: Record<string, string[]> = {
  profiles: ['employees', 'profile', 'managers-list', 'team-members'],
  companies: ['companies', 'companies-list'],
  departments: ['departments', 'departments-list'],
  positions: ['positions', 'positions-list'],
  leave_requests: ['leave-requests', 'leaves', 'pending-approvals', 'dashboard'],
  overtimes: ['overtimes', 'overtime', 'pending-approvals', 'dashboard'],
  reimbursements: ['reimbursements', 'dashboard'],
  attendances: ['attendances', 'attendance', 'team-attendance', 'dashboard'],
  payslips: ['payslips', 'payroll', 'dashboard'],
  employee_loans: ['loans', 'employee-loans', 'dashboard'],
  contracts: ['contracts'],
  announcements: ['announcements', 'dashboard'],
  notifications: ['notifications'],
  leave_balances: ['leave-balances'],
  audit_logs: ['audit-logs'],
}

// Tables to subscribe to
const REALTIME_TABLES = Object.keys(TABLE_QUERY_MAP)

// Notification messages for push notifications
function getNotificationMessage(table: string, event: string, record: any): { title: string; body: string } | null {
  switch (table) {
    case 'leave_requests':
      if (event === 'INSERT') return { title: '📋 Pengajuan Cuti Baru', body: 'Ada pengajuan cuti baru yang perlu diproses.' }
      if (event === 'UPDATE' && record.status === 'approved') return { title: '✅ Cuti Disetujui', body: 'Pengajuan cuti telah disetujui.' }
      if (event === 'UPDATE' && record.status === 'rejected') return { title: '❌ Cuti Ditolak', body: 'Pengajuan cuti telah ditolak.' }
      return null
    case 'overtimes':
      if (event === 'INSERT') return { title: '⏰ Pengajuan Lembur Baru', body: 'Ada pengajuan lembur baru.' }
      if (event === 'UPDATE' && record.status === 'approved') return { title: '✅ Lembur Disetujui', body: 'Pengajuan lembur telah disetujui.' }
      return null
    case 'reimbursements':
      if (event === 'INSERT') return { title: '💰 Reimbursement Baru', body: 'Ada pengajuan reimbursement baru.' }
      if (event === 'UPDATE' && record.status === 'approved') return { title: '✅ Reimbursement Disetujui', body: 'Reimbursement telah disetujui.' }
      if (event === 'UPDATE' && record.status === 'paid') return { title: '💵 Reimbursement Dibayar', body: 'Reimbursement telah dibayarkan.' }
      return null
    case 'payslips':
      if (event === 'UPDATE' && record.status === 'published') return { title: '📄 Slip Gaji Terbit', body: 'Slip gaji bulan ini sudah tersedia.' }
      return null
    case 'announcements':
      if (event === 'INSERT') return { title: '📢 Pengumuman Baru', body: record.title || 'Ada pengumuman baru dari HR.' }
      return null
    case 'notifications':
      if (event === 'INSERT') return { title: record.title || '🔔 Notifikasi', body: record.message || 'Anda memiliki notifikasi baru.' }
      return null
    case 'employee_loans':
      if (event === 'UPDATE' && record.status === 'approved') return { title: '✅ Pinjaman Disetujui', body: 'Pengajuan pinjaman Anda telah disetujui.' }
      return null
    case 'contracts':
      if (event === 'INSERT') return { title: '📝 Kontrak Baru', body: 'Kontrak baru telah dibuat.' }
      return null
    default:
      return null
  }
}

/**
 * Request browser notification permission
 */
export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Browser tidak mendukung push notification')
    return Promise.resolve('denied' as NotificationPermission)
  }
  return Notification.requestPermission()
}

/**
 * Show a browser push notification
 */
function showBrowserNotification(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  try {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `hris-${Date.now()}`,
      requireInteraction: false,
      silent: false,
    })

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000)

    // Focus window on click
    notification.onclick = () => {
      window.focus()
      notification.close()
    }
  } catch {
    // Fallback: notification creation might fail in some contexts
  }
}

/**
 * Hook: Subscribe to all Supabase Realtime channels and auto-sync React Query cache.
 * Also triggers browser push notifications for relevant events.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const { toast } = useToast()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!profile?.id) return

    // Request notification permission on first load
    requestNotificationPermission()

    // Create a single channel with all table subscriptions
    const channel = supabase.channel('global-realtime-sync')

    REALTIME_TABLES.forEach((table) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          // 1. Invalidate related React Query caches
          const queryKeys = TABLE_QUERY_MAP[table] || []
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: [key] })
          })

          // 2. Show push notification for relevant events
          const record = payload.new as any
          const msg = getNotificationMessage(table, payload.eventType, record)

          if (msg) {
            // Only show notification if the event is relevant to this user
            const isForMe = !record.user_id || record.user_id === profile.id
            const isManagerApproval = profile.role === 'manager' && payload.eventType === 'INSERT'
              && ['leave_requests', 'overtimes'].includes(table)
            const isHrAction = profile.role === 'hr'

            if (isForMe || isManagerApproval || isHrAction) {
              // Browser push notification
              showBrowserNotification(msg.title, msg.body)

              // In-app toast
              toast({
                title: msg.title,
                description: msg.body,
                duration: 4000,
              })
            }
          }
        }
      )
    })

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime sync connected — watching', REALTIME_TABLES.length, 'tables')
      }
    })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [profile?.id, profile?.role, queryClient, toast])
}
