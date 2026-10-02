"""
Endpoints pour la gestion des tarifs (Tarifs Officiels Espèces & Frais Divers)
par établissement, ville et année scolaire.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional, Dict
from decimal import Decimal
from datetime import datetime

from .. import crud, schemas, models
from ..database import get_db
from ..routers.auth import get_school_scope, SchoolScope

router = APIRouter(prefix="/tarifs", tags=["Tarifs & Configuration"])


# ─────────────────────────────────────────────────────────────────────────────
# TARIFS OFFICIELS ESPÈCES (Frais Annexes Guichet)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/official-cash-tariffs", response_model=Dict)
def get_official_cash_tariffs(
    ecole_id: Optional[int] = None,
    code_etablissement: Optional[str] = None,
    ville: Optional[str] = None,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Récupère les tarifs officiels espèces pour un établissement/ville."""
    # Restriction au scope de l'utilisateur
    if not scope.is_global:
        if code_etablissement and code_etablissement not in (scope.get_authorized_school_codes(db) or []):
            raise HTTPException(status_code=403, detail="Accès refusé à cet établissement")
        code_etablissement = scope.code_etablissement or code_etablissement
        ecole_id = scope.ecole_id or ecole_id

    # Chercher le tarif existant
    query = db.query(models.OfficialCashTariff)

    if ecole_id:
        query = query.filter(models.OfficialCashTariff.ecole_id == ecole_id)
    if code_etablissement:
        query = query.filter(models.OfficialCashTariff.ET_CODEETABLISSEMENT == code_etablissement)
    if ville:
        query = query.filter(models.OfficialCashTariff.ville == ville)

    query = query.filter(models.OfficialCashTariff.actif == True)
    tariff = query.first()

    if tariff:
        return {
            "college_1er_cycle_bcd": float(tariff.college_1er_cycle_bcd),
            "college_1er_cycle_general": float(tariff.college_1er_cycle_general),
            "college_1er_cycle_3eme": float(tariff.college_1er_cycle_3eme),
            "college_2nd_cycle_2nde_1ere": float(tariff.college_2nd_cycle_2nde_1ere),
            "college_2nd_cycle_tle": float(tariff.college_2nd_cycle_tle),
            "maternelle": float(tariff.maternelle),
            "primaire": float(tariff.primaire),
        }

    # Retourner les valeurs par défaut si aucun tarif n'existe
    return {
        "college_1er_cycle_bcd": 27000,
        "college_1er_cycle_general": 20000,
        "college_1er_cycle_3eme": 25000,
        "college_2nd_cycle_2nde_1ere": 20000,
        "college_2nd_cycle_tle": 25000,
        "maternelle": 25000,
        "primaire": 35000,
    }


