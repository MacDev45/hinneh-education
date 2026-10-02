"""pointage_badge.py — Controle d entree par badge QR pour les eleves."""
from datetime import datetime, date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, and_
from sqlalchemy.orm import Session
from .. import models
from ..database import get_db
from ..routers.auth import get_school_scope, SchoolScope

router = APIRouter(prefix="/pointage-badge", tags=["Pointage Badge QR"])
HEURE_LIMITE_RETARD = "08:30"


class ScanRequest(BaseModel):
    qr_data: str
    type_scan: str = "entree"
    heure_limite: Optional[str] = None
    remarque: Optional[str] = None


class ScanResponse(BaseModel):
    pointage_id: int
    eleve_id: int
    matricule: str
    nom_complet: str
    classe: str
    ecole: str
    photo_url: Optional[str] = None
    statut: str
    heure_entree: str
    motif_refus: Optional[str] = None
    message: str
    solde_impaye: bool
    montant_du: float


def _parse_qr(qr_data: str) -> dict:
    qr = qr_data.strip()
    if qr.startswith("ELEVE|"):
        parts = qr.split("|")
        if len(parts) < 4:
            raise ValueError("QR mal forme")
        return {
            "eleve_id": int(parts[1]) if parts[1].isdigit() else None,
            "matricule": parts[2] if len(parts) > 2 else None,
        }
    return {"eleve_id": None, "matricule": qr.strip()}


def _est_retard(heure_limite: str) -> bool:
    return datetime.now().strftime("%H:%M") > heure_limite


def _heure_actuelle() -> str:
    return datetime.now().strftime("%H:%M")


@router.post("/scan", response_model=ScanResponse)
def scanner_badge(
    body: ScanRequest,
    scope: SchoolScope = Depends(get_school_scope),
    db: Session = Depends(get_db),
):
    """Scan QR et enregistre le pointage d'entree ou sortie."""
    roles_ok = ("educateur", "directeur_ecole", "directeur", "accueil", "admin", "direction_fondation")
    if scope.role not in roles_ok and not scope.is_global:
        raise HTTPException(status_code=403, detail="Acces reserve aux educateurs.")
    try:
        qr_info = _parse_qr(body.qr_data)
    except (ValueError, IndexError) as e:
        raise HTTPException(status_code=400, detail=f"QR invalide : {e}")

    eleve = None
    if qr_info.get("eleve_id"):
        eleve = db.query(models.Eleve).filter(models.Eleve.id == qr_info["eleve_id"]).first()
    if not eleve and qr_info.get("matricule"):
        eleve = db.query(models.Eleve).filter(models.Eleve.matricule == qr_info["matricule"]).first()
    if not eleve:
        raise HTTPException(status_code=404, detail="Eleve introuvable.")

    if scope.ecole_id and eleve.ecole_id and eleve.ecole_id != scope.ecole_id and not scope.is_global:
        raise HTTPException(status_code=403, detail="Eleve d une autre ecole.")

    classe = db.query(models.Classe).filter(models.Classe.id == eleve.classe_id).first()
    ecole  = db.query(models.Etablissement).filter(
        models.Etablissement.IDETABLISSEMENT == eleve.ecole_id).first()
    classe_nom = classe.CE_LIBELLE if classe else "-"
    ecole_nom  = ecole.ET_DENOMMINATION if ecole else "-"

    debut_jour = datetime.combine(date.today(), datetime.min.time())
    fin_jour   = debut_jour + timedelta(days=1)
    doublon = db.query(models.PointageBadge).filter(and_(
        models.PointageBadge.eleve_id == eleve.id,
        models.PointageBadge.date_pointage >= debut_jour,
        models.PointageBadge.date_pointage < fin_jour,
        models.PointageBadge.statut != "sortie",
    )).first()

    heure_now    = _heure_actuelle()
    heure_limite = body.heure_limite or HEURE_LIMITE_RETARD
    nom_complet  = f"{eleve.nom} {eleve.prenom}"
    solde_impaye = float(eleve.solde or 0) < 0

    if doublon and body.type_scan == "entree":
        return ScanResponse(
            pointage_id=doublon.id, eleve_id=eleve.id, matricule=eleve.matricule,
            nom_complet=nom_complet, classe=classe_nom, ecole=ecole_nom, photo_url=None,
            statut="doublon", heure_entree=doublon.heure_entree or heure_now, motif_refus=None,
            message=f"Deja pointe a {doublon.heure_entree}",
            solde_impaye=solde_impaye,
            montant_du=abs(float(eleve.solde or 0)) if solde_impaye else 0.0,
        )

    statut = "sortie" if body.type_scan == "sortie" else (
        "retard" if _est_retard(heure_limite) else "present"
    )
    motif_refus = None
    if eleve.statut in ("radie", "suspendu", "transfere"):
        statut = "refuse"
        motif_refus = f"eleve_{eleve.statut}"

    personnel = None
    if scope.user:
        personnel = db.query(models.Personnel).filter(
            models.Personnel.user_id == scope.user.id).first()

    pointage = models.PointageBadge(
        eleve_id=eleve.id, ecole_id=eleve.ecole_id,
        ET_CODEETABLISSEMENT=eleve.ET_CODEETABLISSEMENT,
        date_pointage=datetime.utcnow(), heure_entree=heure_now,
        statut=statut, motif_refus=motif_refus,
        pointe_par_id=personnel.id if personnel else None,
        pointe_par_nom=f"{personnel.nom} {personnel.prenom}" if personnel else scope.username,
        qr_data=body.qr_data[:500] if body.qr_data else None,
        remarque=body.remarque,
    )
    db.add(pointage)
    db.commit()
    db.refresh(pointage)

    msgs = {
        "present": f"Entree enregistree a {heure_now}",
        "retard":  f"RETARD {heure_now} (limite {heure_limite})",
        "sortie":  f"Sortie enregistree a {heure_now}",
        "refuse":  f"REFUSE - {motif_refus}",
    }
    return ScanResponse(
        pointage_id=pointage.id, eleve_id=eleve.id, matricule=eleve.matricule,
        nom_complet=nom_complet, classe=classe_nom, ecole=ecole_nom, photo_url=None,
        statut=statut, heure_entree=heure_now, motif_refus=motif_refus,
        message=msgs.get(statut, f"Pointe a {heure_now}"),
        solde_impaye=solde_impaye,
        montant_du=abs(float(eleve.solde or 0)) if solde_impaye else 0.0,
    )


