from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from .. import crud, schemas, models
from ..database import get_db
from ..routers.auth import get_school_scope, SchoolScope

router = APIRouter(prefix="/transfert-notes", tags=["Transfert des Notes du Collège"])


@router.get("/config")
def get_transfer_config(db: Session = Depends(get_db)):
    """Retourne les paramètres de configuration : années scolaires, périodes, villes, écoles sources et destination."""
    try:
        return crud.get_transfert_notes_config(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération de la configuration: {str(e)}")


@router.get("/candidates")
def get_candidate_grades(
    annee_scolaire: str = "2025-2026",
    type_periode: str = "trimestre",
    periode_numero: int = 1,
    ville_source: str = "Bouaké & Daloa",
    ecole_source_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Recherche toutes les notes candidates au transfert pour les critères donnés."""
    try:
        candidates = crud.get_candidate_grades_for_transfer(
            db=db,
            annee_scolaire=annee_scolaire,
            type_periode=type_periode,
            periode_numero=periode_numero,
            ville_source=ville_source,
            ecole_source_id=ecole_source_id
        )
        return {
            "count": len(candidates),
            "annee_scolaire": annee_scolaire,
            "type_periode": type_periode,
            "periode_numero": periode_numero,
            "ville_source": ville_source,
            "notes": candidates
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la recherche des notes: {str(e)}")


@router.post("/simulate", response_model=schemas.TransfertNotesSimulationResponse)
def simulate_transfer(
    payload: schemas.TransfertNotesSimulationRequest,
    db: Session = Depends(get_db)
):
    """Prévisualise et calcule les statistiques du transfert avant exécution réelle."""
    try:
        return crud.simulate_grades_transfer(db=db, req=payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la simulation: {str(e)}")


@router.post("/execute", response_model=schemas.TransfertNotesResponse)
def execute_transfer(
    payload: schemas.TransfertNotesExecuteRequest,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Effectue le transfert effectif des notes de collège vers Yamoussoukro."""
    try:
        username = scope.username if hasattr(scope, "username") else "admin"
        user_id = scope.user_id if hasattr(scope, "user_id") else None

        result = crud.execute_grades_transfer(
            db=db,
            req=payload,
            user_id=user_id,
            username=username
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erreur lors du transfert: {str(e)}")


@router.get("/history", response_model=List[schemas.TransfertNotesHistoryItem])
def get_transfer_history(
    annee_scolaire: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Liste tous les transferts de notes historisés."""
    try:
        return crud.get_transfert_notes_history(db=db, annee_scolaire=annee_scolaire)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération de l'historique: {str(e)}")


@router.get("/{transfer_id}")
def get_transfer_detail(
    transfer_id: int,
    db: Session = Depends(get_db)
):
    """Retourne les détails complets d'un transfert avec les notes concernées."""
    transfert = db.query(models.TransfertNotes).filter(models.TransfertNotes.id == transfer_id).first()
    if not transfert:
        raise HTTPException(status_code=404, detail="Transfert introuvable")

    # Charger les évaluations actuellement rattachées à ce transfert
    evals = db.query(models.Evaluation).filter(models.Evaluation.transfert_id == transfer_id).all()
    notes_list = []
    for ev in evals:
        eleve = db.query(models.Eleve).filter(models.Eleve.id == ev.eleve_id).first()
        classe = db.query(models.Classe).filter(models.Classe.id == ev.classe_id).first()
        notes_list.append({
            "id": ev.id,
            "eleve_id": ev.eleve_id,
            "matricule": eleve.matricule if eleve else "",
            "eleve_nom": f"{eleve.nom or ''} {eleve.prenom or ''}".strip() if eleve else f"Élève #{ev.eleve_id}",
            "classe_nom": classe.CE_LIBELLE if classe else f"Classe #{ev.classe_id}",
            "matiere": ev.matiere,
            "type_devoir": ev.type,
            "trimestre": ev.trimestre,
            "semestre": ev.semestre,
            "note": ev.note,
            "coefficient": ev.coefficient,
            "date": str(ev.date) if ev.date else None,
            "ville_origine": ev.ville_origine or transfert.ville_source
        })

    return {
        "transfert": schemas.TransfertNotesHistoryItem.from_orm(transfert),
        "total_notes": len(notes_list),
        "notes": notes_list
    }


@router.post("/{transfer_id}/rollback")
def rollback_transfer(
    transfer_id: int,
    payload: Optional[schemas.TransfertNotesRollbackRequest] = None,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Annule le transfert et restaure le rattachement d'origine des notes."""
    try:
        username = scope.username if hasattr(scope, "username") else "admin"
        motif = payload.motif if payload else "Annulation manuelle demandée"

        result = crud.rollback_grades_transfer(
            db=db,
            transfer_id=transfer_id,
            username=username,
            motif=motif
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erreur lors de l'annulation: {str(e)}")
