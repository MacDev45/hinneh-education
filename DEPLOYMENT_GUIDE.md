# Guide de Déploiement Hînneh v2.6 — Production hinneh-education.ci

**Date**: 2026-08-21  
**Version**: 2.6.0-chantiers-1-6  
**Statut**: Prêt pour production

---

## 📋 Résumé des Changements

### Chantier 1 : Context Établissement ✅
- **Middleware** : `api/app/school_middleware.py` (NEW)
  - Intercepte toutes les requêtes
  - Extrait code école depuis headers/params/JWT
  - Invalide les sélections ambiguës (code non-unique)
- **Listener ORM** : `database.py` → `auto_propagate_school_codes_on_flush()`
  - Refuse stampage arbitraire quand code est ambigu
  - Mappe code→ID seulement si unique
- **Auth** : `routers/auth.py` → `get_effective_ecole_id()`
  - Résout code ambigus aux données de contexte

### Chantier 2 : Dossier Élève ✅
- **Backend** : `routers/dossiers.py` (NEW)
  - `GET /api/dossiers/eleve/{eleve_id}` → infos financières + présences + notes
- **Frontend** : `src/pages/DossierEleveSpace.tsx` (NEW)
  - Affichage complet du dossier étudiant

### Chantier 3 : RH (Demandes) ✅
- **Backend** : `routers/rh_demandes.py` (NEW)
  - Absences, congés, attestations de travail
- **Frontend** : `src/pages/RHDemandesSpace.tsx` (NEW)
  - Interface multi-onglets pour demandes RH

### Chantier 4 : Badges QR ✅
- **Backend** : `routers/badges_qr.py` (NEW)
  - `GET /api/badges/eleve/{eleve_id}/qr` → PNG QR code
- **Frontend** : `src/pages/BadgesQRSpace.tsx` (NEW)
  - Téléchargement/impression QR
- **Dépendances** : qrcode ≥7.4.2, pillow ≥9.5.0

### Chantier 5 : Bugs Sécurité (7 critiques) ✅
| Fichier | Endpoint | Bug | Fix |
|---------|----------|-----|-----|
| classes.py | PUT /{class_id} | Pas de scope | ✅ Ajouté scope + vérif ecole_id |
| classes.py | POST /import | Établissement par défaut | ✅ Rejette si école absente |
| echeancier.py | POST / | Pas de scope | ✅ Ajouté scope |
| echeancier.py | PUT /{id} | Pas de scope | ✅ Ajouté scope |
| transport.py | PUT /tarifs-db/{id} | Pas de scope | ✅ Ajouté scope |
| transport.py | POST /lignes | Pas scope/code | ✅ Scope + code_etablissement |
| transport.py | POST /import | Pas scope/code | ✅ Scope + vérif élève + code |

### Chantier 6 : Gestion Réductions ✅
- **Model** : `models.py` → `Reduction` (NEW)
  - Types : montant, pourcentage, bourse, subvention
  - Statuts : actif, expire, supprime
  - Relation : Eleve.reductions (cascade)
- **Backend** : `routers/reductions.py` (NEW)
  - CRUD complet
  - **Dispersement proportionnel** : `/reductions/{id}/disperse` → répartit sur échéanciers
  - Création en masse : `/bulk-create`
- **Frontend** : `src/pages/ReductionsManagementSpace.tsx` (NEW)
  - Gestion réductions par élève

---

## 🚀 Étapes de Déploiement

### 1. Préparation Serveur

```bash
cd /path/to/hinneh-production
git pull origin main

# Créer backup avant déploiement
mysqldump -u root -p insights_central > backup_2026-08-21.sql

# Vérifier versions Python/Node
python --version  # ≥3.9
node --version    # ≥16
npm --version     # ≥8
```

### 2. Extraire et Déployer Backend

```bash
# Arrêter le service API
sudo systemctl stop hinneh-api

# Extraire deploy_backend.zip
unzip deploy_backend.zip -d /path/to/hinneh/api

# Installer dépendances nouvelles
pip install -r api/requirements.txt

# Appliquer migrations BD (si créées via ORM)
# Note: Alembic non configuré dans ce projet; créations auto via SQLAlchemy
python -c "from api.app.database import Base, engine; Base.metadata.create_all(engine)"

# Redémarrer API
sudo systemctl start hinneh-api
sudo systemctl status hinneh-api
```

### 3. Extraire et Déployer Frontend

```bash
# Construire artefacts
unzip deploy_frontend.zip -d /path/to/hinneh/frontend

# Copier vers serveur web
cp -r frontend/dist/* /var/www/hinneh-education.ci/

# Redémarrer serveur web
sudo systemctl restart nginx
# ou
sudo systemctl restart apache2
```

### 4. Validation Post-Déploiement

