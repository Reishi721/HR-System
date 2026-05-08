import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Lock, Upload } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { FileUpload } from '@/components/ui/FileUpload'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

const profileSchema = z.object({
  phone: z.string().optional(),
  address: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account: z.string().optional(),
  npwp: z.string().optional(),
  avatar_url: z.string().optional(),
})
type ProfileForm = z.infer<typeof profileSchema>

export function ProfileEmployee() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [pwd, setPwd] = useState('')
  const [pwdConfirm, setPwdConfirm] = useState('')

  const { register, handleSubmit, setValue, watch, formState: { isSubmitting } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: {
      phone: profile?.phone || '',
      address: profile?.address || '',
      bank_name: profile?.bank_name || '',
      bank_account: profile?.bank_account || '',
      npwp: profile?.npwp || '',
      avatar_url: profile?.avatar_url || '',
    }
  })
  const avatarUrl = watch('avatar_url')

  const updateProfile = useMutation({
    mutationFn: async (values: ProfileForm) => {
      if (!profile?.id) throw new Error('Unauthenticated')
      const { error } = await supabase.from('profiles').update(values).eq('id', profile.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast({ title: 'Berhasil', description: 'Profil berhasil diperbarui.' })
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const updatePassword = useMutation({
    mutationFn: async () => {
      if (pwd !== pwdConfirm) throw new Error('Password baru tidak cocok.')
      if (pwd.length < 6) throw new Error('Password minimal 6 karakter.')
      const { error } = await supabase.auth.updateUser({ password: pwd })
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: 'Berhasil', description: 'Password berhasil diubah.' })
      setPwd(''); setPwdConfirm('')
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  return (
    <AppShell>
      <PageHeader
        title="Pengaturan Profil"
        description="Kelola informasi pribadi, kontak, dan keamanan akun"
        icon={User}
        breadcrumbs={[{ label: 'Employee Space' }, { label: 'Profil Saya' }]}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="card-premium">
            <CardHeader className="border-b border-slate-50">
              <CardTitle className="text-base font-semibold">Informasi Pribadi & Kontak</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit(d => updateProfile.mutate(d))} className="space-y-6">
                
                {/* Avatar & Upload - side by side */}
                <div className="flex items-center gap-5 pb-6 mb-6 border-b border-slate-100">
                  <Avatar className="h-20 w-20 sm:h-24 sm:w-24 shadow-sm bg-white border-2 border-indigo-50 shrink-0">
                    <AvatarImage src={avatarUrl} alt="Avatar" className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-violet-200 text-indigo-700 text-2xl sm:text-3xl font-bold">
                      {profile?.full_name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{profile?.full_name}</p>
                    <div className="flex gap-2 mt-1.5 mb-3">
                      <StatusBadge status={profile?.status || ''} />
                      <StatusBadge status={profile?.role || ''} />
                    </div>
                    <FileUpload bucket="avatars" path="employees" value={avatarUrl} onChange={v => setValue('avatar_url', v)} label="Ubah Foto" compact />
                  </div>
                </div>
                  
                {/* Profile info fields */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Nama Lengkap</Label>
                      <Input value={profile?.full_name} disabled className="mt-1.5 bg-slate-50 cursor-not-allowed" />
                    </div>
                    <div>
                      <Label>ID Karyawan</Label>
                      <Input value={profile?.employee_id || ''} disabled className="mt-1.5 bg-slate-50 cursor-not-allowed" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div><Label>No. Telepon / WhatsApp</Label><Input {...register('phone')} className="mt-1.5" /></div>
                  <div><Label>Alamat KTP / Domisili</Label><Textarea {...register('address')} className="mt-1.5" rows={2} /></div>
                  <div><Label>NPWP</Label><Input {...register('npwp')} className="mt-1.5" /></div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-semibold text-slate-800 mb-4">Informasi Rekening (Untuk Payroll)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><Label>Nama Bank</Label><Input {...register('bank_name')} className="mt-1.5" placeholder="BCA, Mandiri, dll." /></div>
                    <div><Label>Nomor Rekening</Label><Input {...register('bank_account')} className="mt-1.5" /></div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 px-8">
                    {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="card-premium">
            <CardHeader className="border-b border-slate-50">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Lock className="h-4 w-4 text-slate-400" /> Keamanan Akun
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div><Label>Password Baru</Label><Input type="password" value={pwd} onChange={e => setPwd(e.target.value)} className="mt-1.5" /></div>
                <div><Label>Konfirmasi Password Baru</Label><Input type="password" value={pwdConfirm} onChange={e => setPwdConfirm(e.target.value)} className="mt-1.5" /></div>
                <Button onClick={() => updatePassword.mutate()} disabled={updatePassword.isPending || !pwd} className="w-full bg-slate-800 hover:bg-slate-900 mt-2">
                  {updatePassword.isPending ? 'Memproses...' : 'Ubah Password'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="card-premium">
            <CardHeader className="border-b border-slate-50">
              <CardTitle className="text-base font-semibold">Bantuan & Laporkan Isu</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 text-sm text-slate-600 space-y-3">
              <p>Jika ada data pribadi utama (Nama, Department, Jabatan, NIK KTP, dsb) yang salah, harap hubungi Dept. HRD melalui email atau admin lokal.</p>
              <div className="p-3 bg-amber-50 text-amber-700 rounded-lg flex items-start gap-2 border border-amber-100">
                <div className="shrink-0 mt-0.5">ℹ️</div>
                <p className="text-xs">Ubah password secara berkala untuk menjaga keamanan akun portal ESS Anda.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
