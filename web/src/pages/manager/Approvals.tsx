import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckSquare, CheckCircle, XCircle } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

export function Approvals() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('leaves')
  const [rejectPrompt, setRejectPrompt] = useState<{table: 'leave_requests' | 'overtimes', id: string} | null>(null)

  const { data: teamMembers } = useQuery({
    queryKey: ['manager-team', profile?.id, profile?.company_id],
    queryFn: async () => {
      if (!profile?.id) return []

      let query = supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .neq('id', profile.id)
        .eq('status', 'active')

      if (profile.company_id) {
        query = query.eq('company_id', profile.company_id)
      } else {
        query = query.eq('manager_id', profile.id)
      }

      const { data } = await query.order('full_name')
      return (data || []) as any[]
    },
    enabled: !!profile?.id,
  })

  // Leave Approvals
  const { data: leaves, isLoading: leavesLoading } = useQuery({
    queryKey: ['manager-leaves', profile?.id],
    queryFn: async () => {
      if (!teamMembers?.length) return []
      const ids = teamMembers.map(m => m.id)
      const { data } = await supabase.from('leave_requests').select('*, profiles(full_name, avatar_url)').in('user_id', ids).eq('status', 'pending_manager').order('created_at', { ascending: false })
      return data as any[]
    },
    enabled: !!teamMembers?.length,
  })

  // Overtime Approvals
  const { data: overtimes, isLoading: otLoading } = useQuery({
    queryKey: ['manager-overtimes', profile?.id],
    queryFn: async () => {
      if (!teamMembers?.length) return []
      const ids = teamMembers.map(m => m.id)
      const { data } = await supabase.from('overtimes').select('*, profiles(full_name, avatar_url)').in('user_id', ids).eq('status', 'pending_manager').order('created_at', { ascending: false })
      return data as any[]
    },
    enabled: !!teamMembers?.length,
  })

  const actionMutation = useMutation({
    mutationFn: async ({ table, id, status }: { table: 'leave_requests' | 'overtimes', id: string, status: string }) => {
      const updateData: any = { status }
      if (status.includes('pending_hr')) {
         updateData.manager_approved_at = new Date().toISOString()
         if (table === 'overtimes') updateData.manager_approved_by = profile?.id
      }
      const { error } = await supabase.from(table).update(updateData).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [variables.table === 'leave_requests' ? 'manager-leaves' : 'manager-overtimes'] })
      toast({ title: 'Berhasil', description: `Request telah di-${variables.status.includes('hr') ? 'setujui' : 'tolak'}.` })
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  function handleAction(table: 'leave_requests' | 'overtimes', id: string, approve: boolean) {
    if (!approve) {
      setRejectPrompt({ table, id })
      return
    }
    actionMutation.mutate({ table, id, status: 'pending_hr' })
  }

  const renderEmpty = (type: string) => (
    <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
      <CheckSquare className="h-12 w-12 text-slate-300 mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-slate-700">Tidak ada pengajuan</h3>
      <p className="text-slate-500">Semua pengajuan {type} telah Anda proses.</p>
    </div>
  )

  const renderApprovalCard = (req: any, type: 'leave_requests' | 'overtimes', title: string, subtitle: string, badge: string) => (
    <Card key={req.id} className="card-premium overflow-hidden group hover:border-indigo-200 transition-colors">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400" />
      <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <Avatar className="h-12 w-12 shadow-sm bg-white">
              <AvatarImage src={req.profiles?.avatar_url} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-violet-200 text-indigo-700 font-bold text-lg">
                {req.profiles?.full_name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-lg mb-0.5">{req.profiles?.full_name}</h4>
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={req.status} />
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">{badge}</span>
            </div>
            <p className="text-sm font-medium text-indigo-900 bg-indigo-50 inline-block px-2.5 py-1 rounded-md mb-2">{title}</p>
            <p className="text-sm text-slate-600 leading-relaxed italic border-l-2 border-slate-200 pl-3">"{subtitle}"</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:flex-col lg:flex-row mt-2 md:mt-0 pt-4 md:pt-0 border-t border-slate-100 md:border-0 md:pl-4">
          <Button 
            className="flex-1 md:flex-none gap-2 bg-emerald-500 hover:bg-emerald-600 text-white min-w-[120px]"
            onClick={() => handleAction(type, req.id, true)}
            disabled={actionMutation.isPending}
          >
            <CheckCircle className="h-4 w-4" /> Setujui
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 md:flex-none gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 min-w-[120px]"
            onClick={() => handleAction(type, req.id, false)}
            disabled={actionMutation.isPending}
          >
            <XCircle className="h-4 w-4" /> Tolak
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <AppShell>
      <PageHeader
        title="Persetujuan Manager"
        description="Review dan berikan approval untuk pengajuan anggota tim Anda"
        icon={CheckSquare}
        breadcrumbs={[{ label: 'Manager Portal' }, { label: 'Approvals' }]}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="bg-slate-100/80 p-1 rounded-xl h-12 w-full md:w-auto flex">
          <TabsTrigger value="leaves" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 flex-1 md:w-40 text-sm font-semibold transition-all">
            Cuti Tim 
            {leaves?.length ? <span className="ml-2 bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{leaves.length}</span> : null}
          </TabsTrigger>
          <TabsTrigger value="overtime" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 flex-1 md:w-40 text-sm font-semibold transition-all">
            Lembur Tim
            {overtimes?.length ? <span className="ml-2 bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{overtimes.length}</span> : null}
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="leaves" className="focus:outline-none">
            {leavesLoading ? <p>Memuat...</p> : leaves?.length === 0 ? renderEmpty('cuti') : (
              <div className="space-y-4">
                {leaves?.map((req) => renderApprovalCard(
                  req, 'leave_requests',
                  `${new Date(req.start_date).toLocaleDateString('id-ID')} s/d ${new Date(req.end_date).toLocaleDateString('id-ID')}`,
                  req.reason,
                  req.type.toUpperCase()
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="overtime" className="focus:outline-none">
            {otLoading ? <p>Memuat...</p> : overtimes?.length === 0 ? renderEmpty('lembur') : (
              <div className="space-y-4">
                {overtimes?.map((req) => renderApprovalCard(
                  req, 'overtimes',
                  `${new Date(req.date).toLocaleDateString('id-ID')} (${req.start_time} - ${req.end_time} | ${req.hours} Jam)`,
                  req.reason,
                  'OVERTIME'
                ))}
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={!!rejectPrompt} onOpenChange={() => setRejectPrompt(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tolak Pengajuan?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menolak pengajuan secara permanen. Apakah Anda yakin?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (rejectPrompt) {
                  actionMutation.mutate({ table: rejectPrompt.table, id: rejectPrompt.id, status: 'rejected' })
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Ya, Tolak
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </AppShell>
  )
}
