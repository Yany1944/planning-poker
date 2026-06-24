import { Timer, Infinity as InfinityIcon } from 'lucide-react'

const PRESETS = [
  { label: 'Без таймера', minutes: 0 },
  { label: '1 мин', minutes: 1 },
  { label: '2 мин', minutes: 2 },
  { label: '5 мин', minutes: 5 },
]

export default function TimerControl({ value, onChange }) {
  const minutes = Math.round(value / 60)

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Timer size={16} /> Таймер раунда
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {PRESETS.map((p) => {
          const active = value === p.minutes * 60
          return (
            <button
              key={p.minutes}
              onClick={() => onChange(p.minutes * 60)}
              className={`px-3 py-1.5 rounded-pill text-xs font-semibold border transition-colors ${
                active
                  ? 'bg-primary text-white border-primary'
                  : 'bg-canvas text-muted border-hairline hover:border-ink hover:text-ink'
              }`}
            >
              {p.minutes === 0 ? (
                <span className="flex items-center gap-1"><InfinityIcon size={13} /> {p.label}</span>
              ) : (
                p.label
              )}
            </button>
          )
        })}
        <div className="flex items-center gap-1 border border-hairline rounded-pill pl-3 pr-1.5 py-0.5 bg-canvas">
          <input
            type="number"
            min={1}
            max={120}
            value={minutes > 0 && !PRESETS.some((p) => p.minutes * 60 === value) ? minutes : ''}
            onChange={(e) => {
              const m = parseInt(e.target.value, 10)
              onChange(Number.isFinite(m) && m > 0 ? Math.min(m, 120) * 60 : 0)
            }}
            placeholder="-"
            className="w-10 text-center text-xs outline-none bg-transparent text-ink"
          />
          <span className="text-xs text-muted-soft">мин</span>
        </div>
      </div>
    </div>
  )
}
