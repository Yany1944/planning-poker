import { useState, useEffect, useRef } from 'react'
import { NotebookPen } from 'lucide-react'
import { getNotes, setNotes } from '../lib/storage'

export default function NotesPanel({ code }) {
  const [text, setText] = useState('')
  const saveRef = useRef(null)

  useEffect(() => {
    setText(getNotes(code))
  }, [code])

  function onChange(e) {
    const v = e.target.value
    setText(v)
    clearTimeout(saveRef.current)
    saveRef.current = setTimeout(() => setNotes(code, v), 300)
  }

  return (
    <aside className="w-64 bg-canvas border-l border-hairline p-4 shrink-0 hidden lg:flex flex-col">
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <NotebookPen size={14} /> Мои заметки
      </h3>
      <textarea
        value={text}
        onChange={onChange}
        placeholder="Заметки по задачам, аргументы, ссылки… Видны только вам."
        className="flex-1 w-full resize-none bg-surface-soft border border-hairline rounded-lg
                   p-3 text-sm text-ink placeholder-muted-soft outline-none focus:border-ink transition-colors"
      />
      <p className="text-[11px] text-muted-soft mt-2">Сохраняются в этой сессии.</p>
    </aside>
  )
}
