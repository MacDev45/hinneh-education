# 🔒 Protection des Données - Guide de Déploiement

**Date** : 2026-08-22  
**Sujet** : Sécurité des données lors du déploiement  
**Base de données** : MySQL (insights_ce)

---

## ✅ VOS DONNÉES SONT PROTÉGÉES

### Tables Affectées par les Migrations

| Table | Migration | Action | Vos Données |
|-------|-----------|--------|-----------|
| `api_grille_tarifaire` | 002 | INSERT IGNORE | ✅ Préservées |
| `api_echeancier` | Aucune | N/A | ✅ Intactes |
| `api_tenue_scolaire` | 003 | CREATE TABLE | ✅ Nouvelle table |
| `api_eleve` | 001 | ALTER (colonnes) | ✅ Données existantes conservées |
| `api_classe` | Aucune | N/A | ✅ Intactes |
| `user_educ` | Aucune | N/A | ✅ Intactes |

---

## 📊 Explication Technique

### Migrations Sécurisées

#### Migration 001 : Inscription Process (`001_inscription_process_schema.sql`)
```sql
ALTER TABLE api_eleve ADD COLUMN IF NOT EXISTS ...
```
- ✅ Ajoute seulement des COLONNES
- ✅ Ne supprime rien
- ✅ Vos données élèves intactes

#### Migration 002 : Grille Tarifaire (`002_populate_grille_tarifaire.sql`)
```sql
-- AVANT (non sûr) :
DELETE FROM api_grille_tarifaire WHERE type_service = 'scolarite';
INSERT INTO api_grille_tarifaire ...

-- APRÈS (sécurisé) : ✅
INSERT IGNORE INTO api_grille_tarifaire ...
```
- ✅ `INSERT IGNORE` au lieu de `DELETE`
- ✅ Les presets existants restent
- ✅ Les nouveaux presets s'ajoutent s'ils n'existent pas
- ✅ Les échéanciers saisis restent inchangés

#### Migration 003 : Tenues Scolaires (`003_create_tenue_scolaire_table.sql`)
```sql
CREATE TABLE IF NOT EXISTS `api_tenue_scolaire` ...
```
- ✅ Crée UNE NOUVELLE TABLE
- ✅ N'affecte aucune donnée existante

---

## 🛡️ Différences Entre Tables

### `api_grille_tarifaire` (Modèles de Tarification)

**Contenu** :
- Presets officiels d'Hînneh
- Maternelle, Primaire, Collège, Lycée
- Tranches de paiement par profil

**Affecté par** :
- Migration 002 ✅ (INSERT IGNORE = sûr)

**Exemple** :
```json
{
  "id": 1,
  "preset_id": "maternelle_mps",
  "label": "Maternelle MPS (350 000 FCFA)",
  "cycle": "Maternelle",
  "niveaux": ["MPS"],
  "total": 350000.0,
  "tranches": [...]
}
```

### `api_echeancier` (Échéanciers Saisis)

**Contenu** :
- ✅ Vos échéanciers pour chaque élève
- ✅ Les données saisies dans l'interface
- ✅ Les montants payés/restants
- ✅ Les dates d'échéance

**Affecté par** :
- ❌ AUCUNE MIGRATION
- ✅ Totalement protégés

**Exemple** :
```json
{
  "id": 42,
  "eleve_id": 123,
  "libelle": "Scolarité 1er trimestre",
  "montant_prevu": 157000,
  "montant_paye": 0,
  "date_echeance": "2026-09-05",
  "statut": "non_paye"
}
```

---

## 🔄 Relation Entre les Tables

```
┌─────────────────────────────────────────┐
│   api_grille_tarifaire (Presets)        │
│  Modèles de tarification officiels       │
│  - Maternelle MPS: 350 000 FCFA         │
│  - Primaire CP1/CP2: 195 500 FCFA       │
│  - etc.                                  │
└───────────────┬─────────────────────────┘
                │ (référencé par)
                │
┌───────────────▼─────────────────────────┐
│     api_echeancier (VOS DONNÉES)        │
│  Échéanciers réels saisis par l'école   │
│  - Élève 123: 157 000 FCFA (non payé)  │
│  - Élève 456: 195 500 FCFA (partiellement payé)
│  - etc. (VOS DONNÉES INTACTES)          │
└─────────────────────────────────────────┘
```

---

## ⚠️ Scénarios de Déploiement

### Scénario 1 : Premier Déploiement (Base Vide)

```
AVANT DÉPLOIEMENT :
  api_grille_tarifaire : VIDE
  api_echeancier : VIDE

MIGRATION 002 :
  INSERT IGNORE → Ajoute 40+ presets

APRÈS DÉPLOIEMENT :
  api_grille_tarifaire : 40+ presets ✅
  api_echeancier : VIDE (normal, aucun élève enregistré)
```

### Scénario 2 : Déploiement avec Données Existantes

```
AVANT DÉPLOIEMENT :
  api_grille_tarifaire : 40 presets existants
  api_echeancier : 156 échéanciers d'élèves ✅ À PROTÉGER

MIGRATION 002 :
  INSERT IGNORE → Essaie d'ajouter les 40 presets
  Résultat : Ignore les doublons, ajoute les nouveaux
  ❌ PAS de DELETE (sûr maintenant ✅)

APRÈS DÉPLOIEMENT :
  api_grille_tarifaire : 40+ presets (conservés + ajoutés) ✅
  api_echeancier : 156 échéanciers intacts ✅ SÉCURISÉ
```

