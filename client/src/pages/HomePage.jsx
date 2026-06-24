import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, X, Users, Crown } from 'lucide-react'
import socket from '../socket'
import { getMySessions, rememberSession, forgetSession } from '../lib/storage'
import TaskEditor from '../components/TaskEditor'

const TEAM = 'HTTP 418'

export default function HomePage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('join')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [tasks, setTasks] = useState([{ name: '', tags: [], tagDraft: '' }])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [mySessions, setMySessions] = useState([])
  const pending = useRef(null)

  useEffect(() => {
    const stored = getMySessions()
    if (stored.length === 0) return
    const codes = stored.map((s) => s.code).join(',')
    fetch(`/api/sessions/status?codes=${encodeURIComponent(codes)}`)
      .then((r) => r.json())
      .then((statuses) => {
        const byCode = Object.fromEntries(statuses.map((s) => [s.code, s]))
        setMySessions(
          stored
            .map((s) => ({ ...s, status: byCode[s.code] }))
            .filter((s) => s.status?.exists && !s.status.finished)
        )
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    function go({ sessionId }) {
      if (pending.current) rememberSession({ code: sessionId, ...pending.current })
      navigate(`/session/${sessionId}`)
    }
    function onError(msg) {
      setError(msg)
      setBusy(false)
    }
    socket.on('session_created', go)
    socket.on('joined_session', go)
    socket.on('app_error', onError)
    return () => {
      socket.off('session_created', go)
      socket.off('joined_session', go)
      socket.off('app_error', onError)
    }
  }, [navigate])

  const ensureConnected = () => { if (!socket.connected) socket.connect() }

  function handleJoin(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Введите имя')
    if (!code.trim()) return setError('Введите код сессии')
    pending.current = { name: name.trim(), role: 'participant' }
    setBusy(true)
    ensureConnected()
    socket.emit('join_session', { sessionId: code.trim().toUpperCase(), name: name.trim() })
  }

  function handleCreate(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Введите имя')
    const payload = tasks
      .map((t) => ({ name: t.name.trim(), tags: t.tags }))
      .filter((t) => t.name)
    if (payload.length === 0) return setError('Добавьте хотя бы одну задачу')
    pending.current = { name: name.trim(), role: 'moderator' }
    setBusy(true)
    ensureConnected()
    socket.emit('create_session', { tasks: payload, moderatorName: name.trim() })
  }

  function resume(s) {
    pending.current = { name: s.name, role: s.role }
    setBusy(true)
    ensureConnected()
    socket.emit('join_session', { sessionId: s.code, name: s.name })
  }

  function drop(codeToDrop) {
    forgetSession(codeToDrop)
    setMySessions((list) => list.filter((s) => s.code !== codeToDrop))
  }

  return (
    <div className="min-h-screen">
      <header className="h-16 bg-canvas border-b border-hairline flex items-center">
        <div className="max-w-content mx-auto w-full px-4 flex items-center gap-2">
          <img src="/logo.png" alt="HTTP 418" className="w-7 h-7 object-contain" />
          <span className="font-semibold text-ink tracking-tight">Покер планирования</span>
          <span className="text-muted-soft">·</span>
          <span className="text-sm text-muted">{TEAM}</span>
        </div>
      </header>

      <main className="max-w-content mx-auto px-4 py-12 md:py-16">
        <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-start">
          <div className="md:pt-6">
            <span className="inline-block bg-canvas border border-hairline text-ink text-[13px] font-medium px-3 py-1 rounded-pill mb-5">
              {TEAM} · Покер планирования
            </span>
            <h1 className="display text-4xl md:text-5xl leading-[1.1]">
              Командная оценка задач в реальном времени
            </h1>
            <p className="text-body text-base md:text-lg mt-5 max-w-md">
              Создайте сессию, поделитесь кодом - участники голосуют картами Фибоначчи, оценки
              вскрываются одновременно. Спорные задачи переоцениваются после обсуждения.
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              {['1', '2', '3', '5', '8', '13', '20', '?', 'пас'].map((c) => (
                <span
                  key={c}
                  className="w-10 h-12 rounded-md border border-hairline bg-canvas shadow-soft
                             flex items-center justify-center text-ink font-semibold text-sm"
                >
                  {c}
                </span>
              ))}
            </div>

            {mySessions.length > 0 && (
              <div className="mt-10">
                <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
                  Незавершённые сессии
                </h2>
                <ul className="space-y-2">
                  {mySessions.map((s) => (
                    <li key={s.code} className="flex items-center justify-between panel px-4 py-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-ink tabular-nums">{s.code}</div>
                        <div className="text-xs text-muted truncate flex items-center gap-1">
                          {s.role === 'moderator' ? <Crown size={11} className="text-amber-500" /> : <Users size={11} />}
                          {s.name} · {s.status.tasksDone}/{s.status.tasksTotal} задач
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <button
                          onClick={() => resume(s)}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-ink hover:text-primary-active"
                        >
                          Продолжить <ArrowRight size={14} />
                        </button>
                        <button onClick={() => drop(s.code)} title="Убрать" className="text-muted-soft hover:text-error">
                          <X size={16} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="panel p-6 md:p-8">
            <div className="flex bg-surface-strong rounded-pill p-1 mb-6">
              <Tab active={mode === 'join'} onClick={() => { setMode('join'); setError('') }}>Войти по коду</Tab>
              <Tab active={mode === 'create'} onClick={() => { setMode('create'); setError('') }}>Создать сессию</Tab>
            </div>

            {mode === 'join' ? (
              <form onSubmit={handleJoin} className="space-y-4">
                <Field label="Ваше имя">
                  <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Например, Аня" maxLength={20} className={inputCls} />
                </Field>
                <Field label="Код сессии">
                  <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="ABC123" maxLength={6}
                    className={`${inputCls} tracking-[0.3em] text-center text-lg tabular-nums`} />
                </Field>
                <SubmitButton busy={busy}>Присоединиться</SubmitButton>
              </form>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <Field label="Ваше имя (вы станете модератором)">
                  <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Например, Аня" maxLength={20} className={inputCls} />
                </Field>
                <Field label="Задачи для оценки">
                  <TaskEditor tasks={tasks} setTasks={setTasks} />
                </Field>
                <SubmitButton busy={busy}>Создать и пригласить</SubmitButton>
              </form>
            )}

            {error && (
              <div className="mt-4 text-sm text-error bg-error/5 border border-error/20 rounded-md px-3 py-2">
                {error}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

const inputCls =
  'w-full bg-canvas border border-hairline rounded-md px-3.5 py-2.5 text-ink ' +
  'placeholder-muted-soft outline-none focus:border-ink transition-colors'

function Tab({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2 rounded-pill text-sm font-semibold transition-all ${
        active ? 'bg-canvas text-ink shadow-card ring-1 ring-black/5' : 'text-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted mb-1.5">{label}</span>
      {children}
    </label>
  )
}

function SubmitButton({ busy, children }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full h-11 bg-primary hover:bg-primary-active disabled:opacity-50
                 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-md transition-colors"
    >
      {busy ? 'Подключение…' : children}
    </button>
  )
}
