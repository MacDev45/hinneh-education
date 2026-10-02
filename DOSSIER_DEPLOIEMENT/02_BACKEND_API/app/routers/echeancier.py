from email import errors
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_
from typing import List, Optional, Dict, Any, Tuple
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
import json
import re
import io
import copy
from pydantic import BaseModel

from ..database import get_db
from .. import crud, schemas, models
from ..routers.auth import get_school_scope, SchoolScope
from .students import _normalize_header, _parse_uploaded_file, _map_statut_orientation_to_tarif
from .reductions import apply_pending_reductions_for_student


def _parse_pdf_impayes(contents: bytes) -> Tuple[List[str], List[Dict[str, Any]]]:
    """Extrait le tableau des impayés depuis un PDF (format HINNEH)."""
    try:
        # pyrefly: ignore [missing-import]
        import pdfplumber
    except ImportError:
        raise ValueError("La librairie pdfplumber est requise pour lire les PDF. Installez-la avec : pip install pdfplumber")

    raw_headers = ["matricule", "nom", "classe", "statut", "montant_du", "montant_paye", "montant_impaye"]
    data_rows: List[Dict[str, Any]] = []

    with pdfplumber.open(io.BytesIO(contents)) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    if not row or not any(row):
                        continue
                    # Ignorer les lignes d'en-tête et les lignes vides
                    first_cell = str(row[0] or "").strip()
                    if not first_cell or not first_cell.isdigit():
                        continue

                    # Nettoyer les cellules
                    cells = [str(c or "").strip() for c in row]

                    # Le tableau PDF a la structure : N°, Matricule, Nom, Classe(avec \n), Statut, None, Montant à payer, Montant versé, Solde restant
                    # Mais certaines lignes peuvent avoir des colonnes décalées ; on utilise une approche robuste
                    matricule = cells[1] if len(cells) > 1 else ""
                    nom = cells[2] if len(cells) > 2 else ""
                    classe_raw = cells[3].replace("\n", " ") if len(cells) > 3 else ""
                    statut = cells[4] if len(cells) > 4 else ""

                    # Les montants sont dans les dernières colonnes non vides
                    montants_str = [c for c in cells[5:] if c and re.search(r'\d', c)]
                    montant_du = montants_str[0] if len(montants_str) > 0 else ""
                    montant_paye = montants_str[1] if len(montants_str) > 1 else ""
                    montant_impaye = montants_str[2] if len(montants_str) > 2 else ""

                    if not matricule:
                        continue

                    data_rows.append({
                        "matricule": matricule,
                        "nom": nom,
                        "classe": classe_raw,
                        "statut": statut,
                        "montant_du": montant_du,
                        "montant_paye": montant_paye,
                        "montant_impaye": montant_impaye,
                    })

    return raw_headers, data_rows

router = APIRouter(
    prefix="/echeanciers",
    tags=["échéancier"]
)

# ----------------- IMPORT DES IMPAYÉS -----------------

# Chaque libellé de colonne accepté est ramené à un champ interne
IMPAYES_COLUMN_MAP: Dict[str, str] = {
    "matricule": "matricule",
    "matricule eleve": "matricule",
    "nom": "nom",
    "prenom": "prenom",
    "prenoms": "prenom",
    "libelle": "libelle",
    "tranche": "libelle",
    "libelle tranche": "libelle",
    "numero tranche": "tranche_numero",
    "tranche numero": "tranche_numero",
    "montant du": "montant_du",
    "montant prevu": "montant_du",
    "montant attendu": "montant_du",
    "montant a payer": "montant_du",
    "montant paye": "montant_paye",
    "montant regle": "montant_paye",
    "montant impaye": "montant_impaye",
    "reste a payer": "montant_impaye",
    "solde restant": "montant_impaye",
    "impaye": "montant_impaye",
    "date echeance": "date_echeance",
    "date limite": "date_echeance",
    "annee scolaire": "annee_scolaire",
    "observation": "remarque",
    "remarque": "remarque",
    # "montant_a_paye": "montant_du",
    "montant verse": "montant_paye",
    # "solde_restant": "montant_impaye",
}


def _parse_montant(valeur: Any) -> Optional[Decimal]:
    """Convertit un montant écrit librement (1 000, 1.000,50, 1200 FCFA) en Decimal."""
    if valeur is None:
        return None
    texte = str(valeur).strip()
    if not texte:
        return None
    texte = texte.replace("\u00a0", "").replace(" ", "")
    for devise in ("FCFA", "XOF", "CFA", "F"):
        texte = texte.replace(devise, "").replace(devise.lower(), "")
    if "," in texte and "." in texte:
        texte = texte.replace(".", "").replace(",", ".")
    elif "," in texte:
        texte = texte.replace(",", ".")
    try:
        return Decimal(texte)
    except (InvalidOperation, ValueError):
        return None


def _parse_date_echeance(valeur: Any) -> Optional[date]:
    """Accepte les formats JJ/MM/AAAA, AAAA-MM-JJ et JJ-MM-AAAA."""
    if valeur is None:
        return None
    texte = str(valeur).strip()
    if not texte:
        return None
    texte = texte.split(" ")[0]
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%y", "%Y/%m/%d"):
        try:
            return datetime.strptime(texte, fmt).date()
        except ValueError:
            continue
    return None


def _statut_echeance(montant_prevu: Decimal, montant_paye: Decimal, date_echeance: date) -> str:
    if montant_paye >= montant_prevu and montant_prevu > 0:
        return "paye"
    if date_echeance and date_echeance < date.today():
        return "en_retard"
    if montant_paye > 0:
        return "partiel"
    return "non_paye"


def _recalculer_solde_eleve(db: Session, eleve: models.Eleve) -> None:
    """Réaligne les totaux du compte élève sur la somme de ses tranches de scolarité uniquement."""
    total_paye = db.query(func.coalesce(func.sum(models.EcheancierPaiement.montant_paye), 0)).filter(
        models.EcheancierPaiement.eleve_id == eleve.id,
        models.EcheancierPaiement.service_type.in_(["scolarite", "frais_inscription", "frais_annexe", "inscription"])
    ).scalar() or Decimal("0.00")
    total_prevu = db.query(func.coalesce(func.sum(models.EcheancierPaiement.montant_prevu), 0)).filter(
        models.EcheancierPaiement.eleve_id == eleve.id,
        models.EcheancierPaiement.service_type.in_(["scolarite", "frais_inscription", "frais_annexe", "inscription"])
    ).scalar() or Decimal("0.00")

    if total_prevu > 0:
        eleve.AU_SCOLARITE = Decimal(str(total_prevu))
    eleve.AU_TOTALDEPOT = Decimal(str(total_paye))
    eleve.AU_SOLDECOMPTE = max(Decimal("0.00"), Decimal(str(eleve.AU_SCOLARITE or Decimal("0.00"))) - Decimal(str(total_paye)))
    eleve.solde = eleve.AU_SOLDECOMPTE


@router.post("/import-impayes")
def import_impayes(
    file: UploadFile = File(...),
    annee_scolaire: str = Query("2026-2027"),
    db: Session = Depends(get_db),
):
    """Importe les impayés : crée ou met à jour les tranches et les soldes restants dus.

    Le fichier peut indiquer soit le montant déjà payé, soit le montant impayé :
    le second est déduit du premier lorsqu'il est absent.
    """
    nom_fichier = (file.filename or "").lower()
    if not nom_fichier.endswith((".csv", ".xlsx", ".xls", ".pdf")):
        raise HTTPException(status_code=400, detail="Le fichier doit être au format Excel (.xlsx, .xls), CSV (.csv) ou PDF (.pdf)")

    try:
        if nom_fichier.endswith(".pdf"):
            contents = file.file.read()
            raw_headers, data_rows = _parse_pdf_impayes(contents)
        else:
            raw_headers, data_rows = _parse_uploaded_file(file)
    except ValueError as exc:
        print(str(exc))
        return {"success": False, "imported": 0, "updated": 0, "errors": [str(exc)]}

    if not raw_headers:
        return {"success": False, "imported": 0, "updated": 0, "errors": ["Aucune colonne détectée dans le fichier."]}

    # En-têtes du fichier -> champs internes
    correspondances: Dict[str, str] = {}
    for entete in raw_headers:
        champ = IMPAYES_COLUMN_MAP.get(_normalize_header(entete))
        if champ:
            correspondances[entete] = champ

    champs_detectes = set(correspondances.values())
    if "matricule" not in champs_detectes:
        return {
            "success": False,
            "imported": 0,
            "updated": 0,
            "errors": [f"Colonne requise manquante : matricule. Colonnes détectées : {', '.join(raw_headers[:12])}."],
        }
    if not ({"montant_du", "montant_impaye"} & champs_detectes):
        return {
            "success": False,
            "imported": 0,
            "updated": 0,
            "errors": ["Colonne requise manquante : montant_du (ou montant_impaye)."],
        }

    imported_count = 0
    updated_count = 0
    errors: List[str] = []
    eleves_touches: Dict[int, models.Eleve] = {}
    total_impaye = Decimal("0.00")

    for index, ligne in enumerate(data_rows, start=2):
        valeurs: Dict[str, Any] = {}
        for entete, champ in correspondances.items():
            valeur = ligne.get(entete)
            if valeur not in (None, ""):
                valeurs[champ] = valeur

        matricule = str(valeurs.get("matricule", "")).strip()
        if not matricule:
            continue

        eleve = db.query(models.Eleve).filter(models.Eleve.matricule == matricule).first()
        if not eleve:
            eleve = db.query(models.Eleve).filter(
                or_(
                    models.Eleve.matricule.ilike(f"%{matricule}"),
                    models.Eleve.matricule.ilike(f"%{matricule}%")
                )
            ).first()

        if not eleve:
            # Auto-création de l'élève s'il n'existe pas encore dans la base de données
            nom_eleve = str(valeurs.get("nom", "")).strip() or "Élève"
            prenom_eleve = str(valeurs.get("prenom", "")).strip() or f"Matricule {matricule}"
            classe = db.query(models.Classe).filter(models.Classe.id == str(valeurs.get("classe_id", "")).strip()).first()
            eleve = models.Eleve(
                matricule=matricule,
                nom=nom_eleve,
                prenom=prenom_eleve,
                date_naissance=date(2010, 1, 1),
                genre="M",
                ecole_id=classe.ecole_id,
                statut="actif",
                solde=Decimal("0.00"),
                AU_SCOLARITE=Decimal("0.00"),
                AU_TOTALDEPOT=Decimal("0.00"),
                AU_SOLDECOMPTE=Decimal("0.00")
            )
            db.add(eleve)
            db.flush()

        # montant_du = _parse_montant(valeurs.get("montant_du"))
        # montant_paye = _parse_montant(valeurs.get("montant_paye"))
        # montant_impaye = _parse_montant(valeurs.get("montant_impaye"))

        # if montant_du is None and montant_impaye is not None:
        #     montant_du = montant_impaye + (montant_paye or Decimal("0.00"))
        # if montant_du:
        #     errors.append(f"Ligne {index} ({matricule}) : montant dû illisible ou absent.")
        #     continue
        # if montant_du < 0:
        #     errors.append(f"Ligne {index} ({matricule}) : le montant dû ne peut être négatif.")
        #     continue

        # if montant_paye is None:
        #     montant_paye = max(Decimal("0.00"), montant_du - montant_impaye) if montant_impaye is not None else Decimal("0.00")
        # if montant_paye > montant_du:
        #     errors.append(f"Ligne {index} ({matricule}) : montant payé supérieur au montant dû.")
        #     continue


        montant_du = _parse_montant(valeurs.get("montant_du"))
        montant_paye = _parse_montant(valeurs.get("montant_paye"))
        montant_impaye = _parse_montant(valeurs.get("montant_impaye"))

        # Si le montant dû est absent mais que le solde restant est connu,
        # on le reconstitue.
        if montant_du is None and montant_impaye is not None:
            montant_du = montant_impaye + (montant_paye or Decimal("0.00"))

        # Vérification du montant dû
        if montant_du is None:
            errors.append(
                f"Ligne {index} ({matricule}) : montant dû illisible ou absent."
            )
            continue

        if montant_du < Decimal("0.00"):
            errors.append(
                f"Ligne {index} ({matricule}) : le montant dû ne peut être négatif."
            )
            continue

        # Détermination du montant payé si absent
        if montant_paye is None:
            montant_paye = (
                max(Decimal("0.00"), montant_du - montant_impaye)
                if montant_impaye is not None
                else Decimal("0.00")
            )

        # Détermination du montant impayé si absent
        if montant_impaye is None:
            montant_impaye = max(Decimal("0.00"), montant_du - montant_paye)

        # Vérification : montant payé <= montant dû
        if montant_paye > montant_du:
            errors.append(
                f"Ligne {index} ({matricule}) : montant payé supérieur au montant dû."
            )
            continue

        # Vérification : montant payé + montant impayé <= montant dû
        if montant_paye + montant_impaye > montant_du:
            errors.append(
                f"Ligne {index} ({matricule}) : la somme du montant payé et du solde restant dépasse le montant total à payer."
            )
            continue

        libelle = str(valeurs.get("libelle", "")).strip() or "Solde antérieur"
        annee = str(valeurs.get("annee_scolaire", "")).strip() or annee_scolaire
        date_echeance = _parse_date_echeance(valeurs.get("date_echeance")) or date.today()

        numero = valeurs.get("tranche_numero")
        try:
            tranche_numero = int(float(str(numero))) if numero not in (None, "") else 1
        except (TypeError, ValueError):
            tranche_numero = 1

        try:
            echeance = db.query(models.EcheancierPaiement).filter(
                models.EcheancierPaiement.eleve_id == eleve.id,
                models.EcheancierPaiement.libelle == libelle,
                models.EcheancierPaiement.annee_scolaire == annee,
            ).first()

            if echeance:
                echeance.montant_prevu = montant_du
                echeance.montant_paye = montant_paye
                echeance.date_echeance = date_echeance
                echeance.tranche_numero = tranche_numero
                echeance.statut = _statut_echeance(montant_du, montant_paye, date_echeance)
                if valeurs.get("remarque"):
                    echeance.remarque = str(valeurs["remarque"]).strip()
                updated_count += 1
            else:
                echeance = models.EcheancierPaiement(
                    eleve_id=eleve.id,
                    ecole_id=eleve.ecole_id,
                    ET_CODEETABLISSEMENT=eleve.ET_CODEETABLISSEMENT,
                    libelle=libelle,
                    tranche_numero=tranche_numero,
                    montant_prevu=montant_du,
                    montant_paye=montant_paye,
                    date_echeance=date_echeance,
                    statut=_statut_echeance(montant_du, montant_paye, date_echeance),
                    remarque=str(valeurs["remarque"]).strip() if valeurs.get("remarque") else "Import des impayés",
                    annee_scolaire=annee,
                )
                db.add(echeance)
                imported_count += 1
            db.flush()
            eleves_touches[eleve.id] = eleve
            total_impaye += max(Decimal("0.00"), montant_du - montant_paye)
        except Exception as exc:
            db.rollback()
            errors.append(f"Ligne {index} ({matricule}) : {exc}")

    for eleve in eleves_touches.values():
        _recalculer_solde_eleve(db, eleve)

    db.commit()

    return {
        "success": len(errors) == 0 and (imported_count + updated_count) > 0,
        "imported": imported_count,
        "updated": updated_count,
        "eleves_concernes": len(eleves_touches),
        "total_impaye": float(total_impaye),
        "errors": errors,
    }


