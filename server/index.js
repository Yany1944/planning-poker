const express = require('express');
const http = require('http');
const fs = require('fs');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'sessions.json');
const ARCHIVE_DIR = path.join(DATA_DIR, 'archive');
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 дней

const VALID_CARDS = new Set(['1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', 'пас']);

let sessions = loadSessions();
const socketToSession = {};
const timers = {};
const emptyTimers = {};

// Сколько ждём перед авто-завершением пустой сессии (чтобы переживать перезагрузку страницы)
const EMPTY_GRACE_MS = Number(process.env.EMPTY_GRACE_MS) || 90 * 1000;

function loadSessions() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const out = {};
    for (const s of Object.values(data)) {
      s.participants = {};
      s.moderatorId = null;
      s.roundEndsAt = null;
      s.roundStartedAt = null;
      s.roundVotes = {};
      if (typeof s.board !== 'string') s.board = '';
      if (!Array.isArray(s.boardWriters)) s.boardWriters = [];
      if (!Array.isArray(s.seenNames)) s.seenNames = [];
      if (s.phase === 'voting' || s.phase === 'revealed') s.phase = 'waiting';
      out[s.id] = s;
    }
    return out;
  } catch {
    return {};
  }
}

let saveTimer = null;
function saveSessions() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    writeStore();
  }, 200);
}

function writeStore() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(sessions, null, 2));
  } catch (e) {
    console.error('Не удалось сохранить сессии:', e.message);
  }
}

// Отдельный читаемый лог завершённой сессии: дата_код.json
function archiveSession(s) {
  try {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    const date = new Date(s.finishedAt || Date.now()).toISOString().slice(0, 10);
    const file = path.join(ARCHIVE_DIR, `${date}_${s.id}.json`);
    const log = {
      'Код сессии': s.id,
      'Создана': fmt(s.createdAt),
      'Завершена': fmt(s.finishedAt),
      'Модератор': s.moderatorName,
      'Участники': s.seenNames,
      'Задачи': s.tasks.map((t, i) => ({
        '№': i + 1,
        'Задача': t.name,
        'Теги': t.tags || [],
        'Итоговая оценка': t.finalScore,
        'Раундов': t.rounds || 1,
        'Голоса': (t.votes || []).map((v) => `${v.name}: ${v.vote}`),
      })),
    };
    fs.writeFileSync(file, JSON.stringify(log, null, 2));
  } catch (e) {
    console.error('Не удалось записать архив сессии:', e.message);
  }
}

function fmt(ms) {
  return ms ? new Date(ms).toISOString() : null;
}

function flushSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  writeStore();
}

function purgeExpired() {
  const now = Date.now();
  let changed = false;
  for (const [id, s] of Object.entries(sessions)) {
    const ref = s.finishedAt || s.createdAt || now;
    if (now - ref > RETENTION_MS) {
      clearTimer(id);
      delete sessions[id];
      changed = true;
    }
  }
  if (changed) saveSessions();
}

function clearTimer(id) {
  if (timers[id]) {
    clearTimeout(timers[id]);
    delete timers[id];
  }
}

function scheduleTimer(id) {
  clearTimer(id);
  const s = sessions[id];
  if (!s || !s.roundEndsAt) return;
  const fire = () => {
    const ss = sessions[id];
    if (ss && ss.phase === 'voting') {
      ss.phase = 'revealed';
      ss.roundEndsAt = null;
      clearTimer(id);
      broadcast(id);
      saveSessions();
    }
  };
  const ms = s.roundEndsAt - Date.now();
  if (ms <= 0) fire();
  else timers[id] = setTimeout(fire, ms);
}

function finishSession(s) {
  s.phase = 'finished';
  s.finishedAt = Date.now();
  s.roundEndsAt = null;
  clearTimer(s.id);
  archiveSession(s);
}

function scheduleEmptyFinish(id) {
  cancelEmptyFinish(id);
  emptyTimers[id] = setTimeout(() => {
    delete emptyTimers[id];
    const s = sessions[id];
    if (s && Object.keys(s.participants).length === 0 && s.phase !== 'finished') {
      finishSession(s);
      saveSessions();
    }
  }, EMPTY_GRACE_MS);
}

