import { useState, useEffect } from 'react'
import { Timer } from 'lucide-react'

export default function RoundTimer({ endsAt, offset = 0 }) {
  const [, tick] = useState(0)

  useEffect(() => {
    if (!endsAt) return
    const t = setInterval(() => tick((n) => n + 1), 500)
    return () => clearInterval(t)
  }, [endsAt])

  if (!endsAt) return null

  const remaining = Math.max(0, Math.round((endsAt - (Date.now() + offset)) / 1000))
  const mm = Math.floor(remaining / 60)
  const ss = String(remaining % 60).padStart(2, '0')
  const urgent = remaining <= 10

  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-semibold tabular-nums ${
        urgent ? 'text-error' : 'text-ink'
      }`}
      title="Осталось времени на раунд"
    >
      <Timer size={15} />
      {mm}:{ss}
    </span>
  )
}
