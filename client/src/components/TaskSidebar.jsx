import { useRef, useState } from 'react'
import { Check, GripVertical } from 'lucide-react'

export default function TaskSidebar({ tasks, currentIndex, isModerator, onReorder, onOpenDetail }) {
  const dragIndex = useRef(null)
  const [overIndex, setOverIndex] = useState(null)

  function move(from, to) {
    if (from == null || to == null || from === to) return
    const ids = tasks.map((t) => t.id)
    const [moved] = ids.splice(from, 1)
    ids.splice(to, 0, moved)
    onReorder(ids)
  }

  return (
    <aside className="w-64 bg-canvas border-r border-hairline p-4 overflow-y-auto shrink-0 hidden md:block">
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
        Задачи · {tasks.filter((t) => t.finalScore !== null).length}/{tasks.length}
      </h3>
      <ol className="space-y-2">
        {tasks.map((task, i) => {
          const isCurrent = i === currentIndex
          const isDone = task.finalScore !== null
          return (
            <li
              key={task.id}
              draggable={isModerator}
              onDragStart={() => { dragIndex.current = i }}
              onDragEnd={() => { dragIndex.current = null; setOverIndex(null) }}
              onDragOver={(e) => { if (isModerator) { e.preventDefault(); setOverIndex(i) } }}
              onDrop={() => { move(dragIndex.current, i); dragIndex.current = null; setOverIndex(null) }}
              onClick={() => onOpenDetail(i)}
              className={`rounded-lg border p-2.5 cursor-pointer transition-colors hover:border-ink ${
                overIndex === i ? 'border-ink' : isCurrent ? 'border-ink bg-surface-soft' : 'border-hairline'
              }`}
            >
              <div className="flex items-center gap-2">
                {isModerator && (
                  <GripVertical size={14} className="text-muted-soft shrink-0 cursor-grab active:cursor-grabbing" />
                )}
                <span
                  className={`shrink-0 w-5 h-5 rounded-pill flex items-center justify-center text-[11px] font-semibold ${
                    isDone
                      ? 'bg-success/15 text-success'
                      : isCurrent
                      ? 'bg-primary text-white'
                      : 'bg-surface-card text-muted-soft'
                  }`}
                >
                  {isDone ? <Check size={12} strokeWidth={3} /> : i + 1}
                </span>
                <p className="flex-1 min-w-0 text-sm text-ink break-words leading-snug">{task.name}</p>
              </div>

              {(task.tags?.length > 0 || isDone) && (
                <div className="mt-1.5 pl-7 space-y-1">
                  {task.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {task.tags.map((tag) => (
                        <span key={tag} className="text-[11px] bg-surface-card text-muted px-1.5 py-0.5 rounded-pill">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {isDone && (
                    <div className="text-xs text-success tabular-nums">
                      оценка: {task.finalScore}
                      {task.rounds > 1 && <span className="text-muted-soft"> · {task.rounds} р.</span>}
                    </div>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ol>
      {isModerator && (
        <p className="text-[11px] text-muted-soft mt-3">Перетащите задачу, чтобы изменить порядок. Клик - детали.</p>
      )}
    </aside>
  )
}
