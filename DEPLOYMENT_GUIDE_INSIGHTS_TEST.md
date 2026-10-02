# Guide Déploiement — educ.insights-view.ci (BD: insights_test)

**Environnement** : Développement/Test  
**Domaine** : educ.insights-view.ci  
**Base de Données** : insights_test (MySQL)  
**Date** : 2026-08-21

---

## 🚀 Étapes Déploiement

### 1. Préparation

```bash
# SSH sur le serveur
ssh user@educ.insights-view.ci

# Naviguer vers le répertoire du projet
cd /path/to/insights-view

# Créer backup BD (précaution)
mysqldump -u [USER] -p insights_test > backup_insights_test_2026-08-21.sql

# Vérifier versions
python --version   # ≥3.9
node --version     # ≥16
```

### 2. Déployer Backend

```bash
# Arrêter service API
sudo systemctl stop insights-api

# Extraire le archive backend
unzip deploy_backend.zip -d /path/to/insights-view/api

# Installer dépendances (y compris qrcode, pillow)
cd /path/to/insights-view/api
pip install -r requirements.txt

# Créer tables BD (via SQLAlchemy)
python -c "
from app.database import Base, engine
from app import models  # Import pour charger tous les modèles
Base.metadata.create_all(engine)
print('✓ Tables créées')
"

# Vérifier connexion BD
mysql -u [USER] -p insights_test -e "
  SELECT COUNT(*) as tables_count FROM information_schema.TABLES 
  WHERE TABLE_SCHEMA='insights_test';
"

# Redémarrer API
sudo systemctl start insights-api
sudo systemctl status insights-api
```

### 3. Déployer Frontend

```bash
# Extraire frontend
unzip deploy_frontend.zip -d /path/to/insights-view/frontend

# Copier build vers serveur web
sudo cp -r /path/to/insights-view/frontend/dist/* /var/www/educ.insights-view.ci/

# Redémarrer serveur web
sudo systemctl restart nginx
# ou
sudo systemctl restart apache2

# Vérifier
curl https://educ.insights-view.ci/
```

### 4. Vérification Post-Déploiement

```bash
# Health check API
curl https://educ.insights-view.ci/api/health

# Vérifier new endpoints
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://educ.insights-view.ci/api/reductions/

curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://educ.insights-view.ci/api/dossiers/eleve/1

# Vérifier tables BD
mysql -u [USER] -p insights_test -e "
  SHOW COLUMNS FROM api_reduction;
  SELECT COUNT(*) FROM api_reduction;
"

# Monitorer logs
tail -f /var/log/insights-api/error.log
tail -f /var/log/insights-api/access.log
```

---

## 📊 Tables BD Créées/Modifiées

### Nouvelle Table
```sql
CREATE TABLE api_reduction (
  id INT PRIMARY KEY AUTO_INCREMENT,
  eleve_id INT,
  ecole_id INT,
  ET_CODEETABLISSEMENT VARCHAR(50),
  type_reduction VARCHAR(30),
  montant_reduction DECIMAL(12,2),
  pourcentage_reduction DECIMAL(5,2),
  motif TEXT,
  date_debut DATE,
  date_fin DATE,
  statut VARCHAR(20),
  appliquee_aux_echeances BOOLEAN,
  service_type VARCHAR(50),
  date_creation DATETIME,
  date_modification DATETIME,
  FOREIGN KEY (eleve_id) REFERENCES api_eleve(id) ON DELETE CASCADE
);
```

### Tables Modifiées
- `api_eleve` : Relation `reductions` ajoutée (cascade)
- Autres tables : Aucune modification de schema

---

## 🔧 Configuration Post-Déploiement

### Variables d'Environnement (si nécessaire)

Vérifier dans `.env` ou config :
```bash
# Base de données
DB_NAME=insights_test
DB_USER=[votre_user]
DB_PASSWORD=[votre_mdp]
DB_HOST=localhost

# API
API_URL=https://educ.insights-view.ci/api
FRONTEND_URL=https://educ.insights-view.ci

# Middleware école
MIDDLEWARE_ENABLED=true
SCHOOL_CODE_STRICT_MODE=true  # Rejette codes ambigus
```

### Fichiers Config Existants

