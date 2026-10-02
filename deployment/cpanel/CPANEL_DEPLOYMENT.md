# 🚀 Déploiement cPanel - Hinneh Education

Guide complet pour déployer **hinneh-education.ci** sur cPanel.

## 📋 Prérequis

- Compte cPanel avec accès SSH
- Node.js supporté (v18+)
- PostgreSQL ou MySQL
- SSL/TLS (AutoSSL ou Let's Encrypt)
- 500MB+ espace disque

## 🏗️ Structure cPanel

```
/home/username/
├── public_html/              # Domaine principal
│   └── hinneh-education.ci/
│       ├── dist/            # Build React production
│       ├── server/          # Backend Node.js
│       ├── .env.production
│       ├── package.json
│       ├── .htaccess
│       └── app.js           # Point d'entrée Node.js
└── ssl/                     # Certificats SSL
    └── hinneh-education.ci/
```

## 1️⃣ Setup SSH & Node.js

### Via cPanel Terminal

```bash
# Connecter en SSH
ssh username@hinneh-education.ci

# Vérifier la version de Node.js
node --version
npm --version

# Si Node.js n'est pas installé, utiliser Setup Node.js dans cPanel
# ou via NVM:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

## 2️⃣ Cloner & Configurer le Projet

```bash
cd public_html
git clone https://github.com/hinneh/education.git hinneh-education.ci
cd hinneh-education.ci

# Copier la configuration
cp deployment/env/.env.production.example .env.production

# Éditer les variables
nano .env.production
```

### Variables essentielles `.env.production`:

```
NODE_ENV=production
APP_URL=https://hinneh-education.ci
API_URL=https://hinneh-education.ci/api
DB_HOST=localhost
DB_NAME=username_hinneh
DB_USER=username_hinneh
DB_PASSWORD=STRONG_PASSWORD
DB_PORT=3306
JWT_SECRET=YOUR_LONG_SECRET_KEY_MIN_32_CHARS
PORT=8000
```

## 3️⃣ Installation des Dépendances

```bash
npm ci --only=production
npm run build
```

## 4️⃣ Configuration Apache (.htaccess)

### Frontend SPA (React)

Créer `public_html/hinneh-education.ci/.htaccess`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Bloquer l'accès aux fichiers sensibles
  RewriteRule "^\.env" - [F,L]
  RewriteRule "^\.git" - [F,L]

  # Servir les assets avec cache long
  <FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>

  # API Proxy vers Node.js
  RewriteCond %{REQUEST_URI} ^/api [OR]
  RewriteCond %{REQUEST_URI} ^/health
  RewriteRule ^(.*)$ http://127.0.0.1:8000/$1 [P,L]

  # React SPA routing
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ index.html [QSA,L]
</IfModule>

# Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/plain text/html text/xml
  AddOutputFilterByType DEFLATE text/css text/javascript
  AddOutputFilterByType DEFLATE application/xml application/xhtml+xml
  AddOutputFilterByType DEFLATE application/rss+xml
  AddOutputFilterByType DEFLATE application/javascript
  AddOutputFilterByType DEFLATE application/x-javascript
  AddOutputFilterByType DEFLATE image/svg+xml
</IfModule>

# Security Headers
<IfModule mod_headers.c>
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-Content-Type-Options "nosniff"
  Header set X-XSS-Protection "1; mode=block"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# HTTPS
<IfModule mod_rewrite.c>
  RewriteCond %{HTTPS} !=on
  RewriteRule ^/?(.*) https://hinneh-education.ci/$1 [R,L]
</IfModule>
```

## 5️⃣ Configuration Node.js Application

### Avec Passenger (recommandé sur cPanel)

Vérifier que Passenger est activé dans cPanel > Setup Node.js App

```bash
# cPanel crée automatiquement:
# - app.js (point d'entrée)
# - tmp/restart.txt (pour redémarrer)
```

Créer `app.js`:

```javascript
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API Routes (exemple)
app.use('/api', (req, res) => {
  res.json({ message: 'API Route' });
});

// SPA Fallback
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Démarrer le serveur
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Hinneh Education running on port ${PORT}`);
});
```

### Avec PM2 (alternative)

```bash
npm install -g pm2

