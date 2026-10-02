from email import errors
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional, Dict, Any, Tuple
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
import json
import re
import io
from pydantic import BaseModel

from ..database import get_db
from .. import crud, schemas, models
from .students import _normalize_header, _parse_uploaded_file


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
    """Réaligne les totaux du compte élève sur la somme de ses tranches."""
    total_paye = db.query(func.coalesce(func.sum(models.EcheancierPaiement.montant_paye), 0)).filter(
        models.EcheancierPaiement.eleve_id == eleve.id
    ).scalar() or Decimal("0.00")
    total_prevu = db.query(func.coalesce(func.sum(models.EcheancierPaiement.montant_prevu), 0)).filter(
        models.EcheancierPaiement.eleve_id == eleve.id
    ).scalar() or Decimal("0.00")

    eleve.AU_TOTALDEPOT = Decimal(str(total_paye))
    if not eleve.AU_SCOLARITE or Decimal(str(eleve.AU_SCOLARITE)) < Decimal(str(total_prevu)):
        eleve.AU_SCOLARITE = Decimal(str(total_prevu))
    eleve.AU_SOLDECOMPTE = Decimal(str(eleve.AU_SCOLARITE)) - Decimal(str(total_paye))


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
            {"libelle": "1er vers. 05 sept.", "montant": 62000, "date": "2026-09-05"},
            {"libelle": "2ème vers. 05 oct.", "montant": 50000, "date": "2026-10-05"},
            {"libelle": "3ème vers. 05 nov.", "montant": 50000, "date": "2026-11-05"},
            {"libelle": "4ème vers. 05 déc.", "montant": 45000, "date": "2026-12-05"},
            {"libelle": "5ème vers. 05 jan. (Solde)", "montant": 43000, "date": "2027-01-05"},
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

_PRESETS_FILE = Path(__file__).resolve().parents[1] / "data" / "hinneh_presets.json"
if _PRESETS_FILE.exists():
    try:
        with _PRESETS_FILE.open("r", encoding="utf-8") as presets_file:
            HINNEH_OFFICIAL_PRESETS = json.load(presets_file)
    except (OSError, json.JSONDecodeError):
        pass


def _save_hinneh_presets() -> None:
    _PRESETS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with _PRESETS_FILE.open("w", encoding="utf-8") as presets_file:
        json.dump(HINNEH_OFFICIAL_PRESETS, presets_file, ensure_ascii=False, indent=2)


class ApplyHinnehPresetRequest(BaseModel):
    preset_id: str
    eleve_id: Optional[int] = None
    classe_id: Optional[int] = None
    niveau: Optional[str] = None
    annee_scolaire: Optional[str] = "2026-2027"


class HinnehPresetTranche(BaseModel):
    libelle: str
    montant: Decimal
    date: str


class HinnehPresetUpdate(BaseModel):
    label: str
    cycle: str
    niveaux: List[str]
    tranches: List[HinnehPresetTranche]


@router.get("/hinneh-presets")
def get_hinneh_official_presets():
    return list(HINNEH_OFFICIAL_PRESETS.values())


def _upsert_preset(preset_id: str, data: HinnehPresetUpdate):
    preset = HINNEH_OFFICIAL_PRESETS.get(preset_id)
    if not preset:
        preset = {"id": preset_id}
        HINNEH_OFFICIAL_PRESETS[preset_id] = preset

    label = data.label.strip()
    cycle = data.cycle.strip()
    niveaux = [niveau.strip() for niveau in data.niveaux if niveau.strip()]
    if not label or not cycle or not niveaux:
        raise HTTPException(status_code=400, detail="Le libellé, le cycle et au moins un niveau sont requis")
    if not data.tranches:
        raise HTTPException(status_code=400, detail="Ajoutez au moins une tranche de paiement")

    tranches = []
    for tranche in data.tranches:
        libelle = tranche.libelle.strip()
        if not libelle or tranche.montant <= 0:
            raise HTTPException(status_code=400, detail="Chaque tranche doit avoir un libellé et un montant positif")
        try:
            datetime.strptime(tranche.date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="La date de chaque tranche doit être au format AAAA-MM-JJ")
        tranches.append({"libelle": libelle, "montant": int(tranche.montant), "date": tranche.date})

    preset.update({
        "label": label,
        "cycle": cycle,
        "niveaux": niveaux,
        "tranches": tranches,
        "total": sum(tranche["montant"] for tranche in tranches),
    })
    _save_hinneh_presets()
    return preset


