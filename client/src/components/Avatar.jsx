import { avatarColor, initials } from '../lib/avatar'

export default function Avatar({ name, size = 40 }) {
  const c = avatarColor(name || '?')
  return (
    <span
      className="inline-flex items-center justify-center rounded-pill font-semibold select-none shrink-0"
      style={{
        width: size,
        height: size,
        background: c.bg,
        color: c.fg,
        fontSize: size * 0.38,
      }}
      title={name}
    >
      {initials(name || '?')}
    </span>
  )
}
