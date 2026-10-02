from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import crud, schemas, models
from ..database import get_db
from ..routers.auth import get_school_scope, SchoolScope

router = APIRouter(prefix="/tenues", tags=["Tenues & Uniformes"])


@router.get("/", response_model=List[schemas.TenuteScolaireResponse])
def read_tenues(
    cycle: Optional[str] = None,
    genre: Optional[str] = None,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Liste les tenues & uniformes de l'établissement autorisé."""
    if scope.is_global:
        tenues = crud.get_tenues(db, cycle=cycle, genre=genre)
    else:
        auth_ids = scope.get_authorized_school_ids(db)
        tenues = crud.get_tenues(db, ecole_ids=auth_ids, cycle=cycle, genre=genre) if auth_ids else []

    return tenues


@router.post("/", response_model=schemas.TenuteScolaireResponse, status_code=status.HTTP_201_CREATED)
def create_new_tenue(
    tenue: schemas.TenuteScolaireCreate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Crée une nouvelle tenue & uniforme scolaire."""
    # Déterminer l'établissement cible
    ecole_id = tenue.ecole_id or scope.ecole_id
    code_etab = tenue.ET_CODEETABLISSEMENT or scope.code_etablissement

    if not scope.is_global:
        auth_ids = scope.get_authorized_school_ids(db)
        auth_codes = scope.get_authorized_school_codes(db)

        has_access = (ecole_id and ecole_id in auth_ids) or \
                     (code_etab and code_etab in auth_codes)

        if not has_access:
            raise HTTPException(
                status_code=403,
                detail="Accès refusé : vous ne pouvez créer des tenues que pour vos établissements autorisés"
            )

    return crud.create_tenue(
        db=db,
        tenue=tenue,
        ecole_id=ecole_id,
        code_etablissement=code_etab
    )


@router.get("/{tenue_id}", response_model=schemas.TenuteScolaireResponse)
def read_tenue(
    tenue_id: int,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Récupère une tenue & uniforme par ID."""
    db_tenue = crud.get_tenue_by_id(db, tenue_id=tenue_id)
    if not db_tenue:
        raise HTTPException(status_code=404, detail="Tenue non trouvée")

    # Vérifier l'accès
    if not scope.is_global:
        auth_ids = scope.get_authorized_school_ids(db)
        auth_codes = scope.get_authorized_school_codes(db)

        has_access = (db_tenue.ecole_id and db_tenue.ecole_id in auth_ids) or \
                     (db_tenue.ET_CODEETABLISSEMENT and db_tenue.ET_CODEETABLISSEMENT in auth_codes)

        if not has_access:
            raise HTTPException(status_code=403, detail="Accès refusé à cette tenue")

    return db_tenue


@router.put("/{tenue_id}", response_model=schemas.TenuteScolaireResponse)
def update_tenue(
    tenue_id: int,
    tenue_data: schemas.TenuteScolaireUpdate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Met à jour une tenue & uniforme scolaire."""
    db_tenue = crud.get_tenue_by_id(db, tenue_id=tenue_id)
    if not db_tenue:
        raise HTTPException(status_code=404, detail="Tenue non trouvée")

    # Vérifier l'accès
    if not scope.is_global:
        auth_ids = scope.get_authorized_school_ids(db)
        auth_codes = scope.get_authorized_school_codes(db)

        has_access = (db_tenue.ecole_id and db_tenue.ecole_id in auth_ids) or \
                     (db_tenue.ET_CODEETABLISSEMENT and db_tenue.ET_CODEETABLISSEMENT in auth_codes)

        if not has_access:
            raise HTTPException(status_code=403, detail="Accès refusé à cette tenue")

    updated = crud.update_tenue(db=db, tenue_id=tenue_id, tenue_data=tenue_data)
    if not updated:
        raise HTTPException(status_code=404, detail="Tenue non trouvée")

    return updated


@router.delete("/{tenue_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tenue(
    tenue_id: int,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Supprime une tenue & uniforme scolaire."""
    db_tenue = crud.get_tenue_by_id(db, tenue_id=tenue_id)
    if not db_tenue:
        raise HTTPException(status_code=404, detail="Tenue non trouvée")

    # Vérifier l'accès
    if not scope.is_global:
        auth_ids = scope.get_authorized_school_ids(db)
        auth_codes = scope.get_authorized_school_codes(db)

        has_access = (db_tenue.ecole_id and db_tenue.ecole_id in auth_ids) or \
                     (db_tenue.ET_CODEETABLISSEMENT and db_tenue.ET_CODEETABLISSEMENT in auth_codes)

        if not has_access:
            raise HTTPException(status_code=403, detail="Accès refusé à cette tenue")

    success = crud.delete_tenue(db=db, tenue_id=tenue_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tenue non trouvée")