# Créer écosystème PM2
cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'hinneh-education',
    script: './app.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 8000
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '500M'
  }]
};
EOF

pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

## 6️⃣ Base de Données

### MySQL via cPanel

```bash
# Créer une DB MySQL via cPanel > MySQL Databases
# Nom: username_hinneh
# Utilisateur: username_hinneh

# Ou via SSH:
mysql -u username -p
CREATE DATABASE username_hinneh;
CREATE USER 'username_hinneh'@'localhost' IDENTIFIED BY 'PASSWORD';
GRANT ALL PRIVILEGES ON username_hinneh.* TO 'username_hinneh'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Migrations (une seule fois)

```bash
npm run migrate
```

## 7️⃣ SSL/TLS

### AutoSSL (automatique)

- Aller dans cPanel > SSL/TLS
- Vérifier que **AutoSSL** est activé
- Il renouvellera automatiquement

### Let's Encrypt (manuel)

```bash
# Via cPanel Terminal
certbot certonly --webroot -w public_html/hinneh-education.ci \
  -d hinneh-education.ci -d www.hinneh-education.ci
```

## 8️⃣ Déploiement & Redémarrage

### Déploiement d'une nouvelle version

```bash
cd public_html/hinneh-education.ci

# Pull les changements
git pull origin main

# Installer les dépendances
npm ci --only=production

# Rebuild
npm run build

# Redémarrer l'app
# Avec Passenger:
touch tmp/restart.txt

# Avec PM2:
pm2 restart hinneh-education
```

## 📊 Monitoring

### Logs

```bash
# Logs de l'app
tail -f public_html/hinneh-education.ci/logs/out.log

# Erreurs
tail -f public_html/hinneh-education.ci/logs/err.log

# Apache
tail -f logs/error_log
tail -f logs/access_log
```

### Vérification

```bash
# Health check
curl https://hinneh-education.ci/health

# Vérifier que l'app tourne
ps aux | grep node

# Vérifier les ports ouverts
netstat -tuln | grep 8000
```

## 🔐 Sécurité cPanel

- ✅ SSH keys only (pas de passwords)
- ✅ Désactiver root login
- ✅ Firewall: Ouvrir uniquement 80, 443
- ✅ Fail2Ban activé
- ✅ Backups automatiques quotidiens
- ✅ .env.production jamais en Git

### Permissions

```bash
chmod 755 public_html/hinneh-education.ci
chmod 644 public_html/hinneh-education.ci/.htaccess
chmod 600 public_html/hinneh-education.ci/.env.production
chmod 755 public_html/hinneh-education.ci/logs
```

## 🆘 Troubleshooting

### L'app ne démarre pas

```bash
# Vérifier les erreurs
tail -f logs/error_log
tail -f public_html/hinneh-education.ci/logs/err.log

# Vérifier Node.js
node --version
npm --version
```

### Port 8000 déjà utilisé

```bash
lsof -i :8000
kill -9 <PID>
```

### Problèmes de permission

```bash
# Corriger les permissions
chown -R username:username public_html/hinneh-education.ci
chmod 755 public_html/hinneh-education.ci
chmod 644 .env.production
```

### CORS errors

Vérifier dans `.env.production`:
```
CORS_ORIGIN=https://hinneh-education.ci
```

## 📝 Checklist Final

- [ ] Node.js installé (v18+)
- [ ] Projet cloné et buildé
- [ ] `.env.production` configuré
- [ ] Base de données créée
- [ ] `.htaccess` déployé
- [ ] SSL certificat validé
- [ ] App démarre sans erreurs
- [ ] Health check répond
- [ ] DNS pointe vers le serveur
- [ ] Backups configurés

## 📞 Support cPanel

- cPanel Docs: https://documentation.cpanel.net/
- Node.js Setup: cPanel > Setup Node.js App
- SSL Issues: cPanel > SSL/TLS Status
- Email support: support@hosting-provider.com
