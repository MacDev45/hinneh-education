from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import csv
import io
import unicodedata

from .. import crud, schemas, models


from datetime import datetime, date


def _normalize_header(value: str) -> str:
    v = value.strip().lower()
    v = ''.join(c for c in unicodedata.normalize('NFD', v) if unicodedata.category(c) != 'Mn')
    v = v.replace('&', ' et ')
    v = v.replace('  ', ' ').replace('-', ' ').replace('_', ' ')
    while '  ' in v:
        v = v.replace('  ', ' ')
    return v.strip()


def _parse_uploaded_file(file: UploadFile) -> tuple:
    filename = file.filename.lower()
    contents = file.file.read()

    if filename.endswith('.xlsx') or filename.endswith('.xls'):
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

from sqlalchemy import func, or_
from ..database import get_db
from ..routers.auth import get_school_scope, SchoolScope

router = APIRouter(prefix="/classes", tags=["Classes & Levels"])

@router.get("/", response_model=List[schemas.ClassResponse])
def read_classes(
    ecole_id: Optional[int] = None,
    code_etablissement: Optional[str] = None,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    if scope.is_global:
        classes = crud.get_classes(db, ecole_id=ecole_id, code_etablissement=code_etablissement)
    else:
        auth_ids = scope.get_authorized_school_ids(db)
        auth_codes = scope.get_authorized_school_codes(db)
        
        # Si un ID ou code spécifique est demandé, vérifier qu'il fait partie des autorisés
        if ecole_id is not None and ecole_id not in (auth_ids or []):
            ecole_id = None
        if code_etablissement is not None and code_etablissement not in (auth_codes or []):
            code_etablissement = None

        classes = crud.get_classes(
            db,
            ecole_id=ecole_id,
            code_etablissement=code_etablissement,
            ecole_ids=auth_ids if not ecole_id and not code_etablissement else None,
            code_etablissements=auth_codes if not ecole_id and not code_etablissement else None
        )

    # Filtrage strict par niveau / cycle pour les éducateurs
    if (scope.role or "").lower() == "educateur":
        edu_staff = None
        if scope.user:
            edu_staff = db.query(models.Personnel).filter(models.Personnel.user_id == scope.user.id).first()
        if not edu_staff and scope.username:
            edu_staff = db.query(models.Personnel).filter(models.Personnel.email == scope.username).first()

        if edu_staff:
            edu_attrs = db.query(models.AttributionEducateur).filter(
                models.AttributionEducateur.educateur_id == edu_staff.id
            ).all()

            if edu_attrs:
                assigned_cycle_ids = {a.cycle_id for a in edu_attrs if a.cycle_id is not None}
                assigned_cycle_codes = {str(a.cycle_code).strip().upper() for a in edu_attrs if a.cycle_code}
                assigned_cycle_libelles = {str(a.cycle_libelle).strip().lower() for a in edu_attrs if a.cycle_libelle}

                assigned_niveau_ids = {a.niveau_id for a in edu_attrs if a.niveau_id is not None}
                assigned_niveau_codes = {str(a.niveau_code).strip().upper() for a in edu_attrs if a.niveau_code}
                assigned_niveau_libelles = {str(a.niveau_libelle).strip().lower() for a in edu_attrs if a.niveau_libelle}

                has_specific_niveaux = len(assigned_niveau_ids) > 0

                filtered = []
                for c in classes:
                    # Correspondance de niveau
                    match_niveau = False
                    if c.niveau_id is not None and c.niveau_id in assigned_niveau_ids:
                        match_niveau = True
                    elif c.NI_CODENIVEAU and str(c.NI_CODENIVEAU).strip().upper() in assigned_niveau_codes:
                        match_niveau = True
                    elif c.CE_LIBELLENIVEAU and str(c.CE_LIBELLENIVEAU).strip().lower() in assigned_niveau_libelles:
                        match_niveau = True

                    # Correspondance de cycle
                    match_cycle = False
                    if c.cycle_id is not None and c.cycle_id in assigned_cycle_ids:
                        match_cycle = True
                    elif c.CY_LIBELLECYCLE and any(cyc in str(c.CY_LIBELLECYCLE).strip().upper() for cyc in assigned_cycle_codes):
                        match_cycle = True
                    elif c.ET_CYCLE and any(cyc in str(c.ET_CYCLE).strip().upper() for cyc in assigned_cycle_codes):
                        match_cycle = True
                    elif c.CY_LIBELLECYCLE and str(c.CY_LIBELLECYCLE).strip().lower() in assigned_cycle_libelles:
                        match_cycle = True

                    if has_specific_niveaux:
                        if match_niveau or (match_cycle and c.cycle_id in {a.cycle_id for a in edu_attrs if a.niveau_id is None}):
                            filtered.append(c)
                    else:
                        if match_cycle:
                            filtered.append(c)

                return filtered

    return classes

@router.post("/", response_model=schemas.ClassResponse, status_code=status.HTTP_201_CREATED)
def create_new_class(
    class_room: schemas.ClassCreate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    # 1. Résolution stricte de l'établissement cible à partir de la requête ou de l'utilisateur actif
    user_code = scope.get_effective_code(db) or scope.code_etablissement
    if not user_code and scope.user:
        user_code = getattr(scope.user, "ET_CODEETABLISSEMENT", None)
    if not user_code and scope.user:
        staff_entry = db.query(models.Personnel).filter(models.Personnel.user_id == scope.user.id).first()
        if staff_entry and staff_entry.ET_CODEETABLISSEMENT:
            user_code = staff_entry.ET_CODEETABLISSEMENT

    user_ecole_id = scope.get_effective_ecole_id(db) or scope.ecole_id
    if not user_ecole_id and scope.user:
        staff_entry = db.query(models.Personnel).filter(models.Personnel.user_id == scope.user.id).first()
        if staff_entry and staff_entry.ecole_id:
            user_ecole_id = staff_entry.ecole_id

    code_etab = (getattr(class_room, "ET_CODEETABLISSEMENT", None) or getattr(class_room, "code_etablissement", None) or "").strip().upper()
    ecole_id = getattr(class_room, "ecole_id", None)

    # Si non spécifié dans le formulaire, récupérer à partir du code d'établissement de l'utilisateur qui mène l'action
    if not code_etab and user_code:
        code_etab = user_code.strip().upper()
        setattr(class_room, "ET_CODEETABLISSEMENT", code_etab)
    if not ecole_id and user_ecole_id:
        ecole_id = user_ecole_id
        setattr(class_room, "ecole_id", ecole_id)

    # Synchronisation croisée ecole_id <-> ET_CODEETABLISSEMENT
    if not code_etab and ecole_id:
        ecole = db.query(models.Etablissement).filter(models.Etablissement.IDETABLISSEMENT == ecole_id).first()
        if ecole and ecole.ET_CODEETABLISSEMENT:
            code_etab = ecole.ET_CODEETABLISSEMENT.strip().upper()
            setattr(class_room, "ET_CODEETABLISSEMENT", code_etab)
    elif not ecole_id and code_etab:
        ecole = db.query(models.Etablissement).filter(
            func.upper(models.Etablissement.ET_CODEETABLISSEMENT) == code_etab
        ).first()
        if ecole:
            ecole_id = ecole.IDETABLISSEMENT
            setattr(class_room, "ecole_id", ecole_id)

    # S'il n'y a toujours pas de code_etab, chercher la première école de l'utilisateur ou la première école active
    if not code_etab:
        first_ecole = db.query(models.Etablissement).first()
        if first_ecole and first_ecole.ET_CODEETABLISSEMENT:
            code_etab = first_ecole.ET_CODEETABLISSEMENT.strip().upper()
            setattr(class_room, "ET_CODEETABLISSEMENT", code_etab)
            if not ecole_id:
                ecole_id = first_ecole.IDETABLISSEMENT
                setattr(class_room, "ecole_id", ecole_id)

    setattr(class_room, "ET_CODEETABLISSEMENT", code_etab)
    setattr(class_room, "ecole_id", ecole_id)

    if not scope.is_global:
        if not scope.can_access_school(class_room.ecole_id, class_room.ET_CODEETABLISSEMENT, db):
            raise HTTPException(status_code=403, detail="Accès refusé pour créer une classe dans cet établissement")

    # 2. Vérification d'unicité STRICTEMENT LIMITÉE À CET ÉTABLISSEMENT
    # ecole_id est l'identifiant unique d'une école (prioritaire)
    # code_etab est partagé par plusieurs cycles — chercher dedans seulement si ecole_id n'est pas disponible
    nom_classe = (class_room.CE_LIBELLE or "").strip().lower()

    db_existing = None
    if ecole_id:
        db_existing = db.query(models.Classe).filter(
            models.Classe.ecole_id == ecole_id,
            func.lower(models.Classe.CE_LIBELLE) == nom_classe
        ).first()
    elif code_etab:
        db_existing = db.query(models.Classe).filter(
            func.upper(models.Classe.ET_CODEETABLISSEMENT) == code_etab,
            func.lower(models.Classe.CE_LIBELLE) == nom_classe
        ).first()

    if db_existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La classe '{class_room.CE_LIBELLE}' existe déjà dans cet établissement."
        )

    # 3. Préfixer CE_CODECLASSE pour éviter les collisions globales en base
    prefix = code_etab or (f"EC{ecole_id}" if ecole_id else "GEN")
    raw_code = (class_room.CE_CODECLASSE or class_room.CE_LIBELLE or "CLS").upper().replace(" ", "_")
    if prefix and not raw_code.startswith(f"{prefix}_"):
        class_room.CE_CODECLASSE = f"{prefix}_{raw_code}"
    else:
        class_room.CE_CODECLASSE = raw_code

    return crud.create_class(db=db, class_room=class_room)

@router.get("/cycles", response_model=List[schemas.CycleResponse])
def read_cycles(
    ecole_id: Optional[int] = None,
    code_etablissement: Optional[str] = None,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    target_ecole_id = ecole_id or (scope.ecole_id if not scope.is_global else None)
    target_code = code_etablissement or (scope.code_etablissement if not scope.is_global else None)
    return crud.get_cycles(db, ecole_id=target_ecole_id, code_etablissement=target_code)

@router.get("/levels", response_model=List[schemas.LevelResponse])
def read_levels(
    ecole_id: Optional[int] = None,
    code_etablissement: Optional[str] = None,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    target_ecole_id = ecole_id or (scope.ecole_id if not scope.is_global else None)
    target_code = code_etablissement or (scope.code_etablissement if not scope.is_global else None)
    return crud.get_niveaux(db, ecole_id=target_ecole_id, code_etablissement=target_code)

@router.post("/levels", response_model=schemas.LevelResponse, status_code=status.HTTP_201_CREATED)
def create_new_level(level: schemas.LevelCreate, db: Session = Depends(get_db)):
    db_existing = db.query(models.Niveau).filter(models.Niveau.code == level.code).first()
    if db_existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Un niveau avec ce code existe déjà")
    return crud.create_level(db=db, level=level)

@router.put("/levels/{level_id}", response_model=schemas.LevelResponse)
def update_existing_level(level_id: int, payload: dict, db: Session = Depends(get_db)):
    updated = crud.update_level(db, level_id=level_id, level_data=payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Niveau non trouvé")
    return updated

@router.delete("/levels/{level_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_level(level_id: int, db: Session = Depends(get_db)):
    success = crud.delete_level(db, level_id=level_id)
    if not success:
        raise HTTPException(status_code=404, detail="Niveau non trouvé")
    return

# --- SUBJECTS ENDPOINTS ---
@router.get("/subjects", response_model=List[schemas.SubjectResponse])
def read_subjects(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    return crud.get_subjects(db, skip=skip, limit=limit, ecole_id=scope.ecole_id, code_etablissement=scope.code_etablissement)

@router.post("/subjects", response_model=schemas.SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_new_subject(
    subject: schemas.SubjectCreate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    db_existing = crud.get_subject_by_code(db, code=subject.code)
    if db_existing:
        raise HTTPException(status_code=400, detail="Une matière avec ce code existe déjà")
    return crud.create_subject(db=db, subject=subject, code_etablissement=scope.code_etablissement)


PREDEFINED_SCHEDULE_TEMPLATES = {
    "maternelle": [
        # Lundi
        {"jour": "Lundi", "heure": "07:30 - 08:20", "code": "FRAN"},
        {"jour": "Lundi", "heure": "08:20 - 09:10", "code": "FRAN"},
        {"jour": "Lundi", "heure": "09:10 - 10:00", "code": "MATH"},
        {"jour": "Lundi", "heure": "10:15 - 11:05", "code": "ISLAM"},
        {"jour": "Lundi", "heure": "11:05 - 11:55", "code": "ISLAM"},
        {"jour": "Lundi", "heure": "13:20 - 14:10", "code": "FRAN"},
        {"jour": "Lundi", "heure": "14:10 - 15:00", "code": "EPS"},
        {"jour": "Lundi", "heure": "15:00 - 15:50", "code": "FRAN"},

        # Mardi
        {"jour": "Mardi", "heure": "07:30 - 08:20", "code": "FRAN"},
        {"jour": "Mardi", "heure": "08:20 - 09:10", "code": "FRAN"},
        {"jour": "Mardi", "heure": "09:10 - 10:00", "code": "MATH"},
        {"jour": "Mardi", "heure": "10:15 - 11:05", "code": "ISLAM"},
        {"jour": "Mardi", "heure": "11:05 - 11:55", "code": "SVT"},
        {"jour": "Mardi", "heure": "13:20 - 14:10", "code": "FRAN"},
        {"jour": "Mardi", "heure": "14:10 - 15:00", "code": "FRAN"},
        {"jour": "Mardi", "heure": "15:00 - 15:50", "code": "MATH"},

        # Mercredi (matin)
        {"jour": "Mercredi", "heure": "07:30 - 08:20", "code": "ISLAM"},
        {"jour": "Mercredi", "heure": "08:20 - 09:10", "code": "ISLAM"},
        {"jour": "Mercredi", "heure": "09:10 - 10:00", "code": "EPS"},
        {"jour": "Mercredi", "heure": "10:15 - 11:05", "code": "FRAN"},
        {"jour": "Mercredi", "heure": "11:05 - 11:55", "code": "FRAN"},

        # Jeudi
        {"jour": "Jeudi", "heure": "07:30 - 08:20", "code": "FRAN"},
        {"jour": "Jeudi", "heure": "08:20 - 09:10", "code": "FRAN"},
        {"jour": "Jeudi", "heure": "09:10 - 10:00", "code": "MATH"},
        {"jour": "Jeudi", "heure": "10:15 - 11:05", "code": "ISLAM"},
        {"jour": "Jeudi", "heure": "11:05 - 11:55", "code": "ANG"},
        {"jour": "Jeudi", "heure": "13:20 - 14:10", "code": "FRAN"},
        {"jour": "Jeudi", "heure": "14:10 - 15:00", "code": "EPS"},
        {"jour": "Jeudi", "heure": "15:00 - 15:50", "code": "FRAN"},

        # Vendredi
        {"jour": "Vendredi", "heure": "07:30 - 08:20", "code": "FRAN"},
        {"jour": "Vendredi", "heure": "08:20 - 09:10", "code": "ISLAM"},
        {"jour": "Vendredi", "heure": "09:10 - 10:00", "code": "MATH"},
        {"jour": "Vendredi", "heure": "10:15 - 11:05", "code": "ISLAM"},
        {"jour": "Vendredi", "heure": "11:05 - 11:55", "code": "ISLAM"},
        {"jour": "Vendredi", "heure": "13:20 - 14:10", "code": "FRAN"}
    ],
    "primaire": [
        # Lundi
        {"jour": "Lundi", "heure": "07:45 - 08:00", "code": "SALUT_COULEURS"},
        {"jour": "Lundi", "heure": "08:05 - 08:35", "code": "LECTURE"},
        {"jour": "Lundi", "heure": "08:40 - 09:25", "code": "MATH"},
        {"jour": "Lundi", "heure": "09:25 - 10:00", "code": "EXPR_ORALE"},
        {"jour": "Lundi", "heure": "10:15 - 11:00", "code": "REMED_FRANCAIS"},
        {"jour": "Lundi", "heure": "11:00 - 11:30", "code": "LECTURE"},
        {"jour": "Lundi", "heure": "11:30 - 11:55", "code": "CHANT"},
        {"jour": "Lundi", "heure": "11:55 - 12:15", "code": "ECRITURE"},
        {"jour": "Lundi", "heure": "14:30 - 15:10", "code": "HG"},
        {"jour": "Lundi", "heure": "15:10 - 15:30", "code": "MATH"},
        {"jour": "Lundi", "heure": "15:30 - 16:00", "code": "EXPR_ECRITE"},
        {"jour": "Lundi", "heure": "16:15 - 17:00", "code": "REMED_MATH"},
        {"jour": "Lundi", "heure": "17:00 - 17:30", "code": "EDHC_AEC"},

        # Mardi
        {"jour": "Mardi", "heure": "07:45 - 08:10", "code": "EXPL_TEXTE"},
        {"jour": "Mardi", "heure": "08:15 - 09:00", "code": "MATH"},
        {"jour": "Mardi", "heure": "09:00 - 09:30", "code": "EXPR_ORALE"},
        {"jour": "Mardi", "heure": "09:30 - 10:00", "code": "EXPR_ECRITE"},
        {"jour": "Mardi", "heure": "10:15 - 11:00", "code": "REMED_FRANCAIS"},
        {"jour": "Mardi", "heure": "11:00 - 11:25", "code": "EXPL_TEXTE"},
        {"jour": "Mardi", "heure": "11:25 - 11:45", "code": "POESIE"},
        {"jour": "Mardi", "heure": "11:45 - 12:15", "code": "MATH"},
        {"jour": "Mardi", "heure": "14:30 - 15:15", "code": "SCIENCES_TECHNO"},
        {"jour": "Mardi", "heure": "15:15 - 15:40", "code": "LECTURE"},
        {"jour": "Mardi", "heure": "15:40 - 16:00", "code": "EXPL_TEXTE"},
        {"jour": "Mardi", "heure": "16:15 - 17:00", "code": "REMED_MATH"},
        {"jour": "Mardi", "heure": "17:00 - 17:30", "code": "SCIENCES_TECHNO"},

        # Jeudi
        {"jour": "Jeudi", "heure": "07:45 - 08:25", "code": "EPS"},
        {"jour": "Jeudi", "heure": "08:30 - 09:15", "code": "MATH"},
        {"jour": "Jeudi", "heure": "09:20 - 10:00", "code": "SCIENCES_TECHNO"},
        {"jour": "Jeudi", "heure": "10:15 - 11:00", "code": "REMED_FRANCAIS"},
        {"jour": "Jeudi", "heure": "11:05 - 11:40", "code": "MATH"},
        {"jour": "Jeudi", "heure": "11:40 - 12:15", "code": "LECTURE"},
        {"jour": "Jeudi", "heure": "14:30 - 15:00", "code": "LECTURE"},
        {"jour": "Jeudi", "heure": "15:00 - 15:30", "code": "DICTEE"},
        {"jour": "Jeudi", "heure": "15:30 - 16:00", "code": "EXPR_ORALE"},
        {"jour": "Jeudi", "heure": "16:15 - 17:00", "code": "REMED_MATH"},
        {"jour": "Jeudi", "heure": "17:00 - 17:30", "code": "EXPR_ECRITE"},

        # Vendredi
        {"jour": "Vendredi", "heure": "07:45 - 08:10", "code": "EXPL_TEXTE"},
        {"jour": "Vendredi", "heure": "08:15 - 09:00", "code": "MATH"},
        {"jour": "Vendredi", "heure": "09:00 - 09:25", "code": "EXPL_TEXTE"},
        {"jour": "Vendredi", "heure": "09:25 - 10:00", "code": "SCIENCES_TECHNO"},
        {"jour": "Vendredi", "heure": "10:15 - 11:00", "code": "REMED_FRANCAIS"},
        {"jour": "Vendredi", "heure": "11:00 - 11:25", "code": "ECRITURE"},
        {"jour": "Vendredi", "heure": "11:25 - 11:55", "code": "DICTEE"},
        {"jour": "Vendredi", "heure": "11:55 - 12:15", "code": "MATH"},
        {"jour": "Vendredi", "heure": "14:30 - 15:10", "code": "SCIENCES_TECHNO"},
        {"jour": "Vendredi", "heure": "15:10 - 15:35", "code": "POESIE"},
        {"jour": "Vendredi", "heure": "15:35 - 16:00", "code": "ANIMATION_LECTURE"},
        {"jour": "Vendredi", "heure": "16:15 - 17:00", "code": "REMED_MATH"},
        {"jour": "Vendredi", "heure": "17:00 - 17:20", "code": "ENTREPRENARIAT"},
        {"jour": "Vendredi", "heure": "17:20 - 17:30", "code": "SALUT_COULEURS"}
    ],
    "college_6eme_5eme": [
        {"jour": "Lundi", "heure": "07:30 - 09:10", "code": "MATH"},
        {"jour": "Lundi", "heure": "09:10 - 10:00", "code": "FRAN"},
        {"jour": "Lundi", "heure": "10:15 - 11:55", "code": "FRAN"},
        {"jour": "Lundi", "heure": "13:20 - 15:00", "code": "ANG"},
        {"jour": "Lundi", "heure": "15:00 - 15:50", "code": "HG"},
        {"jour": "Mardi", "heure": "07:30 - 09:10", "code": "PHYS"},
        {"jour": "Mardi", "heure": "09:10 - 10:00", "code": "SVT"},
        {"jour": "Mardi", "heure": "10:15 - 11:55", "code": "MATH"},
        {"jour": "Mardi", "heure": "13:20 - 15:00", "code": "FRAN"},
        {"jour": "Mardi", "heure": "15:00 - 15:50", "code": "SVT"},
        {"jour": "Mercredi", "heure": "07:30 - 09:10", "code": "EPS"},
        {"jour": "Mercredi", "heure": "09:10 - 11:05", "code": "ISLAM"},
        {"jour": "Mercredi", "heure": "11:05 - 11:55", "code": "MATH"},
        {"jour": "Jeudi", "heure": "07:30 - 09:10", "code": "FRAN"},
        {"jour": "Jeudi", "heure": "09:10 - 10:00", "code": "MATH"},
        {"jour": "Jeudi", "heure": "10:15 - 11:55", "code": "ANG"},
        {"jour": "Jeudi", "heure": "13:20 - 15:00", "code": "HG"},
        {"jour": "Jeudi", "heure": "15:00 - 15:50", "code": "PHYS"},
        {"jour": "Vendredi", "heure": "07:30 - 09:10", "code": "SVT"},
        {"jour": "Vendredi", "heure": "09:10 - 11:05", "code": "ISLAM"},
        {"jour": "Vendredi", "heure": "11:05 - 11:55", "code": "ISLAM"},
        {"jour": "Vendredi", "heure": "13:20 - 15:00", "code": "PHYS"}
    ],
    "college_4eme_3eme": [
        {"jour": "Lundi", "heure": "07:30 - 09:10", "code": "MATH"},
        {"jour": "Lundi", "heure": "09:10 - 10:00", "code": "FRAN"},
        {"jour": "Lundi", "heure": "10:15 - 11:55", "code": "PHYS"},
        {"jour": "Lundi", "heure": "13:20 - 15:00", "code": "HG"},
        {"jour": "Lundi", "heure": "15:00 - 15:50", "code": "ANG"},
        {"jour": "Mardi", "heure": "07:30 - 09:10", "code": "SVT"},
        {"jour": "Mardi", "heure": "09:10 - 10:00", "code": "ANG"},
        {"jour": "Mardi", "heure": "10:15 - 11:55", "code": "MATH"},
        {"jour": "Mardi", "heure": "13:20 - 15:00", "code": "FRAN"},
        {"jour": "Mardi", "heure": "15:00 - 15:50", "code": "LV2_ESP"},
        {"jour": "Mercredi", "heure": "07:30 - 09:10", "code": "EPS"},
        {"jour": "Mercredi", "heure": "09:10 - 11:05", "code": "ISLAM"},
        {"jour": "Mercredi", "heure": "11:05 - 11:55", "code": "MATH"},
        {"jour": "Jeudi", "heure": "07:30 - 09:10", "code": "FRAN"},
        {"jour": "Jeudi", "heure": "09:10 - 10:00", "code": "PHYS"},
        {"jour": "Jeudi", "heure": "10:15 - 11:55", "code": "MATH"},
        {"jour": "Jeudi", "heure": "13:20 - 15:00", "code": "ANG"},
        {"jour": "Jeudi", "heure": "15:00 - 15:50", "code": "HG"},
        {"jour": "Vendredi", "heure": "07:30 - 09:10", "code": "HG"},
        {"jour": "Vendredi", "heure": "09:10 - 11:05", "code": "ISLAM"},
        {"jour": "Vendredi", "heure": "11:05 - 11:55", "code": "ISLAM"},
        {"jour": "Vendredi", "heure": "13:20 - 15:00", "code": "SVT"}
    ],
    "lycee_scientifique": [
        {"jour": "Lundi", "heure": "07:30 - 09:10", "code": "MATH"},
        {"jour": "Lundi", "heure": "09:10 - 10:00", "code": "PHYS"},
        {"jour": "Lundi", "heure": "10:15 - 11:55", "code": "FRAN"},
        {"jour": "Lundi", "heure": "13:20 - 15:00", "code": "ANG"},
        {"jour": "Lundi", "heure": "15:00 - 15:50", "code": "HG"},
        {"jour": "Mardi", "heure": "07:30 - 09:10", "code": "SVT"},
        {"jour": "Mardi", "heure": "09:10 - 10:00", "code": "MATH"},
        {"jour": "Mardi", "heure": "10:15 - 11:55", "code": "PHYS"},
        {"jour": "Mardi", "heure": "13:20 - 15:00", "code": "HG"},
        {"jour": "Mardi", "heure": "15:00 - 15:50", "code": "FRAN"},
        {"jour": "Mercredi", "heure": "07:30 - 09:10", "code": "EPS"},
        {"jour": "Mercredi", "heure": "09:10 - 11:05", "code": "ISLAM"},
        {"jour": "Mercredi", "heure": "11:05 - 11:55", "code": "MATH"},
        {"jour": "Jeudi", "heure": "07:30 - 09:10", "code": "MATH"},
        {"jour": "Jeudi", "heure": "09:10 - 10:00", "code": "SVT"},
        {"jour": "Jeudi", "heure": "10:15 - 11:55", "code": "PHYS"},
        {"jour": "Jeudi", "heure": "13:20 - 15:00", "code": "FRAN"},
        {"jour": "Jeudi", "heure": "15:00 - 15:50", "code": "ANG"},
        {"jour": "Vendredi", "heure": "07:30 - 09:10", "code": "ANG"},
        {"jour": "Vendredi", "heure": "09:10 - 11:05", "code": "ISLAM"},
        {"jour": "Vendredi", "heure": "11:05 - 11:55", "code": "ISLAM"},
        {"jour": "Vendredi", "heure": "13:20 - 15:00", "code": "HG"}
    ],
    "lycee_litteraire": [
        {"jour": "Lundi", "heure": "07:30 - 09:10", "code": "FRAN"},
        {"jour": "Lundi", "heure": "09:10 - 10:00", "code": "ANG"},
        {"jour": "Lundi", "heure": "10:15 - 11:55", "code": "HG"},
        {"jour": "Lundi", "heure": "13:20 - 15:00", "code": "MATH"},
        {"jour": "Lundi", "heure": "15:00 - 15:50", "code": "LV2_ESP"},
        {"jour": "Mardi", "heure": "07:30 - 09:10", "code": "FRAN"},
        {"jour": "Mardi", "heure": "09:10 - 10:00", "code": "LV2_ESP"},
        {"jour": "Mardi", "heure": "10:15 - 11:55", "code": "ANG"},
        {"jour": "Mardi", "heure": "13:20 - 15:00", "code": "SVT"},
        {"jour": "Mardi", "heure": "15:00 - 15:50", "code": "HG"},
        {"jour": "Mercredi", "heure": "07:30 - 09:10", "code": "EPS"},
        {"jour": "Mercredi", "heure": "09:10 - 11:05", "code": "ISLAM"},
        {"jour": "Mercredi", "heure": "11:05 - 11:55", "code": "FRAN"},
        {"jour": "Jeudi", "heure": "07:30 - 09:10", "code": "HG"},
        {"jour": "Jeudi", "heure": "09:10 - 10:00", "code": "FRAN"},
        {"jour": "Jeudi", "heure": "10:15 - 11:55", "code": "LV2_ESP"},
        {"jour": "Jeudi", "heure": "13:20 - 15:00", "code": "MATH"},
        {"jour": "Jeudi", "heure": "15:00 - 15:50", "code": "ANG"},
        {"jour": "Vendredi", "heure": "07:30 - 09:10", "code": "ANG"},
        {"jour": "Vendredi", "heure": "09:10 - 11:05", "code": "ISLAM"},
        {"jour": "Vendredi", "heure": "11:05 - 11:55", "code": "ISLAM"},
        {"jour": "Vendredi", "heure": "13:20 - 15:00", "code": "FRAN"}
    ]
}

# Le gabarit primaire découpe une même matière en plusieurs activités pédagogiques
# distinctes (lecture, dictée, expression orale, remédiation...) qui ne correspondent à
# aucune fiche Matière séparée dans le système : on les regroupe sous le code de la
# matière réelle avant de comparer au volume horaire effectivement planifié.
PROGRAMME_CODE_ALIASES = {
    "LECTURE": "FRAN", "EXPR_ORALE": "FRAN", "EXPR_ECRITE": "FRAN", "ECRITURE": "FRAN",
    "EXPL_TEXTE": "FRAN", "POESIE": "FRAN", "DICTEE": "FRAN", "ANIMATION_LECTURE": "FRAN",
    "REMED_FRANCAIS": "FRAN",
    "REMED_MATH": "MATH",
    "SCIENCES_TECHNO": "SVT",
}
# Activités de vie de classe / rituels qui ne sont pas des matières enseignées à
# proprement parler (aucune fiche Matière ne leur correspond) : suivies à part, jamais
# comptées comme une matière "manquante".
PROGRAMME_CODES_HORS_MATIERE = {"SALUT_COULEURS", "CHANT", "EDHC_AEC", "ENTREPRENARIAT"}


def _resolve_template_key_for_class(classe_name: str, cycle_name: Optional[str] = None) -> str:
    n = (classe_name or "").lower()
    c = (cycle_name or "").lower()
    if "mat" in n or "mat" in c or any(x in n for x in ["mps", "mms", "mgs", "tps", "ps", "ms", "gs", "petite section", "moyenne section", "grande section", "prescolaire", "préscolaire"]):
        return "maternelle"
    if "prim" in n or "prim" in c or any(x in n for x in ["cp1", "cp2", "ce1", "ce2", "cm1", "cm2", "cours préparatoire", "cours élémentaire", "cours moyen"]):
        return "primaire"
    if "2nde" in n or "1ere" in n or "1ère" in n or "tle" in n or "term" in n or "lycee" in c or "lycée" in c:
        if any(x in n for x in ["c", "d", "s", "scientifique"]):
            return "lycee_scientifique"
        return "lycee_litteraire"
    if "4" in n or "3" in n:
        return "college_4eme_3eme"
    return "college_6eme_5eme"



# --- ATTRIBUTIONS ENDPOINTS ---
@router.get("/attributions", response_model=List[schemas.AttributionResponse])
def read_attributions(
    classe_id: Optional[int] = None,
    enseignant_id: Optional[int] = None,
    ecole_id: Optional[int] = None,
    code_etablissement: Optional[str] = None,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    eff_code = code_etablissement
    eff_ecole = ecole_id
    if not scope.is_global and not classe_id:
        eff_code = code_etablissement or scope.code_etablissement
        eff_ecole = ecole_id or scope.ecole_id
    return crud.get_attributions(db, classe_id=classe_id, teacher_id=enseignant_id, ecole_id=eff_ecole, code_etablissement=eff_code)

@router.post("/attributions", response_model=schemas.AttributionResponse, status_code=status.HTTP_201_CREATED)
def create_new_attribution(
    attr: schemas.AttributionCreate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    db_class = crud.get_class_by_id(db, class_id=attr.classe_id)
    if not db_class:
        raise HTTPException(status_code=404, detail="Classe non trouvée")
    if attr.enseignant_id:
        db_teacher = crud.get_staff_by_id(db, staff_id=attr.enseignant_id)
        if not db_teacher:
            raise HTTPException(status_code=404, detail="Enseignant non trouvé")
    db_subject = db.query(models.Matiere).filter(models.Matiere.id == attr.matiere_id).first()
    if not db_subject:
        raise HTTPException(status_code=404, detail="Matière non trouvée")
    return crud.create_attribution(db=db, attr=attr, code_etablissement=scope.code_etablissement)

@router.put("/attributions/{attribution_id}", response_model=schemas.AttributionResponse)
def update_existing_attribution(
    attribution_id: int,
    attr_in: schemas.AttributionUpdate,
    db: Session = Depends(get_db)
):
    updated = crud.update_attribution(db, attr_id=attribution_id, attr_in=attr_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Attribution non trouvée")
    return updated

@router.delete("/attributions/{attribution_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject_attribution(attribution_id: int, db: Session = Depends(get_db)):
    success = crud.delete_attribution(db, attr_id=attribution_id)
    if not success:
        raise HTTPException(status_code=404, detail="Attribution non trouvée")
    return

@router.post("/attributions/assign-teacher")
def assign_teacher_to_slot(
    data: schemas.AssignTeacherSlotRequest,
    db: Session = Depends(get_db)
):
    """Assigne un enseignant à un créneau d'emploi du temps avec détection stricte de collision."""
    db_attr = db.query(models.AttributionMatiere).filter(models.AttributionMatiere.id == data.attribution_id).first()
    if not db_attr:
        raise HTTPException(status_code=404, detail="Créneau d'emploi du temps non trouvé")

    if data.enseignant_id is None or data.enseignant_id == 0:
        db_attr.enseignant_id = None
        db.commit()
        db.refresh(db_attr)
        return {
            "success": True,
            "message": f"Créneau {db_attr.jour} ({db_attr.heure}) désassigné avec succès.",
            "attribution": db_attr
        }

    teacher = crud.get_staff_by_id(db, staff_id=data.enseignant_id)
    if not teacher:
        raise HTTPException(status_code=404, detail="Enseignant non trouvé")

    # Anti-collision check (enseignant, mais aussi classe/salle au cas où le créneau
    # visé aurait été créé avant l'ajout de ces vérifications)
    crud._check_attribution_conflicts(
        db, db_attr.classe_id, data.enseignant_id, db_attr.salle, db_attr.jour, db_attr.heure,
        exclude_id=data.attribution_id,
    )

    db_attr.enseignant_id = data.enseignant_id
    db.commit()
    db.refresh(db_attr)
    return {
        "success": True,
        "message": f"Enseignant {teacher.nom} {teacher.prenom} attribué avec succès au créneau {db_attr.jour} ({db_attr.heure}).",
        "attribution": db_attr
    }


# --- ATTRIBUTIONS DES NIVEAUX ET CYCLES AUX EDUCATEURS ---

@router.get("/attributions-educateurs/my-attributions")
def get_my_educateur_attributions_route(
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Renvoie les cycles et niveaux attribués à l'utilisateur éducateur connecté."""
    edu_staff = None
    if scope.user:
        edu_staff = db.query(models.Personnel).filter(models.Personnel.user_id == scope.user.id).first()
    if not edu_staff and scope.username:
        edu_staff = db.query(models.Personnel).filter(models.Personnel.email == scope.username).first()

    if not edu_staff:
        return {
            "has_restrictions": False,
            "educateur_id": None,
            "cycles": [],
            "niveaux": [],
            "cycle_ids": [],
            "niveau_ids": []
        }

    attrs = db.query(models.AttributionEducateur).filter(
        models.AttributionEducateur.educateur_id == edu_staff.id
    ).all()

    if not attrs:
        return {
            "has_restrictions": False,
            "educateur_id": edu_staff.id,
            "cycles": [],
            "niveaux": [],
            "cycle_ids": [],
            "niveau_ids": []
        }

    cycles = []
    niveaux = []
    seen_cycles = set()
    seen_niveaux = set()

    for a in attrs:
        if a.cycle_id and a.cycle_id not in seen_cycles:
            seen_cycles.add(a.cycle_id)
            cycles.append({
                "id": a.cycle_id,
                "code": a.cycle_code,
                "libelle": a.cycle_libelle
            })
        if a.niveau_id and a.niveau_id not in seen_niveaux:
            seen_niveaux.add(a.niveau_id)
            niveaux.append({
                "id": a.niveau_id,
                "code": a.niveau_code,
                "libelle": a.niveau_libelle,
                "cycle_id": a.cycle_id
            })

    return {
        "has_restrictions": True,
        "educateur_id": edu_staff.id,
        "cycles": cycles,
        "niveaux": niveaux,
        "cycle_ids": list(seen_cycles),
        "niveau_ids": list(seen_niveaux)
    }


@router.get("/attributions-educateurs")
def read_educateur_attributions(
    educateur_id: Optional[int] = None,
    ecole_id: Optional[int] = None,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Retourne la liste plate des attributions pour l'affichage dans le tableau admin."""
    eff_ecole = ecole_id or (scope.ecole_id if not scope.is_global else None)

    raw_attrs = crud.get_educateur_attributions(
        db,
        educateur_id=educateur_id,
        ecole_id=eff_ecole,
        code_etablissement=None
    )

    # Retourner une liste plate — chaque ligne = une attribution
    result = []
    for a in raw_attrs:
        edu = a.educateur
        result.append({
            "id": a.id,
            "educateur_id": a.educateur_id,
            "nom": edu.nom if edu else "",
            "prenom": edu.prenom if edu else "",
            "email": edu.email if edu else "",
            "ecole_id": a.ecole_id,
            "code_etablissement": a.code_etablissement,
            "cycle_id": a.cycle_id,
            "cycle_code": a.cycle_code,
            "cycle_libelle": a.cycle_libelle,
            "niveau_id": a.niveau_id,
            "niveau_code": a.niveau_code,
            "niveau_libelle": a.niveau_libelle,
            "date_attribution": str(a.date_attribution) if a.date_attribution else None,
            "attribue_par": a.attribue_par,
        })

    return result


@router.post("/attributions-educateurs/assign")
def assign_educateur_attributions_route(
    data: schemas.AttributionEducateurAssignRequest,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    if not data.educateur_ids:
        raise HTTPException(status_code=400, detail="Veuillez sélectionner au moins un éducateur.")
    if not data.cycle_ids and not data.niveau_ids:
        raise HTTPException(status_code=400, detail="Veuillez sélectionner au moins un cycle ou niveau.")

    attribue_par = scope.username or "Administrateur"
    if scope.user:
        name_parts = [p for p in [scope.user.first_name, scope.user.last_name] if p]
        attribue_par = " ".join(name_parts) if name_parts else scope.username

    created = crud.assign_educateur_attributions(
        db=db,
        data=data,
        attribue_par=attribue_par
    )

    return {
        "success": True,
        "message": f"{len(created)} attribution(s) enregistrée(s) avec succès pour {len(data.educateur_ids)} éducateur(s).",
        "created_count": len(created)
    }


@router.delete("/attributions-educateurs/educateur/{educateur_id}")
def revoke_educateur_all_attributions_route(
    educateur_id: int,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    count = crud.delete_educateur_attributions(db, educateur_id=educateur_id)
    return {
        "success": True,
        "message": f"Toutes les attributions de l'éducateur ont été révoquées ({count} supprimées).",
        "deleted_count": count
    }


@router.delete("/attributions-educateurs/{attribution_id}")
def delete_single_educateur_attribution_route(
    attribution_id: int,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    success = crud.delete_attribution_educateur(db, attribution_id=attribution_id)
    if not success:
        raise HTTPException(status_code=404, detail="Attribution non trouvée")
    return {"success": True, "message": "Attribution supprimée avec succès."}


    eff_code = code_etablissement or scope.code_etablissement
    eff_ecole = ecole_id or scope.ecole_id

    raw_attrs = crud.get_educateur_attributions(
        db,
        educateur_id=educateur_id,
        ecole_id=eff_ecole if not scope.is_global else ecole_id,
        code_etablissement=eff_code if not scope.is_global else code_etablissement
    )

    grouped = {}
    for a in raw_attrs:
        edu = a.educateur
        if not edu:
            continue
        if edu.id not in grouped:
            grouped[edu.id] = {
                "educateur_id": edu.id,
                "nom": edu.nom,
                "prenom": edu.prenom,
                "email": edu.email,
                "telephone": edu.telephone,
                "photo": edu.photo,
                "ecole_id": edu.ecole_id,
                "code_etablissement": edu.ET_CODEETABLISSEMENT,
                "cycles": [],
                "niveaux": [],
                "attribution_ids": [],
                "date_attribution": a.date_attribution,
                "attribue_par": a.attribue_par,
            }

        grouped[edu.id]["attribution_ids"].append(a.id)

        if a.cycle_id and not any(c["id"] == a.cycle_id for c in grouped[edu.id]["cycles"]):
            grouped[edu.id]["cycles"].append({
                "id": a.cycle_id,
                "code": a.cycle_code,
                "libelle": a.cycle_libelle
            })

        if a.niveau_id and not any(n["id"] == a.niveau_id for n in grouped[edu.id]["niveaux"]):
            grouped[edu.id]["niveaux"].append({
                "id": a.niveau_id,
                "code": a.niveau_code,
                "libelle": a.niveau_libelle,
                "cycle_id": a.cycle_id
            })

    return list(grouped.values())


@router.post("/attributions-educateurs/assign")
def assign_educateur_attributions_route(
    data: schemas.AttributionEducateurAssignRequest,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    if not data.educateur_ids:
        raise HTTPException(status_code=400, detail="Veuillez sélectionner au moins un éducateur.")
    if not data.cycle_ids and not data.niveau_ids:
        raise HTTPException(status_code=400, detail="Veuillez sélectionner au moins un cycle ou niveau.")

    attribue_par = scope.username or "Administrateur"
    if scope.user:
        name_parts = [p for p in [scope.user.first_name, scope.user.last_name] if p]
        attribue_par = " ".join(name_parts) if name_parts else scope.username

    created = crud.assign_educateur_attributions(
        db=db,
        data=data,
        attribue_par=attribue_par
    )

    return {
        "success": True,
        "message": f"{len(created)} attribution(s) enregistrée(s) avec succès pour {len(data.educateur_ids)} éducateur(s).",
        "created_count": len(created)
    }


@router.delete("/attributions-educateurs/educateur/{educateur_id}")
def revoke_educateur_all_attributions_route(
    educateur_id: int,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    count = crud.delete_educateur_attributions(db, educateur_id=educateur_id)
    return {
        "success": True,
        "message": f"Toutes les attributions de l'éducateur ont été révoquées ({count} supprimées).",
        "deleted_count": count
    }


@router.delete("/attributions-educateurs/{attribution_id}")
def delete_single_educateur_attribution_route(
    attribution_id: int,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    success = crud.delete_attribution_educateur(db, attribution_id=attribution_id)
    if not success:
        raise HTTPException(status_code=404, detail="Attribution non trouvée")
    return {"success": True, "message": "Attribution supprimée avec succès."}


@router.get("/attributions-educateurs/my-attributions")
def get_my_educateur_attributions_route(
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Renvoie les cycles et niveaux attribués à l'utilisateur éducateur connecté."""
    edu_staff = None
    if scope.user:
        edu_staff = db.query(models.Personnel).filter(models.Personnel.user_id == scope.user.id).first()
    if not edu_staff and scope.username:
        edu_staff = db.query(models.Personnel).filter(models.Personnel.email == scope.username).first()

    if not edu_staff:
        return {
            "has_restrictions": False,
            "educateur_id": None,
            "cycles": [],
            "niveaux": [],
            "cycle_ids": [],
            "niveau_ids": []
        }

    attrs = db.query(models.AttributionEducateur).filter(
        models.AttributionEducateur.educateur_id == edu_staff.id
    ).all()

    if not attrs:
        return {
            "has_restrictions": False,
            "educateur_id": edu_staff.id,
            "cycles": [],
            "niveaux": [],
            "cycle_ids": [],
            "niveau_ids": []
        }

    cycles = []
    niveaux = []
    seen_cycles = set()
    seen_niveaux = set()

    for a in attrs:
        if a.cycle_id and a.cycle_id not in seen_cycles:
            seen_cycles.add(a.cycle_id)
            cycles.append({
                "id": a.cycle_id,
                "code": a.cycle_code,
                "libelle": a.cycle_libelle
            })
        if a.niveau_id and a.niveau_id not in seen_niveaux:
            seen_niveaux.add(a.niveau_id)
            niveaux.append({
                "id": a.niveau_id,
                "code": a.niveau_code,
                "libelle": a.niveau_libelle,
                "cycle_id": a.cycle_id
            })

    return {
        "has_restrictions": True,
        "educateur_id": edu_staff.id,
        "cycles": cycles,
        "niveaux": niveaux,
        "cycle_ids": list(seen_cycles),
        "niveau_ids": list(seen_niveaux)
    }


@router.post("/generate-schedule-template")
def generate_class_schedule_template(
    data: schemas.GenerateScheduleTemplateRequest,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Génère automatiquement une grille d'emploi du temps prédéfinie pour une classe."""
    db_class = crud.get_class_by_id(db, class_id=data.classe_id)
    if not db_class:
        raise HTTPException(status_code=404, detail="Classe non trouvée")

    class_name = getattr(db_class, 'CE_LIBELLE', None) or getattr(db_class, 'libelle', None) or ""
    cycle_name = getattr(db_class, 'CY_LIBELLECYCLE', None) or ""
    tpl_key = _resolve_template_key_for_class(class_name, cycle_name)
    template_slots = PREDEFINED_SCHEDULE_TEMPLATES.get(tpl_key, PREDEFINED_SCHEDULE_TEMPLATES["college_6eme_5eme"])

    # Look up subjects
    subjects = db.query(models.Matiere).all()
    subj_by_code = {str(s.code).upper().strip(): s for s in subjects if s.code}
    subj_by_libelle = {str(s.libelle).lower().strip(): s for s in subjects if s.libelle}

    fallback_subj = subjects[0] if subjects else None
    if not fallback_subj:
        raise HTTPException(status_code=400, detail="Aucune matière configurée dans le système")

    if data.replace_existing:
        db.query(models.AttributionMatiere).filter(models.AttributionMatiere.classe_id == data.classe_id).delete()
        db.flush()

    default_salle = data.salle or getattr(db_class, 'SA_CODESALLE', None) or "Salle de cours"
    code_etab = getattr(db_class, 'ET_CODEETABLISSEMENT', None) or scope.code_etablissement
    ecole_id = getattr(db_class, 'ecole_id', None) or scope.ecole_id

    created_slots = []
    for slot in template_slots:
        target_code = slot["code"]
        matched_subj = subj_by_code.get(target_code)
        if not matched_subj:
            # Fallback search by keyword
            for s in subjects:
                if target_code.lower() in (s.libelle or "").lower() or (s.code or "").lower() in target_code.lower():
                    matched_subj = s
                    break
        if not matched_subj:
            matched_subj = fallback_subj

        new_attr = models.AttributionMatiere(
            classe_id=data.classe_id,
            enseignant_id=None,
            matiere_id=matched_subj.id,
            jour=slot["jour"],
            heure=slot["heure"],
            salle=default_salle,
            statut="actif",
            groupe="Classe entière",
            ecole_id=ecole_id,
            ET_CODEETABLISSEMENT=code_etab
        )
        db.add(new_attr)
        created_slots.append(new_attr)

    db.commit()
    return {
        "success": True,
        "message": f"Emploi du temps prédéfini ({len(created_slots)} créneaux) généré avec succès pour {class_name}.",
        "classe_id": data.classe_id,
        "template_used": tpl_key,
        "slots_count": len(created_slots)
    }


def _slot_duration_minutes(heure: Optional[str]) -> int:
    """Retourne la durée en minutes d'un créneau 'HH:MM - HH:MM' (0 si illisible)."""
    if not heure:
        return 0
    try:
        s = heure.strip().lower().replace('h', ':')
        parts = s.split('-')
        if len(parts) != 2:
            return 0

        def to_mins(t: str) -> int:
            t = t.strip()
            if ':' in t:
                h, m = t.split(':')
                return int(h) * 60 + (int(m) if m else 0)
            return int(t) * 60

        start, end = to_mins(parts[0]), to_mins(parts[1])
        return max(0, end - start)
    except Exception:
        return 0


@router.get("/{classe_id}/programme-coherence")
def get_class_programme_coherence(
    classe_id: int,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Compare l'emploi du temps réel d'une classe au volume horaire officiel attendu par
    matière (dérivé du programme prédéfini de son cycle — le même référentiel que celui
    utilisé par /generate-schedule-template) : signale les matières manquantes, sous-dotées,
    sur-dotées, ou au contraire présentes dans l'emploi du temps mais hors programme."""
    db_class = crud.get_class_by_id(db, class_id=classe_id)
    if not db_class:
        raise HTTPException(status_code=404, detail="Classe non trouvée")

    class_name = getattr(db_class, 'CE_LIBELLE', None) or getattr(db_class, 'libelle', None) or ""
    cycle_name = getattr(db_class, 'CY_LIBELLECYCLE', None) or ""
    tpl_key = _resolve_template_key_for_class(class_name, cycle_name)
    template_slots = PREDEFINED_SCHEDULE_TEMPLATES.get(tpl_key, PREDEFINED_SCHEDULE_TEMPLATES["college_6eme_5eme"])

    subjects = db.query(models.Matiere).all()
    subj_by_code = {str(s.code).upper().strip(): s for s in subjects if s.code}

    def resolve_subject(target_code: str):
        matched = subj_by_code.get(target_code)
        if matched:
            return matched
        for s in subjects:
            if target_code.lower() in (s.libelle or "").lower() or (s.code or "").lower() in target_code.lower():
                return s
        return None

    # Volume horaire officiel attendu, en minutes, par matière du gabarit du cycle (les
    # activités sans fiche Matière sont suivies séparément, les codes alias sont regroupés
    # sous le code de leur matière réelle)
    heures_prevues_par_code = {}
    activites_hors_matiere = {}
    for slot in template_slots:
        raw_code = slot["code"]
        duree = _slot_duration_minutes(slot["heure"])
        if raw_code in PROGRAMME_CODES_HORS_MATIERE:
            activites_hors_matiere[raw_code] = activites_hors_matiere.get(raw_code, 0) + duree
            continue
        code = PROGRAMME_CODE_ALIASES.get(raw_code, raw_code)
        heures_prevues_par_code[code] = heures_prevues_par_code.get(code, 0) + duree

    # Volume horaire réellement planifié pour cette classe, en minutes, par matière
    real_slots = db.query(models.AttributionMatiere).filter(
        models.AttributionMatiere.classe_id == classe_id,
        models.AttributionMatiere.statut == "actif",
    ).all()
    heures_reelles_par_matiere_id = {}
    for s in real_slots:
        heures_reelles_par_matiere_id[s.matiere_id] = heures_reelles_par_matiere_id.get(s.matiere_id, 0) + _slot_duration_minutes(s.heure)

    TOLERANCE_MIN = 15  # tolérance d'arrondi avant de signaler un écart réel

    matieres_out = []
    matched_matiere_ids = set()
    for code, prevu_min in heures_prevues_par_code.items():
        subj = resolve_subject(code)
        libelle = getattr(subj, 'libelle', None) or code
        matiere_id = getattr(subj, 'id', None)
        reel_min = heures_reelles_par_matiere_id.get(matiere_id, 0) if matiere_id else 0
        if matiere_id:
            matched_matiere_ids.add(matiere_id)
        ecart_min = reel_min - prevu_min
        if reel_min <= 0:
            statut = "manquant"
        elif abs(ecart_min) <= TOLERANCE_MIN:
            statut = "conforme"
        elif ecart_min < 0:
            statut = "insuffisant"
        else:
            statut = "exces"
        matieres_out.append({
            "code": code,
            "matiere_id": matiere_id,
            "libelle": libelle,
            "heures_prevues": round(prevu_min / 60, 2),
            "heures_reelles": round(reel_min / 60, 2),
            "ecart_heures": round(ecart_min / 60, 2),
            "statut": statut,
        })

    # Matières planifiées dans l'emploi du temps réel mais absentes du programme officiel
    hors_programme = []
    for matiere_id, reel_min in heures_reelles_par_matiere_id.items():
        if matiere_id and matiere_id not in matched_matiere_ids:
            subj = next((s for s in subjects if s.id == matiere_id), None)
            hors_programme.append({
                "matiere_id": matiere_id,
                "libelle": getattr(subj, 'libelle', None) or f"Matière #{matiere_id}",
                "heures_reelles": round(reel_min / 60, 2),
            })

    statut_ordre = {"manquant": 0, "insuffisant": 1, "exces": 2, "conforme": 3}
    matieres_out.sort(key=lambda m: statut_ordre.get(m["statut"], 4))

    nb_conformes = sum(1 for m in matieres_out if m["statut"] == "conforme")
    return {
        "classe_id": classe_id,
        "classe_nom": class_name,
        "template_utilise": tpl_key,
        "matieres": matieres_out,
        "hors_programme": hors_programme,
        "activites_hors_matiere": [
            {"code": code, "heures_prevues": round(mins / 60, 2)}
            for code, mins in activites_hors_matiere.items()
        ],
        "nb_matieres_programme": len(matieres_out),
        "nb_conformes": nb_conformes,
        "coherent": nb_conformes == len(matieres_out) and len(hors_programme) == 0,
    }


@router.post("/import")
def import_classes_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    if not (file.filename.lower().endswith('.csv') or file.filename.lower().endswith('.xlsx') or file.filename.lower().endswith('.xls')):
        raise HTTPException(status_code=400, detail="Le fichier doit être au format Excel (.xlsx, .xls) ou CSV (.csv)")
    
    try:
        raw_headers, data_rows = _parse_uploaded_file(file)
        
        if not raw_headers:
            return {"success": False, "imported": 0, "updated": 0, "errors": ["Aucune colonne détectée dans le fichier."]}

        imported_count = 0
        updated_count = 0
        errors = []
        
        header_mapping = {
            'nom': 'nom',
            'libelle': 'nom',
            'nom classe': 'nom',
            'classe': 'nom',
            'niveau': 'niveau',
            'cycle': 'cycle',
            'capacite': 'capacite',
            'professeur_principal': 'professeur_principal',
            'professeur principal': 'professeur_principal',
            'prof principal': 'professeur_principal',
            'salle': 'salle',
        }
        normalized_mapping = {_normalize_header(k): v for k, v in header_mapping.items()}

        if not any(_normalize_header(h) in normalized_mapping and normalized_mapping[_normalize_header(h)] == 'nom' for h in raw_headers):
            return {
                "success": False,
                "imported": 0,
                "updated": 0,
                "errors": [f"Colonne requise manquante : nom. Colonnes détectées : {', '.join(raw_headers[:12])}."]
            }

        # Déterminer l'école cible pour les classes importées
        if scope.ecole_id:
            target_school = db.query(models.Etablissement).filter(
                models.Etablissement.IDETABLISSEMENT == scope.ecole_id
            ).first()
            if not target_school:
                return {
                    "success": False,
                    "imported": 0,
                    "updated": 0,
                    "errors": ["Établissement de l'utilisateur non trouvé."]
                }
        else:
            # Admin global : cherche une école existante
            target_school = db.query(models.Etablissement).first()
            if not target_school:
                return {
                    "success": False,
                    "imported": 0,
                    "updated": 0,
                    "errors": ["Aucun établissement disponible pour l'import. Créez d'abord une école."]
                }

        for index, row in enumerate(data_rows, start=1):
            try:
                clean_row = {}
                for k, v in row.items():
                    if k:
                        nk = _normalize_header(k)
                        mapped_key = normalized_mapping.get(nk) or nk
                        clean_row[mapped_key] = v.strip() if isinstance(v, str) else str(v or "").strip()
                
                nom = clean_row.get('nom')
                if not nom:
                    errors.append(f"Ligne {index}: Nom de classe manquant.")
                    continue
                
                code = nom.upper().replace(" ", "_")
                
                # Look up level
                niveau_str = clean_row.get('niveau')
                niveau_id = None
                niveau_libelle = None
                niveau_code = None
                if niveau_str:
                    db_level = db.query(models.Niveau).filter(
                        (models.Niveau.code == niveau_str) | (models.Niveau.libelle == niveau_str)
                    ).first()
                    if db_level:
                        niveau_id = db_level.id
                        niveau_libelle = db_level.libelle
                        niveau_code = db_level.code
                
                # Look up cycle
                cycle_str = clean_row.get('cycle')
                cycle_id = None
                cycle_libelle = None
                if cycle_str:
                    db_cycle = db.query(models.Cycle).filter(
                        (models.Cycle.code == cycle_str) | (models.Cycle.libelle == cycle_str)
                    ).first()
                    if db_cycle:
                        cycle_id = db_cycle.id
                        cycle_libelle = db_cycle.libelle
                
                # If level is found but cycle is not, try to use level's cycle
                if niveau_id and not cycle_id:
                    db_level = db.query(models.Niveau).filter(models.Niveau.id == niveau_id).first()
                    if db_level and db_level.cycle:
                        cycle_id = db_level.cycle.id
                        cycle_libelle = db_level.cycle.libelle

                # Look up teacher
                teacher_str = clean_row.get('professeur_principal')
                enseignant_id = None
                if teacher_str:
                    teachers = db.query(models.Personnel).all()
                    normalized_p = teacher_str.strip().lower().replace(" ", "")
                    for t in teachers:
                        fullname1 = (t.prenom + t.nom).strip().lower().replace(" ", "")
                        fullname2 = (t.nom + t.prenom).strip().lower().replace(" ", "")
                        if fullname1 == normalized_p or fullname2 == normalized_p:
                            enseignant_id = t.id
                            break
                
                # Capacity
                capacite = 50
                cap_str = clean_row.get('capacite')
                if cap_str:
                    try:
                        capacite = int(cap_str)
                    except ValueError:
                        pass
                
                salle = clean_row.get('salle') or None
                
                db_class = db.query(models.Classe).filter(models.Classe.CE_CODECLASSE == code).first()
                if db_class:
                    db_class.CE_LIBELLE = nom
                    db_class.capacite = capacite
                    if cycle_id:
                        db_class.cycle_id = cycle_id
                        db_class.CY_LIBELLECYCLE = cycle_libelle
                    if niveau_id:
                        db_class.niveau_id = niveau_id
                        db_class.CE_LIBELLENIVEAU = niveau_libelle
                        db_class.NI_CODENIVEAU = niveau_code
                    if enseignant_id:
                        db_class.enseignant_id = enseignant_id
                    if salle:
                        db_class.SA_CODESALLE = salle
                    db.commit()
                    updated_count += 1
                else:
                    class_in = schemas.ClassCreate(
                        CE_LIBELLE=nom,
                        capacite=capacite,
                        cycle_id=cycle_id,
                        ecole_id=target_school.IDETABLISSEMENT,
                        enseignant_id=enseignant_id,
                        niveau_id=niveau_id,
                        CE_CODECLASSE=code,
                        CE_LIBELLENIVEAU=niveau_libelle,
                        CY_LIBELLECYCLE=cycle_libelle
                    )
                    db_class = crud.create_class(db, class_room=class_in)
                    if salle:
                        db_class.SA_CODESALLE = salle
                        db.commit()
                    imported_count += 1
                    
            except Exception as e:
                db.rollback()
                errors.append(f"Ligne {index}: Erreur: {str(e)}")

        return {
            "success": len(errors) == 0,
            "imported": imported_count,
            "updated": updated_count,
            "errors": errors
        }
    except Exception as e:
        db.rollback()
        return {
            "success": False,
            "imported": imported_count if 'imported_count' in locals() else 0,
            "updated": updated_count if 'updated_count' in locals() else 0,
            "errors": [f"Erreur de traitement du fichier : {str(e)}"]
        }

@router.put("/{class_id}", response_model=schemas.ClassResponse)
def update_existing_class(
    class_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    # Vérifier que la classe appartient aux établissements autorisés
    db_class = db.query(models.Classe).filter(models.Classe.id == class_id).first()
    if not db_class:
        raise HTTPException(status_code=404, detail="Classe non trouvée")

    if not scope.is_global:
        auth_ids = scope.get_authorized_school_ids(db)
        auth_codes = scope.get_authorized_school_codes(db)
        has_access = (db_class.ecole_id and db_class.ecole_id in auth_ids) or \
                     (db_class.ET_CODEETABLISSEMENT and db_class.ET_CODEETABLISSEMENT in auth_codes)
        if not has_access:
            raise HTTPException(status_code=403, detail="Vous n'avez pas accès à cette classe")

    updated = crud.update_class(db, class_id=class_id, class_data=payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Classe non trouvée")
    return updated

@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_class(
    class_id: int,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    # Vérifier que la classe appartient aux établissements autorisés
    db_class = db.query(models.Classe).filter(models.Classe.id == class_id).first()
    if not db_class:
        raise HTTPException(status_code=404, detail="Classe non trouvée")

    if not scope.is_global:
        auth_ids = scope.get_authorized_school_ids(db)
        auth_codes = scope.get_authorized_school_codes(db)
        has_access = (db_class.ecole_id and db_class.ecole_id in auth_ids) or \
                     (db_class.ET_CODEETABLISSEMENT and db_class.ET_CODEETABLISSEMENT in auth_codes)
        if not has_access:
            raise HTTPException(status_code=403, detail="Vous n'avez pas accès à cette classe")

    success = crud.delete_class(db, class_id=class_id)
    if not success:
        raise HTTPException(status_code=404, detail="Classe non trouvée")
    return

@router.get("/{class_id}", response_model=schemas.ClassResponse)
def read_class(class_id: int, db: Session = Depends(get_db)):
    db_class = crud.get_class_by_id(db, class_id=class_id)
    if db_class is None:
        raise HTTPException(status_code=404, detail="Classe non trouvée")
    return db_class
    