@router.get("/journal")
def journal_du_jour(
    date_param: Optional[str] = Query(None, alias="date"),
    ecole_id:   Optional[int] = Query(None),
    classe_id:  Optional[int] = Query(None),
    statut:     Optional[str] = Query(None),
    limit:      int           = Query(200, le=500),
    scope: SchoolScope = Depends(get_school_scope),
    db: Session = Depends(get_db),
):
    """Journal des pointages du jour."""
    try:
        jour = datetime.strptime(date_param, "%Y-%m-%d").date() if date_param else date.today()
    except ValueError:
        jour = date.today()
    debut = datetime.combine(jour, datetime.min.time())
    fin   = debut + timedelta(days=1)
    q = db.query(models.PointageBadge).filter(and_(
        models.PointageBadge.date_pointage >= debut,
        models.PointageBadge.date_pointage < fin,
    ))
    eff_ecole = ecole_id or scope.ecole_id
    if eff_ecole and not scope.is_global:
        q = q.filter(models.PointageBadge.ecole_id == eff_ecole)
    elif scope.code_etablissement and not scope.is_global:
        q = q.filter(models.PointageBadge.ET_CODEETABLISSEMENT == scope.code_etablissement)
    if statut:
        q = q.filter(models.PointageBadge.statut == statut)
    pointages = q.order_by(models.PointageBadge.date_pointage.desc()).limit(limit).all()
    result = []
    for p in pointages:
        eleve  = p.eleve
        classe = db.query(models.Classe).filter(
            models.Classe.id == eleve.classe_id).first() if eleve else None
        if classe_id and (not classe or classe.id != classe_id):
            continue
        result.append({
            "id": p.id, "eleve_id": p.eleve_id,
            "matricule": eleve.matricule if eleve else "-",
            "nom_complet": f"{eleve.nom} {eleve.prenom}" if eleve else "-",
            "classe": classe.CE_LIBELLE if classe else "-",
            "statut": p.statut, "heure_entree": p.heure_entree,
            "date_pointage": p.date_pointage.isoformat() if p.date_pointage else None,
            "pointe_par": p.pointe_par_nom, "motif_refus": p.motif_refus,
            "solde_impaye": float(eleve.solde or 0) < 0 if eleve else False,
        })
    return {"date": jour.isoformat(), "total": len(result), "pointages": result}


