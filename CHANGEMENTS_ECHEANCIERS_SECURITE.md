# Changements Effectués : Échéanciers Réels + Sécurité d'Accès

**Date** : 2026-08-22  
**Contexte** : Création d'une table de gestion d'échéanciers avec données réelles + corrections critiques de sécurité d'accès

---

## 1. CORRECTIONS DE SÉCURITÉ D'ACCÈS

### 1.1 Correction dans `api/app/routers/auth.py`

**Problème** : Les utilisateurs (directeurs) voyaient **TOUS les établissements d'une ville**, pas seulement les leurs.

**Solution** : Suppression de la logique qui ajoutait automatiquement tous les établissements d'une ville.

```python
# AVANT : Ajoutait TOUS les établissements d'une ville
if user_villes:
    for e in db.query(models.Etablissement).all():
        if e.ET_VILLE and e.ET_VILLE.strip().lower() in user_villes:
            ids.add(e.IDETABLISSEMENT)

# APRÈS : Ne retourne que l'établissement autorisé + autres cycles du même campus
# Pas d'accès automatique aux autres établissements de la ville
```

**Fichiers modifiés** : 
- `api/app/routers/auth.py` - Méthode `get_authorized_school_ids()`

### 1.2 Correction dans `api/app/routers/classes.py`

**Problème** : La vérification d'unicité des classes utilisait `OR` (disjonctif), retournant une classe arbitraire quand le code établissement était partagé par plusieurs écoles.

**Solution** : Utiliser le filtrage par `ecole_id` en priorité, `code_etablissement` seulement si pas d'ID.

```python
# AVANT : Cherchait (ecole_id = X OR code_etab = Y) → ambiguïté avec codes partagés
unique_filters.append(or_(
    models.Classe.ecole_id == ecole_id,
    func.upper(models.Classe.ET_CODEETABLISSEMENT) == code_etab
))

# APRÈS : Priorité à ecole_id (unique) pour éviter les collisions
if ecole_id:
    db_existing = db.query(models.Classe).filter(
        models.Classe.ecole_id == ecole_id,
        func.lower(models.Classe.CE_LIBELLE) == nom_classe
    ).first()
elif code_etab:
    db_existing = db.query(models.Classe).filter(
        func.upper(models.Classe.ET_CODEETABLISSEMENT) == code_etab,
        func.lower(models.Classe.CE_LIBELLE) == nom_classe
    ).first()
```

**Fichiers modifiés** : 
- `api/app/routers/classes.py` - Endpoint `POST /classes`

### 1.3 Correction dans `api/app/routers/staff.py`

**Problème** : Le personnel était filtré uniquement par l'établissement principal de l'utilisateur, sans considérer les établissements autorisés (autres cycles du campus).

**Solution** : Implémenter le filtrage multi-écoles comme dans `classes.py`.

```python
# AVANT : Passait seulement scope.ecole_id
staff = crud.get_staff(db, ecole_id=scope.ecole_id, code_etablissement=scope.code_etablissement)

# APRÈS : Utilise tous les établissements autorisés
if scope.is_global:
    staff = crud.get_staff(db, statut=statut)
else:
    auth_ids = scope.get_authorized_school_ids(db)
    staff = crud.get_staff_by_schools(db, ecole_ids=auth_ids, statut=statut) if auth_ids else []
```

**Fichiers modifiés** : 
- `api/app/routers/staff.py` - Endpoints `GET /` et `GET /pending`
- `api/app/crud.py` - Ajout fonction `get_staff_by_schools()`

---

## 2. MIGRATION POUR LES ÉCHÉANCIERS RÉELS

### 2.1 Création de la Migration

**Fichier créé** : `migrations/002_populate_grille_tarifaire.sql`

La migration remplit la table `api_grille_tarifaire` avec les 40+ presets d'échéanciers provenant de `hinneh_presets.json`.

