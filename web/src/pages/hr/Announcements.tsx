import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Megaphone, Plus, Trash2, Globe, EyeOff } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import type { Announcement } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'

const annSchema = z.object({
  title: z.string().min(5, 'Judul terlalu pendek'),
  content: z.string().min(10, 'Konten pengumuman terlalu pendek'),
})
type AnnForm = z.infer<typeof annSchema>

export function AnnouncementsAdmin() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [deletePrompt, setDeletePrompt] = useState<string | null>(null)

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['announcements-hr'],
    queryFn: async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
      return data as Announcement[]
    },
  })

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<AnnForm>({
    resolver: zodResolver(annSchema),
  })

  const broadcastMutation = useMutation({
    mutationFn: async (values: AnnForm) => {
      const { error } = await supabase.from('announcements').insert({
        title: values.title,
        content: values.content,
        created_by: profile?.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements-hr'] })
      toast({ title: 'Terpublikasi', description: 'Pengumuman dikirim via Realtime.' })
      setOpen(false)
      reset()
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
      const { error } = await supabase.from('announcements').update({ is_active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements-hr'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('announcements').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements-hr'] })
      toast({ title: 'Dihapus', description: 'Pengumuman ditarik.' })
    },
  })

  return (
    <AppShell>
      <PageHeader
        title="Pengumuman (Broadcast)"
        description="Sebarkan informasi penting ke seluruh karyawan melalui Web dan Mobile App secara Realtime"
        icon={Megaphone}
        breadcrumbs={[{ label: 'HR Portal' }, { label: 'Pengumuman' }]}
        actions={
          <Button onClick={() => setOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> Buat Pengumuman Baru
          </Button>
        }
      />

      <div className="grid lg:grid-cols-2 gap-6 stagger">
        {isLoading ? (
          <div className="col-span-2 text-center text-slate-500 py-10">Memuat...</div>
        ) : announcements?.length === 0 ? (
          <div className="col-span-2 text-center py-20 bg-white border border-slate-200 border-dashed rounded-2xl">
            <Megaphone className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Belum ada pengumuman yang dibuat.</p>
          </div>
        ) : (
          announcements?.map(ann => (
            <Card key={ann.id} className={`card-premium relative overflow-hidden transition-all ${!ann.is_active ? 'opacity-60 saturate-50' : 'hover:border-indigo-200'}`}>
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${ann.is_active ? 'bg-indigo-500' : 'bg-slate-300'}`} />
              <CardHeader className="pb-3 border-b border-slate-50 relative z-10 bg-white/50 backdrop-blur">
                <div className="flex items-start justify-between">
                  <div className="pr-12">
                    <CardTitle className="text-lg leading-tight mb-1">{ann.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <span className="text-indigo-600 font-medium">Oleh: {(ann as any).profiles?.full_name}</span>
                      <span>· {new Date(ann.created_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-100 shadow-sm shrink-0">
                    <Button 
                      variant="ghost" size="sm" 
                      className={`h-8 px-2 ${ann.is_active ? 'text-slate-400 hover:text-slate-600' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'}`}
                      onClick={() => toggleMutation.mutate({ id: ann.id, is_active: !ann.is_active })}
                      title={ann.is_active ? "Sembunyikan" : "Tampilkan"}
                    >
                      {ann.is_active ? <EyeOff className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                    </Button>
                    <Button 
                      variant="ghost" size="sm" 
                      className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDeletePrompt(ann.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-slate-700 text-sm leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: ann.content }} />
                
                {ann.is_active ? (
                  <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-50 w-fit px-2 py-1 rounded-md">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Live / Sedang Disiarkan
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-100 w-fit px-2 py-1 rounded-md">
                    <EyeOff className="h-3 w-3" /> Disembunyikan (Arsip)
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Kirim Broadcast Baru</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(d => broadcastMutation.mutate(d))} className="space-y-4 mt-2">
            <div>
              <Label>Judul Pengumuman *</Label>
              <Input {...register('title')} className="mt-1.5" />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
            </div>
            <div>
              <Label>Isi Pengumuman *</Label>
              <RichTextEditor value={watch('content') || ''} onChange={v => setValue('content', v)} className="mt-1.5" />
              {errors.content && <p className="text-xs text-red-500 mt-1">{errors.content.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
                {isSubmitting ? 'Mengirim...' : 'Kirim Realtime'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletePrompt} onOpenChange={() => setDeletePrompt(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengumuman?</AlertDialogTitle>
            <AlertDialogDescription>
              Pengumuman ini akan dihapus secara permanen dari sistem dan tidak dapat dilihat lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletePrompt && deleteMutation.mutate(deletePrompt)}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  )
}
