export default function ParticipantList({ participants, moderatorId, phase, mySocketId }) {
  const entries = Object.entries(participants)

  return (
    <ul className="space-y-2">
      {entries.map(([id, p]) => {
        const isMe = id === mySocketId
        const isMod = id === moderatorId

        let status
        if (phase === 'revealed') {
          const special = p.vote === '?' || p.vote === 'пас'
          status = (
            <span className={`font-bold tabular-nums ${special ? 'text-muted-soft' : 'text-ink'}`}>
              {p.vote ?? '-'}
            </span>
          )
        } else if (phase === 'voting') {
          status = p.hasVoted ? (
            <span className="text-success" title="Проголосовал">✓</span>
          ) : (
            <span className="text-muted-soft animate-pulse" title="Думает">…</span>
          )
        } else {
          status = <span className="text-muted-soft">•</span>
        }

        return (
          <li
            key={id}
            className={`flex items-center justify-between rounded-md px-3 py-2 text-sm
                        ${isMe ? 'bg-surface-card' : ''}`}
          >
            <span className="truncate text-body">
              {isMod && <span title="Модератор">👑 </span>}
              <span className="text-ink font-medium">{p.name}</span>
              {isMe && <span className="text-muted-soft"> (вы)</span>}
            </span>
            <span className="ml-2 shrink-0">{status}</span>
          </li>
        )
      })}
    </ul>
  )
}
