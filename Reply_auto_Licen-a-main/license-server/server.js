// server.js
'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const app = express();
app.use(cors());          // Ajuste origin se quiser travar domínio
app.use(express.json());

// ====== CONFIG ======
const PORT = process.env.PORT || 3000;

// Credenciais do painel
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ''; // defina no Railway

// Arquivo do banco (em Railway, prefira volume persistente)
const DB_PATH = path.join(__dirname, 'licenses.db');
const db = new Database(DB_PATH);

// ====== DB INIT ======
db.prepare(`
  CREATE TABLE IF NOT EXISTS licenses (
    license_key TEXT PRIMARY KEY,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    expires_at TEXT,
    last_used_at TEXT,
    usage_count INTEGER NOT NULL DEFAULT 0,
    notes TEXT
  );
`).run();

// ====== HELPERS ======
function generateLicenseKey() {
  // Formato XXXX-XXXX-XXXX (hex maiúsculo)
  const seg = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${seg()}-${seg()}-${seg()}`;
}

// Basic Auth só para o painel (HTML)
function adminAuth(req, res, next) {
  if (!ADMIN_PASSWORD) {
    return res.status(503).send('ADMIN_PASSWORD não configurado.');
  }
  const hdr = req.headers.authorization || '';
  if (!hdr.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Admin Panel"');
    return res.status(401).send('Authentication required.');
  }
  const token = hdr.slice(6);
  let user = '', pass = '';
  try {
    [user, pass] = Buffer.from(token, 'base64').toString().split(':');
  } catch (_) {}
  if (user === ADMIN_USER && pass === ADMIN_PASSWORD) return next();
  res.set('WWW-Authenticate', 'Basic realm="Admin Panel"');
  return res.status(401).send('Authentication required.');
}

// ====== STATIC (para assets do painel) ======
app.use(express.static('public')); // se tiver CSS/JS em /public

// ====== PAINEL (HTML) PROTEGIDO ======
app.get(['/admin', '/admin.html'], adminAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'admin.html')); // se mover para /public, ajuste o caminho
});

// ====== API ======

// Validar licença (usado pelo bot)
app.post('/api/validate', (req, res) => {
  const { license_key } = req.body || {};
  if (!license_key) return res.status(400).json({ valid: false, message: 'license_key required' });

  const row = db.prepare('SELECT * FROM licenses WHERE license_key = ?').get(license_key);
  if (!row) return res.json({ valid: false, message: 'license not found' });
  if (!row.active) return res.json({ valid: false, message: 'license revoked' });

  const nowIso = new Date().toISOString();
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return res.json({ valid: false, message: 'license expired' });
  }

  db.prepare('UPDATE licenses SET usage_count = usage_count + 1, last_used_at = ? WHERE license_key = ?')
    .run(nowIso, license_key);

  return res.json({ valid: true, message: 'ok' });
});

// Listar todas (admin)
app.get('/api/licenses', adminAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM licenses ORDER BY created_at DESC').all();
  res.json(rows);
});

// Criar licença (admin)
app.post('/api/licenses', adminAuth, (req, res) => {
  const { expires_at = null, notes = null } = req.body || {};
  const key = generateLicenseKey();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO licenses (license_key, active, created_at, expires_at, last_used_at, usage_count, notes)
    VALUES (?, 1, ?, ?, NULL, 0, ?)
  `).run(key, now, expires_at, notes);
  res.status(201).json({ license_key: key, active: 1, created_at: now, expires_at, notes });
});

// Revogar (admin)
app.post('/api/licenses/:key/revoke', adminAuth, (req, res) => {
  const { key } = req.params;
  const info = db.prepare('UPDATE licenses SET active = 0 WHERE license_key = ?').run(key);
  if (!info.changes) return res.status(404).json({ ok: false, message: 'license not found' });
  res.json({ ok: true, license_key: key, active: 0 });
});

// Reativar (admin)
app.post('/api/licenses/:key/activate', adminAuth, (req, res) => {
  const { key } = req.params;
  const info = db.prepare('UPDATE licenses SET active = 1 WHERE license_key = ?').run(key);
  if (!info.changes) return res.status(404).json({ ok: false, message: 'license not found' });
  res.json({ ok: true, license_key: key, active: 1 });
});

// Deletar (admin)
app.delete('/api/licenses/:key', adminAuth, (req, res) => {
  const { key } = req.params;
  const info = db.prepare('DELETE FROM licenses WHERE license_key = ?').run(key);
  if (!info.changes) return res.status(404).json({ ok: false, message: 'license not found' });
  res.json({ ok: true, license_key: key });
});

// ====== START ======
app.listen(PORT, () => {
  console.log(`[license-server] listening on port ${PORT}`);
});
