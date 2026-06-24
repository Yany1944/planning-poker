const KEY = 'pp_my_sessions'
const NOTES_KEY = 'pp_notes'

export function getMySessions() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY))
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function rememberSession({ code, name, role }) {
  const list = getMySessions().filter((s) => s.code !== code)
  list.unshift({ code, name, role, joinedAt: Date.now() })
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 20)))
}

export function forgetSession(code) {
  localStorage.setItem(KEY, JSON.stringify(getMySessions().filter((s) => s.code !== code)))
}

export function getNotes(code) {
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY))?.[code] ?? ''
  } catch {
    return ''
  }
}

export function setNotes(code, text) {
  let all = {}
  try {
    all = JSON.parse(localStorage.getItem(NOTES_KEY)) || {}
  } catch {
    all = {}
  }
  all[code] = text
  localStorage.setItem(NOTES_KEY, JSON.stringify(all))
}
