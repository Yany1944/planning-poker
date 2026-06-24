import { useRef, useState } from 'react'
import { Plus, X, GripVertical } from 'lucide-react'

export default function TaskEditor({ tasks, setTasks }) {
  const dragIndex = useRef(null)
  const [overIndex, setOverIndex] = useState(null)
  const [armed, setArmed] = useState(null)

  function move(from, to) {
    if (from == null || to == null || from === to) return
    setTasks((list) => {
      const next = [...list]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  function update(i, patch) {
    setTasks((list) => list.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))
  }
  function addTask() {
    setTasks((list) => [...list, { name: '', tags: [], tagDraft: '' }])
  }
  function removeTask(i) {
    setTasks((list) => (list.length > 1 ? list.filter((_, idx) => idx !== i) : list))
  }
  function addTag(i) {
    const draft = tasks[i].tagDraft.trim()
    if (!draft) return
    const tags = Array.from(new Set([...tasks[i].tags, draft])).slice(0, 6)
    update(i, { tags, tagDraft: '' })
  }
  function handleTagInput(i, value) {
    if (/[\s,]/.test(value)) {
      const parts = value.split(/[\s,]+/)
      const draft = parts.pop() ?? ''
      const toAdd = parts.filter(Boolean)
      const tags = Array.from(new Set([...tasks[i].tags, ...toAdd])).slice(0, 6)
      update(i, { tags, tagDraft: draft })
    } else {
      update(i, { tagDraft: value })
    }
  }
  function removeTag(i, tag) {
    update(i, { tags: tasks[i].tags.filter((t) => t !== tag) })
  }

  return (
    <div className="space-y-2.5">
      {tasks.map((t, i) => (
        <div
          key={i}
          draggable={armed === i}
          onDragStart={() => { dragIndex.current = i }}
          onDragEnd={() => { dragIndex.current = null; setOverIndex(null); setArmed(null) }}
          onDragOver={(e) => { e.preventDefault(); setOverIndex(i) }}
          onDrop={() => { move(dragIndex.current, i); dragIndex.current = null; setOverIndex(null); setArmed(null) }}
          className={`bg-canvas border rounded-lg p-2.5 transition-colors ${
            overIndex === i ? 'border-ink' : 'border-hairline'
          } ${armed === i ? 'cursor-grabbing' : ''}`}
        >
          <div className="flex items-center gap-2">
            <span
              onMouseDown={() => setArmed(i)}
              onMouseUp={() => setArmed(null)}
              title="Перетащите, чтобы изменить порядок"
              className="cursor-grab active:cursor-grabbing text-muted-soft hover:text-muted shrink-0"
            >
              <GripVertical size={15} />
            </span>
            <input
              value={t.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder={`Задача ${i + 1}`}
              maxLength={120}
              className="flex-1 bg-transparent outline-none text-ink placeholder-muted-soft text-sm"
            />
            <button
              type="button"
              onClick={() => removeTask(i)}
              title="Удалить задачу"
              className="text-muted-soft hover:text-error transition-colors disabled:opacity-30"
              disabled={tasks.length === 1}
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-2 pl-6">
            {t.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-xs bg-surface-card text-muted px-2 py-0.5 rounded-pill"
              >
                {tag}
                <button type="button" onClick={() => removeTag(i, tag)} className="hover:text-error">
                  <X size={11} />
                </button>
              </span>
            ))}
            <input
              value={t.tagDraft}
              onChange={(e) => handleTagInput(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag(i)
                }
              }}
              onBlur={() => addTag(i)}
              placeholder="+ тег"
              maxLength={20}
              className="w-16 bg-transparent outline-none text-xs text-ink placeholder-muted-soft"
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addTask}
        className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-muted
                   hover:text-ink border border-dashed border-hairline-strong rounded-lg py-2 transition-colors"
      >
        <Plus size={16} /> Добавить задачу
      </button>
    </div>
  )
}
