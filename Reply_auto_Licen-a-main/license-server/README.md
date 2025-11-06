# 🔐 License Server - Bot Licensing System

Sistema de validação de licenças para o Twitter Bot.

---

## 📦 O Que É Isso?

Este é um servidor Node.js que valida licenças do bot. Ele:
- ✅ Valida chaves de licença em tempo real
- ✅ Gerencia expiração de licenças
- ✅ Rastreia uso de cada licença
- ✅ Fornece painel web para administração

---

## 🚀 Como Instalar

### Opção 1: Rodar Localmente (Para Testes)

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor
npm start
```

O servidor estará rodando em `http://localhost:3000`

### Opção 2: Deploy no Vercel (GRÁTIS - Recomendado)

1. Crie uma conta no [Vercel](https://vercel.com)
2. Instale o Vercel CLI:
   ```bash
   npm install -g vercel
   ```
3. Faça login:
   ```bash
   vercel login
   ```
4. Deploy:
   ```bash
   vercel
   ```
5. Copie a URL que o Vercel forneceu (ex: `https://your-project.vercel.app`)
6. Use essa URL no bot como `LICENSE_SERVER_URL`

### Opção 3: Deploy no Railway (GRÁTIS)

1. Crie uma conta no [Railway](https://railway.app)
2. Clique em "New Project" → "Deploy from GitHub"
3. Conecte este repositório
4. Railway fará deploy automaticamente
5. Copie a URL fornecida

---

## 🎯 Como Usar

### 1. Acessar o Painel Admin

Abra no navegador:
```
http://localhost:3000/admin.html
```

Ou se fez deploy:
```
https://your-server.vercel.app/admin.html
```

### 2. Criar Nova Licença

1. Clique em "➕ Create New License"
2. (Opcional) Defina data de expiração
3. (Opcional) Adicione notas (nome do cliente, etc.)
4. Clique em "Create"
5. **Copie a chave gerada** e envie para o cliente

### 3. Gerenciar Licenças

No painel você pode:
- ✅ Ver todas as licenças
- ✅ Ver quantas vezes cada licença foi usada
- ✅ Ver última vez que foi usada
- ✅ Revogar licenças (desativar)
- ✅ Reativar licenças
- ✅ Deletar licenças permanentemente

---

## 🔧 Configuração no Bot

Após fazer deploy do servidor, configure no bot:

1. Abra a interface do bot (`python manager.py`)
2. Na aba "Configurações", preencha:
   - **License Key:** A chave que você gerou
   - **License Server URL:** URL do seu servidor

Exemplo:
```
License Key: A1B2C3D4-E5F6G7H8-I9J0K1L2
License Server URL: https://your-server.vercel.app
```

---

## 📊 API Endpoints

### POST /api/validate
Valida uma licença (usado pelo bot)

**Request:**
```json
{
  "license_key": "A1B2C3D4-E5F6G7H8-I9J0K1L2"
}
```

**Response (Válida):**
```json
{
  "valid": true,
  "expires_at": "2025-12-31T23:59:59.000Z",
  "message": "License is valid"
}
```

**Response (Inválida):**
```json
{
  "valid": false,
  "error": "Invalid license key"
}
```

### GET /api/licenses
Lista todas as licenças

### POST /api/licenses
Cria nova licença

### POST /api/licenses/:key/revoke
Revoga uma licença

### POST /api/licenses/:key/activate
Reativa uma licença

### DELETE /api/licenses/:key
Deleta uma licença permanentemente

---

## 🗄️ Banco de Dados

O servidor usa SQLite (`licenses.db`) para armazenar as licenças.

**Estrutura da tabela:**
```sql
CREATE TABLE licenses (
  id INTEGER PRIMARY KEY,
  license_key TEXT UNIQUE,
  created_at TEXT,
  expires_at TEXT,
  is_active INTEGER,
  last_used_at TEXT,
  usage_count INTEGER,
  notes TEXT
)
```

---

## 🔒 Segurança

### Recomendações:

1. **Adicione autenticação** ao painel admin (senha)
2. **Use HTTPS** (Vercel/Railway já fornecem)
3. **Limite requisições** para evitar abuso
4. **Faça backup** do `licenses.db` regularmente

### Adicionar Senha ao Painel (Opcional):

Edite `admin.html` e adicione no início:
```javascript
const ADMIN_PASSWORD = "sua_senha_aqui";
const password = prompt("Enter admin password:");
if (password !== ADMIN_PASSWORD) {
    alert("Access denied");
    window.location.href = "about:blank";
}
```

---

## 📝 Notas Importantes

- O banco de dados SQLite funciona perfeitamente para até **10.000 licenças**
- Para mais de 10k licenças, considere migrar para PostgreSQL
- Vercel tem limite de 100GB de bandwidth por mês (grátis)
- Railway oferece $5 de crédito grátis por mês

---

## 🆘 Suporte

Se tiver problemas:
1. Verifique se o servidor está rodando
2. Verifique se a URL está correta no bot
3. Teste a URL manualmente: `https://your-server.vercel.app/api/validate`
4. Verifique os logs do servidor

---

**Versão:** 1.0  
**Última atualização:** Outubro 2025