# ----------------- GESTION DE LA TABLE API_IMPAYE -----------------
def sync_impayes_data(annee_scolaire: str = "2025-2026", db: Session = None, code_etablissement: Optional[str] = None):
    query_eleves = db.query(models.Eleve)
    if code_etablissement:
        query_eleves = query_eleves.filter(models.Eleve.ET_CODEETABLISSEMENT == code_etablissement)
    eleves = query_eleves.all()
    count = 0
    for eleve in eleves:
        solde = Decimal(str(eleve.AU_SOLDECOMPTE or 0))
        scolarite = Decimal(str(eleve.AU_SCOLARITE or 120000))
        paye = Decimal(str(eleve.AU_TOTALDEPOT or 0))
        if solde <= 0 and scolarite > 0 and paye >= scolarite:
            solde = Decimal("0.00")
        else:
            solde = max(Decimal("0.00"), scolarite - paye)
        
        statut = "a_jour" if solde <= 0 else ("partiel" if paye > 0 else "non_paye")
        nom_complet = f"{eleve.nom or ''} {eleve.prenom or ''}".strip()
        
        # Check if there are custom echeances for this student in api_echeancier
        custom_echs = db.query(models.EcheancierPaiement).filter(models.EcheancierPaiement.eleve_id == eleve.id).all()
        if custom_echs:
            for ech in custom_echs:
                ech_solde = max(Decimal("0.00"), Decimal(str(ech.montant_prevu or 0)) - Decimal(str(ech.montant_paye or 0)))
                ech_statut = "a_jour" if ech_solde <= 0 else ("partiel" if ech.montant_paye > 0 else "non_paye")
                
                ex_ech = db.query(models.Impaye).filter(
                    models.Impaye.eleve_id == eleve.id,
                    models.Impaye.remarque == ech.libelle
                ).first()

                if ex_ech:
                    # Le solde/statut se met toujours à jour (recouvrement réel), mais la classe et
                    # l'année ne sont réécrites QUE si cet impayé concerne l'année en cours de synchro —
                    # un impayé d'une année passée reste figé sur la classe où la dette est née.
                    if ex_ech.annee_scolaire == annee_scolaire:
                        ex_ech.matricule = eleve.matricule or f"AUTO-{eleve.id}"
                        ex_ech.nom_prenoms = nom_complet
                        ex_ech.classe_id = eleve.classe_id or 1
                    ex_ech.service_type = ech.service_type or "scolarite"
                    ex_ech.montant_a_payer = ech.montant_prevu
                    ex_ech.montant_verse = ech.montant_paye
                    ex_ech.solde_restant = ech_solde
                    ex_ech.date_echeance = ech.date_echeance
                    ex_ech.statut = ech_statut
                    ex_ech.ET_CODEETABLISSEMENT = eleve.ET_CODEETABLISSEMENT
                else:
                    db.add(models.Impaye(
                        matricule=eleve.matricule or f"AUTO-{eleve.id}",
                        nom_prenoms=nom_complet,
                        eleve_id=eleve.id,
                        classe_id=eleve.classe_id or 1,
                        service_type=ech.service_type or "scolarite",
                        montant_a_payer=ech.montant_prevu,
                        montant_verse=ech.montant_paye,
                        solde_restant=ech_solde,
                        date_echeance=ech.date_echeance,
                        statut=ech_statut,
                        remarque=ech.libelle,
                        annee_scolaire=ech.annee_scolaire or annee_scolaire,
                        ET_CODEETABLISSEMENT=eleve.ET_CODEETABLISSEMENT,
                        date_creation=datetime.utcnow()
                    ))

        # Ciblage strict sur l'année en cours de synchro : un impayé d'une autre année scolaire
        # ne doit jamais être confondu avec celui-ci, sous peine d'écraser sa classe/année d'origine.
        existing = db.query(models.Impaye).filter(
            models.Impaye.eleve_id == eleve.id,
            models.Impaye.annee_scolaire == annee_scolaire
        ).first()

        if existing:
            existing.matricule = eleve.matricule or f"AUTO-{eleve.id}"
            existing.nom_prenoms = nom_complet
            existing.classe_id = eleve.classe_id or 1
            existing.ET_CODEETABLISSEMENT = eleve.ET_CODEETABLISSEMENT
            if not existing.service_type or existing.service_type == "scolarite":
                existing.montant_a_payer = scolarite
                existing.montant_verse = paye
                existing.solde_restant = solde
                existing.statut = statut
        else:
            new_impaye = models.Impaye(
                matricule=eleve.matricule or f"AUTO-{eleve.id}",
                nom_prenoms=nom_complet,
                eleve_id=eleve.id,
                classe_id=eleve.classe_id or 1,
                service_type="scolarite",
                montant_a_payer=scolarite,
                montant_verse=paye,
                solde_restant=solde,
                date_echeance=datetime.utcnow().date(),
                statut=statut,
                annee_scolaire=annee_scolaire,
                ET_CODEETABLISSEMENT=eleve.ET_CODEETABLISSEMENT,
                date_creation=datetime.utcnow()
            )
            db.add(new_impaye)
        count += 1
    
    db.commit()
    return {"success": True, "count": count, "message": f"{count} impayés synchronisés dans la table api_impaye."}


