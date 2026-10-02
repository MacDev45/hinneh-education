"""Module Gestion de paiements Via Bank.

Suivi des paiements de frais d'écolage réalisés sur la plateforme financière
externe : configuration de la connexion, synchronisation des transactions,
réception des notifications (webhook) et rapprochement avec les échéanciers.
"""

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from .. import models
from ..database import get_db
from ..timezone_utils import now_abidjan, today_abidjan
from ..services import bank_gateway
from ..services.bank_gateway import BankGatewayError

router = APIRouter(prefix="/bank", tags=["Paiements Via Bank"])

STATUTS_VALIDES = {"en_attente", "reussi", "echoue", "annule", "rembourse"}


# ----------------------------- Schémas -----------------------------

class BankConfigUpdate(BaseModel):
    provider_nom: str = Field(default="Plateforme Bancaire", max_length=120)
    base_url: Optional[str] = None
    auth_type: str = "api_key"
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    merchant_id: Optional[str] = None
    webhook_secret: Optional[str] = None
    endpoint_transactions: str = "/transactions"
    endpoint_paiement: str = "/payments"
    endpoint_statut: str = "/payments/{reference}"
    devise: str = "XOF"
    timeout_secondes: int = 20
    actif: bool = False
    mode_test: bool = True
    sync_auto: bool = True
    sync_intervalle_minutes: int = 10
    sync_lookback_jours: int = 7
    rapprochement_auto: bool = True


class InitiatePaymentRequest(BaseModel):
    eleve_id: int
    montant: float
    motif: str = "scolarite"
    canal: Optional[str] = None
    payeur_nom: Optional[str] = None
    payeur_telephone: Optional[str] = None
    annee_scolaire: str = "2026-2027"


class ManualTransactionRequest(BaseModel):
    reference_externe: str
    montant: float
    matricule_eleve: Optional[str] = None
    eleve_id: Optional[int] = None
    statut: str = "reussi"
    canal: Optional[str] = "virement"
    motif: str = "scolarite"
    payeur_nom: Optional[str] = None
    payeur_telephone: Optional[str] = None
    date_transaction: Optional[str] = None
    annee_scolaire: str = "2026-2027"


class ReconcileRequest(BaseModel):
    eleve_id: Optional[int] = None
    echeance_ids: Optional[List[int]] = None


# ----------------------------- Helpers -----------------------------

def _get_or_create_config(db: Session) -> models.BankConfig:
    try:
        config = db.query(models.BankConfig).order_by(models.BankConfig.id.asc()).first()
    except Exception:
        db.rollback()
        try:
            models.Base.metadata.create_all(bind=db.get_bind())
            config = db.query(models.BankConfig).order_by(models.BankConfig.id.asc()).first()
        except Exception:
            config = None

    if not config:
        config = models.BankConfig()
        try:
            db.add(config)
            db.commit()
            db.refresh(config)
        except Exception:
            db.rollback()
    return config