function cancelEmptyFinish(id) {
  if (emptyTimers[id]) {
    clearTimeout(emptyTimers[id]);
    delete emptyTimers[id];
  }
}

// Голоса храним по имени, а не по socket.id - иначе при переподключении голос теряется
function nk(name) {
  return String(name).toLowerCase();
}

function allConnectedVoted(s) {
  const ps = Object.values(s.participants);
  return ps.length > 0 && ps.every((p) => s.roundVotes[nk(p.name)] !== undefined);
}

function publicView(session) {
  const revealed = session.phase === 'revealed' || session.phase === 'results' || session.phase === 'finished';
  const participants = {};
  for (const [id, p] of Object.entries(session.participants)) {
    const v = session.roundVotes[nk(p.name)];
    participants[id] = {
      name: p.name,
      hasVoted: v !== undefined,
      vote: revealed && v !== undefined ? v.value : null,
      isModerator: id === session.moderatorId,
    };
  }
  return {
    id: session.id,
    tasks: session.tasks,
    currentTaskIndex: session.currentTaskIndex,
    phase: session.phase,
    participants,
    moderatorId: session.moderatorId,
    moderatorName: session.participants[session.moderatorId]?.name ?? session.moderatorName,
    round: session.round,
    roundDuration: session.roundDuration,
    roundStartedAt: session.roundStartedAt,
    roundEndsAt: session.roundEndsAt,
    createdAt: session.createdAt,
    finishedAt: session.finishedAt,
    board: session.board,
    boardWriters: session.boardWriters,
    serverNow: Date.now(),
  };
}

function broadcast(sessionId) {
  const s = sessions[sessionId];
  if (s) io.to(sessionId).emit('session_updated', publicView(s));
}

function resetVotes(session) {
  session.roundVotes = {};
}

function rememberName(session, name) {
  if (!session.seenNames.includes(name)) session.seenNames.push(name);
}

app.get('/health', (req, res) => res.json({ ok: true, sessions: Object.keys(sessions).length }));

app.get('/api/sessions/status', (req, res) => {
  const codes = String(req.query.codes || '')
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  const result = codes.map((code) => {
    const s = sessions[code];
    if (!s) return { code, exists: false };
    return {
      code,
      exists: true,
      phase: s.phase,
      finished: s.phase === 'finished',
      tasksTotal: s.tasks.length,
      tasksDone: s.tasks.filter((t) => t.finalScore !== null).length,
      moderatorName: s.moderatorName,
    };
  });
  res.json(result);
});

const distPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

function normalizeTasks(tasks) {
  if (!Array.isArray(tasks)) return [];
  return tasks
    .map((t) => {
      const name = String((t && t.name !== undefined ? t.name : t) || '').trim();
      const tags = Array.isArray(t && t.tags)
        ? t.tags.map((x) => String(x).trim()).filter(Boolean).slice(0, 6)
        : [];
      return { name, tags };
    })
    .filter((t) => t.name)
    .map((t, i) => ({ id: i, name: t.name, tags: t.tags, finalScore: null, rounds: 1, votes: null }));
}

