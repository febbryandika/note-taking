import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Heading1, Heading2, Italic, List } from 'lucide-react'
import { cn } from '@/lib/utils'

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] }

function parseInitial(bodyJson: string, fallbackText: string) {
  if (bodyJson && bodyJson !== '{}') {
    try {
      const parsed = JSON.parse(bodyJson)
      if (parsed && typeof parsed === 'object' && parsed.type === 'doc') return parsed
    } catch {
      // fall through to plaintext
    }
  }
  if (fallbackText) {
    return {
      type: 'doc',
      content: fallbackText.split('\n').map((line) => ({
        type: 'paragraph',
        content: line ? [{ type: 'text', text: line }] : [],
      })),
    }
  }
  return EMPTY_DOC
}

type Props = {
  bodyJson: string
  bodyText: string
  editable: boolean
  onChange?: (next: { bodyJson: string; bodyText: string }) => void
  placeholder?: string
}

export function TipTapEditor({ bodyJson, bodyText, editable, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Keep the doc model aligned with the toolbar — disable nodes/marks
        // users have no way to insert.
        orderedList: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        strike: false,
        code: false,
      }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
    ],
    content: parseInitial(bodyJson, bodyText),
    editable,
    onUpdate: ({ editor: ed }) => {
      onChange?.({
        bodyJson: JSON.stringify(ed.getJSON()),
        bodyText: ed.getText(),
      })
    },
    editorProps: {
      attributes: {
        class: cn(
          'tiptap min-h-[16rem] rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring',
          !editable && 'border-transparent bg-transparent px-0 focus:ring-0',
        ),
      },
    },
  })

  if (!editor) return null

  return (
    <div className="space-y-2">
      {editable && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const btn = (active: boolean, disabled: boolean) =>
    cn(
      'inline-flex h-7 w-7 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent',
      active && 'bg-muted text-foreground',
      disabled && 'cursor-not-allowed',
    )

  return (
    <div className="flex items-center gap-1" role="toolbar" aria-label="Text formatting">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={btn(editor.isActive('bold'), !editor.can().chain().focus().toggleBold().run())}
        aria-label="Bold"
        aria-pressed={editor.isActive('bold')}
        title="Bold (⌘B)"
      >
        <Bold className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={btn(editor.isActive('italic'), !editor.can().chain().focus().toggleItalic().run())}
        aria-label="Italic"
        aria-pressed={editor.isActive('italic')}
        title="Italic (⌘I)"
      >
        <Italic className="h-3.5 w-3.5" />
      </button>
      <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={btn(editor.isActive('heading', { level: 1 }), false)}
        aria-label="Heading 1"
        aria-pressed={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
      >
        <Heading1 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={btn(editor.isActive('heading', { level: 2 }), false)}
        aria-label="Heading 2"
        aria-pressed={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className="h-3.5 w-3.5" />
      </button>
      <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btn(editor.isActive('bulletList'), false)}
        aria-label="Bullet list"
        aria-pressed={editor.isActive('bulletList')}
        title="Bullet list"
      >
        <List className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
