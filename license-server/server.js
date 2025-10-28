const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Para servir o painel admin

// Banco de dados SQLite
const db = new Database(path.join(__dirname, 'licenses.db'));

// Criar tabela de licenças se não existir
db.exec(`
  CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_key TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT,
    is_active INTEGER DEFAULT 1,
    last_used_at TEXT,
    usage_count INTEGER DEFAULT 0,
    notes TEXT
  )
`);

// Função para gerar chave de licença
function generateLicenseKey() {
  const part1 = crypto.randomBytes(4).toString('hex').toUpperCase();
  const part2 = crypto.randomBytes(4).toString('hex').toUpperCase();
  const part3 = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${part1}-${part2}-${part3}`;
}

// ===== API ENDPOINTS =====

// Endpoint de validação de licença (usado pelo bot)
app.post('/api/validate', (req, res) => {
  const { license_key } = req.body;

  if (!license_key) {
    return res.status(400).json({
      valid: false,
      error: 'License key is required'
    });
  }

  try {
    // Buscar licença no banco
    const license = db.prepare('SELECT * FROM licenses WHERE license_key = ?').get(license_key);

    if (!license) {
      return res.json({
        valid: false,
        error: 'Invalid license key'
      });
    }

    if (license.is_active === 0) {
      return res.json({
        valid: false,
        error: 'License has been revoked'
      });
    }

    // Verificar expiração
    if (license.expires_at) {
      const expiryDate = new Date(license.expires_at);
      if (expiryDate < new Date()) {
        return res.json({
          valid: false,
          error: 'License has expired'
        });
      }
    }

    // Atualizar último uso
    db.prepare('UPDATE licenses SET last_used_at = ?, usage_count = usage_count + 1 WHERE license_key = ?')
      .run(new Date().toISOString(), license_key);

    // Retornar sucesso
    res.json({
      valid: true,
      expires_at: license.expires_at,
      message: 'License is valid'
    });

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      valid: false,
      error: 'Internal server error'
    });
  }
});

// Endpoint para listar todas as licenças (painel admin)
app.get('/api/licenses', (req, res) => {
  try {
    const licenses = db.prepare('SELECT * FROM licenses ORDER BY created_at DESC').all();
    res.json(licenses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch licenses' });
  }
});

// Endpoint para criar nova licença
app.post('/api/licenses', (req, res) => {
  const { expires_at, notes } = req.body;
  
  try {
    const licenseKey = generateLicenseKey();
    const createdAt = new Date().toISOString();

    db.prepare('INSERT INTO licenses (license_key, created_at, expires_at, notes) VALUES (?, ?, ?, ?)')
      .run(licenseKey, createdAt, expires_at || null, notes || '');

    res.json({
      success: true,
      license_key: licenseKey,
      created_at: createdAt,
      expires_at: expires_at || null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create license' });
  }
});

// Endpoint para revogar licença
app.post('/api/licenses/:key/revoke', (req, res) => {
  const { key } = req.params;

  try {
    db.prepare('UPDATE licenses SET is_active = 0 WHERE license_key = ?').run(key);
    res.json({ success: true, message: 'License revoked' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to revoke license' });
  }
});

// Endpoint para reativar licença
app.post('/api/licenses/:key/activate', (req, res) => {
  const { key } = req.params;

  try {
    db.prepare('UPDATE licenses SET is_active = 1 WHERE license_key = ?').run(key);
    res.json({ success: true, message: 'License activated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to activate license' });
  }
});

// Endpoint para deletar licença
app.delete('/api/licenses/:key', (req, res) => {
  const { key } = req.params;

  try {
    db.prepare('DELETE FROM licenses WHERE license_key = ?').run(key);
    res.json({ success: true, message: 'License deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete license' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ License server running on port ${PORT}`);
  console.log(`📊 Admin panel: http://localhost:${PORT}/admin.html`);
  console.log(`🔗 API endpoint: http://localhost:${PORT}/api/validate`);
});
