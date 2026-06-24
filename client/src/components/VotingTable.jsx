import Avatar from './Avatar'
import { Check } from 'lucide-react'

export default function VotingTable({ participants, revealed, center }) {
  const seats = Object.entries(participants).map(([id, p]) => ({ id, ...p }))
  const half = Math.ceil(seats.length / 2)
  const top = seats.slice(0, half)
  const bottom = seats.slice(half)

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <SeatRow seats={top} revealed={revealed} />

      <div
        className="w-full max-w-md min-h-[120px] rounded-[28px] border border-hairline
                   bg-surface-soft shadow-[inset_0_1px_3px_rgba(16,24,40,0.05)]
                   flex items-center justify-center px-6 py-5 text-center"
      >
        {center}
      </div>

      <SeatRow seats={bottom} revealed={revealed} />
    </div>
  )
}

function SeatRow({ seats, revealed }) {
  if (seats.length === 0) return null
  return (
    <div className="flex flex-wrap justify-center gap-5">
      {seats.map((p) => (
        <Seat key={p.id} p={p} revealed={revealed} />
      ))}
    </div>
  )
}

function Seat({ p, revealed }) {
  return (
    <div className="flex flex-col items-center gap-1.5 w-20">
      <SeatCard p={p} revealed={revealed} />
      <span className="text-xs text-body font-medium text-center leading-tight break-words w-full">
        {p.isModerator && <span className="text-amber-500" title="Модератор">★ </span>}
        {p.name}
      </span>
    </div>
  )
}

function SeatCard({ p, revealed }) {
  const base = 'w-12 h-16 rounded-md flex items-center justify-center transition-all'

  if (revealed) {
    const special = p.vote === '?' || p.vote === 'пас'
    return (
      <div
        className={`${base} border-2 font-bold text-lg shadow-soft ${
          p.vote == null
            ? 'border-dashed border-hairline-strong text-muted-soft'
            : special
            ? 'bg-warning/10 border-warning/50 text-warning'
            : 'bg-canvas border-hairline text-ink'
        }`}
      >
        {p.vote ?? '-'}
      </div>
    )
  }

  if (p.hasVoted) {
    return (
      <div className={`${base} bg-primary text-white shadow-card`}>
        <Check size={18} strokeWidth={2.5} />
      </div>
    )
  }

  return (
    <div className={`${base} border-2 border-dashed border-hairline-strong`}>
      <span className="flex gap-0.5">
        <Dot /> <Dot delay="150ms" /> <Dot delay="300ms" />
      </span>
    </div>
  )
}

function Dot({ delay = '0ms' }) {
  return (
    <span
      className="w-1 h-1 rounded-pill bg-muted-soft animate-pulse"
      style={{ animationDelay: delay }}
    />
  )
}
