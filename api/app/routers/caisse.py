from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case, or_
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel
import json
import unicodedata
from pathlib import Path

from ..database import get_db
from .. import crud, schemas, models
from ..timezone_utils import now_abidjan, today_abidjan, format_time_abidjan, format_datetime_abidjan, parse_client_date_abidjan
from ..routers.auth import get_school_scope, SchoolScope
from .audit import log_audit

router = APIRouter(
    prefix="/caisse",
    tags=["caisse"]
)

from typing import List, Optional, Any, Union, Tuple

_JSON_PRESETS_CACHE = None

def _get_json_presets() -> List[dict]:
    global _JSON_PRESETS_CACHE
    if _JSON_PRESETS_CACHE is not None:
        return _JSON_PRESETS_CACHE
    presets = []
    possible_paths = [
        Path(__file__).parent.parent / "defaultGrillePresets.json",
        Path(__file__).parent.parent.parent / "src" / "lib" / "defaultGrillePresets.json",
        Path("d:/dowload/educ/final/Dossier/310526/310526/api/app/defaultGrillePresets.json"),
        Path("d:/dowload/educ/final/Dossier/310526/310526/src/lib/defaultGrillePresets.json"),
    ]
    for p in possible_paths:
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    presets = json.load(f)
                    if presets:
                        break
            except Exception:
                pass
    _JSON_PRESETS_CACHE = presets
    return _JSON_PRESETS_CACHE

class ModifierTransactionIdRequest(BaseModel):
    nouveau_numero_transaction: str
    motif_modification: str
    admin_nom: Optional[str] = None

class EncaissementCaisseRequest(BaseModel):
    eleve_id: Any
    motif: str  # 'scolarite', 'inscription', 'quitte', 'cantine', 'transport', 'uniforme', 'autre'
    echeance_ids: Optional[List[Any]] = None
    montant: float
    mode: str = "especes"  # 'especes', 'mobile_money', 'cheque', 'virement'
    numero_transaction: Optional[str] = None
    observation: Optional[str] = None
    caissier_nom: Optional[str] = "Caissier Principale"
    annee_scolaire: Optional[str] = "2026-2027"
    date_operation: Optional[str] = None  # Horodatage client officiel (Africa/Abidjan = GMT+0)

# Seuls les motifs listés ici s'adossent à un échéancier planifié à l'avance :
# la scolarité, et les abonnements mensuels cantine / transport. Tout autre motif
# (kits, tenues, fournitures, cours d'appoint, frais divers, inscription, « autre »)
# est un achat réglé à l'acte : il s'encaisse directement, sans tranche préalable.
MOTIF_SERVICE_TYPE_MAP = {
    "cantine": "cantine",
    "transport": "transport",
    "car": "transport",
}

SCHOOL_CLUSTERS_PY = {
    "abidjan": {
        "canonical_id": 1,
        "all_ids": [1, 4, 5, 6, 7],
        "canonical_code": "057955",
        "all_codes": ["057955", "0579558", "FHA-01", "ECOLE_TEST_A", "FHA-TEST-1783608727", "FHA-TEST-1783894452", "FHA-TEST-1783894553"],
        "city": "abidjan",
    },
    "bouake": {
        "canonical_id": 16,
        "all_ids": [16, 2],
        "canonical_code": "09786",
        "all_codes": ["09786", "9786", "IEF-02"],
        "city": "bouake",
    },
    "yamoussoukro": {
        "canonical_id": 13,
        "all_ids": [13, 14, 15, 3, 8],
        "canonical_code": "058128",
        "all_codes": ["058128", "LIY-03", "ECOLE_TEST_B"],
        "city": "yamoussoukro",
    },
    "daloa": {
        "canonical_id": 20,
        "all_ids": [19, 20, 21, 13],
        "canonical_code": "058131",
        "all_codes": ["058131", "HIN-DLO-01"],
        "city": "daloa",
    },
    "korhogo": {
        "canonical_id": 22,
        "all_ids": [22, 23, 24, 9, 3],
        "canonical_code": "240477",
        "all_codes": ["240477", "2404777"],
        "city": "korhogo",
    },
}

# Services facturés au mois : un versement doit solder des mois entiers, sans déborder
# partiellement sur le mois suivant.
MONTHLY_SERVICES = ("cantine", "transport")

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

# ── Modèle d'encaissement de la rentrée (septembre) ──
# Toutes les écoles ne perçoivent pas une première tranche de scolarité à la rentrée :
# certaines n'encaissent que les frais d'inscription en septembre (cas de Korhogo). Le
# reçu ne doit alors afficher que la ligne « Frais d'Inscription », et la tranche de
# scolarité de septembre ne pèse plus sur le dû de l'élève. Le modèle se règle par code
# établissement, puis par ville ; à défaut le modèle historique (inscription + 1er
# versement de scolarité) reste appliqué.
MODELE_SEPTEMBRE_INSCRIPTION_SEULE = "inscription_seule"
MODELE_SEPTEMBRE_AVEC_SCOLARITE = "inscription_plus_scolarite"

MODELE_SEPTEMBRE_PAR_CODE_ETABLISSEMENT = {}

MODELE_SEPTEMBRE_PAR_VILLE = {
    "KORHOGO": MODELE_SEPTEMBRE_INSCRIPTION_SEULE,
}


def _canon_texte(valeur) -> str:
    """Majuscules sans accents, pour comparer villes et libellés de tranches."""
    txt = unicodedata.normalize("NFD", str(valeur or ""))
    txt = "".join(c for c in txt if unicodedata.category(c) != "Mn")
    return txt.upper().strip()


def get_modele_septembre(ecole) -> str:
    """Modèle d'encaissement de septembre applicable à l'établissement de l'élève."""
    if ecole is None:
        return MODELE_SEPTEMBRE_AVEC_SCOLARITE

    code = _canon_texte(getattr(ecole, "ET_CODEETABLISSEMENT", ""))
    if code and code in MODELE_SEPTEMBRE_PAR_CODE_ETABLISSEMENT:
        return MODELE_SEPTEMBRE_PAR_CODE_ETABLISSEMENT[code]

    ville = _canon_texte(getattr(ecole, "ET_VILLE", ""))
    if ville and ville in MODELE_SEPTEMBRE_PAR_VILLE:
        return MODELE_SEPTEMBRE_PAR_VILLE[ville]

    return MODELE_SEPTEMBRE_AVEC_SCOLARITE


def est_ligne_inscription(libelle) -> bool:
    """Vrai pour une tranche de frais d'inscription ou de frais annexes."""
    r = _canon_texte(libelle)
    return "INSCRIPTION" in r or "ANNEXE" in r


def est_tranche_scolarite_septembre(libelle) -> bool:
    """Vrai pour la tranche de scolarité adossée à la position de septembre (1er versement)."""
    r = _canon_texte(libelle)
    if not r or est_ligne_inscription(r):
        return False
    return "SEPT" in r or "1ER VERS" in r or r.startswith("1V")


def filtrer_tranches_grille_septembre(tranches, ecole):
    """Applique le modèle de rentrée de l'établissement à des tranches (libellé, montant).

    Pour une école qui n'encaisse que les frais d'inscription en septembre, la tranche de
    scolarité adossée à cette même échéance est retirée. Renvoie le couple
    (tranches conservées, montant retiré) pour que le dû total suive.
    """
    tranches = list(tranches or [])
    if get_modele_septembre(ecole) != MODELE_SEPTEMBRE_INSCRIPTION_SEULE:
        return tranches, 0.0
    # Sans ligne d'inscription distincte, la tranche de septembre EST l'inscription :
    # la retirer supprimerait les frais de rentrée eux-mêmes.
    if not any(est_ligne_inscription(nom) for nom, _ in tranches):
        return tranches, 0.0

    retire = sum(m for nom, m in tranches if est_tranche_scolarite_septembre(nom))
    gardees = [(nom, m) for nom, m in tranches if not est_tranche_scolarite_septembre(nom)]
    return gardees, float(retire)


def generate_receipt_number(paiement_id: int, dt: Optional[datetime] = None) -> str:
    # Basé sur l'id auto-incrémenté du paiement (garanti unique par la BD elle-même) :
    # aucune possibilité de collision, même avec des encaissements simultanés.
    target_dt = dt or now_abidjan()
    today_str = target_dt.strftime("%Y%m%d")
    return f"REC-{today_str}-{paiement_id:06d}"

