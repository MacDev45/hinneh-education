"""Gestion des réductions sur les frais de scolarité et services."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from ..database import get_db
from .. import crud, schemas, models
from ..routers.auth import get_school_scope, SchoolScope
from .audit import log_audit

router = APIRouter(prefix="/reductions", tags=["Réductions"])


class ReductionCreate(schemas.BaseModel):
    eleve_id: int
    type_reduction: str  # 'montant', 'pourcentage', 'bourse', 'subvention'
    montant_reduction: Optional[Decimal] = None
    pourcentage_reduction: Optional[Decimal] = None
    motif: Optional[str] = None
    date_debut: Optional[date] = None
    date_fin: Optional[date] = None
    service_type: Optional[str] = None  # None = toutes les services
    approuve_par: Optional[str] = None
    appliquer_immediatement: Optional[bool] = True
    mode_dispersion: Optional[str] = "dernieres_tranches"  # 'dernieres_tranches' ou 'proportionnel'


class ReductionPreviewRequest(schemas.BaseModel):
    eleve_id: int
    type_reduction: str  # 'montant', 'pourcentage', 'bourse', 'subvention'
    montant_reduction: Optional[Decimal] = None
    pourcentage_reduction: Optional[Decimal] = None
    service_type: Optional[str] = None
    mode_dispersion: Optional[str] = "dernieres_tranches"


class ReductionUpdate(schemas.BaseModel):
    type_reduction: Optional[str] = None
    montant_reduction: Optional[Decimal] = None
    pourcentage_reduction: Optional[Decimal] = None
    motif: Optional[str] = None
    date_debut: Optional[date] = None
    date_fin: Optional[date] = None
    statut: Optional[str] = None
    service_type: Optional[str] = None
    approuve_par: Optional[str] = None


@router.get("/")
def list_reductions(
    eleve_id: Optional[int] = Query(None, description="Filtrer par élève"),
    statut: Optional[str] = Query(None, description="Filtrer par statut"),
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Lister les réductions enrichies des détails élèves et échéanciers."""
    query = db.query(models.Reduction)

    if not scope.is_global:
        auth_ids = scope.get_authorized_school_ids(db)
        auth_codes = scope.get_authorized_school_codes(db)
        conds = []
        if auth_ids:
            conds.append(models.Reduction.ecole_id.in_(auth_ids))
        if auth_codes:
            conds.append(func.upper(models.Reduction.ET_CODEETABLISSEMENT).in_([c.upper() for c in auth_codes]))
        if conds:
            query = query.filter(or_(*conds))
        else:
            return []

    if eleve_id:
        query = query.filter(models.Reduction.eleve_id == eleve_id)

    if statut and statut != "tous":
        query = query.filter(models.Reduction.statut == statut)

    reductions = query.order_by(models.Reduction.id.desc()).all()
    results = []

    for r in reductions:
        student = db.query(models.Eleve).filter(models.Eleve.id == r.eleve_id).first()
        echeances = db.query(models.EcheancierPaiement).filter(models.EcheancierPaiement.eleve_id == r.eleve_id).all()
        
        tot_prevu = sum((float(e.montant_prevu) for e in echeances), 0.0)
        tot_paye = sum((float(e.montant_paye) for e in echeances), 0.0)
        tot_solde = max(0.0, tot_prevu - tot_paye)

        results.append({
            "id": r.id,
            "eleve_id": r.eleve_id,
            "eleve_nom": getattr(student, "nom", "") or getattr(student, "lastName", "") or "—",
            "eleve_prenom": getattr(student, "prenoms", "") or getattr(student, "firstName", "") or "—",
            "matricule": getattr(student, "matricule", "—") or "—",
            "eleve_classe": getattr(student, "className", "") or getattr(student, "classLevel", "") or "—",
            "type_reduction": r.type_reduction,
            "montant_reduction": float(r.montant_reduction) if r.montant_reduction else None,
            "pourcentage_reduction": float(r.pourcentage_reduction) if r.pourcentage_reduction else None,
            "motif": r.motif or "",
            "date_debut": str(r.date_debut) if r.date_debut else None,
            "date_fin": str(r.date_fin) if r.date_fin else None,
            "statut": r.statut,
            "appliquee_aux_echeances": bool(r.appliquee_aux_echeances),
            "service_type": r.service_type or "scolarite",
            "date_creation": r.date_creation.isoformat() if r.date_creation else "",
            "total_prevu": tot_prevu,
            "total_paye": tot_paye,
            "total_solde": tot_solde,
            "tranches_count": len(echeances)
        })

    return results


