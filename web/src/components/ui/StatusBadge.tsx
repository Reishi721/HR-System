import { cn } from '@/lib/utils'

type StatusVariant =
  | 'pending' | 'pending_manager' | 'pending_hr'
  | 'approved' | 'active' | 'published' | 'completed' | 'paid'
  | 'rejected' | 'expired' | 'terminated' | 'inactive'
  | 'draft' | 'present' | 'late' | 'absent'
  | string

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Menunggu', className: 'status-pending' },
  pending_manager: { label: 'Menunggu Manager', className: 'status-pending' },
  pending_hr: { label: 'Menunggu HR', className: 'status-pending' },
  approved: { label: 'Disetujui', className: 'status-approved' },
  active: { label: 'Aktif', className: 'status-active' },
  published: { label: 'Diterbitkan', className: 'status-published' },
  completed: { label: 'Selesai', className: 'status-approved' },
  paid: { label: 'Dibayar', className: 'status-paid' },
  rejected: { label: 'Ditolak', className: 'status-rejected' },
  expired: { label: 'Kedaluwarsa', className: 'status-expired' },
  terminated: { label: 'Diakhiri', className: 'status-rejected' },
  inactive: { label: 'Tidak Aktif', className: 'status-draft' },
  draft: { label: 'Draft', className: 'status-draft' },
  present: { label: 'Hadir', className: 'status-approved' },
  late: { label: 'Terlambat', className: 'status-pending' },
  absent: { label: 'Absen', className: 'status-rejected' },
  PKWT: { label: 'PKWT', className: 'status-active' },
  PKWTT: { label: 'PKWTT', className: 'status-published' },
  cuti: { label: 'Cuti', className: 'status-active' },
  sakit: { label: 'Sakit', className: 'status-pending' },
  izin: { label: 'Izin', className: 'status-draft' },
}

interface StatusBadgeProps {
  status: StatusVariant
  className?: string
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, className, size = 'sm' }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, className: 'status-draft' }

  return (
    <span className={cn(
      'inline-flex items-center rounded-lg font-semibold whitespace-nowrap',
      size === 'sm' ? 'text-[11px] px-2.5 py-0.5' : 'text-xs px-3 py-1',
      config.className,
      className
    )}>
      <span className={cn(
        'inline-block w-1.5 h-1.5 rounded-full mr-1.5',
        config.className.includes('approved') || config.className.includes('active') || config.className.includes('published') || config.className.includes('paid') ? 'bg-current' : 'bg-current'
      )} />
      {config.label}
    </span>
  )
}
