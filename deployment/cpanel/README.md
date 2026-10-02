# 🏠 Déploiement cPanel - Hinneh Education

Configuration complète pour déployer sur **cPanel**.

## 📁 Contenu

```
cpanel/
├── README.md                  # Ce fichier
├── CPANEL_DEPLOYMENT.md       # Guide complet de déploiement
├── htaccess/
│   └── .htaccess.production  # Configuration Apache
└── scripts/
    ├── deploy.sh            # Script de déploiement
    └── app.js.example       # Point d'entrée Node.js
```

## 🚀 Démarrage Rapide

### 1. Setup Initial (une seule fois)

```bash
# Via cPanel:
1. Setup Node.js App
2. Créer MySQL Database
3. Générer certificat SSL (AutoSSL)
4. Configurer MX Records

# Via SSH:
ssh username@hinneh-education.ci
cd public_html
git clone https://github.com/hinneh/education.git hinneh-education.ci
cd hinneh-education.ci
cp deployment/env/.env.production.example .env.production
nano .env.production  # Éditer les secrets
npm ci --only=production
npm run build
```

### 2. Configuration Apache

```bash
cp deployment/cpanel/htaccess/.htaccess.production .htaccess
chmod 644 .htaccess
```

### 3. Redéploiement (à chaque update)

```bash
cd ~/public_html/hinneh-education.ci
chmod +x deployment/cpanel/scripts/deploy.sh
./deployment/cpanel/scripts/deploy.sh
```

## 📋 Fichiers Clés

### `.htaccess.production`
- Réécrit les URL pour React SPA
- Proxy les requêtes API vers Node.js (127.0.0.1:8000)
- Compression Gzip
- Security headers
- Cache optimization

### `app.js.example`
- Serveur Node.js avec Express
- Gestion des logs
- Health checks
- Graceful shutdown

### `deploy.sh`
- Git pull + npm install
- React build
- Permissions correctes
- Redémarrage via `tmp/restart.txt`
- Health check

## 🔧 Configuration

### `.env.production`

```
NODE_ENV=production
APP_URL=https://hinneh-education.ci
API_URL=https://hinneh-education.ci/api
DB_HOST=localhost
DB_NAME=username_hinneh
DB_USER=username_hinneh
DB_PASSWORD=PASSWORD
JWT_SECRET=LONG_SECRET_MIN_32_CHARS
PORT=8000
```

## 📊 Dossier Structure sur cPanel

```
/home/username/
├── public_html/
│   └── hinneh-education.ci/
│       ├── dist/           # Build React
│       ├── src/            # Sources (ignored in dist)
│       ├── node_modules/
│       ├── .env.production
│       ├── .htaccess
│       ├── package.json
│       ├── app.js
│       ├── logs/
│       ├── tmp/
│       │   └── restart.txt (pour Passenger)
│       └── deployment/
```

## 🔄 Mise à Jour

```bash
cd ~/public_html/hinneh-education.ci

# Pull
git pull origin main

# Dépendances
npm ci --only=production

# Build
npm run build

# Redémarrer
touch tmp/restart.txt
```

## 📝 Notes cPanel

### Passenger (recommandé)
- Redémarrage: `touch tmp/restart.txt`
- Logs: Voir dans cPanel > Node.js Apps

### PM2 (alternative)
```bash
npm install -g pm2
pm2 start app.js --name hinneh-education
pm2 save
pm2 startup
```

### Logs
```bash
# Erreurs
tail -f ~/logs/error_log

# Accès
tail -f ~/logs/access_log

# Node.js app
tail -f ~/public_html/hinneh-education.ci/logs/out.log
```

## 🆘 Troubleshooting

**L'app ne démarre pas?**
```bash
cd ~/public_html/hinneh-education.ci
node app.js
# Vérifier les erreurs
```

**Port déjà utilisé?**
```bash
lsof -i :8000
kill -9 <PID>
touch tmp/restart.txt
```

**Erreurs de permission?**
```bash
chmod 755 ~/public_html/hinneh-education.ci
chmod 600 .env.production
chmod 644 .htaccess
```

## ✅ Checklist

- [ ] Node.js configuré dans cPanel
- [ ] MySQL Database créée
- [ ] `.env.production` configuré
- [ ] `.htaccess` déployé
- [ ] SSL certificat valide
- [ ] Build React complété
- [ ] App démarre sans erreurs
- [ ] `/health` répond 200 OK
- [ ] DNS pointe vers le serveur

## 📞 Support

- **cPanel Docs**: https://documentation.cpanel.net/
- **Node.js via cPanel**: cPanel > Setup Node.js App
- **SSL Issues**: cPanel > SSL/TLS Status
