from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import csv
import io
from datetime import datetime

from .. import crud, schemas, models
from ..database import get_db
from ..timezone_utils import now_abidjan, parse_client_date_abidjan
from ..routers.auth import get_school_scope, SchoolScope

from pydantic import BaseModel
import os
import json
import decimal
from decimal import Decimal
from datetime import date
from sqlalchemy import func

SERVICE_MONTHLY_SCHEDULE = [
    ("Septembre", 2026, 9),
    ("Octobre", 2026, 10),
    ("Novembre", 2026, 11),
    ("Décembre", 2026, 12),
    ("Janvier", 2027, 1),
    ("Février", 2027, 2),
    ("Mars", 2027, 3),
    ("Avril", 2027, 4),
    ("Mai", 2027, 5),
]

router = APIRouter(prefix="/transport", tags=["Transport"])

class TransportLinePaymentRequest(BaseModel):
    eleve_id: int
    zone_id: int
    quartier_nom: str
    tarif: float
    mois: str
    mode_paiement: str = "especes"
    numero_transaction: Optional[str] = None
    observation: Optional[str] = None
    caissier_nom: Optional[str] = "Caissier Transport"
    annee_scolaire: Optional[str] = "2026-2027"
    date_operation: Optional[str] = None

class CanteenPaymentRequest(BaseModel):
    eleve_id: int
    periode_type: Optional[str] = "trimestriel" # 'mensuel' or 'trimestriel'
    trimestre: Optional[str] = None # 'Trimestre 1', 'Trimestre 2', 'Trimestre 3'
    mois: Optional[str] = None # 'Octobre', 'Novembre', etc.
    tarif: Optional[float] = None
    mode_paiement: str = "especes"
    numero_transaction: Optional[str] = None
    observation: Optional[str] = None
    caissier_nom: Optional[str] = "Caissier Cantine"
    annee_scolaire: Optional[str] = "2026-2027"
    date_operation: Optional[str] = None

class TarifsUpdateRequest(BaseModel):
    cantine_mensuel: Optional[float] = 15000.0
    cantine_trimestriel: Optional[float] = 45000.0
    cantine_annuel: Optional[float] = 135000.0
    cantine_journalier: Optional[float] = 1000.0
    zones: Optional[List[dict]] = None

