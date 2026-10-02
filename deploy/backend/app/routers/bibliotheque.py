from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from .. import crud, schemas
from ..routers.auth import get_school_scope, SchoolScope

router = APIRouter()

@router.get("/bibliotheque/livres", response_model=List[schemas.LivreOut])
def get_livres(
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    return crud.get_livres(db, code_ecole=scope.code_etablissement)

@router.post("/bibliotheque/livres", response_model=schemas.LivreOut, status_code=status.HTTP_201_CREATED)
def create_livre(
    livre_in: schemas.LivreCreate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    return crud.create_livre(db, livre_in, code_ecole=scope.code_etablissement)

@router.put("/bibliotheque/livres/{livre_id}", response_model=schemas.LivreOut)
def update_livre(
    livre_id: int,
    livre_in: schemas.LivreUpdate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    updated = crud.update_livre(db, livre_id, livre_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Livre non trouvé")
    return updated

@router.delete("/bibliotheque/livres/{livre_id}")
def delete_livre(
    livre_id: int,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    success = crud.delete_livre(db, livre_id)
    if not success:
        raise HTTPException(status_code=404, detail="Livre non trouvé")
    return {"message": "Livre supprimé avec succès"}

@router.get("/bibliotheque/emprunts")
def get_emprunts(
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    return crud.get_emprunts(db, code_ecole=scope.code_etablissement)

@router.post("/bibliotheque/emprunts", status_code=status.HTTP_201_CREATED)
def create_emprunt(
    emprunt_in: schemas.EmpruntLivreCreate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    return crud.create_emprunt(db, emprunt_in, code_ecole=scope.code_etablissement)

@router.put("/bibliotheque/emprunts/{emprunt_id}/retour")
def retour_emprunt(
    emprunt_id: int,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    res = crud.retour_emprunt(db, emprunt_id)
    if not res:
        raise HTTPException(status_code=404, detail="Emprunt non trouvé")
    return {"message": "Livre restitué avec succès", "emprunt_id": emprunt_id}
