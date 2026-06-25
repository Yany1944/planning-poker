import { CheckCircle2, AlertTriangle, Info } from 'lucide-react'

const CLOSE_THRESHOLD = 3

export default function VoteResults({ participants }) {
  const all = Object.values(participants)
  const votes = all.map((p) => p.vote)
  const nums = votes.filter((v) => v && !isNaN(Number(v))).map(Number)
  const hasQuestion = votes.includes('?')

  const avg = nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : '-'
  const min = nums.length ? Math.min(...nums) : '-'
  const max = nums.length ? Math.max(...nums) : '-'
  const spread = nums.length ? Math.max(...nums) - Math.min(...nums) : 0

  let verdict
  if (hasQuestion) {
    verdict = { tone: 'warning', text: 'Есть карта «?» - кто-то не уверен. Обсудите и переголосуйте.' }
  } else if (nums.length === 0) {
    verdict = { tone: 'muted', text: 'Числовых оценок нет.' }
  } else if (spread === 0) {
    verdict = { tone: 'success', text: `Полное согласие - оценка ${nums[0]}.` }
  } else if (spread <= CLOSE_THRESHOLD) {
    verdict = { tone: 'success', text: `Оценки близки (расхождение ${spread}) - можно зафиксировать.` }
  } else {
    verdict = { tone: 'warning', text: `Расхождение ${spread} поинтов - обсудите и переголосуйте.` }
  }

  const tone = {
    success: { cls: 'bg-success/10 text-success border-success/30', Icon: CheckCircle2 },
    warning: { cls: 'bg-warning/10 text-warning border-warning/30', Icon: AlertTriangle },
    muted: { cls: 'bg-surface-card text-muted border-hairline', Icon: Info },
  }[verdict.tone]

  return (
    <div className="w-full max-w-md mx-auto">
      <div className={`flex items-center justify-center gap-2 text-sm font-medium border rounded-md px-4 py-2 mb-4 ${tone.cls}`}>
        <tone.Icon size={16} className="shrink-0" />
        {verdict.text}
      </div>

      <div className="flex justify-center gap-8 text-sm">
        <Stat label="мин" value={min} />
        <Stat label="среднее" value={avg} />
        <Stat label="макс" value={max} />
        <Stat label="учтено" value={`${nums.length}/${all.length}`} />
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold text-ink tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  )
}