### Scénario 3 : Redéploiement Production

```
AVANT REDÉPLOIEMENT :
  api_grille_tarifaire : Vos presets + données existantes
  api_echeancier : Tous vos échéanciers saisis ✅

MIGRATIONS (2, 3) :
  INSERT IGNORE → Cherche conflits de clés
  CREATE TABLE → Crée nouvelle table tenues (n'affecte rien)

APRÈS REDÉPLOIEMENT :
  api_grille_tarifaire : Inchangé (clés existantes ignorées) ✅
  api_echeancier : 100% intacts ✅ IMPORTANT
  api_tenue_scolaire : Nouvelle table créée ✅
```

---

## 🔑 Points Clés de Sécurité

### 1. **Docker Volumes Persistent**

```yaml
volumes:
  mysql_data:
    driver: local  # ✅ Données persist même si conteneur redémarre
```

✅ Vos données **ne sont PAS supprimées** si vous redémarrez Docker

### 2. **INSERT IGNORE (Protection)

```sql
-- ✅ SÛRE : Les données existantes restent
INSERT IGNORE INTO api_grille_tarifaire ...

-- ❌ DANGEREUX : Supprime tout (corrigé)
DELETE FROM api_grille_tarifaire;
INSERT INTO api_grille_tarifaire ...
```

✅ Maintenant changé à `INSERT IGNORE` (non destructif)

### 3. **ALTER TABLE (Non-Destructif)**

```sql
-- ✅ SÛRE : Ajoute colonnes seulement
ALTER TABLE api_eleve ADD COLUMN IF NOT EXISTS ...

-- ❌ JAMAIS FAIT : Supprimer données
DROP TABLE api_eleve;
DELETE FROM api_eleve;
```

✅ Migration 001 ne supprime rien

### 4. **CREATE TABLE IF NOT EXISTS (Idempotent)**

```sql
-- ✅ SÛRE : Crée seulement si n'existe pas
CREATE TABLE IF NOT EXISTS `api_tenue_scolaire` ...

-- ❌ JAMAIS FAIT : Supprimer données
DROP TABLE IF EXISTS;
CREATE TABLE ...
```

✅ Migration 003 crée nouvelle table sans affecter existantes

---

## 📋 Checklist Avant Déploiement

- [x] Migration 001 : ALTER (ajoute colonnes) ✅
- [x] Migration 002 : INSERT IGNORE (préserve données) ✅
- [x] Migration 003 : CREATE TABLE IF NOT EXISTS (nouvelle table) ✅
- [x] Volumes Docker : Persistent ✅
- [x] Backup : Recommandé avant déploiement ✅

---

## 🚀 Recommandations

### AVANT DE DÉPLOYER EN PRODUCTION

1. **Sauvegarde** (5 minutes)
   ```bash
   docker exec hinneh_mysql mysqldump -u hinneh_user -p insights_ce > backup_avant_deploy.sql
   tar -czf uploads_backup.tar.gz api/uploads/
   ```

2. **Test en Développement** (30 minutes)
   ```bash
   bash deployments/deploy.sh development
   # Vérifier que tout fonctionne
   ```

3. **Audit des Migrations** (10 minutes)
   - ✅ Vérifier : `INSERT IGNORE` (pas de DELETE)
   - ✅ Vérifier : `ALTER TABLE` (pas de DROP)
   - ✅ Vérifier : `CREATE TABLE IF NOT EXISTS`

4. **Déployer en Production**
   ```bash
   bash deployments/deploy.sh production
   ```

---

## 🆘 Récupération d'Urgence

### Si migration pose problème

```bash
# 1. Arrêter les services
docker-compose down

# 2. Restaurer la sauvegarde
docker exec hinneh_mysql mysql -u root -p < backup_avant_deploy.sql

# 3. Redémarrer
docker-compose up -d
```

---

## ✅ GARANTIES

| Donnée | Protection | Migr Affectée | Statut |
|--------|-----------|---------------|--------|
| Élèves (api_eleve) | ✅ ALTER | 001 | SÛRE |
| Échéanciers (api_echeancier) | ✅ AUCUNE | AUCUNE | SÛRE |
| Classes (api_classe) | ✅ AUCUNE | AUCUNE | SÛRE |
| Utilisateurs (user_educ) | ✅ AUCUNE | AUCUNE | SÛRE |
| Grille Tarif (api_grille_tarifaire) | ✅ INSERT IGNORE | 002 | SÛRE |
| Tenues (api_tenue_scolaire) | ✅ CREATE IF NOT EXISTS | 003 | SÛRE |

---

## 📞 Questions Fréquentes

### Q: Vais-je perdre mes échéanciers saisis ?
**R:** ❌ NON. Les échéanciers sont dans `api_echeancier`, aucune migration ne les touche.

### Q: La grille tarifaire sera-t-elle écrasée ?
**R:** ❌ NON. `INSERT IGNORE` ajoute sans supprimer les existants.

### Q: Dois-je resaisir les données après déploiement ?
**R:** ❌ NON. Toutes les données sont conservées.

### Q: Que se passe-t-il si je redéploie plusieurs fois ?
**R:** ✅ SÛRE. `INSERT IGNORE` rend le déploiement idempotent.

---

**Vos données sont protégées ! 🛡️**

Déployez avec confiance. Les migrations sont conçues pour préserver vos données.