io.on('connection', (socket) => {
  socket.on('create_session', ({ tasks, moderatorName }) => {
    const cleanTasks = normalizeTasks(tasks);
    if (cleanTasks.length === 0) {
      return socket.emit('app_error', 'Укажите хотя бы одну задачу');
    }
    const name = String(moderatorName || '').trim();
    if (!name) return socket.emit('app_error', 'Введите имя');

    const sessionId = uuidv4().slice(0, 6).toUpperCase();
    sessions[sessionId] = {
      id: sessionId,
      tasks: cleanTasks,
      currentTaskIndex: 0,
      moderatorId: socket.id,
      moderatorName: name,
      phase: 'waiting',
      participants: { [socket.id]: { name } },
      roundVotes: {},
      board: '',
      boardWriters: [],
      seenNames: [name],
      round: 1,
      roundDuration: null,
      roundStartedAt: null,
      roundEndsAt: null,
      createdAt: Date.now(),
      finishedAt: null,
    };
    socketToSession[socket.id] = { sessionId, name };
    cancelEmptyFinish(sessionId);

    socket.join(sessionId);
    socket.emit('session_created', { sessionId });
    broadcast(sessionId);
    saveSessions();
  });

  socket.on('join_session', ({ sessionId, name }) => {
    const id = String(sessionId || '').trim().toUpperCase();
    const session = sessions[id];
    if (!session) return socket.emit('app_error', 'Сессия не найдена');
    if (session.phase === 'finished') return socket.emit('app_error', 'Сессия уже завершена');

    const cleanName = String(name || '').trim();
    if (!cleanName) return socket.emit('app_error', 'Введите имя');

    const isReturningModerator = cleanName.toLowerCase() === session.moderatorName.toLowerCase();
    const taken = Object.values(session.participants).map((p) => p.name.toLowerCase());
    if (!isReturningModerator && taken.includes(cleanName.toLowerCase())) {
      return socket.emit('app_error', 'Это имя уже занято в сессии');
    }

    session.participants[socket.id] = { name: cleanName };
    socketToSession[socket.id] = { sessionId: id, name: cleanName };
    rememberName(session, cleanName);
    cancelEmptyFinish(id);
    if (isReturningModerator || session.moderatorId == null) session.moderatorId = socket.id;

    socket.join(id);
    socket.emit('joined_session', { sessionId: id });
    broadcast(id);
    saveSessions();
  });

  // Запрос текущего состояния сразу после входа на страницу сессии
  socket.on('sync', ({ sessionId }) => {
    const s = sessions[sessionId];
    if (s) socket.emit('session_updated', publicView(s));
  });

  socket.on('board_update', ({ sessionId, text }) => {
    const s = sessions[sessionId];
    if (!s) return;
    const p = s.participants[socket.id];
    if (!p) return;
    const canWrite = socket.id === s.moderatorId || s.boardWriters.includes(nk(p.name));
    if (!canWrite) return;
    s.board = String(text ?? '').slice(0, 5000);
    broadcast(sessionId);
    saveSessions();
  });

  socket.on('board_grant', ({ sessionId, name, allow }) => {
    const s = sessions[sessionId];
    if (!s || socket.id !== s.moderatorId) return;
    const key = nk(String(name || ''));
    if (!key) return;
    const set = new Set(s.boardWriters);
    if (allow) set.add(key);
    else set.delete(key);
    s.boardWriters = [...set];
    broadcast(sessionId);
    saveSessions();
  });

  socket.on('start_voting', ({ sessionId, duration }) => {
    const s = sessions[sessionId];
    if (!s || socket.id !== s.moderatorId) return;
    if (s.phase === 'finished') return;
    startRound(s, duration);
    broadcast(sessionId);
    saveSessions();
  });

  socket.on('vote', ({ sessionId, value }) => {
    const s = sessions[sessionId];
    if (!s || !s.participants[socket.id]) return;
    if (s.phase !== 'voting') return;
    if (!VALID_CARDS.has(value)) return;

    const voterName = s.participants[socket.id].name;
    s.roundVotes[nk(voterName)] = { name: voterName, value };

    if (allConnectedVoted(s)) {
      s.phase = 'revealed';
      s.roundEndsAt = null;
      clearTimer(sessionId);
    }
    broadcast(sessionId);
    saveSessions();
  });

  socket.on('reveal_votes', ({ sessionId }) => {
    const s = sessions[sessionId];
    if (!s || socket.id !== s.moderatorId) return;
    if (s.phase !== 'voting') return;
    s.phase = 'revealed';
    s.roundEndsAt = null;
    clearTimer(sessionId);
    broadcast(sessionId);
    saveSessions();
  });

  socket.on('revote', ({ sessionId, duration }) => {
    const s = sessions[sessionId];
    if (!s || socket.id !== s.moderatorId) return;
    if (s.phase === 'finished') return;
    s.round += 1;
    startRound(s, duration === undefined ? s.roundDuration : duration);
    broadcast(sessionId);
    saveSessions();
  });

  socket.on('finalize_score', ({ sessionId, score }) => {
    const s = sessions[sessionId];
    if (!s || socket.id !== s.moderatorId) return;
    if (s.phase !== 'revealed') return;

    const task = s.tasks[s.currentTaskIndex];
    task.finalScore = String(score).trim() || '-';
    task.rounds = s.round;
    task.votes = Object.values(s.roundVotes).map((v) => ({ name: v.name, vote: v.value }));

    clearTimer(sessionId);
    s.roundEndsAt = null;

    const nextUnscored = s.tasks.findIndex((t) => t.finalScore === null);
    if (nextUnscored !== -1) {
      s.currentTaskIndex = nextUnscored;
      resetVotes(s);
      s.phase = 'waiting';
      s.round = 1;
      s.roundStartedAt = null;
    } else {
      s.phase = 'results';
    }
    broadcast(sessionId);
    saveSessions();
  });

  socket.on('reopen_task', ({ sessionId, taskIndex }) => {
    const s = sessions[sessionId];
    if (!s || socket.id !== s.moderatorId) return;
    if (s.phase === 'finished') return;
    const idx = Number(taskIndex);
    if (!Number.isInteger(idx) || idx < 0 || idx >= s.tasks.length) return;
    s.currentTaskIndex = idx;
    resetVotes(s);
    s.phase = 'waiting';
    s.round = 1;
    s.roundStartedAt = null;
    s.roundEndsAt = null;
    clearTimer(sessionId);
    broadcast(sessionId);
    saveSessions();
  });

  socket.on('reorder_tasks', ({ sessionId, order }) => {
    const s = sessions[sessionId];
    if (!s || socket.id !== s.moderatorId) return;
    if (!Array.isArray(order)) return;
    const byId = new Map(s.tasks.map((t) => [t.id, t]));
    const reordered = order.map((id) => byId.get(id)).filter(Boolean);
    if (reordered.length !== s.tasks.length) return;
    const currentId = s.tasks[s.currentTaskIndex]?.id;
    s.tasks = reordered;
    const newIdx = s.tasks.findIndex((t) => t.id === currentId);
    if (newIdx !== -1) s.currentTaskIndex = newIdx;
    broadcast(sessionId);
    saveSessions();
  });

  socket.on('edit_task', ({ sessionId, taskIndex, name, tags, finalScore }) => {
    const s = sessions[sessionId];
    if (!s || socket.id !== s.moderatorId) return;
    const idx = Number(taskIndex);
    const task = s.tasks[idx];
    if (!task) return;

    if (typeof name === 'string') {
      const clean = name.trim();
      if (clean) task.name = clean;
    }
    if (Array.isArray(tags)) {
      task.tags = tags.map((x) => String(x).trim()).filter(Boolean).slice(0, 6);
    }
    if (finalScore !== undefined) {
      const fs = String(finalScore).trim();
      task.finalScore = fs || null;
    }
    broadcast(sessionId);
    saveSessions();
  });

  socket.on('end_session', ({ sessionId }) => {
    const s = sessions[sessionId];
    if (!s || socket.id !== s.moderatorId) return;
    finishSession(s);
    broadcast(sessionId);
    saveSessions();
  });

  socket.on('disconnect', () => {
    const info = socketToSession[socket.id];
    if (!info) return;

    const s = sessions[info.sessionId];
    if (s) {
      delete s.participants[socket.id];

      // Если ушёл модератор - передаём роль любому оставшемуся участнику
      if (s.moderatorId === socket.id) {
        s.moderatorId = Object.keys(s.participants)[0] ?? null;
      }

      if (s.phase === 'voting' && allConnectedVoted(s)) {
        s.phase = 'revealed';
        s.roundEndsAt = null;
        clearTimer(info.sessionId);
      }

      if (Object.keys(s.participants).length === 0 && s.phase !== 'finished') {
        scheduleEmptyFinish(info.sessionId);
      }

      broadcast(info.sessionId);
      saveSessions();
    }
    delete socketToSession[socket.id];
  });
});

function startRound(s, duration) {
  resetVotes(s);
  s.phase = 'voting';
  s.roundStartedAt = Date.now();
  const dur = Number(duration);
  if (Number.isFinite(dur) && dur > 0) {
    s.roundDuration = Math.min(Math.round(dur), 7200);
    s.roundEndsAt = Date.now() + s.roundDuration * 1000;
    scheduleTimer(s.id);
  } else {
    s.roundDuration = null;
    s.roundEndsAt = null;
    clearTimer(s.id);
  }
}

purgeExpired();
setInterval(purgeExpired, 60 * 60 * 1000);

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    flushSave();
    process.exit(0);
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Planning Poker server on :${PORT}`));