@router.get("/stats")
def stats_du_jour(
    date_param: Optional[str] = Query(None, alias="date"),
    ecole_id:   Optional[int] = Query(None),
    scope: SchoolScope = Depends(get_school_scope),
    db: Session = Depends(get_db),
):
    """Stats de pointage du jour."""
    try:
        jour = datetime.strptime(date_param, "%Y-%m-%d").date() if date_param else date.today()
    except ValueError:
        jour = date.today()
    debut = datetime.combine(jour, datetime.min.time())
    fin   = debut + timedelta(days=1)
    eff_ecole = ecole_id or scope.ecole_id
    q_eleves = db.query(func.count(models.Eleve.id)).filter(models.Eleve.statut == "actif")
    if eff_ecole:
        q_eleves = q_eleves.filter(models.Eleve.ecole_id == eff_ecole)
    elif scope.code_etablissement:
        q_eleves = q_eleves.filter(models.Eleve.ET_CODEETABLISSEMENT == scope.code_etablissement)
    total_eleves = q_eleves.scalar() or 0
    q_base = db.query(models.PointageBadge.statut, func.count(models.PointageBadge.id).label("nb")).filter(
        models.PointageBadge.date_pointage >= debut, models.PointageBadge.date_pointage < fin)
    if eff_ecole:
        q_base = q_base.filter(models.PointageBadge.ecole_id == eff_ecole)
    elif scope.code_etablissement and not scope.is_global:
        q_base = q_base.filter(models.PointageBadge.ET_CODEETABLISSEMENT == scope.code_etablissement)
    rows   = q_base.group_by(models.PointageBadge.statut).all()
    counts = {r.statut: r.nb for r in rows}
    pointes = counts.get("present", 0) + counts.get("retard", 0)
    return {
        "date": jour.isoformat(), "total_eleves": total_eleves, "pointes": pointes,
        "presents": counts.get("present", 0), "retards": counts.get("retard", 0),
        "sorties": counts.get("sortie", 0), "refuses": counts.get("refuse", 0),
        "non_pointes": max(0, total_eleves - pointes),
        "taux_presence": round(pointes / total_eleves * 100, 1) if total_eleves > 0 else 0,
    }


@router.get("/eleve/{eleve_id}")
def historique_eleve(
    eleve_id: int,
    jours: int = Query(30, le=90),
    scope: SchoolScope = Depends(get_school_scope),
    db: Session = Depends(get_db),
):
    """Historique de pointage d'un eleve."""
    eleve = db.query(models.Eleve).filter(models.Eleve.id == eleve_id).first()
    if not eleve:
        raise HTTPException(status_code=404, detail="Eleve introuvable.")
    if scope.ecole_id and eleve.ecole_id != scope.ecole_id and not scope.is_global:
        raise HTTPException(status_code=403, detail="Eleve d une autre ecole.")
    depuis = datetime.combine(date.today() - timedelta(days=jours), datetime.min.time())
    pointages = db.query(models.PointageBadge).filter(
        models.PointageBadge.eleve_id == eleve_id,
        models.PointageBadge.date_pointage >= depuis,
    ).order_by(models.PointageBadge.date_pointage.desc()).all()
    return {
        "eleve_id": eleve_id, "matricule": eleve.matricule,
        "nom_complet": f"{eleve.nom} {eleve.prenom}",
        "periode_jours": jours, "total_pointages": len(pointages),
        "historique": [{"id": p.id,
            "date": p.date_pointage.date().isoformat() if p.date_pointage else None,
            "heure_entree": p.heure_entree, "statut": p.statut,
            "pointe_par": p.pointe_par_nom, "motif_refus": p.motif_refus,
        } for p in pointages],
    }


@router.delete("/{pointage_id}")
def annuler_pointage(
    pointage_id: int,
    scope: SchoolScope = Depends(get_school_scope),
    db: Session = Depends(get_db),
):
    """Supprime un pointage (directeurs uniquement)."""
    if scope.role not in ("directeur_ecole", "directeur", "admin", "direction_fondation") and not scope.is_global:
        raise HTTPException(status_code=403, detail="Suppression reservee aux directeurs.")
    p = db.query(models.PointageBadge).filter(models.PointageBadge.id == pointage_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Pointage introuvable.")
    db.delete(p)
    db.commit()
    return {"success": True, "message": "Pointage supprime."}
