from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, case
from typing import List, Optional
from decimal import Decimal
from datetime import datetime

from .. import crud, schemas, models
from ..database import get_db
from ..routers.auth import get_school_scope, SchoolScope

router = APIRouter(prefix="/finances", tags=["Finances & Payments"])

@router.get("/payments", response_model=List[schemas.PaymentResponse])
def read_payments(
    eleve_id: Optional[int] = None,
    ecole_id: Optional[int] = None,
    code_etablissement: Optional[str] = None,
    skip: int = 0,
    limit: Optional[int] = None,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    if scope.is_global:
        return crud.get_payments(
            db,
            eleve_id=eleve_id,
            ecole_id=ecole_id,
            code_etablissement=code_etablissement,
            skip=skip,
            limit=limit
        )

    auth_ids = scope.get_authorized_school_ids(db)
    auth_codes = scope.get_authorized_school_codes(db)

    if ecole_id is not None and ecole_id not in (auth_ids or []):
        ecole_id = None
    if code_etablissement is not None and code_etablissement not in (auth_codes or []):
        code_etablissement = None

    return crud.get_payments(
        db,
        eleve_id=eleve_id,
        ecole_id=ecole_id,
        code_etablissement=code_etablissement,
        ecole_ids=auth_ids if not ecole_id and not code_etablissement else None,
        code_etablissements=auth_codes if not ecole_id and not code_etablissement else None,
        skip=skip,
        limit=limit
    )

@router.post("/payments", response_model=schemas.PaymentResponse, status_code=status.HTTP_201_CREATED)
def create_new_payment(
    payment: schemas.PaymentCreate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    if not scope.is_global and scope.code_etablissement:
        setattr(payment, "ET_CODEETABLISSEMENT", scope.code_etablissement)
    return crud.create_payment(db=db, payment=payment)

@router.put("/payments/{payment_id}", response_model=schemas.PaymentResponse)
@router.patch("/payments/{payment_id}", response_model=schemas.PaymentResponse)
def update_existing_payment(
    payment_id: int,
    payment_update: schemas.PaymentUpdate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    db_pay = db.query(models.Paiement).filter(models.Paiement.id == payment_id).first()
    if not db_pay:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")
    if not scope.is_global and scope.code_etablissement:
        if db_pay.ET_CODEETABLISSEMENT and db_pay.ET_CODEETABLISSEMENT != scope.code_etablissement:
            raise HTTPException(status_code=403, detail="Accès refusé à ce paiement d'un autre établissement")

    updated = crud.update_payment(db=db, payment_id=payment_id, payment_update=payment_update)
    return updated

@router.post("/payments/{payment_id}/cancel", response_model=schemas.PaymentResponse)
def cancel_existing_payment(
    payment_id: int,
    cancel_in: schemas.PaymentCancel,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    db_pay = db.query(models.Paiement).filter(models.Paiement.id == payment_id).first()
    if not db_pay:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")
    if not scope.is_global and scope.code_etablissement:
        if db_pay.ET_CODEETABLISSEMENT and db_pay.ET_CODEETABLISSEMENT != scope.code_etablissement:
            raise HTTPException(status_code=403, detail="Accès refusé à ce paiement d'un autre établissement")

    cancelled = crud.cancel_payment(db=db, payment_id=payment_id, motif_annulation=cancel_in.motif_annulation)
    return cancelled

@router.get("/stats")
def read_finance_stats(
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    # 1. Sommes des paiements réels par statut (api_paiement)
    query = db.query(
        models.Paiement.statut,
        func.sum(models.Paiement.montant).label("total")
    )
    if scope.code_etablissement:
        c_code = scope.code_etablissement.strip().lower()
        query = query.outerjoin(models.Eleve, models.Paiement.eleve_id == models.Eleve.id).filter(or_(
            func.lower(models.Paiement.ET_CODEETABLISSEMENT) == c_code,
            func.lower(models.Eleve.ET_CODEETABLISSEMENT) == c_code
        ))
    elif scope.ecole_id is not None:
        query = query.outerjoin(models.Eleve, models.Paiement.eleve_id == models.Eleve.id).filter(or_(
            models.Paiement.ecole_id == scope.ecole_id,
            models.Eleve.ecole_id == scope.ecole_id
        ))
    stats = query.group_by(models.Paiement.statut).all()
    
    result = {
        "paye": 0.0,
        "en_attente": 0.0,
        "annule": 0.0,
        "total_recouvrement": 0.0,
        "total_attendu": 0.0,
        "total_impayes": 0.0,
        "taux_recouvrement": 0.0,
        "echeancier_paye": 0.0
    }
    
    for row in stats:
        status_name = row[0]
        total_val = float(row[1]) if row[1] is not None else 0.0
        if status_name in result:
            result[status_name] = total_val
            
    result["total_recouvrement"] = result["paye"]

    # 2. Stats dérivées directement de l'échéancier (api_echeancier)
    ech_query = db.query(
        func.coalesce(func.sum(models.EcheancierPaiement.montant_prevu), 0).label("attendu"),
        func.coalesce(func.sum(models.EcheancierPaiement.montant_paye), 0).label("paye_ech"),
        func.coalesce(func.sum(
            case(
                (models.EcheancierPaiement.statut.in_(["non_paye", "partiel", "en_retard"]),
                 models.EcheancierPaiement.montant_prevu - models.EcheancierPaiement.montant_paye),
                else_=0
            )
        ), 0).label("impayes")
    )
    if scope.code_etablissement:
        c_code = scope.code_etablissement.strip().lower()
        ech_query = ech_query.outerjoin(models.Eleve, models.EcheancierPaiement.eleve_id == models.Eleve.id).filter(or_(
            func.lower(models.EcheancierPaiement.ET_CODEETABLISSEMENT) == c_code,
            func.lower(models.Eleve.ET_CODEETABLISSEMENT) == c_code
        ))
    elif scope.ecole_id is not None:
        ech_query = ech_query.outerjoin(models.Eleve, models.EcheancierPaiement.eleve_id == models.Eleve.id).filter(or_(
            models.EcheancierPaiement.ecole_id == scope.ecole_id,
            models.Eleve.ecole_id == scope.ecole_id
        ))

    ech_row = ech_query.first()
    if ech_row:
        attendu = float(ech_row[0] or 0.0)
        paye_ech = float(ech_row[1] or 0.0)
        impayes = float(ech_row[2] or 0.0)
        result["total_attendu"] = attendu
        result["echeancier_paye"] = paye_ech
        result["total_impayes"] = impayes if impayes > 0 else max(0.0, attendu - result["paye"])
        if attendu > 0:
            result["taux_recouvrement"] = round((result["paye"] / attendu) * 100.0, 2)
        elif result["paye"] > 0:
            result["taux_recouvrement"] = 100.0
            
    return result


@router.get("/recouvrement", response_model=schemas.RecouvrementResponse)
def read_recouvrement(
    annee: Optional[int] = None,
    mois: Optional[int] = None,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Calcule le taux de recouvrement par élève, classe et niveau (mensuel/annuel)."""
    current_year = annee or datetime.utcnow().year
    periode_label = f"Année {current_year}" if mois is None else f"{mois:02d}/{current_year}"

    eleve_query = db.query(models.Eleve)
    if scope.code_etablissement:
        eleve_query = eleve_query.filter(models.Eleve.ET_CODEETABLISSEMENT == scope.code_etablissement)
    elif scope.ecole_id is not None:
        eleve_query = eleve_query.filter(models.Eleve.ecole_id == scope.ecole_id)
    eleves = eleve_query.all()
    eleve_lookup = {e.id: e for e in eleves}

    paiement_query = db.query(models.Paiement).filter(
        models.Paiement.statut == "paye",
        models.Paiement.type.in_(["scolarite", "frais_inscription", "frais_annexe", "inscription", "reinscription"]),
        func.extract('year', models.Paiement.date) == current_year
    )
    if mois is not None:
        paiement_query = paiement_query.filter(func.extract('month', models.Paiement.date) == mois)
    if scope.code_etablissement:
        c_code = scope.code_etablissement.strip().lower()
        paiement_query = paiement_query.outerjoin(models.Eleve, models.Paiement.eleve_id == models.Eleve.id).filter(or_(
            func.lower(models.Paiement.ET_CODEETABLISSEMENT) == c_code,
            func.lower(models.Eleve.ET_CODEETABLISSEMENT) == c_code
        ))
    elif scope.ecole_id is not None:
        paiement_query = paiement_query.outerjoin(models.Eleve, models.Paiement.eleve_id == models.Eleve.id).filter(or_(
            models.Paiement.ecole_id == scope.ecole_id,
            models.Eleve.ecole_id == scope.ecole_id
        ))

    paiements: dict[int, float] = {}
    for p in paiement_query.all():
        paiements[p.eleve_id] = paiements.get(p.eleve_id, 0.0) + float(p.montant)

    par_eleve = []
    total_attendu_global = 0.0
    total_paye_global = 0.0

    # Charger les attendus réels de l'échéancier par élève
    ech_subq = db.query(
        models.EcheancierPaiement.eleve_id,
        func.sum(models.EcheancierPaiement.montant_prevu).label("ech_attendu")
    )
    if mois is not None:
        ech_subq = ech_subq.filter(func.extract('month', models.EcheancierPaiement.date_echeance) == mois)
    ech_map = dict(ech_subq.group_by(models.EcheancierPaiement.eleve_id).all())

    for eleve in eleves:
        ech_val = ech_map.get(eleve.id)
        if ech_val is not None and ech_val > 0:
            attendu = float(ech_val)
        else:
            attendu_annuel = float(eleve.AU_SCOLARITE or 0)
            attendu = attendu_annuel / 12.0 if mois is not None else attendu_annuel
        paye = paiements.get(eleve.id, 0.0)
        total_attendu_global += attendu
        total_paye_global += paye
        taux = (paye / attendu * 100.0) if attendu > 0 else 0.0
        par_eleve.append(schemas.RecouvrementDetail(
            id=eleve.id,
            nom=f"{eleve.nom} {eleve.prenom}",
            total_attendu=attendu,
            total_paye=paye,
            taux_recouvrement=round(taux, 2),
            periode=periode_label
        ))

    classes_map = {c.id: c.CE_LIBELLE for c in db.query(models.Classe).all()}
    niveaux_map = {c.id: c.niveau.libelle for c in db.query(models.Classe).options(joinedload(models.Classe.niveau)).all() if c.niveau}

    def _aggregate(key_fn):
        result_map: dict[str, dict[str, float]] = {}
        for item in par_eleve:
            key = key_fn(eleve_lookup.get(item.id))
            if not key:
                key = "Non renseigné"
            result_map.setdefault(key, {"attendu": 0.0, "paye": 0.0})
            result_map[key]["attendu"] += item.total_attendu
            result_map[key]["paye"] += item.total_paye
        return [
            schemas.RecouvrementDetail(
                id=idx,
                nom=name,
                total_attendu=v["attendu"],
                total_paye=v["paye"],
                taux_recouvrement=round((v["paye"] / v["attendu"] * 100.0) if v["attendu"] > 0 else 0.0, 2),
                periode=periode_label
            )
            for idx, (name, v) in enumerate(result_map.items())
        ]

    par_classe = _aggregate(lambda e: classes_map.get(e.classe_id) if e else None)
    par_niveau = _aggregate(lambda e: niveaux_map.get(e.classe_id) if e else None)

    taux_global = (total_paye_global / total_attendu_global * 100.0) if total_attendu_global > 0 else 0.0

    return schemas.RecouvrementResponse(
        taux_global=round(taux_global, 2),
        par_eleve=par_eleve,
        par_classe=par_classe,
        par_niveau=par_niveau
    )


@router.get("/check-transaction-id")
def check_transaction_id_finances(
    numero_transaction: str,
    exclude_payment_id: Optional[int] = None,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Vérifie si un identifiant de transaction Mobile Money ou Coris Bank est déjà rattaché à un élève."""
    clean_tx = (numero_transaction or "").strip()
    if not clean_tx:
        return {"exists": False}

    query = db.query(models.Paiement).join(models.Eleve, models.Paiement.eleve_id == models.Eleve.id).filter(
        func.lower(func.trim(models.Paiement.numero_transaction)) == clean_tx.lower(),
        models.Paiement.statut != "annule"
    )

    if exclude_payment_id is not None:
        query = query.filter(models.Paiement.id != exclude_payment_id)

    existing = query.first()
    if not existing:
        return {"exists": False}

    student = existing.eleve
    student_fullname = f"{student.prenom or ''} {student.nom or ''}".strip() or "Élève inconnu"

    return {
        "exists": True,
        "paiement": {
            "id": existing.id,
            "numero_recu": existing.numero_recu,
            "numero_transaction": existing.numero_transaction,
            "montant": float(existing.montant or 0),
            "mode": existing.mode,
            "date": existing.date.isoformat() if existing.date else "",
            "eleve_id": existing.eleve_id,
            "eleve_nom": student_fullname,
            "matricule": student.matricule or "N/A",
            "ecole_code": existing.ET_CODEETABLISSEMENT or student.ET_CODEETABLISSEMENT or "N/A"
        }
    }


@router.put("/transaction-id/{payment_id}")
def update_transaction_id_finances(
    payment_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Modification d'un ID de transaction réservée à l'administrateur."""
    clean_role = (scope.role or "").lower().strip()
    if clean_role not in ["admin", "superuser", "direction_fondation", "directeur"]:
        raise HTTPException(
            status_code=403,
            detail="Accès refusé : Seul un administrateur peut modifier un identifiant de transaction."
        )

    nouveau_id = (payload.get("nouveau_numero_transaction") or "").strip()
    if not nouveau_id:
        raise HTTPException(status_code=400, detail="Le nouvel identifiant ne peut pas être vide.")

    motif = (payload.get("motif_modification") or "").strip()
    if not motif:
        raise HTTPException(status_code=400, detail="Le motif de modification est obligatoire.")

    paiement = db.query(models.Paiement).filter(models.Paiement.id == payment_id).first()
    if not paiement:
        raise HTTPException(status_code=404, detail="Paiement non trouvé.")

    conflit = db.query(models.Paiement).join(models.Eleve, models.Paiement.eleve_id == models.Eleve.id).filter(
        models.Paiement.id != payment_id,
        func.lower(func.trim(models.Paiement.numero_transaction)) == nouveau_id.lower(),
        models.Paiement.statut != "annule"
    ).first()

    if conflit:
        other_st = conflit.eleve
        st_name = f"{other_st.prenom or ''} {other_st.nom or ''}".strip() or "Autre élève"
        raise HTTPException(
            status_code=400,
            detail=f"L'identifiant '{nouveau_id}' est déjà rattaché à l'élève {st_name} (Reçu {conflit.numero_recu})."
        )

    ancien = paiement.numero_transaction or ""
    paiement.numero_transaction = nouveau_id
    db.commit()
    db.refresh(paiement)

    return {
        "success": True,
        "message": f"Identifiant de transaction modifié avec succès : {nouveau_id}",
        "paiement_id": paiement.id,
        "ancien_numero_transaction": ancien,
        "nouveau_numero_transaction": paiement.numero_transaction,
        "motif": motif
    }


@router.post("/import-excel-paiements")
async def import_excel_paiements(
    file: UploadFile = File(...),
    dry_run: bool = Query(False, description="Exécuter en mode simulation sans écrire en base"),
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """
    Importe les données de paiement depuis un fichier Excel (.xlsx, .xls).
    - Réconcilie les élèves existants par Nom, Prénom et Classe.
    - Crée les élèves introuvables avec un matricule temporaire (TMP26xxxx).
    - Enregistre les paiements avec gestion des sous-rubriques (SCOL, CANT, TRAN, FRAI).
    - Prévient les doublons de manière idempotente.
    """
    nom_fichier = (file.filename or "").lower()
    if not nom_fichier.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=400,
            detail="Le fichier doit être au format Excel (.xlsx ou .xls)."
        )

    try:
        content = await file.read()
        from ..services.excel_payment_importer import ExcelPaymentImporter
        importer = ExcelPaymentImporter(
            db=db,
            file_bytes=content,
            dry_run=dry_run
        )
        stats = importer.process()
        return {
            "success": True,
            "message": "Simulation d'importation réussie" if dry_run else "Importation effectuée avec succès",
            **stats
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de l'importation du fichier Excel : {str(e)}"
        )
