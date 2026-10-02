"""Gestion RH — demandes d'absences, congés, attestations.

Endpoints :
- POST /api/rh/absence/creer : créer une demande d'absence
- GET /api/rh/absence/mes-demandes : consulter ses demandes
- POST /api/rh/conge/creer : demander un congé
- GET /api/rh/conge/mes-demandes : consulter ses demandes de congé
- GET /api/rh/attestation/{personnel_id} : générer une attestation de travail
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

from .. import models, schemas
from ..database import get_db
from ..routers.auth import get_school_scope, SchoolScope

router = APIRouter(prefix="/rh", tags=["RH - Demandes"])


# ─── Schémas ────────────────────────────────────────────────────────────────

class CreerDemandeAbsence(BaseModel):
    date_debut: str  # YYYY-MM-DD
    date_fin: str
    motif: str
    justification: Optional[str] = None


class DemandeAbsenceDetail(BaseModel):
    id: int
    personnel_id: int
    date_debut: str
    date_fin: str
    motif: str
    justification: Optional[str]
    statut: str  # en_attente, approuvee, rejetee
    date_demande: str
    date_traitement: Optional[str]
    traite_par: Optional[str]


class CreerDemandeConge(BaseModel):
    date_debut: str  # YYYY-MM-DD
    date_fin: str
    type_conge: str  # conge_annuel, conge_maladie, conge_maternite, conge_paternite, conge_exceptionnel
    motif: Optional[str] = None


class DemandeCongeDetail(BaseModel):
    id: int
    personnel_id: int
    date_debut: str
    date_fin: str
    type_conge: str
    motif: Optional[str]
    statut: str  # en_attente, approuvee, rejetee
    date_demande: str
    date_traitement: Optional[str]
    traite_par: Optional[str]
    jours_utilises: int


class AttestationTravail(BaseModel):
    personnel_nom: str
    personnel_prenom: str
    poste: str
    date_embauche: str
    date_sortie: Optional[str]
    ecole_nom: str
    date_edition: str
    motif: str  # pour_obtenir_emploi, pour_credit, pour_administrative, autre


# ─── Demandes d'absence ──────────────────────────────────────────────────────

@router.post("/absence/creer", status_code=201)
async def creer_demande_absence(
    demande: CreerDemandeAbsence,
    scope: SchoolScope = Depends(get_school_scope),
    db: Session = Depends(get_db),
):
    """Créer une demande d'absence pour soi-même."""
    if not scope.user or not scope.user.personnel:
        raise HTTPException(status_code=403, detail="Seul le personnel peut créer une demande.")

    personnel = scope.user.personnel
    try:
        date_debut = datetime.fromisoformat(demande.date_debut).date()
        date_fin = datetime.fromisoformat(demande.date_fin).date()
    except:
        raise HTTPException(status_code=400, detail="Format de date invalide (YYYY-MM-DD).")

    if date_debut > date_fin:
        raise HTTPException(status_code=400, detail="La date de fin doit être après la date de début.")

    # Créer la demande d'absence
    abs_demande = models.DemandeTraitement(
        demandeur_id=personnel.id,
        eleve_concerne_id=None,
        type_demande="absence",
        date_demande=datetime.utcnow(),
        statut="en_attente",
        details={
            "date_debut": str(date_debut),
            "date_fin": str(date_fin),
            "motif": demande.motif,
            "justification": demande.justification,
        },
        ecole_id=scope.ecole_id,
        ET_CODEETABLISSEMENT=scope.code_etablissement,
    )
    db.add(abs_demande)
    db.commit()
    return {"id": abs_demande.id, "statut": "Demande créée avec succès"}


@router.get("/absence/mes-demandes", response_model=List[DemandeAbsenceDetail])
async def mes_demandes_absence(
    scope: SchoolScope = Depends(get_school_scope),
    db: Session = Depends(get_db),
):
    """Consulter ses propres demandes d'absence."""
    if not scope.user or not scope.user.personnel:
        raise HTTPException(status_code=403, detail="Seul le personnel peut consulter ses demandes.")

    personnel = scope.user.personnel
    demandes = db.query(models.DemandeTraitement).filter(
        models.DemandeTraitement.demandeur_id == personnel.id,
        models.DemandeTraitement.type_demande == "absence",
    ).order_by(models.DemandeTraitement.date_demande.desc()).all()

    return [
        DemandeAbsenceDetail(
            id=d.id,
            personnel_id=d.demandeur_id,
            date_debut=d.details.get("date_debut", "—") if d.details else "—",
            date_fin=d.details.get("date_fin", "—") if d.details else "—",
            motif=d.details.get("motif", "") if d.details else "",
            justification=d.details.get("justification") if d.details else None,
            statut=d.statut or "en_attente",
            date_demande=d.date_demande.isoformat() if d.date_demande else "",
            date_traitement=d.date_traitement.isoformat() if d.date_traitement else None,
            traite_par=d.approuveur_id or None,
        )
        for d in demandes
    ]