@router.get("/impayes", response_model=List[schemas.ImpayeResponse])
def get_impayes_from_table(
    annee_scolaire: Optional[str] = Query(None),
    auto_sync: bool = Query(True),
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    def _query():
        q = db.query(models.Impaye)
        if annee_scolaire:
            q = q.filter(models.Impaye.annee_scolaire == annee_scolaire)
        if scope.code_etablissement:
            q = q.filter(or_(
                models.Impaye.ET_CODEETABLISSEMENT == scope.code_etablissement,
                models.Impaye.eleve_id.in_(db.query(models.Eleve.id).filter(models.Eleve.ET_CODEETABLISSEMENT == scope.code_etablissement))
            ))
        elif scope.ecole_id is not None:
            q = q.filter(models.Impaye.eleve_id.in_(db.query(models.Eleve.id).filter(models.Eleve.ecole_id == scope.ecole_id)))
        return q.all()

    impayes = _query()
    if not impayes and auto_sync:
        sync_impayes_data(annee_scolaire=annee_scolaire or "2025-2026", db=db, code_etablissement=scope.code_etablissement)
        impayes = _query()
    return impayes


@router.get("/impayes-table", response_model=List[schemas.ImpayeResponse])
def get_impayes_table_route(
    annee_scolaire: Optional[str] = Query(None),
    auto_sync: bool = Query(True),
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    return get_impayes_from_table(annee_scolaire=annee_scolaire, auto_sync=auto_sync, db=db, scope=scope)


@router.post("/impayes-sync")
def sync_impayes_table(
    annee_scolaire: str = Query("2025-2026"),
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    return sync_impayes_data(annee_scolaire=annee_scolaire, db=db, code_etablissement=scope.code_etablissement)

# ----------------- HINNEH OFFICIAL TARIFF PRESETS (2026-2027) -----------------
HINNEH_OFFICIAL_PRESETS = {
    # Maternelle
    "maternelle_mps": {
        "id": "maternelle_mps",
        "label": "Maternelle MPS (200 100 FCFA)",
        "cycle": "Maternelle",
        "niveaux": ["MPS"],
        "total": 200100,
        "tranches": [
            {"libelle": "1er vers. 05 sept.", "montant": 50000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 40000, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 30000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc.", "montant": 30000, "date": "2026-12-05"},
            {"libelle": "5ème vers. 05 jan.", "montant": 30000, "date": "2027-01-05"},
            {"libelle": "6ème vers. 05 fév. (Solde)", "montant": 20100, "date": "2027-02-05"},
        ]
    },
    "maternelle_mms": {
        "id": "maternelle_mms",
        "label": "Maternelle MMS (167 100 FCFA)",
        "cycle": "Maternelle",
        "niveaux": ["MMS"],
        "total": 167100,
        "tranches": [
            {"libelle": "1er vers. 05 sept.", "montant": 50000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 25500, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 25000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc.", "montant": 23300, "date": "2026-12-05"},
            {"libelle": "5ème vers. 05 jan.", "montant": 22300, "date": "2027-01-05"},
            {"libelle": "6ème vers. 05 fév. (Solde)", "montant": 21000, "date": "2027-02-05"},
        ]
    },
    "maternelle_mgs": {
        "id": "maternelle_mgs",
        "label": "Maternelle MGS (200 100 FCFA)",
        "cycle": "Maternelle",
        "niveaux": ["MGS"],
        "total": 200100,
        "tranches": [
            {"libelle": "1er vers. 05 sept.", "montant": 50000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 40000, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 30000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc.", "montant": 30000, "date": "2026-12-05"},
            {"libelle": "5ème vers. 05 jan.", "montant": 30000, "date": "2027-01-05"},
            {"libelle": "6ème vers. 05 fév. (Solde)", "montant": 20100, "date": "2027-02-05"},
        ]
    },

    # Primaire
    "primaire_cp1_cp2": {
        "id": "primaire_cp1_cp2",
        "label": "Primaire CP1 & CP2 (195 500 FCFA)",
        "cycle": "Primaire",
        "niveaux": ["CP1", "CP2"],
        "total": 195500,
        "tranches": [
            {"libelle": "1er vers. 05 sept.", "montant": 50000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 43500, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 31000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc.", "montant": 26000, "date": "2026-12-05"},
            {"libelle": "5ème vers. 05 jan.", "montant": 25000, "date": "2027-01-05"},
            {"libelle": "6ème vers. 05 fév. (Solde)", "montant": 20000, "date": "2027-02-05"},
        ]
    },
    "primaire_ce1_ce2": {
        "id": "primaire_ce1_ce2",
        "label": "Primaire CE1 & CE2 (200 500 FCFA)",
        "cycle": "Primaire",
        "niveaux": ["CE1", "CE2"],
        "total": 200500,
        "tranches": [
            {"libelle": "1er vers. 05 sept.", "montant": 50000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 40500, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 30000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc.", "montant": 30000, "date": "2026-12-05"},
            {"libelle": "5ème vers. 05 jan.", "montant": 25000, "date": "2027-01-05"},
            {"libelle": "6ème vers. 05 fév. (Solde)", "montant": 25000, "date": "2027-02-05"},
        ]
    },
    "primaire_cm1": {
        "id": "primaire_cm1",
        "label": "Primaire CM1 (205 500 FCFA)",
        "cycle": "Primaire",
        "niveaux": ["CM1"],
        "total": 205500,
        "tranches": [
            {"libelle": "1er vers. 05 sept.", "montant": 50000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 40500, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 35000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc.", "montant": 30000, "date": "2026-12-05"},
            {"libelle": "5ème vers. 05 jan.", "montant": 25000, "date": "2027-01-05"},
            {"libelle": "6ème vers. 05 fév. (Solde)", "montant": 25000, "date": "2027-02-05"},
        ]
    },
    "primaire_cm2": {
        "id": "primaire_cm2",
        "label": "Primaire CM2 (220 500 FCFA)",
        "cycle": "Primaire",
        "niveaux": ["CM2"],
        "total": 220500,
        "tranches": [
            {"libelle": "1er vers. 05 sept.", "montant": 50000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 50500, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 45000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc.", "montant": 35000, "date": "2026-12-05"},
            {"libelle": "5ème vers. 05 jan.", "montant": 20000, "date": "2027-01-05"},
            {"libelle": "6ème vers. 05 fév. (Solde)", "montant": 20000, "date": "2027-02-05"},
        ]
    },

    # Inscription 6ème (CM2 HÎnneh) AFFECTÉS
    "inscription_6eme_cm2_aff": {
        "id": "inscription_6eme_cm2_aff",
        "label": "Inscription 6ème(CM2 HÎnneh) (150 000 FCFA) AFFECTÉS",
        "cycle": "Collège",
        "niveaux": ["6ème"],
        "total": 150000,
        "tranches": [
            {"libelle": "1er vers. 05 sept.", "montant": 62000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 30000, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 20000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc.", "montant": 20000, "date": "2026-12-05"},
            {"libelle": "5ème vers. 05 jan. (Solde)", "montant": 18000, "date": "2027-01-05"},
        ]
    },

    # Inscription 6ème (Admis Test HÎnneh) AFFECTÉS
    "inscription_6eme_admis_test_aff": {
        "id": "inscription_6eme_admis_test_aff",
        "label": "Inscription 6ème(Admis Test HÎnneh) (200 000 FCFA) AFFECTÉS",
        "cycle": "Collège",
        "niveaux": ["6ème"],
        "total": 200000,
        "tranches": [
            {"libelle": "1er vers. 05 sept.", "montant": 50000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 50000, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 30000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc.", "montant": 30000, "date": "2026-12-05"},
            {"libelle": "5ème vers. 05 jan.", "montant": 25000, "date": "2027-01-05"},
            {"libelle": "6ème vers. 05 fév. (Solde)", "montant": 15000, "date": "2027-02-05"},
        ]
    },

    # Inscription 6ème (Non Admis Test HÎnneh) AFFECTÉS
    "inscription_6eme_non_admis_test_aff": {
        "id": "inscription_6eme_non_admis_test_aff",
        "label": "Inscription 6ème(Non Admis Test HÎnneh) (265 000 FCFA) AFFECTÉS",
        "cycle": "Collège",
        "niveaux": ["6ème"],
        "total": 265000,
        "tranches": [
            {"libelle": "1er vers. 05 sept.", "montant": 62000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 53000, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 50000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc.", "montant": 50000, "date": "2026-12-05"},
            {"libelle": "5ème vers. 05 jan. (Solde)", "montant": 50000, "date": "2027-01-05"},
        ]
    },

    # Inscription 6ème (Sans Test HÎnneh) AFFECTÉS
    "inscription_6eme_sans_test_aff": {
        "id": "inscription_6eme_sans_test_aff",
        "label": "Inscription 6ème(Sans Test HÎnneh) (265 000 FCFA) AFFECTÉS",
        "cycle": "Collège",
        "niveaux": ["6ème"],
        "total": 265000,
        "tranches": [
            {"libelle": "1er vers. 05 sept.", "montant": 62000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 53000, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 50000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc.", "montant": 50000, "date": "2026-12-05"},
            {"libelle": "5ème vers. 05 jan. (Solde)", "montant": 50000, "date": "2027-01-05"},
        ]
    },

    # Réinscription de la 6ème Redoublants AFFECTÉS
    "reinscription_6eme_redoublant_aff": {
        "id": "reinscription_6eme_redoublant_aff",
        "label": "Réinscription 6ème(Redoublants HÎnneh) (150 000 FCFA) AFFECTÉS",
        "cycle": "Collège",
        "niveaux": ["6ème"],
        "total": 150000,
        "tranches": [
            {"libelle": "1er vers. 05 sept.", "montant": 62000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 35000, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 23000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc.", "montant": 15000, "date": "2026-12-05"},
            {"libelle": "5ème vers. 05 jan. (Solde)", "montant": 15000, "date": "2027-01-05"},
        ]
    },

    # Réinscription de la 5ème C, D AFFECTÉS
    "reinscription_5eme_c_d_aff": {
        "id": "reinscription_5eme_c_d_aff",
        "label": "Réinscription 5è C & 5è D (157 000 FCFA) AFFECTÉS",
        "cycle": "Collège",
        "niveaux": ["5è C", "5è D"],
        "total": 157000,
        "tranches": [
            {"libelle": "1er vers. 05 sept.", "montant": 69000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 35000, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 23000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc.", "montant": 15000, "date": "2026-12-05"},
            {"libelle": "5ème vers. 05 jan. (Solde)", "montant": 15000, "date": "2027-01-05"},
        ]
    },
    
    # Réinscription de la 5ème AFFECTÉS
    "reinscription_5eme_aff": {
        "id": "reinscription_5eme_aff",
        "label": "Réinscription 5ème (150 000 FCFA) AFFECTÉS",
        "cycle": "Collège",
        "niveaux": ["5ème"],
        "total": 150000,
        "tranches": [
            {"libelle": "1er vers. 05 sept.", "montant": 62000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 35000, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 23000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc.", "montant": 15000, "date": "2026-12-05"},
            {"libelle": "5ème vers. 05 jan. (Solde)", "montant": 15000, "date": "2027-01-05"},
        ]
    },
    
    # Réinscription de la 4ème AFFECTÉS
    "reinscription_4eme_aff": {
        "id": "reinscription_4eme_aff",
        "label": "Réinscription 4ème (150 000 FCFA) AFFECTÉS",
        "cycle": "Collège",
        "niveaux": ["4ème"],
        "total": 150000,
        "tranches": [
            {"libelle": "1er vers. 05 sept.", "montant": 62000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 35000, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 23000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc.", "montant": 15000, "date": "2026-12-05"},
            {"libelle": "5ème vers. 05 jan. (Solde)", "montant": 15000, "date": "2027-01-05"},
        ]
    },

    # Réinscription de la 4ème C, D AFFECTÉS
    "reinscription_4eme_c_d_aff": {
        "id": "reinscription_4eme_c_d_aff",
        "label": "Réinscription 4è C & 4è D (157 000 FCFA) AFFECTÉS",
        "cycle": "Collège",
        "niveaux": ["4è C", "4è D"],
        "total": 157000,
        "tranches": [
            {"libelle": "1er vers. 05 sept.", "montant": 69000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 35000, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 23000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc.", "montant": 15000, "date": "2026-12-05"},
            {"libelle": "5ème vers. 05 jan. (Solde)", "montant": 15000, "date": "2027-01-05"},
        ]
    },

    # Réinscription de la 3ème AFFECTÉS
    "reinscription_3eme_aff": {
        "id": "reinscription_3eme_aff",
        "label": "Réinscription 3ème (220 000 FCFA) AFFECTÉS",
        "cycle": "Collège",
        "niveaux": ["3ème"],
        "total": 220000,
        "tranches": [
            {"libelle": "1er vers. 05 sept.", "montant": 67000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 50000, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 40000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc.", "montant": 33000, "date": "2026-12-05"},
            {"libelle": "5ème vers. 05 jan. (Solde)", "montant": 30000, "date": "2027-01-05"},
        ]
    },

    # Réinscription de la 2nde AFFECTÉS
    "reinscription_2nde_aff": {
        "id": "reinscription_2nde_aff",
        "label": "Réinscription 2nde (200 600 FCFA) AFFECTÉS",
        "cycle": "Collège 2nd cycle (Affectés)",
        "niveaux": ["2nde"],
        "total": 200600,
        "tranches": [
            {"libelle": "1er vers. 05 sept.", "montant": 62000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 40600, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 30000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc.", "montant": 28000, "date": "2026-12-05"},
            {"libelle": "5ème vers. 05 jan.", "montant": 20000, "date": "2027-01-05"},
            {"libelle": "6ème vers. 05 fév. (Solde)", "montant": 20000, "date": "2027-02-05"},
        ]
    },

    # Réinscription de la 1ere A, C, D (Anciens) AFFECTÉS
    "reinscription_1ere_a_c_d_anciens_aff": {
        "id": "reinscription_1ere_a_c_d_anciens_aff",
        "label": "Réinscription 1ère A, C, D (Anciens) (175 000 FCFA) AFFECTÉS",
        "cycle": "Collège 2nd cycle (Affectés)",
        "niveaux": ["1ère A", "1ère C", "1ère D"],
        "total": 175000,
        "tranches": [
            {"libelle": "1er vers. 05 sept.", "montant": 62000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 45000, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 35000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc. (Solde)", "montant": 33000, "date": "2026-12-05"},
        ]
    },

    # Réinscription de la 1ere A, C, D (Nouveaux) AFFECTÉS
    "reinscription_1ere_a_c_d_nouveaux_aff": {
        "id": "reinscription_1ere_a_c_d_nouveaux_aff",
        "label": "Réinscription 1ère A, C, D (Nouveaux) (200 000 FCFA) AFFECTÉS",
        "cycle": "Collège 2nd cycle (Affectés)",
        "niveaux": ["1ère A", "1ère C", "1ère D"],
        "total": 200000,
        "tranches": [
            {"libelle": "1er vers. 05 sept.", "montant": 62000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 50000, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 45000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc. (Solde)", "montant": 43000, "date": "2026-12-05"},
        ]
    },

    # Réinscription de la Tle A, C, D AFFECTÉS
    "reinscription_tle_a_c_d_aff": {
        "id": "reinscription_tle_a_c_d_aff",
        "label": "Réinscription Tle A, C, D (250 000 FCFA) AFFECTÉS",
        "cycle": "Collège 2nd cycle (Affectés)",
        "niveaux": ["Tle A", "Tle C", "Tle D"],
        "total": 250000,
        "tranches": [
            {"libelle": "1er vers. 05 sept.", "montant": 67000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 50000, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 50000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc.", "montant": 45000, "date": "2026-12-05"},
            {"libelle": "5ème vers. 05 jan. (Solde)", "montant": 38000, "date": "2027-01-05"},
        ]
    },

    # Réinscription de la 2nde NON AFFECTÉS
    "reinscription_2nde_naff": {
        "id": "reinscription_2nde_naff",
        "label": "Réinscription 2nde (250 600 FCFA) NON AFFECTÉS",
        "cycle": "Collège 2nd cycle (Non Affectés)",
        "niveaux": ["2nde"],
        "total": 250600,
        "tranches": [
            {"libelle": "1er vers. 05 sept.", "montant": 62000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 45000, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 45000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc.", "montant": 35000, "date": "2026-12-05"},
            {"libelle": "5ème vers. 05 jan.", "montant": 33000, "date": "2027-01-05"},
            {"libelle": "6ème vers. 05 fév. (Solde)", "montant": 30600, "date": "2027-02-05"},
        ]
    },

    # Réinscription de la 1ere A, C, D NON AFFECTÉS
    "reinscription_1ere_a_c_d_naff": {
        "id": "reinscription_1ere_a_c_d_naff",
        "label": "Réinscription 1ère A, C, D (233 000 FCFA) NON AFFECTÉS",
        "cycle": "Collège 2nd cycle (Non Affectés)",
        "niveaux": ["1ère A", "1ère C", "1ère D"],
        "total": 233000,
        "tranches": [
            {"libelle": "1er vers. 05 sept.", "montant": 62000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 40000, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 40000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc.", "montant": 40000, "date": "2026-12-05"},
            {"libelle": "5ème vers. 05 jan.", "montant": 26000, "date": "2027-01-05"},
            {"libelle": "6ème vers. 05 fév. (Solde)", "montant": 25000, "date": "2027-02-05"},
        ]
    },

    # Réinscription de la Tle A, C, D NON AFFECTÉS
    "reinscription_tle_a_c_d_naff": {
        "id": "reinscription_tle_a_c_d_naff",
        "label": "Réinscription Tle A, C, D (296 500 FCFA) NON AFFECTÉS",
        "cycle": "Collège 2nd cycle (Non Affectés)",
        "niveaux": ["Tle A", "Tle C", "Tle D"],
        "total": 296500,
        "tranches": [
            {"libelle": "1er vers. 05 sept.", "montant": 67000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 45000, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 45000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc.", "montant": 40000, "date": "2026-12-05"},
            {"libelle": "5ème vers. 05 jan.", "montant": 35000, "date": "2027-01-05"},
            {"libelle": "6ème vers. 05 fév.", "montant": 33000, "date": "2027-02-05"},
            {"libelle": "7ème vers. 05 mars (Solde)", "montant": 31500, "date": "2027-03-05"},
        ]
    },

    # Réinscription de la 6ème (Nouveaux) NON AFFECTÉS
    "reinscription_6eme_nouveaux_naff": {
        "id": "reinscription_6eme_nouveaux_naff",
        "label": "Réinscription 6ème(Nouveaux) (265 000 FCFA) NON AFFECTÉS",
        "cycle": "Collège (Non Affectés)",
        "niveaux": ["6ème"],
        "total": 265000,
        "tranches": [
            {"libelle": "1er vers. 05 sept.", "montant": 62000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 53000, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 50000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc.", "montant": 50000, "date": "2026-12-05"},
            {"libelle": "5ème vers. 05 jan. (Solde)", "montant": 50000, "date": "2027-01-05"},
        ]
    },

    # Réinscription de la 5ème C, D NON AFFECTÉS
    "reinscription_5eme_c_d_naff": {
        "id": "reinscription_5eme_c_d_naff",
        "label": "Réinscription 5è C & 5è D (207 000 FCFA) NON AFFECTÉS",
        "cycle": "Collège (Non Affectés)",
        "niveaux": ["5è C", "5è D"],
        "total": 207000,
        "tranches": [
            {"libelle": "1er vers. 05 sept.", "montant": 69000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 50000, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 30000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc.", "montant": 30000, "date": "2026-12-05"},
            {"libelle": "5ème vers. 05 jan. (Solde)", "montant": 28000, "date": "2027-01-05"},
        ]
    },
    
    # Réinscription de la 5ème NON AFFECTÉS
    "reinscription_5eme_naff": {
        "id": "reinscription_5eme_naff",
        "label": "Réinscription 5ème (200 000 FCFA) NON AFFECTÉS",
        "cycle": "Collège (Non Affectés)",
        "niveaux": ["5ème"],
        "total": 200000,
        "tranches": [
            {"libelle": "1er vers. 05 sept.", "montant": 62000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 50000, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 30000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc.", "montant": 30000, "date": "2026-12-05"},
            {"libelle": "5ème vers. 05 jan. (Solde)", "montant": 28000, "date": "2027-01-05"},
        ]
    },
    
    # Réinscription de la 4ème NON AFFECTÉS
    "reinscription_4eme_naff": {
        "id": "reinscription_4eme_naff",
        "label": "Réinscription 4ème (200 000 FCFA) NON AFFECTÉS",
        "cycle": "Collège (Non Affectés)",
        "niveaux": ["4ème"],
        "total": 200000,
        "tranches": [
            {"libelle": "1er vers. 05 sept.", "montant": 62000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 50000, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 30000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc.", "montant": 30000, "date": "2026-12-05"},
            {"libelle": "5ème vers. 05 jan. (Solde)", "montant": 28000, "date": "2027-01-05"},
        ]
    },

    # Réinscription de la 4ème C, D NON AFFECTÉS
    "reinscription_4eme_c_d_naff": {
        "id": "reinscription_4eme_c_d_naff",
        "label": "Réinscription 4è C & 4è D (207 000 FCFA) NON AFFECTÉS",
        "cycle": "Collège (Non Affectés)",
        "niveaux": ["4è C", "4è D"],
        "total": 207000,
        "tranches": [
            {"libelle": "1er vers. 05 sept.", "montant": 69000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 50000, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 30000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc.", "montant": 30000, "date": "2026-12-05"},
            {"libelle": "5ème vers. 05 jan. (Solde)", "montant": 28000, "date": "2027-01-05"},
        ]
    },

    # Réinscription de la 3ème NON AFFECTÉS
    "reinscription_3eme_naff": {
        "id": "reinscription_3eme_naff",
        "label": "Réinscription 3ème (270 000 FCFA) NON AFFECTÉS",
        "cycle": "Collège (Non Affectés)",
        "niveaux": ["3ème"],
        "total": 270000,
        "tranches": [
            {"libelle": "1er vers. 05 sept.", "montant": 62000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 58000, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 50000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc.", "montant": 50000, "date": "2026-12-05"},
            {"libelle": "5ème vers. 05 jan. (Solde)", "montant": 50000, "date": "2027-01-05"},
        ]
    },
}

# Modèle de base immuable pour l'auto-initialisation par école
DEFAULT_OFFICIAL_PRESETS = copy.deepcopy(HINNEH_OFFICIAL_PRESETS)


class ApplyHinnehPresetRequest(BaseModel):
    preset_id: str
    eleve_id: Optional[int] = None
    classe_id: Optional[int] = None
    niveau: Optional[str] = None
    annee_scolaire: Optional[str] = "2026-2027"


class GenerateServiceTranchesRequest(BaseModel):
    eleve_id: int
    service_type: str  # 'cantine', 'transport', 'examen'
    montant_mensuel: float
    annee_scolaire: Optional[str] = "2026-2027"
    libelle: Optional[str] = None  # libellé de la tranche unique (examen)


# Mensualités des services optionnels : Septembre à Mai (9 versements),
# alignées sur le calendrier des reçus officiels (1V SEPT → 9V MAI).
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


@router.post("/generate-service-tranches")
def generate_service_tranches(data: GenerateServiceTranchesRequest, db: Session = Depends(get_db)):
    """Génère les tranches d'échéancier d'un service optionnel :
    - Cantine / Transport : 9 mensualités (Septembre à Mai)
    - Examen / Kits & Tenues / Frais Divers : Tranche unique (payable en une seule fois)
    Idempotent : si des tranches existent déjà pour l'élève et l'année, rien n'est recréé."""
    service = (data.service_type or "").strip().lower()
    valid_services = ("cantine", "transport", "examen", "kits_achats", "kit", "tenue", "uniforme", "frais_divers", "divers")
    if service not in valid_services:
        raise HTTPException(status_code=400, detail=f"Service non géré: {data.service_type}")
    if data.montant_mensuel <= 0:
        raise HTTPException(status_code=400, detail="Le montant doit être supérieur à zéro")

    student = db.query(models.Eleve).filter(models.Eleve.id == data.eleve_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Élève non trouvé")

    montant = Decimal(str(data.montant_mensuel))

    existing_tranches = db.query(models.EcheancierPaiement).filter(
        models.EcheancierPaiement.eleve_id == student.id,
        models.EcheancierPaiement.service_type == service,
        models.EcheancierPaiement.annee_scolaire == data.annee_scolaire,
    ).all()
    if existing_tranches:
        # Réalignement dynamique du tarif : les mensualités non soldées suivent le tarif réel
        # de la zone de transport ou formule cantine sélectionnée par l'utilisateur.
        realigned_count = 0
        for t in existing_tranches:
            paye = t.montant_paye or Decimal("0.00")
            if paye <= 0:
                if t.montant_prevu != montant:
                    t.montant_prevu = montant
                    t.statut = "non_paye"
                    realigned_count += 1
            elif t.montant_prevu != montant:
                # Si le montant payé couvre ou égale le nouveau tarif, on ajuste la tranche pour la solder proprement
                if paye >= montant:
                    t.montant_prevu = paye
                    t.statut = "paye"
                else:
                    t.montant_prevu = montant
                    t.statut = "partiel"
                realigned_count += 1

        if service == "transport":
            student.service_transport = True
            aff_trans = db.query(models.AffectationTransport).filter(models.AffectationTransport.eleveId == student.id).first()
            if aff_trans:
                if hasattr(aff_trans, "tarif"):
                    aff_trans.tarif = float(montant)
        elif service == "cantine":
            student.service_cantine = True

        db.commit()
        return {
            "success": True,
            "created": 0,
            "realigned": realigned_count,
            "message": f"Tarif des tranches {service} réaligné sur {float(montant):,.0f} FCFA ({realigned_count} modifiée(s)).",
        }

    created = 0
    if service in ("examen", "kits_achats", "kit", "tenue", "uniforme", "frais_divers", "divers"):
        st_type = "examen" if service == "examen" else ("kits_achats" if service in ("kits_achats", "kit", "tenue", "uniforme") else "frais_divers")
        default_libelle = "Droit d'Examen Officiel" if service == "examen" else ("Achats de Kits, Tenues & Fournitures" if st_type == "kits_achats" else "Frais Divers & Activités")
        db.add(models.EcheancierPaiement(
            eleve_id=student.id,
            ecole_id=student.ecole_id,
            ET_CODEETABLISSEMENT=student.ET_CODEETABLISSEMENT,
            libelle=data.libelle or default_libelle,
            service_type=st_type,
            tranche_numero=1,
            montant_prevu=montant,
            montant_paye=Decimal("0.00"),
            date_echeance=date(2026, 9, 15),
            statut="non_paye",
            annee_scolaire=data.annee_scolaire,
        ))
        created = 1
    else:
        prefix = "Cantine" if service == "cantine" else "Transport"
        for idx, (mois, annee, num_mois) in enumerate(SERVICE_MONTHLY_SCHEDULE, start=1):
            db.add(models.EcheancierPaiement(
                eleve_id=student.id,
                ecole_id=student.ecole_id,
                ET_CODEETABLISSEMENT=student.ET_CODEETABLISSEMENT,
                libelle=f"{prefix} - {mois}",
                service_type=service,
                tranche_numero=idx,
                montant_prevu=montant,
                montant_paye=Decimal("0.00"),
                date_echeance=date(annee, num_mois, 5),
                statut="non_paye",
                annee_scolaire=data.annee_scolaire,
            ))
            created += 1

        if service == "transport":
            student.service_transport = True
            aff_trans = db.query(models.AffectationTransport).filter(models.AffectationTransport.eleveId == student.id).first()
            if aff_trans:
                if hasattr(aff_trans, "tarif"):
                    aff_trans.tarif = float(montant)
            else:
                db.add(models.AffectationTransport(
                    eleveId=student.id,
                    vehiculeId=1,
                    arret=getattr(student, "AU_QUARTIER", None) or getattr(student, "quartier", None) or "Arrêt Principal",
                    tarif=float(montant),
                    matin=True,
                    soir=True,
                    code_etablissement=student.ET_CODEETABLISSEMENT,
                ))
        elif service == "cantine":
            student.service_cantine = True

    db.commit()
    return {"success": True, "created": created, "message": f"{created} tranche(s) {service} générée(s)."}


class RemoveServiceTranchesRequest(BaseModel):
    eleve_id: int
    service_type: str  # 'cantine', 'transport', 'examen', 'kits_achats', 'frais_divers', 'all'
    annee_scolaire: Optional[str] = "2026-2027"


@router.post("/remove-service-tranches")
def remove_service_tranches(data: RemoveServiceTranchesRequest, db: Session = Depends(get_db)):
    """Supprime proprement les tranches d'échéancier impayées d'un service lorsqu'un élève est désabonné.
    Les tranches déjà réglées (ou partiellement réglées) sont préservées pour le reçu et l'historique."""
    service = (data.service_type or "").strip().lower()
    student = db.query(models.Eleve).filter(models.Eleve.id == data.eleve_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Élève non trouvé")

    services_to_clean = ["cantine", "transport", "examen", "kits_achats", "frais_divers"] if service == "all" else [service]
    deleted_total = 0
    adjusted_total = 0

    for s in services_to_clean:
        if s == "cantine":
            keywords = ["cantine", "cant"]
        elif s == "transport":
            keywords = ["transport", "car"]
        elif s == "examen":
            keywords = ["examen", "bepc", "cepe", "bac"]
        elif s in ("kits_achats", "kit", "tenue", "uniforme"):
            keywords = ["kit", "tenue", "uniforme", "fourniture", "achat"]
        else:
            keywords = ["anglais", "informatique", "divers"]
        query = db.query(models.EcheancierPaiement).filter(
            models.EcheancierPaiement.eleve_id == student.id,
            models.EcheancierPaiement.annee_scolaire == data.annee_scolaire
        ).all()

        for t in query:
            is_match = (t.service_type == s) or any(kw in (t.libelle or "").lower() for kw in keywords)
            if is_match:
                montant_paye = t.montant_paye or Decimal("0.00")
                montant_prevu = t.montant_prevu or Decimal("0.00")
                if montant_paye <= Decimal("0.00"):
                    # Aucune somme payée : marquer la tranche comme 'Désabonné'
                    t.statut = "desabonne"
                    t.remarque = "Désabonné"
                    deleted_total += 1
                elif montant_paye < montant_prevu:
                    # Partiellement payé : ajuster le montant prévu sur le montant payé pour clôturer le solde passé
                    t.montant_prevu = montant_paye
                    t.statut = "paye"
                    t.remarque = ((t.remarque or "") + " (Désabonnement service: solde impayé clôturé)").strip()
                    adjusted_total += 1
                else:
                    t.statut = "paye"

        if s == "cantine":
            student.service_cantine = False
        elif s == "transport":
            student.service_transport = False
            aff = db.query(models.AffectationTransport).filter(models.AffectationTransport.eleveId == student.id).first()
            if aff:
                db.delete(aff)

    db.flush()
    _recalculer_solde_eleve(db, student)
    db.commit()
    db.refresh(student)

    return {
        "success": True,
        "desabonne_count": deleted_total,
        "adjusted_count": adjusted_total,
        "message": f"Désabonnement effectué : {deleted_total} mois restant(s) marqué(s) 'Désabonné', {adjusted_total} tranche(s) partielle(s) clôturée(s). Les mois payés restent conservés."
    }


class HinnehPresetTranche(BaseModel):
    libelle: str
    montant: Decimal
    date: str


class HinnehPresetUpdate(BaseModel):
    label: str
    type_service: Optional[str] = "scolarite" # 'scolarite', 'transport', 'cantine'
    cycle: Optional[str] = "Général"
    niveaux: Optional[List[str]] = []
    statut_affectation: Optional[str] = "TOUS"
    zone_trajet: Optional[str] = None
    periodicite: Optional[str] = None
    tranches: List[HinnehPresetTranche]
    annee_scolaire: Optional[str] = "2026-2027"
    ecole_id: Optional[int] = None
    code_etablissement: Optional[str] = None
    ville: Optional[str] = None


DEFAULT_TRANSPORT_PRESETS = {
    "transport_mensuel_zone1": {
        "id": "transport_mensuel_zone1",
        "label": "Transport Mensuel — Zone 1 (Centre Ville)",
        "type_service": "transport",
        "zone_trajet": "Zone 1 (Centre)",
        "periodicite": "mensuel",
        "cycle": "Général",
        "niveaux": ["Tous"],
        "total": 20000,
        "tranches": [
            {"libelle": "Abonnement Mensuel Car (Zone 1)", "montant": 20000, "date": "2026-09-05"}
        ]
    },
    "transport_trimestriel_zone1": {
        "id": "transport_trimestriel_zone1",
        "label": "Transport Trimestriel — Zone 1",
        "type_service": "transport",
        "zone_trajet": "Zone 1 (Centre)",
        "periodicite": "trimestriel",
        "cycle": "Général",
        "niveaux": ["Tous"],
        "total": 55000,
        "tranches": [
            {"libelle": "1er Trimestre Car (Zone 1)", "montant": 55000, "date": "2026-09-05"}
        ]
    },
    "transport_mensuel_zone2": {
        "id": "transport_mensuel_zone2",
        "label": "Transport Mensuel — Zone 2 (Périphérie / Hors-Zone)",
        "type_service": "transport",
        "zone_trajet": "Zone 2 (Périphérie)",
        "periodicite": "mensuel",
        "cycle": "Général",
        "niveaux": ["Tous"],
        "total": 25000,
        "tranches": [
            {"libelle": "Abonnement Mensuel Car (Zone 2)", "montant": 25000, "date": "2026-09-05"}
        ]
    },
    "transport_annuel_complet": {
        "id": "transport_annuel_complet",
        "label": "Transport Annuel Intégral (9 Mois)",
        "type_service": "transport",
        "zone_trajet": "Zone Standard",
        "periodicite": "annuel",
        "cycle": "Général",
        "niveaux": ["Tous"],
        "total": 180000,
        "tranches": [
            {"libelle": "1er Versement Car (Septembre)", "montant": 60000, "date": "2026-09-05"},
            {"libelle": "2ème Versement Car (Décembre)", "montant": 60000, "date": "2026-12-05"},
            {"libelle": "3ème Versement Car (Mars)", "montant": 60000, "date": "2027-03-05"}
        ]
    }
}

DEFAULT_CANTINE_PRESETS = {
    "cantine_mensuel_standard": {
        "id": "cantine_mensuel_standard",
        "label": "Cantine Mensuelle (1 Repas Chaud / Jour)",
        "type_service": "cantine",
        "periodicite": "mensuel",
        "cycle": "Général",
        "niveaux": ["Tous"],
        "total": 15000,
        "tranches": [
            {"libelle": "Forfait Mensuel Restauration", "montant": 15000, "date": "2026-09-05"}
        ]
    },
    "cantine_trimestriel": {
        "id": "cantine_trimestriel",
        "label": "Cantine Trimestrielle",
        "type_service": "cantine",
        "periodicite": "trimestriel",
        "cycle": "Général",
        "niveaux": ["Tous"],
        "total": 42000,
        "tranches": [
            {"libelle": "1er Trimestre Cantine", "montant": 42000, "date": "2026-09-05"}
        ]
    },
    "cantine_annuel_complet": {
        "id": "cantine_annuel_complet",
        "label": "Restauration Annuelle Complète (Demi-Pension)",
        "type_service": "cantine",
        "periodicite": "annuel",
        "cycle": "Général",
        "niveaux": ["Tous"],
        "total": 135000,
        "tranches": [
            {"libelle": "1er Versement Cantine (Septembre)", "montant": 45000, "date": "2026-09-05"},
            {"libelle": "2ème Versement Cantine (Décembre)", "montant": 45000, "date": "2026-12-05"},
            {"libelle": "3ème Versement Cantine (Mars)", "montant": 45000, "date": "2027-03-05"}
        ]
    }
}


def _resolve_grille_scope(
    scope: SchoolScope,
    ecole_id: Optional[int] = None,
    code_etablissement: Optional[str] = None,
    ville: Optional[str] = None,
) -> Tuple[Optional[int], Optional[str], Optional[str]]:
    """Portée école et ville d'une grille tarifaire avec priorité absolue aux filtres demandés."""
    eff_id = ecole_id
    eff_code = code_etablissement
    eff_ville = ville

    if not scope.is_global:
        if not eff_id and scope.ecole_id:
            eff_id = scope.ecole_id
        if not eff_code and scope.code_etablissement:
            eff_code = scope.code_etablissement
        if not eff_ville and scope.ville:
            eff_ville = scope.ville

    return (eff_id, eff_code, eff_ville)


def _filter_grille_by_scope(
    query,
    effective_ecole_id: Optional[int],
    effective_code: Optional[str],
    effective_ville: Optional[str] = None,
    auth_ids: Optional[List[int]] = None,
    auth_codes: Optional[List[str]] = None,
    is_global: bool = False
):
    """Restreint une requête sur la grille tarifaire STRICTEMENT à l'établissement demandé."""
    if effective_ecole_id and effective_code:
        return query.filter(or_(
            models.GrilleTarifaire.ecole_id == effective_ecole_id,
            func.upper(models.GrilleTarifaire.ET_CODEETABLISSEMENT) == effective_code.strip().upper()
        ))
    elif effective_ecole_id:
        return query.filter(models.GrilleTarifaire.ecole_id == effective_ecole_id)
    elif effective_code:
        return query.filter(func.upper(models.GrilleTarifaire.ET_CODEETABLISSEMENT) == effective_code.strip().upper())
    
    if not is_global:
        if auth_ids or auth_codes:
            conds = []
            if auth_ids:
                conds.append(models.GrilleTarifaire.ecole_id.in_(auth_ids))
            if auth_codes:
                conds.append(func.upper(models.GrilleTarifaire.ET_CODEETABLISSEMENT).in_([c.upper() for c in auth_codes]))
            return query.filter(or_(*conds))
        return query.filter(models.GrilleTarifaire.id == -1)

    return query


def _dedupe_presets_par_ecole(db_presets: List[Any], effective_ecole_id: Optional[int]) -> List[Any]:
    retenus: Dict[str, Any] = {}
    for preset in db_presets:
        existant = retenus.get(preset.preset_id)
        if existant is None:
            retenus[preset.preset_id] = preset
            continue
        if effective_ecole_id and preset.ecole_id == effective_ecole_id:
            retenus[preset.preset_id] = preset
    return list(retenus.values())


@router.get("/hinneh-presets")
@router.get("/grilles")
def get_hinneh_official_presets(
    annee_scolaire: Optional[str] = "2026-2027",
    type_service: Optional[str] = Query(None),
    ecole_id: Optional[int] = None,
    code_etablissement: Optional[str] = None,
    ville: Optional[str] = None,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    if hasattr(annee_scolaire, "default"):
        annee_scolaire = annee_scolaire.default
    if hasattr(ecole_id, "default"):
        ecole_id = ecole_id.default
    if hasattr(code_etablissement, "default"):
        code_etablissement = code_etablissement.default
    if hasattr(type_service, "default"):
        type_service = type_service.default
    if hasattr(ville, "default"):
        ville = ville.default

    effective_ecole_id, effective_code, effective_ville = _resolve_grille_scope(scope, ecole_id, code_etablissement, ville)
    auth_ids = scope.get_authorized_school_ids(db) if not scope.is_global else None
    auth_codes = scope.get_authorized_school_codes(db) if not scope.is_global else None

    query = db.query(models.GrilleTarifaire).filter(models.GrilleTarifaire.is_active == True)
    if annee_scolaire:
        query = query.filter(models.GrilleTarifaire.annee_scolaire == annee_scolaire)
    if type_service:
        query = query.filter(models.GrilleTarifaire.type_service == type_service)

    query = _filter_grille_by_scope(
        query,
        effective_ecole_id,
        effective_code,
        effective_ville,
        auth_ids=auth_ids,
        auth_codes=auth_codes,
        is_global=scope.is_global
    )

    db_presets = _dedupe_presets_par_ecole(
        query.order_by(models.GrilleTarifaire.id).all(), effective_ecole_id
    )

    results = []
    for p in db_presets:
        niveaux_list = p.niveaux if isinstance(p.niveaux, list) else (json.loads(p.niveaux) if p.niveaux else [])
        tranches_list = p.tranches if isinstance(p.tranches, list) else (json.loads(p.tranches) if p.tranches else [])
        results.append({
            "id": p.preset_id,
            "db_id": p.id,
            "label": p.label,
            "type_service": getattr(p, "type_service", "scolarite") or "scolarite",
            "cycle": p.cycle or "Général",
            "niveaux": niveaux_list,
            "statut_affectation": p.statut_affectation or "TOUS",
            "zone_trajet": getattr(p, "zone_trajet", None),
            "periodicite": getattr(p, "periodicite", None),
            "total": float(p.total),
            "tranches": tranches_list,
            "annee_scolaire": p.annee_scolaire,
            "ecole_id": p.ecole_id,
            "ET_CODEETABLISSEMENT": p.ET_CODEETABLISSEMENT,
            "ville": getattr(p, "ville", None),
        })

    # Aucun repli sur un catalogue codé en dur : la liste ne contient que les grilles
    # réellement enregistrées par l'établissement. Renvoyer des modèles fictifs estampillés
    # de l'ecole_id courant les ferait passer pour sa grille, alors qu'aucun tarif n'a été
    # saisi — et ces montants finissaient imprimés sur les reçus des familles.
    return results


def _upsert_preset(
    preset_id: str,
    data: HinnehPresetUpdate,
    db: Session,
    scope: SchoolScope,
    ecole_id: Optional[int] = None,
    code_etablissement: Optional[str] = None,
    ville: Optional[str] = None
):
    effective_ecole_id, effective_code, effective_ville = _resolve_grille_scope(
        scope,
        data.ecole_id or ecole_id,
        data.code_etablissement or code_etablissement,
        data.ville or ville
    )

    if not effective_code and effective_ecole_id:
        sch = db.query(models.Etablissement).filter(models.Etablissement.IDETABLISSEMENT == effective_ecole_id).first()
        if sch:
            effective_code = (sch.ET_CODEETABLISSEMENT or "").strip().upper()
            if not effective_ville and sch.ET_VILLE:
                effective_ville = sch.ET_VILLE
    elif not effective_ecole_id and effective_code:
        sch = db.query(models.Etablissement).filter(func.upper(models.Etablissement.ET_CODEETABLISSEMENT) == str(effective_code).strip().upper()).first()
        if sch:
            effective_ecole_id = sch.IDETABLISSEMENT
            if not effective_ville and sch.ET_VILLE:
                effective_ville = sch.ET_VILLE

    label = data.label.strip()
    svc_type = (data.type_service or "scolarite").strip().lower()
    cycle = (data.cycle or "Général").strip()
    niveaux = [str(niveau).strip() for niveau in (data.niveaux or []) if str(niveau).strip()]
    if not label:
        raise HTTPException(status_code=400, detail="Le libellé de la grille est requis")
    if not data.tranches:
        raise HTTPException(status_code=400, detail="Ajoutez au moins une tranche d'échéance")

    tranches = []
    for tranche in data.tranches:
        libelle = tranche.libelle.strip()
        if not libelle or tranche.montant <= 0:
            raise HTTPException(status_code=400, detail="Chaque tranche doit avoir un libellé et un montant positif")
        try:
            datetime.strptime(tranche.date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="La date de chaque tranche doit être au format AAAA-MM-JJ")
        tranches.append({"libelle": libelle, "montant": float(tranche.montant), "date": tranche.date})

    total_amount = sum(tranche["montant"] for tranche in tranches)
    annee_scolaire = data.annee_scolaire or "2026-2027"
    statut_aff = data.statut_affectation or ("AFF" if "aff" in preset_id.lower() and "naff" not in preset_id.lower() else ("NAFF" if "naff" in preset_id.lower() else "TOUS"))

    query = db.query(models.GrilleTarifaire).filter(
        models.GrilleTarifaire.preset_id == preset_id,
        models.GrilleTarifaire.annee_scolaire == annee_scolaire
    )
    query = _filter_grille_by_scope(query, effective_ecole_id, effective_code, effective_ville)

    candidats = query.order_by(models.GrilleTarifaire.id).all()
    db_item = next(
        (item for item in candidats if effective_ecole_id and item.ecole_id == effective_ecole_id),
        candidats[0] if candidats else None,
    )

    if db_item is not None and effective_ecole_id and db_item.ecole_id is None:
        db_item = None
    if not db_item:
        db_item = models.GrilleTarifaire(
            preset_id=preset_id,
            label=label,
            type_service=svc_type,
            cycle=cycle,
            niveaux=niveaux,
            statut_affectation=statut_aff,
            zone_trajet=data.zone_trajet,
            periodicite=data.periodicite,
            total=Decimal(str(total_amount)),
            tranches=tranches,
            annee_scolaire=annee_scolaire,
            ecole_id=effective_ecole_id,
            ET_CODEETABLISSEMENT=effective_code,
            ville=effective_ville,
            is_active=True,
            date_creation=datetime.utcnow(),
            date_modification=datetime.utcnow()
        )
        db.add(db_item)
    else:
        db_item.label = label
        db_item.type_service = svc_type
        db_item.cycle = cycle
        db_item.niveaux = niveaux
        db_item.statut_affectation = statut_aff
        db_item.zone_trajet = data.zone_trajet
        db_item.periodicite = data.periodicite
        db_item.total = Decimal(str(total_amount))
        db_item.tranches = tranches
        db_item.is_active = True
        db_item.date_modification = datetime.utcnow()
        if effective_code:
            db_item.ET_CODEETABLISSEMENT = effective_code
        if effective_ecole_id:
            db_item.ecole_id = effective_ecole_id
        if effective_ville:
            db_item.ville = effective_ville

    db.commit()
    db.refresh(db_item)

    realignement = _realign_apres_sauvegarde_grille(
        db_item, db, scope, effective_ecole_id, effective_code, annee_scolaire
    )

    return {
        "id": db_item.preset_id,
        "db_id": db_item.id,
        "label": db_item.label,
        "type_service": getattr(db_item, "type_service", "scolarite") or "scolarite",
        "cycle": db_item.cycle,
        "niveaux": db_item.niveaux if isinstance(db_item.niveaux, list) else json.loads(db_item.niveaux or "[]"),
        "statut_affectation": db_item.statut_affectation,
        "zone_trajet": getattr(db_item, "zone_trajet", None),
        "periodicite": getattr(db_item, "periodicite", None),
        "total": float(db_item.total),
        "tranches": db_item.tranches if isinstance(db_item.tranches, list) else json.loads(db_item.tranches or "[]"),
        "annee_scolaire": db_item.annee_scolaire,
        "ecole_id": db_item.ecole_id,
        "ET_CODEETABLISSEMENT": db_item.ET_CODEETABLISSEMENT,
        "ville": getattr(db_item, "ville", None),
        "realignement": realignement,
    }


def _realign_apres_sauvegarde_grille(
    db_item: models.GrilleTarifaire,
    db: Session,
    scope: SchoolScope,
    effective_ecole_id: Optional[int],
    effective_code: Optional[str],
    annee_scolaire: str
) -> Optional[Dict[str, Any]]:
    """Répercute une grille de scolarité fraîchement enregistrée sur les échéanciers.

    Sans cela, la grille ne vaudrait que pour les futurs élèves : ceux déjà inscrits
    garderaient indéfiniment l'ancien barème, et leur reçu ne correspondrait pas à la
    grille saisie. Seuls les échéanciers sans aucun versement sont réécrits — un
    échéancier déjà mouvementé n'est jamais reconstruit automatiquement.

    Renvoie None quand rien n'est réaligné (grille non scolarité, portée globale, ou
    aucun élève concerné) : ce chemin ne doit jamais faire échouer l'enregistrement.
    """
    if (db_item.type_service or "scolarite").strip().lower() != "scolarite":
        return None

    # Une grille sans établissement viserait tout le réseau : trop large pour une
    # réécriture automatique, on laisse alors l'utilisateur lancer le réalignement.
    if not effective_ecole_id and not effective_code:
        return None

    try:
        query = db.query(models.Eleve)
        if effective_ecole_id:
            query = query.filter(models.Eleve.ecole_id == effective_ecole_id)
        else:
            query = query.filter(
                func.upper(models.Eleve.ET_CODEETABLISSEMENT) == str(effective_code).strip().upper()
            )

        eleves = [e for e in query.all() if scope.can_access_student(e, db)]

        # Restreindre aux niveaux couverts par la grille : inutile de réécrire l'échéancier
        # d'un CM2 parce que la grille du CE1 vient d'être modifiée.
        niveaux = db_item.niveaux if isinstance(db_item.niveaux, list) else json.loads(db_item.niveaux or "[]")
        niveaux_upper = [str(n).upper().strip() for n in niveaux if str(n).strip()]
        if niveaux_upper:
            classes_map = {
                c.id: (c.CE_LIBELLE or "").upper().strip()
                for c in db.query(models.Classe).all()
            }

            def concerne(eleve: models.Eleve) -> bool:
                cls_name = classes_map.get(eleve.classe_id) or (eleve.AU_CLASSEPRECEDENTE or "").upper().strip()
                return any(niv in cls_name or cls_name.startswith(niv) for niv in niveaux_upper)

            eleves = [e for e in eleves if concerne(e)]

        if not eleves:
            return None

        realignes, tranches_creees, echecs = _realign_students_on_grille(
            eleves, db, annee_scolaire, force_realign_all=False
        )
        db.commit()

        return {
            "eleves_concernes": len(eleves),
            "realignes": realignes,
            "ignores": len(eleves) - realignes,
            "tranches_creees_ou_mises_a_jour": tranches_creees,
            "echecs": echecs,
        }
    except Exception:
        # La grille est déjà enregistrée : un réalignement en échec ne doit pas la perdre.
        db.rollback()
        return None


@router.post("/hinneh-presets")
@router.post("/grilles")
def create_hinneh_official_preset(
    data: HinnehPresetUpdate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    preset_id = data.label.lower().replace(' ', '_').replace('/', '_')
    return _upsert_preset(preset_id, data, db=db, scope=scope)


@router.post("/hinneh-presets/{preset_id}")
@router.put("/hinneh-presets/{preset_id}")
@router.post("/grilles/{preset_id}")
@router.put("/grilles/{preset_id}")
def update_hinneh_official_preset(
    preset_id: str,
    data: HinnehPresetUpdate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    return _upsert_preset(preset_id, data, db=db, scope=scope)


@router.delete("/hinneh-presets/{preset_id}")
@router.delete("/grilles/{preset_id}")
def delete_hinneh_official_preset(
    preset_id: str,
    annee_scolaire: Optional[str] = "2026-2027",
    ecole_id: Optional[int] = None,
    code_etablissement: Optional[str] = None,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    if hasattr(annee_scolaire, "default"):
        annee_scolaire = annee_scolaire.default
    if hasattr(ecole_id, "default"):
        ecole_id = ecole_id.default
    if hasattr(code_etablissement, "default"):
        code_etablissement = code_etablissement.default

    effective_ecole_id, effective_code, effective_ville = _resolve_grille_scope(scope, ecole_id, code_etablissement)

    query = db.query(models.GrilleTarifaire).filter(models.GrilleTarifaire.preset_id == preset_id)
    if annee_scolaire:
        query = query.filter(models.GrilleTarifaire.annee_scolaire == annee_scolaire)
    query = _filter_grille_by_scope(query, effective_ecole_id, effective_code, effective_ville)

    candidats = query.order_by(models.GrilleTarifaire.id).all()
    db_item = next(
        (item for item in candidats if effective_ecole_id and item.ecole_id == effective_ecole_id),
        candidats[0] if candidats else None,
    )
    if db_item:
        db.delete(db_item)
        db.commit()

    return {"success": True, "message": f"Le modèle tarifaire '{preset_id}' a été supprimé de la base de données."}


@router.post("/apply-hinneh-preset")
def apply_hinneh_preset(
    data: ApplyHinnehPresetRequest,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    effective_ecole_id, effective_code, effective_ville = _resolve_grille_scope(scope)

    query = db.query(models.GrilleTarifaire).filter(
        models.GrilleTarifaire.preset_id == data.preset_id,
        models.GrilleTarifaire.is_active == True
    )
    query = _filter_grille_by_scope(query, effective_ecole_id, effective_code, effective_ville)

    # Le tarif de l'école de l'élève prime sur celui d'un autre cycle du même campus.
    candidats = query.order_by(models.GrilleTarifaire.id).all()
    db_preset = next(
        (item for item in candidats if effective_ecole_id and item.ecole_id == effective_ecole_id),
        candidats[0] if candidats else None,
    )

    preset_label = ""
    preset_tranches = []

    if db_preset:
        preset_label = db_preset.label
        preset_tranches = db_preset.tranches if isinstance(db_preset.tranches, list) else json.loads(db_preset.tranches or "[]")
    elif data.preset_id in HINNEH_OFFICIAL_PRESETS:
        preset = HINNEH_OFFICIAL_PRESETS[data.preset_id]
        preset_label = preset.get("label", data.preset_id)
        preset_tranches = preset.get("tranches", [])
    else:
        # Chercher dans defaultGrillePresets.json
        from .caisse import _get_json_presets
        for jp in _get_json_presets():
            if str(jp.get("id")) == str(data.preset_id) or str(jp.get("preset_id")) == str(data.preset_id) or jp.get("label") == data.preset_id:
                preset_label = jp.get("label", str(data.preset_id))
                preset_tranches = jp.get("tranches", [])
                break

    students_to_process = []
    
    if data.eleve_id:
        s = db.query(models.Eleve).filter(models.Eleve.id == data.eleve_id).first()
        if s:
            students_to_process.append(s)
    elif data.classe_id:
        students_to_process = db.query(models.Eleve).filter(models.Eleve.classe_id == data.classe_id).all()
    elif data.niveau:
        n_str = data.niveau.strip().lower()
        matching_class_ids = [
            c.id for c in db.query(models.Classe).all()
            if n_str in (c.CE_LIBELLE or "").lower() or (c.niveau and n_str in (c.niveau.libelle or "").lower())
        ]
        if matching_class_ids:
            students_to_process = db.query(models.Eleve).filter(models.Eleve.classe_id.in_(matching_class_ids)).all()

    if not students_to_process:
        raise HTTPException(status_code=400, detail="Aucun élève trouvé")

    # Filtrer par permission d'accès de l'utilisateur / Directeur des Études
    students_to_process = [s for s in students_to_process if scope.can_access_student(s, db)]
    if not students_to_process:
        raise HTTPException(status_code=403, detail="Aucun élève accessible pour cet établissement ou cette ville.")

    created_count = 0
    for student in students_to_process:
        s_tranches = preset_tranches
        s_label = preset_label

        if not s_tranches:
            resolved_g = resolve_official_grille_for_student(student, db, data.annee_scolaire or "2026-2027")
            if resolved_g:
                s_label = resolved_g.label
                s_tranches = resolved_g.tranches if isinstance(resolved_g.tranches, list) else json.loads(resolved_g.tranches or "[]")

        if not s_tranches:
            continue

        existing = db.query(models.EcheancierPaiement).filter(
            models.EcheancierPaiement.eleve_id == student.id,
            models.EcheancierPaiement.annee_scolaire == (data.annee_scolaire or "2026-2027"),
            models.EcheancierPaiement.service_type == "scolarite"
        ).all()

        total_paid = sum(Decimal(str(e.montant_paye or 0)) for e in existing)

        for e in existing:
            db.delete(e)
        db.flush()

        total_scol = Decimal("0.00")
        reste_a_imputer = total_paid
        for idx, tr in enumerate(s_tranches, start=1):
            due_date = datetime.strptime(tr["date"], "%Y-%m-%d").date()
            m_prev = Decimal(str(tr["montant"]))
            total_scol += m_prev
            impute = min(m_prev, reste_a_imputer)
            reste_a_imputer -= impute

            crud.create_echeance(
                db,
                echeance=schemas.EcheancierCreate(
                    eleve_id=student.id,
                    ecole_id=student.ecole_id,
                    ET_CODEETABLISSEMENT=student.ET_CODEETABLISSEMENT,
                    libelle=tr["libelle"],
                    tranche_numero=idx,
                    montant_prevu=m_prev,
                    montant_paye=impute,
                    date_echeance=due_date,
                    statut="paye" if impute >= m_prev else ("partiel" if impute > 0 else "non_paye"),
                    annee_scolaire=data.annee_scolaire or "2026-2027"
                )
            )
            created_count += 1

        student.AU_SCOLARITE = total_scol
        student.AU_TOTALDEPOT = total_paid
        student.AU_SOLDECOMPTE = max(Decimal("0.00"), total_scol - total_paid)
        student.solde = student.AU_SOLDECOMPTE
        db.commit()
        db.refresh(student)

        try:
            apply_pending_reductions_for_student(db, student.id)
        except Exception as e:
            print(f"[Warning] apply_pending_reductions_for_student({student.id}): {e}")

    return {
        "success": True,
        "message": f"Échéancier ({preset_label or 'Officiel'}) appliqué à {len(students_to_process)} élève(s).",
        "tranches_creees": created_count
    }


@router.post("/generate-by-affectation")
def generate_echeanciers_by_affectation(
    data: Dict[str, Any],
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Génère automatiquement les échéanciers en fonction du statut d'affectation de chaque élève.

    Pour chaque élève sélectionné, cherche les tarifs correspondant à son statut d'affectation
    (Affecté par l'État = AFF, Non Affecté = NAFF) et crée les échéanciers avec les montants corrects.

    Utilisation:
    {
        "eleve_id": 123,  # OU
        "classe_id": 5,   # OU
        "ecole_id": 1,
        "annee_scolaire": "2026-2027"
    }
    """
    annee_scolaire = data.get("annee_scolaire", "2026-2027")

    # Récupérer les élèves
    students_to_process = []

    if data.get("eleve_id"):
        s = db.query(models.Eleve).filter(models.Eleve.id == data["eleve_id"]).first()
        if s:
            students_to_process.append(s)
    elif data.get("classe_id"):
        students_to_process = db.query(models.Eleve).filter(
            models.Eleve.classe_id == data["classe_id"]
        ).all()
    elif data.get("ecole_id"):
        students_to_process = db.query(models.Eleve).filter(
            models.Eleve.ecole_id == data["ecole_id"]
        ).all()

    # Filtrer les écoles autorisées
    auth_ids = scope.get_authorized_school_ids(db)
    students_to_process = [
        s for s in students_to_process
        if (not auth_ids or s.ecole_id in auth_ids) and scope.can_access_student(s, db)
    ]

    if not students_to_process:
        raise HTTPException(status_code=400, detail="Aucun élève trouvé")

def resolve_official_grille_for_student(
    student: models.Eleve,
    db: Session,
    annee_scolaire: str = "2026-2027"
) -> Optional[models.GrilleTarifaire]:
    """Trouve la grille tarifaire officielle exacte d'un élève selon son école, ville, classe et statut."""
    classe_name = ""
    if student.classe_id:
        cls = db.query(models.Classe).filter(models.Classe.id == student.classe_id).first()
        if cls and cls.CE_LIBELLE:
            classe_name = cls.CE_LIBELLE
    if not classe_name and student.AU_CLASSEPRECEDENTE:
        classe_name = student.AU_CLASSEPRECEDENTE or ""

    statut_orient = (getattr(student, 'statut_orientation', '') or getattr(student, 'AU_STATUT', '') or '').lower()
    is_aff = not ('non' in statut_orient or 'naff' in statut_orient)
    is_redoublant = bool(student.REDOUBLANT)

    # La grille saisie par l'établissement prime sur toute recherche par preset_id : un
    # tarif créé sous un libellé propre à l'école porte un preset_id qui ne correspond à
    # aucun modèle Hînneh, et resterait donc introuvable ici. Passer par le même
    # sélecteur que le reçu garantit qu'échéancier et reçu appliquent le même barème.
    try:
        from .caisse import select_grille_tarifaire

        classe_obj = db.query(models.Classe).filter(models.Classe.id == student.classe_id).first() if student.classe_id else None
        ecole_obj = db.query(models.Etablissement).filter(
            models.Etablissement.IDETABLISSEMENT == student.ecole_id
        ).first() if student.ecole_id else None

        grille_configuree = select_grille_tarifaire(db, student, classe_obj, ecole_obj)
        if grille_configuree is not None:
            return grille_configuree
    except Exception:
        pass

    # Déterminer le preset ID Hinneh officiel
    target_preset_id = _find_matching_hinneh_preset(classe_name, classe_name, is_aff=is_aff, is_redoublant=is_redoublant)

    if target_preset_id:
        cand = db.query(models.GrilleTarifaire).filter(
            models.GrilleTarifaire.preset_id == target_preset_id,
            models.GrilleTarifaire.type_service == "scolarite",
            models.GrilleTarifaire.is_active == True,
            models.GrilleTarifaire.annee_scolaire == annee_scolaire
        ).all()
        
        # 1. Priorité Établissement (ecole_id)
        if student.ecole_id:
            for g in cand:
                if g.ecole_id == student.ecole_id:
                    return g
        # 2. Priorité Code Établissement (ET_CODEETABLISSEMENT)
        if student.ET_CODEETABLISSEMENT:
            for g in cand:
                if g.ET_CODEETABLISSEMENT and g.ET_CODEETABLISSEMENT.upper() == student.ET_CODEETABLISSEMENT.strip().upper():
                    return g
        # 3. Priorité Fallback Global / Standard
        for g in cand:
            if g.ecole_id is None or g.ET_CODEETABLISSEMENT in ('GLOBAL', 'ET001'):
                return g
        if cand:
            return cand[0]

    # Plus de repli « première grille de l'école » : il ignorait les niveaux et pouvait
    # appliquer à un CM2 le tarif du CE1. Quand aucune grille ne couvre la classe, on ne
    # renvoie rien — l'appelant doit le signaler plutôt que facturer un autre niveau.
    return None


@router.post("/realign-school-schedules")
def realign_school_schedules(
    data: schemas.RealignSchedulesRequest,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """
    Régénère / Réaligne l'échéancier de chaque élève en appliquant scrupuleusement
    la grille tarifaire officielle selon :
      - Le Code Établissement (ex: FHA-01, LIY-03, IEF-02, 240477)
      - L'École (ecole_id) et la Ville
      - La Classe / Niveau (Maternelle, Primaire, Collège 6e-3e, Lycée 2nde-Tle)
      - Le Statut d'Orientation (Affecté par l'État vs Non Affecté)
    """
    annee_scolaire = data.annee_scolaire or "2026-2027"

    query = db.query(models.Eleve)
    if data.classe_id:
        query = query.filter(models.Eleve.classe_id == data.classe_id)
    if data.ecole_id:
        query = query.filter(models.Eleve.ecole_id == data.ecole_id)
    if data.code_etablissement:
        query = query.filter(func.upper(models.Eleve.ET_CODEETABLISSEMENT) == data.code_etablissement.strip().upper())
    
    auth_ids = scope.get_authorized_school_ids(db) if not scope.is_global else None
    if auth_ids:
        query = query.filter(models.Eleve.ecole_id.in_(auth_ids))

    students = query.all()
    students_to_process = [s for s in students if scope.can_access_student(s, db)]

    # Restriction par niveau : « CE1 » vise CE1A, CE1B… sans toucher aux autres niveaux.
    niveaux_demandes = [str(n).upper().strip() for n in (data.niveaux or []) if str(n).strip()]
    if niveaux_demandes:
        classes_map = {
            c.id: (c.CE_LIBELLE or "").upper().strip()
            for c in db.query(models.Classe).all()
        }

        def au_niveau_demande(eleve: models.Eleve) -> bool:
            cls_name = classes_map.get(eleve.classe_id) or (eleve.AU_CLASSEPRECEDENTE or "").upper().strip()
            if not cls_name:
                return False
            return any(niv in cls_name or cls_name.startswith(niv) for niv in niveaux_demandes)

        students_to_process = [s for s in students_to_process if au_niveau_demande(s)]

    if not students_to_process:
        raise HTTPException(status_code=400, detail="Aucun élève trouvé pour les critères demandés")

    realigned_count, created_tranches_count, failed_count = _realign_students_on_grille(
        students_to_process, db, annee_scolaire, bool(data.force_realign_all)
    )

    db.commit()

    return {
        "success": True,
        "message": f"Échéanciers réalignés avec succès selon la grille tarifaire officielle pour {realigned_count} élève(s).",
        "total_eleves": len(students_to_process),
        "realigned_eleves": realigned_count,
        "tranches_creees_ou_mises_a_jour": created_tranches_count,
        "failed": failed_count
    }


@router.post("/generate-student-scolarite-auto/{student_id}")
def generate_student_scolarite_auto(
    student_id: int,
    force_realign: Optional[bool] = False,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Génère ou réaligne automatiquement l'échéancier des frais de scolarité de l'élève
    strictement selon la grille tarifaire officielle de son établissement à partir de son
    code d'établissement (ET_CODEETABLISSEMENT / ecole_id / ville / classe)."""
    student = db.query(models.Eleve).filter(models.Eleve.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Élève non trouvé")

    if not scope.can_access_student(student, db):
        raise HTTPException(status_code=403, detail="Accès refusé à cet élève d'un autre établissement")

    realigned_count, created_count, failed_count = _realign_students_on_grille(
        [student], db, annee_scolaire="2026-2027", force_realign_all=bool(force_realign)
    )
    db.commit()
    db.refresh(student)

    echeances = crud.get_echeanciers(db, eleve_id=student.id)
    return {
        "success": True,
        "message": f"Échéancier de scolarité généré avec succès ({len(echeances)} tranches).",
        "eleve_id": student.id,
        "matricule": student.matricule,
        "scolarite_total": float(student.AU_SCOLARITE or 0),
        "total_paye": float(student.AU_TOTALDEPOT or 0),
        "solde": float(student.AU_SOLDECOMPTE or 0),
        "echeances_count": len(echeances),
        "echeances": echeances
    }


def _filtrer_tranches_septembre(tranches, ecole):
    """Retire la tranche de scolarité de septembre des établissements qui n'encaissent
    que les frais d'inscription à la rentrée.

    Renvoie (tranches conservées, montant retiré) : le dû total de l'élève doit suivre.
    """
    from .caisse import (
        MODELE_SEPTEMBRE_INSCRIPTION_SEULE,
        est_ligne_inscription,
        est_tranche_scolarite_septembre,
        get_modele_septembre,
    )

    if get_modele_septembre(ecole) != MODELE_SEPTEMBRE_INSCRIPTION_SEULE:
        return tranches, Decimal("0.00")
    # Sans ligne d'inscription distincte, la tranche de septembre EST l'inscription :
    # la retirer supprimerait les frais de rentrée eux-mêmes.
    if not any(est_ligne_inscription(t.get("libelle", "")) for t in tranches):
        return tranches, Decimal("0.00")

    retire = sum(
        (
            Decimal(str(t.get("montant", 0) or 0))
            for t in tranches
            if est_tranche_scolarite_septembre(t.get("libelle", ""))
        ),
        Decimal("0.00"),
    )
    gardees = [t for t in tranches if not est_tranche_scolarite_septembre(t.get("libelle", ""))]
    return gardees, retire


def ensure_echeancier_scolarite(
    student: models.Eleve,
    db: Session,
    annee_scolaire: str = "2026-2027",
    force_realign_all: bool = False
) -> int:
    """Dote un élève de son échéancier de scolarité s'il n'en a pas encore (ou réaligne si demandé).

    Appelée dès qu'une classe lui est attribuée — inscription, changement de classe,
    import — afin que l'échéancier existe au plus tôt, construit sur la grille de
    l'établissement. Sans cela, un élève traverse la scolarité sans tranches et son reçu
    n'affiche aucun montant alors que l'école a bien saisi sa grille.
    """
    if student is None:
        return 0

    # Si classe_id n'est pas encore renseigné, tenter de le déduire de AU_CLASSEPRECEDENTE
    if not getattr(student, "classe_id", None) and getattr(student, "AU_CLASSEPRECEDENTE", None):
        cls_name = (student.AU_CLASSEPRECEDENTE or "").strip().lower()
        if cls_name:
            matched_cls = db.query(models.Classe).filter(func.lower(models.Classe.CE_LIBELLE) == cls_name).first()
            if not matched_cls:
                matched_cls = db.query(models.Classe).filter(func.lower(models.Classe.CE_LIBELLE).like(f"%{cls_name}%")).first()
            if matched_cls:
                student.classe_id = matched_cls.id
                if not student.ecole_id and matched_cls.ecole_id:
                    student.ecole_id = matched_cls.ecole_id
                if not student.ET_CODEETABLISSEMENT and matched_cls.ET_CODEETABLISSEMENT:
                    student.ET_CODEETABLISSEMENT = matched_cls.ET_CODEETABLISSEMENT
    elif getattr(student, "classe_id", None) and not getattr(student, "AU_CLASSEPRECEDENTE", None):
        cls_obj = db.query(models.Classe).filter(models.Classe.id == student.classe_id).first()
        if cls_obj and cls_obj.CE_LIBELLE:
            student.AU_CLASSEPRECEDENTE = cls_obj.CE_LIBELLE
            if not student.ecole_id and cls_obj.ecole_id:
                student.ecole_id = cls_obj.ecole_id
            if not student.ET_CODEETABLISSEMENT and cls_obj.ET_CODEETABLISSEMENT:
                student.ET_CODEETABLISSEMENT = cls_obj.ET_CODEETABLISSEMENT

    deja_pourvu = db.query(models.EcheancierPaiement).filter(
        models.EcheancierPaiement.eleve_id == student.id,
        models.EcheancierPaiement.service_type == "scolarite",
    ).count()
    if deja_pourvu > 0 and not force_realign_all:
        return 0

    realigned_cnt, tranches_creees, _ = _realign_students_on_grille(
        [student], db, annee_scolaire, force_realign_all=force_realign_all
    )
    return tranches_creees + realigned_cnt


def _realign_students_on_grille(
    students: List[models.Eleve],
    db: Session,
    annee_scolaire: str = "2026-2027",
    force_realign_all: bool = False
) -> Tuple[int, int, int]:
    """Réécrit l'échéancier de chaque élève d'après sa grille tarifaire officielle.

    Un échéancier déjà mouvementé n'est reconstruit de zéro que sur demande explicite
    (`force_realign_all`) : sinon ses tranches sont seulement remises au libellé, au
    montant et à la date de la grille, sans perdre les versements déjà imputés.

    Renvoie (élèves réalignés, tranches créées, échecs). Le commit revient à l'appelant.
    """
    realigned_count = 0
    created_tranches_count = 0
    failed_count = 0
    ecoles_cache: Dict[Any, Optional[models.Etablissement]] = {}

    for student in students:
        try:
            # Si classe_id manquant mais AU_CLASSEPRECEDENTE présent, tenter de le lier
            if not student.classe_id and student.AU_CLASSEPRECEDENTE:
                c_clean = str(student.AU_CLASSEPRECEDENTE).strip().lower()
                c_obj = db.query(models.Classe).filter(func.lower(models.Classe.CE_LIBELLE) == c_clean).first()
                if not c_obj:
                    c_obj = db.query(models.Classe).filter(func.lower(models.Classe.CE_LIBELLE).like(f"%{c_clean}%")).first()
                if c_obj:
                    student.classe_id = c_obj.id
                    if not student.ecole_id and c_obj.ecole_id:
                        student.ecole_id = c_obj.ecole_id
                    if not student.ET_CODEETABLISSEMENT and c_obj.ET_CODEETABLISSEMENT:
                        student.ET_CODEETABLISSEMENT = c_obj.ET_CODEETABLISSEMENT

            grille = resolve_official_grille_for_student(student, db, annee_scolaire)
            if not grille:
                failed_count += 1
                continue

            tranches = grille.tranches if isinstance(grille.tranches, list) else json.loads(grille.tranches or "[]")
            if not tranches:
                failed_count += 1
                continue

            if student.ecole_id not in ecoles_cache:
                ecoles_cache[student.ecole_id] = db.query(models.Etablissement).filter(
                    models.Etablissement.IDETABLISSEMENT == student.ecole_id
                ).first() if student.ecole_id else None

            tranches, montant_retire = _filtrer_tranches_septembre(tranches, ecoles_cache[student.ecole_id])
            if not tranches:
                failed_count += 1
                continue

            student.AU_SCOLARITE = max(
                Decimal("0.00"), Decimal(str(grille.total or 0)) - montant_retire
            )

            existing_echeances = db.query(models.EcheancierPaiement).filter(
                models.EcheancierPaiement.eleve_id == student.id,
                models.EcheancierPaiement.annee_scolaire == annee_scolaire,
                models.EcheancierPaiement.service_type == "scolarite"
            ).order_by(models.EcheancierPaiement.tranche_numero.asc(), models.EcheancierPaiement.id.asc()).all()

            total_paid = sum(Decimal(str(e.montant_paye or 0)) for e in existing_echeances)
            total_grille = sum(Decimal(str(tr.get("montant", 0) or 0)) for tr in tranches)

            if total_paid == 0 or force_realign_all:
                for e in existing_echeances:
                    db.delete(e)
                db.flush()

                reste_a_imputer = total_paid
                for idx, tr in enumerate(tranches, start=1):
                    due_date = datetime.strptime(tr["date"], "%Y-%m-%d").date()
                    montant_prev = Decimal(str(tr.get("montant", 0)))
                    impute = min(montant_prev, reste_a_imputer)
                    reste_a_imputer -= impute

                    nouvelle = crud.create_echeance(
                        db,
                        echeance=schemas.EcheancierCreate(
                            eleve_id=student.id,
                            ecole_id=student.ecole_id,
                            ET_CODEETABLISSEMENT=student.ET_CODEETABLISSEMENT,
                            libelle=tr.get("libelle", f"Tranche {idx}"),
                            service_type="scolarite",
                            tranche_numero=idx,
                            montant_prevu=montant_prev,
                            montant_paye=impute,
                            date_echeance=due_date,
                            statut="paye" if impute >= montant_prev else ("partiel" if impute > 0 else "non_paye"),
                            annee_scolaire=annee_scolaire
                        )
                    )
                    created_tranches_count += 1
            else:
                for idx, tr in enumerate(tranches, start=1):
                    montant_prev = Decimal(str(tr.get("montant", 0)))
                    due_date = datetime.strptime(tr["date"], "%Y-%m-%d").date()
                    libelle = tr.get("libelle", f"Tranche {idx}")

                    if idx <= len(existing_echeances):
                        ech = existing_echeances[idx - 1]
                        ech.libelle = libelle
                        ech.montant_prevu = montant_prev
                        ech.date_echeance = due_date
                        ech.service_type = "scolarite"
                        ech.tranche_numero = idx
                    else:
                        crud.create_echeance(
                            db,
                            echeance=schemas.EcheancierCreate(
                                eleve_id=student.id,
                                ecole_id=student.ecole_id,
                                ET_CODEETABLISSEMENT=student.ET_CODEETABLISSEMENT,
                                libelle=libelle,
                                montant_prevu=montant_prev,
                                date_echeance=due_date,
                                statut="non_paye",
                                annee_scolaire=annee_scolaire
                            )
                        )
                        created_tranches_count += 1

                if len(existing_echeances) > len(tranches):
                    for extra_ech in existing_echeances[len(tranches):]:
                        if (extra_ech.montant_paye or 0) == 0:
                            db.delete(extra_ech)

            student.AU_TOTALDEPOT = total_paid
            student.AU_SOLDECOMPTE = max(Decimal("0.00"), (student.AU_SCOLARITE or Decimal("0.00")) - total_paid)
            student.solde = student.AU_SOLDECOMPTE
            realigned_count += 1
        except Exception as e:
            failed_count += 1
            print(f"[_realign_students_on_grille error]: {e}")
            continue

    return realigned_count, created_tranches_count, failed_count


@router.post("/generate-by-affectation")
def generate_echeanciers_by_affectation(
    data: Dict[str, Any],
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Génère automatiquement les échéanciers en fonction du statut d'affectation et de la grille officielle."""
    annee_scolaire = data.get("annee_scolaire", "2026-2027")

    students_to_process = []
    if data.get("eleve_id"):
        s = db.query(models.Eleve).filter(models.Eleve.id == data["eleve_id"]).first()
        if s:
            students_to_process.append(s)
    elif data.get("classe_id"):
        students_to_process = db.query(models.Eleve).filter(models.Eleve.classe_id == data["classe_id"]).all()
    elif data.get("ecole_id"):
        students_to_process = db.query(models.Eleve).filter(models.Eleve.ecole_id == data["ecole_id"]).all()

    auth_ids = scope.get_authorized_school_ids(db)
    students_to_process = [
        s for s in students_to_process
        if (not auth_ids or s.ecole_id in auth_ids) and scope.can_access_student(s, db)
    ]

    if not students_to_process:
        raise HTTPException(status_code=400, detail="Aucun élève trouvé")

    created_count = 0
    failed_count = 0
    affectation_summary = {"AFF": 0, "NAFF": 0}

    for student in students_to_process:
        try:
            tarif_status = _map_statut_orientation_to_tarif(student.statut_orientation)
            affectation_summary[tarif_status] = affectation_summary.get(tarif_status, 0) + 1

            grille = resolve_official_grille_for_student(student, db, annee_scolaire)
            if not grille:
                failed_count += 1
                continue

            existing = db.query(models.EcheancierPaiement).filter(
                models.EcheancierPaiement.eleve_id == student.id,
                models.EcheancierPaiement.annee_scolaire == annee_scolaire,
                models.EcheancierPaiement.service_type == "scolarite"
            ).all()

            if any(e.montant_paye > 0 for e in existing):
                continue

            for e in existing:
                db.delete(e)
            db.commit()

            tranches = grille.tranches if isinstance(grille.tranches, list) else json.loads(grille.tranches or "[]")
            for idx, tr in enumerate(tranches, start=1):
                due_date = datetime.strptime(tr["date"], "%Y-%m-%d").date()
                crud.create_echeance(
                    db,
                    echeance=schemas.EcheancierCreate(
                        eleve_id=student.id,
                        libelle=tr.get("libelle", f"Tranche {idx}"),
                        montant_prevu=Decimal(str(tr.get("montant", 0))),
                        date_echeance=due_date,
                        statut="non_paye",
                        annee_scolaire=annee_scolaire
                    )
                )
                created_count += 1
        except Exception:
            failed_count += 1
            continue

    return {
        "success": True,
        "message": f"Échéanciers générés pour {len(students_to_process)} élève(s).",
        "created": created_count,
        "failed": failed_count,
        "affectation_breakdown": {
            "affectes": affectation_summary.get("AFF", 0),
            "non_affectes": affectation_summary.get("NAFF", 0)
        }
    }


@router.get("/", response_model=List[schemas.EcheancierResponse])
def read_echeanciers(
    eleve_id: Optional[int] = Query(None),
    ecole_id: Optional[int] = Query(None),
    code_etablissement: Optional[str] = Query(None),
    classe_id: Optional[int] = Query(None),
    annee_scolaire: Optional[str] = Query("2026-2027"),
    ville: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    target_ecole_id = ecole_id or (scope.ecole_id if not scope.is_global else None)
    target_code = code_etablissement or (scope.code_etablissement if not scope.is_global else None)

    auth_ids = scope.get_authorized_school_ids(db) if not scope.is_global else None
    auth_codes = scope.get_authorized_school_codes(db) if not scope.is_global else None

    return crud.get_echeanciers(
        db,
        eleve_id=eleve_id,
        ecole_id=target_ecole_id if (scope.is_global or target_ecole_id in (auth_ids or [])) else None,
        code_etablissement=target_code if (scope.is_global or target_code in (auth_codes or [])) else None,
        ecole_ids=auth_ids if not target_ecole_id and not target_code else None,
        code_etablissements=auth_codes if not target_ecole_id and not target_code else None,
        classe_id=classe_id,
        annee_scolaire=annee_scolaire,
        ville=ville or (scope.ville if not scope.is_global else None)
    )

def _find_matching_hinneh_preset(niveau_str: str, classe_str: str, is_aff: bool, is_redoublant: bool = False) -> Optional[str]:
    """Trouve le preset Hinneh le plus adapté en fonction du niveau, classe, statut AFF/NAFF et redoublant."""
    n_str = (niveau_str or classe_str or "").lower().strip()
    if not n_str:
        return None

    def normalize(s: str) -> str:
        return s.lower().replace("è", "e").replace("eme", "").replace("ème", "").replace("e", "").replace(" ", "")

    # Maternelle
    if any(x in n_str for x in ["maternelle", "mat", "ps", "ms", "gs"]):
        if "mps" in n_str or "ps" in n_str:
            return "maternelle_mps"
        elif "mms" in n_str or "ms" in n_str:
            return "maternelle_mms"
        elif "mgs" in n_str or "gs" in n_str:
            return "maternelle_mgs"
        return "maternelle_mps"

    # Primaire
    if any(x in n_str for x in ["primaire", "prim", "cp", "ce", "cm"]):
        if "cm2" in n_str:
            return "primaire_cm2"
        elif "cm1" in n_str:
            return "primaire_cm1"
        elif "ce" in n_str and ("1" in n_str or "2" in n_str):
            if "2" in n_str:
                return "primaire_ce1_ce2"
            return "primaire_ce1_ce2"
        elif "ce" in n_str:
            return "primaire_ce1_ce2"
        elif "cp" in n_str:
            return "primaire_cp1_cp2"
        return "primaire_cp1_cp2"

    # Collège 1er cycle (6ème)
    if "6" in n_str:
        if is_redoublant and is_aff:
            return "reinscription_6eme_redoublant_aff"
        elif is_aff:
            return "inscription_6eme_sans_test_aff"
        else:
            return "inscription_6eme_sans_test_aff"

    # Collège 1er cycle (5ème)
    if "5" in n_str:
        if is_aff:
            return "reinscription_5eme_c_d_aff" if any(x in n_str for x in ["c", "d"]) else "reinscription_5eme_aff"
        else:
            return "reinscription_5eme_aff"

    # Collège 1er cycle (4ème)
    if "4" in n_str:
        if is_aff:
            return "reinscription_4eme_c_d_aff" if any(x in n_str for x in ["c", "d"]) else "reinscription_4eme_aff"
        else:
            return "reinscription_4eme_aff"

    # Collège 1er cycle (3ème)
    if "3" in n_str:
        return "inscription_6eme_sans_test_aff"

    # Collège 2nd cycle (2nde)
    if "2nd" in n_str or "2nde" in n_str or (normalize(n_str) == "2" and "nde" in n_str):
        return "reinscription_2nde_aff" if is_aff else "reinscription_2nde_naff"

    # Collège 2nd cycle (1ère)
    if "1er" in n_str or "1ère" in n_str or "premiere" in n_str:
        return "reinscription_1ere_a_c_d_anciens_aff"

    # Collège 2nd cycle (Terminale)
    if "tle" in n_str or "terminal" in n_str:
        return "reinscription_tle_a_c_d_aff" if is_aff else "reinscription_tle_a_c_d_naff"

    return "inscription_6eme_sans_test_aff"

@router.get("/student/{student_id}")
def get_student_echeancier_summary(
    student_id: str,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    try:
        clean_id = int(str(student_id).split(":")[0].strip())
    except Exception:
        raise HTTPException(status_code=400, detail=f"ID élève invalide: {student_id}")

    student = db.query(models.Eleve).filter(models.Eleve.id == clean_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Élève non trouvé")

    if not scope.can_access_student(student, db):
        raise HTTPException(status_code=403, detail="Accès refusé à cet élève d'un autre établissement")

    echeances = crud.get_echeanciers(db, eleve_id=clean_id)

    # Réalignement automatique de la 1ère tranche de Terminale :
    # - 62 000 FCFA pour les AFFECTÉS
    # - 67 000 FCFA pour les NON-AFFECTÉS
    classe_name = ""
    if student.classe_id:
        cls = db.query(models.Classe).filter(models.Classe.id == student.classe_id).first()
        if cls and cls.CE_LIBELLE:
            classe_name = cls.CE_LIBELLE.lower()
    if not classe_name and student.AU_CLASSEPRECEDENTE:
        classe_name = (student.AU_CLASSEPRECEDENTE or "").lower()

    statut_orient = (getattr(student, 'statut_orientation', '') or getattr(student, 'AU_STATUT', '') or '').lower()
    is_aff = 'affecté' in statut_orient or 'aff' in statut_orient or 'subvention' in statut_orient

    if any(k in classe_name for k in ["tle", "term", "terminale"]) and echeances:
        # Déterminer le preset officiel pour cet élève Terminale
        statut_orient_lower = (getattr(student, 'statut_orientation', '') or getattr(student, 'AU_STATUT', '') or '').lower()
        is_aff_for_preset = 'affecté' in statut_orient_lower or 'aff' in statut_orient_lower
        preset_key = "reinscription_tle_a_c_d_aff" if is_aff_for_preset else "reinscription_tle_a_c_d_naff"
        preset = HINNEH_OFFICIAL_PRESETS.get(preset_key)
        
        needs_commit = False
        if preset:
            preset_tranches = preset.get("tranches", [])
            # Récupérer uniquement les tranches de scolarité triées par numéro
            sch_echeances = sorted(
                [e for e in echeances if (e.service_type or "scolarite") == "scolarite"],
                key=lambda e: (e.date_echeance or date.today(), e.id)
            )
            for idx, ech in enumerate(sch_echeances):
                if idx < len(preset_tranches):
                    correct_montant = Decimal(str(preset_tranches[idx]["montant"]))
                    if ech.montant_paye == Decimal("0.00") and ech.montant_prevu != correct_montant:
                        ech.montant_prevu = correct_montant
                        ech.statut = "non_paye"
                        needs_commit = True
                    elif ech.montant_prevu != correct_montant and ech.montant_paye > Decimal("0.00"):
                        # Tranche partiellement ou totalement payée : ajuster seulement si le paiement est inférieur
                        if ech.montant_paye < correct_montant:
                            ech.montant_prevu = correct_montant
                            ech.statut = "partiel"
                            needs_commit = True
                        elif ech.montant_paye >= correct_montant:
                            ech.montant_prevu = correct_montant
                            ech.statut = "paye"
                            needs_commit = True
        else:
            # Fallback : réaligner seulement le 1er versement à 67 000
            target_first_tranche = Decimal("67000.00")
            for ech in echeances:
                if ("1er vers" in (ech.libelle or "").lower() or "05 sept" in (ech.libelle or "").lower()) and ech.montant_prevu != target_first_tranche:
                    ech.montant_prevu = target_first_tranche
                    if ech.montant_paye and ech.montant_paye >= target_first_tranche:
                        ech.statut = "paye"
                    elif ech.montant_paye and ech.montant_paye > Decimal("0.00"):
                        ech.statut = "partiel"
                    else:
                        ech.statut = "non_paye"
                    needs_commit = True
        
        if needs_commit:
            db.commit()
    if not echeances:
        classe_obj = db.query(models.Classe).filter(models.Classe.id == student.classe_id).first() if student.classe_id else None
        ecole = db.query(models.Etablissement).filter(models.Etablissement.IDETABLISSEMENT == student.ecole_id).first() if student.ecole_id else None

        from .caisse import find_online_grille_for_student
        grid_label, grid_tranches, grid_total = find_online_grille_for_student(db, student, classe_obj, ecole)

        if grid_tranches:
            default_dates = [
                date(2026, 9, 5),
                date(2026, 10, 5),
                date(2026, 11, 5),
                date(2026, 12, 5),
                date(2027, 1, 5),
                date(2027, 2, 5),
                date(2027, 3, 5),
                date(2027, 4, 5),
                date(2027, 5, 5),
            ]

            # Allouer automatiquement les paiements passés de scolarité
            pmts = db.query(models.Paiement).filter(
                models.Paiement.eleve_id == student.id,
                models.Paiement.statut == "paye",
                models.Paiement.type.in_(["scolarite", "inscription", "frais_inscription", "frais_annexe", "reinscription"])
            ).all()
            total_past_paye = sum((Decimal(str(p.montant)) for p in pmts), Decimal("0.00"))
            rem_to_pay = total_past_paye

            for idx, (libelle_tranche, montant_tranche) in enumerate(grid_tranches, start=1):
                m_dec = Decimal(str(montant_tranche))
                p_dec = min(m_dec, rem_to_pay)
                rem_to_pay = max(Decimal("0.00"), rem_to_pay - p_dec)
                st = "paye" if p_dec >= m_dec else ("partiel" if p_dec > 0 else "non_paye")

                dt_ech = default_dates[idx - 1] if idx - 1 < len(default_dates) else date(2027, 2, 5)
                new_ech = models.EcheancierPaiement(
                    eleve_id=student.id,
                    ecole_id=student.ecole_id,
                    ET_CODEETABLISSEMENT=student.ET_CODEETABLISSEMENT,
                    libelle=libelle_tranche,
                    service_type="scolarite",
                    tranche_numero=idx,
                    montant_prevu=m_dec,
                    montant_paye=p_dec,
                    date_echeance=dt_ech,
                    statut=st,
                    annee_scolaire="2026-2027",
                )
                db.add(new_ech)
            db.commit()
            echeances = crud.get_echeanciers(db, eleve_id=clean_id)

    total_prevu = sum((e.montant_prevu for e in echeances), Decimal("0.00"))
    total_paye = sum((e.montant_paye for e in echeances), Decimal("0.00"))
    solde_restant = total_prevu - total_paye
    nb_en_retard = len([e for e in echeances if e.statut == "en_retard"])

    return {
        "eleve": {
            "id": student.id,
            "matricule": student.matricule,
            "nom": student.nom,
            "prenom": student.prenom,
            "classe_id": student.classe_id,
        },
        "summary": {
            "total_prevu": float(total_prevu),
            "total_paye": float(total_paye),
            "solde_restant": float(solde_restant),
            "nb_en_retard": nb_en_retard,
            "statut_global": "a_jour" if nb_en_retard == 0 and solde_restant <= 0 else ("en_retard" if nb_en_retard > 0 else ("non_paye" if total_paye <= 0 else "partiel"))
        },
        "echeances": echeances
    }

@router.post("/", response_model=schemas.EcheancierResponse)
def create_echeance(
    echeance: schemas.EcheancierCreate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    student = db.query(models.Eleve).filter(models.Eleve.id == echeance.eleve_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Élève non trouvé")

    # Vérifier que l'utilisateur peut créer pour cet élève
    if not scope.can_access_student(student, db):
        raise HTTPException(status_code=403, detail="Vous n'avez pas accès à cet élève")

    if not echeance.ecole_id:
        echeance.ecole_id = student.ecole_id
    if not getattr(echeance, 'ET_CODEETABLISSEMENT', None) and student.ET_CODEETABLISSEMENT:
        setattr(echeance, 'ET_CODEETABLISSEMENT', student.ET_CODEETABLISSEMENT)
    return crud.create_echeance(db, echeance=echeance)

@router.post("/generate-template")
def generate_echeancier_template(
    data: schemas.EcheancierGenerateTemplate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    students_to_process = []
    if data.eleve_id:
        s = db.query(models.Eleve).filter(models.Eleve.id == data.eleve_id).first()
        if s:
            students_to_process.append(s)
    elif data.classe_id:
        students_to_process = db.query(models.Eleve).filter(models.Eleve.classe_id == data.classe_id).all()
    elif data.niveau:
        n_str = data.niveau.strip().lower()
        matching_class_ids = [
            c.id for c in db.query(models.Classe).all()
            if n_str in (c.CE_LIBELLE or "").lower() or (c.niveau and n_str in (c.niveau.libelle or "").lower())
        ]
        if matching_class_ids:
            students_to_process = db.query(models.Eleve).filter(models.Eleve.classe_id.in_(matching_class_ids)).all()
    
    if not students_to_process:
        raise HTTPException(status_code=400, detail="Aucun élève spécifié ou trouvé")

    students_to_process = [s for s in students_to_process if scope.can_access_student(s, db)]
    if not students_to_process:
        raise HTTPException(status_code=403, detail="Aucun élève accessible pour cet établissement ou cette ville.")
        
    start_date = data.date_debut or date(2026, 9, 5)
    nb_tranches = data.nb_tranches if data.nb_tranches in (3, 4) else 3
    
    # Calculate installment breakdown ratios
    if nb_tranches == 3:
        ratios = [0.40, 0.30, 0.30]
        labels = ["1er vers. 05 sept.", "2ème vers. 05 nov.", "3ème vers. 05 fév."]
        months_offset = [0, 2, 5]
    else:
        ratios = [0.25, 0.25, 0.25, 0.25]
        labels = ["1er vers. 05 sept.", "2ème vers. 05 nov.", "3ème vers. 05 jan.", "4ème vers. 05 mars"]
        months_offset = [0, 2, 4, 6]
        
    created_count = 0
    for student in students_to_process:
        existing = db.query(models.EcheancierPaiement).filter(
            models.EcheancierPaiement.eleve_id == student.id,
            models.EcheancierPaiement.annee_scolaire == data.annee_scolaire,
            models.EcheancierPaiement.service_type == "scolarite"
        ).all()
        
        if any(e.montant_paye > 0 for e in existing):
            continue
            
        for e in existing:
            db.delete(e)
        db.commit()
        
        total_allocated = Decimal("0.00")
        for idx in range(nb_tranches):
            ratio = ratios[idx]
            if idx == nb_tranches - 1:
                montant_tranche = data.montant_total - total_allocated
            else:
                montant_tranche = (data.montant_total * Decimal(str(ratio))).quantize(Decimal("1.00"))
                total_allocated += montant_tranche
                
            m = start_date.month + months_offset[idx]
            y = start_date.year + (m - 1) // 12
            m = (m - 1) % 12 + 1
            due_date = date(y, m, min(start_date.day, 28))
            
            crud.create_echeance(
                db,
                echeance=schemas.EcheancierCreate(
                    eleve_id=student.id,
                    ecole_id=student.ecole_id,
                    ET_CODEETABLISSEMENT=student.ET_CODEETABLISSEMENT,
                    libelle=labels[idx],
                    tranche_numero=idx + 1,
                    montant_prevu=montant_tranche,
                    montant_paye=Decimal("0.00"),
                    date_echeance=due_date,
                    statut="non_paye",
                    annee_scolaire=data.annee_scolaire
                )
            )
            created_count += 1
            
    return {
        "success": True,
        "message": f"Échéancier généré avec succès pour {len(students_to_process)} élève(s) ({created_count} tranches créées).",
        "tranches_creees": created_count
    }

@router.put("/{echeance_id}", response_model=schemas.EcheancierResponse)
def update_echeance(
    echeance_id: int,
    data: schemas.EcheancierUpdate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    echeance = db.query(models.EcheancierPaiement).filter(models.EcheancierPaiement.id == echeance_id).first()
    if not echeance:
        raise HTTPException(status_code=404, detail="Échéance non trouvée")

    student = db.query(models.Eleve).filter(models.Eleve.id == echeance.eleve_id).first()
    if student and not scope.can_access_student(student, db):
        raise HTTPException(status_code=403, detail="Vous n'avez pas accès à cette échéance")

    updated = crud.update_echeance(db, echeance_id=echeance_id, update_data=data.dict(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Échéance non trouvée")
    return updated

@router.post("/{echeance_id}/pay")
def pay_echeance(
    echeance_id: int,
    montant: float = Query(..., gt=0),
    mode: str = Query("especes"),
    numero_transaction: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    echeance = db.query(models.EcheancierPaiement).filter(models.EcheancierPaiement.id == echeance_id).first()
    if not echeance:
        raise HTTPException(status_code=404, detail="Échéance non trouvée")

    student = db.query(models.Eleve).filter(models.Eleve.id == echeance.eleve_id).first()
    if student and not scope.can_access_student(student, db):
        raise HTTPException(status_code=403, detail="Vous n'avez pas accès à cet élève")
        
    montant_dec = Decimal(str(montant))
    echeance.montant_paye += montant_dec
    echeance.date_dernier_versement = date.today()
    
    if echeance.montant_paye >= echeance.montant_prevu:
        echeance.statut = "paye"
    else:
        echeance.statut = "partiel"
        
    payment_in = schemas.PaymentCreate(
        montant=montant_dec,
        type="scolarite",
        mode=mode,
        statut="paye",
        date_echeance=echeance.date_echeance,
        eleve_id=echeance.eleve_id,
        numero_transaction=numero_transaction
    )
    p = crud.create_payment(db, payment=payment_in)
    
    return {
        "success": True,
        "message": f"Versement de {montant:,.0f} FCFA enregistré avec succès.",
        "echeance": echeance,
        "recu_numero": p.numero_recu
    }

@router.delete("/{echeance_id}")
def delete_echeance(
    echeance_id: int,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    echeance = db.query(models.EcheancierPaiement).filter(models.EcheancierPaiement.id == echeance_id).first()
    if not echeance:
        raise HTTPException(status_code=404, detail="Échéance non trouvée")
    student = db.query(models.Eleve).filter(models.Eleve.id == echeance.eleve_id).first()
    if student and not scope.can_access_student(student, db):
        raise HTTPException(status_code=403, detail="Vous n'avez pas accès à cette échéance")

    ok = crud.delete_echeance(db, echeance_id=echeance_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Échéance non trouvée")
    return {"success": True, "message": "Échéance supprimée avec succès."}


@router.post("/purge-unpaid-echeanciers")
@router.delete("/purge-unpaid-echeanciers")
def purge_unpaid_echeanciers(
    ecole_id: Optional[int] = Query(None),
    code_etablissement: Optional[str] = Query(None),
    annee_scolaire: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Supprime toutes les échéances non payées / mock qui n'ont fait l'objet d'aucun versement (montant_paye <= 0)."""
    target_ecole_id = ecole_id or (scope.ecole_id if not scope.is_global else None)
    target_code = code_etablissement or (scope.code_etablissement if not scope.is_global else None)

    auth_ids = scope.get_authorized_school_ids(db) if not scope.is_global else None
    auth_codes = scope.get_authorized_school_codes(db) if not scope.is_global else None

    query = db.query(models.EcheancierPaiement).filter(
        or_(models.EcheancierPaiement.montant_paye <= Decimal("0.00"), models.EcheancierPaiement.montant_paye.is_(None))
    )

    if annee_scolaire:
        query = query.filter(models.EcheancierPaiement.annee_scolaire == annee_scolaire)

    if target_ecole_id:
        query = query.filter(models.EcheancierPaiement.ecole_id == target_ecole_id)
    elif target_code:
        query = query.filter(
            or_(
                models.EcheancierPaiement.ET_CODEETABLISSEMENT == target_code,
                models.EcheancierPaiement.eleve_id.in_(
                    db.query(models.Eleve.id).filter(models.Eleve.ET_CODEETABLISSEMENT == target_code)
                )
            )
        )
    elif not scope.is_global:
        conds = []
        if auth_ids:
            conds.append(models.EcheancierPaiement.ecole_id.in_(auth_ids))
        if auth_codes:
            conds.append(models.EcheancierPaiement.ET_CODEETABLISSEMENT.in_(auth_codes))
            conds.append(models.EcheancierPaiement.eleve_id.in_(
                db.query(models.Eleve.id).filter(models.Eleve.ET_CODEETABLISSEMENT.in_(auth_codes))
            ))
        if conds:
            query = query.filter(or_(*conds))
        else:
            return {"success": True, "deleted_count": 0, "message": "Aucun établissement autorisé trouvé."}

    deleted_count = query.delete(synchronize_session=False)
    db.commit()

    return {
        "success": True,
        "deleted_count": deleted_count,
        "message": f"{deleted_count} tranche(s) d'échéancier vierge(s) / mock supprimée(s) avec succès."
    }

