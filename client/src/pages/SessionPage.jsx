import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Crown, Copy, Check, Flag, Eye, RotateCcw, ClipboardList, UserPlus, UserMinus, Timer, AlarmClock } from 'lucide-react'
import socket from '../socket'
import { forgetSession } from '../lib/storage'
import Toasts from '../components/Toasts'
import CardDeck from '../components/CardDeck'
import TaskSidebar from '../components/TaskSidebar'
import VoteResults from '../components/VoteResults'
import RoundTimer from '../components/RoundTimer'
import TimerControl from '../components/TimerControl'
import VotingTable from '../components/VotingTable'
import NotesPanel from '../components/NotesPanel'
import TaskDetailModal from '../components/TaskDetailModal'
import ResultsModal from '../components/ResultsModal'

export default function SessionPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()

  const [session, setSession] = useState(null)
  const [mySocketId, setMySocketId] = useState(() => socket.id || null)
  const [selectedCard, setSelectedCard] = useState(null)
  const [finalScore, setFinalScore] = useState('')
  const [duration, setDuration] = useState(60)
  const [clockOffset, setClockOffset] = useState(0)
  const [copied, setCopied] = useState(false)
  const [detailIndex, setDetailIndex] = useState(null)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const prevPhase = useRef(null)
  const prevSnap = useRef(null)
  const toastId = useRef(0)

  const pushToast = useCallback((text, icon) => {
    const id = ++toastId.current
    setToasts((list) => [...list, { id, text, icon, leaving: false }])
    setTimeout(() => setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t))), 3700)
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4000)
  }, [])

  useEffect(() => {
    if (!socket.connected) {
      navigate('/')
      return
    }
    setMySocketId(socket.id)

    function onUpdate(data) {
      setSession(data)
      if (typeof data.serverNow === 'number') setClockOffset(data.serverNow - Date.now())

      const myName = data.participants[socket.id]?.name
      const curNames = Object.values(data.participants).map((p) => p.name)
      const curVoted = Object.values(data.participants).filter((p) => p.hasVoted).map((p) => p.name)
      const prev = prevSnap.current
      if (prev) {
        curNames.forEach((n) => {
          if (!prev.names.includes(n) && n !== myName)
            pushToast(`${n} присоединяется к сессии`, <UserPlus size={20} className="text-success" />)
        })
        prev.names.forEach((n) => {
          if (!curNames.includes(n) && n !== myName)
            pushToast(`${n} покидает сессию`, <UserMinus size={20} className="text-muted" />)
        })
        if (data.phase === 'voting') {
          curVoted.forEach((n) => {
            if (!prev.voted.includes(n) && n !== myName)
              pushToast(`${n} голосует`, <Check size={20} className="text-brand-accent" />)
          })
        }
      }
      prevSnap.current = { names: curNames, voted: data.phase === 'voting' ? curVoted : [] }

      if (data.phase !== prevPhase.current) {
        if (data.phase === 'voting') {
          setSelectedCard(null)
          if (data.roundDuration) pushToast(`На вопрос выделено ${minutesWord(data.roundDuration / 60)}`, <Timer size={20} className="text-ink" />)
        }
        if (data.phase === 'voting' || data.phase === 'waiting') setFinalScore('')
        if (data.phase === 'results' || data.phase === 'finished') setSummaryOpen(true)
        prevPhase.current = data.phase
      }
      if (data.phase === 'finished') forgetSession(data.id)
    }
    function onError(msg) {
      alert(msg)
      navigate('/')
    }
    socket.on('session_updated', onUpdate)
    socket.on('app_error', onError)
    socket.on('disconnect', () => navigate('/'))

    socket.emit('sync', { sessionId })

    return () => {
      socket.off('session_updated', onUpdate)
      socket.off('app_error', onError)
      socket.off('disconnect')
    }
  }, [navigate, sessionId, pushToast])

  useEffect(() => {
    if (session?.phase !== 'voting' || !session.roundEndsAt) return
    const dur = session.roundDuration || 0
    const endLocal = session.roundEndsAt - clockOffset
    const timers = []
    const at = (msBefore, fn) => {
      const delay = endLocal - msBefore - Date.now()
      if (delay > 0) timers.push(setTimeout(fn, delay))
    }
    if (dur > 60) at(60000, () => pushToast('Осталась 1 минута', <AlarmClock size={17} className="text-warning" />))
    if (dur > 30) at(30000, () => pushToast('Осталось 30 секунд', <AlarmClock size={17} className="text-error" />))
    return () => timers.forEach(clearTimeout)
  }, [session?.phase, session?.roundEndsAt, session?.roundDuration, clockOffset, pushToast])

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted animate-pulse">Подключение…</div>
      </div>
    )
  }

  const isModerator = mySocketId === session.moderatorId
  const currentTask = session.tasks[session.currentTaskIndex]
  const myParticipant = session.participants[mySocketId]
  const participantCount = Object.keys(session.participants).length
  const votedCount = Object.values(session.participants).filter((p) => p.hasVoted).length
  const phase = session.phase
  const isOver = phase === 'results' || phase === 'finished'
  const tableRevealed = phase === 'revealed' || isOver

  function suggestScore() {
    const nums = Object.values(session.participants)
      .map((p) => p.vote)
      .filter((v) => v && !isNaN(Number(v)))
      .map(Number)
    if (nums.length === 0) return ''
    const tally = {}
    let best = 0
    nums.forEach((n) => { tally[n] = (tally[n] || 0) + 1; if (tally[n] > best) best = tally[n] })
    const modes = Object.keys(tally).filter((k) => tally[k] === best).map(Number)
    if (modes.length === 1) return String(modes[0])
    return String(Math.round(nums.reduce((a, b) => a + b, 0) / nums.length))
  }

  function copyId() {
    navigator.clipboard.writeText(sessionId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  function handleVote(value) {
    if (phase !== 'voting') return
    setSelectedCard(value)
    socket.emit('vote', { sessionId, value })
  }
  function handleFinalize() {
    socket.emit('finalize_score', { sessionId, score: finalScore.trim() || suggestScore() })
    setFinalScore('')
    setSelectedCard(null)
  }
  function endSession() {
    if (confirm('Завершить сессию? Её результаты сохранятся, но продолжить будет нельзя.')) {
      socket.emit('end_session', { sessionId })
    }
  }
  const reorder = (order) => socket.emit('reorder_tasks', { sessionId, order })
  function reopen(taskIndex) {
    socket.emit('reopen_task', { sessionId, taskIndex })
    setDetailIndex(null)
    setSummaryOpen(false)
  }
  function goHome() {
    socket.disconnect()
    navigate('/')
  }
  const editTask = (taskIndex, patch) => socket.emit('edit_task', { sessionId, taskIndex, ...patch })

  let center
  if (phase === 'waiting') {
    center = isModerator ? (
      <div className="flex flex-col items-center gap-4 w-full">
        <p className="text-sm text-muted">Обсудите задачу - затем начните раунд.</p>
        <TimerControl value={duration} onChange={setDuration} />
        <button
          onClick={() => socket.emit('start_voting', { sessionId, duration })}
          className="px-8 h-11 bg-primary hover:bg-primary-active text-white font-semibold rounded-md transition-colors"
        >
          Начать голосование
        </button>
      </div>
    ) : (
      <p className="text-sm text-muted">Модератор обсуждает задачу и скоро начнёт раунд…</p>
    )
  } else if (phase === 'voting') {
    center = (
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm font-medium text-ink">Голосование идёт</p>
        <p className="text-xs text-muted">{votedCount}/{participantCount} проголосовали</p>
        {isModerator && (
          <button
            onClick={() => socket.emit('reveal_votes', { sessionId })}
            className="inline-flex items-center gap-1.5 px-5 h-9 border border-hairline bg-canvas
                       hover:bg-surface-card text-ink font-semibold rounded-md transition-colors text-sm"
          >
            <Eye size={16} /> Вскрыть карты
          </button>
        )}
      </div>
    )
  } else if (phase === 'revealed') {
    center = <VoteResults participants={session.participants} />
  } else if (isOver) {
    center = (
      <div className="flex flex-col items-center gap-3">
        <p className="font-medium text-ink">{phase === 'finished' ? 'Сессия завершена' : 'Все задачи оценены'}</p>
        <button
          onClick={() => setSummaryOpen(true)}
          className="inline-flex items-center gap-1.5 px-5 h-9 border border-hairline bg-canvas
                     hover:bg-surface-card text-ink font-semibold rounded-md transition-colors text-sm"
        >
          <ClipboardList size={16} /> Показать сводку
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <header className="h-16 bg-canvas border-b border-hairline px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/logo.png" alt="HTTP 418" className="w-7 h-7 object-contain shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted uppercase tracking-wider">Код</span>
              <button
                onClick={copyId}
                title="Скопировать код"
                className="inline-flex items-center gap-1 font-bold text-ink tabular-nums hover:text-primary-active transition-colors"
              >
                {sessionId}
                {copied ? <Check size={13} className="text-success" /> : <Copy size={13} className="text-muted-soft" />}
              </button>
            </div>
            <div className="text-xs text-muted truncate flex items-center gap-1">
              {isModerator ? (
                <><Crown size={12} className="text-amber-500" /> Вы модератор</>
              ) : (
                <>Модератор: {session.moderatorName ?? '-'}</>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {session.round > 1 && (
            <span className="text-xs font-medium text-warning" title="Номер раунда по задаче">
              раунд {session.round}
            </span>
          )}
          {phase === 'voting' && session.roundEndsAt && (
            <RoundTimer endsAt={session.roundEndsAt} offset={clockOffset} />
          )}
          <PhaseBadge phase={phase} />
          {isModerator && !isOver && (
            <button
              onClick={endSession}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-error
                         border border-hairline rounded-md px-2.5 py-1.5 transition-colors"
            >
              <Flag size={13} /> Завершить
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <TaskSidebar
          tasks={session.tasks}
          currentIndex={session.currentTaskIndex}
          isModerator={isModerator}
          onReorder={reorder}
          onOpenDetail={setDetailIndex}
        />

        <main className="flex-1 flex flex-col items-center p-6 overflow-y-auto bg-surface-soft">
          <div className="w-full max-w-2xl flex flex-col items-center">
            <div className="text-center mb-6">
              <p className="text-muted text-sm mb-1">
                Задача {session.currentTaskIndex + 1} из {session.tasks.length}
                {!isOver && currentTask?.finalScore !== null && (
                  <span className="ml-2 inline-flex items-center gap-1 text-warning">
                    <RotateCcw size={12} /> переоценка (было {currentTask.finalScore})
                  </span>
                )}
              </p>
              <h2 className="display text-2xl md:text-3xl">{currentTask?.name}</h2>
              {currentTask?.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                  {currentTask.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-canvas border border-hairline text-muted px-2 py-0.5 rounded-pill">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <VotingTable participants={session.participants} revealed={tableRevealed} center={center} />

            {phase === 'voting' && (
              <div className="mt-8 w-full">
                {myParticipant?.hasVoted ? (
                  <p className="text-center text-sm text-success font-medium mb-4 flex items-center justify-center gap-1.5">
                    <Check size={16} /> Ваша оценка: <strong>{selectedCard ?? '✓'}</strong> - можно поменять
                  </p>
                ) : (
                  <p className="text-center text-sm text-muted mb-4">Выберите карту</p>
                )}
                <CardDeck selected={selectedCard} onSelect={handleVote} />
              </div>
            )}

            {phase === 'revealed' && isModerator && (
              <div className="mt-8 flex flex-col items-center gap-3">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={finalScore}
                    onChange={(e) => setFinalScore(e.target.value)}
                    placeholder={`Итог: ${suggestScore() || '-'}`}
                    className="w-32 text-center bg-canvas border border-hairline rounded-md px-3 h-10
                               text-ink placeholder-muted-soft outline-none focus:border-ink transition-colors"
                  />
                  <button
                    onClick={handleFinalize}
                    className="px-6 h-10 bg-primary hover:bg-primary-active text-white font-semibold rounded-md transition-colors"
                  >
                    {session.tasks.some((t, i) => t.finalScore === null && i !== session.currentTaskIndex)
                      ? 'Принять → Далее'
                      : 'Принять → Результаты'}
                  </button>
                </div>
                <button
                  onClick={() => socket.emit('revote', { sessionId })}
                  className="inline-flex items-center gap-1.5 px-6 h-10 border border-hairline bg-canvas
                             hover:bg-surface-card text-body rounded-md transition-colors text-sm"
                >
                  <RotateCcw size={15} /> Переголосовать
                </button>
              </div>
            )}

            {phase === 'revealed' && !isModerator && (
              <p className="text-center text-muted-soft text-sm mt-8">Ожидайте решения модератора…</p>
            )}
          </div>
        </main>

        <NotesPanel code={sessionId} />
      </div>

      {detailIndex != null && session.tasks[detailIndex] && (
        <TaskDetailModal
          task={session.tasks[detailIndex]}
          index={detailIndex}
          total={session.tasks.length}
          isCurrent={detailIndex === session.currentTaskIndex && !isOver}
          isModerator={isModerator}
          phase={phase}
          onReopen={reopen}
          onEdit={editTask}
          onClose={() => setDetailIndex(null)}
        />
      )}

      {isOver && summaryOpen && (
        <ResultsModal
          session={session}
          isModerator={isModerator}
          onEnd={endSession}
          onExit={goHome}
          onReopen={reopen}
          onClose={() => setSummaryOpen(false)}
        />
      )}

      <Toasts toasts={toasts} />
    </div>
  )
}

function minutesWord(m) {
  const n = Math.round(m)
  const mod10 = n % 10
  const mod100 = n % 100
  let word = 'минут'
  if (mod10 === 1 && mod100 !== 11) word = 'минута'
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) word = 'минуты'
  return `${n} ${word}`
}

function PhaseBadge({ phase }) {
  const map = {
    waiting:  { label: 'Ожидание',       cls: 'bg-surface-card text-muted' },
    voting:   { label: 'Голосование',    cls: 'bg-brand-accent/10 text-brand-accent' },
    revealed: { label: 'Оценки открыты', cls: 'bg-warning/10 text-warning' },
    results:  { label: 'Итоги',          cls: 'bg-success/10 text-success' },
    finished: { label: 'Завершено',      cls: 'bg-success/10 text-success' },
  }
  const b = map[phase] ?? map.waiting
  return <span className={`px-3 py-1 rounded-pill text-xs font-semibold ${b.cls}`}>{b.label}</span>
}
