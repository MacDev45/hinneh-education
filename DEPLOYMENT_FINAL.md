# DÉPLOIEMENT FINAL — educ.insights-view.ci (insights_test)

**Date** : 2026-08-21  
**Changements** : Login école + Menu modules + Filtrage multi-école

---

## 🚀 Déploiement Rapide

### 1. SSH sur le serveur
```bash
ssh [user]@educ.insights-view.ci
cd /path/to/insights-view
```

### 2. Backup BD
```bash
mysqldump -u [user] -p insights_test > backup_2026-08-21_final.sql
```

### 3. Déployer Backend (Chantier 1 + Bug Login)
```bash
# Arrêter API
sudo systemctl stop insights-api

# Extraire backend
unzip deploy_backend.zip -d api

# Installer dépendances
pip install -r api/requirements.txt

# Créer/mettre à jour tables BD
python -c "from api.app.database import Base, engine; from api.app import models; Base.metadata.create_all(engine)"

# Redémarrer
sudo systemctl start insights-api
sudo systemctl status insights-api
```

### 4. Déployer Frontend (Menu + Modules)
```bash
# Extraire frontend
unzip deploy_frontend.zip -d frontend

# Copier build vers web
sudo cp -r frontend/dist/* /var/www/educ.insights-view.ci/

# Redémarrer web
sudo systemctl restart nginx
# ou
sudo systemctl restart apache2
```

### 5. Vérifier (3 points critiques)

#### ✅ Test 1 : Login retourne l'école
```bash
curl -X POST https://educ.insights-view.ci/api/login \
  -H "Content-Type: application/json" \
  -d '{"username": "directeur", "password": "Code@123"}' \
  | jq '.ecole_id'

# Avant fix: null
# Après fix: 1 (ou votre ID école)
```

#### ✅ Test 2 : Menu affiche les modules
Ouvrir https://educ.insights-view.ci et vérifier :
- Menu "Espaces dédiés" contient :
  - ✓ Dossier Élève (FileText icon)
  - ✓ Demandes RH (UserCog icon)
  - ✓ Badges QR (QrCode icon)
  - ✓ Gestion Réductions (Percent icon)

#### ✅ Test 3 : Accès aux modules
```bash
# Remplacer TOKEN par votre JWT
TOKEN="eyJ..."

# Dossier Élève (ID 1)
curl -H "Authorization: Bearer $TOKEN" \
  https://educ.insights-view.ci/api/dossiers/eleve/1 | jq '.' | head -20

# Réductions (liste)
curl -H "Authorization: Bearer $TOKEN" \
  https://educ.insights-view.ci/api/reductions/ | jq '.' | head -20

# Badges QR (générer PNG pour élève 1)
curl -H "Authorization: Bearer $TOKEN" \
  https://educ.insights-view.ci/api/badges/eleve/1/qr -o qr_test.png
ls -lh qr_test.png
```

---

## 📋 Fichiers déployés

### Backend
- `api/app/routers/auth.py` — ✅ Login retourne ecole_id + ecole_code
- `api/app/school_middleware.py` — ✅ Propage contexte école
- `api/app/database.py` — ✅ Listener ORM filtre par école
- `api/app/routers/reductions.py` — ✅ Gestion réductions
- `api/app/routers/dossiers.py` — ✅ Dossier élève
- `api/app/routers/rh_demandes.py` — ✅ RH demandes
- `api/app/routers/badges_qr.py` — ✅ QR codes

### Frontend
- `src/components/Layout.tsx` — ✅ Menu + 4 modules
- `src/pages/DossierEleveSpace.tsx` — ✅ Dossier élève
- `src/pages/RHDemandesSpace.tsx` — ✅ RH demandes
- `src/pages/BadgesQRSpace.tsx` — ✅ QR codes
- `src/pages/ReductionsManagementSpace.tsx` — ✅ Réductions

---

## 🔧 Troubleshooting

### Erreur 522 sur /api/villes
```bash
# Vérifier API
curl https://educ.insights-view.ci/api/health

# Vérifier logs
tail -f /var/log/insights-api/error.log
```

### Login échoue
```bash
# Vérifier BD
mysql -u [user] -p insights_test -e "SELECT COUNT(*) FROM user_educ;"

# Vérifier token secret
grep -i "secret\|jwt" api/app/config.py
```

### Menu ne montre pas modules
```bash
# Vérifier browser cache
# Ctrl+Shift+Delete (vider cache)
# Ou ouvrir en mode privé
```

### Modules ne s'affichent pas
```bash
# Vérifier routes
curl -H "Authorization: Bearer $TOKEN" \
  https://educ.insights-view.ci/api/dossiers/eleve/1

# Vérifier erreurs browser (F12 Console)
```

---

## ✅ Checklist Final

- [ ] Backup BD créé
- [ ] Backend déployé (pip install ok)
- [ ] Tables BD créées (api_reduction, etc.)
- [ ] API redémarrée sans erreurs
- [ ] Frontend déployé
- [ ] Web redémarré
- [ ] Test 1 : Login retourne ecole_id ✓
- [ ] Test 2 : Menu affiche 4 modules ✓
- [ ] Test 3 : Endpoints accessibles ✓
- [ ] Vérifier logs (pas d'erreurs critiques)

---

## 📞 Support

Si problèmes :
1. Vérifier logs : `tail -f /var/log/insights-api/error.log`
2. Rollback : `mysql ... < backup_2026-08-21_final.sql && git checkout HEAD~1`
3. Contact : dagnsoul@gmail.com

---

*Déploiement v2.6-final-login-menu — 2026-08-21*
