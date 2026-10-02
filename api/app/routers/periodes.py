from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date as date_type

from .. import crud, schemas, models
from ..database import get_db
from ..routers.auth import get_school_scope, SchoolScope

router = APIRouter(prefix="/periodes", tags=["Périodes Scolaires & Verrouillage Notes"])


def _evaluer_statut_periode(p: models.PeriodeScolaire, today: date_type):
    """Calcule l'état de verrouillage et le statut textuel d'une période."""
    date_cloture = p.date_cloture_saisie
    date_ouv = p.date_ouverture_saisie

    cloture_atteinte = (today > date_cloture) if date_cloture else False
    est_forcee = bool(p.cloture_forcee)
    est_deverrouille = bool(p.deverrouille_par_admin)

    # Le verrou est effectif si la clôture est atteinte ou forcée, SAUF si l'administrateur a sauté le verrou
    est_verrouille = (cloture_atteinte or est_forcee) and not est_deverrouille

    if est_deverrouille:
        statut = "deverrouille_admin"
    elif est_forcee:
        statut = "cloture_forcee"
    elif cloture_atteinte:
        statut = "fermee_date"
    elif date_ouv and today < date_ouv:
        statut = "attente_ouverture"
    else:
        statut = "ouverte"

    return est_verrouille, statut


def _seed_periodes_defaut(db: Session, annee_libelle: str, code_etab: Optional[str] = None):
    """Initialise les 3 trimestres et 2 semestres par défaut."""
    try:
        parts = annee_libelle.split("-")
        y1 = int(parts[0])
        y2 = int(parts[1]) if len(parts) > 1 else y1 + 1
    except Exception:
        y1 = 2025
        y2 = 2026
    
    # Trimestre 1
    t1 = models.PeriodeScolaire(
        annee_scolaire=annee_libelle,
        type_periode="trimestre",
        numero=1,
        libelle="1er Trimestre",
        date_debut=date_type(y1, 9, 8),
        date_fin=date_type(y1, 12, 19),
        date_ouverture_saisie=date_type(y1, 9, 15),
        date_cloture_saisie=date_type(y1, 12, 22),
        cloture_forcee=False,
        deverrouille_par_admin=False,
        ET_CODEETABLISSEMENT=code_etab,
        date_creation=datetime.utcnow()
    )
    # Trimestre 2
    t2 = models.PeriodeScolaire(
        annee_scolaire=annee_libelle,
        type_periode="trimestre",
        numero=2,
        libelle="2ème Trimestre",
        date_debut=date_type(y2, 1, 5),
        date_fin=date_type(y2, 3, 27),
        date_ouverture_saisie=date_type(y2, 1, 12),
        date_cloture_saisie=date_type(y2, 4, 3),
        cloture_forcee=False,
        deverrouille_par_admin=False,
        ET_CODEETABLISSEMENT=code_etab,
        date_creation=datetime.utcnow()
    )
    # Trimestre 3
    t3 = models.PeriodeScolaire(
        annee_scolaire=annee_libelle,
        type_periode="trimestre",
        numero=3,
        libelle="3ème Trimestre",
        date_debut=date_type(y2, 4, 13),
        date_fin=date_type(y2, 6, 12),
        date_ouverture_saisie=date_type(y2, 4, 20),
        date_cloture_saisie=date_type(y2, 6, 25),
        cloture_forcee=False,
        deverrouille_par_admin=False,
        ET_CODEETABLISSEMENT=code_etab,
        date_creation=datetime.utcnow()
    )
    # Semestre 1
    s1 = models.PeriodeScolaire(
        annee_scolaire=annee_libelle,
        type_periode="semestre",
        numero=1,
        libelle="1er Semestre",
        date_debut=date_type(y1, 9, 8),
        date_fin=date_type(y2, 1, 30),
        date_ouverture_saisie=date_type(y1, 9, 15),
        date_cloture_saisie=date_type(y2, 2, 6),
        cloture_forcee=False,
        deverrouille_par_admin=False,
        ET_CODEETABLISSEMENT=code_etab,
        date_creation=datetime.utcnow()
    )
    # Semestre 2
    s2 = models.PeriodeScolaire(
        annee_scolaire=annee_libelle,
        type_periode="semestre",
        numero=2,
        libelle="2ème Semestre",
        date_debut=date_type(y2, 2, 2),
        date_fin=date_type(y2, 6, 12),
        date_ouverture_saisie=date_type(y2, 2, 15),
        date_cloture_saisie=date_type(y2, 6, 25),
        cloture_forcee=False,
        deverrouille_par_admin=False,
        ET_CODEETABLISSEMENT=code_etab,
        date_creation=datetime.utcnow()
    )

    db.add_all([t1, t2, t3, s1, s2])
    db.commit()


