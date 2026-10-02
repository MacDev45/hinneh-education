from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Body
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional, Any, Dict, Tuple, Union

from .. import crud, schemas, models
from ..database import get_db
from ..routers.auth import get_school_scope, SchoolScope
from .audit import log_audit

router = APIRouter(prefix="/students", tags=["Students"])

@router.get("/effectif/par-ecole", response_model=List[dict])
def get_effectif_par_ecole(
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Retourne l'effectif total des élèves par école autorrisée pour l'utilisateur.

    Pour un directeur, affiche le nombre d'élèves dans chacune des écoles du campus
    (maternelle, primaire, collège, etc.) qu'il supervise.
    """
    auth_ids = scope.get_authorized_school_ids(db)

    if not auth_ids:
        return []

    # Récupérer les infos des écoles
    schools = db.query(models.Etablissement).filter(
        models.Etablissement.IDETABLISSEMENT.in_(auth_ids)
    ).all()

    result = []
    for school in schools:
        # Compter les élèves actifs de cette école
        count = db.query(func.count(models.Eleve.id)).filter(
            models.Eleve.ecole_id == school.IDETABLISSEMENT,
            models.Eleve.statut == "actif"
        ).scalar() or 0

        result.append({
            "ecole_id": school.IDETABLISSEMENT,
            "nom_ecole": school.ET_DENOMMINATION,
            "code_etablissement": school.ET_CODEETABLISSEMENT,
            "ville": school.ET_VILLE,
            "effectif": count
        })

    # Trier par nom d'école
    result.sort(key=lambda x: x["nom_ecole"] or "")

    return result


import re
import unicodedata

def _clean_phone_number(val: Optional[str]) -> str:
    if not val:
        return ""
    digits = re.sub(r"[^\d]", "", str(val))
    if digits.startswith("225") and len(digits) > 8:
        digits = digits[3:]
    return digits.strip()

def _clean_name_string(val: Optional[str]) -> str:
    if not val:
        return ""
    s = str(val).strip().lower()
    s = ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
    return re.sub(r"\s+", " ", s).strip()


@router.get("/check-fraterie")
def check_fraterie(
    parent_nom: Optional[str] = None,
    parent_whatsapp: Optional[str] = None,
    ecole_id: Optional[int] = None,
    ville: Optional[str] = None,
    current_student_id: Optional[int] = None,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """
    Vérifie l'existence d'une fratrie pour la ville de DALOA.
    Règles :
      - Visible et appliqué UNIQUEMENT à Daloa.
      - 1er enfant : 0%
      - 2e enfant : 10%
      - 3e enfant : 15%
      - 4e enfant et + : 20%
    Identifie les enfants par Nom & Prénom du parent et Contact WhatsApp / Téléphone.
    """
    # Vérifier si l'établissement est à Daloa
    city = (ville or "").strip().lower()
    if ecole_id:
        school = db.query(models.Etablissement).filter(models.Etablissement.IDETABLISSEMENT == ecole_id).first()
        if school and school.ET_VILLE:
            city = school.ET_VILLE.strip().lower()

    clean_tel = _clean_phone_number(parent_whatsapp)
    clean_nom = _clean_name_string(parent_nom)

    if not clean_tel and not clean_nom:
        return {
            "fratrie_trouvee": False,
            "count_existants": 0,
            "rang_calcule": 1,
            "pourcentage_reduction": 0.0,
            "motif_auto": "Tarif normal (1er enfant)",
            "enfants_existants": []
        }

    # Requête de recherche des élèves existants (actifs)
    query = db.query(models.Eleve).filter(models.Eleve.statut == "actif")

    # Si une ville est définie, on recherche en priorité dans les établissements de la même ville/groupe
    if city:
        same_city_schools = db.query(models.Etablissement.IDETABLISSEMENT).filter(
            func.lower(models.Etablissement.ET_VILLE).like(f"%{city}%")
        ).all()
        city_school_ids = [s[0] for s in same_city_schools] if same_city_schools else []
        if city_school_ids:
            query = query.filter(models.Eleve.ecole_id.in_(city_school_ids))
    elif ecole_id:
        query = query.filter(models.Eleve.ecole_id == ecole_id)

    if current_student_id:
        query = query.filter(models.Eleve.id != current_student_id)

    students = query.order_by(models.Eleve.date_inscription.asc(), models.Eleve.id.asc()).all()

    matching_siblings = []
    for s in students:
        s_contacts = [
            _clean_phone_number(s.parent_whatsapp),
            _clean_phone_number(s.AU_CONTACTS),
            _clean_phone_number(s.AU_PERECONTACTS),
            _clean_phone_number(s.AU_MERECONTACTS),
            _clean_phone_number(s.AU_TUTEURLEGALCONTACTS),
        ]
        s_names = [
            _clean_name_string(s.parent_nom_complet),
            _clean_name_string(s.AU_PERENOMPRENOMS),
            _clean_name_string(s.AU_MERENOMPRENOMS),
            _clean_name_string(s.AU_TUTEURLEGAL),
        ]

        phone_matched = clean_tel and any(c and (c in clean_tel or clean_tel in c) for c in s_contacts if len(c) >= 8)
        name_matched = clean_nom and any(n and (n in clean_nom or clean_nom in n or (len(n.split()) >= 2 and n.split()[0] in clean_nom and n.split()[-1] in clean_nom)) for n in s_names if len(n) >= 4)

        if phone_matched or (clean_tel and clean_nom and (phone_matched or name_matched)):
            classe_nom = "—"
            if s.classe:
                classe_nom = getattr(s.classe, "CE_LIBELLE", "") or getattr(s.classe, "nom", "") or "—"
            matching_siblings.append({
                "id": s.id,
                "matricule": s.matricule,
                "nom": s.nom,
                "prenom": s.prenom,
                "classe": classe_nom,
                "ecole_id": s.ecole_id,
                "date_inscription": str(s.date_inscription) if s.date_inscription else None,
                "parent_nom": s.parent_nom_complet or s.AU_PERENOMPRENOMS or s.AU_MERENOMPRENOMS or s.AU_TUTEURLEGAL,
                "parent_tel": s.parent_whatsapp or s.AU_CONTACTS or s.AU_PERECONTACTS
            })

    count = len(matching_siblings)
    rang = count + 1

    # Barème Fratrie standard universel : 1er: 0%, 2e: 10%, 3e: 15%, 4e+: 20%
    if rang == 1:
        pourcentage = 0.0
    elif rang == 2:
        pourcentage = 10.0
    elif rang == 3:
        pourcentage = 15.0
    else:
        pourcentage = 20.0

    return {
        "fratrie_trouvee": count > 0,
        "count_existants": count,
        "rang_calcule": rang,
        "pourcentage_reduction": pourcentage,
        "motif_auto": f"Fratrie ({rang}e enfant : -{int(pourcentage)}%)" if pourcentage > 0 else "Tarif normal (1er enfant)",
        "enfants_existants": matching_siblings
    }



def _map_statut_orientation_to_tarif(statut_orientation: Optional[str]) -> str:
    """Mappe le statut d'orientation d'un élève aux codes de tarif.

    "Affecté par l'État" → "AFF" (tarif réduit)
    "Non Affecté" → "NAFF" (tarif plein)
    Sinon → "TOUS" (tarif universel)
    """
    if not statut_orientation:
        return "TOUS"

    statut_lower = statut_orientation.lower().strip()

    if "affecté" in statut_lower and "non" not in statut_lower:
        return "AFF"
    elif "non affecté" in statut_lower or "non-affecté" in statut_lower:
        return "NAFF"

    return "TOUS"


@router.get("/{student_id}/tarifs-applicables", response_model=List[dict])
def get_applicable_tariffs(
    student_id: str,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Retourne les tarifs applicables pour un élève selon son statut d'affectation.

    Les tarifs varient selon :
    - Le cycle de l'élève (Maternelle, Primaire, Collège)
    - Le niveau de l'élève (MPS, CP1, CP2, etc.)
    - Le statut d'affectation (Affecté par l'État = AFF, Non Affecté = NAFF)
    """
    clean_id = int(str(student_id).lstrip(":").split(":")[0].strip())
    db_student = crud.get_student_by_id(db, student_id=clean_id)

    if not db_student:
        raise HTTPException(status_code=404, detail="Élève non trouvé")

    if not scope.can_access_student(db_student, db):
        raise HTTPException(status_code=403, detail="Accès refusé à cet élève")

    # Déterminer le statut de tarif de l'élève
    tarif_status = _map_statut_orientation_to_tarif(db_student.statut_orientation)

    # Récupérer la classe et le cycle
    classe = None
    if db_student.classe_id:
        classe = db.query(models.Classe).filter(models.Classe.id == db_student.classe_id).first()

    # Chercher les tarifs applicables
    query = db.query(models.GrilleTarifaire).filter(
        models.GrilleTarifaire.type_service == "scolarite",
        models.GrilleTarifaire.ecole_id == db_student.ecole_id
    )

    # Filtrer par cycle et niveau si disponibles
    is_mat_or_prim = False
    if classe:
        cls_lib = f"{classe.CE_LIBELLE or ''} {classe.CE_CODECLASSE or ''}".lower()
        cyc_lib = str(classe.CY_LIBELLECYCLE or "").lower()
        is_mat_or_prim = any(k in cls_lib for k in ["mat", "ps", "ms", "gs", "cp", "ce", "cm", "prim"]) or ("mat" in cyc_lib or "prim" in cyc_lib)
        query = query.filter(
            or_(
                models.GrilleTarifaire.cycle == classe.CY_LIBELLECYCLE,
                models.GrilleTarifaire.cycle.is_(None)
            )
        )

    # Filtrer par statut d'affectation (sauf maternelle et primaire où la scolarité est réelle)
    if not is_mat_or_prim:
        query = query.filter(
            or_(
                models.GrilleTarifaire.statut_affectation == tarif_status,
                models.GrilleTarifaire.statut_affectation == "TOUS"
            )
        )

    tariffs = query.all()

    return [
        {
            "id": t.id,
            "preset_id": t.preset_id,
            "label": t.label,
            "cycle": t.cycle,
            "statut_affectation": t.statut_affectation,
            "montant_total": float(t.total),
            "nombre_tranches": len(t.tranches) if t.tranches else 0,
            "tranches": t.tranches or [],
            "date_applicabilite": f"{t.annee_scolaire}"
        }
        for t in tariffs
    ]


@router.get("/", response_model=List[schemas.StudentResponse])
def read_students(
    classe_id: Optional[int] = None,
    ecole_id: Optional[int] = None,
    code_etablissement: Optional[str] = None,
    skip: int = 0,
    limit: int = 5000,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    if scope.is_global:
        students = crud.get_students(
            db,
            ecole_id=ecole_id,
            code_etablissement=code_etablissement,
            classe_id=classe_id,
            skip=skip,
            limit=limit
        )
    else:
        auth_ids = scope.get_authorized_school_ids(db)
        auth_codes = scope.get_authorized_school_codes(db)

        if ecole_id is not None and ecole_id not in (auth_ids or []):
            ecole_id = None
        if code_etablissement is not None and code_etablissement not in (auth_codes or []):
            code_etablissement = None

        students = crud.get_students(
            db,
            ecole_id=ecole_id,
            code_etablissement=code_etablissement,
            classe_id=classe_id,
            ecole_ids=auth_ids if not ecole_id and not code_etablissement else None,
            code_etablissements=auth_codes if not ecole_id and not code_etablissement else None,
            skip=skip,
            limit=limit
        )
    return students


@router.get("/historique-retraits")
def read_withdrawal_history(
    ecole_id: Optional[int] = None,
    code_etablissement: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 500,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Retourne la liste des élèves retirés conservés dans la table historique."""
    if scope.is_global:
        history = crud.get_historique_retraits(
            db,
            ecole_id=ecole_id,
            code_etablissement=code_etablissement,
            search=search,
            skip=skip,
            limit=limit
        )
    else:
        auth_ids = scope.get_authorized_school_ids(db)
        auth_codes = scope.get_authorized_school_codes(db)
        if ecole_id is not None and ecole_id not in (auth_ids or []):
            ecole_id = None
        if code_etablissement is not None and code_etablissement not in (auth_codes or []):
            code_etablissement = None

        history = crud.get_historique_retraits(
            db,
            ecole_id=ecole_id,
            code_etablissement=code_etablissement,
            ecole_ids=auth_ids if not ecole_id and not code_etablissement else None,
            code_etablissements=auth_codes if not ecole_id and not code_etablissement else None,
            search=search,
            skip=skip,
            limit=limit
        )

    return [
        {
            "id": h.id,
            "eleve_id": h.eleve_id,
            "matricule": h.matricule,
            "nom": h.nom,
            "prenom": h.prenom,
            "nom_complet": h.nom_complet,
            "genre": h.genre,
            "date_naissance": str(h.date_naissance) if h.date_naissance else None,
            "lieu_naissance": h.lieu_naissance,
            "ecole_id": h.ecole_id,
            "nom_ecole": h.nom_ecole,
            "classe_id": h.classe_id,
            "nom_classe": h.nom_classe,
            "cycle": h.cycle,
            "niveau": h.niveau,
            "ET_CODEETABLISSEMENT": h.ET_CODEETABLISSEMENT,
            "motif_retrait": h.motif_retrait,
            "date_retrait": str(h.date_retrait) if h.date_retrait else None,
            "etablissement_accueil": h.etablissement_accueil,
            "observations": h.observations,
            "tuteur_nom": h.tuteur_nom,
            "tuteur_contact": h.tuteur_contact,
            "solde": float(h.solde) if h.solde is not None else 0.0,
            "statut": h.statut,
            "operateur": h.operateur,
            "date_creation": h.date_creation.isoformat() if h.date_creation else None,
            "donnees_eleve": h.donnees_eleve
        }
        for h in history
    ]

@router.post("/historique-retraits/{history_id}/restaurer")
def restore_withdrawn_student_endpoint(
    history_id: int,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Restaure un élève retiré en réactivant son statut à 'actif'."""
    entry = db.query(models.HistoriqueEleve).filter(models.HistoriqueEleve.id == history_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entrée d'historique non trouvée")

    if not scope.is_global:
        auth_ids = scope.get_authorized_school_ids(db)
        if entry.ecole_id and entry.ecole_id not in (auth_ids or []):
            raise HTTPException(status_code=403, detail="Accès refusé à cet établissement")

    restored_student = crud.restaurer_eleve_retire(db=db, historique_id=history_id, operator=scope.username)
    return {
        "success": True,
        "message": f"L'élève {restored_student.nom} {restored_student.prenom} a été restauré dans les effectifs actifs avec succès.",
        "student_id": restored_student.id
    }


# Doit rester déclarée AVANT /{student_id}, sinon "light" serait capturé comme un matricule.
@router.get("/light", response_model=List[schemas.StudentLightResponse])
def read_students_light(
    classe_id: Optional[int] = None,
    ecole_id: Optional[int] = None,
    code_etablissement: Optional[str] = None,
    skip: int = 0,
    limit: int = 5000,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Liste allégée pour les écrans qui n'ont besoin que de l'identité et de la classe.

    La réponse complète transporte 143 colonnes par élève, dont la photo en base64 —
    plusieurs Mo pour une seule liste. Ici on ne renvoie que les champs réellement
    exploités par les tableaux (impayés, relances, sélecteurs d'élèves).
    """
    if scope.is_global:
        students = crud.get_students(
            db,
            ecole_id=ecole_id,
            code_etablissement=code_etablissement,
            classe_id=classe_id,
            skip=skip,
            limit=limit
        )
    else:
        auth_ids = scope.get_authorized_school_ids(db)
        auth_codes = scope.get_authorized_school_codes(db)

        if ecole_id is not None and ecole_id not in (auth_ids or []):
            ecole_id = None
        if code_etablissement is not None and code_etablissement not in (auth_codes or []):
            code_etablissement = None

        students = crud.get_students(
            db,
            ecole_id=ecole_id,
            code_etablissement=code_etablissement,
            classe_id=classe_id,
            ecole_ids=auth_ids if not ecole_id and not code_etablissement else None,
            code_etablissements=auth_codes if not ecole_id and not code_etablissement else None,
            skip=skip,
            limit=limit
        )
    return students


# =========================================================================
# GESTION DES COEFFICIENTS ET DISPATCHING DES NOTES LORS DU TRANSFERT
# =========================================================================

def _normalize_subject_key(nom: str) -> str:
    s = (nom or "").lower().strip()
    s = s.replace("é", "e").replace("è", "e").replace("ê", "e").replace("à", "a").replace("ç", "c").replace("ï", "i").replace("î", "i")
    if "math" in s:
        return "maths"
    if "physiq" in s or "chimie" in s or "pc" in s:
        return "physique"
    if "svt" in s or "biolog" in s or "vie et" in s or "observation" in s:
        return "svt"
    if "franc" in s or "lettre" in s or "lecture" in s or "ecriture" in s or "expression" in s:
        return "francais"
    if "angl" in s:
        return "anglais"
    if "hist" in s or "geo" in s or "hg" in s:
        return "hg"
    if "philo" in s:
        return "philo"
    if "arabe" in s:
        return "arabe"
    if "coran" in s or "islam" in s:
        return "islam"
    if "edhc" in s or "civique" in s:
        return "edhc"
    if "eps" in s or "sport" in s or "motricite" in s:
        return "eps"
    if "lv2" in s or "allemand" in s or "espagnol" in s:
        return "lv2"
    if "info" in s or "tice" in s:
        return "informatique"
    return s


def _detect_level_and_serie(classe: Optional[models.Classe]) -> Tuple[str, str]:
    if not classe:
        return ("COMMUN", "COMMUN")
    nom = f"{classe.CE_LIBELLE or ''} {classe.CE_CODECLASSE or ''} {classe.CE_LIBELLENIVEAU or ''}".upper()

    serie = "COMMUN"
    if any(x in nom for x in ["SERIE A", " 2NDE A", " 2ND A", " SECONDE A", " 1ERE A", " 1EREA", " TLE A", " TLEA", " 2NDE-A", " 2NDA"]):
        serie = "A"
    elif any(x in nom for x in ["SERIE C", " 2NDE C", " 2ND C", " SECONDE C", " 1ERE C", " 1EREC", " TLE C", " TLEC", " 2NDE-C", " 2NDC"]):
        serie = "C"
    elif any(x in nom for x in ["SERIE D", " 1ERE D", " 1ERED", " TLE D", " TLED", " 2NDE D"]):
        serie = "D"
    elif "ARABE" in nom or "CORAN" in nom:
        serie = "ARABE"
    else:
        tokens = [t.strip() for t in nom.replace("-", " ").replace("_", " ").split()]
        for tok in tokens:
            if tok in ("A", "A1", "A2", "A3"):
                serie = "A"
                break
            elif tok in ("C", "C1", "C2", "C3"):
                serie = "C"
                break
            elif tok in ("D", "D1", "D2", "D3"):
                serie = "D"
                break

    niveau = "COMMUN"
    if "2NDE" in nom or "2ND" in nom or "SECONDE" in nom:
        niveau = "2NDE"
    elif "1ERE" in nom or "1ER" in nom or "PREMIERE" in nom:
        niveau = "1ERE"
    elif "TLE" in nom or "TERMINALE" in nom:
        niveau = "TLE"
    elif "3EME" in nom or "3E" in nom or "TROISIEME" in nom:
        niveau = "3EME"
    elif "4EME" in nom or "4E" in nom or "QUATRIEME" in nom:
        niveau = "4EME"
    elif "5EME" in nom or "5E" in nom or "CINQUIEME" in nom:
        niveau = "5EME"
    elif "6EME" in nom or "6E" in nom or "SIXIEME" in nom:
        niveau = "6EME"
    elif any(x in nom for x in ["CM2", "CM1", "CE2", "CE1", "CP2", "CP1", "PRIMAIRE"]):
        niveau = "PRIMAIRE"
    elif any(x in nom for x in ["MATERNELLE", "MPS", "MMS", "MGS", "PETITE", "MOYENNE", "GRANDE"]):
        niveau = "MATERNELLE"

    return (niveau, serie)


COEFFS_TABLE: Dict[Any, Dict[str, int]] = {
    ("2NDE", "C"): {
        "maths": 5,
        "physique": 4,
        "svt": 3,
        "francais": 3,
        "anglais": 2,
        "hg": 2,
        "edhc": 1,
        "eps": 1,
        "lv2": 1,
        "informatique": 1,
    },
    ("2NDE", "A"): {
        "francais": 5,
        "anglais": 4,
        "hg": 3,
        "maths": 3,
        "lv2": 3,
        "physique": 2,
        "svt": 2,
        "edhc": 1,
        "eps": 1,
        "informatique": 1,
    },
    ("1ERE", "C"): {
        "maths": 6,
        "physique": 5,
        "svt": 3,
        "francais": 3,
        "anglais": 2,
        "hg": 2,
        "philo": 2,
        "edhc": 1,
        "eps": 1,
        "lv2": 1,
    },
    ("1ERE", "D"): {
        "maths": 4,
        "physique": 4,
        "svt": 4,
        "francais": 3,
        "anglais": 2,
        "hg": 2,
        "philo": 2,
        "edhc": 1,
        "eps": 1,
        "lv2": 1,
    },
    ("1ERE", "A"): {
        "francais": 5,
        "anglais": 4,
        "hg": 4,
        "philo": 3,
        "lv2": 3,
        "maths": 2,
        "physique": 2,
        "svt": 2,
        "edhc": 1,
        "eps": 1,
    },
    ("TLE", "C"): {
        "maths": 6,
        "physique": 6,
        "svt": 3,
        "philo": 2,
        "francais": 2,
        "anglais": 2,
        "hg": 2,
        "edhc": 1,
        "eps": 1,
        "lv2": 1,
    },
    ("TLE", "D"): {
        "maths": 4,
        "physique": 4,
        "svt": 4,
        "philo": 2,
        "francais": 2,
        "anglais": 2,
        "hg": 2,
        "edhc": 1,
        "eps": 1,
        "lv2": 1,
    },
    ("TLE", "A"): {
        "philo": 5,
        "francais": 4,
        "anglais": 4,
        "hg": 4,
        "lv2": 3,
        "maths": 2,
        "physique": 2,
        "svt": 2,
        "edhc": 1,
        "eps": 1,
    },
    "COLLEGE": {
        "francais": 4,
        "maths": 4,
        "anglais": 3,
        "physique": 2,
        "svt": 2,
        "hg": 2,
        "edhc": 1,
        "eps": 1,
        "informatique": 1,
    },
    "PRIMAIRE": {
        "francais": 4,
        "maths": 4,
        "hg": 2,
        "svt": 2,
        "anglais": 1,
        "eps": 1,
    }
}


def _get_target_coefficient(matiere: str, niveau: str, serie: str, default_coeff: int = 1) -> int:
    norm_mat = _normalize_subject_key(matiere)
    table = COEFFS_TABLE.get((niveau, serie))
    if table and norm_mat in table:
        return table[norm_mat]
    if niveau in ("6EME", "5EME", "4EME", "3EME", "COLLEGE"):
        college_tbl = COEFFS_TABLE.get("COLLEGE", {})
        if norm_mat in college_tbl:
            return college_tbl[norm_mat]
    if niveau == "PRIMAIRE":
        prim_tbl = COEFFS_TABLE.get("PRIMAIRE", {})
        if norm_mat in prim_tbl:
            return prim_tbl[norm_mat]
    if niveau in ("2NDE", "1ERE", "TLE"):
        c_tbl = COEFFS_TABLE.get((niveau, "C"), {})
        if norm_mat in c_tbl:
            return c_tbl[norm_mat]
    return default_coeff or 1


def recompute_student_evaluations_and_average(
    student: models.Eleve,
    target_class: models.Classe,
    db: Session,
    commit: bool = True
) -> Dict[str, Any]:
    target_niv, target_serie = _detect_level_and_serie(target_class)

    evals = db.query(models.Evaluation).filter(
        models.Evaluation.eleve_id == student.id
    ).all()

    old_moyenne = float(student.moyenne or 0.0)

    if not evals:
        return {
            "old_moyenne": old_moyenne,
            "new_moyenne": old_moyenne,
            "difference": 0.0,
            "evaluations_count": 0,
            "details": []
        }

    subject_evals: Dict[str, List[models.Evaluation]] = {}
    for ev in evals:
        mat = ev.matiere or "Matière"
        if mat not in subject_evals:
            subject_evals[mat] = []
        subject_evals[mat].append(ev)

    total_points = 0.0
    total_coeffs = 0
    details = []

    for mat, ev_list in subject_evals.items():
        old_coeff = ev_list[0].coefficient or 1
        new_coeff = _get_target_coefficient(mat, target_niv, target_serie, default_coeff=old_coeff)

        notes = [float(ev.note or 0.0) for ev in ev_list]
        avg_note = sum(notes) / len(notes) if notes else 0.0
        avg_note_round = round(avg_note, 2)
        points = round(avg_note_round * new_coeff, 2)

        total_points += points
        total_coeffs += new_coeff

        details.append({
            "matiere": mat,
            "note_moyenne": avg_note_round,
            "old_coeff": old_coeff,
            "new_coeff": new_coeff,
            "points": points,
            "nb_evaluations": len(ev_list)
        })

        for ev in ev_list:
            ev.classe_id = target_class.id
            ev.coefficient = new_coeff
            if target_class.ecole_id:
                ev.ecole_id = target_class.ecole_id
            if target_class.ET_CODEETABLISSEMENT:
                ev.ET_CODEETABLISSEMENT = target_class.ET_CODEETABLISSEMENT

    new_moyenne = round(total_points / total_coeffs, 2) if total_coeffs > 0 else old_moyenne
    student.moyenne = new_moyenne

    if commit:
        db.commit()

    return {
        "old_moyenne": old_moyenne,
        "new_moyenne": new_moyenne,
        "difference": round(new_moyenne - old_moyenne, 2),
        "evaluations_count": len(evals),
        "total_points": round(total_points, 2),
        "total_coefficients": total_coeffs,
        "details": details
    }


class StudentTransferRequest(BaseModel):
    student_ids: List[Union[int, str]]
    target_class_id: Union[int, str]
    source_class_id: Optional[Union[int, str]] = None
    motif: Optional[str] = "Transfert de classe"
    realign_echeancier: Optional[bool] = True
    dispatch_evaluations: Optional[bool] = True


class StudentTransferSimulationRequest(BaseModel):
    student_id: Union[int, str]
    target_class_id: Union[int, str]


@router.post("/transfer/simulate")
def simulate_student_transfer(
    req: StudentTransferSimulationRequest,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Simule le transfert d'un élève vers une classe de destination.
    Calcule le rééquilibrage des coefficients et la nouvelle moyenne sans enregistrer de modifications.
    """
    s_id = int(req.student_id)
    t_id = int(req.target_class_id)

    student = db.query(models.Eleve).filter(models.Eleve.id == s_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Élève introuvable.")

    if not scope.can_access_student(student, db):
        raise HTTPException(status_code=403, detail="Accès non autorisé à cet élève.")

    target_class = db.query(models.Classe).filter(models.Classe.id == t_id).first()
    if not target_class:
        raise HTTPException(status_code=404, detail="Classe de destination introuvable.")

    old_class = db.query(models.Classe).filter(models.Classe.id == student.classe_id).first() if student.classe_id else None

    old_niv, old_serie = _detect_level_and_serie(old_class)
    target_niv, target_serie = _detect_level_and_serie(target_class)

    evals = db.query(models.Evaluation).filter(
        models.Evaluation.eleve_id == student.id
    ).all()

    old_moyenne = float(student.moyenne or 0.0)

    subject_evals: Dict[str, List[models.Evaluation]] = {}
    for ev in evals:
        mat = ev.matiere or "Matière"
        if mat not in subject_evals:
            subject_evals[mat] = []
        subject_evals[mat].append(ev)

    total_old_points = 0.0
    total_old_coeffs = 0
    total_new_points = 0.0
    total_new_coeffs = 0
    subjects_comparison = []

    for mat, ev_list in subject_evals.items():
        notes = [float(ev.note or 0.0) for ev in ev_list]
        avg_note = sum(notes) / len(notes) if notes else 0.0
        avg_note_round = round(avg_note, 2)

        cur_coeff = ev_list[0].coefficient or _get_target_coefficient(mat, old_niv, old_serie, 1)
        new_coeff = _get_target_coefficient(mat, target_niv, target_serie, default_coeff=cur_coeff)

        old_pts = round(avg_note_round * cur_coeff, 2)
        new_pts = round(avg_note_round * new_coeff, 2)

        total_old_points += old_pts
        total_old_coeffs += cur_coeff
        total_new_points += new_pts
        total_new_coeffs += new_coeff

        subjects_comparison.append({
            "matiere": mat,
            "note_moyenne": avg_note_round,
            "old_coeff": cur_coeff,
            "new_coeff": new_coeff,
            "old_points": old_pts,
            "new_points": new_pts,
            "difference_points": round(new_pts - old_pts, 2),
            "nb_evaluations": len(ev_list)
        })

    computed_old_moyenne = round(total_old_points / total_old_coeffs, 2) if total_old_coeffs > 0 else old_moyenne
    computed_new_moyenne = round(total_new_points / total_new_coeffs, 2) if total_new_coeffs > 0 else old_moyenne

    return {
        "success": True,
        "student": {
            "id": student.id,
            "matricule": student.matricule,
            "nom": student.nom,
            "prenom": student.prenom,
            "nom_complet": f"{student.nom} {student.prenom}",
        },
        "old_class": {
            "id": old_class.id if old_class else None,
            "nom": old_class.CE_LIBELLE if old_class else (student.AU_CLASSEPRECEDENTE or "Sans classe"),
            "niveau": old_niv,
            "serie": old_serie,
        },
        "target_class": {
            "id": target_class.id,
            "nom": target_class.CE_LIBELLE,
            "niveau": target_niv,
            "serie": target_serie,
        },
        "old_moyenne": computed_old_moyenne,
        "new_moyenne": computed_new_moyenne,
        "difference": round(computed_new_moyenne - computed_old_moyenne, 2),
        "total_old_points": round(total_old_points, 2),
        "total_old_coefficients": total_old_coeffs,
        "total_new_points": round(total_new_points, 2),
        "total_new_coefficients": total_new_coeffs,
        "evaluations_count": len(evals),
        "subjects": subjects_comparison
    }


@router.post("/transfer")
def transfer_students(
    req: StudentTransferRequest,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Transfère un ou plusieurs élèves vers une classe de destination.
    Met à jour la classe, réassigne les évaluations, recalcule les moyennes selon les coefficients réels
    et réaligne l'échéancier de scolarité si nécessaire.
    """
    if not req.student_ids:
        raise HTTPException(status_code=400, detail="Veuillez sélectionner au moins un élève à transférer.")

    # 1. Vérifier la classe cible
    t_id = int(req.target_class_id)
    target_class = db.query(models.Classe).filter(models.Classe.id == t_id).first()
    if not target_class:
        raise HTTPException(status_code=404, detail="Classe de destination introuvable.")

    if not scope.can_access_class(target_class, db):
        raise HTTPException(status_code=403, detail="Accès refusé : la classe cible appartient à un établissement non autorisé.")

    # 2. Récupérer les élèves
    s_ids = [int(sid) for sid in req.student_ids]
    students = db.query(models.Eleve).filter(models.Eleve.id.in_(s_ids)).all()
    if not students:
        raise HTTPException(status_code=404, detail="Aucun élève valide trouvé pour les identifiants fournis.")

    all_class_ids = {s.classe_id for s in students if s.classe_id}
    classes_map = {}
    if all_class_ids:
        cls_rows = db.query(models.Classe.id, models.Classe.CE_LIBELLE).filter(models.Classe.id.in_(all_class_ids)).all()
        classes_map = {c.id: c.CE_LIBELLE for c in cls_rows}

    transferred_results = []
    for st in students:
        if not scope.can_access_student(st, db):
            continue

        old_class_id = st.classe_id
        old_class_nom = classes_map.get(old_class_id) or st.AU_CLASSEPRECEDENTE or "Sans classe"
        old_moyenne_val = float(st.moyenne or 0.0)

        # Mise à jour de la classe et de l'établissement
        st.classe_id = target_class.id
        if target_class.ecole_id:
            st.ecole_id = target_class.ecole_id
        if target_class.ET_CODEETABLISSEMENT:
            st.ET_CODEETABLISSEMENT = target_class.ET_CODEETABLISSEMENT

        # Réassignation des évaluations et rééquilibrage de la moyenne selon les coefficients cibles
        rebalance_res = {"old_moyenne": old_moyenne_val, "new_moyenne": old_moyenne_val, "difference": 0.0, "evaluations_count": 0}
        if req.dispatch_evaluations:
            rebalance_res = recompute_student_evaluations_and_average(st, target_class, db, commit=False)

        # Réalignement automatique de l'échéancier si demandé
        if req.realign_echeancier:
            _doter_echeancier_scolarite(st, db, force_realign=True)

        # Audit log
        try:
            log_audit(
                db=db,
                user=getattr(scope, "username", "admin"),
                action="TRANSFERT_CLASSE",
                target=f"Eleve {st.matricule} ({st.nom} {st.prenom})",
                details=f"Transfert de [{old_class_nom}] vers [{target_class.CE_LIBELLE}]. Moyenne: {rebalance_res['old_moyenne']} -> {rebalance_res['new_moyenne']}. {rebalance_res['evaluations_count']} note(s) rééquilibrée(s). Motif: {req.motif or 'N/A'}",
                ecole_id=st.ecole_id,
                code_etablissement=st.ET_CODEETABLISSEMENT
            )
        except Exception:
            pass

        transferred_results.append({
            "id": st.id,
            "matricule": st.matricule,
            "nom": st.nom,
            "prenom": st.prenom,
            "nom_complet": f"{st.nom} {st.prenom}",
            "old_classe_id": old_class_id,
            "old_classe_nom": old_class_nom,
            "new_classe_id": target_class.id,
            "new_classe_nom": target_class.CE_LIBELLE,
            "old_moyenne": rebalance_res["old_moyenne"],
            "new_moyenne": rebalance_res["new_moyenne"],
            "difference": rebalance_res.get("difference", 0.0),
            "evaluations_count": rebalance_res.get("evaluations_count", 0),
        })

    db.commit()

    return {
        "success": True,
        "message": f"{len(transferred_results)} élève(s) transféré(s) avec succès vers la classe {target_class.CE_LIBELLE}.",
        "transferred_count": len(transferred_results),
        "target_class": {
            "id": target_class.id,
            "nom": target_class.CE_LIBELLE,
            "cycle": getattr(target_class, "CE_CYCLE", None),
        },
        "transferred_students": transferred_results
    }


class BulkRetraitRequest(BaseModel):
    student_ids: List[int]
    motif: Optional[str] = "Retrait définitif de l'établissement"
    date_retrait: Optional[str] = None
    etablissement_accueil: Optional[str] = None
    commentaire: Optional[str] = None

@router.post("/retrait-bulk")
def withdraw_students_bulk(
    payload: BulkRetraitRequest,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    archived_count = 0
    errors = []
    motif_detail = payload.motif or "Retrait groupé de l'établissement"

    for sid in payload.student_ids:
        try:
            db_student = crud.get_student_by_id(db, student_id=sid)
            if db_student and scope.can_access_student(db_student, db):
                crud.archive_and_withdraw_student(
                    db=db,
                    student_id=sid,
                    motif=motif_detail,
                    date_retrait=payload.date_retrait,
                    etablissement_accueil=payload.etablissement_accueil,
                    observations=payload.commentaire,
                    operator=scope.username
                )
                archived_count += 1
        except Exception as e:
            errors.append(f"Élève #{sid}: {str(e)}")

    return {
        "success": True,
        "removed_count": archived_count,
        "total_requested": len(payload.student_ids),
        "errors": errors,
        "message": f"{archived_count} élève(s) retiré(s) des effectifs actifs et conservé(s) dans la table historique."
    }


@router.get("/{student_id}", response_model=schemas.StudentResponse)
def read_student(
    student_id: str,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    raw_str = str(student_id).lstrip(":").split(":")[0].strip()
    db_student = None
    if raw_str.isdigit():
        db_student = crud.get_student_by_id(db, student_id=int(raw_str))
    if not db_student:
        db_student = crud.get_student_by_matricule(db, matricule=raw_str)
    if db_student is None:
        raise HTTPException(status_code=404, detail="Élève non trouvé")
    
    # Vérification de sécurité multi-écoles / ville
    if not scope.can_access_student(db_student, db):
        raise HTTPException(status_code=403, detail="Accès refusé à cet élève d'un autre établissement")
    return db_student

@router.post("", response_model=schemas.StudentResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=schemas.StudentResponse, status_code=status.HTTP_201_CREATED)
def create_new_student(
    student: schemas.StudentCreate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    # Check if matricule already exists
    db_student = crud.get_student_by_matricule(db, matricule=student.matricule)
    if db_student:
        raise HTTPException(status_code=400, detail="Un élève avec ce matricule existe déjà")
    
    # Forcer ou vérifier l'école si l'utilisateur n'est pas global
    if not scope.is_global:
        if not student.ecole_id and scope.ecole_id:
            student.ecole_id = scope.ecole_id
        if not student.ET_CODEETABLISSEMENT and scope.code_etablissement:
            student.ET_CODEETABLISSEMENT = scope.code_etablissement
        if not scope.can_access_school(student.ecole_id, student.ET_CODEETABLISSEMENT, db):
            raise HTTPException(status_code=403, detail="Accès refusé pour créer un élève dans cet établissement")

    nouvel_eleve = crud.create_student(db=db, student=student)
    _doter_echeancier_scolarite(nouvel_eleve, db)
    return nouvel_eleve


def _doter_echeancier_scolarite(student: Optional[models.Eleve], db: Session, force_realign: bool = False) -> None:
    """Crée l'échéancier de scolarité d'un élève dès qu'il a une classe selon la grille de son école.

    Appelé sur tous les chemins qui attribuent une classe (création, changement de classe,
    validation du dossier d'inscription) : l'échéancier existe ainsi dès le niveau choisi,
    construit sur la grille tarifaire exacte de l'établissement à partir de son code établissement.
    """
    if student is None:
        return
    try:
        from .echeancier import ensure_echeancier_scolarite

        if ensure_echeancier_scolarite(student, db, force_realign_all=force_realign) > 0:
            db.commit()
            db.refresh(student)
    except Exception as err:
        db.rollback()
        print(f"[_doter_echeancier_scolarite warning] {err}")


@router.put("/{student_id}", response_model=schemas.StudentResponse)
def update_student_info(
    student_id: str,
    student_data: Any = Body(...),
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Met à jour les informations d'un élève (classe, photo, infos, etc.) pour un directeur d'études."""
    clean_id = int(str(student_id).lstrip(":").split(":")[0].strip())
    db_student = crud.get_student_by_id(db, student_id=clean_id)
    if db_student is None:
        raise HTTPException(status_code=404, detail="Élève non trouvé")
    
    if not scope.can_access_student(db_student, db):
        raise HTTPException(status_code=403, detail="Accès refusé à cet élève d'un autre établissement")

    if not isinstance(student_data, dict):
        raise HTTPException(status_code=422, detail="Le corps de la requête doit être un objet JSON")

    # Si la classe est modifiée (changement de classe par le Directeur des Études)
    if "classe_id" in student_data and student_data["classe_id"] is not None:
        try:
            target_class_id = int(student_data["classe_id"])
            target_class = db.query(models.Classe).filter(models.Classe.id == target_class_id).first()
            if target_class:
                if not scope.can_access_class(target_class, db):
                    raise HTTPException(status_code=403, detail="Accès refusé : la classe sélectionnée appartient à un établissement non autorisé.")
                # Synchroniser l'établissement de l'élève avec sa nouvelle classe si affiliée
                if target_class.ecole_id:
                    db_student.ecole_id = target_class.ecole_id
                if target_class.ET_CODEETABLISSEMENT:
                    db_student.ET_CODEETABLISSEMENT = target_class.ET_CODEETABLISSEMENT
        except (ValueError, TypeError):
            pass

    eleve_maj = crud.update_student(db=db, db_student=db_student, update_data=student_data)
    classe_changed = "classe_id" in student_data or "AU_CLASSEPRECEDENTE" in student_data or "statut_orientation" in student_data or "statutAffecte" in student_data
    _doter_echeancier_scolarite(eleve_maj, db, force_realign=bool(classe_changed))
    return eleve_maj

@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    student_id: str,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    clean_id = int(str(student_id).lstrip(":").split(":")[0].strip())
    db_student = crud.get_student_by_id(db, student_id=clean_id)
    if db_student is None:
        raise HTTPException(status_code=404, detail="Élève non trouvé")
    
    if not scope.can_access_student(db_student, db):
        raise HTTPException(status_code=403, detail="Accès refusé à cet élève d'un autre établissement")

    crud.delete_student(db=db, student_id=clean_id, motif="Suppression directe via API", operator=scope.username)


class RetraitRequest(BaseModel):
    motif: Optional[str] = "Retrait définitif de l'établissement"
    date_retrait: Optional[str] = None
    commentaire: Optional[str] = None
    etablissement_accueil: Optional[str] = None


@router.post("/{student_id}/retrait")
def withdraw_student(
    student_id: str,
    payload: RetraitRequest,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    clean_id = int(str(student_id).lstrip(":").split(":")[0].strip())
    db_student = crud.get_student_by_id(db, student_id=clean_id)
    if db_student is None:
        raise HTTPException(status_code=404, detail="Élève non trouvé")
    
    if not scope.can_access_student(db_student, db):
        raise HTTPException(status_code=403, detail="Accès refusé à cet élève d'un autre établissement")

    history_entry = crud.archive_and_withdraw_student(
        db=db,
        student_id=clean_id,
        motif=payload.motif,
        date_retrait=payload.date_retrait,
        etablissement_accueil=payload.etablissement_accueil,
        observations=payload.commentaire,
        operator=scope.username
    )
    
    return {
        "success": True,
        "message": f"L'élève {history_entry.nom_complet} a été retiré des effectifs actifs et conservé dans la table historique avec succès.",
        "historique_id": history_entry.id,
        "matricule": history_entry.matricule
    }


import csv
import io
import unicodedata
from datetime import datetime, date, timedelta
from sqlalchemy import func
from .. import models


def _normalize_header(value: str) -> str:
    """Normalise un en-tête CSV/Excel : minuscule, sans accents, sans espaces superflus."""
    v = value.strip().lower()
    v = ''.join(c for c in unicodedata.normalize('NFD', v) if unicodedata.category(c) != 'Mn')
    v = v.replace('&', ' et ')
    v = v.replace('  ', ' ').replace('-', ' ').replace('_', ' ')
    while '  ' in v:
        v = v.replace('  ', ' ')
    return v.strip()


def _parse_uploaded_file(file: UploadFile) -> tuple:
    filename = (file.filename or "file.csv").lower()
    contents = file.file.read()

    if filename.endswith('.xlsx') or filename.endswith('.xls'):
        try:
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
            ws = wb.active
            rows = list(ws.iter_rows(values_only=True))
            if not rows or len(rows) < 1:
                return [], []
            raw_headers = [str(cell).strip() for cell in rows[0] if cell is not None and str(cell).strip()]
            data_rows = []
            for row in rows[1:]:
                if not any(row):
                    continue
                row_dict = {}
                for idx, cell in enumerate(row):
                    if idx < len(raw_headers):
                        val_str = ""
                        if cell is not None:
                            if isinstance(cell, (datetime, date)):
                                val_str = cell.strftime('%Y-%m-%d')
                            else:
                                val_str = str(cell).strip()
                        row_dict[raw_headers[idx]] = val_str
                data_rows.append(row_dict)
            return raw_headers, data_rows
        except Exception as err:
            raise ValueError(f"Impossible de lire le fichier Excel ({str(err)}). Veuillez utiliser un fichier au format .xlsx valide ou CSV.")
    else:
        try:
            decoded = contents.decode('utf-8-sig')
        except UnicodeDecodeError:
            try:
                decoded = contents.decode('latin-1')
            except UnicodeDecodeError:
                decoded = contents.decode('cp1252', errors='replace')

        decoded = decoded.replace('\r\n', '\n').replace('\r', '\n')
        csv_file = io.StringIO(decoded)
        first_row = decoded.split('\n')[0] if decoded else ""
        if ';' in first_row and (first_row.count(';') > first_row.count(',')):
            delimiter = ';'
        elif '\t' in first_row:
            delimiter = '\t'
        else:
            delimiter = ','

        reader = csv.DictReader(csv_file, delimiter=delimiter)
        raw_headers = [h.strip() for h in (reader.fieldnames or []) if h and h.strip()]
        data_rows = []
        for row in reader:
            clean_row = {}
            for k, v in row.items():
                if k:
                    clean_row[k.strip()] = v.strip() if v else ""
            data_rows.append(clean_row)
        return raw_headers, data_rows


@router.post("/import")
def import_students_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    imported_count = 0
    updated_count = 0
    errors = []

    filename = (file.filename or "").lower()
    if filename and not (filename.endswith('.csv') or filename.endswith('.xlsx') or filename.endswith('.xls')):
        return {
            "success": False,
            "imported": 0,
            "updated": 0,
            "errors": ["Le fichier doit être au format Excel (.xlsx, .xls) ou CSV (.csv)."]
        }

    try:
        try:
            raw_headers, data_rows = _parse_uploaded_file(file)
        except ValueError as ve:
            return {"success": False, "imported": 0, "updated": 0, "errors": [str(ve)]}

        if not raw_headers:
            return {"success": False, "imported": 0, "updated": 0, "errors": ["Aucune colonne détectée dans le fichier."]}

        header_mapping = {
            # Matricule
            'matricule': 'matricule',
            'matr': 'matricule',
            'id eleve': 'matricule',
            'code': 'matricule',
            'num matricule': 'matricule',
            'au matriculeauditeur': 'matricule',
            'au matriculenational': 'matricule',
            'idauditeur': 'matricule',
            'matriculeauditeur': 'matricule',
            'matriculenational': 'matricule',

            # Nom
            'nom': 'nom',
            'noms': 'nom',
            'nom eleve': 'nom',
            'nom eleves': 'nom',
            'nom de leleve': 'nom',
            'nom d eleve': 'nom',
            'last name': 'nom',
            'lastname': 'nom',
            'family name': 'nom',

            # Prénom
            'prenom': 'prenom',
            'prenoms': 'prenom',
            'prenom eleve': 'prenom',
            'prenom eleves': 'prenom',
            'prenom de leleve': 'prenom',
            'prenom d eleve': 'prenom',
            'first name': 'prenom',
            'firstname': 'prenom',
            'given name': 'prenom',

            # Combined Full Name
            'nom et prenom': 'nom_complet',
            'noms et prenoms': 'nom_complet',
            'nom prenom': 'nom_complet',
            'eleve': 'nom_complet',
            'eleves': 'nom_complet',
            'nom complet': 'nom_complet',
            'full name': 'nom_complet',
            'au nomprenoms': 'nom_complet',
            'au nomprenom': 'nom_complet',
            'au nom prenoms': 'nom_complet',
            'au nom prenom': 'nom_complet',
            'nomprenoms': 'nom_complet',
            'nomprenom': 'nom_complet',

            # Date de naissance
            'date_naissance': 'date_naissance',
            'naissance': 'date_naissance',
            'date de naissance': 'date_naissance',
            'date naissance': 'date_naissance',
            'au date naissance': 'date_naissance',
            'au date_naissance': 'date_naissance',
            'ddn': 'date_naissance',
            'dob': 'date_naissance',
            'birth date': 'date_naissance',
            'date of birth': 'date_naissance',
            'ne le': 'date_naissance',
            'nee le': 'date_naissance',
            'ne(e) le': 'date_naissance',

            # Genre / Sexe
            'genre': 'genre',
            'sexe': 'genre',
            'sex': 'genre',
            'gender': 'genre',

            # École / Établissement
            'ecole_id': 'ecole_id',
            'ecole id': 'ecole_id',
            'ecole': 'ecole_id',
            'etablissement': 'ecole_id',

            # Classe
            'classe_id': 'classe_id',
            'classe id': 'classe_id',
            'classe': 'classe',
            'nom classe': 'classe',
            'niveau': 'classe',

            # Statut
            'statut': 'statut',
            'status': 'statut',

            # Santé
            'notes_sante': 'notes_sante',
            'sante': 'notes_sante',

            # Contacts parents
            'telephone_parent': 'AU_CONTACTS',
            'telephone parent': 'AU_CONTACTS',
            'telephone de leleve': 'AU_CONTACTS',
            'telephone eleve': 'AU_CONTACTS',
            'contact_parent': 'AU_CONTACTS',
            'contact parent': 'AU_CONTACTS',
            'contact': 'AU_CONTACTS',
            'telephone': 'AU_CONTACTS',
            'tel': 'AU_CONTACTS',
            'tel parent': 'AU_CONTACTS',
            'phone': 'AU_CONTACTS',
            'mobile': 'AU_CONTACTS',

            # Email parent
            'email_parent': 'AU_E_MAIL',
            'email parent': 'AU_E_MAIL',
            'email de leleve': 'AU_E_MAIL',
            'email eleve': 'AU_E_MAIL',
            'email': 'AU_E_MAIL',
            'e mail': 'AU_E_MAIL',
            'mail': 'AU_E_MAIL',

            # Adresse
            'adresse': 'AU_ADRESSE_POSTALE',
            'adresse_postale': 'AU_ADRESSE_POSTALE',
            'adresse postale': 'AU_ADRESSE_POSTALE',
            'domicile': 'AU_ADRESSE_POSTALE',
            'quartier': 'AU_ADRESSE_POSTALE',
            'ville': 'AU_ADRESSE_POSTALE',

            # Tuteur / Parent
            'nom_parent': 'AU_TUTEURLEGAL',
            'nom parent': 'AU_TUTEURLEGAL',
            'parent': 'AU_TUTEURLEGAL',
            'tuteur': 'AU_TUTEURLEGAL',
            'nom du tuteur': 'AU_TUTEURLEGAL',
            'tuteur legal': 'AU_TUTEURLEGAL',
            'responsable': 'AU_TUTEURLEGAL',
            
            # Redoublant
            'redouble': 'REDOUBLANT',
            'Redoublant': 'REDOUBLANT',
            'REDOUBLANT': 'REDOUBLANT',
        }

        normalized_mapping = {_normalize_header(k): v for k, v in header_mapping.items()}

        has_nom = any(_normalize_header(h) in normalized_mapping and normalized_mapping[_normalize_header(h)] in ('nom', 'nom_complet') for h in raw_headers)
        has_prenom = any(_normalize_header(h) in normalized_mapping and normalized_mapping[_normalize_header(h)] in ('prenom', 'nom_complet') for h in raw_headers)

        missing_required = []
        if not has_nom:
            missing_required.append("nom")
        if not has_prenom:
            missing_required.append("prenom")

        if missing_required:
            detected = ', '.join(raw_headers[:12])
            return {
                "success": False,
                "imported": 0,
                "updated": 0,
                "errors": [f"Colonnes requises manquantes : {', '.join(missing_required)}. Colonnes détectées : {detected}."]
            }

        for index, row in enumerate(data_rows, start=1):
            try:
                clean_row = {}
                for k, v in row.items():
                    if k:
                        nk = _normalize_header(k)
                        mapped_key = normalized_mapping.get(nk) or nk
                        clean_row[mapped_key] = v.strip() if isinstance(v, str) else str(v or "").strip()

                if not any(val for val in clean_row.values() if val):
                    continue

                prenom = clean_row.get('prenom', '')
                nom = clean_row.get('nom', '')
                nom_complet = clean_row.get('nom_complet', '')

                if nom_complet and not (nom and prenom):
                    parts = nom_complet.strip().split(maxsplit=1)
                    if len(parts) == 2:
                        nom = parts[0]
                        prenom = parts[1]
                    elif len(parts) == 1:
                        nom = parts[0]
                        prenom = parts[0]

                if nom and not prenom:
                    parts = nom.strip().split(maxsplit=1)
                    if len(parts) == 2:
                        nom = parts[0]
                        prenom = parts[1]

                if prenom and not nom:
                    parts = prenom.strip().split(maxsplit=1)
                    if len(parts) == 2:
                        nom = parts[0]
                        prenom = parts[1]

                if not nom or not prenom:
                    errors.append(f"Ligne {index}: Prénom ou Nom manquant.")
                    continue

                ecole_id_str = clean_row.get('ecole_id')
                ecole_id = None
                if ecole_id_str:
                    try:
                        ecole_id = int(ecole_id_str)
                    except ValueError:
                        db_school = db.query(models.Etablissement).filter(
                            func.lower(models.Etablissement.NOM_ETABLISSEMENT).like(f"%{ecole_id_str.strip().lower()}%")
                        ).first()
                        if db_school:
                            ecole_id = db_school.IDETABLISSEMENT

                if not ecole_id:
                    first_school = db.query(models.Etablissement).first()
                    if not first_school:
                        first_school = models.Etablissement(
                            NOM_ETABLISSEMENT="Établissement Principal",
                            CODE_ETABLISSEMENT="ECOLE01"
                        )
                        db.add(first_school)
                        db.commit()
                        db.refresh(first_school)
                    ecole_id = first_school.IDETABLISSEMENT

                dob_str = clean_row.get('date_naissance')
                date_naissance = None
                if dob_str:
                    try:
                        val_num = float(dob_str)
                        if 10000 < val_num < 60000:
                            date_naissance = date(1899, 12, 30) + timedelta(days=int(val_num))
                    except ValueError:
                        pass

                    if not date_naissance:
                        for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%d.%m.%Y', '%Y/%m/%d', '%d/%m/%y', '%d-%m-%y'):
                            try:
                                date_naissance = datetime.strptime(dob_str, fmt).date()
                                break
                            except ValueError:
                                continue

                if not date_naissance:
                    date_naissance = date(2015, 1, 1)

                genre = clean_row.get('genre', 'M')
                if genre:
                    genre = genre[0].upper()
                if genre not in ('M', 'F'):
                    genre = 'M'

                classe_val = clean_row.get('classe') or clean_row.get('classe_id')
                classe_id = None
                if classe_val:
                    try:
                        classe_id = int(classe_val)
                    except ValueError:
                        c_str = classe_val.strip().lower()
                        db_class = db.query(models.Classe).filter(
                            func.lower(models.Classe.CE_LIBELLE) == c_str
                        ).first()
                        if not db_class:
                            db_class = db.query(models.Classe).filter(
                                func.lower(models.Classe.CE_LIBELLE).like(f"%{c_str}%")
                            ).first()
                        if db_class:
                            classe_id = db_class.id

                statut = clean_row.get('statut') or 'complete'
                notes_sante = clean_row.get('notes_sante') or None
                matricule = clean_row.get('matricule') or ""
                redoublant_present = 'REDOUBLANT' in clean_row
                redoublant_raw = (clean_row.get('REDOUBLANT') or "").strip().lower()
                redoublant = 1 if redoublant_raw in ("true", "1", "oui", "vrai", "yes", "x") else 0

                AU_CONTACTS = clean_row.get('AU_CONTACTS') or None
                AU_E_MAIL = clean_row.get('AU_E_MAIL') or None
                AU_ADRESSE_POSTALE = clean_row.get('AU_ADRESSE_POSTALE') or None
                AU_TUTEURLEGAL = clean_row.get('AU_TUTEURLEGAL') or None

                db_student = None
                if matricule:
                    db_student = crud.get_student_by_matricule(db, matricule=matricule)

                if db_student:
                    update_data = {
                        "prenom": prenom,
                        "nom": nom,
                        "date_naissance": date_naissance,
                        "genre": genre,
                        "ecole_id": ecole_id,
                        "classe_id": classe_id or db_student.classe_id,
                        "statut": statut,
                        "notes_sante": notes_sante or db_student.notes_sante,
                        "AU_CONTACTS": AU_CONTACTS or db_student.AU_CONTACTS,
                        "AU_E_MAIL": AU_E_MAIL or db_student.AU_E_MAIL,
                        "AU_ADRESSE_POSTALE": AU_ADRESSE_POSTALE or db_student.AU_ADRESSE_POSTALE,
                        "AU_TUTEURLEGAL": AU_TUTEURLEGAL or db_student.AU_TUTEURLEGAL,
                        "REDOUBLANT": redoublant if redoublant_present else db_student.REDOUBLANT
                    }
                    # print(update_data)
                    eleve_maj_import = crud.update_student(db, db_student=db_student, update_data=update_data)
                    _doter_echeancier_scolarite(eleve_maj_import, db)
                    updated_count += 1
                else:
                    student_in = schemas.StudentCreate(
                        matricule=matricule,
                        prenom=prenom,
                        nom=nom,
                        date_naissance=date_naissance,
                        genre=genre,
                        ecole_id=ecole_id,
                        classe_id=classe_id,
                        statut=statut,
                        notes_sante=notes_sante,
                        AU_CONTACTS=AU_CONTACTS,
                        AU_E_MAIL=AU_E_MAIL,
                        AU_ADRESSE_POSTALE=AU_ADRESSE_POSTALE,
                        AU_TUTEURLEGAL=AU_TUTEURLEGAL,
                        REDOUBLANT= redoublant
                    )
                    # print(student_in)
                    eleve_importe = crud.create_student(db, student=student_in)
                    _doter_echeancier_scolarite(eleve_importe, db)
                    imported_count += 1

            except Exception as e:
                db.rollback()
                errors.append(f"Ligne {index}: Erreur: {str(e)}")

        return {
            "success": (imported_count + updated_count) > 0 or len(errors) == 0,
            "imported": imported_count,
            "updated": updated_count,
            "errors": errors
        }
    except Exception as e:
        db.rollback()
        return {
            "success": False,
            "imported": imported_count,
            "updated": updated_count,
            "errors": [f"Erreur de traitement du fichier : {str(e)}"]
        }

@router.post("/verify-identification", response_model=schemas.StudentResponse)
def verify_student_identification(payload: schemas.StudentVerify, db: Session = Depends(get_db)):
    try:
        from datetime import datetime
        date_naissance = datetime.strptime(payload.date_naissance, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le format de la date de naissance doit être YYYY-MM-DD"
        )
        
    db_student = db.query(models.Eleve).filter(
        models.Eleve.matricule == payload.matricule,
        models.Eleve.date_naissance == date_naissance
    ).first()
    
    if not db_student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucun élève trouvé avec ce matricule et cette date de naissance"
        )

    return db_student


@router.patch("/{student_id}/inscription-dossier", response_model=schemas.StudentResponse)
def save_inscription_dossier(
    student_id: int,
    dossier_data: dict = Body(...),
    db: Session = Depends(get_db)
):
    """
    Sauvegarde les données du dossier d'inscription en lot (fin d'étape)
    Reçoit un dictionnaire avec tous les champs du dossier et les sauvegarde en BD.
    """
    db_student = crud.get_student_by_id(db, student_id=student_id)
    if db_student is None:
        raise HTTPException(status_code=404, detail="Élève non trouvé")

    # Mapping des champs du frontend vers la BD
    field_mapping = {
        # Infos générales
        "type_inscription": "type_inscription",
        "qualiteEleve": "qualite_eleve",
        "statutOrientation": "statut_orientation",
        "priseEnCharge": "prise_en_charge",
        "originePriseEnCharge": "origine_prise_en_charge",
        "serviceTransport": "service_transport",
        "serviceCantine": "service_cantine",

        # Validation des étapes (11 steps)
        "step_1_validated": "step_1_validated",
        "step_2_validated": "step_2_validated",
        "step_3_validated": "step_3_validated",
        "step_4_validated": "step_4_validated",
        "step_5_validated": "step_5_validated",
        "step_6_validated": "step_6_validated",
        "step_7_validated": "step_7_validated",
        "step_8_validated": "step_8_validated",
        "step_9_validated": "step_9_validated",
        "step_10_validated": "step_10_validated",
        "step_11_validated": "step_11_validated",

        # Étape 2
        "tenueValidee": "tenue_validee",

        # Étape 3
        "kitDepose": "kit_depose",
        "kitRamePapier": "kit_rame_papier",
        "kitPapierHygienique": "kit_papier_hygienique",
        "kitMarqueursTableau": "kit_marqueurs_tableau",

        # Étape 4 - Santé
        "groupeSanguin": "groupe_sanguin",
        "rhesus": "rhesus",
        "allergiesAlimentaires": "allergies_alimentaires",
        "allergiesMedicamenteuses": "allergies_medicamenteuses",
        "etatVaccinal": "etat_vaccinal",
        "hasAsthme": "has_asthme",
        "asthmeTraitement": "asthme_traitement",
        "hasDrepanocytose": "has_drepanocytose",
        "drepanocytoseTraitement": "drepanocytose_traitement",
        "hasEpilepsie": "has_epilepsie",
        "epilepsieTraitement": "epilepsie_traitement",
        "handicapPrecision": "handicap_precision",
        "autresPathologies": "autres_pathologies",
        "autresTraitement": "autres_traitement",
        "dispenseSportive": "dispense_sportive",
        "dispensePrecision": "dispense_precision",
        "medecin1Contact": "medecin1_contact",
        "medecin2Contact": "medecin2_contact",
        "nomAssurance": "nom_assurance",

        # Étape 5
        "dataSaisieLogiciel": "data_saisie_logiciel",

        # Étape 7
        "montantVersement": "montant_versement",
        "modeReglement": "mode_reglement",
        "numeroTransaction": "numero_transaction",

        # Étape 8
        "ficheImprimee": "fiche_imprimee",

        # Étape 9
        "effetsRemis": "effets_remis",

        # Étape 10
        "billetRetire": "billet_retire",
        "billetNumber": "billet_number",

        # Étape 11
        "dossierArchive": "dossier_archive",

        # Autres champs
        "photoUrl": "photo",
        "parentTel": "AU_CONTACTS",
        "parentNom": "AU_PERENOMPRENOMS",
    }

    # Construire un dictionnaire pour la mise à jour
    update_data = {}
    for frontend_key, db_key in field_mapping.items():
        if frontend_key in dossier_data:
            update_data[db_key] = dossier_data[frontend_key]

    # Convertir et sécuriser les booléens
    boolean_fields = [
        "step_1_validated", "step_2_validated", "step_3_validated", "step_4_validated",
        "step_5_validated", "step_6_validated", "step_7_validated", "step_8_validated",
        "step_9_validated", "step_10_validated", "step_11_validated", "tenue_validee",
        "kit_depose", "kit_rame_papier", "kit_papier_hygienique", "kit_marqueurs_tableau",
        "has_asthme", "has_drepanocytose", "has_epilepsie", "dispense_sportive",
        "data_saisie_logiciel", "fiche_imprimee", "effets_remis", "billet_retire",
        "dossier_archive", "prise_en_charge", "service_transport", "service_cantine"
    ]
    for bf in boolean_fields:
        if bf in update_data:
            update_data[bf] = bool(update_data[bf])

    # Nettoyage et conversion sécurisée de montant_versement
    from decimal import Decimal
    if "montant_versement" in update_data:
        mv = update_data["montant_versement"]
        if mv is None or str(mv).strip() == "":
            update_data["montant_versement"] = Decimal("0.00")
        else:
            try:
                clean_mv = str(mv).replace(",", ".").replace(" ", "").strip()
                update_data["montant_versement"] = Decimal(clean_mv)
            except Exception:
                update_data["montant_versement"] = Decimal("0.00")

    # Ajouter les champs notes_sante (JSON) s'il existe
    if "notesSante" in dossier_data or "notes_sante" in dossier_data:
        import json
        health_data = dossier_data.get("notesSante") or dossier_data.get("notes_sante")
        if isinstance(health_data, dict):
            update_data["notes_sante"] = json.dumps(health_data)
        elif isinstance(health_data, str):
            update_data["notes_sante"] = health_data

    # Mettre à jour la classe de l'élève si elle est fournie (classeId, classe_id, classeNom, niveau)
    cid = dossier_data.get("classeId") or dossier_data.get("classe_id")
    if cid and str(cid).strip() not in ("", "0", "null", "undefined"):
        try:
            target_cid = int(str(cid).strip())
            update_data["classe_id"] = target_cid
            target_cls = db.query(models.Classe).filter(models.Classe.id == target_cid).first()
            if target_cls:
                if target_cls.ecole_id:
                    update_data["ecole_id"] = target_cls.ecole_id
                if target_cls.ET_CODEETABLISSEMENT:
                    update_data["ET_CODEETABLISSEMENT"] = target_cls.ET_CODEETABLISSEMENT
                if target_cls.CE_LIBELLE:
                    update_data["AU_CLASSEPRECEDENTE"] = target_cls.CE_LIBELLE
        except Exception:
            pass
    elif "classeNom" in dossier_data or "niveau" in dossier_data or "classe" in dossier_data:
        c_nom = str(dossier_data.get("classeNom") or dossier_data.get("niveau") or dossier_data.get("classe") or "").strip()
        if c_nom:
            update_data["AU_CLASSEPRECEDENTE"] = c_nom
            target_cls = db.query(models.Classe).filter(func.lower(models.Classe.CE_LIBELLE) == c_nom.lower()).first()
            if not target_cls:
                target_cls = db.query(models.Classe).filter(func.lower(models.Classe.CE_LIBELLE).like(f"%{c_nom.lower()}%")).first()
            if target_cls:
                update_data["classe_id"] = target_cls.id
                if target_cls.ecole_id:
                    update_data["ecole_id"] = target_cls.ecole_id
                if target_cls.ET_CODEETABLISSEMENT:
                    update_data["ET_CODEETABLISSEMENT"] = target_cls.ET_CODEETABLISSEMENT

    # Synchronisation des tranches d'échéancier lors du désabonnement d'un service (sécurisée)
    try:
        if "serviceCantine" in dossier_data and not dossier_data["serviceCantine"]:
            cant_tranches = db.query(models.EcheancierPaiement).filter(
                models.EcheancierPaiement.eleve_id == student_id,
                (models.EcheancierPaiement.service_type == "cantine") | models.EcheancierPaiement.libelle.ilike("%cantine%")
            ).all()
            for t in cant_tranches:
                m_paye = t.montant_paye or Decimal("0.00")
                m_prevu = t.montant_prevu or Decimal("0.00")
                if m_paye <= Decimal("0.00"):
                    t.statut = "desabonne"
                    t.remarque = "Désabonné"
                elif m_paye < m_prevu:
                    t.montant_prevu = m_paye
                    t.statut = "paye"
                    t.remarque = ((t.remarque or "") + " (Désabonnement cantine: solde impayé clôturé)").strip()
    except Exception as cant_err:
        print(f"Cantine cleanup warning: {cant_err}")

    try:
        if "serviceTransport" in dossier_data and not dossier_data["serviceTransport"]:
            trans_tranches = db.query(models.EcheancierPaiement).filter(
                models.EcheancierPaiement.eleve_id == student_id,
                (models.EcheancierPaiement.service_type == "transport") | models.EcheancierPaiement.libelle.ilike("%transport%") | models.EcheancierPaiement.libelle.ilike("% car%")
            ).all()
            for t in trans_tranches:
                m_paye = t.montant_paye or Decimal("0.00")
                m_prevu = t.montant_prevu or Decimal("0.00")
                if m_paye <= Decimal("0.00"):
                    t.statut = "desabonne"
                    t.remarque = "Désabonné"
                elif m_paye < m_prevu:
                    t.montant_prevu = m_paye
                    t.statut = "paye"
                    t.remarque = ((t.remarque or "") + " (Désabonnement transport: solde impayé clôturé)").strip()
            db.query(models.AffectationTransport).filter(models.AffectationTransport.eleveId == student_id).delete()
    except Exception as trans_err:
        print(f"Transport cleanup warning: {trans_err}")

    db.flush()

    # Recalculer les soldes après suppression/ajustement des tranches (strictement pour la scolarité)
    total_paye = db.query(func.coalesce(func.sum(models.EcheancierPaiement.montant_paye), 0)).filter(
        models.EcheancierPaiement.eleve_id == student_id,
        models.EcheancierPaiement.service_type.in_(["scolarite", "frais_inscription", "frais_annexe", "inscription"])
    ).scalar() or Decimal("0.00")
    total_prevu = db.query(func.coalesce(func.sum(models.EcheancierPaiement.montant_prevu), 0)).filter(
        models.EcheancierPaiement.eleve_id == student_id,
        models.EcheancierPaiement.service_type.in_(["scolarite", "frais_inscription", "frais_annexe", "inscription"])
    ).scalar() or Decimal("0.00")
    if total_prevu > 0:
        update_data["AU_SCOLARITE"] = Decimal(str(total_prevu))
    update_data["AU_TOTALDEPOT"] = Decimal(str(total_paye))
    update_data["AU_SOLDECOMPTE"] = max(Decimal("0.00"), Decimal(str(update_data.get("AU_SCOLARITE") or db_student.AU_SCOLARITE or Decimal("0.00"))) - Decimal(str(total_paye)))
    update_data["solde"] = update_data["AU_SOLDECOMPTE"]

    # Utiliser la fonction crud existante pour mettre à jour
    updated_student = crud.update_student(db=db, db_student=db_student, update_data=update_data)

    # Le niveau vient d'être arrêté dans le dossier d'inscription : l'échéancier est bâti
    # immédiatement sur la grille en vigueur, sans attendre un premier encaissement.
    _doter_echeancier_scolarite(updated_student, db, force_realign=True)

    log_audit(
        db,
        action="MODIFICATION_DOSSIER",
        module="INSCRIPTION_ELEVES",
        detail=f"Mise à jour du dossier élève #{student_id} ({updated_student.nom} {updated_student.prenom})",
        ecole_id=updated_student.ecole_id,
        code_etablissement=updated_student.ET_CODEETABLISSEMENT,
        target_id=str(student_id),
        target_name=f"Élève: {updated_student.nom} {updated_student.prenom} ({updated_student.matricule or ''})",
        statut="SUCCES"
    )

    return updated_student

