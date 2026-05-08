import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, File, Image, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'

interface FileUploadProps {
  bucket: string
  path: string
  value?: string
  onChange: (url: string) => void
  accept?: Record<string, string[]>
  maxSize?: number
  label?: string
  className?: string
  compact?: boolean
}

export function FileUpload({
  bucket, path, value, onChange, accept, maxSize = 10 * 1024 * 1024,
  label = 'Seret file ke sini atau klik untuk upload', className, compact,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${path}/${Date.now()}.${ext}`
      
      const { error } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: true })
      if (error) throw error

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName)
      onChange(publicUrl)
      toast({ title: 'Upload berhasil', description: file.name })
    } catch (err: any) {
      toast({ title: 'Upload gagal', description: err.message, variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }, [bucket, path, onChange, toast])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept, maxSize, multiple: false,
  })

  const isImage = value && /\.(jpg|jpeg|png|gif|webp)$/i.test(value)

  return (
    <div className={className}>
      {value ? (
        <div className="relative group rounded-xl overflow-hidden border border-slate-200">
          {isImage ? (
            <img src={value} alt="Upload" className="w-full h-40 object-cover" />
          ) : (
            <div className="flex items-center gap-3 p-4 bg-slate-50">
              <File className="h-8 w-8 text-indigo-500" />
              <span className="text-sm text-slate-600 truncate">{value.split('/').pop()}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => { e.stopPropagation(); onChange('') }}
              className="rounded-full h-10 w-10 border-none bg-white shadow-lg hover:bg-red-50"
            >
              <X className="h-5 w-5 text-red-500" />
            </Button>
          </div>
        </div>
      ) : (
        compact ? (
          <div
            {...getRootProps()}
            className={cn(
              'border border-dashed rounded-lg px-3 py-2 text-center cursor-pointer transition-all duration-200 flex items-center gap-2',
              isDragActive
                ? 'border-indigo-400 bg-indigo-50/80'
                : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30',
            )}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 text-indigo-400 shrink-0" />
            )}
            <span className="text-xs font-medium text-slate-600 truncate">
              {uploading ? 'Mengupload...' : label}
            </span>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
              isDragActive
                ? 'border-indigo-400 bg-indigo-50/80'
                : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30',
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              {uploading ? (
                <>
                  <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                  <p className="text-sm text-slate-500">Mengupload...</p>
                </>
              ) : (
                <>
                  <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                    {isDragActive ? (
                      <Image className="h-6 w-6 text-indigo-500" />
                    ) : (
                      <Upload className="h-6 w-6 text-indigo-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{label}</p>
                    <p className="text-xs text-slate-400 mt-1">Maks. {Math.round(maxSize / 1024 / 1024)}MB</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      )}
    </div>
  )
}
