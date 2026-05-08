import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Italic, Strikethrough, List, ListOrdered, Heading2, Quote, Undo, Redo } from 'lucide-react'
import { Toggle } from '@/components/ui/toggle'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[150px] p-4 text-slate-700',
      },
    },
  })

  if (!editor) {
    return null
  }

  return (
    <div className={cn("border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col", className)}>
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border-b border-slate-100">
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 2 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className="data-[state=on]:bg-indigo-100 data-[state=on]:text-indigo-700"
        >
          <Heading2 className="h-4 w-4" />
        </Toggle>
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <Toggle
          size="sm"
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          className="data-[state=on]:bg-indigo-100 data-[state=on]:text-indigo-700 font-bold"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          className="data-[state=on]:bg-indigo-100 data-[state=on]:text-indigo-700 italic"
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('strike')}
          onPressedChange={() => editor.chain().focus().toggleStrike().run()}
          className="data-[state=on]:bg-indigo-100 data-[state=on]:text-indigo-700 line-through"
        >
          <Strikethrough className="h-4 w-4" />
        </Toggle>
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <Toggle
          size="sm"
          pressed={editor.isActive('bulletList')}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          className="data-[state=on]:bg-indigo-100 data-[state=on]:text-indigo-700"
        >
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('orderedList')}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          className="data-[state=on]:bg-indigo-100 data-[state=on]:text-indigo-700"
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('blockquote')}
          onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
          className="data-[state=on]:bg-indigo-100 data-[state=on]:text-indigo-700"
        >
          <Quote className="h-4 w-4" />
        </Toggle>
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800 hover:bg-slate-200 disabled:opacity-50"
          onClick={(e) => { e.preventDefault(); editor.chain().focus().undo().run() }}
          disabled={!editor.can().undo()}
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800 hover:bg-slate-200 disabled:opacity-50"
          onClick={(e) => { e.preventDefault(); editor.chain().focus().redo().run() }}
          disabled={!editor.can().redo()}
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      <EditorContent 
        editor={editor} 
        className="flex-1 overflow-y-auto max-h-[400px] cursor-text" 
        onClick={() => editor.commands.focus()}
      />
    </div>
  )
}