@router.post("/hinneh-presets")
def create_hinneh_official_preset(data: HinnehPresetUpdate):
    preset_id = data.label.lower().replace(' ', '_').replace('/', '_')
    return _upsert_preset(preset_id, data)


@router.post("/hinneh-presets/{preset_id}")
@router.put("/hinneh-presets/{preset_id}")
def update_hinneh_official_preset(preset_id: str, data: HinnehPresetUpdate):
    return _upsert_preset(preset_id, data)


@router.delete("/hinneh-presets/{preset_id}")
def delete_hinneh_official_preset(preset_id: str):
    preset = HINNEH_OFFICIAL_PRESETS.pop(preset_id, None)
    if not preset:
        raise HTTPException(status_code=404, detail="Modèle tarifaire introuvable")
    _save_hinneh_presets()
    return {"success": True, "message": f"Le modèle '{preset['label']}' a été supprimé."}


@router.post("/apply-hinneh-preset")
def apply_hinneh_preset(data: ApplyHinnehPresetRequest, db: Session = Depends(get_db)):
    print(data.preset_id)
    if data.preset_id not in HINNEH_OFFICIAL_PRESETS:
        raise HTTPException(status_code=400, detail="Modèle tarifaire non valide")

    preset = HINNEH_OFFICIAL_PRESETS[data.preset_id]
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

    created_count = 0
    for student in students_to_process:
        # Clear non-paid existing schedules to apply official preset
        existing = db.query(models.EcheancierPaiement).filter(
            models.EcheancierPaiement.eleve_id == student.id,
            models.EcheancierPaiement.annee_scolaire == data.annee_scolaire
        ).all()

        if any(e.montant_paye > 0 for e in existing):
            continue

        for e in existing:
            db.delete(e)
        db.commit()

        for idx, tr in enumerate(preset["tranches"], start=1):
            due_date = datetime.strptime(tr["date"], "%Y-%m-%d").date()
            crud.create_echeance(
                db,
                echeance=schemas.EcheancierCreate(
                    eleve_id=student.id,
                    ecole_id=student.ecole_id,
                    libelle=tr["libelle"],
                    tranche_numero=idx,
                    montant_prevu=Decimal(str(tr["montant"])),
                    montant_paye=Decimal("0.00"),
                    date_echeance=due_date,
                    statut="non_paye",
                    annee_scolaire=data.annee_scolaire or "2026-2027"
                )
            )
            created_count += 1

    return {
        "success": True,
        "message": f"Échéancier officiel Hînneh ({preset['label']}) appliqué à {len(students_to_process)} élève(s).",
        "tranches_creees": created_count
    }

