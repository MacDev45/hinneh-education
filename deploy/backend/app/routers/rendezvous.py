from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date as date_type

from .. import crud, schemas
from ..database import get_db
from ..services.rdv_slots import RendezVousIndisponibleError

router = APIRouter(prefix="/rendezvous", tags=["Rendez-vous"])

@router.get("/", response_model=List[schemas.RendezVousResponse])
def read_rendezvous(
    statut: Optional[str] = None,
    ecole_id: Optional[int] = None,
    ordre: str = Query("asc", pattern="^(asc|desc)$", description="'asc' = file d'attente FIFO, 'desc' = historique"),
    limit: Optional[int] = Query(None, ge=1, le=2000),
    db: Session = Depends(get_db),
):
    return crud.get_rendezvous_list(db, statut=statut, ecole_id=ecole_id, ordre=ordre, limit=limit)

# Déclarées avant /{rdv_id} : sinon FastAPI tenterait de lire "options" ou
# "disponibilites" comme un identifiant entier et répondrait 422.
@router.get("/options", response_model=schemas.RendezVousOptions)
def read_options(
    ecole_id: Optional[int] = Query(None, description="École concernée ; le quota est propre à chaque établissement"),
    db: Session = Depends(get_db),
):
    """Journées d'accueil ouvertes, créneaux et niveaux du formulaire public."""
    return crud.get_rendezvous_options(db, ecole_id=ecole_id)

@router.get("/disponibilites", response_model=schemas.RendezVousDisponibilites)
def read_disponibilites(
    date: date_type = Query(..., description="Journée concernée (AAAA-MM-JJ)"),
    ecole_id: Optional[int] = Query(None, description="École concernée ; le quota est propre à chaque établissement"),
    db: Session = Depends(get_db),
):
    """Décompte des places restantes, journée entière et créneau par créneau."""
    return crud.get_rendezvous_disponibilites(db, jour=date, ecole_id=ecole_id)

@router.post("/", response_model=schemas.RendezVousResponse, status_code=status.HTTP_201_CREATED)
def create_new_rendezvous(rdv: schemas.RendezVousCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_rendezvous(db=db, rdv=rdv)
    except RendezVousIndisponibleError as exc:
        # 409 : la demande est valide en soi, c'est la ressource (la place) qui manque.
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))

@router.get("/{rdv_id}", response_model=schemas.RendezVousResponse)
def read_one_rendezvous(rdv_id: int, db: Session = Depends(get_db)):
    db_rdv = crud.get_rendezvous(db, rdv_id=rdv_id)
    if db_rdv is None:
        raise HTTPException(status_code=404, detail="Rendez-vous non trouvé")
    return db_rdv

@router.put("/{rdv_id}/statut", response_model=schemas.RendezVousResponse)
def update_rendezvous_processing_status(
    rdv_id: int,
    payload: schemas.RendezVousUpdateStatut,
    db: Session = Depends(get_db)
):
    if payload.statut not in ["en_attente", "traite", "annule"]:
        raise HTTPException(status_code=400, detail="Statut invalide. Choisir parmi 'en_attente', 'traite', 'annule'")

    try:
        db_rdv = crud.update_rendezvous_statut(db=db, rdv_id=rdv_id, statut=payload.statut, eleve_id=payload.eleve_id)
    except RendezVousIndisponibleError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    if db_rdv is None:
        raise HTTPException(status_code=404, detail="Rendez-vous non trouvé")
    return db_rdv
