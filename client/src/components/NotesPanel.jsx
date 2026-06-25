import { useState, useEffect, useRef } from 'react'
import { NotebookPen, Users, Lock } from 'lucide-react'
import { getNotes, setNotes } from '../lib/storage'

export default function NotesPanel({ code, board, boardWriters, participants, moderatorId, myName, isModerator, onBoard, onGrant }) {
  const [tab, setTab] = useState('board')
  const canWrite = isModerator || (boardWriters || []).includes((myName || '').toLowerCase())

  return (
    <aside className="w-64 bg-canvas border-l border-hairline p-4 shrink-0 hidden lg:flex flex-col">
      <div className="flex bg-surface-strong rounded-pill p-1 mb-3">
        <Tab active={tab === 'board'} onClick={() => setTab('board')}>Доска</Tab>
        <Tab active={tab === 'personal'} onClick={() => setTab('personal')}>Личные</Tab>
      </div>

      {tab === 'board' ? (
        <BoardTab
          board={board}
          canWrite={canWrite}
          isModerator={isModerator}
          participants={participants}
          moderatorId={moderatorId}
          boardWriters={boardWriters || []}
          onBoard={onBoard}
          onGrant={onGrant}
        />
      ) : (
        <PersonalTab code={code} />
      )}
    </aside>
  )
}

function BoardTab({ board, canWrite, isModerator, participants, moderatorId, boardWriters, onBoard, onGrant }) {
  const [text, setText] = useState(board || '')
  const focused = useRef(false)
  const saveRef = useRef(null)

  useEffect(() => {
    if (!focused.current) setText(board || '')
  }, [board])

  function onChange(e) {
    const v = e.target.value
    setText(v)
    clearTimeout(saveRef.current)
    saveRef.current = setTimeout(() => onBoard(v), 300)
  }

  const others = Object.entries(participants || {}).filter(([id]) => id !== moderatorId)

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Users size={14} /> Общая доска
      </h3>
      <textarea
        value={text}
        onChange={onChange}
        onFocus={() => (focused.current = true)}
        onBlur={() => (focused.current = false)}
        readOnly={!canWrite}
        placeholder={canWrite ? 'Заметки видны всем участникам сессии.' : 'Только чтение. Доступ выдаёт модератор.'}
        className={`flex-1 w-full resize-none border border-hairline rounded-lg p-3 text-sm outline-none transition-colors
                    ${canWrite ? 'bg-surface-soft text-ink focus:border-ink' : 'bg-surface-card text-muted cursor-default'}`}
      />
      {!canWrite && (
        <p className="text-[11px] text-muted-soft mt-2 flex items-center gap-1">
          <Lock size={11} /> Писать может модератор.
        </p>
      )}

      {isModerator && others.length > 0 && (
        <div className="mt-3 border-t border-hairline pt-3">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">Доступ к доске</p>
          <ul className="space-y-1.5 max-h-32 overflow-y-auto">
            {others.map(([id, p]) => {
              const allowed = boardWriters.includes(p.name.toLowerCase())
              return (
                <li key={id} className="flex items-center justify-between text-sm">
                  <span className="text-body truncate">{p.name}</span>
                  <input
                    type="checkbox"
                    checked={allowed}
                    onChange={(e) => onGrant(p.name, e.target.checked)}
                    className="accent-primary w-4 h-4 cursor-pointer shrink-0"
                    title="Разрешить писать на доску"
                  />
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

function PersonalTab({ code }) {
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
    <div className="flex-1 flex flex-col min-h-0">
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
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
    </div>
  )
}

function Tab({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-1.5 rounded-pill text-xs font-semibold transition-all ${
        active ? 'bg-canvas text-ink shadow-card ring-1 ring-black/5' : 'text-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}
