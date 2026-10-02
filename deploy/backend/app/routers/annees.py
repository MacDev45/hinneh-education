from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/annees-scolaires", tags=["Années scolaires"])


@router.get("/", response_model=List[schemas.AnneeScolaireResponse])
def read_annees(db: Session = Depends(get_db)):
    """Toutes les années, de la plus récente à la plus ancienne."""
    return crud.get_annees_scolaires(db)


# Déclarée avant /{annee_id} : sinon FastAPI lirait "active" comme un entier.
@router.get("/active", response_model=Optional[schemas.AnneeScolaireResponse])
def read_annee_active(db: Session = Depends(get_db)):
    """Année en cours, celle qui sert de référence au reste de l'application."""
    return crud.get_annee_scolaire_active(db)


@router.post("/", response_model=schemas.AnneeScolaireResponse, status_code=status.HTTP_201_CREATED)
def create_annee(annee: schemas.AnneeScolaireCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_annee_scolaire(db, annee)
    except crud.AnneeScolaireInvalide as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.put("/{annee_id}/activer", response_model=schemas.AnneeScolaireResponse)
def activer_annee(annee_id: int, db: Session = Depends(get_db)):
    """Rend cette année active et désactive toutes les autres."""
    try:
        return crud.activer_annee_scolaire(db, annee_id)
    except crud.AnneeScolaireInvalide as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
