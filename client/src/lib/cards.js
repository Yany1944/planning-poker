export const CARDS = ['1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', 'пас']
export const FIB = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89]

export function snapToFib(avg) {
  if (!Number.isFinite(avg)) return null
  let best = FIB[0]
  for (const f of FIB) {
    const d = Math.abs(f - avg)
    const bd = Math.abs(best - avg)
    if (d < bd || (d === bd && f > best)) best = f
  }
  return best
}
