// CliniFlow - servidor em rede
// Backend Express + Socket.io, dados persistidos em um arquivo JSON local
// (sem dependências nativas, roda em qualquer host Node.js sem passo de build).
// Serve a API REST (pacientes, oportunidades, especialidades) e o comunicador
// em tempo real via WebSocket, além dos arquivos estáticos do frontend.

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const DATA_PATH = process.env.DATA_PATH || path.join(__dirname, 'data.json');

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' })); // imagens em base64 podem ser grandes
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// ---------------------------------------------------------------------------
// "Banco de dados" em arquivo JSON
// ---------------------------------------------------------------------------
const DEFAULT_DATA = {
  patients: [],
  opportunities: [],
  specialties: [
    { id: 'orto', name: 'Ortodontia', phases: ['Instalação', 'Manutenção', 'Contenção'] },
    { id: 'endo', name: 'Endodontia (Canal)', phases: ['Diagnóstico / Avaliação', 'Tratamento de Canal', 'Finalizado'] }
  ],
  messages: []
};

function loadData() {
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(DEFAULT_DATA, null, 2));
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  } catch (e) {
    console.error('Falha ao ler data.json, recriando com dados padrão.', e);
    fs.writeFileSync(DATA_PATH, JSON.stringify(DEFAULT_DATA, null, 2));
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
}

let db = loadData();
let saveTimer = null;
function save() {
  // debounce leve para não bater no disco em excesso quando há várias escritas seguidas
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFile(DATA_PATH, JSON.stringify(db, null, 2), (err) => {
      if (err) console.error('Erro salvando data.json:', err);
    });
  }, 50);
}

// ---------------------------------------------------------------------------
// Pacientes
// ---------------------------------------------------------------------------
app.get('/api/patients', (req, res) => {
  res.json(db.patients);
});

app.post('/api/patients', (req, res) => {
  const p = req.body;
  const patient = {
    id: p.id || Date.now().toString(),
    name: p.name, phone: p.phone, source: p.source, specialty: p.specialty, phase: p.phase,
    startDate: p.startDate, nextConsult: p.nextConsult || '', notes: p.notes || '',
    attachment: p.attachment || null, pinned: !!p.pinned
  };
  db.patients.push(patient);
  save();
  io.emit('patients:changed');
  res.json(patient);
});

app.put('/api/patients/:id', (req, res) => {
  const idx = db.patients.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const p = req.body;
  db.patients[idx] = {
    ...db.patients[idx],
    name: p.name, phone: p.phone, source: p.source, specialty: p.specialty, phase: p.phase,
    startDate: p.startDate, nextConsult: p.nextConsult || '', notes: p.notes || '',
    attachment: p.attachment !== undefined ? (p.attachment || db.patients[idx].attachment) : db.patients[idx].attachment,
    pinned: !!p.pinned
  };
  save();
  io.emit('patients:changed');
  res.json({ ok: true });
});

app.delete('/api/patients/:id', (req, res) => {
  db.patients = db.patients.filter(p => p.id !== req.params.id);
  save();
  io.emit('patients:changed');
  res.json({ ok: true });
});

// Reordenar (recebe array de ids na nova ordem)
app.post('/api/patients/reorder', (req, res) => {
  const { order } = req.body;
  const byId = Object.fromEntries(db.patients.map(p => [p.id, p]));
  db.patients = order.map(id => byId[id]).filter(Boolean);
  save();
  io.emit('patients:changed');
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Oportunidades
// ---------------------------------------------------------------------------
app.get('/api/opportunities', (req, res) => {
  res.json(db.opportunities);
});

app.post('/api/opportunities', (req, res) => {
  const o = req.body;
  const opp = { id: o.id || Date.now().toString(), name: o.name, phone: o.phone, notes: o.notes || '' };
  db.opportunities.push(opp);
  save();
  io.emit('opportunities:changed');
  res.json(opp);
});

app.delete('/api/opportunities/:id', (req, res) => {
  db.opportunities = db.opportunities.filter(o => o.id !== req.params.id);
  save();
  io.emit('opportunities:changed');
  res.json({ ok: true });
});

app.post('/api/opportunities/reorder', (req, res) => {
  const { order } = req.body;
  const byId = Object.fromEntries(db.opportunities.map(o => [o.id, o]));
  db.opportunities = order.map(id => byId[id]).filter(Boolean);
  save();
  io.emit('opportunities:changed');
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Especialidades
// ---------------------------------------------------------------------------
app.get('/api/specialties', (req, res) => {
  res.json(db.specialties);
});

app.post('/api/specialties', (req, res) => {
  const s = req.body;
  const spec = { id: s.id || Date.now().toString(), name: s.name, phases: s.phases };
  db.specialties.push(spec);
  save();
  io.emit('specialties:changed');
  res.json(spec);
});

app.delete('/api/specialties/:id', (req, res) => {
  db.specialties = db.specialties.filter(s => s.id !== req.params.id);
  save();
  io.emit('specialties:changed');
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Mensagens (comunicador)
// ---------------------------------------------------------------------------
app.get('/api/messages', (req, res) => {
  res.json(db.messages);
});

app.post('/api/messages/read', (req, res) => {
  const { toUser, fromUser } = req.body;
  db.messages.forEach(m => { if (m.to === toUser && m.from === fromUser) m.read = true; });
  save();
  io.emit('messages:changed');
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Socket.io - eventos em tempo real do comunicador
// ---------------------------------------------------------------------------
io.on('connection', (socket) => {
  socket.on('chat:send', (msg) => {
    const saved = {
      id: msg.id || Date.now().toString(),
      from: msg.from, to: msg.to, text: msg.text || '', image: msg.image || null,
      time: msg.time, read: false, reactions: {}
    };
    db.messages.push(saved);
    save();
    io.emit('chat:new', saved); // todo mundo recebe; o cliente filtra pelo par from/to
  });

  socket.on('chat:reaction', ({ id, emoji }) => {
    const m = db.messages.find(msg => msg.id === id);
    if (!m) return;
    m.reactions = m.reactions || {};
    m.reactions[emoji] = (m.reactions[emoji] || 0) + 1;
    save();
    io.emit('chat:reaction:update', { id, reactions: m.reactions });
  });

  socket.on('chat:typing', ({ from, to, typing }) => {
    socket.broadcast.emit('chat:typing', { from, to, typing });
  });

  socket.on('chat:read', ({ toUser, fromUser }) => {
    db.messages.forEach(m => { if (m.to === toUser && m.from === fromUser) m.read = true; });
    save();
    io.emit('chat:read:update', { toUser, fromUser });
  });
});

server.listen(PORT, () => {
  console.log(`CliniFlow server rodando na porta ${PORT}`);
});