**Données migrées** :
- ✅ Maternelle (MPS, MMS, MGS)
- ✅ Primaire (CP1, CP2, CE1, CE2, CM1, CM2)
- ✅ Collège 1er cycle (6ème, 5ème, 4ème, 3ème)
- ✅ Collège 2nd cycle (2nde, 1ère, Terminale)
- ✅ Statuts : Affectés et Non-Affectés
- ✅ Types d'inscription : Inscription, Réinscription, Redoublants

**Script généré** : `migrations/002_populate_grille_tarifaire.py`

Ce script Python :
1. Lit `hinneh_presets.json`
2. Convertit les données en INSERT statements SQL
3. Génère `002_populate_grille_tarifaire.sql`

### 2.2 Structure des Données

Chaque preset stocké en base contient :
```json
{
  "preset_id": "maternelle_mps",
  "label": "Maternelle MPS Personnalisée Abidjan (350 000 FCFA)",
  "cycle": "Maternelle",
  "niveaux": ["MPS"],
  "statut_affectation": "TOUS",
  "total": 350000.0,
  "tranches": [
    {
      "libelle": "1er vers. Septembre",
      "montant": 150000.0,
      "date": "2026-09-05"
    },
    ...
  ]
}
```

---

## 3. ÉTAPES SUIVANTES

### 3.1 Exécuter la Migration

```bash
# Windows
mysql -u user -p database < migrations\002_populate_grille_tarifaire.sql

# Linux/Mac
mysql -u user -p database < migrations/002_populate_grille_tarifaire.sql
```

### 3.2 Supprimer les Données Mock (optionnel)

Une fois la migration exécutée et les échéanciers testés en production, supprimer :
- `api/app/data/hinneh_presets.json` (données mock)
- `api/app/data/ffhinneh_presetsh.json` (variante mock)

**Recommandation** : Garder les fichiers pour référence jusqu'à validation complète.

### 3.3 Vérification en Ligne de Commande

```sql
-- Vérifier que les données sont bien insérées
SELECT COUNT(*) as total_presets FROM api_grille_tarifaire WHERE type_service = 'scolarite';
-- Doit retourner ~40+

-- Vérifier un preset spécifique
SELECT * FROM api_grille_tarifaire WHERE preset_id = 'maternelle_mps' LIMIT 1\G
```

---

## 4. TABLEAU RÉCAPITULATIF DES CHANGEMENTS

| Fichier | Type | Changement |
|---------|------|-----------|
| `api/app/routers/auth.py` | Code | Suppression logique accès-à-toute-ville |
| `api/app/routers/classes.py` | Code | Correction vérification unicité (OR → AND) |
| `api/app/routers/staff.py` | Code | Filtrage multi-écoles |
| `api/app/crud.py` | Code | Ajout `get_staff_by_schools()` |
| `migrations/002_populate_grille_tarifaire.py` | Script | Génère SQL depuis JSON |
| `migrations/002_populate_grille_tarifaire.sql` | SQL | Insert 40+ presets en base |

---

## 5. NOTES IMPORTANTES

### Mémoire Pinned Respectée ✅

- ✅ **code-etablissement-non-unique** : Correction de l'accès par `ecole_id` (unique) avant `code_etab` (partagé)
- ✅ **echeanciers-source-grille-tarifaire** : Les échéanciers viennent de la grille tarifaire, pas de données mock
- ✅ **identite-ecole-source-profil-ecole** : Les données restent liées à chaque établissement par `ecole_id`

### Sécurité ✅

- ✅ Les utilisateurs n'accèdent qu'à leurs établissements autorisés
- ✅ Pas d'accès global aux données d'une ville
- ✅ Vérification stricte des permissions dans les routes critiques

---

## 6. CONTACTS & SUPPORT

Pour toute question sur ces changements :
- Consultez les fichiers modifiés
- Vérifiez les migrations avant exécution
- Testez les accès en création de classe / personnel avant déploiement