# ─── Demandes de congé ───────────────────────────────────────────────────────

@router.post("/conge/creer", status_code=201)
async def creer_demande_conge(
    demande: CreerDemandeConge,
    scope: SchoolScope = Depends(get_school_scope),
    db: Session = Depends(get_db),
):
    """Créer une demande de congé."""
    if not scope.user or not scope.user.personnel:
        raise HTTPException(status_code=403, detail="Seul le personnel peut créer une demande.")

    personnel = scope.user.personnel
    try:
        date_debut = datetime.fromisoformat(demande.date_debut).date()
        date_fin = datetime.fromisoformat(demande.date_fin).date()
    except:
        raise HTTPException(status_code=400, detail="Format de date invalide (YYYY-MM-DD).")

    if date_debut > date_fin:
        raise HTTPException(status_code=400, detail="La date de fin doit être après la date de début.")

    jours = (date_fin - date_debut).days + 1

    conge_demande = models.DemandeTraitement(
        demandeur_id=personnel.id,
        eleve_concerne_id=None,
        type_demande="conge",
        date_demande=datetime.utcnow(),
        statut="en_attente",
        details={
            "date_debut": str(date_debut),
            "date_fin": str(date_fin),
            "type_conge": demande.type_conge,
            "motif": demande.motif,
            "jours": jours,
        },
        ecole_id=scope.ecole_id,
        ET_CODEETABLISSEMENT=scope.code_etablissement,
    )
    db.add(conge_demande)
    db.commit()
    return {"id": conge_demande.id, "jours": jours, "statut": "Demande créée avec succès"}


@router.get("/conge/mes-demandes", response_model=List[DemandeCongeDetail])
async def mes_demandes_conge(
    scope: SchoolScope = Depends(get_school_scope),
    db: Session = Depends(get_db),
):
    """Consulter ses propres demandes de congé."""
    if not scope.user or not scope.user.personnel:
        raise HTTPException(status_code=403, detail="Seul le personnel peut consulter ses demandes.")

    personnel = scope.user.personnel
    demandes = db.query(models.DemandeTraitement).filter(
        models.DemandeTraitement.demandeur_id == personnel.id,
        models.DemandeTraitement.type_demande == "conge",
    ).order_by(models.DemandeTraitement.date_demande.desc()).all()

    return [
        DemandeCongeDetail(
            id=d.id,
            personnel_id=d.demandeur_id,
            date_debut=d.details.get("date_debut", "—") if d.details else "—",
            date_fin=d.details.get("date_fin", "—") if d.details else "—",
            type_conge=d.details.get("type_conge", "") if d.details else "",
            motif=d.details.get("motif") if d.details else None,
            statut=d.statut or "en_attente",
            date_demande=d.date_demande.isoformat() if d.date_demande else "",
            date_traitement=d.date_traitement.isoformat() if d.date_traitement else None,
            traite_par=d.approuveur_id or None,
            jours_utilises=d.details.get("jours", 0) if d.details else 0,
        )
        for d in demandes
    ]


# ─── Attestations de travail ─────────────────────────────────────────────────

@router.get("/attestation/{personnel_id}", response_model=AttestationTravail)
async def generer_attestation(
    personnel_id: int,
    motif: str = "pour_obtenir_emploi",
    scope: SchoolScope = Depends(get_school_scope),
    db: Session = Depends(get_db),
):
    """Générer une attestation de travail.

    Accès : directeur, admin, ou le personnel pour soi-même
    """
    personnel = db.query(models.Personnel).filter(models.Personnel.id == personnel_id).first()
    if not personnel:
        raise HTTPException(status_code=404, detail="Personnel introuvable.")

    # Vérification des permissions
    is_self = scope.user and scope.user.personnel and scope.user.personnel.id == personnel_id
    can_access = scope.role in ("directeur_ecole", "admin", "direction_fondation") or is_self
    if not can_access:
        raise HTTPException(status_code=403, detail="Vous n'avez pas accès à cette attestation.")

    ecole = db.query(models.Etablissement).filter(
        models.Etablissement.IDETABLISSEMENT == personnel.ecole_id
    ).first()

    return AttestationTravail(
        personnel_nom=personnel.NOM or personnel.nom or "—",
        personnel_prenom=personnel.PRENOM or personnel.prenom or "—",
        poste=personnel.fonction or "—",
        date_embauche=personnel.date_embauche.isoformat() if personnel.date_embauche else "—",
        date_sortie=None,  # À mettre à jour si le personnel part
        ecole_nom=ecole.ET_DENOMMINATION if ecole else "—",
        date_edition=datetime.utcnow().isoformat(),
        motif=motif,
    )
