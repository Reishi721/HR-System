import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// ─── Types ─────────────────────────────────────────────────────────────────

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  createdAt: string
}

interface AppState {
  // UI State
  sidebarOpen: boolean
  theme: 'light' | 'dark'

  // Notifications
  notifications: Notification[]
  unreadCount: number

  // Actions
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleTheme: () => void

  addNotification: (notif: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearNotifications: () => void
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        sidebarOpen: true,
        theme: 'light',
        notifications: [],
        unreadCount: 0,

        // UI actions
        toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        toggleTheme: () =>
          set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),

        // Notification actions
        addNotification: (notif) => {
          const newNotif: Notification = {
            ...notif,
            id: crypto.randomUUID(),
            read: false,
            createdAt: new Date().toISOString(),
          }
          set((s) => ({
            notifications: [newNotif, ...s.notifications],
            unreadCount: s.unreadCount + 1,
          }))
        },

        markAsRead: (id) => {
          set((s) => {
            const updated = s.notifications.map((n) =>
              n.id === id ? { ...n, read: true } : n
            )
            return {
              notifications: updated,
              unreadCount: updated.filter((n) => !n.read).length,
            }
          })
        },

        markAllAsRead: () =>
          set((s) => ({
            notifications: s.notifications.map((n) => ({ ...n, read: true })),
            unreadCount: 0,
          })),

        clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
      }),
      {
        name: 'hr-app-store',           // localStorage key
        partialize: (s) => ({           // hanya persist theme & sidebar
          theme: s.theme,
          sidebarOpen: s.sidebarOpen,
        }),
      }
    ),
    { name: 'HRAppStore' }
  )
)