Si vous avez des fichiers de config spécifiques, vérifier :
- `api/app/config.py` ou `.env`
- Routes CORS (si frontend et API sur domaines différents)
- Chemins uploads/assets

---

## 🧪 Test des Nouveaux Modules

### Chantier 2: Dossier Élève
```bash
curl -H "Authorization: Bearer TOKEN" \
  https://educ.insights-view.ci/api/dossiers/eleve/1
# Retour: { scolarite, paiements, notes, absences }
```

### Chantier 3: RH Demandes
```bash
# Créer demande absence
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date_absence": "2026-08-22", "motif": "Maladie"}' \
  https://educ.insights-view.ci/api/rh/absence/creer

# Voir ses demandes
curl -H "Authorization: Bearer TOKEN" \
  https://educ.insights-view.ci/api/rh/absence/mes-demandes
```

### Chantier 4: Badges QR
```bash
# Générer QR pour élève 1 (retourne PNG)
curl -H "Authorization: Bearer TOKEN" \
  https://educ.insights-view.ci/api/badges/eleve/1/qr -o qr_eleve1.png

# Frontend: Ouvrir https://educ.insights-view.ci/#/badges-qr/1
```

### Chantier 6: Réductions
```bash
# Lister réductions
curl -H "Authorization: Bearer TOKEN" \
  https://educ.insights-view.ci/api/reductions/

# Créer réduction (montant fixe)
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "eleve_id": 1,
    "type_reduction": "montant",
    "montant_reduction": 50000,
    "motif": "Bourse d'\''étude"
  }' \
  https://educ.insights-view.ci/api/reductions/

# Appliquer réduction aux échéanciers
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  https://educ.insights-view.ci/api/reductions/1/disperse
```

---

## ⚠️ Points Importants

### Chantier 1: Context Établissement
- **Middleware** valide isolation école à chaque requête
- Code établissement non-unique → rejeté si ambigu
- Vérifier logs pour messages "ambiguous school code"

### Chantier 5: Bugs Sécurité
- 7 endpoints maintenant valident `scope`
- Scripts/imports externes doivent passer l'école valide
- **Anciens imports sans école** : seront rejetés

### QRCode/Pillow
- Dépendances : `pip install qrcode pillow`
- Sinon : `ModuleNotFoundError: No module named 'qrcode'`

---

## 🔙 Rollback d'Urgence

```bash
# Si erreur après déploiement
sudo systemctl stop insights-api

# Restaurer BD
mysql -u [USER] -p insights_test < backup_insights_test_2026-08-21.sql

# Restaurer code (si sous git)
git checkout HEAD~1 api/

# Redémarrer
sudo systemctl start insights-api
```

---

## 📋 Checklist

- [ ] Backup BD créé (`backup_insights_test_2026-08-21.sql`)
- [ ] Backend extrait et dépendances installées
- [ ] Tables BD créées (`api_reduction`, etc.)
- [ ] Frontend extrait et copié vers `/var/www/educ.insights-view.ci/`
- [ ] API redémarrée sans erreurs
- [ ] Frontend accessible sur https://educ.insights-view.ci/
- [ ] Tests curl pour chaque nouveau endpoint
- [ ] Logs vérifiés (no critical errors)
- [ ] Routes frontend accessibles (#/dossiers-eleve, #/rh-demandes, #/badges-qr, #/reductions)
- [ ] Tests permission par rôle (directeur, éducateur, etc.)

---

## 📞 Dépannage

### "ModuleNotFoundError: No module named 'qrcode'"
```bash
pip install qrcode>=7.4.2 pillow>=9.5.0
systemctl restart insights-api
```

### "Table 'api_reduction' doesn't exist"
```bash
python -c "from app.database import Base, engine; from app import models; Base.metadata.create_all(engine)"
```

### "ambiguous school code" in logs
- Code d'école réutilisé par plusieurs cycles
- Middleware refuse d'assigner automatiquement
- **Solution** : Utiliser IDETABLISSEMENT (ID numérique) au lieu du code

### CORS errors frontend → API
Vérifier `api/app/main.py` pour configuration CORS avec domaine correct

---

*Guide pour insights_test — édition 2026-08-21*
