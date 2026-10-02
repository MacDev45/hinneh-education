from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import crud, schemas, models
from ..database import get_db

router = APIRouter(prefix="/requests", tags=["Demands & Requests"])

@router.get("/", response_model=List[schemas.RequestResponse])
def read_requests(demandeur_id: Optional[int] = None, db: Session = Depends(get_db)):
    return crud.get_requests(db, demandeur_id=demandeur_id)

@router.post("/", response_model=schemas.RequestResponse, status_code=status.HTTP_201_CREATED)
def create_new_request(req: schemas.RequestCreate, db: Session = Depends(get_db)):
    return crud.create_request(db=db, req=req)

@router.put("/{request_id}/status", response_model=schemas.RequestResponse)
def update_request_processing_status(
    request_id: int, 
    statut: str, 
    motif_rejet: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    if statut not in ["en_attente", "valide", "rejete"]:
        raise HTTPException(status_code=400, detail="Statut invalide. Choisir parmi 'en_attente', 'valide', 'rejete'")
        
    db_req = crud.update_request_status(db=db, request_id=request_id, statut=statut, motif_rejet=motif_rejet)
    if db_req is None:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    return db_req