@router.get("/", response_model=List[schemas.PeriodeScolaireResponse])
def get_periodes(
    annee_scolaire: Optional[str] = None,
    type_periode: Optional[str] = None,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    query = db.query(models.PeriodeScolaire)
    
    if annee_scolaire:
        query = query.filter(models.PeriodeScolaire.annee_scolaire == annee_scolaire)
    if type_periode:
        query = query.filter(models.PeriodeScolaire.type_periode == type_periode)
    
    periodes = query.order_by(models.PeriodeScolaire.annee_scolaire.desc(), models.PeriodeScolaire.type_periode, models.PeriodeScolaire.numero).all()

    # Si aucune période n'existe pour l'année scolaire demandée, on la crée automatiquement
    if len(periodes) == 0:
        annee_cible = annee_scolaire or "2025-2026"
        _seed_periodes_defaut(db, annee_cible, scope.code_etablissement)
        query2 = db.query(models.PeriodeScolaire)
        if annee_scolaire:
            query2 = query2.filter(models.PeriodeScolaire.annee_scolaire == annee_scolaire)
        if type_periode:
            query2 = query2.filter(models.PeriodeScolaire.type_periode == type_periode)
        periodes = query2.order_by(models.PeriodeScolaire.annee_scolaire.desc(), models.PeriodeScolaire.type_periode, models.PeriodeScolaire.numero).all()

    today = date_type.today()
    results = []
    for p in periodes:
        est_verrouille, statut = _evaluer_statut_periode(p, today)
        res_item = schemas.PeriodeScolaireResponse.from_orm(p)
        res_item.est_verrouille = est_verrouille
        res_item.statut_saisie = statut
        results.append(res_item)

    return results


@router.get("/verrou-statut")
def get_verrou_statut(
    trimestre: int = 1,
    type_periode: str = "trimestre",
    annee_scolaire: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Vérifie si la saisie des notes pour un trimestre ou semestre est actuellement autorisée ou verrouillée."""
    query = db.query(models.PeriodeScolaire).filter(
        models.PeriodeScolaire.numero == trimestre,
        models.PeriodeScolaire.type_periode == type_periode
    )
    if annee_scolaire:
        query = query.filter(models.PeriodeScolaire.annee_scolaire == annee_scolaire)

    periode = query.first()
    if not periode:
        return {
            "verrouille": False,
            "statut": "ouverte",
            "message": "Aucune restriction configurée pour cette période",
            "deverrouille_par_admin": False
        }

    today = date_type.today()
    est_verrouille, statut = _evaluer_statut_periode(periode, today)

    return {
        "periode_id": periode.id,
        "libelle": periode.libelle,
        "verrouille": est_verrouille,
        "statut": statut,
        "date_cloture": str(periode.date_cloture_saisie),
        "deverrouille_par_admin": bool(periode.deverrouille_par_admin),
        "deverrouille_par": periode.deverrouille_par,
        "date_deverrouillage": str(periode.date_deverrouillage) if periode.date_deverrouillage else None,
        "motif_deverrouillage": periode.motif_deverrouillage,
    }


@router.post("/", response_model=schemas.PeriodeScolaireResponse, status_code=status.HTTP_201_CREATED)
def create_periode(
    payload: schemas.PeriodeScolaireCreate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    code_etab = scope.code_etablissement or payload.ET_CODEETABLISSEMENT
    db_item = models.PeriodeScolaire(
        annee_scolaire=payload.annee_scolaire,
        type_periode=payload.type_periode,
        numero=payload.numero,
        libelle=payload.libelle,
        date_debut=payload.date_debut,
        date_fin=payload.date_fin,
        date_ouverture_saisie=payload.date_ouverture_saisie,
        date_cloture_saisie=payload.date_cloture_saisie,
        cloture_forcee=payload.cloture_forcee,
        deverrouille_par_admin=payload.deverrouille_par_admin,
        deverrouille_par=payload.deverrouille_par,
        ecole_id=payload.ecole_id or scope.ecole_id,
        ET_CODEETABLISSEMENT=code_etab,
        date_creation=datetime.utcnow()
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    today = date_type.today()
    est_verrouille, statut = _evaluer_statut_periode(db_item, today)
    res = schemas.PeriodeScolaireResponse.from_orm(db_item)
    res.est_verrouille = est_verrouille
    res.statut_saisie = statut
    return res


@router.put("/{periode_id}", response_model=schemas.PeriodeScolaireResponse)
def update_periode(
    periode_id: int,
    payload: schemas.PeriodeScolaireUpdate,
    db: Session = Depends(get_db)
):
    periode = db.query(models.PeriodeScolaire).filter(models.PeriodeScolaire.id == periode_id).first()
    if not periode:
        raise HTTPException(status_code=404, detail="Période scolaire introuvable")

    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(periode, key, value)

    db.commit()
    db.refresh(periode)

    today = date_type.today()
    est_verrouille, statut = _evaluer_statut_periode(periode, today)
    res = schemas.PeriodeScolaireResponse.from_orm(periode)
    res.est_verrouille = est_verrouille
    res.statut_saisie = statut
    return res


@router.post("/{periode_id}/deverrouiller")
@router.post("/{periode_id}/activer")
def sauter_verrou_periode(
    periode_id: int,
    req: Optional[schemas.PeriodeDeverrouillageRequest] = None,
    db: Session = Depends(get_db)
):
    """Active ou déverrouille la période pour rouvrir la saisie des notes."""
    periode = db.query(models.PeriodeScolaire).filter(models.PeriodeScolaire.id == periode_id).first()
    if not periode:
        raise HTTPException(status_code=404, detail="Période scolaire introuvable")

    motif = (req.motif if req and req.motif else None) or "Saisie activée par le superviseur / administration"
    admin_nom = (req.admin_nom if req and req.admin_nom else None) or "Superviseur"

    periode.deverrouille_par_admin = True
    periode.deverrouille_par = admin_nom
    periode.date_deverrouillage = datetime.utcnow()
    periode.motif_deverrouillage = motif
    periode.cloture_forcee = False

    db.commit()
    db.refresh(periode)

    return {
        "success": True,
        "message": f"La période « {periode.libelle} » ({periode.annee_scolaire}) a été activée avec succès. La saisie est ouverte.",
        "periode_id": periode.id,
        "deverrouille_par": periode.deverrouille_par,
        "motif": periode.motif_deverrouillage
    }


@router.post("/{periode_id}/verrouiller")
def retablir_verrou_periode(
    periode_id: int,
    db: Session = Depends(get_db)
):
    """Verrouille immédiatement la période en bloquant la saisie des notes."""
    periode = db.query(models.PeriodeScolaire).filter(models.PeriodeScolaire.id == periode_id).first()
    if not periode:
        raise HTTPException(status_code=404, detail="Période scolaire introuvable")

    periode.deverrouille_par_admin = False
    periode.motif_deverrouillage = None
    periode.date_deverrouillage = None
    periode.cloture_forcee = True

    db.commit()
    db.refresh(periode)

    return {
        "success": True,
        "message": f"La période « {periode.libelle} » ({periode.annee_scolaire}) a été verrouillée avec succès.",
        "periode_id": periode.id
    }