@router.get("/", response_model=List[schemas.EcheancierResponse])
def read_echeanciers(
    eleve_id: Optional[int] = Query(None),
    ecole_id: Optional[int] = Query(None),
    classe_id: Optional[int] = Query(None),
    annee_scolaire: Optional[str] = Query("2026-2027"),
    ville: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    return crud.get_echeanciers(
        db,
        eleve_id=eleve_id,
        ecole_id=ecole_id,
        classe_id=classe_id,
        annee_scolaire=annee_scolaire,
        ville=ville
    )

@router.get("/student/{student_id}")
def get_student_echeancier_summary(student_id: int, db: Session = Depends(get_db)):
    student = db.query(models.Eleve).filter(models.Eleve.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Élève non trouvé")

    echeances = crud.get_echeanciers(db, eleve_id=student_id)

    # Auto-resolve schedule from Classe / Niveau and AFF/NAFF status if no custom schedule exists yet
    if not echeances:
        classe_name = ""
        niveau_name = ""
        if student.classe_id:
            cls = db.query(models.Classe).filter(models.Classe.id == student.classe_id).first()
            if cls:
                classe_name = cls.CE_LIBELLE or ""
                if hasattr(cls, 'niveau') and cls.niveau:
                    niveau_name = cls.niveau.libelle or ""
        
        statut_orient = (getattr(student, 'statut_orientation', '') or getattr(student, 'AU_STATUT', '') or '').lower()
        is_aff = 'affecté' in statut_orient or 'aff' in statut_orient or 'subvention' in statut_orient
        
        preset_id = None
        n_str = (niveau_name or classe_name or "").lower()
        # if 'maternelle' in n_str or 'mat' in n_str or 'ps' in n_str or 'ms' in n_str or 'gs' in n_str:
        #     preset_id = "maternelle_mps"
        # elif 'cp' in n_str or 'ce' in n_str or 'cm' in n_str or 'prim' in n_str:
        #     preset_id = "primaire_cp1_cp2"
        # elif '6' in n_str or '5' in n_str or '4' in n_str or '3' in n_str:
        #     preset_id = "reinscription_6eme_hinneh" if is_aff else "reinscription_5eme_c_d"
        # elif '2nd' in n_str or '1er' in n_str or 'tle' in n_str or 'lyc' in n_str:
        #     preset_id = "lycee_affectes_2nde" if is_aff else "lycee_naf_2nde"

        if 'maternelle' in n_str or 'mat' in n_str or 'ps' in n_str or 'ms' in n_str or 'gs' in n_str:
            preset_id = "maternelle_mps"
        elif 'cp' in n_str or 'ce' in n_str or 'cm' in n_str or 'prim' in n_str:
            preset_id = "primaire_cp1_cp2"
        elif '6' in n_str or '5' in n_str or '4' in n_str or '3' in n_str:
            preset_id = "reinscription_6eme_hinneh" if is_aff else "reinscription_5eme_c_d"
        elif '2nd' in n_str or '1er' in n_str or 'tle' in n_str or 'lyc' in n_str:
            preset_id = "lycee_affectes_2nde" if is_aff else "lycee_naf_2nde"
            
        if preset_id and preset_id in HINNEH_OFFICIAL_PRESETS:
            preset = HINNEH_OFFICIAL_PRESETS[preset_id]
            for tr in preset.get("tranches", []):
                try:
                    dt_obj = datetime.strptime(tr["date"], "%Y-%m-%d").date()
                except Exception:
                    dt_obj = date.today()
                ech_obj = models.EcheancierPaiement(
                    eleve_id=student.id,
                    libelle=tr["libelle"],
                    montant_prevu=Decimal(str(tr["montant"])),
                    montant_paye=Decimal("0.00"),
                    date_echeance=dt_obj,
                    statut="non_paye",
                    annee_scolaire="2026-2027",
                    ecole_id=student.ecole_id
                )
                db.add(ech_obj)
            db.commit()
            echeances = crud.get_echeanciers(db, eleve_id=student_id)

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
            "statut_global": "a_jour" if nb_en_retard == 0 and solde_restant <= 0 else ("en_retard" if nb_en_retard > 0 else "partiel")
        },
        "echeances": echeances
    }

@router.post("/", response_model=schemas.EcheancierResponse)
def create_echeance(echeance: schemas.EcheancierCreate, db: Session = Depends(get_db)):
    student = db.query(models.Eleve).filter(models.Eleve.id == echeance.eleve_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Élève non trouvé")
    if not echeance.ecole_id:
        echeance.ecole_id = student.ecole_id
    return crud.create_echeance(db, echeance=echeance)

@router.post("/generate-template")
def generate_echeancier_template(data: schemas.EcheancierGenerateTemplate, db: Session = Depends(get_db)):
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
            models.EcheancierPaiement.annee_scolaire == data.annee_scolaire
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
def update_echeance(echeance_id: int, data: schemas.EcheancierUpdate, db: Session = Depends(get_db)):
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
    db: Session = Depends(get_db)
):
    echeance = db.query(models.EcheancierPaiement).filter(models.EcheancierPaiement.id == echeance_id).first()
    if not echeance:
        raise HTTPException(status_code=404, detail="Échéance non trouvée")
        
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
def delete_echeance(echeance_id: int, db: Session = Depends(get_db)):
    ok = crud.delete_echeance(db, echeance_id=echeance_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Échéance non trouvée")
    return {"success": True, "message": "Échéance supprimée avec succès."}
