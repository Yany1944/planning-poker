import { useState } from 'react'
import { RotateCcw, ArrowRight, Pencil, X, Check } from 'lucide-react'
import Modal from './Modal'
import Avatar from './Avatar'

export default function TaskDetailModal({ task, index, total, isCurrent, isModerator, phase, onReopen, onEdit, onClose }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(task.name)
  const [tags, setTags] = useState(task.tags || [])
  const [tagDraft, setTagDraft] = useState('')
  const [score, setScore] = useState(task.finalScore ?? '')

  const votes = task.votes || []
  const nums = votes.map((v) => Number(v.vote)).filter((n) => !isNaN(n))
  const avg = nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : '-'
  const min = nums.length ? Math.min(...nums) : '-'
  const max = nums.length ? Math.max(...nums) : '-'
  const isDone = task.finalScore !== null
  const canReopen = isModerator && phase !== 'finished' && !isCurrent

  function startEdit() {
    setName(task.name)
    setTags(task.tags || [])
    setTagDraft('')
    setScore(task.finalScore ?? '')
    setEditing(true)
  }
  function commitTagDraft(value) {
    if (/[\s,]/.test(value)) {
      const parts = value.split(/[\s,]+/)
      const draft = parts.pop() ?? ''
      setTags((t) => Array.from(new Set([...t, ...parts.filter(Boolean)])).slice(0, 6))
      setTagDraft(draft)
    } else {
      setTagDraft(value)
    }
  }
  function save() {
    const finalTags = tagDraft.trim()
      ? Array.from(new Set([...tags, tagDraft.trim()])).slice(0, 6)
      : tags
    onEdit(index, { name: name.trim() || task.name, tags: finalTags, finalScore: score.trim() })
    setEditing(false)
  }

  return (
    <Modal title={`Задача ${index + 1} из ${total}`} onClose={onClose}>
      {editing ? (
        <div className="space-y-4">
          <Field label="Название">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={inputCls} autoFocus />
          </Field>

          <Field label="Теги">
            <div className="flex flex-wrap items-center gap-1.5 border border-hairline rounded-md px-2.5 py-2">
              {tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 text-xs bg-surface-card text-muted px-2 py-0.5 rounded-pill">
                  {tag}
                  <button type="button" onClick={() => setTags((t) => t.filter((x) => x !== tag))} className="hover:text-error">
                    <X size={11} />
                  </button>
                </span>
              ))}
              <input
                value={tagDraft}
                onChange={(e) => commitTagDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (tagDraft.trim()) { setTags((t) => Array.from(new Set([...t, tagDraft.trim()])).slice(0, 6)); setTagDraft('') } } }}
                placeholder="+ тег"
                maxLength={20}
                className="flex-1 min-w-[60px] bg-transparent outline-none text-xs text-ink placeholder-muted-soft"
              />
            </div>
          </Field>

          <Field label="Итоговая оценка (пусто = не оценено)">
            <input value={score} onChange={(e) => setScore(e.target.value)} placeholder="-" className={`${inputCls} w-28`} />
          </Field>

          <div className="flex gap-2 pt-1">
            <button onClick={save} className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 bg-primary hover:bg-primary-active text-white font-semibold rounded-md transition-colors text-sm">
              <Check size={16} /> Сохранить
            </button>
            <button onClick={() => setEditing(false)} className="px-4 h-10 border border-hairline bg-canvas hover:bg-surface-card text-ink rounded-md transition-colors text-sm">
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="display text-xl">{task.name}</h3>
            {isModerator && (
              <button onClick={startEdit} title="Редактировать задачу" className="shrink-0 inline-flex items-center gap-1 text-sm text-muted hover:text-ink transition-colors">
                <Pencil size={15} /> Изменить
              </button>
            )}
          </div>

          {task.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {task.tags.map((tag) => (
                <span key={tag} className="text-xs bg-surface-card text-muted px-2 py-0.5 rounded-pill">{tag}</span>
              ))}
            </div>
          )}

          <div className="mb-4">
            {isCurrent ? (
              <Badge cls="bg-brand-accent/10 text-brand-accent">Сейчас обсуждается</Badge>
            ) : isDone ? (
              <Badge cls="bg-success/10 text-success">
                Оценено: {task.finalScore}
                {task.rounds > 1 && ` · ${task.rounds} раунд(ов)`}
              </Badge>
            ) : (
              <Badge cls="bg-surface-card text-muted">Ещё не оценивалась</Badge>
            )}
          </div>

          {votes.length > 0 ? (
            <div className="border border-hairline rounded-lg p-4 mb-4">
              <div className="flex justify-center gap-8 text-sm mb-4">
                <Stat label="мин" value={min} />
                <Stat label="среднее" value={avg} />
                <Stat label="макс" value={max} />
              </div>
              <ul className="space-y-2">
                {votes.map((v, i) => {
                  const special = v.vote === '?' || v.vote === 'пас'
                  return (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-body">
                        <Avatar name={v.name} size={26} /> {v.name}
                      </span>
                      <span className={`font-bold tabular-nums ${special ? 'text-muted-soft' : 'text-ink'}`}>{v.vote}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-soft mb-4">Голосов по этой задаче пока нет.</p>
          )}

          {canReopen && (
            <button
              onClick={() => onReopen(index)}
              className="w-full inline-flex items-center justify-center gap-1.5 h-10 bg-primary
                         hover:bg-primary-active text-white font-semibold rounded-md transition-colors text-sm"
            >
              {isDone ? (
                <><RotateCcw size={15} /> Переголосовать эту задачу</>
              ) : (
                <><ArrowRight size={15} /> Перейти к задаче</>
              )}
            </button>
          )}
        </>
      )}
    </Modal>
  )
}

const inputCls =
  'w-full bg-canvas border border-hairline rounded-md px-3 py-2 text-ink placeholder-muted-soft outline-none focus:border-ink transition-colors text-sm'

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted mb-1.5">{label}</span>
      {children}
    </label>
  )
}

function Badge({ cls, children }) {
  return <span className={`inline-block px-3 py-1 rounded-pill text-xs font-semibold ${cls}`}>{children}</span>
}

function Stat({ label, value }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold text-ink tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  )
}
