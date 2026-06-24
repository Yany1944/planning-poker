import { Download, FileJson, Flag, Home, RotateCcw, MessageSquare } from 'lucide-react'
import Modal from './Modal'

export default function ResultsModal({ session, isModerator, onEnd, onExit, onReopen, onClose }) {
  const { tasks, id, phase, finishedAt } = session
  const isFinished = phase === 'finished'

  const totalNum = tasks
    .map((t) => Number(t.finalScore))
    .filter((n) => !isNaN(n))
    .reduce((a, b) => a + b, 0)

  function download(filename, content, type) {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
  function fileBase() {
    const d = new Date(finishedAt || Date.now())
    return `poker_${id}_${d.toISOString().slice(0, 10)}`
  }
  function csvCell(v) {
    const s = String(v ?? '')
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  function exportCSV() {
    const rows = [['#', 'Задача', 'Теги', 'Оценка']]
    tasks.forEach((t, i) => rows.push([i + 1, t.name, (t.tags || []).join(' '), t.finalScore ?? '']))
    download(`${fileBase()}.csv`, '﻿' + rows.map((r) => r.map(csvCell).join(';')).join('\r\n'), 'text/csv;charset=utf-8')
  }
  function exportJSON() {
    const data = {
      sessionId: id,
      exportedAt: new Date().toISOString(),
      tasks: tasks.map((t, i) => ({ index: i + 1, name: t.name, tags: t.tags || [], score: t.finalScore, rounds: t.rounds || 1 })),
    }
    download(`${fileBase()}.json`, JSON.stringify(data, null, 2), 'application/json')
  }

  return (
    <Modal
      title={isFinished ? 'Сессия завершена' : 'Все задачи оценены'}
      onClose={isFinished ? onExit : onClose}
      maxWidth="max-w-xl"
    >
      <p className="text-sm text-muted mb-4">
        Сессия <span className="font-semibold text-ink tabular-nums">{id}</span> · оценено задач: {tasks.length}
      </p>

      <div className="border border-hairline rounded-lg overflow-hidden mb-5">
        <table className="w-full text-sm">
          <tbody>
            {tasks.map((t, i) => (
              <tr key={t.id} className="border-b border-hairline-soft last:border-0">
                <td className="px-3 py-2.5 text-muted-soft w-8 align-top">{i + 1}</td>
                <td className="px-3 py-2.5 text-body">
                  {t.name}
                  {t.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {t.tags.map((tag) => (
                        <span key={tag} className="text-[11px] bg-surface-card text-muted px-1.5 py-0.5 rounded-pill">{tag}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right font-bold text-ink tabular-nums w-14 align-top">
                  {t.finalScore ?? '-'}
                </td>
                {!isFinished && isModerator && (
                  <td className="px-2 py-2.5 w-8 align-top">
                    <button
                      onClick={() => onReopen(i)}
                      title="Переголосовать"
                      className="text-muted-soft hover:text-ink transition-colors"
                    >
                      <RotateCcw size={15} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            <tr className="bg-surface-soft">
              <td className="px-3 py-2.5" />
              <td className="px-3 py-2.5 text-muted font-medium">Сумма числовых оценок</td>
              <td className="px-3 py-2.5 text-right font-bold text-ink tabular-nums">{totalNum}</td>
              {!isFinished && isModerator && <td />}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <button onClick={exportCSV} className={btnSecondary}><Download size={16} /> CSV</button>
        <button onClick={exportJSON} className={btnSecondary}><FileJson size={16} /> JSON</button>
        <div className="flex-1" />
        {isFinished ? (
          <button onClick={onExit} className={btnPrimary}><Home size={16} /> На главную</button>
        ) : (
          <>
            <button onClick={onClose} className={btnSecondary}><MessageSquare size={16} /> Вернуться к обсуждению</button>
            {isModerator && (
              <button onClick={onEnd} className={btnPrimary}><Flag size={16} /> Завершить сессию</button>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

const btnSecondary =
  'inline-flex items-center gap-1.5 px-4 h-10 border border-hairline bg-canvas hover:bg-surface-card text-ink font-medium rounded-md transition-colors text-sm'
const btnPrimary =
  'inline-flex items-center gap-1.5 px-4 h-10 bg-primary hover:bg-primary-active text-white font-semibold rounded-md transition-colors text-sm'
