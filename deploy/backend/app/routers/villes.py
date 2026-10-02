from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from .. import crud, schemas, models
from .auth import get_current_active_user

router = APIRouter(prefix="/villes", tags=["Villes"])

@router.get("/", response_model=List[schemas.VilleOut])
def list_villes(
    statut: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Récupère la liste de toutes les villes."""
    return crud.get_villes(db, statut=statut)

@router.post("/", response_model=schemas.VilleOut, status_code=status.HTTP_201_CREATED)
def create_ville(
    ville: schemas.VilleCreate,
    db: Session = Depends(get_db),
    current_user: models.CustomUser = Depends(get_current_active_user)
):
    """Création d'une nouvelle ville (Réservé administration)."""
    existing = db.query(models.Ville).filter(models.Ville.libelle.ilike(ville.libelle)).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"La ville '{ville.libelle}' existe déjà."
        )
    return crud.create_ville(db, ville)

@router.put("/{ville_id}", response_model=schemas.VilleOut)
def update_ville(
    ville_id: int,
    update_data: dict,
    db: Session = Depends(get_db),
    current_user: models.CustomUser = Depends(get_current_active_user)
):
    """Modification d'une ville existante."""
    db_ville = crud.update_ville(db, ville_id, update_data)
    if not db_ville:
        raise HTTPException(status_code=404, detail="Ville non trouvée.")
    return db_ville

@router.get("/{ville_id}/ecoles", response_model=List[schemas.SchoolResponse])
def get_ecoles_par_ville(
    ville_id: int,
    db: Session = Depends(get_db)
):
    """Récupère la liste de toutes les écoles rattachées à une ville spécifique."""
    ville_obj = db.query(models.Ville).filter(models.Ville.id == ville_id).first()
    if not ville_obj:
        raise HTTPException(status_code=404, detail="Ville non trouvée.")

    from sqlalchemy import func
    schools = db.query(models.Etablissement).filter(
        func.lower(models.Etablissement.ET_VILLE) == ville_obj.libelle.lower().strip()
    ).all()
    return schools

@router.delete("/{ville_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ville(
    ville_id: int,
    db: Session = Depends(get_db),
    current_user: models.CustomUser = Depends(get_current_active_user)
):
    """Suppression d'une ville."""
    success = crud.delete_ville(db, ville_id)
    if not success:
        raise HTTPException(status_code=404, detail="Ville non trouvée.")
    return None