# --- TARIFICATION PAR LIGNE & ZONE ENDPOINTS ---
# --- TARIFICATION PAR LIGNE & ZONE ENDPOINTS (BASE DE DONNÉES) ---
@router.get("/tarifs-db", response_model=List[schemas.TarifServiceResponse])
def get_tarifs_db(
    service_type: Optional[str] = None,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Retourne l'ensemble des tarifs Cantine & Car enregistrés en Base de Données."""
    return crud.get_tarifs_services(db, service_type=service_type, code_etablissement=scope.code_etablissement)

@router.post("/tarifs-db", response_model=schemas.TarifServiceResponse)
def create_tarif_db(
    data: schemas.TarifServiceCreate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Crée un nouveau tarif de Cantine ou Car en Base de Données."""
    return crud.create_tarif_service(db, data, code_etablissement=scope.code_etablissement)

@router.put("/tarifs-db/{tarif_id}", response_model=schemas.TarifServiceResponse)
def update_tarif_db(
    tarif_id: int,
    data: schemas.TarifServiceCreate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Met à jour un tarif de Cantine ou Car existant en Base de Données."""
    tarif = db.query(models.TarifService).filter(models.TarifService.id == tarif_id).first()
    if not tarif:
        raise HTTPException(status_code=404, detail="Tarif non trouvé")

    if not scope.is_global and tarif.code_etablissement and tarif.code_etablissement != scope.code_etablissement:
        raise HTTPException(status_code=403, detail="Vous n'avez pas accès à ce tarif")

    updated = crud.update_tarif_service(db, tarif_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Tarif non trouvé")
    return updated

@router.delete("/tarifs-db/{tarif_id}")
def delete_tarif_db(tarif_id: int, db: Session = Depends(get_db)):
    """Supprime un tarif de Cantine ou Car de la Base de Données."""
    success = crud.delete_tarif_service(db, tarif_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tarif non trouvé")
    return {"success": True, "message": "Tarif supprimé avec succès de la BD"}

@router.get("/zones")
def get_transport_zones(
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Retourne la grille officielle des zones et tarifs cantine & car de l'établissement."""
    if not hasattr(db, "query"):
        from ..database import SessionLocal
        db = SessionLocal()
    
    code_etab = scope.code_etablissement if not scope.is_global else None
    auth_codes = scope.get_authorized_school_codes(db) if not scope.is_global else None
    tarifs = crud.get_tarifs_services(db, code_etablissement=code_etab, auth_codes=auth_codes)
    
    cantine_rec = next((t for t in tarifs if t.service_type == "cantine"), None)
    zones_recs = [t for t in tarifs if t.service_type == "transport"]

    cantine_data = {
        "mensuel": float(cantine_rec.montant_mensuel) if cantine_rec else 0.0,
        "trimestriel": float(cantine_rec.montant_trimestriel or 0.0) if cantine_rec else 0.0,
        "annuel": float(cantine_rec.montant_annuel or 0.0) if cantine_rec else 0.0,
        "journalier": float(cantine_rec.montant_journalier or 0.0) if cantine_rec else 0.0,
    }

    zones_data = [
        {
            "id": z.id,
            "zone": z.code_zone or f"ZONE-{z.id}",
            "nom": z.libelle,
            "quartiers": [q.strip() for q in (z.quartiers or "").split(",") if q.strip()],
            "km": z.kilometrage or "2.0 km",
            "tarif": float(z.montant_mensuel or 0.0),
        }
        for z in zones_recs
    ]

    return {
        "cantine": cantine_data,
        "zones": zones_data,
        "tarifs_complets": [schemas.TarifServiceResponse.from_orm(t) for t in tarifs]
    }

@router.get("/tarifs")
def get_all_tarifs(
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    return get_transport_zones(db, scope=scope)

@router.put("/tarifs")
def update_all_tarifs(
    req: TarifsUpdateRequest,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    code_etab = scope.code_etablissement
    ecole_id = scope.ecole_id
    cantine_query = db.query(models.TarifService).filter(models.TarifService.service_type == "cantine")
    if code_etab:
        cantine_query = cantine_query.filter(models.TarifService.ET_CODEETABLISSEMENT == code_etab)
    elif ecole_id:
        cantine_query = cantine_query.filter(models.TarifService.ecole_id == ecole_id)
    cantine_rec = cantine_query.first()

    if not cantine_rec:
        cantine_rec = models.TarifService(
            service_type="cantine",
            code_zone="MENSUEL",
            libelle="Tarif Cantine Mensuel Officiel",
            montant_mensuel=Decimal(str(req.cantine_mensuel or 0.0)),
            montant_trimestriel=Decimal(str(req.cantine_trimestriel or 0.0)),
            montant_annuel=Decimal(str(req.cantine_annuel or 0.0)),
            montant_journalier=Decimal(str(req.cantine_journalier or 0.0)),
            ET_CODEETABLISSEMENT=code_etab,
            ecole_id=ecole_id
        )
        db.add(cantine_rec)
    else:
        if req.cantine_mensuel is not None:
            cantine_rec.montant_mensuel = Decimal(str(req.cantine_mensuel))
        if req.cantine_trimestriel is not None:
            cantine_rec.montant_trimestriel = Decimal(str(req.cantine_trimestriel))
        if req.cantine_annuel is not None:
            cantine_rec.montant_annuel = Decimal(str(req.cantine_annuel))
        if req.cantine_journalier is not None:
            cantine_rec.montant_journalier = Decimal(str(req.cantine_journalier))
        if code_etab and not cantine_rec.ET_CODEETABLISSEMENT:
            cantine_rec.ET_CODEETABLISSEMENT = code_etab
        if ecole_id and not cantine_rec.ecole_id:
            cantine_rec.ecole_id = ecole_id

    def _extract_quartiers_str(raw_q):
        if not raw_q:
            return ""
        if isinstance(raw_q, list):
            res = []
            for item in raw_q:
                if isinstance(item, dict):
                    res.append(str(item.get("nom", "")).strip())
                elif isinstance(item, str):
                    res.append(item.strip())
            return ", ".join([x for x in res if x])
        return str(raw_q).strip()

    if req.zones:
        for z_item in req.zones:
            z_id = z_item.get("id")
            z_rec = db.query(models.TarifService).filter(models.TarifService.id == z_id).first() if z_id else None
            q_str = _extract_quartiers_str(z_item.get("quartiers"))
            if z_rec:
                z_rec.libelle = z_item.get("nom", z_rec.libelle)
                z_rec.code_zone = z_item.get("zone", z_rec.code_zone)
                z_rec.montant_mensuel = Decimal(str(z_item.get("tarif", z_rec.montant_mensuel)))
                if q_str:
                    z_rec.quartiers = q_str
                if code_etab and not z_rec.ET_CODEETABLISSEMENT:
                    z_rec.ET_CODEETABLISSEMENT = code_etab
                if ecole_id and not z_rec.ecole_id:
                    z_rec.ecole_id = ecole_id
            else:
                new_z = models.TarifService(
                    service_type="transport",
                    code_zone=z_item.get("zone", "ZONE-CUSTOM"),
                    libelle=z_item.get("nom", "Zone Transport"),
                    quartiers=q_str or "Station Principale",
                    kilometrage=z_item.get("km", "2.0 km"),
                    montant_mensuel=Decimal(str(z_item.get("tarif", 0.0))),
                    ET_CODEETABLISSEMENT=code_etab,
                    ecole_id=ecole_id
                )
                db.add(new_z)

    db.commit()
    return {"success": True, "message": "Tarifs cantine & car enregistrés avec succès !"}


class LineCreateRequest(BaseModel):
    nom: str
    kilometrage_moyen: Optional[str] = "4.0 km"
    vehicule_id: Optional[int] = None
    quartiers: Optional[List[dict]] = None # List of {"nom": str, "tarif": float, "km": str}

class LineTarifUpdateRequest(BaseModel):
    quartier_nom: str
    nouveau_tarif: float
    km: Optional[str] = None


@router.get("/lignes")
def get_transport_lignes(
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Retourne la liste des lignes de transport scolaire pour l'établissement."""
    data = get_transport_zones(db=db, scope=scope)
    zones = data.get("zones", [])

    affectations = db.query(models.AffectationTransport).all()
    affect_map = {}
    for aff in affectations:
        arret = (aff.arret or "").strip().lower()
        affect_map[arret] = affect_map.get(arret, 0) + 1

    lignes_enriched = []
    for z in zones:
        total_eleves = 0
        quartiers_enriched = []
        for q_nom in z.get("quartiers", []):
            q_count = affect_map.get(q_nom.strip().lower(), 0)
            total_eleves += q_count
            quartiers_enriched.append({
                "nom": q_nom,
                "tarif": z.get("tarif", 20000),
                "km": z.get("km", "4.0 km"),
                "eleves_count": q_count
            })

        lignes_enriched.append({
            "zone_id": z.get("id"),
            "nom": z.get("nom"),
            "kilometrage_moyen": z.get("km"),
            "vehicule_id": None,
            "quartiers": quartiers_enriched,
            "total_eleves": total_eleves
        })

    return {
        "success": True,
        "lignes": lignes_enriched
    }


@router.post("/lignes")
def create_transport_ligne(
    req: LineCreateRequest,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Crée une nouvelle ligne de transport scolaire en Base de Données et JSON."""
    # 1. Sauvegarder dans SQLite TarifService
    quartiers_str = ", ".join([q.get("nom", "") for q in req.quartiers]) if req.quartiers else "Station Principale"
    tarif_principal = Decimal(str(req.quartiers[0].get("tarif", 20000.0))) if req.quartiers and isinstance(req.quartiers, list) and len(req.quartiers) > 0 else Decimal("20000.0")

    max_id = db.query(func.max(models.TarifService.id)).scalar() or 0
    code_z = f"ZONE-{max_id + 1}"

    tarif_obj = models.TarifService(
        service_type="transport",
        code_zone=code_z,
        libelle=req.nom,
        quartiers=quartiers_str,
        kilometrage=req.kilometrage_moyen or "4.0 km",
        montant_mensuel=tarif_principal,
        ET_CODEETABLISSEMENT=scope.code_etablissement,
        ecole_id=scope.ecole_id
    )
    db.add(tarif_obj)
    db.commit()
    db.refresh(tarif_obj)

    # 2. Mettre à jour transport_tarifs.json s'il existe
    try:
        path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "transport_tarifs.json")
        existing = get_transport_zones(db)
        zones = existing.get("zones", [])

        new_zone = {
            "zone_id": tarif_obj.id,
            "nom": req.nom,
            "kilometrage_moyen": req.kilometrage_moyen or "4.0 km",
            "vehicule_id": req.vehicule_id,
            "quartiers": req.quartiers or [{"nom": "Station Principale", "tarif": float(tarif_principal), "km": "4.0 km"}]
        }
        zones.append(new_zone)
        existing["zones"] = zones

        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(existing, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print("Mise à jour du JSON de transport:", e)

    return {"success": True, "message": f"Ligne '{req.nom}' créée avec succès (ID: {tarif_obj.id}).", "zone_id": tarif_obj.id}


@router.put("/lignes/{zone_id}/tarif")
def update_line_tarif(zone_id: int, req: LineTarifUpdateRequest, db: Session = Depends(get_db)):
    """Corrige le montant / tarif associé à un arrêt / quartier sur une ligne de transport."""
    t_obj = db.query(models.TarifService).filter(models.TarifService.id == zone_id).first()
    if t_obj:
        t_obj.montant_mensuel = Decimal(str(req.nouveau_tarif))
        if req.km:
            t_obj.kilometrage = req.km
        db.commit()

    return {
        "success": True,
        "message": f"Tarif de l'arrêt '{req.quartier_nom}' mis à jour avec succès : {req.nouveau_tarif:,.0f} FCFA.",
        "zone_id": zone_id
    }


@router.delete("/lignes/{zone_id}")
def delete_transport_ligne(zone_id: int, db: Session = Depends(get_db)):
    """Supprime une ligne de transport scolaire."""
    db.query(models.TarifService).filter(models.TarifService.id == zone_id).delete()
    db.commit()
    return {"success": True, "message": f"Ligne #{zone_id} supprimée avec succès."}


@router.post("/pay-line")
def process_transport_line_payment(req: TransportLinePaymentRequest, db: Session = Depends(get_db)):
    """Enregistre le paiement d'une ligne/zone de transport pour un élève avec reçu officiel."""
    student = db.query(models.Eleve).filter(models.Eleve.id == req.eleve_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Élève non trouvé")
    if req.tarif <= 0:
        raise HTTPException(status_code=400, detail="Le tarif doit être supérieur à 0")

    op_dt = parse_client_date_abidjan(req.date_operation)
    today_str = op_dt.strftime("%Y%m%d")
    count_today = db.query(models.Paiement).filter(models.Paiement.type == "transport").count()
    clean_mois = (req.mois or "OCTOBRE-2026").replace(" ", "-").upper()
    num_recu = f"REC-TR-{clean_mois}-{today_str}-{(count_today + 1):04d}"
    txn_info = f"TR-{clean_mois}||{req.quartier_nom}||{req.numero_transaction or ''}"

    paiement = models.Paiement(
        eleve_id=student.id,
        montant=decimal.Decimal(str(req.tarif)),
        type="transport",
        mode=req.mode_paiement,
        statut="paye",
        date=op_dt,
        date_creation=op_dt,
        numero_recu=num_recu,
        numero_transaction=txn_info,
        ET_CODEETABLISSEMENT=getattr(student, "ET_CODEETABLISSEMENT", None)
    )
    db.add(paiement)
    
    # Active le service transport et enregistre l'affectation dans la base de données
    aff = db.query(models.AffectationTransport).filter(models.AffectationTransport.eleveId == student.id).first()
    if not aff:
        car = db.query(models.Car).filter(models.Car.statut == "actif").first()
        car_id = car.id if car else 1
        aff = models.AffectationTransport(
            eleveId=student.id,
            vehiculeId=car_id,
            arret=req.quartier_nom,
            matin=True,
            soir=True,
            ET_CODEETABLISSEMENT=getattr(student, "ET_CODEETABLISSEMENT", None)
        )
        db.add(aff)
    else:
        aff.arret = req.quartier_nom
        aff.matin = True
        aff.soir = True

    # Active également le flag booléen service_transport sur l'élève pour visibilité immédiate
    if hasattr(student, "service_transport"):
        setattr(student, "service_transport", True)
    if hasattr(student, "serviceTransport"):
        setattr(student, "serviceTransport", True)

    # Synchronisation immédiate avec l'échéancier : génération des 9 mensualités au tarif de la ligne (ex: 22000 * 9 = 198000 FCFA)
    unit_tarif = decimal.Decimal(str(req.tarif))
    all_trans_echs = db.query(models.EcheancierPaiement).filter(
        models.EcheancierPaiement.eleve_id == student.id,
        models.EcheancierPaiement.service_type == "transport",
    ).order_by(models.EcheancierPaiement.date_echeance.asc()).all()

    if not all_trans_echs:
        for idx, (mois_nom, annee_val, mois_num) in enumerate(SERVICE_MONTHLY_SCHEDULE, start=1):
            db.add(models.EcheancierPaiement(
                eleve_id=student.id,
                ecole_id=student.ecole_id,
                ET_CODEETABLISSEMENT=getattr(student, "ET_CODEETABLISSEMENT", None),
                libelle=f"Transport - {mois_nom}",
                service_type="transport",
                tranche_numero=idx,
                montant_prevu=unit_tarif,
                montant_paye=decimal.Decimal("0.00"),
                date_echeance=date(annee_val, mois_num, 5),
                statut="non_paye",
                annee_scolaire=req.annee_scolaire or "2026-2027",
            ))
        db.commit()
        all_trans_echs = db.query(models.EcheancierPaiement).filter(
            models.EcheancierPaiement.eleve_id == student.id,
            models.EcheancierPaiement.service_type == "transport",
        ).order_by(models.EcheancierPaiement.date_echeance.asc()).all()
    else:
        for t in all_trans_echs:
            if (t.montant_paye or 0) <= 0:
                t.montant_prevu = unit_tarif
                t.statut = "non_paye"

    # Affecter le paiement au mois demandé ou au premier mois impayé
    matched_ech = None
    target_mois = (req.mois or "").strip().lower()
    for t in all_trans_echs:
        if target_mois and target_mois in (t.libelle or "").lower():
            matched_ech = t
            break
    if not matched_ech:
        matched_ech = next((t for t in all_trans_echs if t.statut != "paye"), None)
    if matched_ech:
        matched_ech.montant_prevu = unit_tarif
        matched_ech.montant_paye = unit_tarif
        matched_ech.statut = "paye"
        matched_ech.date_dernier_versement = op_dt

    db.commit()
    db.refresh(paiement)

    student_name = f"{getattr(student, 'prenoms', '') or getattr(student, 'firstName', '')} {getattr(student, 'nom', '') or getattr(student, 'lastName', '')}".strip()

    return {
        "success": True,
        "message": f"Paiement transport pour {req.quartier_nom} ({clean_mois}) enregistré avec succès.",
        "numero_recu": num_recu,
        "paiement_id": paiement.id,
        "eleve": student_name or f"Élève #{student.id}",
        "matricule": getattr(student, "matricule", "—"),
        "tarif": req.tarif,
        "arret": req.quartier_nom,
        "mois": clean_mois,
        "date_paiement": op_dt.strftime("%d/%m/%Y %H:%M"),
        "mode": req.mode_paiement,
        "details_recu": {
            "numero_recu": num_recu,
            "paiement_id": paiement.id,
            "montant": req.tarif,
            "motif": f"Transport Scolaire - {req.quartier_nom} ({clean_mois})",
            "mode": req.mode_paiement,
            "numero_transaction": req.numero_transaction or "N/A",
            "caissier": req.caissier_nom or "Service Transport Hînneh",
            "annee_scolaire": req.annee_scolaire,
            "date_creation": op_dt.isoformat()
        }
    }


@router.post("/pay-canteen")
def pay_canteen_endpoint(req: CanteenPaymentRequest, db: Session = Depends(get_db)):
    """Enregistre le paiement de la cantine scolaire (mensuel ou trimestriel) pour un élève."""
    student = db.query(models.Eleve).filter(models.Eleve.id == req.eleve_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Élève non trouvé")
    
    # Priority Check: Check if student has unpaid tuition/inscription tranches
    unpaid_tuition = db.query(models.EcheancierPaiement).filter(
        models.EcheancierPaiement.eleve_id == student.id,
        models.EcheancierPaiement.statut.in_(["non_paye", "partiel", "en_retard"])
    ).all()
    total_impaye_scolarite = sum((e.montant_prevu - e.montant_paye for e in unpaid_tuition), decimal.Decimal("0.00"))
    if total_impaye_scolarite > 0:
        raise HTTPException(
            status_code=400,
            detail=f"PAIEMENT CANTINE REFUSÉ : L'élève possède un impayé de scolarité de {float(total_impaye_scolarite):,.0f} FCFA. Tout versement doit obligatoirement être affecté en priorité à l'apurement de la scolarité à la caisse."
        )

    is_mensuel = req.periode_type == "mensuel"

    if req.tarif is None or req.tarif <= 0:
        req.tarif = 15000.0 if is_mensuel else 45000.0

    op_dt = parse_client_date_abidjan(req.date_operation)
    today_str = op_dt.strftime("%Y%m%d")
    count_today = db.query(models.Paiement).filter(models.Paiement.type == "cantine").count()
    
    periode_label = req.mois if (is_mensuel and req.mois) else (req.trimestre or "TRIMESTRE-1")
    clean_label = (periode_label).replace(" ", "-").upper()
    num_recu = f"REC-CT-{clean_label}-{today_str}-{(count_today + 1):04d}"
    
    obs_text = req.observation or f"Paiement Cantine ({'Mensuel' if is_mensuel else 'Trimestriel'}) - {periode_label}"
    txn_info = f"CT-{clean_label}||{req.numero_transaction or ''}||{obs_text}"

    paiement = models.Paiement(
        eleve_id=student.id,
        montant=decimal.Decimal(str(req.tarif)),
        type="cantine",
        mode=req.mode_paiement,
        statut="paye",
        date=op_dt,
        date_creation=op_dt,
        numero_recu=num_recu,
        numero_transaction=txn_info,
        ET_CODEETABLISSEMENT=getattr(student, "ET_CODEETABLISSEMENT", None)
    )
    db.add(paiement)
    
    if hasattr(student, "serviceCantine"):
        setattr(student, "serviceCantine", True)

    # Synchronisation immédiate avec l'échéancier : génération des 9 mensualités cantine
    monthly_unit = decimal.Decimal(str(req.tarif if is_mensuel else req.tarif / 3))
    all_cant_echs = db.query(models.EcheancierPaiement).filter(
        models.EcheancierPaiement.eleve_id == student.id,
        models.EcheancierPaiement.service_type == "cantine",
    ).order_by(models.EcheancierPaiement.date_echeance.asc()).all()

    if not all_cant_echs:
        for idx, (mois_nom, annee_val, mois_num) in enumerate(SERVICE_MONTHLY_SCHEDULE, start=1):
            db.add(models.EcheancierPaiement(
                eleve_id=student.id,
                ecole_id=student.ecole_id,
                ET_CODEETABLISSEMENT=getattr(student, "ET_CODEETABLISSEMENT", None),
                libelle=f"Cantine - {mois_nom}",
                service_type="cantine",
                tranche_numero=idx,
                montant_prevu=monthly_unit,
                montant_paye=decimal.Decimal("0.00"),
                date_echeance=date(annee_val, mois_num, 5),
                statut="non_paye",
                annee_scolaire=getattr(req, "annee_scolaire", None) or "2026-2027",
            ))
        db.commit()
        all_cant_echs = db.query(models.EcheancierPaiement).filter(
            models.EcheancierPaiement.eleve_id == student.id,
            models.EcheancierPaiement.service_type == "cantine",
        ).order_by(models.EcheancierPaiement.date_echeance.asc()).all()
    else:
        for t in all_cant_echs:
            if (t.montant_paye or 0) <= 0:
                t.montant_prevu = monthly_unit
                t.statut = "non_paye"

    # Allouer le versement
    rem_to_pay = decimal.Decimal(str(req.tarif))
    for t in all_cant_echs:
        if rem_to_pay <= 0:
            break
        due = t.montant_prevu - t.montant_paye
        if due <= 0:
            continue
        alloc = min(due, rem_to_pay)
        t.montant_paye += alloc
        t.statut = "paye" if t.montant_paye >= t.montant_prevu else "partiel"
        t.date_dernier_versement = op_dt
        rem_to_pay -= alloc

    db.commit()
    db.refresh(paiement)

    student_name = f"{getattr(student, 'prenoms', '') or getattr(student, 'firstName', '')} {getattr(student, 'nom', '') or getattr(student, 'lastName', '')}".strip()

    return {
        "success": True,
        "message": f"Paiement cantine ({'Mensuel' if is_mensuel else 'Trimestriel'}) pour {periode_label} effectué avec succès.",
        "numero_recu": num_recu,
        "paiement_id": paiement.id,
        "eleve": student_name or f"Élève #{student.id}",
        "matricule": getattr(student, "matricule", "—"),
        "tarif": req.tarif,
        "periode": periode_label,
        "date_paiement": op_dt.strftime("%d/%m/%Y %H:%M"),
        "mode": req.mode_paiement,
        "details_recu": {
            "numero_recu": num_recu,
            "paiement_id": paiement.id,
            "montant": req.tarif,
            "motif": f"Cantine Scolaire ({'Mensuel' if is_mensuel else 'Trimestriel'}) - {periode_label}",
            "mode": req.mode_paiement,
            "numero_transaction": req.numero_transaction or "N/A",
            "caissier": req.caissier_nom or "Service Cantine Hînneh",
            "annee_scolaire": req.annee_scolaire,
            "date_creation": op_dt.isoformat()
        }
    }


# --- CARS ENDPOINTS ---
@router.get("/cars", response_model=List[schemas.CarResponse])
def read_cars(
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    return crud.get_cars(db, ecole_id=scope.ecole_id, code_etablissement=scope.code_etablissement)

@router.post("/cars", response_model=schemas.CarResponse, status_code=status.HTTP_201_CREATED)
def create_new_car(
    car: schemas.CarCreate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    db_car = crud.get_car_by_immatriculation(db, immatriculation=car.immatriculation)
    if db_car:
        raise HTTPException(status_code=400, detail="Un car avec cette immatriculation existe déjà")
    return crud.create_car(db=db, car=car, code_etablissement=scope.code_etablissement)

@router.put("/cars/{car_id}", response_model=schemas.CarResponse)
def update_car_info(
    car_id: int,
    car_data: schemas.CarUpdate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    db_car = crud.get_car_by_id(db, car_id=car_id)
    if db_car is None:
        raise HTTPException(status_code=404, detail="Car non trouvé")
    if not scope.is_global and scope.code_etablissement:
        if db_car.ET_CODEETABLISSEMENT and db_car.ET_CODEETABLISSEMENT != scope.code_etablissement:
            raise HTTPException(status_code=403, detail="Accès refusé à ce véhicule d'un autre établissement")
    update_dict = {k: v for k, v in car_data.dict(exclude_unset=True).items() if v is not None}
    return crud.update_car(db=db, db_car=db_car, update_data=update_dict)

@router.delete("/cars/{car_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_car(
    car_id: int,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    db_car = crud.get_car_by_id(db, car_id=car_id)
    if not db_car:
        raise HTTPException(status_code=404, detail="Car non trouvé")
    if not scope.is_global and scope.code_etablissement:
        if db_car.ET_CODEETABLISSEMENT and db_car.ET_CODEETABLISSEMENT != scope.code_etablissement:
            raise HTTPException(status_code=403, detail="Accès refusé à ce véhicule d'un autre établissement")
    crud.delete_car(db=db, car_id=car_id)
    return


# --- CHAUFFEURS ENDPOINTS ---
@router.get("/chauffeurs", response_model=List[schemas.ChauffeurResponse])
def read_chauffeurs(
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    return crud.get_chauffeurs(db, code_etablissement=scope.code_etablissement)

@router.post("/chauffeurs", response_model=schemas.ChauffeurResponse, status_code=status.HTTP_201_CREATED)
def create_new_chauffeur(
    chauffeur: schemas.ChauffeurCreate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    return crud.create_chauffeur(db=db, chauffeur=chauffeur, code_etablissement=scope.code_etablissement)

@router.put("/chauffeurs/{chauffeur_id}", response_model=schemas.ChauffeurResponse)
def update_chauffeur_info(
    chauffeur_id: int,
    chauffeur_data: schemas.ChauffeurUpdate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    db_chauffeur = crud.get_chauffeur_by_id(db, chauffeur_id=chauffeur_id)
    if db_chauffeur is None:
        raise HTTPException(status_code=404, detail="Chauffeur non trouvé")
    if not scope.is_global and scope.code_etablissement:
        if db_chauffeur.ET_CODEETABLISSEMENT and db_chauffeur.ET_CODEETABLISSEMENT != scope.code_etablissement:
            raise HTTPException(status_code=403, detail="Accès refusé à ce chauffeur d'un autre établissement")
    update_dict = {k: v for k, v in chauffeur_data.dict(exclude_unset=True).items() if v is not None}
    return crud.update_chauffeur(db=db, db_chauffeur=db_chauffeur, update_data=update_dict)

@router.delete("/chauffeurs/{chauffeur_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chauffeur_endpoint(
    chauffeur_id: int,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    db_chauffeur = crud.get_chauffeur_by_id(db, chauffeur_id=chauffeur_id)
    if not db_chauffeur:
        raise HTTPException(status_code=404, detail="Chauffeur non trouvé")
    if not scope.is_global and scope.code_etablissement:
        if db_chauffeur.ET_CODEETABLISSEMENT and db_chauffeur.ET_CODEETABLISSEMENT != scope.code_etablissement:
            raise HTTPException(status_code=403, detail="Accès refusé à ce chauffeur d'un autre établissement")
    crud.delete_chauffeur(db=db, chauffeur_id=chauffeur_id)
    return

@router.put("/cars/{car_id}/assign")
def assign_car_driver_and_line(
    car_id: int, 
    chauffeur_id: Optional[int] = None, 
    chauffeur_nom: Optional[str] = None, 
    chauffeur_tel: Optional[str] = None,
    ligne_id: Optional[int] = None,
    ligne_nom: Optional[str] = None,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Attribue un Chauffeur et une Ligne de transport à un Car spécifié."""
    db_car = crud.get_car_by_id(db, car_id=car_id)
    if not db_car:
        raise HTTPException(status_code=404, detail="Car non trouvé")

    if chauffeur_id:
        c_obj = crud.get_chauffeur_by_id(db, chauffeur_id=chauffeur_id)
        if c_obj:
            c_obj.car_id = car_id
            if ligne_nom:
                c_obj.ligne_nom = ligne_nom
            db_car.chauffeur_id = c_obj.id
            db_car.chauffeurNom = f"{c_obj.prenom or ''} {c_obj.nom}".strip()
            db_car.chauffeurTel = c_obj.telephone
    elif chauffeur_nom:
        db_car.chauffeurNom = chauffeur_nom
        if chauffeur_tel:
            db_car.chauffeurTel = chauffeur_tel

    if ligne_id:
        db_car.ligne_id = ligne_id
    if ligne_nom:
        db_car.ligne_nom = ligne_nom

    db.commit()
    db.refresh(db_car)

    return {
        "success": True,
        "message": f"Attribution du car '{db_car.immatriculation}' enregistrée avec succès.",
        "car": schemas.CarResponse.from_orm(db_car)
    }

# --- TRAJETS ENDPOINTS ---
@router.get("/trajets", response_model=List[schemas.TrajetBusResponse])
def read_trajets(
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    return crud.get_trajets_bus(db, code_etablissement=scope.code_etablissement)

@router.post("/trajets", response_model=schemas.TrajetBusResponse, status_code=status.HTTP_201_CREATED)
def create_new_trajet(
    trajet: schemas.TrajetBusCreate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    return crud.create_trajet_bus(db=db, trajet=trajet, code_etablissement=scope.code_etablissement)

@router.put("/trajets/{trajet_id}", response_model=schemas.TrajetBusResponse)
def update_trajet_info(
    trajet_id: int,
    trajet_data: schemas.TrajetBusUpdate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    db_trajet = crud.get_trajet_bus_by_id(db, trajet_id=trajet_id)
    if db_trajet is None:
        raise HTTPException(status_code=404, detail="Trajet non trouvé")
    if not scope.is_global and scope.code_etablissement:
        if db_trajet.ET_CODEETABLISSEMENT and db_trajet.ET_CODEETABLISSEMENT != scope.code_etablissement:
            raise HTTPException(status_code=403, detail="Accès refusé à ce trajet d'un autre établissement")
    update_dict = {k: v for k, v in trajet_data.dict(exclude_unset=True).items() if v is not None}
    if 'date' in update_dict and isinstance(update_dict['date'], str):
        update_dict['date'] = datetime.strptime(update_dict['date'], '%Y-%m-%d').date()
    return crud.update_trajet_bus(db=db, db_trajet=db_trajet, update_data=update_dict)

@router.delete("/trajets/{trajet_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trajet(
    trajet_id: int,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    db_trajet = crud.get_trajet_bus_by_id(db, trajet_id=trajet_id)
    if not db_trajet:
        raise HTTPException(status_code=404, detail="Trajet non trouvé")
    if not scope.is_global and scope.code_etablissement:
        if db_trajet.ET_CODEETABLISSEMENT and db_trajet.ET_CODEETABLISSEMENT != scope.code_etablissement:
            raise HTTPException(status_code=403, detail="Accès refusé à ce trajet d'un autre établissement")
    crud.delete_trajet_bus(db=db, trajet_id=trajet_id)
    return

# --- AFFECTATIONS ENDPOINTS ---
@router.get("/affectations", response_model=List[schemas.AffectationTransportResponse])
def read_affectations(
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    return crud.get_affectations_transport(db, code_etablissement=scope.code_etablissement)

@router.post("/affectations", response_model=schemas.AffectationTransportResponse, status_code=status.HTTP_201_CREATED)
def create_new_affectation(
    affectation: schemas.AffectationTransportCreate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    db_student = crud.get_student_by_id(db, student_id=affectation.eleveId)
    if not db_student:
        raise HTTPException(status_code=404, detail="Élève non trouvé")
    if not scope.is_global and scope.code_etablissement:
        if db_student.ET_CODEETABLISSEMENT and db_student.ET_CODEETABLISSEMENT != scope.code_etablissement:
            raise HTTPException(status_code=403, detail="Accès refusé à cet élève d'un autre établissement")
    
    db_car = crud.get_car_by_id(db, car_id=affectation.vehiculeId)
    if not db_car:
        db_car = db.query(models.Car).filter(models.Car.statut == "actif").first() or db.query(models.Car).first()
        if not db_car:
            db_car = models.Car(
                immatriculation="CAR-01",
                marque="Toyota",
                modele="Coaster",
                capacite=30,
                chauffeurNom="Chauffeur Principal",
                statut="actif",
                ET_CODEETABLISSEMENT=scope.code_etablissement
            )
            db.add(db_car)
            db.commit()
            db.refresh(db_car)
        affectation.vehiculeId = db_car.id
        
    return crud.create_affectation_transport(db=db, affectation=affectation, code_etablissement=scope.code_etablissement)

@router.delete("/affectations/{eleve_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_affectation(
    eleve_id: int,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    db_student = crud.get_student_by_id(db, student_id=eleve_id)
    if not db_student:
        raise HTTPException(status_code=404, detail="Élève non trouvé")
    if not scope.is_global and scope.code_etablissement:
        if db_student.ET_CODEETABLISSEMENT and db_student.ET_CODEETABLISSEMENT != scope.code_etablissement:
            raise HTTPException(status_code=403, detail="Accès refusé à cet élève d'un autre établissement")
    crud.delete_affectation_transport(db=db, eleve_id=eleve_id)
    return

# --- POINTAGES ENDPOINTS ---
@router.get("/pointages", response_model=List[schemas.PointageBusResponse])
def read_pointages(
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    return crud.get_pointages_bus(db, code_etablissement=scope.code_etablissement)

@router.post("/pointages", response_model=schemas.PointageBusResponse, status_code=status.HTTP_201_CREATED)
def create_new_pointage(
    pointage: schemas.PointageBusCreate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    return crud.create_pointage_bus(db=db, pointage=pointage, code_etablissement=scope.code_etablissement)

# --- CSV IMPORT ENDPOINT ---
@router.post("/import")
def import_affectations_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Le fichier doit être au format CSV")
    
    try:
        contents = file.file.read()
        try:
            decoded = contents.decode('utf-8-sig')
        except UnicodeDecodeError:
            decoded = contents.decode('latin-1')
            
        decoded = decoded.replace('\r\n', '\n').replace('\r', '\n')
        csv_file = io.StringIO(decoded)
        reader = csv.DictReader(csv_file, delimiter=';')  # Handle both comma and semicolon
        
        # If headers are not mapped correctly due to delimiter, try comma
        first_row_check = decoded.split('\n')[0]
        delimiter = ';' if ';' in first_row_check else ','
        csv_file.seek(0)
        reader = csv.DictReader(csv_file, delimiter=delimiter)
        
        imported_count = 0
        errors = []
        
        header_mapping = {
            'matricule': 'matricule',
            'Matricule': 'matricule',
            'immatriculation': 'immatriculation',
            'car': 'immatriculation',
            'Car': 'immatriculation',
            'arret': 'arret',
            'Arrêt': 'arret',
            'matin': 'matin',
            'Matin': 'matin',
            'soir': 'soir',
            'Soir': 'soir'
        }
        
        for index, row in enumerate(reader, start=1):
            try:
                clean_row = {}
                for k, v in row.items():
                    if k:
                        mapped_key = header_mapping.get(k.strip()) or k.strip().lower()
                        clean_row[mapped_key] = v.strip() if v else ""
                
                matricule = clean_row.get('matricule')
                immatriculation = clean_row.get('immatriculation')
                
                if not matricule or not immatriculation:
                    errors.append(f"Ligne {index}: Matricule ou Immatriculation manquant.")
                    continue
                
                # Fetch student
                db_student = crud.get_student_by_matricule(db, matricule=matricule)
                if not db_student:
                    errors.append(f"Ligne {index}: Aucun élève trouvé avec le matricule '{matricule}'.")
                    continue

                # Vérifier que l'utilisateur peut importer pour cet élève
                if not scope.is_global and scope.ecole_id and db_student.ecole_id != scope.ecole_id:
                    errors.append(f"Ligne {index}: Élève d'une autre école.")
                    continue

                # Fetch or create car
                db_car = crud.get_car_by_immatriculation(db, immatriculation=immatriculation)
                if not db_car:
                    car_in = schemas.CarCreate(
                        immatriculation=immatriculation,
                        marque="Inconnue",
                        modele="Importé",
                        capacite=30,
                        statut="actif"
                    )
                    db_car = crud.create_car(db, car=car_in, code_etablissement=scope.code_etablissement)
                
                arret = clean_row.get('arret') or "Arrêt par défaut"
                matin_val = clean_row.get('matin', '1')
                soir_val = clean_row.get('soir', '1')
                
                matin = matin_val.lower() not in ('0', 'false', 'non', 'no')
                soir = soir_val.lower() not in ('0', 'false', 'non', 'no')
                
                affect_in = schemas.AffectationTransportCreate(
                    eleveId=db_student.id,
                    vehiculeId=db_car.id,
                    arret=arret,
                    matin=matin,
                    soir=soir
                )
                crud.create_affectation_transport(db, affectation=affect_in)
                imported_count += 1
                
            except Exception as e:
                errors.append(f"Ligne {index}: Erreur inattendue : {str(e)}")
                
        return {
            "success": len(errors) == 0,
            "imported": imported_count,
            "errors": errors
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de traitement du fichier CSV : {str(e)}")