def _mask(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    if len(value) <= 4:
        return "*" * len(value)
    return f"{'*' * (len(value) - 4)}{value[-4:]}"


def _serialize_config(config: models.BankConfig) -> Dict[str, Any]:
    return {
        "id": config.id,
        "provider_nom": config.provider_nom,
        "base_url": config.base_url,
        "auth_type": config.auth_type,
        "api_key_masque": _mask(config.api_key),
        "api_secret_masque": _mask(config.api_secret),
        "webhook_secret_masque": _mask(config.webhook_secret),
        "api_key_definie": bool(config.api_key),
        "api_secret_definie": bool(config.api_secret),
        "webhook_secret_definie": bool(config.webhook_secret),
        "merchant_id": config.merchant_id,
        "endpoint_transactions": config.endpoint_transactions,
        "endpoint_paiement": config.endpoint_paiement,
        "endpoint_statut": config.endpoint_statut,
        "devise": config.devise,
        "timeout_secondes": config.timeout_secondes,
        "actif": config.actif,
        "mode_test": config.mode_test,
        "sync_auto": config.sync_auto,
        "sync_intervalle_minutes": config.sync_intervalle_minutes,
        "sync_lookback_jours": config.sync_lookback_jours,
        "rapprochement_auto": config.rapprochement_auto,
        "configuration_complete": bool(config.base_url and config.api_key),
        "date_derniere_sync": config.date_derniere_sync.isoformat() if config.date_derniere_sync else None,
        "resultat_derniere_sync": config.resultat_derniere_sync,
        "webhook_url": "/api/bank/webhook",
    }


def _serialize_transaction(tx: models.BankTransaction, db: Session) -> Dict[str, Any]:
    eleve = tx.eleve
    if eleve is None and tx.eleve_id:
        eleve = db.query(models.Eleve).filter(models.Eleve.id == tx.eleve_id).first()
    return {
        "id": tx.id,
        "reference_externe": tx.reference_externe,
        "reference_interne": tx.reference_interne,
        "montant": float(tx.montant or 0),
        "devise": tx.devise,
        "statut": tx.statut,
        "canal": tx.canal,
        "motif": tx.motif,
        "payeur_nom": tx.payeur_nom,
        "payeur_telephone": tx.payeur_telephone,
        "matricule_eleve": tx.matricule_eleve,
        "eleve_id": tx.eleve_id,
        "eleve_nom": f"{eleve.nom} {eleve.prenom}" if eleve else None,
        "ecole_id": tx.ecole_id,
        "paiement_id": tx.paiement_id,
        "rapproche": tx.rapproche,
        "date_rapprochement": tx.date_rapprochement.isoformat() if tx.date_rapprochement else None,
        "date_transaction": tx.date_transaction.isoformat() if tx.date_transaction else None,
        "annee_scolaire": tx.annee_scolaire,
        "message_erreur": tx.message_erreur,
    }


def _resolve_student(db: Session, matricule: Optional[str], eleve_id: Optional[int]) -> Optional[models.Eleve]:
    if eleve_id:
        student = db.query(models.Eleve).filter(models.Eleve.id == eleve_id).first()
        if student:
            return student
    if matricule:
        return db.query(models.Eleve).filter(models.Eleve.matricule == str(matricule).strip()).first()
    return None


def _upsert_transaction(db: Session, data: Dict[str, Any]) -> tuple[models.BankTransaction, bool]:
    """Crée ou met à jour une transaction ; retourne (transaction, creee)."""
    reference = data.get("reference_externe")
    if not reference:
        raise BankGatewayError("Transaction ignorée : référence externe absente.")

    student = _resolve_student(db, data.get("matricule_eleve"), data.get("eleve_id"))
    existing = db.query(models.BankTransaction).filter(
        models.BankTransaction.reference_externe == str(reference)
    ).first()

    if existing:
        existing.montant = data.get("montant") or existing.montant
        existing.statut = data.get("statut") or existing.statut
        existing.canal = data.get("canal") or existing.canal
        existing.devise = data.get("devise") or existing.devise
        existing.payeur_nom = data.get("payeur_nom") or existing.payeur_nom
        existing.payeur_telephone = data.get("payeur_telephone") or existing.payeur_telephone
        existing.matricule_eleve = data.get("matricule_eleve") or existing.matricule_eleve
        existing.message_erreur = data.get("message_erreur") or existing.message_erreur
        existing.payload_brut = data.get("payload_brut") or existing.payload_brut
        if data.get("date_transaction"):
            existing.date_transaction = data["date_transaction"]
        if student and not existing.eleve_id:
            existing.eleve_id = student.id
            existing.ecole_id = student.ecole_id
        existing.date_modification = datetime.utcnow()
        return existing, False

    transaction = models.BankTransaction(
        reference_externe=str(reference),
        reference_interne=data.get("reference_interne"),
        montant=data.get("montant") or Decimal("0.00"),
        devise=data.get("devise") or "XOF",
        statut=data.get("statut") or "en_attente",
        canal=data.get("canal"),
        motif=(data.get("motif") or "scolarite")[:50],
        payeur_nom=data.get("payeur_nom"),
        payeur_telephone=data.get("payeur_telephone"),
        matricule_eleve=data.get("matricule_eleve"),
        eleve_id=student.id if student else None,
        ecole_id=student.ecole_id if student else None,
        date_transaction=data.get("date_transaction") or datetime.utcnow(),
        annee_scolaire=data.get("annee_scolaire") or "2026-2027",
        message_erreur=data.get("message_erreur"),
        payload_brut=data.get("payload_brut"),
    )
    db.add(transaction)
    return transaction, True


def _generate_receipt_number(paiement_id: int) -> str:
    # Basé sur l'id auto-incrémenté du paiement (unique par construction) : pas de collision possible.
    today_str = now_abidjan().strftime("%Y%m%d")
    return f"BNK-{today_str}-{paiement_id:06d}"


def _reconcile_transaction(db: Session, tx: models.BankTransaction,
                           echeance_ids: Optional[List[int]] = None) -> Dict[str, Any]:
    """Rapproche une transaction bancaire : crée le paiement et solde les tranches."""
    if tx.rapproche:
        raise HTTPException(status_code=400, detail="Cette transaction est déjà rapprochée.")
    if tx.statut != "reussi":
        raise HTTPException(status_code=400, detail="Seules les transactions réussies peuvent être rapprochées.")
    if not tx.eleve_id:
        raise HTTPException(status_code=400, detail="Associez d'abord un élève à cette transaction.")

    student = db.query(models.Eleve).filter(models.Eleve.id == tx.eleve_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Élève introuvable pour cette transaction.")

    montant = Decimal(str(tx.montant or 0))
    if montant <= 0:
        raise HTTPException(status_code=400, detail="Le montant de la transaction est invalide.")

    if echeance_ids:
        tranches = db.query(models.EcheancierPaiement).filter(
            models.EcheancierPaiement.id.in_(echeance_ids),
            models.EcheancierPaiement.eleve_id == student.id,
        ).order_by(models.EcheancierPaiement.date_echeance.asc()).all()
    else:
        tranches = db.query(models.EcheancierPaiement).filter(
            models.EcheancierPaiement.eleve_id == student.id,
            models.EcheancierPaiement.statut.in_(["non_paye", "partiel", "en_retard"]),
        ).order_by(models.EcheancierPaiement.date_echeance.asc()).all()

    reste = montant
    tranches_maj = []
    for tranche in tranches:
        if reste <= 0:
            break
        du = tranche.montant_prevu - tranche.montant_paye
        if du <= 0:
            continue
        part = min(reste, du)
        tranche.montant_paye += part
        tranche.date_dernier_versement = now_abidjan()
        tranche.statut = "paye" if tranche.montant_paye >= tranche.montant_prevu else "partiel"
        reste -= part
        tranches_maj.append(tranche)

    paiement = models.Paiement(
        montant=montant,
        type=tx.motif if tx.motif in ("scolarite", "inscription", "cantine", "transport", "autre") else "scolarite",
        mode="virement" if (tx.canal or "virement") in ("virement", "guichet") else (tx.canal or "virement"),
        statut="paye",
        date=tx.date_transaction or now_abidjan(),
        date_echeance=today_abidjan(),
        eleve_id=student.id,
        numero_transaction=tx.reference_externe,
    )
    db.add(paiement)
    db.flush()
    paiement.numero_recu = _generate_receipt_number(paiement.id)

    ptype = (tx.motif or "scolarite").lower().strip()
    if ptype in ("scolarite", "frais_inscription", "frais_annexe", "inscription", "reinscription"):
        total_scol_paye = db.query(func.coalesce(func.sum(models.Paiement.montant), Decimal("0.00"))).filter(
            models.Paiement.eleve_id == student.id,
            models.Paiement.type.in_(["scolarite", "frais_inscription", "frais_annexe", "inscription", "reinscription"]),
            models.Paiement.statut != "annule"
        ).scalar() or Decimal("0.00")
        student.AU_TOTALDEPOT = Decimal(str(total_scol_paye))
        student.AU_SOLDECOMPTE = max(Decimal("0.00"), (student.AU_SCOLARITE or Decimal("0.00")) - student.AU_TOTALDEPOT)
        if hasattr(student, "solde"):
            student.solde = student.AU_SOLDECOMPTE

    tx.paiement_id = paiement.id
    tx.rapproche = True
    tx.date_rapprochement = datetime.utcnow()
    tx.date_modification = datetime.utcnow()

    db.commit()
    db.refresh(tx)

    return {
        "success": True,
        "message": f"Transaction {tx.reference_externe} rapprochée : {float(montant):,.0f} FCFA affectés à {student.nom} {student.prenom}.",
        "paiement_id": paiement.id,
        "numero_recu": paiement.numero_recu,
        "montant_non_affecte": float(reste),
        "tranches_maj": [
            {
                "id": t.id,
                "libelle": t.libelle,
                "montant_paye": float(t.montant_paye),
                "statut": t.statut,
            } for t in tranches_maj
        ],
    }


# ----------------------------- Configuration -----------------------------

@router.get("/config")
def read_bank_config(db: Session = Depends(get_db)):
    return _serialize_config(_get_or_create_config(db))


@router.put("/config")
def update_bank_config(data: BankConfigUpdate, db: Session = Depends(get_db)):
    if data.auth_type not in ("api_key", "bearer", "basic", "oauth2"):
        raise HTTPException(status_code=400, detail="Type d'authentification non pris en charge.")
    if data.timeout_secondes < 1 or data.timeout_secondes > 120:
        raise HTTPException(status_code=400, detail="Le délai d'attente doit être compris entre 1 et 120 secondes.")
    if data.sync_intervalle_minutes < 1 or data.sync_intervalle_minutes > 1440:
        raise HTTPException(status_code=400, detail="L'intervalle de synchronisation doit être compris entre 1 et 1440 minutes.")
    if data.sync_lookback_jours < 0 or data.sync_lookback_jours > 365:
        raise HTTPException(status_code=400, detail="La profondeur d'historique doit être comprise entre 0 et 365 jours.")
    if data.actif and not (data.base_url or "").strip():
        raise HTTPException(status_code=400, detail="Renseignez l'URL de base avant d'activer la passerelle.")

    config = _get_or_create_config(db)
    config.provider_nom = data.provider_nom.strip() or "Plateforme Bancaire"
    config.base_url = (data.base_url or "").strip() or None
    config.auth_type = data.auth_type
    config.merchant_id = (data.merchant_id or "").strip() or None
    config.endpoint_transactions = data.endpoint_transactions.strip() or "/transactions"
    config.endpoint_paiement = data.endpoint_paiement.strip() or "/payments"
    config.endpoint_statut = data.endpoint_statut.strip() or "/payments/{reference}"
    config.devise = data.devise.strip().upper() or "XOF"
    config.timeout_secondes = data.timeout_secondes
    config.actif = data.actif
    config.mode_test = data.mode_test
    config.sync_auto = data.sync_auto
    config.sync_intervalle_minutes = data.sync_intervalle_minutes
    config.sync_lookback_jours = data.sync_lookback_jours
    config.rapprochement_auto = data.rapprochement_auto
    config.date_modification = datetime.utcnow()

    # Les secrets ne sont écrasés que si de nouvelles valeurs sont fournies
    if data.api_key is not None and data.api_key.strip():
        config.api_key = data.api_key.strip()
    if data.api_secret is not None and data.api_secret.strip():
        config.api_secret = data.api_secret.strip()
    if data.webhook_secret is not None and data.webhook_secret.strip():
        config.webhook_secret = data.webhook_secret.strip()

    db.commit()
    db.refresh(config)
    return _serialize_config(config)


@router.post("/config/test")
def test_bank_connection(db: Session = Depends(get_db)):
    config = _get_or_create_config(db)
    if not config.base_url:
        raise HTTPException(status_code=400, detail="Renseignez l'URL de base de la plateforme bancaire.")
    try:
        body = bank_gateway.request(
            config, "GET", config.endpoint_transactions,
            params={"limit": 1},
        )
    except BankGatewayError as exc:
        return {"success": False, "message": str(exc)}
    transactions = bank_gateway.extract_transactions(body)
    return {
        "success": True,
        "message": "Connexion établie avec la plateforme bancaire.",
        "transactions_detectees": len(transactions),
        "exemple_champs": sorted(transactions[0].keys()) if transactions else [],
    }


# ----------------------------- Transactions -----------------------------

@router.get("/transactions")
def list_bank_transactions(
    statut: Optional[str] = Query(None),
    rapproche: Optional[bool] = Query(None),
    eleve_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    date_debut: Optional[str] = Query(None),
    date_fin: Optional[str] = Query(None),
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    query = db.query(models.BankTransaction)
    if statut:
        query = query.filter(models.BankTransaction.statut == statut)
    if rapproche is not None:
        query = query.filter(models.BankTransaction.rapproche == rapproche)
    if eleve_id:
        query = query.filter(models.BankTransaction.eleve_id == eleve_id)
    if search:
        motif = f"%{search.strip()}%"
        query = query.filter(
            models.BankTransaction.reference_externe.like(motif)
            | models.BankTransaction.matricule_eleve.like(motif)
            | models.BankTransaction.payeur_nom.like(motif)
        )
    for raw_date, comparator in ((date_debut, "debut"), (date_fin, "fin")):
        if not raw_date:
            continue
        try:
            parsed = datetime.strptime(raw_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Les dates doivent être au format AAAA-MM-JJ.")
        if comparator == "debut":
            query = query.filter(models.BankTransaction.date_transaction >= parsed)
        else:
            query = query.filter(models.BankTransaction.date_transaction <= parsed + timedelta(days=1))

    try:
        transactions = query.order_by(models.BankTransaction.date_transaction.desc()).limit(limit).all()
    except Exception:
        db.rollback()
        transactions = []
    return [_serialize_transaction(tx, db) for tx in transactions]


@router.get("/stats")
def get_bank_stats(db: Session = Depends(get_db)):
    try:
        transactions = db.query(models.BankTransaction).all()
    except Exception:
        db.rollback()
        transactions = []
    reussies = [t for t in transactions if t.statut == "reussi"]
    total_encaisse = sum((Decimal(str(t.montant or 0)) for t in reussies), Decimal("0.00"))
    non_rapprochees = [t for t in reussies if not t.rapproche]
    montant_non_rapproche = sum((Decimal(str(t.montant or 0)) for t in non_rapprochees), Decimal("0.00"))
    config = _get_or_create_config(db)

    return {
        "nb_transactions": len(transactions),
        "nb_reussies": len(reussies),
        "nb_en_attente": len([t for t in transactions if t.statut == "en_attente"]),
        "nb_echouees": len([t for t in transactions if t.statut == "echoue"]),
        "nb_non_rapprochees": len(non_rapprochees),
        "nb_sans_eleve": len([t for t in transactions if not t.eleve_id]),
        "total_encaisse": float(total_encaisse),
        "montant_non_rapproche": float(montant_non_rapproche),
        "taux_rapprochement": round((len(reussies) - len(non_rapprochees)) / len(reussies) * 100) if reussies else 0,
        "passerelle_active": config.actif,
        "date_derniere_sync": config.date_derniere_sync.isoformat() if config.date_derniere_sync else None,
    }


@router.get("/scheduler")
def get_scheduler_state(db: Session = Depends(get_db)):
    """État de la synchronisation automatique (planificateur)."""
    from ..services import bank_scheduler

    config = _get_or_create_config(db)
    prochaine = None
    if config.date_derniere_sync and config.sync_auto:
        prochaine = (
            config.date_derniere_sync
            + timedelta(minutes=max(1, config.sync_intervalle_minutes or 10))
        ).isoformat()

    return {
        "sync_auto": config.sync_auto,
        "rapprochement_auto": config.rapprochement_auto,
        "intervalle_minutes": config.sync_intervalle_minutes,
        "lookback_jours": config.sync_lookback_jours,
        "passerelle_active": config.actif,
        "date_derniere_sync": config.date_derniere_sync.isoformat() if config.date_derniere_sync else None,
        "resultat_derniere_sync": config.resultat_derniere_sync,
        "prochaine_execution_estimee": prochaine,
        "dernier_cycle": bank_scheduler.dernier_resultat(),
    }


@router.get("/suivi-echeancier")
def suivi_paiements_echeancier(
    statut_paiement: str = Query("all", description="all | solde | partiel | impaye | en_retard"),
    classe_id: Optional[int] = Query(None),
    ecole_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    annee_scolaire: str = Query("2026-2027"),
    db: Session = Depends(get_db),
):
    """Suivi des paiements effectués / impayés par élève au regard de son échéancier.

    Croise les tranches de l'échéancier avec les transactions bancaires afin de
    distinguer les élèves soldés, partiellement à jour, impayés ou en retard.
    """
    if statut_paiement not in ("all", "solde", "partiel", "impaye", "en_retard"):
        raise HTTPException(status_code=400, detail="Filtre de statut de paiement invalide.")

    echeances_query = db.query(models.EcheancierPaiement).filter(
        models.EcheancierPaiement.annee_scolaire == annee_scolaire
    )
    if ecole_id:
        echeances_query = echeances_query.filter(models.EcheancierPaiement.ecole_id == ecole_id)
    echeances = echeances_query.all()

    if not echeances:
        return {"annee_scolaire": annee_scolaire, "resume": {}, "eleves": []}

    eleve_ids = {e.eleve_id for e in echeances}
    students_query = db.query(models.Eleve).filter(models.Eleve.id.in_(eleve_ids))
    if classe_id:
        students_query = students_query.filter(models.Eleve.classe_id == classe_id)
    students = {s.id: s for s in students_query.all()}

    transactions = db.query(models.BankTransaction).filter(
        models.BankTransaction.eleve_id.in_(eleve_ids),
        models.BankTransaction.statut == "reussi",
    ).all()

    aujourdhui = date.today()
    par_eleve: Dict[int, Dict[str, Any]] = {}

    for echeance in echeances:
        student = students.get(echeance.eleve_id)
        if not student:
            continue
        entree = par_eleve.setdefault(echeance.eleve_id, {
            "eleve_id": student.id,
            "matricule": student.matricule,
            "nom": student.nom,
            "prenom": student.prenom,
            "classe_id": student.classe_id,
            "total_prevu": Decimal("0.00"),
            "total_paye": Decimal("0.00"),
            "nb_tranches": 0,
            "nb_tranches_payees": 0,
            "nb_tranches_impayees": 0,
            "nb_tranches_en_retard": 0,
            "prochaine_echeance": None,
            "montant_bank": Decimal("0.00"),
            "nb_transactions_bank": 0,
        })

        prevu = Decimal(str(echeance.montant_prevu or 0))
        paye = Decimal(str(echeance.montant_paye or 0))
        entree["total_prevu"] += prevu
        entree["total_paye"] += paye
        entree["nb_tranches"] += 1

        if paye >= prevu and prevu > 0:
            entree["nb_tranches_payees"] += 1
        else:
            entree["nb_tranches_impayees"] += 1
            if echeance.date_echeance and echeance.date_echeance < aujourdhui:
                entree["nb_tranches_en_retard"] += 1
            prochaine = entree["prochaine_echeance"]
            if echeance.date_echeance and (prochaine is None or echeance.date_echeance < prochaine):
                entree["prochaine_echeance"] = echeance.date_echeance

    for transaction in transactions:
        entree = par_eleve.get(transaction.eleve_id)
        if not entree:
            continue
        entree["montant_bank"] += Decimal(str(transaction.montant or 0))
        entree["nb_transactions_bank"] += 1

    resultats: List[Dict[str, Any]] = []
    for entree in par_eleve.values():
        total_prevu = entree["total_prevu"]
        total_paye = entree["total_paye"]
        solde = total_prevu - total_paye

        if total_paye <= 0:
            statut = "impaye"
        elif solde <= 0:
            statut = "solde"
        else:
            statut = "partiel"
        if statut != "solde" and entree["nb_tranches_en_retard"] > 0:
            statut = "en_retard"

        resultats.append({
            "eleve_id": entree["eleve_id"],
            "matricule": entree["matricule"],
            "nom": entree["nom"],
            "prenom": entree["prenom"],
            "classe_id": entree["classe_id"],
            "total_prevu": float(total_prevu),
            "total_paye": float(total_paye),
            "solde_restant": float(max(Decimal("0.00"), solde)),
            "taux_paiement": round(float(total_paye / total_prevu * 100)) if total_prevu > 0 else 0,
            "nb_tranches": entree["nb_tranches"],
            "nb_tranches_payees": entree["nb_tranches_payees"],
            "nb_tranches_impayees": entree["nb_tranches_impayees"],
            "nb_tranches_en_retard": entree["nb_tranches_en_retard"],
            "prochaine_echeance": entree["prochaine_echeance"].isoformat() if entree["prochaine_echeance"] else None,
            "montant_regle_via_bank": float(entree["montant_bank"]),
            "nb_transactions_bank": entree["nb_transactions_bank"],
            "statut_paiement": statut,
        })

    resume = {
        "nb_eleves": len(resultats),
        "nb_soldes": len([r for r in resultats if r["statut_paiement"] == "solde"]),
        "nb_partiels": len([r for r in resultats if r["statut_paiement"] == "partiel"]),
        "nb_impayes": len([r for r in resultats if r["statut_paiement"] == "impaye"]),
        "nb_en_retard": len([r for r in resultats if r["statut_paiement"] == "en_retard"]),
        "total_attendu": round(sum(r["total_prevu"] for r in resultats), 2),
        "total_recouvre": round(sum(r["total_paye"] for r in resultats), 2),
        "total_impaye": round(sum(r["solde_restant"] for r in resultats), 2),
        "total_via_bank": round(sum(r["montant_regle_via_bank"] for r in resultats), 2),
    }

    if statut_paiement != "all":
        resultats = [r for r in resultats if r["statut_paiement"] == statut_paiement]
    if search:
        terme = search.strip().lower()
        resultats = [
            r for r in resultats
            if terme in str(r["matricule"] or "").lower()
            or terme in f"{r['prenom']} {r['nom']}".lower()
        ]

    resultats.sort(key=lambda r: (-r["solde_restant"], r["nom"] or ""))

    return {"annee_scolaire": annee_scolaire, "resume": resume, "eleves": resultats}


@router.post("/transactions")
def create_manual_transaction(data: ManualTransactionRequest, db: Session = Depends(get_db)):
    """Enregistre manuellement une transaction (avis bancaire reçu hors API)."""
    if data.statut not in STATUTS_VALIDES:
        raise HTTPException(status_code=400, detail="Statut de transaction invalide.")
    if data.montant <= 0:
        raise HTTPException(status_code=400, detail="Le montant doit être supérieur à zéro.")
    if db.query(models.BankTransaction).filter(
        models.BankTransaction.reference_externe == data.reference_externe.strip()
    ).first():
        raise HTTPException(status_code=400, detail="Une transaction avec cette référence existe déjà.")

    transaction, _ = _upsert_transaction(db, {
        "reference_externe": data.reference_externe.strip(),
        "montant": Decimal(str(data.montant)),
        "statut": data.statut,
        "canal": data.canal,
        "motif": data.motif,
        "payeur_nom": data.payeur_nom,
        "payeur_telephone": data.payeur_telephone,
        "matricule_eleve": data.matricule_eleve,
        "eleve_id": data.eleve_id,
        "date_transaction": bank_gateway.normalize_date(data.date_transaction) if data.date_transaction else datetime.utcnow(),
        "annee_scolaire": data.annee_scolaire,
        "payload_brut": {"source": "saisie_manuelle"},
    })
    db.commit()
    db.refresh(transaction)
    return _serialize_transaction(transaction, db)


def run_sync(db: Session, date_debut: Optional[str] = None, date_fin: Optional[str] = None,
             auto_reconcile: Optional[bool] = None) -> Dict[str, Any]:
    """Synchronise les transactions bancaires puis met à jour les montants dus.

    Utilisée par l'endpoint manuel et par le planificateur automatique.
    """
    config = _get_or_create_config(db)
    if not config.actif:
        raise BankGatewayError("La passerelle bancaire est désactivée.")
    if not config.base_url or not config.api_key:
        raise BankGatewayError("Configuration incomplète : URL de base et clé API requises.")

    if not date_debut and config.sync_lookback_jours:
        date_debut = (date.today() - timedelta(days=config.sync_lookback_jours)).isoformat()

    params: Dict[str, Any] = {"limit": 500}
    if config.merchant_id:
        params["merchant_id"] = config.merchant_id
    if date_debut:
        params["date_from"] = date_debut
    if date_fin:
        params["date_to"] = date_fin

    body = bank_gateway.request(config, "GET", config.endpoint_transactions, params=params)

    brutes = bank_gateway.extract_transactions(body)
    creees, majs, ignorees = 0, 0, 0
    for brute in brutes:
        normalisee = bank_gateway.normalize_transaction(brute)
        if not normalisee.get("reference_externe"):
            ignorees += 1
            continue
        _, creee = _upsert_transaction(db, normalisee)
        creees += 1 if creee else 0
        majs += 0 if creee else 1

    config.date_derniere_sync = datetime.utcnow()
    db.commit()

    reconciliation: Dict[str, Any] = {"rapprochees": 0, "erreurs": []}
    doit_rapprocher = config.rapprochement_auto if auto_reconcile is None else auto_reconcile
    if doit_rapprocher:
        reconciliation = run_auto_reconcile(db)

    resume = (
        f"{creees} nouvelle(s), {majs} mise(s) à jour, {ignorees} ignorée(s), "
        f"{reconciliation['rapprochees']} rapprochée(s)"
    )
    config.resultat_derniere_sync = resume
    db.commit()

    return {
        "success": True,
        "message": f"Synchronisation terminée : {resume}.",
        "transactions_recues": len(brutes),
        "creees": creees,
        "mises_a_jour": majs,
        "ignorees": ignorees,
        "rapprochees": reconciliation["rapprochees"],
        "erreurs_rapprochement": reconciliation["erreurs"],
        "date_sync": config.date_derniere_sync.isoformat(),
    }


def run_auto_reconcile(db: Session) -> Dict[str, Any]:
    """Rapproche toutes les transactions réussies déjà rattachées à un élève.

    Chaque rapprochement impute le montant aux tranches de l'échéancier, ce qui
    met automatiquement à jour le montant restant dû affiché au Guichet.
    """
    transactions = db.query(models.BankTransaction).filter(
        models.BankTransaction.statut == "reussi",
        models.BankTransaction.rapproche == False,  # noqa: E712
        models.BankTransaction.eleve_id.isnot(None),
    ).order_by(models.BankTransaction.date_transaction.asc()).all()

    rapprochees, erreurs = 0, []
    for transaction in transactions:
        try:
            _reconcile_transaction(db, transaction, None)
            rapprochees += 1
        except HTTPException as exc:
            db.rollback()
            erreurs.append(f"{transaction.reference_externe} : {exc.detail}")
        except Exception as exc:  # pragma: no cover - sécurité du planificateur
            db.rollback()
            erreurs.append(f"{transaction.reference_externe} : {exc}")

    return {"rapprochees": rapprochees, "erreurs": erreurs}


@router.post("/sync")
def sync_bank_transactions(
    date_debut: Optional[str] = Query(None, description="Format AAAA-MM-JJ"),
    date_fin: Optional[str] = Query(None, description="Format AAAA-MM-JJ"),
    rapprocher: Optional[bool] = Query(None, description="Force le rapprochement automatique"),
    db: Session = Depends(get_db),
):
    """Récupère les transactions depuis la plateforme bancaire et actualise les montants dus."""
    try:
        return run_sync(db, date_debut=date_debut, date_fin=date_fin, auto_reconcile=rapprocher)
    except BankGatewayError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.post("/payments/initiate")
def initiate_bank_payment(data: InitiatePaymentRequest, db: Session = Depends(get_db)):
    """Initie une demande de paiement d'écolage sur la plateforme bancaire."""
    config = _get_or_create_config(db)
    if not config.actif:
        raise HTTPException(status_code=400, detail="La passerelle bancaire est désactivée.")
    if data.montant <= 0:
        raise HTTPException(status_code=400, detail="Le montant doit être supérieur à zéro.")

    student = db.query(models.Eleve).filter(models.Eleve.id == data.eleve_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Élève non trouvé")

    reference_interne = f"ECO-{student.matricule}-{now_abidjan().strftime('%Y%m%d%H%M%S')}"
    payload = {
        "merchant_id": config.merchant_id,
        "reference": reference_interne,
        "amount": float(data.montant),
        "currency": config.devise,
        "purpose": data.motif,
        "channel": data.canal,
        "student_matricule": student.matricule,
        "student_name": f"{student.nom} {student.prenom}",
        "payer_name": data.payeur_nom or student.AU_TUTEURLEGAL,
        "payer_phone": data.payeur_telephone or student.AU_CONTACTS,
    }

    try:
        body = bank_gateway.request(config, "POST", config.endpoint_paiement, json_body=payload)
    except BankGatewayError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    normalisee = bank_gateway.normalize_transaction(body if isinstance(body, dict) else {})
    normalisee["reference_externe"] = normalisee.get("reference_externe") or reference_interne
    normalisee["reference_interne"] = reference_interne
    normalisee["montant"] = Decimal(str(data.montant))
    normalisee["motif"] = data.motif
    normalisee["eleve_id"] = student.id
    normalisee["matricule_eleve"] = student.matricule
    normalisee["annee_scolaire"] = data.annee_scolaire
    if not normalisee.get("canal"):
        normalisee["canal"] = data.canal

    transaction, _ = _upsert_transaction(db, normalisee)
    db.commit()
    db.refresh(transaction)

    return {
        "success": True,
        "message": "Demande de paiement transmise à la plateforme bancaire.",
        "transaction": _serialize_transaction(transaction, db),
        "reponse_fournisseur": body,
    }


@router.post("/transactions/{transaction_id}/refresh")
def refresh_transaction_status(transaction_id: int, db: Session = Depends(get_db)):
    """Interroge la plateforme bancaire pour actualiser le statut d'une transaction."""
    config = _get_or_create_config(db)
    transaction = db.query(models.BankTransaction).filter(models.BankTransaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction non trouvée")
    if not config.actif:
        raise HTTPException(status_code=400, detail="La passerelle bancaire est désactivée.")

    endpoint = (config.endpoint_statut or "/payments/{reference}")
    endpoint = endpoint.replace("{reference}", transaction.reference_externe)
    try:
        body = bank_gateway.request(config, "GET", endpoint)
    except BankGatewayError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    normalisee = bank_gateway.normalize_transaction(body if isinstance(body, dict) else {})
    normalisee["reference_externe"] = transaction.reference_externe
    _upsert_transaction(db, normalisee)
    db.commit()
    db.refresh(transaction)
    return _serialize_transaction(transaction, db)


@router.post("/transactions/{transaction_id}/link/{eleve_id}")
def link_transaction_to_student(transaction_id: int, eleve_id: int, db: Session = Depends(get_db)):
    """Associe manuellement une transaction à un élève."""
    transaction = db.query(models.BankTransaction).filter(models.BankTransaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction non trouvée")
    if transaction.rapproche:
        raise HTTPException(status_code=400, detail="Transaction déjà rapprochée : l'élève ne peut plus être modifié.")

    student = db.query(models.Eleve).filter(models.Eleve.id == eleve_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Élève non trouvé")

    transaction.eleve_id = student.id
    transaction.matricule_eleve = student.matricule
    transaction.ecole_id = student.ecole_id
    transaction.date_modification = datetime.utcnow()
    db.commit()
    db.refresh(transaction)
    return _serialize_transaction(transaction, db)


@router.post("/transactions/{transaction_id}/reconcile")
def reconcile_bank_transaction(transaction_id: int, data: ReconcileRequest, db: Session = Depends(get_db)):
    """Rapproche une transaction : création du paiement et imputation aux tranches."""
    transaction = db.query(models.BankTransaction).filter(models.BankTransaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction non trouvée")

    if data.eleve_id and not transaction.eleve_id:
        student = db.query(models.Eleve).filter(models.Eleve.id == data.eleve_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Élève non trouvé")
        transaction.eleve_id = student.id
        transaction.matricule_eleve = student.matricule
        transaction.ecole_id = student.ecole_id

    return _reconcile_transaction(db, transaction, data.echeance_ids)


@router.post("/reconcile-auto")
def reconcile_all_matched(db: Session = Depends(get_db)):
    """Rapproche automatiquement toutes les transactions réussies liées à un élève."""
    resultat = run_auto_reconcile(db)
    return {
        "success": True,
        "message": f"{resultat['rapprochees']} transaction(s) rapprochée(s) automatiquement.",
        "rapprochees": resultat["rapprochees"],
        "erreurs": resultat["erreurs"],
    }


@router.delete("/transactions/{transaction_id}")
def delete_bank_transaction(transaction_id: int, db: Session = Depends(get_db)):
    transaction = db.query(models.BankTransaction).filter(models.BankTransaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction non trouvée")
    if transaction.rapproche:
        raise HTTPException(
            status_code=400,
            detail="Impossible de supprimer une transaction rapprochée : annulez d'abord le rapprochement comptable.",
        )
    reference = transaction.reference_externe
    db.delete(transaction)
    db.commit()
    return {"success": True, "message": f"Transaction {reference} supprimée."}


# ----------------------------- Webhook -----------------------------

@router.post("/webhook")
async def receive_bank_webhook(request: Request, db: Session = Depends(get_db)):
    """Réception des notifications de paiement émises par la plateforme bancaire."""
    config = _get_or_create_config(db)
    raw_body = await request.body()
    signature = (
        request.headers.get("X-Signature")
        or request.headers.get("X-Hub-Signature-256")
        or request.headers.get("X-Webhook-Signature")
    )
    if not bank_gateway.verify_webhook_signature(config.webhook_secret, raw_body, signature):
        raise HTTPException(status_code=401, detail="Signature du webhook invalide.")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Corps de notification illisible (JSON attendu).")

    evenements = bank_gateway.extract_transactions(payload)
    if not evenements and isinstance(payload, dict):
        evenements = [payload]

    traitees, ignorees = 0, 0
    for evenement in evenements:
        normalisee = bank_gateway.normalize_transaction(evenement)
        if not normalisee.get("reference_externe"):
            ignorees += 1
            continue
        _upsert_transaction(db, normalisee)
        traitees += 1

    db.commit()

    # Mise à jour immédiate des montants dus au Guichet
    rapprochees = 0
    if config.rapprochement_auto:
        rapprochees = run_auto_reconcile(db)["rapprochees"]

    return {"success": True, "traitees": traitees, "ignorees": ignorees, "rapprochees": rapprochees}
