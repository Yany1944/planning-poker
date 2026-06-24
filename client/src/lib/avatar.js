const COLORS = [
  { bg: '#fb923c', fg: '#7c2d12' }, // orange
  { bg: '#ec4899', fg: '#831843' }, // pink
  { bg: '#8b5cf6', fg: '#4c1d95' }, // violet
  { bg: '#34d399', fg: '#065f46' }, // emerald
  { bg: '#60a5fa', fg: '#1e3a8a' }, // blue
  { bg: '#fbbf24', fg: '#78350f' }, // amber
]

export function avatarColor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return COLORS[hash % COLORS.length]
}

export function initials(name) {
  const parts = String(name).trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return String(name).trim().slice(0, 2).toUpperCase()
}