```bash
# Vérifier API
curl https://hinneh-education.ci/api/health

# Vérifier endpoints nouveaux
curl -H "Authorization: Bearer TOKEN" https://hinneh-education.ci/api/reductions/
curl -H "Authorization: Bearer TOKEN" https://hinneh-education.ci/api/dossiers/eleve/1

# Vérifier BD
mysql -u root -p insights_central -e "SELECT COUNT(*) FROM api_reduction;"
mysql -u root -p insights_central -e "SHOW COLUMNS FROM api_reduction;"

# Vérifier logs
tail -f /var/log/hinneh-api/error.log
```

---

## 📦 Fichiers à Déployer

### Backend (`deploy_backend.zip` — 167 KB)
```
api/
├── app/
│   ├── models.py                  (MODIFIÉ: +Reduction model)
│   ├── main.py                    (MODIFIÉ: +reductions router)
│   ├── school_middleware.py       (NEW)
│   ├── database.py                (MODIFIÉ: listener ambiguïté code)
│   ├── routers/
│   │   ├── auth.py                (MODIFIÉ: get_effective_ecole_id)
│   │   ├── classes.py             (MODIFIÉ: 2 bugs security)
│   │   ├── echeancier.py          (MODIFIÉ: 2 bugs security)
│   │   ├── transport.py           (MODIFIÉ: 3 bugs security)
│   │   ├── dossiers.py            (NEW)
│   │   ├── rh_demandes.py         (NEW)
│   │   ├── badges_qr.py           (NEW)
│   │   └── reductions.py          (NEW)
│   └── requirements.txt           (MODIFIÉ: +qrcode, +pillow)
```

### Frontend (`deploy_frontend.zip` — 11.5 MB)
```
src/
├── pages/
│   ├── DossierEleveSpace.tsx      (NEW)
│   ├── RHDemandesSpace.tsx        (NEW)
│   ├── BadgesQRSpace.tsx          (NEW)
│   ├── ReductionsManagementSpace.tsx (NEW)
│   └── [autres pages existantes]
├── App.tsx                        (MODIFIÉ: +4 routes)
└── lib/index.ts                   (MODIFIÉ: +4 paths)
```

---

## ⚠️ Points Critiques

### 1. Migration Base de Données
- **Table NEW** : `api_reduction` (créée automatiquement par SQLAlchemy)
- **Colonnes MODIFIÉES** : Aucune modification de colonnes existantes
- **Backward Compatible** : ✅ Oui (tous les champs nouveaux sont nullable)

### 2. Accès Multi-École
- **ET_CODEETABLISSEMENT** : Non-unique, ambigu sur multi-cycles
- **IDETABLISSEMENT** : Identifiant numérique unique → UTILISÉ EN PRIORITÉ
- **Middleware** : Valide le contexte école à chaque requête
- **ORM Listener** : Refuse d'assigner code ambigus
- → **Vérifier** : Aucune classe/élève ne perd son école après déploiement

### 3. Permissions Scope
- **7 endpoints corrigés** pour valider scope
- **Breakage potentiel** : Scripts externes qui bypaient permissions doivent être mis à jour
- **Audit** : Vérifier logs de rejets 403 après déploiement

### 4. Dépendances Nouvelles
```
qrcode>=7.4.2
pillow>=9.5.0
```
→ Installer avant démarrage API

---

## 🔍 Rollback d'Urgence

```bash
# Si erreur critique post-déploiement
sudo systemctl stop hinneh-api

# Restaurer DB
mysql -u root -p insights_central < backup_2026-08-21.sql

# Restaurer code depuis Git
git checkout HEAD~1 api/

# Redémarrer
sudo systemctl start hinneh-api
```

---

## ✅ Checklist Déploiement

- [ ] Backup BD créé (`backup_2026-08-21.sql`)
- [ ] Fichiers `deploy_*.zip` extraits
- [ ] `pip install -r requirements.txt` exécuté
- [ ] Tables BD créées (Reduction, etc.)
- [ ] API redémarrée sans erreurs
- [ ] Frontend recompilé et distribué
- [ ] Endpoints nouveaux testés (curl ou Postman)
- [ ] Routes frontend accessibles (REDUCTIONS, DOSSIER_ELEVE, RH_DEMANDES, BADGES_QR)
- [ ] Tests de permission (scope school) validés
- [ ] Logs vérifiés (pas d'erreurs critiques)

---

## 📞 Support

En cas de problème :
1. Vérifier `/var/log/hinneh-api/error.log`
2. Vérifier connexion BD : `mysql -u root -p insights_central -e "SELECT 1;"`
3. Vérifier middleware : `curl -v https://hinneh-education.ci/api/health`
4. Rollback si nécessaire

**Contact** : dagnsoul@gmail.com
