from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from .. import crud, schemas
from ..database import get_db
from ..routers.auth import get_school_scope, SchoolScope

router = APIRouter(prefix="/taches", tags=["Taches"])

@router.get("/", response_model=List[schemas.TacheResponse])
def read_taches(
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    return crud.get_taches(db, code_etablissement=scope.code_etablissement)

@router.post("/", response_model=schemas.TacheResponse, status_code=status.HTTP_201_CREATED)
def create_new_tache(
    tache: schemas.TacheCreate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    return crud.create_tache(db=db, tache=tache, code_etablissement=scope.code_etablissement)

@router.put("/{tache_id}/status", response_model=schemas.TacheResponse)
def update_status(
    tache_id: int,
    status: str,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    db_tache = crud.update_tache_status(db=db, tache_id=tache_id, status=status)
    if not db_tache:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    return db_tache
