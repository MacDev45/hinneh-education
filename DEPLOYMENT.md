# 🚀 GUIDE DE DÉPLOIEMENT - Groupe Scolaire Hînneh

Base de données MySQL : **insights_ce**

---

## 📋 DÉMARRAGE RAPIDE (5 minutes)

### 1. Prérequis
```bash
docker --version          # v20.10+
docker-compose --version  # v2.0+
```

### 2. Configuration
```bash
cp .env.example .env
# Générer SECRET_KEY : openssl rand -hex 32
nano .env  # Modifier les mots de passe
```

### 3. Lancer
```bash
chmod +x deployments/deploy.sh
bash deployments/deploy.sh development
```

### 4. Accéder
- **API** : http://localhost:8000
- **Swagger** : http://localhost:8000/docs
- **PhpMyAdmin** : http://localhost:8081

---

## 🌍 PRODUCTION (VPS/AWS/Azure)

### Préparation du Serveur
```bash
ssh root@your-vps-ip
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
apt-get install docker-compose-plugin
git clone https://github.com/votre-org/hinneh-education.git
cd hinneh-education
```

### Configuration
```bash
# 1. Générer clé secrète
openssl rand -hex 32

# 2. Créer .env avec valeurs production
cp .env.example .env
nano .env
# Modifier :
# - MYSQL_PASSWORD
# - MYSQL_ROOT_PASSWORD
# - SECRET_KEY (résultat openssl)
# - ENVIRONMENT=production
# - ALLOWED_ORIGINS=https://hinneh-education.ci

# 3. SSL (Let's Encrypt)
apt-get install certbot
certbot certonly --standalone -d hinneh-education.ci

# 4. Lancer
bash deployments/deploy.sh production
```

---

## 📊 STRUCTURE DES FICHIERS

```
hinneh-education/
├── .env.example                    # Template de configuration
├── .env                            # Configuration (à créer)
├── docker-compose.yml              # Orchestration Docker
├── Dockerfile                      # Image API
├── requirements.txt                # Dépendances Python
├── deployments/
│   ├── deploy.sh                   # Script de déploiement
│   ├── init-db.sql                 # Initialisation MySQL
│   └── nginx.conf                  # Configuration Nginx
├── migrations/
│   ├── 001_inscription_process_schema.sql
│   ├── 002_populate_grille_tarifaire.sql
│   └── 003_create_tenue_scolaire_table.sql
├── api/
│   ├── app/
│   │   ├── main.py                 # FastAPI app
│   │   ├── models.py               # SQLAlchemy models
│   │   ├── schemas.py              # Pydantic schemas
│   │   ├── crud.py                 # CRUD operations
│   │   └── routers/                # API endpoints
│   └── uploads/                    # Fichiers uploadés
└── src/
    └── pages/                      # Frontend React
```

---

## 🔧 COMMANDES COURANTES

```bash
# Voir l'état
docker-compose ps

# Logs en temps réel
docker-compose logs -f api

# Redémarrer
docker-compose restart api

# Arrêter
docker-compose down

# Sauvegarde MySQL
docker exec hinneh_mysql mysqldump -u hinneh_user -p$MYSQL_PASSWORD insights_ce > backup.sql

# Stats ressources
docker stats
```

---

## 🔐 VARIABLES ENVIRONNEMENT CRITIQUES

| Variable | Exemple | Défaut |
|----------|---------|--------|
| MYSQL_PASSWORD | `SecurePass123!` | ⚠️ CHANGER |
| MYSQL_ROOT_PASSWORD | `RootPass123!` | ⚠️ CHANGER |
| SECRET_KEY | `a1b2c3d4e5f6...` | ⚠️ Générer |
| MYSQL_DATABASE | `insights_ce` | ✓ OK |
| ENVIRONMENT | `production` | development |
| ALLOWED_ORIGINS | `https://hinneh-education.ci` | http://localhost:3000 |

---

## 🚨 TROUBLESHOOTING RAPIDE

| Problème | Solution |
|----------|----------|
| MySQL ne démarre pas | `docker-compose down && docker-compose up -d` |
| API 500 | `docker-compose logs api` → vérifier DATABASE_URL |
| CORS error | Vérifier ALLOWED_ORIGINS dans .env |
| Port 3306 occupé | Changer port dans docker-compose.yml |
| Espace disque plein | `docker system prune -a --volumes` |

---

## 📦 CONTENEURS DÉPLOYÉS

| Service | Image | Port |
|---------|-------|------|
| **API** | Custom (Dockerfile) | 8000 |
| **MySQL** | mysql:8.0 | 3306 |
| **PhpMyAdmin** | phpmyadmin:latest | 8081 |

---

## ✅ CHECKLIST PRÉ-PRODUCTION

- [ ] Généré SECRET_KEY avec openssl
- [ ] Changé MYSQL_PASSWORD
- [ ] Changé MYSQL_ROOT_PASSWORD
- [ ] Configuré ALLOWED_ORIGINS
- [ ] SSL certificat installé (Let's Encrypt)
- [ ] Cron sauvegarde configuré
- [ ] Firewall configuré (ports 80, 443, 3306)
- [ ] Logs rotation configurée
- [ ] Monitoring en place

---

## 📞 SUPPORT

Documentation complète : Voir **DEPLOYMENT_GUIDE.md** (détails complets)

Fichiers configurés :
- ✅ `.env.example` - Template configuration
- ✅ `docker-compose.yml` - Orchestration
- ✅ `Dockerfile` - Image API
- ✅ `requirements.txt` - Dépendances
- ✅ `deployments/deploy.sh` - Script déploiement
- ✅ `deployments/init-db.sql` - Initialisation BD
- ✅ `migrations/*.sql` - Migrations base de données

---

**Hînneh Education - Production Ready! 🚀**

Base de données : MySQL (insights_ce)