@router.post("/encaissement")
def process_caisse_encaissement(
    data: EncaissementCaisseRequest,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    try:
        clean_eleve_id = int(str(data.eleve_id).split(":")[0].strip())
    except Exception:
        raise HTTPException(status_code=400, detail=f"ID élève invalide: {data.eleve_id}")

    student = db.query(models.Eleve).filter(models.Eleve.id == clean_eleve_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Élève non trouvé")

    if not scope.is_global and scope.code_etablissement:
        if student.ET_CODEETABLISSEMENT and student.ET_CODEETABLISSEMENT != scope.code_etablissement:
            raise HTTPException(status_code=403, detail="Accès refusé à cet élève d'un autre établissement")

    if data.montant <= 0:
        raise HTTPException(status_code=400, detail="Le montant doit être supérieur à zero")

    montant_dec = Decimal(str(data.montant))

    # If motif is quitte / quittus, perform check
    if data.motif == "quitte":
        echeances_dues = db.query(models.EcheancierPaiement).filter(
            models.EcheancierPaiement.eleve_id == student.id,
            models.EcheancierPaiement.service_type == "scolarite",
            models.EcheancierPaiement.statut.in_(["non_paye", "partiel", "en_retard"])
        ).all()
        solde_du = sum((e.montant_prevu - e.montant_paye for e in echeances_dues), Decimal("0.00"))
        if solde_du > 0 and not data.observation:
            data.observation = f"Encaissement Quittus/Quitte avec solde scolarité restant de {float(solde_du):,.0f} FCFA."

    # Les impayés ne bloquent/redirigent plus rien ici : c'est le processus d'inscription qui
    # bloque en amont si l'élève a des impayés. Au Guichet Caisse, chaque motif de paiement est
    # traité indépendamment, uniquement en fonction de ce qui reste dû sur SES propres tranches
    # d'échéancier (service_type correspondant) — jamais réaffecté à la scolarité.
    unpaid_tuition_tranches = db.query(models.EcheancierPaiement).filter(
        models.EcheancierPaiement.eleve_id == student.id,
        models.EcheancierPaiement.service_type == "scolarite",
        models.EcheancierPaiement.statut.in_(["non_paye", "partiel", "en_retard"])
    ).order_by(models.EcheancierPaiement.date_echeance.asc()).all()

    op_dt = parse_client_date_abidjan(data.date_operation)
    today_dt = op_dt.date()

    # Process tuition payment allocation to specified or active tranches if motif is 'scolarite'
    updated_echeances = []
    allocations = []  # trace précise des tranches créditées par CE paiement (pour une annulation exacte)
    if data.motif in ("frais_annexe", "frais_inscription"):
        # ── GESTION DES ÉCHÉANCIERS ET FRAIS D'INSCRIPTION / ANNEXES ──
        # Les composantes créditent la tranche "1er versement" (ou la 1ère tranche disponible de l'échéancier).
        premier_versement = db.query(models.EcheancierPaiement).filter(
            models.EcheancierPaiement.eleve_id == student.id,
            models.EcheancierPaiement.libelle.ilike("1er vers%")
        ).order_by(models.EcheancierPaiement.id.asc()).first()

        if not premier_versement:
            # Recherche de la première tranche non payée ou de la tranche 1
            premier_versement = db.query(models.EcheancierPaiement).filter(
                models.EcheancierPaiement.eleve_id == student.id
            ).order_by(models.EcheancierPaiement.tranche_numero.asc(), models.EcheancierPaiement.id.asc()).first()

        frais_annexe_deja_regle = db.query(models.Paiement).filter(
            models.Paiement.eleve_id == student.id,
            models.Paiement.type == "frais_annexe",
            models.Paiement.statut != "annule"
        ).first()

        if data.motif == "frais_annexe":
            if montant_dec <= 0:
                # Exonération ou frais annexes fixés à 0 F CFA pour ce niveau
                return {
                    "success": True,
                    "idempotent": True,
                    "message": f"Frais annexes à 0 FCFA pour {student.nom} {student.prenom} (Inclus / Exonéré pour ce niveau).",
                    "numero_recu": "EXO-0FCFA",
                    "paiement_id": None,
                    "date_encaissement": op_dt.isoformat(),
                    "eleve": {
                        "id": student.id,
                        "matricule": student.matricule,
                        "nom": student.nom,
                        "prenom": student.prenom,
                        "classe_id": student.classe_id,
                    },
                    "details_recu": {
                        "numero_recu": "EXO-0FCFA",
                        "montant": 0.0,
                        "motif": "frais_annexe",
                        "mode": data.mode or "especes",
                        "numero_transaction": "N/A",
                        "caissier": data.caissier_nom or "Service Caisse Hînneh",
                        "annee_scolaire": data.annee_scolaire
                    },
                    "tranches_maj": []
                }

            if frais_annexe_deja_regle:
                # IDEMPOTENCE STRICTE : si déjà payé, renvoyer le paiement existant sans doublon
                classe_obj = db.query(models.Classe).filter(models.Classe.id == student.classe_id).first() if student.classe_id else None
                classe_libelle = classe_obj.CE_LIBELLE if classe_obj else (student.AU_CLASSEPRECEDENTE or "")
                return {
                    "success": True,
                    "idempotent": True,
                    "message": f"Les frais annexes ont déjà été réglés pour {student.nom} {student.prenom} (Reçu {frais_annexe_deja_regle.numero_recu}).",
                    "numero_recu": frais_annexe_deja_regle.numero_recu,
                    "paiement_id": frais_annexe_deja_regle.id,
                    "date_encaissement": frais_annexe_deja_regle.date.isoformat() if frais_annexe_deja_regle.date else op_dt.isoformat(),
                    "eleve": {
                        "id": student.id,
                        "matricule": student.matricule,
                        "nom": student.nom,
                        "prenom": student.prenom,
                        "classe_id": student.classe_id,
                        "className": classe_libelle,
                    },
                    "details_recu": {
                        "numero_recu": frais_annexe_deja_regle.numero_recu,
                        "montant": float(frais_annexe_deja_regle.montant),
                        "motif": "frais_annexe",
                        "mode": frais_annexe_deja_regle.mode,
                        "numero_transaction": frais_annexe_deja_regle.numero_transaction or "N/A",
                        "caissier": data.caissier_nom or "Service Caisse Hînneh",
                        "annee_scolaire": data.annee_scolaire
                    },
                    "tranches_maj": []
                }

        # Allocation du versement sur les tranches de scolarité de l'échéancier
        tuition_tranches = db.query(models.EcheancierPaiement).filter(
            models.EcheancierPaiement.eleve_id == student.id,
            models.EcheancierPaiement.service_type == "scolarite",
            models.EcheancierPaiement.statut.in_(["non_paye", "partiel", "en_retard"])
        ).order_by(models.EcheancierPaiement.tranche_numero.asc(), models.EcheancierPaiement.date_echeance.asc()).all()

        if not tuition_tranches and premier_versement:
            tuition_tranches = [premier_versement]

        reste_a_allouer = montant_dec
        for tr in tuition_tranches:
            if reste_a_allouer <= 0:
                break
            due = max(Decimal("0.00"), tr.montant_prevu - tr.montant_paye)
            if due <= 0:
                continue
            alloc = min(due, reste_a_allouer)
            tr.montant_paye += alloc
            tr.date_dernier_versement = op_dt
            tr.statut = "paye" if tr.montant_paye >= tr.montant_prevu else "partiel"
            allocations.append({"echeance_id": tr.id, "montant": float(alloc)})
            if tr not in updated_echeances:
                updated_echeances.append(tr)
            reste_a_allouer -= alloc

        if reste_a_allouer > 0 and tuition_tranches:
            last_tr = tuition_tranches[-1]
            last_tr.montant_paye += reste_a_allouer
            last_tr.date_dernier_versement = op_dt
            last_tr.statut = "paye"
            allocations.append({"echeance_id": last_tr.id, "montant": float(reste_a_allouer)})
            if last_tr not in updated_echeances:
                updated_echeances.append(last_tr)
    elif data.motif in MOTIF_SERVICE_TYPE_MAP or data.motif in ("scolarite", "frais_inscription", "frais_annexe", "inscription", "reinscription"):
        service_type = MOTIF_SERVICE_TYPE_MAP.get(data.motif, "scolarite")

        # Pour la scolarité : s'assurer que l'élève dispose bien de ses tranches officielles en base
        if service_type == "scolarite":
            existing_scol = db.query(models.EcheancierPaiement).filter(
                models.EcheancierPaiement.eleve_id == student.id,
                models.EcheancierPaiement.service_type == "scolarite",
            ).first()

            if not existing_scol:
                from .echeancier import _realign_students_on_grille

                _realign_students_on_grille(
                    [student], db, data.annee_scolaire or "2026-2027", force_realign_all=False
                )
                db.commit()

        if service_type in ("cantine", "transport"):
            monthly_unit = None
            if montant_dec <= 40000:
                monthly_unit = montant_dec
            elif montant_dec % 3 == 0 and (montant_dec // 3) <= 40000:
                monthly_unit = Decimal(str(montant_dec // 3))
            elif montant_dec % 9 == 0 and (montant_dec // 9) <= 40000:
                monthly_unit = Decimal(str(montant_dec // 9))
            else:
                monthly_unit = Decimal(str(get_service_tarif_for_student(db, student, service_type)))

            # 1. Vérifier les tranches existantes pour ce service
            all_service_tranches = db.query(models.EcheancierPaiement).filter(
                models.EcheancierPaiement.eleve_id == student.id,
                models.EcheancierPaiement.service_type == service_type,
            ).order_by(models.EcheancierPaiement.date_echeance.asc()).all()

            if not all_service_tranches:
                prefix = "Cantine" if service_type == "cantine" else "Transport"
                for idx, (mois, annee, num_mois) in enumerate(SERVICE_MONTHLY_SCHEDULE, start=1):
                    new_ech = models.EcheancierPaiement(
                        eleve_id=student.id,
                        ecole_id=student.ecole_id,
                        ET_CODEETABLISSEMENT=student.ET_CODEETABLISSEMENT,
                        libelle=f"{prefix} - {mois}",
                        service_type=service_type,
                        tranche_numero=idx,
                        montant_prevu=monthly_unit,
                        montant_paye=Decimal("0.00"),
                        date_echeance=date(annee, num_mois, 5),
                        statut="non_paye",
                        annee_scolaire=data.annee_scolaire or "2026-2027",
                    )
                    db.add(new_ech)
                    all_service_tranches.append(new_ech)
                db.flush()

            # 2. Réaligner TOUTES les tranches non payées ou au tarif antérieur sur le tarif choisi
            for t in all_service_tranches:
                paye = t.montant_paye or Decimal("0.00")
                if paye <= 0:
                    t.montant_prevu = monthly_unit
                    t.statut = "non_paye"
                elif paye >= monthly_unit:
                    t.montant_prevu = paye
                    t.statut = "paye"
                else:
                    t.montant_prevu = monthly_unit
                    t.statut = "partiel"

            # 3. Synchroniser les affectations et le statut de service de l'élève
            if service_type == "transport":
                student.service_transport = True
                aff_trans = db.query(models.AffectationTransport).filter(models.AffectationTransport.eleveId == student.id).first()
                if aff_trans:
                    if hasattr(aff_trans, "tarif"):
                        aff_trans.tarif = float(monthly_unit)
                else:
                    db.add(models.AffectationTransport(
                        eleveId=student.id,
                        vehiculeId=1,
                        arret=getattr(student, "AU_QUARTIER", None) or getattr(student, "quartier", None) or "Arrêt Principal",
                        tarif=float(monthly_unit),
                        matin=True,
                        soir=True,
                        code_etablissement=student.ET_CODEETABLISSEMENT,
                    ))
            elif service_type == "cantine":
                student.service_cantine = True

            if data.echeance_ids and len(data.echeance_ids) > 0:
                target_echeances = [e for e in all_service_tranches if e.id in data.echeance_ids]
            else:
                target_echeances = [e for e in all_service_tranches if e.statut != "paye" and (e.montant_prevu - (e.montant_paye or Decimal("0.00"))) > 0]
        else:
            if data.echeance_ids and len(data.echeance_ids) > 0:
                target_echeances = db.query(models.EcheancierPaiement).filter(
                    models.EcheancierPaiement.id.in_(data.echeance_ids),
                    models.EcheancierPaiement.eleve_id == student.id,
                ).order_by(models.EcheancierPaiement.tranche_numero.asc()).all()
            else:
                target_echeances = db.query(models.EcheancierPaiement).filter(
                    models.EcheancierPaiement.eleve_id == student.id,
                    models.EcheancierPaiement.service_type == service_type,
                    models.EcheancierPaiement.statut.in_(["non_paye", "partiel", "en_retard"]),
                ).order_by(models.EcheancierPaiement.date_echeance.asc()).all()

        if not target_echeances and data.motif not in ("scolarite", "frais_annexe", "frais_inscription"):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Aucune tranche d'échéancier planifiée pour '{data.motif}' n'existe pour cet élève. "
                    "Créez-la d'abord dans l'onglet Échéancier avant d'encaisser."
                )
            )

        solde_disponible = sum((e.montant_prevu - e.montant_paye for e in target_echeances), Decimal("0.00"))
        if montant_dec > solde_disponible and data.motif != "scolarite":
            if not target_echeances:
                raise HTTPException(
                    status_code=400,
                    detail=f"Le montant saisi ({float(montant_dec):,.0f} FCFA) dépasse le solde prévu pour '{data.motif}' ({float(solde_disponible):,.0f} FCFA)."
                )

        remains_to_allocate = montant_dec
        for ech in target_echeances:
            if remains_to_allocate <= 0:
                break
            due_amount = ech.montant_prevu - ech.montant_paye
            if due_amount <= 0:
                continue

            part = min(remains_to_allocate, due_amount)
            ech.montant_paye += part
            ech.date_dernier_versement = op_dt
            remains_to_allocate -= part
            allocations.append({"echeance_id": ech.id, "montant": float(part)})

            ech.statut = "paye" if ech.montant_paye >= ech.montant_prevu else "partiel"
            updated_echeances.append(ech)

        # Si surplus après avoir soldé toutes les tranches ciblées : pour un service mensuel
        # (cantine/transport), refuser plutôt que de le déverser en bloc sur une seule tranche
        # — cela gonflerait artificiellement son montant (ex: "177 000 F" affiché pour un seul
        # mois de cantine alors que le tarif mensuel réel est de 15 000 F). Un versement doit
        # solder des mois entiers, jamais déborder en silence (cf. MONTHLY_SERVICES ci-dessus).
        if remains_to_allocate > 0 and target_echeances:
            if service_type in MONTHLY_SERVICES:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Le montant saisi ({float(montant_dec):,.0f} FCFA) dépasse de "
                        f"{float(remains_to_allocate):,.0f} FCFA ce qui est dû pour '{data.motif}' "
                        "sur les mois sélectionnés. Corrigez le montant ou sélectionnez d'autres échéances."
                    )
                )
            last_ech = target_echeances[-1]
            last_ech.montant_paye += remains_to_allocate
            last_ech.date_dernier_versement = op_dt
            last_ech.statut = "paye"
            allocations.append({"echeance_id": last_ech.id, "montant": float(remains_to_allocate)})
            if last_ech not in updated_echeances:
                updated_echeances.append(last_ech)

    elif data.motif in ("pack_global", "forfait_global", "tout_compris", "pack_scolarite_services"):
        # ── Paiement Global / Forfait Tout Compris (Scolarité + Cantine + Transport) ──
        if data.echeance_ids and len(data.echeance_ids) > 0:
            target_echeances = db.query(models.EcheancierPaiement).filter(
                models.EcheancierPaiement.id.in_(data.echeance_ids),
                models.EcheancierPaiement.eleve_id == student.id,
            ).order_by(
                case(
                    (models.EcheancierPaiement.service_type == "scolarite", 1),
                    (models.EcheancierPaiement.service_type == "cantine", 2),
                    (models.EcheancierPaiement.service_type == "transport", 3),
                    else_=4
                ),
                models.EcheancierPaiement.tranche_numero.asc(),
                models.EcheancierPaiement.date_echeance.asc()
            ).all()
        else:
            # 1. S'assurer que les tranches cantine existent
            all_cantine = db.query(models.EcheancierPaiement).filter(
                models.EcheancierPaiement.eleve_id == student.id,
                models.EcheancierPaiement.service_type == "cantine",
            ).all()
            if not all_cantine:
                unit_cantine = Decimal(str(get_service_tarif_for_student(db, student, "cantine")))
                for idx, (mois, annee, num_mois) in enumerate(SERVICE_MONTHLY_SCHEDULE, start=1):
                    db.add(models.EcheancierPaiement(
                        eleve_id=student.id,
                        ecole_id=student.ecole_id,
                        libelle=f"Cantine - {mois}",
                        service_type="cantine",
                        tranche_numero=idx,
                        montant_prevu=unit_cantine,
                        montant_paye=Decimal("0.00"),
                        date_echeance=date(annee, num_mois, 5),
                        statut="non_paye",
                        annee_scolaire=data.annee_scolaire or "2026-2027",
                    ))
                student.service_cantine = True

            # 2. S'assurer que les tranches transport existent
            all_trans = db.query(models.EcheancierPaiement).filter(
                models.EcheancierPaiement.eleve_id == student.id,
                models.EcheancierPaiement.service_type == "transport",
            ).all()
            if not all_trans:
                unit_trans = Decimal(str(get_service_tarif_for_student(db, student, "transport")))
                for idx, (mois, annee, num_mois) in enumerate(SERVICE_MONTHLY_SCHEDULE, start=1):
                    db.add(models.EcheancierPaiement(
                        eleve_id=student.id,
                        ecole_id=student.ecole_id,
                        libelle=f"Transport - {mois}",
                        service_type="transport",
                        tranche_numero=idx,
                        montant_prevu=unit_trans,
                        montant_paye=Decimal("0.00"),
                        date_echeance=date(annee, num_mois, 5),
                        statut="non_paye",
                        annee_scolaire=data.annee_scolaire or "2026-2027",
                    ))
                student.service_transport = True
            db.commit()

            # Récupérer toutes les tranches impayées (scolarité, cantine, transport)
            target_echeances = db.query(models.EcheancierPaiement).filter(
                models.EcheancierPaiement.eleve_id == student.id,
                models.EcheancierPaiement.statut.in_(["non_paye", "partiel", "en_retard"]),
            ).order_by(
                case(
                    (models.EcheancierPaiement.service_type == "scolarite", 1),
                    (models.EcheancierPaiement.service_type == "cantine", 2),
                    (models.EcheancierPaiement.service_type == "transport", 3),
                    else_=4
                ),
                models.EcheancierPaiement.tranche_numero.asc(),
                models.EcheancierPaiement.date_echeance.asc()
            ).all()

        remains_to_allocate = montant_dec
        for ech in target_echeances:
            if remains_to_allocate <= 0:
                break
            due_amount = ech.montant_prevu - ech.montant_paye
            if due_amount <= 0:
                continue

            part = min(remains_to_allocate, due_amount)
            ech.montant_paye += part
            ech.date_dernier_versement = op_dt
            remains_to_allocate -= part
            allocations.append({"echeance_id": ech.id, "montant": float(part), "service_type": ech.service_type, "rubrique": ech.libelle})

            ech.statut = "paye" if ech.montant_paye >= ech.montant_prevu else "partiel"
            updated_echeances.append(ech)

        if remains_to_allocate > 0 and target_echeances:
            last_ech = target_echeances[-1]
            # Même garde-fou que pour un motif cantine/transport dédié : ne jamais déverser
            # un surplus sur une seule tranche mensuelle (voir commentaire équivalent plus haut).
            if (last_ech.service_type or "").strip().lower() in MONTHLY_SERVICES:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Le montant saisi ({float(montant_dec):,.0f} FCFA) dépasse de "
                        f"{float(remains_to_allocate):,.0f} FCFA le total dû sur les échéances "
                        "sélectionnées. Corrigez le montant ou sélectionnez d'autres échéances."
                    )
                )
            last_ech.montant_paye += remains_to_allocate
            last_ech.date_dernier_versement = op_dt
            last_ech.statut = "paye"
            allocations.append({"echeance_id": last_ech.id, "montant": float(remains_to_allocate), "service_type": last_ech.service_type, "rubrique": last_ech.libelle})
            if last_ech not in updated_echeances:
                updated_echeances.append(last_ech)

    elif data.motif != "quitte":
        # ── Achats et prestations réglés au comptant ────────────────────────────
        # Kits scolaires, tenues, polos, fournitures, cours d'appoint, frais divers,
        # inscription, « autre »… Ces motifs ne s'adossent à aucune tranche d'échéancier :
        # ils sont facturés à l'acte, au moment de l'achat. Exiger une tranche planifiée
        # rendait leur encaissement impossible (« Aucune tranche d'échéancier planifiée
        # pour 'uniforme' »), alors qu'il n'y a précisément rien à planifier.
        #
        # On accepte donc tout motif non vide plutôt que de le confronter à une liste
        # figée : la liste des frais divers est configurable côté application, et un
        # nouvel article ne doit pas être refusé par le backend au motif qu'il est
        # inconnu d'une constante écrite ici.
        if not (data.motif or "").strip():
            raise HTTPException(status_code=400, detail="Le motif de paiement est obligatoire.")

        if data.motif == "examen":
            # Seule exception : le droit d'examen est un montant annuel, réglé une fois.
            deja_regle = db.query(models.Paiement).filter(
                models.Paiement.eleve_id == student.id,
                models.Paiement.type == data.motif,
                models.Paiement.statut != "annule",
            ).first()
            if deja_regle:
                raise HTTPException(
                    status_code=400,
                    detail=f"Les frais d'examen ont déjà été réglés pour cet élève (reçu {deja_regle.numero_recu}). Ce montant annuel se paie une seule fois."
                )

    # Validation stricte des transactions Mobile Money et Coris Bank
    mode_clean = (data.mode or "").lower().strip()
    is_mobile_or_bank = mode_clean in (
        "mobile_money", "mtn_money", "orange_money", "moov_money", "wave", "coris_bank", "coris", "virement", "cheque"
    )
    tx_num = (data.numero_transaction or "").strip()

    if is_mobile_or_bank and mode_clean in ("mobile_money", "mtn_money", "orange_money", "moov_money", "wave", "coris_bank", "coris"):
        if not tx_num:
            raise HTTPException(
                status_code=400,
                detail="L'identifiant de transaction (référence Mobile Money ou bordereau Coris Bank) est obligatoire pour ce mode de règlement."
            )

    if tx_num:
        # Vérifier si cet ID de transaction existe déjà dans le système pour un paiement actif
        existing_tx = db.query(models.Paiement).join(models.Eleve, models.Paiement.eleve_id == models.Eleve.id).filter(
            func.lower(func.trim(models.Paiement.numero_transaction)) == tx_num.lower(),
            models.Paiement.statut != "annule"
        ).first()

        if existing_tx:
            other_student = existing_tx.eleve
            student_fullname = f"{other_student.prenom or ''} {other_student.nom or ''}".strip() or "Élève inconnu"
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "TRANSACTION_ID_DUPLICATE",
                    "message": f"Cet identifiant de transaction '{tx_num}' est déjà rattaché à l'élève {student_fullname} (Matricule: {other_student.matricule or 'N/A'}, Reçu: {existing_tx.numero_recu or 'N/A'}). Les transactions Mobile Money et Coris sont uniques et ne peuvent pas être réutilisées.",
                    "paiement": {
                        "id": existing_tx.id,
                        "numero_recu": existing_tx.numero_recu,
                        "numero_transaction": existing_tx.numero_transaction,
                        "montant": float(existing_tx.montant or 0),
                        "mode": existing_tx.mode,
                        "date": existing_tx.date.isoformat() if existing_tx.date else "",
                        "eleve_id": existing_tx.eleve_id,
                        "eleve_nom": student_fullname,
                        "matricule": other_student.matricule,
                        "classe": other_student.AU_CLASSEPRECEDENTE or (other_student.classe.CE_LIBELLE if getattr(other_student, "classe", None) else "N/A"),
                        "ecole_code": existing_tx.ET_CODEETABLISSEMENT or other_student.ET_CODEETABLISSEMENT
                    }
                }
            )

    # Create Payment record
    type_paiement = "transport" if data.motif in ("transport", "car") else ("pack_global" if data.motif in ("pack_global", "forfait_global", "tout_compris", "pack_scolarite_services") else data.motif)
    code_etab = student.ET_CODEETABLISSEMENT or scope.code_etablissement
    paiement = models.Paiement(
        montant=montant_dec,
        type=type_paiement,
        mode=data.mode,
        statut="paye",
        date=op_dt,
        date_echeance=today_dt,
        eleve_id=student.id,
        numero_transaction=data.numero_transaction,
        echeances_affectees=json.dumps(allocations) if allocations else None,
        ET_CODEETABLISSEMENT=code_etab
    )
    db.add(paiement)
    db.flush()  # attribue l'id auto-incrémenté sans encore valider la transaction
    numero_recu = generate_receipt_number(paiement.id, op_dt)
    paiement.numero_recu = numero_recu

    # Update Student Account Balance strictly for tuition / registration payments
    if type_paiement in ("scolarite", "frais_inscription", "frais_annexe", "inscription", "reinscription", "pack_global", "forfait_global", "tout_compris"):
        total_scol_paye = db.query(func.coalesce(func.sum(models.EcheancierPaiement.montant_paye), Decimal("0.00"))).filter(
            models.EcheancierPaiement.eleve_id == student.id,
            models.EcheancierPaiement.service_type == "scolarite",
        ).scalar() or Decimal("0.00")
        if total_scol_paye > 0:
            student.AU_TOTALDEPOT = Decimal(str(total_scol_paye))
            student.AU_SOLDECOMPTE = max(Decimal("0.00"), (student.AU_SCOLARITE or Decimal("0.00")) - student.AU_TOTALDEPOT)
            if hasattr(student, "solde"):
                student.solde = student.AU_SOLDECOMPTE

    db.commit()

    log_audit(
        db,
        action="ENCAISSEMENT_CAISSE",
        module="CAISSE_PAIEMENTS",
        detail=f"Encaissement de {data.montant:,.0f} FCFA ({data.motif}, mode: {data.mode}) — Reçu N° {numero_recu}",
        user=scope.user,
        username=data.caissier_nom or scope.username,
        role=scope.role,
        ecole_id=student.ecole_id,
        code_etablissement=student.ET_CODEETABLISSEMENT,
        ville=getattr(student, "ville", None) or scope.ville,
        target_id=str(paiement.id),
        target_name=f"Élève: {student.nom} {student.prenom} ({student.matricule or 'Sans matricule'})",
        statut="SUCCES"
    )

    classe_obj = db.query(models.Classe).filter(models.Classe.id == student.classe_id).first() if student.classe_id else None
    classe_libelle = classe_obj.CE_LIBELLE if classe_obj else (student.AU_CLASSEPRECEDENTE or "")
    cls_str = (classe_libelle or "").lower()
    cycle_str = str(getattr(classe_obj, "CY_LIBELLECYCLE", "") or "").lower()
    is_mat_or_prim = any(k in cls_str for k in ["mat", "ps", "ms", "gs", "cp", "ce", "cm", "prim"]) or ("mat" in cycle_str or "prim" in cycle_str)

    # Calcul des ventilations et synthèses financières à jour pour cet élève
    all_student_payments = db.query(models.Paiement).filter(
        models.Paiement.eleve_id == student.id,
        models.Paiement.statut == "paye"
    ).all()

    tot_scol = Decimal("0.00")
    tot_cant = Decimal("0.00")
    tot_trans = Decimal("0.00")
    tot_kits = Decimal("0.00")
    tot_exam = Decimal("0.00")
    tot_divers = Decimal("0.00")

    for p in all_student_payments:
        pm = Decimal(str(p.montant or 0))
        pt = (p.type or "").lower().strip()
        if "cantine" in pt:
            tot_cant += pm
        elif "transport" in pt or "car" in pt:
            tot_trans += pm
        elif "kit" in pt or "fourniture" in pt or "uniforme" in pt or "tenue" in pt:
            tot_kits += pm
        elif "examen" in pt or "bepc" in pt or "bac" in pt or "cepe" in pt:
            tot_exam += pm
        elif "anglais" in pt or "informatique" in pt or "divers" in pt:
            tot_divers += pm
        else:
            tot_scol += pm

    all_student_echeances = db.query(models.EcheancierPaiement).filter(
        models.EcheancierPaiement.eleve_id == student.id
    ).order_by(models.EcheancierPaiement.date_echeance.asc()).all()

    echeances_list = [
        {
            "id": ech.id,
            "rubric": ech.libelle,
            "amount": float(ech.montant_prevu or 0),
            "paid": float(ech.montant_paye or 0),
            "rest": max(0.0, float(ech.montant_prevu or 0) - float(ech.montant_paye or 0)),
            "service_type": ech.service_type or "scolarite",
            "statut": ech.statut,
        }
        for ech in all_student_echeances
    ]

    return {
        "success": True,
        "message": f"Encaissement de {data.montant:,.0f} FCFA effectué avec succès pour {student.nom} {student.prenom}.",
        "numero_recu": numero_recu,
        "paiement_id": paiement.id,
        "date_encaissement": op_dt.isoformat(),
        "eleve": {
            "id": student.id,
            "matricule": student.matricule,
            "nom": student.nom,
            "prenom": student.prenom,
            "classe_id": student.classe_id,
            "className": classe_libelle,
            "level": classe_libelle,
            "niveau": classe_libelle,
            "AU_CLASSEPRECEDENTE": student.AU_CLASSEPRECEDENTE or "",
            "statut_orientation": "Scolarité Réelle" if is_mat_or_prim else (getattr(student, 'statut_orientation', None) or getattr(student, 'statutOrientation', None) or getattr(student, 'statutAffecte', None) or "Affecté par l'État"),
            "statutOrientation": "Scolarité Réelle" if is_mat_or_prim else (getattr(student, 'statut_orientation', None) or getattr(student, 'statutOrientation', None) or getattr(student, 'statutAffecte', None) or "Affecté par l'État"),
            "prise_en_charge": bool(getattr(student, 'prise_en_charge', False) or getattr(student, 'priseEnCharge', False) or getattr(student, 'ETAT_BOURSE', False)),
            "priseEnCharge": bool(getattr(student, 'prise_en_charge', False) or getattr(student, 'priseEnCharge', False) or getattr(student, 'ETAT_BOURSE', False)),
            "photo": student.photo,
            "solde_restant": float(student.AU_SOLDECOMPTE or 0),
            "service_cantine": bool(getattr(student, "service_cantine", False) or getattr(student, "cantine", False)),
            "service_transport": bool(getattr(student, "service_transport", False) or getattr(student, "transport", False))
        },
        "details_recu": {
            "numero_recu": numero_recu,
            "paiement_id": paiement.id,
            "montant": float(montant_dec),
            "motif": data.motif,
            "mode": data.mode,
            "numero_transaction": data.numero_transaction or "N/A",
            "caissier": data.caissier_nom or "Service Caisse Hînneh",
            "annee_scolaire": data.annee_scolaire,
            "date_creation": op_dt.isoformat()
        },
        "ventilations": {
            "scolarite": {"subtotal": float(tot_scol)},
            "cantine": {"subtotal": float(tot_cant)},
            "transport": {"subtotal": float(tot_trans)},
            "kits": {"subtotal": float(tot_kits)},
            "examen": {"subtotal": float(tot_exam)},
            "frais_divers": {"subtotal": float(tot_divers)},
        },
        "synthese_financiere": {
            "total_verse": float(tot_scol + tot_cant + tot_trans + tot_kits + tot_exam + tot_divers),
            "scolarite_paye": float(tot_scol),
            "cantine_paye": float(tot_cant),
            "transport_paye": float(tot_trans),
        },
        "echeances": echeances_list,
        "tranches_maj": [
            {
                "id": e.id,
                "libelle": e.libelle,
                "montant_paye": float(e.montant_paye),
                "statut": e.statut
            } for e in updated_echeances
        ]
    }