@router.get("/student/{eleve_id}/echeancier")
def get_student_echeancier_for_reduction(
    eleve_id: int,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Récupère l'échéancier complet d'un élève avec son état actuel."""
    student = db.query(models.Eleve).filter(models.Eleve.id == eleve_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Élève non trouvé")

    echeances = db.query(models.EcheancierPaiement).filter(
        models.EcheancierPaiement.eleve_id == eleve_id
    ).order_by(models.EcheancierPaiement.tranche_numero.asc()).all()

    tranches_list = []
    tot_prevu = 0.0
    tot_paye = 0.0

    for e in echeances:
        mp = float(e.montant_prevu)
        my = float(e.montant_paye)
        solde = max(0.0, mp - my)
        tot_prevu += mp
        tot_paye += my

        tranches_list.append({
            "id": e.id,
            "tranche_numero": e.tranche_numero,
            "libelle": e.libelle,
            "service_type": e.service_type,
            "date_echeance": str(e.date_echeance) if e.date_echeance else "—",
            "montant_prevu": mp,
            "montant_paye": my,
            "solde_restant": solde,
            "statut": e.statut
        })

    return {
        "eleve_id": eleve_id,
        "eleve_nom": f"{getattr(student, 'prenoms', '') or getattr(student, 'firstName', '')} {getattr(student, 'nom', '') or getattr(student, 'lastName', '')}".strip(),
        "matricule": getattr(student, "matricule", "—"),
        "classe": getattr(student, "className", "") or getattr(student, "classLevel", "") or "—",
        "tranches": tranches_list,
        "total_prevu": tot_prevu,
        "total_paye": tot_paye,
        "total_solde": max(0.0, tot_prevu - tot_paye)
    }


@router.post("/preview-adjustment")
def preview_reduction_adjustment(
    req: ReductionPreviewRequest,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Simule l'impact d'une réduction sur l'échéancier de l'élève en temps réel."""
    student = db.query(models.Eleve).filter(models.Eleve.id == req.eleve_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Élève non trouvé")

    query_echeances = db.query(models.EcheancierPaiement).filter(
        models.EcheancierPaiement.eleve_id == req.eleve_id
    )
    if req.service_type:
        query_echeances = query_echeances.filter(models.EcheancierPaiement.service_type == req.service_type)

    echeances = query_echeances.order_by(models.EcheancierPaiement.tranche_numero.asc()).all()
    if not echeances:
        return {
            "has_echeancier": False,
            "message": "Aucun échéancier configuré pour cet élève.",
            "tranches": [],
            "total_initial": 0.0,
            "montant_reduction_total": 0.0,
            "total_ajuste": 0.0
        }

    total_initial = sum((float(e.montant_prevu) for e in echeances), 0.0)
    total_reste_initial = sum((max(0.0, float(e.montant_prevu) - float(e.montant_paye)) for e in echeances), 0.0)

    # Calcul du montant total de la réduction
    if req.type_reduction in ["pourcentage", "fraterie", "fraterie_daloa", "personnel", "personnel_standard", "personnel_strategique", "famille_nombreuse"] or req.pourcentage_reduction:
        taux = float(req.pourcentage_reduction or 0.0)
        montant_reduction_total = (total_initial * taux) / 100.0
    else:
        montant_reduction_total = float(req.montant_reduction or 0.0)

    # Répartition de la réduction
    tranches_simulees = []
    reduction_restante = Decimal(str(montant_reduction_total))

    # Méthode : absorption à partir des dernières tranches non totalement payées
    if req.mode_dispersion == "dernieres_tranches":
        # Traitement inverse pour déduire d'abord les dernières tranches
        echeances_reverse = list(reversed(echeances))
        deductions_map = {}

        for e in echeances_reverse:
            if reduction_restante <= 0:
                deductions_map[e.id] = Decimal("0.0")
                continue
            mp = Decimal(str(e.montant_prevu))
            my = Decimal(str(e.montant_paye))
            dispo_a_reduire = max(Decimal("0.0"), mp - my)
            reduction_tranche = min(reduction_restante, dispo_a_reduire)
            deductions_map[e.id] = reduction_tranche
            reduction_restante -= reduction_tranche

        for e in echeances:
            mp = float(e.montant_prevu)
            my = float(e.montant_paye)
            red_t = float(deductions_map.get(e.id, Decimal("0.0")))
            nouveau_prevu = max(my, mp - red_t)
            nouveau_solde = max(0.0, nouveau_prevu - my)
            statut_apres = "paye" if nouveau_solde == 0 and nouveau_prevu > 0 else ("non_paye" if my == 0 else "partiel")
            if nouveau_prevu == 0:
                statut_apres = "exonere"

            tranches_simulees.append({
                "id": e.id,
                "tranche_numero": e.tranche_numero,
                "libelle": e.libelle,
                "date_echeance": str(e.date_echeance) if e.date_echeance else "—",
                "montant_initial": mp,
                "reduction_appliquee": red_t,
                "nouveau_montant_prevu": nouveau_prevu,
                "montant_paye": my,
                "nouveau_solde_restant": nouveau_solde,
                "statut_avant": e.statut,
                "statut_apres": statut_apres
            })
    else:
        # Proportionnel
        for e in echeances:
            mp = float(e.montant_prevu)
            my = float(e.montant_paye)
            prop = mp / total_initial if total_initial > 0 else 0.0
            red_t = min(mp - my, montant_reduction_total * prop) if (mp - my) > 0 else 0.0
            nouveau_prevu = max(my, mp - red_t)
            nouveau_solde = max(0.0, nouveau_prevu - my)
            statut_apres = "paye" if nouveau_solde == 0 and nouveau_prevu > 0 else ("non_paye" if my == 0 else "partiel")

            tranches_simulees.append({
                "id": e.id,
                "tranche_numero": e.tranche_numero,
                "libelle": e.libelle,
                "date_echeance": str(e.date_echeance) if e.date_echeance else "—",
                "montant_initial": mp,
                "reduction_appliquee": red_t,
                "nouveau_montant_prevu": nouveau_prevu,
                "montant_paye": my,
                "nouveau_solde_restant": nouveau_solde,
                "statut_avant": e.statut,
                "statut_apres": statut_apres
            })

    total_ajuste = sum((t["nouveau_montant_prevu"] for t in tranches_simulees), 0.0)
    total_solde_ajuste = sum((t["nouveau_solde_restant"] for t in tranches_simulees), 0.0)

    return {
        "has_echeancier": True,
        "tranches": tranches_simulees,
        "total_initial": total_initial,
        "montant_reduction_total": montant_reduction_total,
        "total_ajuste": total_ajuste,
        "total_solde_ajuste": total_solde_ajuste
    }


# ==============================================================================
# GESTION DES PARAMÈTRES & CRITÈRES D'ATTRIBUTION DES RÉDUCTIONS PAR ÉCOLE
# ==============================================================================

DEFAULT_REDUCTION_RULES = [
    {
        "code_regle": "fratrie_2e",
        "libelle": "Fratrie — 2e enfant",
        "categorie": "fraterie_daloa",
        "type_valeur": "pourcentage",
        "taux_defaut": Decimal("10.00"),
        "montant_defaut": Decimal("0.00"),
        "description": "Barème suggéré pour le 2e enfant inscrit (modifiable à la saisie).",
        "criteres": "Enfant inscrit en 2e position d'une fratrie.",
        "ordre_affichage": 1,
    },
    {
        "code_regle": "fratrie_3e",
        "libelle": "Fratrie — 3e enfant",
        "categorie": "fraterie_daloa",
        "type_valeur": "pourcentage",
        "taux_defaut": Decimal("15.00"),
        "montant_defaut": Decimal("0.00"),
        "description": "Barème suggéré pour le 3e enfant inscrit (modifiable à la saisie).",
        "criteres": "Enfant inscrit en 3e position d'une fratrie.",
        "ordre_affichage": 2,
    },
    {
        "code_regle": "fratrie_4e_plus",
        "libelle": "Fratrie — 4e enfant et +",
        "categorie": "fraterie_daloa",
        "type_valeur": "pourcentage",
        "taux_defaut": Decimal("20.00"),
        "montant_defaut": Decimal("0.00"),
        "description": "Barème suggéré pour le 4e enfant et plus (modifiable à la saisie).",
        "criteres": "Enfant inscrit en 4e position ou plus.",
        "ordre_affichage": 3,
    },
    {
        "code_regle": "personnel_standard",
        "libelle": "Enfants du Personnel Standard",
        "categorie": "personnel_standard",
        "type_valeur": "pourcentage",
        "taux_defaut": Decimal("25.00"),
        "montant_defaut": Decimal("0.00"),
        "description": "Réduction de 25% accordée aux enfants des agents et enseignants de l'établissement.",
        "criteres": "Parent membre du personnel répertorié dans l'établissement.",
        "ordre_affichage": 4,
    },
    {
        "code_regle": "personnel_strategique",
        "libelle": "Groupe Stratégique (Direction des Études)",
        "categorie": "personnel_strategique",
        "type_valeur": "pourcentage",
        "taux_defaut": Decimal("30.00"),
        "montant_defaut": Decimal("0.00"),
        "description": "Réduction préférentielle de 30% pour les membres désignés par la Direction (quota 7 max).",
        "criteres": "Nomination formelle par la Direction des Études.",
        "ordre_affichage": 5,
    },
    {
        "code_regle": "cas_social",
        "libelle": "Cas Social & Situation Vulnérable",
        "categorie": "cas_social",
        "type_valeur": "pourcentage",
        "taux_defaut": Decimal("10.00"),
        "montant_defaut": Decimal("0.00"),
        "description": "Aide sociale pour élève en situation de précarité ou orphelinat.",
        "criteres": "Dossier social validé par le service social / la Direction.",
        "ordre_affichage": 6,
    },
    {
        "code_regle": "decision_direction",
        "libelle": "Décision Spéciale de la Direction",
        "categorie": "decision_direction",
        "type_valeur": "pourcentage",
        "taux_defaut": Decimal("10.00"),
        "montant_defaut": Decimal("0.00"),
        "description": "Remise discrétionnaire ou protocolaire accordée par la Direction.",
        "criteres": "Accord écrit de la Direction Générale / Fondateur.",
        "ordre_affichage": 7,
    },
    {
        "code_regle": "bourse_excellence",
        "libelle": "Bourse d'Excellence & Mérite",
        "categorie": "bourse",
        "type_valeur": "pourcentage",
        "taux_defaut": Decimal("20.00"),
        "montant_defaut": Decimal("0.00"),
        "description": "Réduction récompensant les meilleurs résultats scolaires ou concours.",
        "criteres": "Moyenne générale supérieure ou égale à 15/20.",
        "ordre_affichage": 8,
    }
]


class ParametreReductionSchema(schemas.BaseModel):
    id: Optional[int] = None
    code_regle: Optional[str] = None
    libelle: str
    categorie: str = "fraterie_daloa"
    type_valeur: str = "pourcentage"
    taux_defaut: Optional[Decimal] = Decimal("0.00")
    montant_defaut: Optional[Decimal] = Decimal("0.00")
    description: Optional[str] = None
    criteres: Optional[str] = None
    ordre_affichage: Optional[int] = 1
    is_active: Optional[bool] = True
    ecole_id: Optional[int] = None
    ET_CODEETABLISSEMENT: Optional[str] = None
    ville: Optional[str] = None


@router.get("/parametres")
def list_parametres_reduction(
    ecole_id: Optional[int] = Query(None),
    code_etablissement: Optional[str] = Query(None),
    ville: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Lister les règles et paramètres d'attribution des réductions pour l'école cible."""
    target_ecole_id = ecole_id or getattr(scope, "ecole_id", None)
    target_code = code_etablissement or getattr(scope, "code_etablissement", None) or getattr(scope, "et_codeetablissement", None)
    target_ville = ville or getattr(scope, "ville", None)

    # Résolution automatique des informations réelles de l'établissement depuis la base de données
    if target_ecole_id and (not target_code or not target_ville):
        school = db.query(models.Etablissement).filter(models.Etablissement.IDETABLISSEMENT == target_ecole_id).first()
        if school:
            target_code = target_code or school.ET_CODEETABLISSEMENT
            target_ville = target_ville or school.ET_VILLE
    elif target_code and (not target_ecole_id or not target_ville):
        school = db.query(models.Etablissement).filter(func.upper(models.Etablissement.ET_CODEETABLISSEMENT) == target_code.upper()).first()
        if school:
            target_ecole_id = target_ecole_id or school.IDETABLISSEMENT
            target_ville = target_ville or school.ET_VILLE

    query = db.query(models.ParametreReduction)

    if target_ecole_id:
        query = query.filter(or_(
            models.ParametreReduction.ecole_id == target_ecole_id,
            models.ParametreReduction.ecole_id.is_(None)
        ))
    elif target_code:
        query = query.filter(or_(
            func.upper(models.ParametreReduction.ET_CODEETABLISSEMENT) == target_code.upper(),
            models.ParametreReduction.ET_CODEETABLISSEMENT.is_(None)
        ))

    rules = query.order_by(models.ParametreReduction.ordre_affichage.asc(), models.ParametreReduction.id.asc()).all()

    # Si aucune règle en base, initialiser les barèmes par défaut pour l'établissement
    if not rules:
        for r_def in DEFAULT_REDUCTION_RULES:
            new_param = models.ParametreReduction(
                code_regle=r_def["code_regle"],
                libelle=r_def["libelle"],
                categorie=r_def["categorie"],
                type_valeur=r_def["type_valeur"],
                taux_defaut=r_def["taux_defaut"],
                montant_defaut=r_def["montant_defaut"],
                description=r_def["description"],
                criteres=r_def["criteres"],
                ordre_affichage=r_def["ordre_affichage"],
                is_active=True,
                ecole_id=target_ecole_id,
                ET_CODEETABLISSEMENT=target_code,
                ville=target_ville
            )
            db.add(new_param)
        db.commit()
        rules = db.query(models.ParametreReduction).filter(
            or_(models.ParametreReduction.ecole_id == target_ecole_id, models.ParametreReduction.ecole_id.is_(None))
        ).order_by(models.ParametreReduction.ordre_affichage.asc()).all()

    return [
        {
            "id": r.id,
            "code_regle": r.code_regle,
            "libelle": r.libelle,
            "categorie": r.categorie,
            "type_valeur": r.type_valeur,
            "taux_defaut": float(r.taux_defaut or 0.0),
            "montant_defaut": float(r.montant_defaut or 0.0),
            "description": r.description or "",
            "criteres": r.criteres or "",
            "ordre_affichage": r.ordre_affichage,
            "is_active": bool(r.is_active),
            "ecole_id": r.ecole_id,
            "ET_CODEETABLISSEMENT": r.ET_CODEETABLISSEMENT,
            "ville": r.ville or "",
            "date_creation": r.date_creation.isoformat() if r.date_creation else "",
            "date_modification": r.date_modification.isoformat() if r.date_modification else ""
        }
        for r in rules
    ]


@router.post("/parametres")
def create_parametre_reduction(
    payload: ParametreReductionSchema,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Créer une nouvelle règle ou critère d'attribution de réduction."""
    target_ecole_id = payload.ecole_id or getattr(scope, "ecole_id", None)
    target_code = payload.ET_CODEETABLISSEMENT or getattr(scope, "code_etablissement", None) or getattr(scope, "et_codeetablissement", None)
    target_ville = payload.ville or getattr(scope, "ville", None)

    # Compléter depuis la BD de l'établissement si manquant
    if target_ecole_id and (not target_code or not target_ville):
        school = db.query(models.Etablissement).filter(models.Etablissement.IDETABLISSEMENT == target_ecole_id).first()
        if school:
            target_code = target_code or school.ET_CODEETABLISSEMENT
            target_ville = target_ville or school.ET_VILLE
    elif target_code and (not target_ecole_id or not target_ville):
        school = db.query(models.Etablissement).filter(func.upper(models.Etablissement.ET_CODEETABLISSEMENT) == target_code.upper()).first()
        if school:
            target_ecole_id = target_ecole_id or school.IDETABLISSEMENT
            target_ville = target_ville or school.ET_VILLE

    code_regle = payload.code_regle or f"custom_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"

    param = models.ParametreReduction(
        code_regle=code_regle,
        libelle=payload.libelle,
        categorie=payload.categorie,
        type_valeur=payload.type_valeur,
        taux_defaut=payload.taux_defaut,
        montant_defaut=payload.montant_defaut,
        description=payload.description,
        criteres=payload.criteres,
        ordre_affichage=payload.ordre_affichage or 10,
        is_active=payload.is_active if payload.is_active is not None else True,
        ecole_id=target_ecole_id,
        ET_CODEETABLISSEMENT=target_code,
        ville=target_ville
    )
    db.add(param)
    db.commit()
    db.refresh(param)

    return {
        "success": True,
        "message": "Critère de réduction créé avec succès",
        "data": {
            "id": param.id,
            "code_regle": param.code_regle,
            "libelle": param.libelle,
            "categorie": param.categorie,
            "type_valeur": param.type_valeur,
            "taux_defaut": float(param.taux_defaut or 0.0),
            "montant_defaut": float(param.montant_defaut or 0.0),
            "description": param.description or "",
            "criteres": param.criteres or "",
            "is_active": param.is_active,
            "ecole_id": param.ecole_id,
            "ET_CODEETABLISSEMENT": param.ET_CODEETABLISSEMENT,
            "ville": param.ville or ""
        }
    }


@router.post("/parametres/reset-defaults")
def reset_parametres_reduction_defaults(
    ecole_id: Optional[int] = Query(None),
    code_etablissement: Optional[str] = Query(None),
    ville: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Réinitialiser les paramètres d'attribution aux valeurs officielles par défaut."""
    target_ecole_id = ecole_id or getattr(scope, "ecole_id", None)
    target_code = code_etablissement or getattr(scope, "code_etablissement", None) or getattr(scope, "et_codeetablissement", None)
    target_ville = ville or getattr(scope, "ville", None)

    # Supprimer les anciens critères pour cette école
    if target_ecole_id:
        db.query(models.ParametreReduction).filter(models.ParametreReduction.ecole_id == target_ecole_id).delete()
    else:
        db.query(models.ParametreReduction).filter(models.ParametreReduction.ecole_id.is_(None)).delete()

    for r_def in DEFAULT_REDUCTION_RULES:
        new_param = models.ParametreReduction(
            code_regle=r_def["code_regle"],
            libelle=r_def["libelle"],
            categorie=r_def["categorie"],
            type_valeur=r_def["type_valeur"],
            taux_defaut=r_def["taux_defaut"],
            montant_defaut=r_def["montant_defaut"],
            description=r_def["description"],
            criteres=r_def["criteres"],
            ordre_affichage=r_def["ordre_affichage"],
            is_active=True,
            ecole_id=target_ecole_id,
            ET_CODEETABLISSEMENT=target_code,
            ville=target_ville
        )
        db.add(new_param)

    db.commit()

    return {
        "success": True,
        "message": f"Barèmes et critères réinitialisés par défaut ({len(DEFAULT_REDUCTION_RULES)} règles créées)"
    }


@router.put("/parametres/{param_id}")
def update_parametre_reduction(
    param_id: int,
    payload: ParametreReductionSchema,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Mettre à jour un critère d'attribution existant."""
    param = db.query(models.ParametreReduction).filter(models.ParametreReduction.id == param_id).first()
    if not param:
        raise HTTPException(status_code=404, detail="Critère de réduction non trouvé")

    if payload.libelle is not None:
        param.libelle = payload.libelle
    if payload.categorie is not None:
        param.categorie = payload.categorie
    if payload.type_valeur is not None:
        param.type_valeur = payload.type_valeur
    if payload.taux_defaut is not None:
        param.taux_defaut = payload.taux_defaut
    if payload.montant_defaut is not None:
        param.montant_defaut = payload.montant_defaut
    if payload.description is not None:
        param.description = payload.description
    if payload.criteres is not None:
        param.criteres = payload.criteres
    if payload.ordre_affichage is not None:
        param.ordre_affichage = payload.ordre_affichage
    if payload.is_active is not None:
        param.is_active = payload.is_active
    if payload.ecole_id is not None:
        param.ecole_id = payload.ecole_id
    if payload.ET_CODEETABLISSEMENT is not None:
        param.ET_CODEETABLISSEMENT = payload.ET_CODEETABLISSEMENT
    if payload.ville is not None:
        param.ville = payload.ville

    param.date_modification = datetime.utcnow()
    db.commit()
    db.refresh(param)

    return {
        "success": True,
        "message": "Critère de réduction mis à jour avec succès",
        "data": {
            "id": param.id,
            "code_regle": param.code_regle,
            "libelle": param.libelle,
            "categorie": param.categorie,
            "type_valeur": param.type_valeur,
            "taux_defaut": float(param.taux_defaut or 0.0),
            "montant_defaut": float(param.montant_defaut or 0.0),
            "description": param.description or "",
            "criteres": param.criteres or "",
            "is_active": param.is_active,
            "ecole_id": param.ecole_id,
            "ET_CODEETABLISSEMENT": param.ET_CODEETABLISSEMENT,
            "ville": param.ville or ""
        }
    }


@router.delete("/parametres/{param_id}")
def delete_parametre_reduction(
    param_id: int,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Supprimer un critère d'attribution de réduction."""
    param = db.query(models.ParametreReduction).filter(models.ParametreReduction.id == param_id).first()
    if not param:
        raise HTTPException(status_code=404, detail="Critère de réduction non trouvé")

    db.delete(param)
    db.commit()

    return {
        "success": True,
        "message": "Critère de réduction supprimé avec succès"
    }


@router.post("/")
def create_reduction(
    data: ReductionCreate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Créer une réduction et ajuster immédiatement l'échéancier si demandé."""
    student = db.query(models.Eleve).filter(models.Eleve.id == data.eleve_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Élève non trouvé")

    if data.type_reduction == "montant" and not data.montant_reduction:
        raise HTTPException(status_code=400, detail="montant_reduction requis pour type='montant'")
    if data.type_reduction == "pourcentage" and not data.pourcentage_reduction:
        raise HTTPException(status_code=400, detail="pourcentage_reduction requis pour type='pourcentage'")

    reduction = models.Reduction(
        eleve_id=data.eleve_id,
        ecole_id=student.ecole_id,
        ET_CODEETABLISSEMENT=student.ET_CODEETABLISSEMENT,
        type_reduction=data.type_reduction,
        montant_reduction=data.montant_reduction,
        pourcentage_reduction=data.pourcentage_reduction,
        motif=data.motif,
        date_debut=data.date_debut,
        date_fin=data.date_fin,
        service_type=data.service_type or "scolarite",
        statut="actif",
        appliquee_aux_echeances=False
    )
    db.add(reduction)
    db.commit()
    db.refresh(reduction)

    # Application immédiate de l'ajustement sur les tranches (si l'échéancier existe déjà).
    # Si l'échéancier de l'élève n'a pas encore été généré à ce stade (ex: réduction saisie
    # avant l'application du barème de scolarité), la réduction reste active mais non
    # appliquée : elle sera automatiquement répercutée dès que l'échéancier sera créé,
    # via apply_pending_reductions_for_student (voir routers/echeancier.py).
    if data.appliquer_immediatement:
        try:
            _disperse_reduction_core(db, reduction, data.mode_dispersion or "dernieres_tranches")
            db.refresh(reduction)
        except ValueError as e:
            print(f"[Info] Réduction #{reduction.id} non appliquée immédiatement (sera ré-appliquée dès génération de l'échéancier) : {e}")
        except Exception as e:
            print(f"[Warning] Auto-disperse reduction: {e}")

    log_audit(
        db,
        action="ATTRIBUTION_REDUCTION",
        module="EXONERATIONS_REDUCTIONS",
        detail=f"Attribution réduction ({reduction.type_reduction}: {float(reduction.pourcentage_reduction or reduction.montant_reduction or 0)}) — Motif: {reduction.motif or 'Sans motif'}",
        user=scope.user,
        username=scope.username,
        role=scope.role,
        ecole_id=reduction.ecole_id,
        code_etablissement=reduction.ET_CODEETABLISSEMENT,
        target_id=str(reduction.id),
        target_name=f"Élève: {student.nom} {student.prenom} ({student.matricule or ''})",
        statut="SUCCES"
    )

    return reduction


@router.put("/{reduction_id}")
def update_reduction(
    reduction_id: int,
    data: ReductionUpdate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Modifier une réduction."""
    reduction = db.query(models.Reduction).filter(models.Reduction.id == reduction_id).first()
    if not reduction:
        raise HTTPException(status_code=404, detail="Réduction non trouvée")

    if not scope.is_global and scope.ecole_id and reduction.ecole_id != scope.ecole_id:
        raise HTTPException(status_code=403, detail="Vous n'avez pas accès à cette réduction")

    update_dict = data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        if value is not None:
            setattr(reduction, key, value)

    reduction.date_modification = datetime.utcnow()
    db.commit()
    db.refresh(reduction)

    log_audit(
        db,
        action="MODIFICATION",
        module="EXONERATIONS_REDUCTIONS",
        detail=f"Modification de la réduction #{reduction.id} (Statut: {reduction.statut})",
        user=scope.user,
        username=scope.username,
        role=scope.role,
        ecole_id=reduction.ecole_id,
        code_etablissement=reduction.ET_CODEETABLISSEMENT,
        target_id=str(reduction.id),
        statut="SUCCES"
    )

    return reduction


@router.delete("/{reduction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reduction(
    reduction_id: int,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Supprimer une réduction."""
    reduction = db.query(models.Reduction).filter(models.Reduction.id == reduction_id).first()
    if not reduction:
        raise HTTPException(status_code=404, detail="Réduction non trouvée")

    if not scope.is_global and scope.ecole_id and reduction.ecole_id != scope.ecole_id:
        raise HTTPException(status_code=403, detail="Vous n'avez pas accès à cette réduction")

    saved_ecole_id = reduction.ecole_id
    saved_code = reduction.ET_CODEETABLISSEMENT

    db.delete(reduction)
    db.commit()

    log_audit(
        db,
        action="SUPPRESSION",
        module="EXONERATIONS_REDUCTIONS",
        detail=f"Suppression de la réduction #{reduction_id}",
        user=scope.user,
        username=scope.username,
        role=scope.role,
        ecole_id=saved_ecole_id,
        code_etablissement=saved_code,
        target_id=str(reduction_id),
        statut="AVERTISSEMENT"
    )


def _disperse_reduction_core(
    db: Session,
    reduction: models.Reduction,
    mode_dispersion: str = "dernieres_tranches"
) -> dict:
    """Cœur de la logique de dispersion d'une réduction sur les tranches d'échéancier.

    Factorisé pour être appelable aussi bien depuis la route HTTP `/disperse` que
    depuis `apply_pending_reductions_for_student` (ré-application automatique dès
    que l'échéancier d'un élève est (re)généré après-coup).
    Lève un ValueError si aucun échéancier n'est disponible pour cet élève.
    """
    query_echeances = db.query(models.EcheancierPaiement).filter(
        models.EcheancierPaiement.eleve_id == reduction.eleve_id
    )
    if reduction.service_type:
        query_echeances = query_echeances.filter(models.EcheancierPaiement.service_type == reduction.service_type)

    echeances = query_echeances.order_by(models.EcheancierPaiement.tranche_numero.asc()).all()
    if not echeances:
        raise ValueError("Aucun échéancier trouvé pour cet élève")

    total_initial = sum((Decimal(str(e.montant_prevu)) for e in echeances), Decimal("0.0"))

    if reduction.type_reduction in ["pourcentage", "fraterie", "fraterie_daloa", "personnel", "personnel_standard", "personnel_strategique", "famille_nombreuse"] or reduction.pourcentage_reduction:
        taux = Decimal(str(reduction.pourcentage_reduction or Decimal("0")))
        montant_a_reduire = (total_initial * taux) / Decimal("100.0")
    else:
        montant_a_reduire = Decimal(str(reduction.montant_reduction or Decimal("0")))

    remaining_reduction = montant_a_reduire
    dispersed_count = 0

    if mode_dispersion == "dernieres_tranches":
        echeances_reverse = list(reversed(echeances))
        for echeance in echeances_reverse:
            if remaining_reduction <= 0:
                break
            mp = Decimal(str(echeance.montant_prevu))
            my = Decimal(str(echeance.montant_paye))
            dispo = max(Decimal("0.0"), mp - my)
            if dispo <= 0:
                continue

            red_t = min(remaining_reduction, dispo)
            new_montant = mp - red_t
            echeance.montant_prevu = new_montant
            if new_montant <= my:
                echeance.statut = "paye"
            elif my > 0:
                echeance.statut = "partiel"
            else:
                echeance.statut = "non_paye"

            remaining_reduction -= red_t
            dispersed_count += 1
    else:
        for echeance in echeances:
            if remaining_reduction <= 0:
                break
            mp = Decimal(str(echeance.montant_prevu))
            my = Decimal(str(echeance.montant_paye))
            prop = mp / total_initial if total_initial > 0 else Decimal("0.0")
            red_t = min(remaining_reduction, max(Decimal("0.0"), (montant_a_reduire * prop)))
            red_t = min(red_t, max(Decimal("0.0"), mp - my))

            new_montant = mp - red_t
            echeance.montant_prevu = new_montant
            if new_montant <= my:
                echeance.statut = "paye"
            elif my > 0:
                echeance.statut = "partiel"
            else:
                echeance.statut = "non_paye"

            remaining_reduction -= red_t
            dispersed_count += 1

    reduction.appliquee_aux_echeances = True
    reduction.date_modification = datetime.utcnow()
    db.commit()

    return {
        "success": True,
        "message": f"Réduction appliquée et ajustée sur {dispersed_count} tranche(s)",
        "montant_reduit": float(montant_a_reduire),
        "echeanciers_affectes": dispersed_count
    }


def apply_pending_reductions_for_student(db: Session, eleve_id: int) -> int:
    """Ré-applique automatiquement les réductions actives d'un élève qui n'ont pas
    encore pu être répercutées sur son échéancier (cas typique : la réduction a été
    enregistrée à l'inscription avant que l'échéancier de scolarité ne soit généré).

    À appeler juste après toute (re)génération de tranches d'échéancier pour un élève
    (ex: application d'un barème officiel). Retourne le nombre de réductions appliquées.
    """
    pending = db.query(models.Reduction).filter(
        models.Reduction.eleve_id == eleve_id,
        models.Reduction.statut == "actif",
        models.Reduction.appliquee_aux_echeances.is_(False),
    ).all()

    applied = 0
    for red in pending:
        try:
            _disperse_reduction_core(db, red)
            applied += 1
        except Exception as e:
            print(f"[Warning] Auto-apply pending reduction #{red.id} (élève {eleve_id}): {e}")
    return applied


@router.post("/{reduction_id}/disperse")
def disperse_reduction(
    reduction_id: int,
    mode_dispersion: str = "dernieres_tranches",
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Appliquer la réduction aux tranches d'échéancier de l'élève."""
    reduction = db.query(models.Reduction).filter(models.Reduction.id == reduction_id).first()
    if not reduction:
        raise HTTPException(status_code=404, detail="Réduction non trouvée")

    if not scope.is_global and scope.ecole_id and reduction.ecole_id != scope.ecole_id:
        raise HTTPException(status_code=403, detail="Vous n'avez pas accès à cette réduction")

    if reduction.statut != "actif":
        raise HTTPException(status_code=400, detail="La réduction doit être active pour être appliquée")

    try:
        return _disperse_reduction_core(db, reduction, mode_dispersion)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/bulk-create")
def bulk_create_reductions(
    data: dict,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Créer des réductions en masse pour plusieurs élèves.
    Format: {
        "eleve_ids": [1, 2, 3],
        "type_reduction": "montant",
        "montant_reduction": 50000,
        "motif": "Bourse"
    }
    """
    eleve_ids = data.get("eleve_ids", [])
    type_reduction = data.get("type_reduction", "montant")
    montant = data.get("montant_reduction")
    pourcentage = data.get("pourcentage_reduction")
    motif = data.get("motif")

    if not eleve_ids:
        raise HTTPException(status_code=400, detail="eleve_ids requis")

    created_count = 0
    errors = []

    for eleve_id in eleve_ids:
        try:
            student = db.query(models.Eleve).filter(models.Eleve.id == eleve_id).first()
            if not student:
                errors.append(f"Élève {eleve_id}: non trouvé")
                continue

            if not scope.is_global and scope.ecole_id and student.ecole_id != scope.ecole_id:
                errors.append(f"Élève {eleve_id}: accès refusé")
                continue

            reduction = models.Reduction(
                eleve_id=eleve_id,
                ecole_id=student.ecole_id,
                ET_CODEETABLISSEMENT=student.ET_CODEETABLISSEMENT,
                type_reduction=type_reduction,
                montant_reduction=montant,
                pourcentage_reduction=pourcentage,
                motif=motif
            )
            db.add(reduction)
            created_count += 1
        except Exception as e:
            errors.append(f"Élève {eleve_id}: {str(e)}")

    db.commit()

    return {
        "success": len(errors) == 0,
        "created": created_count,
        "errors": errors
    }

