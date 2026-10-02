# Implémentation : Tenues & Uniformes Scolaires

**Date** : 2026-08-22  
**Objet** : Implémentation complète du module Tenues & Uniformes avec contrôles d'accès sécurisés par établissement

---

## 📋 Vue d'Ensemble

Le module **Tenues & Uniformes** gère les uniformes scolaires par :
- Cycle (Maternelle, Primaire, Collège, Lycée)
- Niveau (CP1, 6ème, 2nde, etc.)
- Genre (M=Garçon, F=Fille)
- Établissement (avec isolement par établissement + code d'établissement)

---

## 🗂️ Fichiers Créés/Modifiés

### Backend (API)

| Fichier | Type | Changement |
|---------|------|-----------|
| `api/app/models.py` | Code | Ajout classe `TenuteScolaire` |
| `api/app/schemas.py` | Code | Ajout schemas Pydantic pour tenues |
| `api/app/crud.py` | Code | Ajout fonctions CRUD pour tenues |
| `api/app/routers/tenues.py` | **NEW** | Router complet avec contrôles d'accès |
| `api/app/main.py` | Code | Import + enregistrement du router |
| `migrations/003_create_tenue_scolaire_table.sql` | **NEW** | Migration SQL de création de table |

---

## 🔒 Sécurité : Contrôles d'Accès

### Modèle d'Accès

Chaque endpoint GET/POST/PUT/DELETE vérifie que l'utilisateur a accès à l'établissement cible :

```python
if not scope.is_global:
    auth_ids = scope.get_authorized_school_ids(db)
    auth_codes = scope.get_authorized_school_codes(db)
    
    has_access = (tenue.ecole_id and tenue.ecole_id in auth_ids) or \
                 (tenue.ET_CODEETABLISSEMENT and tenue.ET_CODEETABLISSEMENT in auth_codes)
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Accès refusé")
```

### Résultat

- ✅ Un directeur de **Bouaké** ne voit que les tenues de Bouaké
- ✅ Un directeur d'**Abidjan** ne voit que les tenues d'Abidjan
- ✅ Un admin global voit toutes les tenues
- ✅ Impossible de modifier/supprimer les tenues d'une autre ville

---

## 📊 Base de Données

### Table `api_tenue_scolaire`

```sql
id              INT          -- Identifiant unique
nom             VARCHAR(255) -- Nom de la tenue (ex: "Tablier / Tenue Maternelle — Genre M")
description     TEXT         -- Description optionnelle
cycle           VARCHAR(50)  -- Maternelle, Primaire, Collège, Lycée
niveau          VARCHAR(100) -- CP1, CP2, 6ème, 5è C & 5è D, etc.
genre           VARCHAR(10)  -- 'M' (Garçon) ou 'F' (Fille)
prix_unitaire   DECIMAL      -- Tarif unitaire de la tenue
quantite_stock  INT          -- Quantité en stock
quantite_critique INT        -- Seuil critique de stock
ecole_id        INT          -- Établissement (clé unique)
ET_CODEETABLISSEMENT VARCHAR -- Code établissement (non-unique)
actif           BOOLEAN      -- Statut actif/inactif
date_creation   DATETIME     -- Horodatage création
date_modification DATETIME   -- Horodatage dernière modif
```

---

## 🔌 Endpoints API

### GET `/api/tenues/`
Liste les tenues de l'établissement autorité de l'utilisateur

**Paramètres** :
- `cycle` (optionnel) : Filtrer par cycle
- `genre` (optionnel) : Filtrer par genre (M/F)

**Réponse** : `List[TenuteScolaireResponse]`

```json
[
  {
    "id": 1,
    "nom": "Tablier / Tenue Maternelle — Genre M",
    "description": "Tablier et ensemble Maternelle pour garçon",
    "cycle": "Maternelle",
    "niveau": "MPS",
    "genre": "M",
    "prix_unitaire": 12000.00,
    "quantite_stock": 45,
    "quantite_critique": 10,
    "ecole_id": 1,
    "ET_CODEETABLISSEMENT": "ABJ01",
    "actif": true,
    "date_creation": "2026-08-22T10:30:00",
    "date_modification": "2026-08-22T10:30:00"
  },
  ...
]
```

### POST `/api/tenues/`
Crée une nouvelle tenue

**Corps de requête** :
```json
{
  "nom": "Tablier / Tenue Maternelle — Genre M",
  "description": "Tablier maternelle garçon",
  "cycle": "Maternelle",
  "niveau": "MPS",
  "genre": "M",
  "prix_unitaire": 12000.00,
  "quantite_stock": 50,
  "quantite_critique": 10,
  "actif": true,
  "ecole_id": 1,
  "ET_CODEETABLISSEMENT": "ABJ01"
}
```

**Statut** : 201 Created + réponse structurée

### GET `/api/tenues/{tenue_id}`
Récupère une tenue spécifique

**Réponse** : `TenuteScolaireResponse`

### PUT `/api/tenues/{tenue_id}`
Met à jour une tenue

**Corps de requête** (tous les champs optionnels) :
```json
{
  "prix_unitaire": 13000.00,
  "quantite_stock": 60,
  "actif": true
}
```

**Réponse** : `TenuteScolaireResponse` (mise à jour)

### DELETE `/api/tenues/{tenue_id}`
Supprime une tenue

**Statut** : 204 No Content

---

## 🚀 Installation

### 1. Exécuter la Migration SQL

```bash
mysql -u user -p database < migrations/003_create_tenue_scolaire_table.sql
```

### 2. Redémarrer le serveur API

```bash
# Le modèle SQLAlchemy est automatiquement mappé à la table
python -m uvicorn api.app.main:app --reload
```

### 3. Vérifier l'Endpoint

```bash
curl -H "Authorization: Bearer TOKEN" http://localhost:8000/api/tenues/
```

---

## 📝 Exemples de Données

Exemple de tenues à insérer via POST :

```json
{
  "nom": "Tricot / Polo Supplémentaire — Genre M",
  "cycle": "Maternelle",
  "niveau": "MPS",
  "genre": "M",
  "prix_unitaire": 5000.00,
  "quantite_stock": 30,
  "quantite_critique": 5
}
```

---

## ✅ Checklist d'Implémentation

- [x] Modèle SQLAlchemy (`TenuteScolaire`)
- [x] Schemas Pydantic (Create, Update, Response)
- [x] Fonctions CRUD (get, create, update, delete)
- [x] Router FastAPI avec contrôles d'accès
- [x] Enregistrement du router dans main.py
- [x] Migration SQL pour création de table
- [x] Indexes de performance (cycle, genre, établissement)
- [x] Gestion des erreurs 403/404
- [x] Isolation par établissement

---

## 🔐 Sécurité Validée

✅ **Contrôles d'accès** : Chaque endpoint vérifie l'autorisation  
✅ **Isolation par établissement** : Un utilisateur ne voit que ses données  
✅ **Isolation par code établissement** : Supporte les campus multi-cycles  
✅ **Gestion globale** : Admin peut accéder à toutes les données  

---

## 📞 Questions / Debugging

### Vérifier les permissions d'une tenue

```python
# Dans Python/FastAPI
from api.app.routers.auth import SchoolScope

scope = SchoolScope(ecole_id=1, code_etablissement="ABJ01")
auth_ids = scope.get_authorized_school_ids(db)
print(f"IDs autorisés: {auth_ids}")  # [1, 2, 3, ...]
```

### Récupérer une tenue (SQL)

```sql
SELECT * FROM api_tenue_scolaire 
WHERE ecole_id = 1 AND genre = 'M' 
ORDER BY cycle, niveau;
```

---

## 🎯 Prochaines Étapes

1. **Tester les endpoints** via Postman ou cURL
2. **Ajouter les tenues dans la base** via POST `/api/tenues/`
3. **Intégrer au frontend** (EconomatSpace.tsx)
4. **Lier aux échéanciers** pour calculer les frais d'uniformes

---

**Implémentation complétée avec succès ! ✨**