@router.get("/journal")
def get_journal_caisse(
    date_journal: Optional[str] = Query(None),
    date_debut: Optional[str] = Query(None),
    date_fin: Optional[str] = Query(None),
    motif: Optional[str] = Query(None),
    mode: Optional[str] = Query(None),
    statut: Optional[str] = Query(None),
    classe_id: Optional[Union[int, str]] = Query(None),
    search: Optional[str] = Query(None),
    all_dates: Optional[bool] = Query(False),
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    query = db.query(models.Paiement)
    has_eleve_join = False

    start_date = None
    end_date = None

    if not all_dates:
        if date_debut and date_fin:
            try:
                start_date = datetime.strptime(date_debut, "%Y-%m-%d").date()
                end_date = datetime.strptime(date_fin, "%Y-%m-%d").date()
            except Exception:
                start_date = today_abidjan()
                end_date = today_abidjan()
            start_dt = datetime.combine(start_date, datetime.min.time())
            end_dt = datetime.combine(end_date, datetime.max.time())
            target_date_str = f"{start_date.strftime('%Y-%m-%d')} au {end_date.strftime('%Y-%m-%d')}"
        elif date_journal:
            try:
                target_date = datetime.strptime(date_journal, "%Y-%m-%d").date()
            except Exception:
                target_date = today_abidjan()
            start_date = target_date
            end_date = target_date
            start_dt = datetime.combine(target_date, datetime.min.time())
            end_dt = datetime.combine(target_date, datetime.max.time())
            target_date_str = target_date.strftime("%Y-%m-%d")
        else:
            target_date = today_abidjan()
            start_date = target_date
            end_date = target_date
            start_dt = datetime.combine(target_date, datetime.min.time())
            end_dt = datetime.combine(target_date, datetime.max.time())
            target_date_str = target_date.strftime("%Y-%m-%d")

        query = query.filter(
            models.Paiement.date >= start_dt,
            models.Paiement.date <= end_dt
        )
    else:
        target_date_str = "Toutes les dates"

    # Filtre par statut
    if statut and statut.lower() not in ("all", "tous", "total", ""):
        statut_clean = statut.lower().strip()
        if statut_clean in ("paye", "valide"):
            query = query.filter(models.Paiement.statut.in_(["paye", "valide"]))
        elif statut_clean in ("annule", "cancelled"):
            query = query.filter(models.Paiement.statut == "annule")
        elif statut_clean in ("en_attente", "pending"):
            query = query.filter(models.Paiement.statut == "en_attente")
        else:
            query = query.filter(models.Paiement.statut == statut)

    # Filtre par motif
    if motif and motif.lower() not in ("all", "tous", "total", ""):
        if motif == "transport":
            query = query.filter(models.Paiement.type.in_(["transport", "car"]))
        elif motif == "inscription":
            query = query.filter(models.Paiement.type.in_(["inscription", "reinscription", "frais_inscription"]))
        else:
            query = query.filter(models.Paiement.type == motif)

    # Filtre par mode de paiement
    if mode and mode.lower() not in ("all", "tous", ""):
        mode_clean = mode.lower().strip()
        if mode_clean == "especes":
            query = query.filter(models.Paiement.mode == "especes")
        elif mode_clean in ["coris_bank", "coris", "corisbank"]:
            query = query.filter(models.Paiement.mode.in_(["coris_bank", "coris", "corisbank"]))
        elif mode_clean in ["mobile_money", "wave", "mtn_money", "orange_money", "moov_money", "mobile"]:
            query = query.filter(models.Paiement.mode.in_(["mobile_money", "wave", "mtn_money", "orange_money", "moov_money"]))
        elif mode_clean in ["cheque", "virement", "banque"]:
            query = query.filter(models.Paiement.mode.in_(["cheque", "virement", "banque"]))
        elif mode_clean == "carte":
            query = query.filter(models.Paiement.mode.in_(["carte", "cb", "visa", "mastercard"]))
        else:
            query = query.filter(models.Paiement.mode == mode)

    # Filtre par classe
    if classe_id is not None and str(classe_id).lower() not in ("all", "tous", "0", ""):
        try:
            c_id = int(classe_id)
            if not has_eleve_join:
                query = query.join(models.Eleve, models.Paiement.eleve_id == models.Eleve.id)
                has_eleve_join = True
            query = query.filter(models.Eleve.classe_id == c_id)
        except (ValueError, TypeError):
            pass

    # Filtre recherche textuelle libre (nom, prénom, matricule, n° reçu, n° transaction)
    if search and search.strip():
        term = f"%{search.strip()}%"
        if not has_eleve_join:
            query = query.join(models.Eleve, models.Paiement.eleve_id == models.Eleve.id)
            has_eleve_join = True
        query = query.filter(
            or_(
                models.Paiement.numero_recu.ilike(term),
                models.Paiement.numero_transaction.ilike(term),
                models.Eleve.nom.ilike(term),
                models.Eleve.prenom.ilike(term),
                models.Eleve.matricule.ilike(term)
            )
        )

    # Restriction de périmètre établissement
    if scope.code_etablissement:
        if not has_eleve_join:
            query = query.outerjoin(models.Eleve, models.Paiement.eleve_id == models.Eleve.id)
            has_eleve_join = True
        c_code = scope.code_etablissement.strip().lower()
        query = query.filter(or_(
            func.lower(models.Paiement.ET_CODEETABLISSEMENT) == c_code,
            func.lower(models.Eleve.ET_CODEETABLISSEMENT) == c_code
        ))
    elif scope.ecole_id is not None:
        if not has_eleve_join:
            query = query.outerjoin(models.Eleve, models.Paiement.eleve_id == models.Eleve.id)
            has_eleve_join = True
        query = query.filter(or_(
            models.Paiement.ecole_id == scope.ecole_id,
            models.Eleve.ecole_id == scope.ecole_id
        ))

    paiements = query.order_by(models.Paiement.date.desc()).all()

    # Calcul des totaux sur les paiements valides / payés
    valid_paiements = [p for p in paiements if p.statut in ["paye", "valide"]]
    total_general = sum((p.montant for p in valid_paiements), Decimal("0.00"))
    total_especes = sum((p.montant for p in valid_paiements if p.mode == "especes"), Decimal("0.00"))
    total_mobile = sum((p.montant for p in valid_paiements if p.mode in ["mobile_money", "wave", "mtn_money", "orange_money", "moov_money"]), Decimal("0.00"))
    total_coris = sum((p.montant for p in valid_paiements if p.mode in ["coris_bank", "coris", "corisbank"]), Decimal("0.00"))
    total_cheque_virement = sum((p.montant for p in valid_paiements if p.mode in ["cheque", "virement", "banque"]), Decimal("0.00"))

    ventilations = {
        "scolarite": float(sum((p.montant for p in valid_paiements if p.type == "scolarite"), Decimal("0.00"))),
        "inscription": float(sum((p.montant for p in valid_paiements if p.type in ["inscription", "reinscription"]), Decimal("0.00"))),
        "frais_annexe": float(sum((p.montant for p in valid_paiements if p.type == "frais_annexe"), Decimal("0.00"))),
        "frais_inscription": float(sum((p.montant for p in valid_paiements if p.type == "frais_inscription"), Decimal("0.00"))),
        "quitte": float(sum((p.montant for p in valid_paiements if p.type == "quitte"), Decimal("0.00"))),
        "cantine": float(sum((p.montant for p in valid_paiements if p.type == "cantine"), Decimal("0.00"))),
        "transport": float(sum((p.montant for p in valid_paiements if p.type in ["transport", "car"]), Decimal("0.00"))),
        "uniforme": float(sum((p.montant for p in valid_paiements if p.type == "uniforme"), Decimal("0.00"))),
        "examen": float(sum((p.montant for p in valid_paiements if p.type == "examen"), Decimal("0.00"))),
        "autre": float(sum((p.montant for p in valid_paiements if p.type not in ["scolarite", "inscription", "reinscription", "frais_annexe", "frais_inscription", "quitte", "cantine", "transport", "car", "uniforme", "examen"]), Decimal("0.00"))),
    }

    # Pré-chargement en masse des élèves et des classes pour éliminer le problème N+1
    eleve_ids = {p.eleve_id for p in paiements if p.eleve_id}
    eleves_map = {}
    classes_map = {}
    if eleve_ids:
        eleves = db.query(
            models.Eleve.id,
            models.Eleve.prenom,
            models.Eleve.nom,
            models.Eleve.matricule,
            models.Eleve.photo,
            models.Eleve.classe_id,
            models.Eleve.AU_CLASSEPRECEDENTE
        ).filter(models.Eleve.id.in_(eleve_ids)).all()
        eleves_map = {e.id: e for e in eleves}
        
        classe_ids = {e.classe_id for e in eleves if e.classe_id}
        if classe_ids:
            classes_db = db.query(models.Classe.id, models.Classe.CE_LIBELLE).filter(models.Classe.id.in_(classe_ids)).all()
            classes_map = {c.id: c.CE_LIBELLE for c in classes_db}

    # Regrouper les paiements par reçu / élève pour un affichage propre
    grouped_by_student = {}
    for p in paiements:
        st = eleves_map.get(p.eleve_id)
        eleve_nom = f"{st.nom} {st.prenom}" if st else "Inconnu"
        classe_nom = ""
        classe_id_val = None
        if st and st.classe_id:
            classe_nom = classes_map.get(st.classe_id) or st.AU_CLASSEPRECEDENTE or ""
            classe_id_val = st.classe_id
        elif st:
            classe_nom = st.AU_CLASSEPRECEDENTE or ""
            classe_id_val = st.classe_id

        student_key = f"recu_{p.numero_recu}" if p.numero_recu else f"pmt_{p.id}"
        recu_key = p.numero_recu or f"REC-{p.id}"
        
        if student_key not in grouped_by_student:
            grouped_by_student[student_key] = {
                "id": p.id,
                "numero_recu": recu_key,
                "date": p.date.strftime("%d/%m/%Y") if p.date else "",
                "heure": p.date.strftime("%H:%M:%S") if p.date else "",
                "date_complete": p.date.isoformat() if p.date else "",
                "eleve_nom": eleve_nom,
                "eleve_id": p.eleve_id,
                "matricule": st.matricule if st else "N/A",
                "classe": classe_nom,
                "classe_id": classe_id_val,
                "eleve_photo": st.photo if st else None,
                "montant": float(p.montant),
                "type_list": [p.type or "scolarite"],
                "modes": [p.mode] if p.mode else [],
                "mode": p.mode or "especes",
                "statut": p.statut or "paye",
                "numero_transaction": p.numero_transaction or "N/A",
                "sub_items": [{
                    "id": p.id,
                    "numero_recu": recu_key,
                    "montant": float(p.montant),
                    "type": p.type or "scolarite",
                    "mode": p.mode,
                    "statut": p.statut or "paye",
                    "date": p.date.strftime("%d/%m/%Y") if p.date else "",
                    "heure": p.date.strftime("%H:%M:%S") if p.date else "",
                    "date_complete": p.date.isoformat() if p.date else ""
                }]
            }
        else:
            grp = grouped_by_student[student_key]
            grp["montant"] += float(p.montant)
            grp["id"] = p.id
            grp["numero_recu"] = recu_key
            grp["date"] = p.date.strftime("%d/%m/%Y") if p.date else grp["date"]
            grp["heure"] = p.date.strftime("%H:%M:%S") if p.date else grp.get("heure", "")
            grp["date_complete"] = p.date.isoformat() if p.date else grp.get("date_complete", "")
            if p.mode and p.mode not in grp["modes"]:
                grp["modes"].append(p.mode)
            if p.type and p.type not in grp["type_list"]:
                grp["type_list"].append(p.type)
            grp["sub_items"].append({
                "id": p.id,
                "numero_recu": recu_key,
                "montant": float(p.montant),
                "type": p.type or "scolarite",
                "mode": p.mode,
                "statut": p.statut or "paye",
                "date": p.date.strftime("%d/%m/%Y") if p.date else "",
                "heure": p.date.strftime("%H:%M:%S") if p.date else "",
                "date_complete": p.date.isoformat() if p.date else ""
            })

    journal_items = []
    for grp in grouped_by_student.values():
        types_str = " & ".join([t.capitalize() for t in grp["type_list"]])
        modes_str = " / ".join(grp["modes"]) if grp.get("modes") else grp.get("mode", "especes")
        journal_items.append({
            "id": grp["id"],
            "numero_recu": grp["numero_recu"],
            "date": grp["date"],
            "heure": grp.get("heure", ""),
            "date_complete": grp.get("date_complete", ""),
            "eleve_nom": grp["eleve_nom"],
            "eleve_id": grp["eleve_id"],
            "matricule": grp["matricule"],
            "classe": grp.get("classe", ""),
            "classe_id": grp.get("classe_id", None),
            "eleve_photo": grp["eleve_photo"],
            "montant": float(grp["montant"]),
            "type": types_str,
            "mode": modes_str,
            "statut": grp.get("statut", "paye"),
            "numero_transaction": grp["numero_transaction"],
            "is_combined": len(grp["sub_items"]) > 1,
            "sub_items": grp["sub_items"]
        })

    # Calcul ULTRA-RAPIDE du Fond de Caisse directement en SQL (GROUP BY)
    fc_query = db.query(
        models.Paiement.type,
        func.coalesce(func.sum(models.Paiement.montant), 0)
    ).filter(models.Paiement.statut.in_(["paye", "valide"]))

    if scope.code_etablissement:
        c_code = scope.code_etablissement.strip().lower()
        fc_query = fc_query.outerjoin(models.Eleve, models.Paiement.eleve_id == models.Eleve.id).filter(or_(
            func.lower(models.Paiement.ET_CODEETABLISSEMENT) == c_code,
            func.lower(models.Eleve.ET_CODEETABLISSEMENT) == c_code
        ))
    elif scope.ecole_id is not None:
        fc_query = fc_query.outerjoin(models.Eleve, models.Paiement.eleve_id == models.Eleve.id).filter(or_(
            models.Paiement.ecole_id == scope.ecole_id,
            models.Eleve.ecole_id == scope.ecole_id
        ))

    vent_rows = fc_query.group_by(models.Paiement.type).all()

    fond_de_caisse = 0.0
    fond_de_caisse_ventilations = {
        "scolarite": 0.0,
        "cantine": 0.0,
        "transport": 0.0,
        "inscription": 0.0,
        "frais_annexe": 0.0,
        "autre": 0.0,
    }
    for p_type, p_sum in vent_rows:
        val = float(p_sum or 0.0)
        fond_de_caisse += val
        if p_type == "scolarite":
            fond_de_caisse_ventilations["scolarite"] += val
        elif p_type == "cantine":
            fond_de_caisse_ventilations["cantine"] += val
        elif p_type in ["transport", "car"]:
            fond_de_caisse_ventilations["transport"] += val
        elif p_type in ["inscription", "reinscription", "frais_inscription"]:
            fond_de_caisse_ventilations["inscription"] += val
        elif p_type == "frais_annexe":
            fond_de_caisse_ventilations["frais_annexe"] += val
        else:
            fond_de_caisse_ventilations["autre"] += val

    return {
        "date": target_date_str,
        "date_debut": start_date.strftime("%Y-%m-%d") if start_date else (date_debut if date_debut else None),
        "date_fin": end_date.strftime("%Y-%m-%d") if end_date else (date_fin if date_fin else None),
        "nb_encaissements": len(paiements),
        "total_general": float(total_general),
        "total_especes": float(total_especes),
        "total_mobile": float(total_mobile),
        "total_coris": float(total_coris),
        "total_cheque_virement": float(total_cheque_virement),
        "fond_de_caisse": float(fond_de_caisse),
        "fond_de_caisse_ventilations": fond_de_caisse_ventilations,
        "ventilations": ventilations,
        "encaissements": journal_items
    }

@router.get("/quittus-check/{student_id}")
def check_quittus_eligibility(
    student_id: int,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    student = db.query(models.Eleve).filter(models.Eleve.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Élève non trouvé")

    if not scope.is_global and scope.code_etablissement:
        if student.ET_CODEETABLISSEMENT and student.ET_CODEETABLISSEMENT != scope.code_etablissement:
            raise HTTPException(status_code=403, detail="Accès refusé à cet élève d'un autre établissement")

    echeances = db.query(models.EcheancierPaiement).filter(
        models.EcheancierPaiement.eleve_id == student_id,
        models.EcheancierPaiement.service_type.in_(["scolarite", "frais_inscription", "frais_annexe", "inscription"])
    ).all()

    total_scolarite = sum((e.montant_prevu for e in echeances), Decimal("0.00"))
    total_paye = sum((e.montant_paye for e in echeances), Decimal("0.00"))
    solde_restant = total_scolarite - total_paye
    tranches_en_retard = [e for e in echeances if e.statut == "en_retard"]

    eligible = solde_restant <= 0 and len(tranches_en_retard) == 0

    return {
        "eleve": {
            "id": student.id,
            "matricule": student.matricule,
            "nom": student.nom,
            "prenom": student.prenom,
        },
        "quittus_eligible": eligible,
        "solde_restant": float(solde_restant),
        "nb_tranches_en_retard": len(tranches_en_retard),
        "message": "Quittus délivrable immédiatement (Scolarité solde à jour)." if eligible else f"Attention : Cet élève a un solde restant de {float(solde_restant):,.0f} FCFA."
    }

class AnnulationPaiementRequest(BaseModel):
    motif_annulation: str
    annule_par: Optional[str] = "Directeur"
    user_profil: Optional[str] = "directeur"


@router.put("/paiements/{paiement_id}/annuler")
def annuler_paiement(
    paiement_id: int,
    data: AnnulationPaiementRequest,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Annule un paiement enregistré. Fonctionnalité STRICTEMENT réservée à la Direction."""
    # Vérification des privilèges
    profil_clean = (data.user_profil or "").lower().strip()
    if profil_clean not in ["directeur", "admin", "fondateur", "direction", "superuser"]:
        raise HTTPException(
            status_code=403,
            detail="Seul le Directeur ou l'Administration est autorisé à annuler un paiement."
        )

    paiement = db.query(models.Paiement).filter(models.Paiement.id == paiement_id).first()
    if not paiement:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")

    if not scope.is_global and scope.code_etablissement:
        if paiement.ET_CODEETABLISSEMENT and paiement.ET_CODEETABLISSEMENT != scope.code_etablissement:
            raise HTTPException(status_code=403, detail="Accès refusé à ce paiement d'un autre établissement")

    if paiement.statut == "annule":
        raise HTTPException(status_code=400, detail="Ce paiement a déjà été annulé.")

    # Marquer le paiement comme annulé
    paiement.statut = "annule"
    paiement.numero_transaction = f"[ANNULÉ le {now_abidjan().strftime('%d/%m/%Y %H:%M')} par {data.annule_par} - Motif: {data.motif_annulation}] " + (paiement.numero_transaction or "")

    # Remboursement complet (tranches d'échéancier + soldes élève) via le point d'entrée
    # unique partagé par tous les chemins d'annulation : aucun résidu possible, quel que
    # soit le type (scolarité, frais annexes, cantine, transport, examen…).
    crud.revert_payment_allocations(db, paiement)

    db.commit()

    return {
        "success": True,
        "message": f"Le paiement {paiement.numero_recu or paiement.id} a été annulé avec succès par la Direction.",
        "paiement_id": paiement.id,
        "statut": "annule",
        "motif": data.motif_annulation
    }

@router.get("/check-transaction-id")
def check_transaction_id(
    numero_transaction: str = Query(..., min_length=1),
    exclude_payment_id: Optional[int] = Query(None),
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
    classe_name = student.AU_CLASSEPRECEDENTE or (student.classe.CE_LIBELLE if getattr(student, "classe", None) else "N/A")

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
            "classe": classe_name,
            "ecole_code": existing.ET_CODEETABLISSEMENT or student.ET_CODEETABLISSEMENT or "N/A"
        }
    }


@router.put("/transaction-id/{payment_id}")
def modifier_transaction_id(
    payment_id: int,
    data: ModifierTransactionIdRequest,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Permet à l'Administrateur de modifier l'ID de transaction d'un paiement Mobile Money ou Coris Bank existant.
    Fonctionnalité STRICTEMENT réservée aux Administrateurs.
    """
    clean_role = (scope.role or "").lower().strip()
    if clean_role not in ["admin", "superuser", "direction_fondation", "directeur"]:
        raise HTTPException(
            status_code=403,
            detail="Accès refusé : Seul un administrateur est habilité à modifier l'identifiant d'une transaction."
        )

    nouveau_id = (data.nouveau_numero_transaction or "").strip()
    if not nouveau_id:
        raise HTTPException(
            status_code=400,
            detail="Le nouvel identifiant de transaction ne peut pas être vide."
        )

    motif = (data.motif_modification or "").strip()
    if not motif:
        raise HTTPException(
            status_code=400,
            detail="Le motif de modification est obligatoire pour la traçabilité et l'audit."
        )

    paiement = db.query(models.Paiement).filter(models.Paiement.id == payment_id).first()
    if not paiement:
        raise HTTPException(status_code=404, detail="Paiement non trouvé.")

    # Vérification d'unicité : aucun autre paiement actif ne doit avoir ce même ID
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
            detail=f"Ce nouvel identifiant '{nouveau_id}' est déjà utilisé par le versement {conflit.numero_recu} de l'élève {st_name} (Matricule: {other_st.matricule or 'N/A'}). Les identifiants de transaction doivent être uniques."
        )

    ancien_id = paiement.numero_transaction or "(vide)"
    paiement.numero_transaction = nouveau_id

    # Journalisation d'audit obligatoire
    log_audit(
        db,
        action="MODIFICATION_ID_TRANSACTION",
        module="CAISSE_PAIEMENTS",
        detail=f"Modification ID Transaction paiement N° {paiement.numero_recu or paiement.id} : Ancien ID '{ancien_id}' -> Nouveau ID '{nouveau_id}'. Motif : {motif}",
        user=scope.user,
        username=data.admin_nom or scope.username,
        role=scope.role,
        target_id=str(paiement.id),
        target_name=f"Reçu {paiement.numero_recu or paiement.id}",
        statut="SUCCES"
    )

    db.commit()
    db.refresh(paiement)

    return {
        "success": True,
        "message": f"Identifiant de transaction mis à jour avec succès : {nouveau_id}",
        "paiement_id": paiement.id,
        "ancien_numero_transaction": ancien_id,
        "nouveau_numero_transaction": paiement.numero_transaction,
        "motif": motif
    }


@router.get("/mobile-money-coris-transactions")
def get_mobile_money_coris_transactions(
    search: Optional[str] = Query(None),
    mode: Optional[str] = Query(None),
    ecole_id: Optional[int] = Query(None),
    limit: int = Query(200, le=500),
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Liste des règlements Mobile Money et Coris Bank pour consultation et administration des transactions."""
    query = db.query(models.Paiement).join(models.Eleve, models.Paiement.eleve_id == models.Eleve.id).options(
        joinedload(models.Paiement.eleve)
    )

    if not scope.is_global and scope.code_etablissement:
        query = query.filter(models.Paiement.ET_CODEETABLISSEMENT == scope.code_etablissement)
    elif ecole_id:
        query = query.filter(models.Eleve.ecole_id == ecole_id)

    mobile_coris_modes = [
        "mobile_money", "mtn_money", "orange_money", "moov_money", "wave",
        "coris_bank", "coris", "virement", "cheque"
    ]
    if mode and mode != "all":
        query = query.filter(models.Paiement.mode == mode)
    else:
        query = query.filter(
            or_(
                models.Paiement.mode.in_(mobile_coris_modes),
                models.Paiement.numero_transaction.isnot(None)
            )
        )

    if search and search.strip():
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(models.Paiement.numero_transaction).like(s),
                func.lower(models.Paiement.numero_recu).like(s),
                func.lower(models.Eleve.nom).like(s),
                func.lower(models.Eleve.prenom).like(s),
                func.lower(models.Eleve.matricule).like(s)
            )
        )

    payments = query.order_by(models.Paiement.date.desc()).limit(limit).all()

    results = []
    for p in payments:
        st = p.eleve
        st_fullname = f"{st.prenom or ''} {st.nom or ''}".strip() if st else "Élève inconnu"
        classe_name = st.AU_CLASSEPRECEDENTE or (st.classe.CE_LIBELLE if getattr(st, "classe", None) else "N/A") if st else "N/A"
        results.append({
            "id": p.id,
            "numero_recu": p.numero_recu,
            "numero_transaction": p.numero_transaction or "",
            "montant": float(p.montant or 0),
            "mode": p.mode,
            "type": p.type,
            "statut": p.statut,
            "date": p.date.isoformat() if p.date else "",
            "eleve_id": p.eleve_id,
            "eleve_nom": st_fullname,
            "matricule": st.matricule if st else "N/A",
            "classe": classe_name,
            "code_etablissement": p.ET_CODEETABLISSEMENT or (st.ET_CODEETABLISSEMENT if st else "")
        })

    return results




def select_grille_tarifaire(
    db: Session,
    student: models.Eleve,
    classe_obj: Optional[models.Classe],
    ecole: Optional[models.Etablissement]
) -> Optional[models.GrilleTarifaire]:
    """Grille tarifaire configurée dans `api_grille_tarifaire` qui couvre cet élève.

    Point d'entrée unique de la résolution : reçu de caisse comme réalignement des
    échéanciers passent par ici, pour qu'un élève ne puisse jamais se voir appliquer
    deux barèmes différents selon l'écran. Renvoie None si aucune grille ne couvre la
    classe — à l'appelant de décider de son repli.
    """
    # Les libellés de classe et les niveaux des grilles ne sont pas saisis de la même main :
    # « 6eme B » côté classe, « 6ème » côté grille. Comparer sans retirer les accents laissait
    # ces élèves sans tarif, donc sans échéancier du tout.
    cls_name = _canon_texte(classe_obj.CE_LIBELLE if classe_obj else (student.AU_CLASSEPRECEDENTE or ""))
    cycle_lib = str(getattr(classe_obj, "CY_LIBELLECYCLE", "") or "").lower()
    is_mat_or_prim = any(k in cls_name.lower() for k in ["mat", "ps", "ms", "gs", "cp", "ce", "cm", "prim"]) or ("mat" in cycle_lib or "prim" in cycle_lib)
    statut_orient = (getattr(student, 'statut_orientation', '') or getattr(student, 'AU_STATUT', '') or '').strip().lower()
    statut_inconnu = not statut_orient
    is_aff = ('affecté' in statut_orient or 'aff' in statut_orient) and not ('non' in statut_orient or 'naff' in statut_orient)

    ecole_id = student.ecole_id or (ecole.IDETABLISSEMENT if ecole else None)
    ecole_code = student.ET_CODEETABLISSEMENT or (ecole.ET_CODEETABLISSEMENT if ecole else None)
    ville = (ecole.ET_VILLE if ecole else None) or student.AU_COMMUNE

    query = db.query(models.GrilleTarifaire).filter(
        models.GrilleTarifaire.is_active == True,
        models.GrilleTarifaire.type_service == "scolarite"
    )

    all_grilles = query.order_by(models.GrilleTarifaire.id.desc()).all()

    def get_effective_statut(p: models.GrilleTarifaire) -> str:
        stat = (p.statut_affectation or "").strip().upper()
        if stat in ("AFF", "NAFF"):
            return stat
        text = f"{p.label or ''} {p.cycle or ''}".upper()
        if "NON AFFECT" in text or "NAFF" in text:
            return "NAFF"
        if "AFFECT" in text:
            return "AFF"
        return "TOUS"

    def statut_compatible(p: models.GrilleTarifaire) -> bool:
        if is_mat_or_prim:
            return True
        stat = get_effective_statut(p)
        if stat == "TOUS":
            return True
        if statut_inconnu:
            return True
        if stat == "AFF":
            return is_aff
        if stat == "NAFF":
            return not is_aff
        return True

    def niveau_compatible(p: models.GrilleTarifaire) -> bool:
        niveaux = p.niveaux if isinstance(p.niveaux, list) else (json.loads(p.niveaux) if p.niveaux else [])
        niveaux_upper = [_canon_texte(n) for n in niveaux]
        for niv in niveaux_upper:
            if niv and (niv in cls_name or cls_name.startswith(niv)):
                return True
        if not niveaux_upper:
            cycle = (p.cycle or "").upper()
            if "PRIM" in cycle and any(k in cls_name for k in ["CP", "CE", "CM", "PRIM"]):
                return True
            if "MAT" in cycle and any(k in cls_name for k in ["MAT", "PS", "MS", "GS"]):
                return True
            if "COLL" in cycle and any(k in cls_name for k in ["6", "5", "4", "3"]):
                return True
            if "LYC" in cycle and any(k in cls_name for k in ["2NDE", "1ERE", "TLE"]):
                return True
        return False

    def matches(p: models.GrilleTarifaire) -> bool:
        return statut_compatible(p) and niveau_compatible(p)

    def rang_statut(p: models.GrilleTarifaire) -> int:
        """Classe les grilles éligibles : statut exact, puis « TOUS », puis toléré."""
        if is_mat_or_prim:
            return 0
        stat = get_effective_statut(p)
        if not statut_inconnu and ((stat == "AFF" and is_aff) or (stat == "NAFF" and not is_aff)):
            return 0
        if stat == "TOUS":
            return 1
        return 2

    def choisir(candidats: List[models.GrilleTarifaire]) -> Optional[models.GrilleTarifaire]:
        eligibles = [p for p in candidats if matches(p)]
        if not eligibles:
            return None
        return sorted(eligibles, key=rang_statut)[0]

    # Recherche par cluster d'établissement officiel
    matched = None
    cluster_match = None
    for cl_key, cl_data in SCHOOL_CLUSTERS_PY.items():
        if ecole_id and ecole_id in cl_data["all_ids"]:
            cluster_match = cl_data
            break
        if ecole_code and any(str(ecole_code).strip().upper() == str(c).strip().upper() for c in cl_data["all_codes"]):
            cluster_match = cl_data
            break
        if ville and cl_data["city"] in str(ville).strip().lower():
            cluster_match = cl_data
            break

    if cluster_match:
        matched = choisir([
            p for p in all_grilles
            if (p.ecole_id in cluster_match["all_ids"]) or
               any((p.ET_CODEETABLISSEMENT or "").strip().upper() == str(c).strip().upper() for c in cluster_match["all_codes"]) or
               (p.ville and cluster_match["city"] in p.ville.strip().lower())
        ])

    # Portées, de la plus précise à la plus large
    if not matched and ecole_id:
        matched = choisir([p for p in all_grilles if p.ecole_id == ecole_id])

    if not matched and ecole_code:
        code_norm = str(ecole_code).strip().upper()
        matched = choisir([
            p for p in all_grilles
            if (p.ET_CODEETABLISSEMENT or "").strip().upper() == code_norm
        ])

    if not matched and ville:
        v_clean = str(ville).strip().lower()
        matched = choisir([
            p for p in all_grilles
            if p.ville and p.ville.strip().lower() == v_clean
        ])

    if not matched:
        matched = choisir([
            p for p in all_grilles
            if not p.ecole_id and not p.ET_CODEETABLISSEMENT and not p.ville
        ])

    if not matched:
        json_presets = _get_json_presets()
        if json_presets:
            def json_matches(p_json: dict) -> bool:
                if p_json.get("type_service", "scolarite") != "scolarite":
                    return False
                p_stat = (p_json.get("statut_affectation") or "").strip().upper()
                if not p_stat:
                    lbl = (p_json.get("label") or "").upper()
                    if "NON AFFECT" in lbl or "NAFF" in lbl:
                        p_stat = "NAFF"
                    elif "AFFECT" in lbl:
                        p_stat = "AFF"
                    else:
                        p_stat = "TOUS"
                if not is_mat_or_prim and p_stat != "TOUS" and not statut_inconnu:
                    if p_stat == "AFF" and not is_aff:
                        return False
                    if p_stat == "NAFF" and is_aff:
                        return False
                p_niveaux = [str(n).upper().strip() for n in p_json.get("niveaux", [])]
                if p_niveaux:
                    if not any(niv in cls_name or cls_name.startswith(niv) for niv in p_niveaux):
                        return False
                else:
                    cycle = (p_json.get("cycle") or "").upper()
                    if "PRIM" in cycle and not any(k in cls_name for k in ["CP", "CE", "CM", "PRIM"]):
                        return False
                    if "MAT" in cycle and not any(k in cls_name for k in ["MAT", "PS", "MS", "GS"]):
                        return False
                    if "COLL" in cycle and not any(k in cls_name for k in ["6", "5", "4", "3"]):
                        return False
                    if "LYC" in cycle and not any(k in cls_name for k in ["2NDE", "1ERE", "TLE"]):
                        return False
                return True

            def choisir_json(candidats: List[dict]) -> Optional[dict]:
                eligibles = [p for p in candidats if json_matches(p)]
                if not eligibles:
                    return None
                return eligibles[0]

            matched_json = None
            if cluster_match:
                matched_json = choisir_json([
                    p for p in json_presets
                    if (p.get("ecole_id") in cluster_match["all_ids"]) or
                       any((p.get("code_etablissement") or "").strip().upper() == str(c).strip().upper() for c in cluster_match["all_codes"]) or
                       (p.get("ville") and cluster_match["city"] in str(p.get("ville")).strip().lower())
                ])
            if not matched_json and ecole_id:
                matched_json = choisir_json([p for p in json_presets if p.get("ecole_id") == ecole_id])
            if not matched_json and ecole_code:
                code_norm = str(ecole_code).strip().upper()
                matched_json = choisir_json([p for p in json_presets if (p.get("code_etablissement") or "").strip().upper() == code_norm])
            if not matched_json and ville:
                v_clean = str(ville).strip().lower()
                matched_json = choisir_json([p for p in json_presets if p.get("ville") and v_clean in str(p.get("ville")).strip().lower()])
            if not matched_json:
                matched_json = choisir_json(json_presets)

            if matched_json:
                matched = models.GrilleTarifaire(
                    preset_id=matched_json.get("id", "preset_auto"),
                    label=matched_json.get("label", "Grille Officielle"),
                    type_service=matched_json.get("type_service", "scolarite"),
                    cycle=matched_json.get("cycle", "Général"),
                    niveaux=matched_json.get("niveaux", []),
                    statut_affectation=matched_json.get("statut_affectation", "TOUS"),
                    total=Decimal(str(matched_json.get("total", 0))),
                    tranches=matched_json.get("tranches", []),
                    annee_scolaire=matched_json.get("annee_scolaire", "2026-2027"),
                    ecole_id=matched_json.get("ecole_id") or ecole_id,
                    ET_CODEETABLISSEMENT=matched_json.get("code_etablissement") or ecole_code,
                    ville=matched_json.get("ville") or ville,
                    is_active=True
                )

    return matched


def find_online_grille_for_student(
    db: Session,
    student: models.Eleve,
    classe_obj: Optional[models.Classe],
    ecole: Optional[models.Etablissement]
) -> Tuple[Optional[str], List[Tuple[str, float]], float]:
    """Tranches de scolarité applicables à un élève : (libellé du modèle, tranches, total).

    Seule la grille configurée par l'établissement fait foi. Aucun barème n'est codé en
    dur ici : si aucune grille ne couvre la classe, la fonction renvoie une liste vide et
    l'appelant doit le dire à l'utilisateur plutôt qu'inventer des montants. Un reçu qui
    affiche un barème deviné est un document comptable faux remis à une famille.
    """
    matched = select_grille_tarifaire(db, student, classe_obj, ecole)
    if not matched:
        return None, [], 0.0

    tranches_raw = matched.tranches if isinstance(matched.tranches, list) else (json.loads(matched.tranches) if matched.tranches else [])
    tranches_out = []
    for i, t in enumerate(tranches_raw):
        m = float(t.get("montant", 0))
        if m > 0:
            lib = t.get("libelle", f"Tranche #{i+1}")
            tranches_out.append((lib, m))

    if not tranches_out:
        return None, [], 0.0

    return matched.label, tranches_out, float(matched.total)


def get_service_tarif_for_student(db: Session, student: models.Eleve, service_type: str) -> float:
    """Récupère le tarif mensuel réel d'un service (cantine, transport) pour un élève selon son affectation, ses tranches et son établissement."""
    if service_type == "transport":
        # 1. Priorité absolue : le tarif effectivement payé lors du dernier règlement ou sur une tranche
        last_trans_pmt = db.query(models.Paiement).filter(
            models.Paiement.eleve_id == student.id,
            models.Paiement.type == "transport",
            models.Paiement.statut == "paye"
        ).order_by(models.Paiement.id.desc()).first()
        if last_trans_pmt and last_trans_pmt.montant:
            m = float(last_trans_pmt.montant)
            if m > 0:
                if m <= 40000:
                    return m
                elif m % 3 == 0 and (m / 3) <= 40000:
                    return m / 3
                elif m % 9 == 0 and (m / 9) <= 40000:
                    return m / 9

        trans_paid_ech = db.query(models.EcheancierPaiement).filter(
            models.EcheancierPaiement.eleve_id == student.id,
            models.EcheancierPaiement.service_type == "transport",
            models.EcheancierPaiement.montant_paye > 0
        ).order_by(models.EcheancierPaiement.id.desc()).first()
        if trans_paid_ech and trans_paid_ech.montant_paye and float(trans_paid_ech.montant_paye) > 0:
            return float(trans_paid_ech.montant_paye)

        # 2. Affectation de transport explicite
        aff_trans = db.query(models.AffectationTransport).filter(models.AffectationTransport.eleveId == student.id).first()
        if aff_trans and getattr(aff_trans, "tarif", None) and float(aff_trans.tarif) > 0:
            return float(aff_trans.tarif)

        for attr_field in ("montantTransport", "transportTarif", "tarif_transport", "montant_transport", "transport_tarif", "zone_tarif"):
            val = getattr(student, attr_field, None)
            if val and float(val) > 0:
                return float(val)

        trans_ech = db.query(models.EcheancierPaiement).filter(
            models.EcheancierPaiement.eleve_id == student.id,
            models.EcheancierPaiement.service_type == "transport",
            models.EcheancierPaiement.montant_prevu > 0
        ).first()
        if trans_ech and trans_ech.montant_prevu and float(trans_ech.montant_prevu) > 0:
            return float(trans_ech.montant_prevu)

    if service_type == "cantine":
        # 1. Priorité absolue : le tarif effectivement payé lors du dernier règlement ou sur une tranche
        last_cant_pmt = db.query(models.Paiement).filter(
            models.Paiement.eleve_id == student.id,
            models.Paiement.type == "cantine",
            models.Paiement.statut == "paye"
        ).order_by(models.Paiement.id.desc()).first()
        if last_cant_pmt and last_cant_pmt.montant:
            m = float(last_cant_pmt.montant)
            if m > 0:
                if m <= 40000:
                    return m
                elif m % 3 == 0 and (m / 3) <= 40000:
                    return m / 3
                elif m % 9 == 0 and (m / 9) <= 40000:
                    return m / 9

        cant_paid_ech = db.query(models.EcheancierPaiement).filter(
            models.EcheancierPaiement.eleve_id == student.id,
            models.EcheancierPaiement.service_type == "cantine",
            models.EcheancierPaiement.montant_paye > 0
        ).order_by(models.EcheancierPaiement.id.desc()).first()
        if cant_paid_ech and cant_paid_ech.montant_paye and float(cant_paid_ech.montant_paye) > 0:
            return float(cant_paid_ech.montant_paye)

        for attr_field in ("montantCantine", "cantineTarif", "tarif_cantine", "montant_cantine", "cantine_tarif"):
            val = getattr(student, attr_field, None)
            if val and float(val) > 0:
                return float(val)

        cant_ech = db.query(models.EcheancierPaiement).filter(
            models.EcheancierPaiement.eleve_id == student.id,
            models.EcheancierPaiement.service_type == "cantine",
            models.EcheancierPaiement.montant_prevu > 0
        ).first()
        if cant_ech and cant_ech.montant_prevu and float(cant_ech.montant_prevu) > 0:
            return float(cant_ech.montant_prevu)

    cluster_match = None
    for cl_key, cl_data in SCHOOL_CLUSTERS_PY.items():
        if student.ecole_id and student.ecole_id in cl_data["all_ids"]:
            cluster_match = cl_data
            break
        if student.ET_CODEETABLISSEMENT and any(str(student.ET_CODEETABLISSEMENT).strip().upper() == str(c).strip().upper() for c in cl_data["all_codes"]):
            cluster_match = cl_data
            break

    city_canon = ""
    if cluster_match:
        city_canon = _canon_texte(cluster_match.get("city", ""))
    
    if not city_canon:
        ecole = None
        if student.ecole_id:
            ecole = db.query(models.Etablissement).filter(models.Etablissement.IDETABLISSEMENT == student.ecole_id).first()
        if not ecole and student.ET_CODEETABLISSEMENT:
            ecole = db.query(models.Etablissement).filter(models.Etablissement.ET_CODEETABLISSEMENT == student.ET_CODEETABLISSEMENT).first()
        if ecole and ecole.ET_VILLE:
            city_canon = _canon_texte(ecole.ET_VILLE)

    if not city_canon and getattr(student, "ville", None):
        city_canon = _canon_texte(student.ville)

    # Villes à tarif province (Korhogo, Bouaké, Daloa)
    if any(k in city_canon for k in ["KORHOGO", "BOUAKE", "DALOA"]):
        return 10000.0 if service_type == "cantine" else 15000.0

    tarif_db = None
    if cluster_match:
        tarif_db = db.query(models.TarifService).filter(
            models.TarifService.service_type == service_type,
            or_(
                models.TarifService.ecole_id.in_(cluster_match["all_ids"]),
                models.TarifService.ET_CODEETABLISSEMENT.in_(cluster_match["all_codes"])
            )
        ).first()

    if not tarif_db and (student.ecole_id or student.ET_CODEETABLISSEMENT):
        tarif_db = db.query(models.TarifService).filter(
            models.TarifService.service_type == service_type,
            or_(
                models.TarifService.ecole_id == student.ecole_id,
                models.TarifService.ET_CODEETABLISSEMENT == student.ET_CODEETABLISSEMENT
            )
        ).first()

    if not tarif_db and city_canon:
        tarif_db = db.query(models.TarifService).filter(
            models.TarifService.service_type == service_type,
            or_(
                models.TarifService.libelle.ilike(f"%{city_canon}%"),
                models.TarifService.code_zone.ilike(f"%{city_canon}%")
            )
        ).first()

    if not tarif_db:
        tarif_db = db.query(models.TarifService).filter(
            models.TarifService.service_type == service_type
        ).first()

    if tarif_db and getattr(tarif_db, "montant_mensuel", None) and float(tarif_db.montant_mensuel) > 0:
        return float(tarif_db.montant_mensuel)

    default_tarif = 15000.0 if service_type == "cantine" else 18000.0
    return default_tarif


@router.get("/eleve/{eleve_id}/recu-recapitulatif")
def get_recu_recapitulatif_eleve(
    eleve_id: int,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Génère les données d'un reçu récapitulatif global de l'ensemble des paiements d'un élève."""
    student = db.query(models.Eleve).filter(models.Eleve.id == eleve_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Élève non trouvé")

    if not scope.is_global and scope.code_etablissement:
        if student.ET_CODEETABLISSEMENT and student.ET_CODEETABLISSEMENT != scope.code_etablissement:
            raise HTTPException(status_code=403, detail="Accès refusé à cet élève d'un autre établissement")

    ecole = db.query(models.Etablissement).filter(models.Etablissement.IDETABLISSEMENT == student.ecole_id).first() if student.ecole_id else None
    if not ecole and student.ET_CODEETABLISSEMENT:
        ecole = db.query(models.Etablissement).filter(models.Etablissement.ET_CODEETABLISSEMENT == student.ET_CODEETABLISSEMENT).first()
    classe_obj = db.query(models.Classe).filter(models.Classe.id == student.classe_id).first() if student.classe_id else None

    # Récupérer tous les paiements (non annulés)
    paiements = db.query(models.Paiement).filter(
        models.Paiement.eleve_id == eleve_id,
        models.Paiement.statut == "paye"
    ).order_by(models.Paiement.date.asc()).all()

    # Récapitulatif par catégorie
    by_category = {
        "arriere": [],
        "frais_annexe": [],
        "frais_inscription": [],
        "inscription": [],
        "scolarite": [],
        "cantine": [],
        "transport": [],
        "examen": [],
        "kits": [],
        "uniforme": [],
        "frais_divers": [],
        "pack_global": [],
        "autres": []
    }

    totaux_category = {
        "arriere": Decimal("0.00"),
        "frais_annexe": Decimal("0.00"),
        "frais_inscription": Decimal("0.00"),
        "inscription": Decimal("0.00"),
        "scolarite": Decimal("0.00"),
        "cantine": Decimal("0.00"),
        "transport": Decimal("0.00"),
        "examen": Decimal("0.00"),
        "kits": Decimal("0.00"),
        "uniforme": Decimal("0.00"),
        "frais_divers": Decimal("0.00"),
        "pack_global": Decimal("0.00"),
        "autres": Decimal("0.00"),
    }

    total_general = Decimal("0.00")

    for p in paiements:
        m = Decimal(str(p.montant))
        item = {
            "id": p.id,
            "numero_recu": p.numero_recu or f"REC-{p.id}",
            "date": p.date.strftime("%d/%m/%Y %H:%M") if p.date else "",
            "montant": float(m),
            "mode": p.mode,
            "type": p.type,
            "numero_transaction": p.numero_transaction or "-"
        }
        ptype = (p.type or "").lower().strip()
        if "arriere" in ptype or "arriéré" in ptype:
            cat = "arriere"
        elif ptype == "frais_annexe":
            cat = "frais_annexe"
        elif ptype == "frais_inscription":
            cat = "frais_inscription"
        elif "uniforme" in ptype or "tenue" in ptype or "polo" in ptype:
            cat = "uniforme"
        elif "kit" in ptype or "fourniture" in ptype or "achat" in ptype:
            cat = "kits"
        elif "anglais" in ptype or "informatique" in ptype or "divers" in ptype or "soutien" in ptype:
            cat = "frais_divers"
        elif "cantine" in ptype:
            cat = "cantine"
        elif "transport" in ptype or "car" in ptype:
            cat = "transport"
        elif "examen" in ptype or "bepc" in ptype or "cepe" in ptype or "bac" in ptype:
            cat = "examen"
        elif "inscription" in ptype or "reinscription" in ptype:
            cat = "inscription"
        elif "scolarite" in ptype or "scolarité" in ptype:
            cat = "scolarite"
        elif ptype in ("pack_global", "forfait_global", "tout_compris", "pack_scolarite_services"):
            cat = "pack_global"
        else:
            cat = "autres"

        by_category[cat].append(item)
        totaux_category[cat] += m
        total_general += m

    # Construire le lieu d'habitation complet
    lieu_hab = f"{student.AU_COMMUNE or ''} {student.AU_QUARTIER or ''} {student.AU_ADRESSE_GEO or ''}".strip()
    if not lieu_hab:
        lieu_hab = student.AU_ADRESSE_POSTALE or "Non renseigné"

    # Récupérer les échéances réelles en DB
    all_db_echeances = db.query(models.EcheancierPaiement).filter(
        models.EcheancierPaiement.eleve_id == student.id
    ).order_by(models.EcheancierPaiement.date_echeance.asc()).all()

    def is_arriere_ech(e):
        stype = (e.service_type or "").strip().lower()
        lib = (e.libelle or "").strip().lower()
        return stype == "arriere" or "arriere" in lib or "arriéré" in lib

    arriere_echeances = [e for e in all_db_echeances if is_arriere_ech(e)]

    def is_scolarite_ech(e):
        stype = (e.service_type or "").strip().lower()
        lib = (e.libelle or "").strip().lower()
        if is_arriere_ech(e):
            return False
        if stype in ("cantine", "transport", "car", "examen", "uniforme", "autres"):
            return False
        if any(kw in lib for kw in ["cantine", "transport", " car", "examen", "bepc", "cepe", "bac", "uniforme"]):
            return False
        return True

    scolarite_echeances = [e for e in all_db_echeances if is_scolarite_ech(e)]

    if scolarite_echeances:
        total_verse_scolarite = float(sum((e.montant_paye or Decimal("0.00")) for e in scolarite_echeances))
    else:
        total_verse_scolarite = float(totaux_category["frais_annexe"] + totaux_category["frais_inscription"] + totaux_category["inscription"] + totaux_category["scolarite"])

    # Tranches de scolarité de la classe, telles que l'établissement les a configurées.
    grid_label, grid_tranches, grid_total = find_online_grille_for_student(db, student, classe_obj, ecole)
    preset_tranches = grid_tranches

    # D'où viennent réellement les lignes de scolarité imprimées ?
    if scolarite_echeances:
        source_scolarite = "echeancier_eleve"
    elif grid_tranches:
        source_scolarite = "grille_tarifaire"
    else:
        source_scolarite = "aucune_grille"

    # Le dû total est la somme des lignes réellement imprimées
    if scolarite_echeances:
        total_du = float(sum(float(e.montant_prevu or 0.0) for e in scolarite_echeances))
    else:
        total_du = float(sum(montant for _, montant in preset_tranches))
    total_verse = total_verse_scolarite
    solde_impaye = max(0.0, total_du - total_verse)
    arrieres = float(student.AU_MONTANTARRIERE or Decimal("0.00"))

    echeances_out = []

    if scolarite_echeances and len(scolarite_echeances) > 0:
        for ech in scolarite_echeances:
            amt = float(ech.montant_prevu or 0.0)
            paid = float(ech.montant_paye or 0.0)
            libelle = ech.libelle or f"Tranche #{ech.tranche_numero}"

            echeances_out.append({
                "rubric": libelle,
                "amount": amt,
                "paid": paid,
                "rest": max(0.0, amt - paid),
                "date_echeance": ech.date_echeance.strftime("%d/%m/%Y") if ech.date_echeance else None,
                "statut": ech.statut,
                "service_type": "scolarite",
            })
    else:
        # Les frais annexes et d'inscription sont crédités d'abord sur leur propre tranche
        # de la grille : versés à part, ils doivent apparaître sous leur rubrique et non
        # remplir la première tranche venue. Sans tranche correspondante dans la grille, ils
        # forment leur propre ligne réglée. Ce qui dépasse la tranche rejoint la scolarité.
        def tranche_kind(name: str) -> str:
            n = (name or "").lower()
            if "annexe" in n:
                return "frais_annexe"
            if "inscription" in n:
                return "inscription"
            return "scolarite"

        pools = {
            "frais_annexe": float(totaux_category["frais_annexe"]),
            "inscription": float(totaux_category["frais_inscription"] + totaux_category["inscription"]),
        }
        kinds_in_grid = {tranche_kind(name) for name, _ in preset_tranches}
        libelles_hors_grille = {"frais_annexe": "Frais annexe", "inscription": "Frais d'Inscription"}
        for kind, libelle in libelles_hors_grille.items():
            if kind not in kinds_in_grid and pools[kind] > 0:
                echeances_out.append({
                    "rubric": libelle,
                    "amount": pools[kind],
                    "paid": pools[kind],
                    "rest": 0.0,
                    "statut": "paye",
                    "service_type": kind,
                })
                pools[kind] = 0.0

        paid_by_tranche = []
        for name, amt in preset_tranches:
            kind = tranche_kind(name)
            p_amt = 0.0
            if kind in pools:
                p_amt = min(amt, pools[kind])
                pools[kind] -= p_amt
            paid_by_tranche.append(p_amt)

        rem_verse = float(totaux_category["scolarite"]) + sum(pools.values())
        for (name, amt), p_amt in zip(preset_tranches, paid_by_tranche):
            extra = min(amt - p_amt, rem_verse)
            p_amt += extra
            rem_verse = max(0.0, rem_verse - extra)
            echeances_out.append({
                "rubric": name,
                "amount": amt,
                "paid": p_amt,
                "rest": max(0.0, amt - p_amt),
                "service_type": tranche_kind(name),
            })

        # Le dû et le versé suivent exactement les lignes imprimées.
        total_du = float(sum(e["amount"] for e in echeances_out))
        total_verse_scolarite = float(sum(e["paid"] for e in echeances_out)) + rem_verse
        total_verse = total_verse_scolarite
        solde_impaye = float(sum(e["rest"] for e in echeances_out))

    # Arriérés des années antérieures : ligne distincte, comme sur les reçus de l'ancien
    # logiciel. Le montant est ce qui a déjà été réglé plus ce qui reste dû
    # (AU_MONTANTARRIERE), placée juste après l'inscription et les frais annexes.
    arriere_lines = []
    if arriere_echeances:
        for ech in arriere_echeances:
            amt = float(ech.montant_prevu or 0.0)
            paid = float(ech.montant_paye or 0.0)
            arriere_lines.append({
                "rubric": ech.libelle or "ARRIERE",
                "amount": amt,
                "paid": paid,
                "rest": max(0.0, amt - paid),
                "date_echeance": ech.date_echeance.strftime("%d/%m/%Y") if ech.date_echeance else None,
                "statut": ech.statut,
                "service_type": "arriere",
            })
    else:
        arriere_paye = float(totaux_category["arriere"])
        if arriere_paye > 0 or arrieres > 0:
            arriere_lines.append({
                "rubric": "ARRIERE",
                "amount": arriere_paye + arrieres,
                "paid": arriere_paye,
                "rest": arrieres,
                "statut": "paye" if arrieres <= 0 else ("partiel" if arriere_paye > 0 else "non_paye"),
                "service_type": "arriere",
            })
    if arriere_lines:
        insert_at = 0
        while insert_at < len(echeances_out) and any(
            kw in (echeances_out[insert_at]["rubric"] or "").lower() for kw in ("annexe", "inscription")
        ):
            insert_at += 1
        echeances_out[insert_at:insert_at] = arriere_lines

    # Services optionnels (cantine, transport) :
    # - Si l'élève a des tranches en base : renvoyer ses vraies tranches en base.
    # - Si l'élève est abonné : générer son échéancier mensuel officiel (Septembre à Mai = 9 mois) selon son école / ville / zone.
    # - Sinon si l'élève a des versements passés : renvoyer ses versements réels en base.
    has_cantine_sub = bool(
        getattr(student, "service_cantine", False)
        or getattr(student, "serviceCantine", False)
        or (totaux_category["cantine"] > 0)
    )
    has_transport_sub = bool(
        getattr(student, "service_transport", False)
        or getattr(student, "serviceTransport", False)
        or (totaux_category["transport"] > 0)
        or db.query(models.AffectationTransport).filter(models.AffectationTransport.eleveId == student.id).first() is not None
    )

    total_cantine_due = 0.0
    total_cantine_payee = float(totaux_category["cantine"])
    cantine_reste = 0.0

    total_transport_due = 0.0
    total_transport_payee = float(totaux_category["transport"])
    transport_reste = 0.0

    for service in ("cantine", "transport"):
        is_active = has_cantine_sub if service == "cantine" else has_transport_sub
        has_payments = (totaux_category["cantine"] > 0) if service == "cantine" else (totaux_category["transport"] > 0)

        if not is_active and not has_payments:
            continue

        keywords = ["cantine", "cant"] if service == "cantine" else ["transport", "car"]
        matching_echs = [
            e for e in all_db_echeances
            if (e.service_type or "").strip().lower() == service
            or any(kw in (e.libelle or "").lower() for kw in keywords)
        ]

        if matching_echs:
            s_due = 0.0
            s_paid = 0.0
            official_monthly = get_service_tarif_for_student(db, student, service)
            max_paid_svc = max([float(e.montant_paye or 0.0) for e in matching_echs] + [0.0])
            max_prevu_svc = max([float(e.montant_prevu or 0.0) for e in matching_echs] + [0.0])
            effective_unit = max_paid_svc if max_paid_svc > 0 else (official_monthly if official_monthly > 0 else max_prevu_svc)

            for ech in matching_echs:
                paid = float(ech.montant_paye or 0.0)
                if paid > 0:
                    amt = max(float(ech.montant_prevu or 0.0), paid, effective_unit)
                else:
                    amt = effective_unit if effective_unit > 0 else float(ech.montant_prevu or 0.0)

                is_desab = (ech.statut == "desabonne") or (not is_active and paid <= 0)

                if is_desab:
                    echeances_out.append({
                        "rubric": ech.libelle or f"{service.capitalize()} #{ech.tranche_numero}",
                        "amount": 0.0,
                        "paid": 0.0,
                        "rest": 0.0,
                        "date_echeance": ech.date_echeance.strftime("%d/%m/%Y") if ech.date_echeance else None,
                        "statut": "desabonne",
                        "is_desabonne": True,
                        "service_type": service,
                    })
                else:
                    eff_amt = paid if not is_active else amt
                    eff_rest = 0.0 if not is_active or ech.statut == "paye" or (paid >= amt and amt > 0) else max(0.0, amt - paid)
                    s_due += eff_amt
                    s_paid += paid

                    echeances_out.append({
                        "rubric": ech.libelle or f"{service.capitalize()} #{ech.tranche_numero}",
                        "amount": eff_amt,
                        "paid": paid,
                        "rest": eff_rest,
                        "date_echeance": ech.date_echeance.strftime("%d/%m/%Y") if ech.date_echeance else None,
                        "statut": "paye" if (paid >= amt and amt > 0) or (not is_active and paid > 0) or ech.statut == "paye" else ech.statut,
                        "is_desabonne": False,
                        "service_type": service,
                    })
            if service == "cantine":
                total_cantine_due = s_due
                total_cantine_payee = s_paid
                cantine_reste = max(0.0, s_due - s_paid)
            else:
                total_transport_due = s_due
                total_transport_payee = s_paid
                transport_reste = max(0.0, s_due - s_paid)

        elif is_active:
            monthly_tarif = get_service_tarif_for_student(db, student, service)
            total_service_paid = float(totaux_category[service])
            rem_service_paid = total_service_paid
            prefix = "Cantine" if service == "cantine" else "Transport (Car)"
            annual_service_due = monthly_tarif * 9

            if service == "cantine":
                total_cantine_due = annual_service_due
                total_cantine_payee = total_service_paid
                cantine_reste = max(0.0, annual_service_due - total_service_paid)
            else:
                total_transport_due = annual_service_due
                total_transport_payee = total_service_paid
                transport_reste = max(0.0, annual_service_due - total_service_paid)

            for idx, (mois_nom, annee_num, mois_num) in enumerate(SERVICE_MONTHLY_SCHEDULE, start=1):
                p_month = min(monthly_tarif, rem_service_paid)
                rem_service_paid = max(0.0, rem_service_paid - p_month)
                r_month = max(0.0, monthly_tarif - p_month)
                st_month = "paye" if p_month >= monthly_tarif else ("partiel" if p_month > 0 else "non_paye")
                echeances_out.append({
                    "rubric": f"{prefix} — {mois_nom} {annee_num}",
                    "amount": monthly_tarif,
                    "paid": p_month,
                    "rest": r_month,
                    "date_echeance": f"05/{mois_num:02d}/{annee_num}",
                    "statut": st_month,
                    "is_desabonne": False,
                    "service_type": service,
                })
        elif has_payments:
            for item in by_category[service]:
                echeances_out.append({
                    "rubric": f"Frais de {service.capitalize()}",
                    "amount": item["montant"],
                    "paid": item["montant"],
                    "rest": 0.0,
                    "mode": item["mode"],
                    "service_type": service,
                })

    # Frais d'examen officiel : normalement hors échéancier (montant annuel réglé une seule
    # fois) — les lignes viennent alors des paiements enregistrés. Si une tranche d'examen a
    # malgré tout été préparée pour l'élève, elle fait foi et remplace ces lignes, sans quoi
    # un examen déjà provisionné apparaîtrait deux fois une fois réglé.
    examen_echeances = [
        e for e in all_db_echeances
        if (e.service_type or "").strip().lower() == "examen"
        or any(kw in (e.libelle or "").lower() for kw in ["examen", "bepc", "cepe", "bac"])
    ]
    if examen_echeances:
        for ech in examen_echeances:
            amt = float(ech.montant_prevu or 0.0)
            paid = float(ech.montant_paye or 0.0)
            echeances_out.append({
                "rubric": ech.libelle or "Droit & Frais d'Examen Officiel",
                "amount": amt,
                "paid": paid,
                "rest": max(0.0, amt - paid),
                "date_echeance": ech.date_echeance.strftime("%d/%m/%Y") if ech.date_echeance else None,
                "statut": ech.statut,
                "service_type": "examen",
            })
    else:
        for item in by_category["examen"]:
            echeances_out.append({
                "rubric": "Droit & Frais d'Examen Officiel",
                "amount": item["montant"],
                "paid": item["montant"],
                "rest": 0.0,
                "mode": item["mode"],
                "service_type": "examen",
            })

    # Achats de Tenues, Kits & Fournitures scolaires
    for item in by_category.get("uniforme", []) + by_category.get("kits", []):
        raw_type = (item.get("type") or "").lower()
        if "uniforme" in raw_type or "tenue" in raw_type or "polo" in raw_type:
            label = "Tenue Scolaire & Uniforme"
        elif "kit" in raw_type:
            label = "Kit Scolaire & Fournitures"
        else:
            label = "Achats Divers & Fournitures"
        echeances_out.append({
            "rubric": label,
            "amount": item["montant"],
            "paid": item["montant"],
            "rest": 0.0,
            "mode": item["mode"],
            "service_type": "kits_achats",
            "date_paye": item["date"],
        })

    # Frais Divers & Cours
    for item in by_category.get("frais_divers", []):
        raw_type = (item.get("type") or "").lower()
        if "anglais" in raw_type:
            label = "Cours d'Anglais"
        elif "informatique" in raw_type:
            label = "Cours d'Informatique"
        else:
            label = "Frais Divers & Activités"
        echeances_out.append({
            "rubric": label,
            "amount": item["montant"],
            "paid": item["montant"],
            "rest": 0.0,
            "mode": item["mode"],
            "service_type": "frais_divers",
            "date_paye": item["date"],
        })

    for item in by_category.get("autres", []):
        echeances_out.append({
            "rubric": item.get("type") or "Autre règlement",
            "amount": item["montant"],
            "paid": item["montant"],
            "rest": 0.0,
            "mode": item["mode"],
            "service_type": "autres",
            "date_paye": item["date"],
        })

    cantine_du_eff = total_cantine_due if has_cantine_sub else total_cantine_payee
    cantine_reste_eff = cantine_reste if has_cantine_sub else 0.0

    transport_du_eff = total_transport_due if has_transport_sub else total_transport_payee
    transport_reste_eff = transport_reste if has_transport_sub else 0.0

    total_du_global = (
        total_du
        + cantine_du_eff
        + transport_du_eff
        + float(totaux_category["examen"])
        + float(totaux_category["kits"])
        + float(totaux_category["uniforme"])
        + float(totaux_category["frais_divers"])
        + float(totaux_category["autres"])
        + float(totaux_category["arriere"])
    )
    total_verse_global = float(total_general)
    total_reste_global = max(0.0, solde_impaye + cantine_reste_eff + transport_reste_eff)
    total_a_recouvrer = total_reste_global + arrieres

    return {
        "recu_numero": f"RECAP-PAY-{student.matricule}-{now_abidjan().strftime('%Y%m%d')}",
        "date_emission": now_abidjan().strftime("%d/%m/%Y %H:%M"),
        "ecole": {
            "nom": ecole.ET_DENOMMINATION if ecole else "GROUPE SCOLAIRE HÎNNEH BIABOU",
            "code": ecole.ET_CODEETABLISSEMENT if ecole else "010023",
            "ville": ecole.ET_VILLE if ecole else "Abidjan",
            "contacts": ecole.ET_CONTACTS if ecole else "07 07 00 00 00 / 01 01 00 00 00",
            "logo": getattr(ecole, 'LOGO', None)
        },
        "eleve": {
            "id": student.id,
            "matricule": student.matricule,
            "nom": student.nom,
            "prenom": student.prenom,
            "classe": classe_obj.CE_LIBELLE if classe_obj else (student.AU_CLASSEPRECEDENTE or "Non affecté"),
            "regime": getattr(student, 'regime', 'Non-boursier') or 'Non-boursier',
            "lieu_habitation": lieu_hab,
            "tuteur_nom": student.AU_TUTEURLEGAL or student.AU_PERENOMPRENOMS or student.AU_MERENOMPRENOMS or "N/A",
            "tuteur_contact": student.AU_TUTEURLEGALCONTACTS or student.AU_PERECONTACTS or student.AU_MERECONTACTS or "N/A",
        },
        "synthese_financiere": {
            "scolarite_due": total_du,
            "scolarite_versee": total_verse_scolarite,
            "scolarite_solde": solde_impaye,
            "cantine_due": cantine_du_eff,
            "cantine_versee": total_cantine_payee,
            "cantine_solde": cantine_reste_eff,
            "transport_due": transport_du_eff,
            "transport_versee": total_transport_payee,
            "transport_solde": transport_reste_eff,
            "total_du": total_du_global,
            "total_du_global": total_du_global,
            "total_verse": total_verse_global,
            "total_verse_global": total_verse_global,
            "solde_impaye": total_reste_global,
            "solde_global": total_reste_global,
            "arrieres_anterieurs": arrieres,
            "total_reste_a_recouvrer": total_a_recouvrer,
            "statut_financier": "À jour" if total_a_recouvrer <= 0 else ("Arriérés / Impayés en cours" if arrieres > 0 else "Solde partiel")
        },
        "ventilations": {
            "arriere": {
                "subtotal": float(totaux_category["arriere"]),
                "items": by_category["arriere"]
            },
            "frais_annexe": {
                "subtotal": float(totaux_category["frais_annexe"]),
                "items": by_category["frais_annexe"]
            },
            "frais_inscription": {
                "subtotal": float(totaux_category["frais_inscription"]),
                "items": by_category["frais_inscription"]
            },
            "inscription": {
                "subtotal": float(totaux_category["inscription"]),
                "items": by_category["inscription"]
            },
            "scolarite": {
                "subtotal": float(totaux_category["scolarite"]),
                "items": by_category["scolarite"]
            },
            "cantine": {
                "subtotal": float(totaux_category["cantine"]),
                "items": by_category["cantine"]
            },
            "transport": {
                "subtotal": float(totaux_category["transport"]),
                "items": by_category["transport"]
            },
            "examen": {
                "subtotal": float(totaux_category["examen"]),
                "items": by_category["examen"]
            },
            "kits": {
                "subtotal": float(totaux_category["kits"]),
                "items": by_category["kits"]
            },
            "uniforme": {
                "subtotal": float(totaux_category["uniforme"]),
                "items": by_category["uniforme"]
            },
            "frais_divers": {
                "subtotal": float(totaux_category["frais_divers"]),
                "items": by_category["frais_divers"]
            },
            "autres": {
                "subtotal": float(totaux_category["autres"]),
                "items": by_category["autres"]
            }
        },
        "total_general": float(total_general),
        "nb_paiements_total": len(paiements),
        "echeances": echeances_out,
        # Traçabilité du barème appliqué aux lignes de scolarité :
        #   echeancier_eleve  -> les tranches enregistrées pour l'élève (api_echeancier).
        #                        La grille n'est pas relue : il faut réaligner l'élève
        #                        pour qu'une grille modifiée soit répercutée.
        #   grille_tarifaire  -> la grille configurée par l'établissement.
        #   bareme_officiel   -> aucune grille ne couvre cette classe : barème de repli.
        "source_scolarite": source_scolarite,
        "grille_label": grid_label,
    }