@router.post("/official-cash-tariffs", response_model=Dict, status_code=status.HTTP_200_OK)
def save_official_cash_tariffs(
    tariffs: Dict,
    ecole_id: Optional[int] = None,
    code_etablissement: Optional[str] = None,
    ville: Optional[str] = None,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Sauvegarde ou met à jour les tarifs officiels espèces pour un établissement/ville."""
    # Restriction au scope de l'utilisateur
    if not scope.is_global:
        if code_etablissement and code_etablissement not in (scope.get_authorized_school_codes(db) or []):
            raise HTTPException(status_code=403, detail="Accès refusé à cet établissement")
        code_etablissement = scope.code_etablissement or code_etablissement
        ecole_id = scope.ecole_id or ecole_id

    # Chercher le tarif existant
    query = db.query(models.OfficialCashTariff)

    if ecole_id:
        query = query.filter(models.OfficialCashTariff.ecole_id == ecole_id)
    if code_etablissement:
        query = query.filter(models.OfficialCashTariff.ET_CODEETABLISSEMENT == code_etablissement)
    if ville:
        query = query.filter(models.OfficialCashTariff.ville == ville)

    tariff = query.first()

    if tariff:
        # Mise à jour
        for key, value in tariffs.items():
            if hasattr(tariff, key):
                setattr(tariff, key, Decimal(str(value)) if value is not None else None)
        tariff.date_modification = datetime.utcnow()
    else:
        # Création
        tariff = models.OfficialCashTariff(
            ecole_id=ecole_id,
            ET_CODEETABLISSEMENT=code_etablissement,
            ville=ville,
            **{k: Decimal(str(v)) if v is not None else None for k, v in tariffs.items()}
        )
        db.add(tariff)

    db.commit()
    db.refresh(tariff)

    return {
        "college_1er_cycle_bcd": float(tariff.college_1er_cycle_bcd),
        "college_1er_cycle_general": float(tariff.college_1er_cycle_general),
        "college_1er_cycle_3eme": float(tariff.college_1er_cycle_3eme),
        "college_2nd_cycle_2nde_1ere": float(tariff.college_2nd_cycle_2nde_1ere),
        "college_2nd_cycle_tle": float(tariff.college_2nd_cycle_tle),
        "maternelle": float(tariff.maternelle),
        "primaire": float(tariff.primaire),
    }


# ─────────────────────────────────────────────────────────────────────────────
# FRAIS DIVERS (Tenues, Fournitures, Cours, Activités)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/frais-divers", response_model=List[Dict])
def get_frais_divers_list(
    ecole_id: Optional[int] = None,
    code_etablissement: Optional[str] = None,
    ville: Optional[str] = None,
    categorie: Optional[str] = None,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Récupère la liste des frais divers pour un établissement/ville."""
    # Restriction au scope de l'utilisateur
    if not scope.is_global:
        if code_etablissement and code_etablissement not in (scope.get_authorized_school_codes(db) or []):
            raise HTTPException(status_code=403, detail="Accès refusé à cet établissement")
        code_etablissement = scope.code_etablissement or code_etablissement
        ecole_id = scope.ecole_id or ecole_id

    query = db.query(models.FraisDiversItem)

    if ecole_id:
        query = query.filter(models.FraisDiversItem.ecole_id == ecole_id)
    if code_etablissement:
        query = query.filter(models.FraisDiversItem.ET_CODEETABLISSEMENT == code_etablissement)
    if ville:
        query = query.filter(models.FraisDiversItem.ville == ville)
    if categorie:
        query = query.filter(models.FraisDiversItem.categorie == categorie)

    query = query.filter(models.FraisDiversItem.actif == True)
    items = query.all()

    return [
        {
            "id": item.id,
            "code": item.code,
            "categorie": item.categorie,
            "genre": item.genre,
            "cycle": item.cycle,
            "niveau": item.niveau,
            "libelle": item.libelle,
            "description": item.description,
            "montant": float(item.montant),
            "periodicite": item.periodicite,
            "actif": item.actif,
        }
        for item in items
    ]


@router.post("/frais-divers", response_model=Dict, status_code=status.HTTP_201_CREATED)
def create_frais_divers(
    item: Dict,
    ecole_id: Optional[int] = None,
    code_etablissement: Optional[str] = None,
    ville: Optional[str] = None,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Crée ou met à jour un élément de frais divers."""
    # Restriction au scope de l'utilisateur
    if not scope.is_global:
        if code_etablissement and code_etablissement not in (scope.get_authorized_school_codes(db) or []):
            raise HTTPException(status_code=403, detail="Accès refusé à cet établissement")
        code_etablissement = scope.code_etablissement or code_etablissement
        ecole_id = scope.ecole_id or ecole_id

    # Vérifier si l'item existe déjà (par id)
    if "id" in item and item["id"]:
        existing = db.query(models.FraisDiversItem).filter(
            models.FraisDiversItem.id == item["id"],
            models.FraisDiversItem.ecole_id == ecole_id,
            models.FraisDiversItem.ET_CODEETABLISSEMENT == code_etablissement,
        ).first()

        if existing:
            # Mise à jour
            for key, value in item.items():
                if key != "id" and hasattr(existing, key):
                    if key == "montant":
                        setattr(existing, key, Decimal(str(value)) if value is not None else None)
                    else:
                        setattr(existing, key, value)
            existing.date_modification = datetime.utcnow()
            db.commit()
            db.refresh(existing)

            return {
                "id": existing.id,
                "code": existing.code,
                "categorie": existing.categorie,
                "genre": existing.genre,
                "cycle": existing.cycle,
                "niveau": existing.niveau,
                "libelle": existing.libelle,
                "description": existing.description,
                "montant": float(existing.montant),
                "periodicite": existing.periodicite,
                "actif": existing.actif,
            }

    # Créer un nouvel item
    frais_item = models.FraisDiversItem(
        ecole_id=ecole_id,
        ET_CODEETABLISSEMENT=code_etablissement,
        ville=ville,
        code=item.get("code", ""),
        categorie=item.get("categorie", "autre"),
        genre=item.get("genre"),
        cycle=item.get("cycle"),
        niveau=item.get("niveau"),
        libelle=item.get("libelle", ""),
        description=item.get("description"),
        montant=Decimal(str(item.get("montant", 0))),
        periodicite=item.get("periodicite", "unique"),
        actif=item.get("actif", True),
    )
    db.add(frais_item)
    db.commit()
    db.refresh(frais_item)

    return {
        "id": frais_item.id,
        "code": frais_item.code,
        "categorie": frais_item.categorie,
        "genre": frais_item.genre,
        "cycle": frais_item.cycle,
        "niveau": frais_item.niveau,
        "libelle": frais_item.libelle,
        "description": frais_item.description,
        "montant": float(frais_item.montant),
        "periodicite": frais_item.periodicite,
        "actif": frais_item.actif,
    }


@router.put("/frais-divers/{item_id}", response_model=Dict)
def update_frais_divers(
    item_id: int,
    item: Dict,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Met à jour un élément de frais divers existant."""
    # Trouver l'item
    existing = db.query(models.FraisDiversItem).filter(
        models.FraisDiversItem.id == item_id
    ).first()

    if not existing:
        raise HTTPException(status_code=404, detail="Frais divers non trouvé")

    # Restriction au scope de l'utilisateur
    if not scope.is_global:
        auth_codes = scope.get_authorized_school_codes(db)
        if existing.ET_CODEETABLISSEMENT not in (auth_codes or []):
            raise HTTPException(status_code=403, detail="Accès refusé à cet établissement")

    # Mettre à jour
    for key, value in item.items():
        if hasattr(existing, key) and key != "id":
            if key == "montant":
                setattr(existing, key, Decimal(str(value)) if value is not None else None)
            else:
                setattr(existing, key, value)

    existing.date_modification = datetime.utcnow()
    db.commit()
    db.refresh(existing)

    return {
        "id": existing.id,
        "code": existing.code,
        "categorie": existing.categorie,
        "genre": existing.genre,
        "cycle": existing.cycle,
        "niveau": existing.niveau,
        "libelle": existing.libelle,
        "description": existing.description,
        "montant": float(existing.montant),
        "periodicite": existing.periodicite,
        "actif": existing.actif,
    }


@router.delete("/frais-divers/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_frais_divers(
    item_id: int,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Supprime un élément de frais divers."""
    # Trouver l'item
    existing = db.query(models.FraisDiversItem).filter(
        models.FraisDiversItem.id == item_id
    ).first()

    if not existing:
        raise HTTPException(status_code=404, detail="Frais divers non trouvé")

    # Restriction au scope de l'utilisateur
    if not scope.is_global:
        auth_codes = scope.get_authorized_school_codes(db)
        if existing.ET_CODEETABLISSEMENT not in (auth_codes or []):
            raise HTTPException(status_code=403, detail="Accès refusé à cet établissement")

    db.delete(existing)
    db.commit()
