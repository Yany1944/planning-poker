import { useState, useEffect, useRef } from 'react'
import { NotebookPen, Users, Lock } from 'lucide-react'
import { getNotes, setNotes } from '../lib/storage'
import Modal from './Modal'

export default function NotesPanel({ code, board, boardWriters, participants, moderatorId, myName, isModerator, onBoard, onGrant }) {
  const [tab, setTab] = useState('board')
  const [accessOpen, setAccessOpen] = useState(false)
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
          onBoard={onBoard}
          onOpenAccess={() => setAccessOpen(true)}
        />
      ) : (
        <PersonalTab code={code} />
      )}

      {accessOpen && (
        <AccessModal
          participants={participants}
          moderatorId={moderatorId}
          boardWriters={boardWriters || []}
          onGrant={onGrant}
          onClose={() => setAccessOpen(false)}
        />
      )}
    </aside>
  )
}

function BoardTab({ board, canWrite, isModerator, onBoard, onOpenAccess }) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Users size={14} /> Общая доска
      </h3>

      {canWrite ? (
        <BoardEditor board={board} onBoard={onBoard} />
      ) : (
        <textarea
          value={board || ''}
          readOnly
          placeholder="Здесь появятся заметки от модератора."
          className="flex-1 w-full resize-none border border-hairline rounded-lg p-3 text-sm
                     bg-surface-card text-muted outline-none cursor-default"
        />
      )}

      {!canWrite && (
        <p className="text-[11px] text-muted-soft mt-2 flex items-center gap-1">
          <Lock size={11} /> Писать может модератор.
        </p>
      )}

      {isModerator && (
        <button
          onClick={onOpenAccess}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 h-9 border border-hairline
                     bg-canvas hover:bg-surface-card text-ink font-medium rounded-md transition-colors text-sm"
        >
          <Users size={15} /> Доступ к доске
        </button>
      )}
    </div>
  )
}

function BoardEditor({ board, onBoard }) {
  const [text, setText] = useState(board || '')
  const focused = useRef(false)
  const saveRef = useRef(null)

  // Подхватываем чужие изменения, когда сами не печатаем.
  useEffect(() => {
    if (!focused.current) setText(board || '')
  }, [board])

  function flush(v) {
    clearTimeout(saveRef.current)
    onBoard(v)
  }

  return (
    <textarea
      value={text}
      onChange={(e) => {
        const v = e.target.value
        setText(v)
        clearTimeout(saveRef.current)
        saveRef.current = setTimeout(() => onBoard(v), 250)
      }}
      onFocus={() => (focused.current = true)}
      onBlur={(e) => { focused.current = false; flush(e.target.value) }}
      placeholder="Заметки видны всем участникам сессии."
      className="flex-1 w-full resize-none border border-hairline rounded-lg p-3 text-sm
                 bg-surface-soft text-ink placeholder-muted-soft outline-none focus:border-ink transition-colors"
    />
  )
}

function AccessModal({ participants, moderatorId, boardWriters, onGrant, onClose }) {
  const others = Object.entries(participants || {}).filter(([id]) => id !== moderatorId)
  return (
    <Modal title="Доступ к доске" onClose={onClose}>
      <p className="text-sm text-muted mb-4">
        Отметьте участников, которым разрешено писать на общей доске. Модератор пишет всегда.
      </p>
      {others.length === 0 ? (
        <p className="text-sm text-muted-soft">Других участников в сессии пока нет.</p>
      ) : (
        <ul className="space-y-1">
          {others.map(([id, p]) => {
            const allowed = boardWriters.includes(p.name.toLowerCase())
            return (
              <li key={id}>
                <label className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-md hover:bg-surface-card cursor-pointer">
                  <span className="text-sm text-body truncate">{p.name}</span>
                  <input
                    type="checkbox"
                    checked={allowed}
                    onChange={(e) => onGrant(p.name, e.target.checked)}
                    className="accent-primary w-4 h-4 cursor-pointer shrink-0"
                  />
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
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
