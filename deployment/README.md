# 🚀 Déploiement cPanel - Hinneh Education

Infrastructure de déploiement pour **hinneh-education.ci** sur **cPanel**

## 📁 Structure

```
deployment/
├── docker/              # Configuration Docker & Compose
│   ├── Dockerfile      # Image de l'application
│   └── docker-compose.yml
├── nginx/              # Configuration reverse proxy
│   ├── nginx.conf      # Config serveur web
│   └── ssl/           # Certificats SSL/TLS
├── env/                # Variables d'environnement
│   ├── .env.production.example
│   ├── .env.staging.example
│   └── .env.local.example
├── scripts/            # Scripts de déploiement
│   ├── deploy.sh      # Déploiement production
│   ├── rollback.sh    # Rollback de version
│   └── health-check.sh
├── docs/               # Documentation
│   ├── DEPLOYMENT.md  # Guide complet
│   └── ARCHITECTURE.md
└── README.md          # Ce fichier
```

## 🎯 Démarrage Rapide

### Production
```bash
cd deployment
cp env/.env.production.example env/.env.production
nano env/.env.production  # Éditer les secrets
chmod +x scripts/deploy.sh
./scripts/deploy.sh production
```

### Développement Local
```bash
cd deployment/docker
docker-compose -f docker-compose.yml up -d
# App disponible sur http://localhost:5000
```

## 📋 Checklist Pré-Déploiement

- [ ] Certificats SSL placés dans `nginx/ssl/`
- [ ] `.env.production` configuré avec tous les secrets
- [ ] Database password changé
- [ ] JWT_SECRET généré (min 32 caractères)
- [ ] DNS pointant vers le serveur
- [ ] Ports 80, 443 ouverts sur le firewall
- [ ] Backup de données effectué

## 🔧 Services

| Service | Port | Rôle |
|---------|------|------|
| Nginx | 80/443 | Reverse proxy, SSL |
| Node.js App | 5000 | API & Frontend |
| PostgreSQL | 5432 | Base de données |

## 📊 Commandes Utiles

```bash
cd deployment/docker

# Démarrer les services
docker-compose up -d

# Arrêter les services
docker-compose down

# Voir les logs
docker-compose logs -f app

# Redémarrer l'app
docker-compose restart app

# Exécuter une commande dans le conteneur
docker-compose exec app npm run migrate

# Accès direct à la DB
docker-compose exec db psql -U hinneh -d hinneh_education
```

## 🔐 Secrets & Sécurité

**Jamais commiter les fichiers:**
- `.env.production`
- `.env.staging`
- Certificats SSL privés
- Backups de base de données

**Stockage sécurisé:**
- Utiliser un gestionnaire de secrets (Vault, 1Password)
- Backups chiffrés
- Accès SSH avec clés (pas passwords)

## 📈 Monitoring & Logs

```bash
# Voir l'état de tous les conteneurs
docker ps

# Voir les ressources utilisées
docker stats

# Logs de l'application
docker-compose logs --tail=100 app

# Logs du reverse proxy
docker-compose logs --tail=100 nginx

# Sauvegarder les logs
docker-compose logs app > app_logs.txt
```

## 🆘 Problèmes Courants

**Port déjà utilisé?**
```bash
lsof -i :5000  # Voir quel processus utilise le port
```

**Conteneur qui crash?**
```bash
docker-compose up app  # Sans -d, pour voir les logs en direct
```

**Certificats SSL invalides?**
```bash
openssl x509 -in nginx/ssl/hinneh-education.ci.crt -text -noout
```

## 📚 Documentation Complète

Voir [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) pour:
- Guide complet de déploiement
- Configuration avancée
- Troubleshooting détaillé
- Maintenance et backups

## 🤝 Contribution

Pour des améliorations à l'infrastructure:
1. Créer une branche `infra/feature-name`
2. Tester localement avec Docker Compose
3. Soumettre une PR

## 📞 Contacts

- DevOps: devops@hinneh-education.ci
- Issues: https://github.com/hinneh/education/issues
