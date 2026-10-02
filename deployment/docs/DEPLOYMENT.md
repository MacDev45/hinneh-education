# Guide de Déploiement - Hinneh Education

## 📋 Prérequis

- Docker 20.10+
- Docker Compose 2.0+
- Accès SSH au serveur de production
- Certificats SSL/TLS pour hinneh-education.ci

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│  Nginx Reverse Proxy (443, 80)          │
│  - SSL/TLS Termination                  │
│  - Load Balancing                       │
└──────────┬──────────────────────────────┘
           │
      ┌────┴────────────────────┐
      │                         │
   ┌──▼──────────┐     ┌──────▼──┐
   │ Node.js App │     │PostgreSQL│
   │  (Port 5000)│     │ (Port5432)│
   └─────────────┘     └──────────┘
```

## 🚀 Déploiement Initial

### 1. Préparation du serveur

```bash
ssh user@hinneh-education.ci
cd /opt/hinneh-education

# Cloner le repository
git clone https://github.com/hinneh/education.git .
cd deployment
```

### 2. Configuration de l'environnement

```bash
# Copier le template
cp env/.env.production.example env/.env.production

# Éditer avec vos valeurs
nano env/.env.production
```

**Variables essentielles:**
- `DB_PASSWORD` : Mot de passe PostgreSQL fort
- `JWT_SECRET` : Clé secrète pour JWT (min 32 caractères)
- `SMTP_PASSWORD` : Mot de passe SMTP
- Certificats SSL dans `nginx/ssl/`

### 3. Certificats SSL

```bash
# Option 1: Let's Encrypt (recommandé)
certbot certonly --standalone -d hinneh-education.ci -d www.hinneh-education.ci
cp /etc/letsencrypt/live/hinneh-education.ci/fullchain.pem nginx/ssl/hinneh-education.ci.crt
cp /etc/letsencrypt/live/hinneh-education.ci/privkey.pem nginx/ssl/hinneh-education.ci.key

# Option 2: Certificat auto-signé (dev uniquement)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/hinneh-education.ci.key \
  -out nginx/ssl/hinneh-education.ci.crt
```

### 4. Déploiement

```bash
chmod +x scripts/deploy.sh scripts/rollback.sh

# Déploiement production
./scripts/deploy.sh production

# Vérification
curl -I https://hinneh-education.ci
```

## 📊 Monitoring

### Logs en direct
```bash
docker-compose -f docker/docker-compose.yml logs -f app
```

### Health check
```bash
curl https://hinneh-education.ci/health
```

### Statistiques conteneurs
```bash
docker stats
```

## 🔄 Mise à jour

```bash
cd /opt/hinneh-education
git pull origin main
cd deployment
./scripts/deploy.sh production
```

## ⏮️ Rollback

```bash
cd /opt/hinneh-education/deployment
./scripts/rollback.sh
```

## 🛠️ Maintenance

### Nettoyage Docker
```bash
docker system prune -a --volumes
```

### Sauvegarde de la base de données
```bash
docker-compose -f docker/docker-compose.yml exec -T db pg_dump -U hinneh hinneh_education > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restauration de la base de données
```bash
docker-compose -f docker/docker-compose.yml exec -T db psql -U hinneh hinneh_education < backup.sql
```

## 🔐 Sécurité

- ✅ HTTPS obligatoire (HSTS activé)
- ✅ Conteneurs exécutés en tant qu'utilisateur non-root
- ✅ Firewall: Ouvrir uniquement ports 80, 443
- ✅ Secrets stockés dans `.env.production` (jamais en Git)
- ✅ Rate limiting activé
- ✅ CORS configuré pour le domaine uniquement

## 📈 Performance

### Optimisations activées
- Gzip compression
- HTTP/2
- Cache headers (1 an pour assets versionnés)
- Lazy loading composants React

### Monitoring de performance
```bash
# Taille des images
docker images

# Utilisation disque
du -sh deployment/
```

## 🆘 Troubleshooting

### L'application ne démarre pas
```bash
docker-compose logs app
docker ps -a
```

### Erreur SSL
```bash
# Vérifier les certificats
openssl x509 -in nginx/ssl/hinneh-education.ci.crt -text -noout
```

### Base de données non accessible
```bash
docker-compose exec db psql -U hinneh -d hinneh_education -c "\l"
```

## 📞 Support

Pour les issues: https://github.com/hinneh/education/issues
Contact: devops@hinneh-education.ci
