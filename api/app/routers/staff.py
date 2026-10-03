from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional, Any
import csv
import io
import re
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


from ..database import get_db
from ..routers.auth import get_school_scope, SchoolScope

router = APIRouter(prefix="/staff", tags=["Staff & Teachers"])

@router.get("/", response_model=List[schemas.StaffResponse])
def read_staff(
    statut: Optional[str] = None,
    ecole_id: Optional[int] = None,
    code_etablissement: Optional[str] = None,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Liste le personnel filtré par l'établissement autorisé de l'utilisateur."""
    if scope.is_global:
        staff = crud.get_staff(db, ecole_id=ecole_id, code_etablissement=code_etablissement, statut=statut)
    else:
        auth_ids = scope.get_authorized_school_ids(db)
        auth_codes = scope.get_authorized_school_codes(db)
        if scope.code_etablissement and scope.code_etablissement not in auth_codes:
            auth_codes.append(scope.code_etablissement)
        if any(c in ("058131", "HIN-DLO-01") for c in auth_codes) or (scope.ville and scope.ville.lower() == "daloa"):
            auth_codes.extend(["058131", "HIN-DLO-01"])
        auth_codes = list(set(auth_codes))

        staff = crud.get_staff_by_schools(db, ecole_ids=auth_ids, code_etablissements=auth_codes, statut=statut)
    return staff

@router.get("/pending", response_model=List[schemas.StaffResponse])
def read_staff_pending(
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Retourne uniquement le personnel en attente de validation RH de l'établissement autorisé."""
    if scope.is_global:
        return crud.get_staff(db, statut="en_attente")
    else:
        auth_ids = scope.get_authorized_school_ids(db)
        auth_codes = scope.get_authorized_school_codes(db)
        if scope.code_etablissement and scope.code_etablissement not in auth_codes:
            auth_codes.append(scope.code_etablissement)
        if any(c in ("058131", "HIN-DLO-01") for c in auth_codes) or (scope.ville and scope.ville.lower() == "daloa"):
            auth_codes.extend(["058131", "HIN-DLO-01"])
        auth_codes = list(set(auth_codes))
        return crud.get_staff_by_schools(db, ecole_ids=auth_ids, code_etablissements=auth_codes, statut="en_attente")

@router.post("/import")
def import_staff_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
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
            'matricule': 'matricule',
            'nom': 'nom',
            'noms': 'nom',
            'prenom': 'prenom',
            'prenoms': 'prenom',
            'poste': 'poste',
            'fonction': 'poste',
            'role': 'role',
            'telephone': 'telephone',
            'contact': 'telephone',
            'phone': 'telephone',
            'email': 'email',
            'e mail': 'email',
            'mail': 'email',
            'date embauche': 'date_embauche',
            'date_embauche': 'date_embauche',
            'salaire base': 'salaire_base',
            'salaire_base': 'salaire_base',
            'salaire': 'salaire_base',
        }
        normalized_mapping = {_normalize_header(k): v for k, v in header_mapping.items()}

        missing_required = []
        for req in ['nom', 'prenom']:
            if not any(_normalize_header(h) in normalized_mapping and normalized_mapping[_normalize_header(h)] == req for h in raw_headers):
                missing_required.append(req)
        if missing_required:
            return {
                "success": False,
                "imported": 0,
                "updated": 0,
                "errors": [f"Colonnes requises manquantes : {', '.join(missing_required)}. Colonnes détectées : {', '.join(raw_headers[:12])}."]
            }

        first_school = db.query(models.Etablissement).first()
        if not first_school:
            first_school = models.Etablissement(
                NOM_ETABLISSEMENT="Établissement Principal",
                CODE_ETABLISSEMENT="ECOLE01"
            )
            db.add(first_school)
            db.commit()
            db.refresh(first_school)

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

                nom = clean_row.get('nom')
                prenom = clean_row.get('prenom')
                email = clean_row.get('email')
                telephone = clean_row.get('telephone') or ""
                
                if not nom or not prenom:
                    errors.append(f"Ligne {index}: Nom et prénom requis.")
                    continue
                if not email:
                    errors.append(f"Ligne {index}: Email requis.")
                    continue
                
                # Check role / fonction
                role = clean_row.get('role') or clean_row.get('poste') or 'enseignant'
                role = role.lower()
                if 'enseignant' in role:
                    fonction = 'enseignant'
                elif 'admin' in role or 'direction' in role or 'secretaire' in role:
                    fonction = 'admin'
                else:
                    fonction = 'enseignant'  # fallback default
                
                db_staff = db.query(models.Personnel).filter(models.Personnel.email == email).first()
                if db_staff:
                    db_staff.nom = nom
                    db_staff.prenom = prenom
                    db_staff.telephone = telephone
                    db_staff.fonction = fonction
                    db.commit()
                    updated_count += 1
                else:
                    # Check if user account already exists in user_educ
                    db_user = db.query(models.CustomUser).filter(
                        (models.CustomUser.email == email) | (models.CustomUser.username == email)
                    ).first()
                    
                    if not db_user:
                        # Check if username is already taken
                        p = re.sub(r'[^a-zA-Z0-9]', '', prenom.lower())
                        n = re.sub(r'[^a-zA-Z0-9]', '', nom.lower())
                        base_username = f"{p}.{n}"
                        if not base_username or base_username == ".":
                            base_username = "staff"
                        
                        username = base_username
                        suffix = 1
                        while db.query(models.CustomUser).filter(models.CustomUser.username == username).first():
                            username = f"{base_username}{suffix}"
                            suffix += 1
                        
                        # Create CustomUser
                        staff_in = schemas.StaffCreate(
                            nom=nom,
                            prenom=prenom,
                            email=email,
                            telephone=telephone,
                            fonction=fonction,
                            statut="actif",
                            charge_horaire=0,
                            ecole_id=first_school.IDETABLISSEMENT,
                            username=username,
                            password=f"{n}2026",
                            disponibilites=None
                        )
                        db_user = crud.create_custom_user(db=db, user_schema=staff_in)
                    
                    # Create the Personnel profile linked to the user
                    staff_in = schemas.StaffCreate(
                        nom=nom,
                        prenom=prenom,
                        email=email,
                        telephone=telephone,
                        fonction=fonction,
                        statut="actif",
                        charge_horaire=0,
                        ecole_id=first_school.IDETABLISSEMENT,
                        username=db_user.username,
                        password="",
                        disponibilites=None
                    )
                    crud.create_staff(db=db, staff=staff_in, user_id=db_user.id)
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


def _clean_staff_id(raw_id: Any) -> int:
    if isinstance(raw_id, int):
        return raw_id
    clean = str(raw_id).lstrip(':').strip()
    try:
        return int(clean)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Identifiant de personnel invalide : {raw_id}")


@router.get("/{staff_id}", response_model=schemas.StaffResponse)
def read_staff_member(
    staff_id: str,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    clean_id = _clean_staff_id(staff_id)
    db_staff = crud.get_staff_by_id(db, staff_id=clean_id)
    if db_staff is None:
        raise HTTPException(status_code=404, detail="Membre du personnel non trouvé")
    if not scope.is_global and scope.code_etablissement:
        if db_staff.ET_CODEETABLISSEMENT and db_staff.ET_CODEETABLISSEMENT != scope.code_etablissement:
            raise HTTPException(status_code=403, detail="Accès refusé à ce membre du personnel d'un autre établissement")
    return db_staff

@router.post("/", response_model=schemas.StaffResponse, status_code=status.HTTP_201_CREATED)
def create_new_staff(
    staff: schemas.StaffCreate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    # Check if username or email already exists
    if crud.get_user_by_username(db, staff.username):
        raise HTTPException(status_code=400, detail="Ce nom d'utilisateur est déjà pris")
    if crud.get_user_by_email(db, staff.email):
        raise HTTPException(status_code=400, detail="Cet email est déjà associé à un compte")
        
    if not scope.is_global:
        if scope.ecole_id and not getattr(staff, "ecole_id", None):
            staff.ecole_id = scope.ecole_id
        if scope.code_etablissement and not getattr(staff, "ET_CODEETABLISSEMENT", None):
            try:
                setattr(staff, "ET_CODEETABLISSEMENT", scope.code_etablissement)
            except Exception:
                pass

    # Create the CustomUser first
    db_user = crud.create_custom_user(db=db, user_schema=staff)
    
    # Create the Personnel profile linked to the CustomUser
    return crud.create_staff(db=db, staff=staff, user_id=db_user.id)

@router.put("/{staff_id}", response_model=schemas.StaffResponse)
def update_staff_info(
    staff_id: str,
    staff_data: dict,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    clean_id = _clean_staff_id(staff_id)
    db_staff = crud.get_staff_by_id(db, staff_id=clean_id)
    if db_staff is None:
        raise HTTPException(status_code=404, detail="Membre du personnel non trouvé")

    # Vérifier l'accès : utilisateur ne peut modifier que le personnel de ses établissements autorisés
    if not scope.is_global:
        auth_ids = scope.get_authorized_school_ids(db)
        auth_codes = scope.get_authorized_school_codes(db)
        has_access = (db_staff.ecole_id and db_staff.ecole_id in auth_ids) or \
                     (db_staff.ET_CODEETABLISSEMENT and db_staff.ET_CODEETABLISSEMENT in auth_codes)
        if not has_access:
            raise HTTPException(status_code=403, detail="Accès refusé à ce membre du personnel d'un autre établissement")

    return crud.update_staff(db=db, db_staff=db_staff, update_data=staff_data)

@router.patch("/{staff_id}/valider", response_model=schemas.StaffResponse)
def valider_dossier_personnel(
    staff_id: str,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """
    Valide une demande de personnel soumise via le formulaire.
    Passe le statut de 'en_attente' à 'actif'.
    """
    clean_id = _clean_staff_id(staff_id)
    db_staff = crud.get_staff_by_id(db, staff_id=clean_id)
    if db_staff is None:
        raise HTTPException(status_code=404, detail="Membre du personnel non trouvé")

    # Vérifier l'accès : utilisateur ne peut valider que le personnel de ses établissements autorisés
    if not scope.is_global:
        auth_ids = scope.get_authorized_school_ids(db)
        auth_codes = scope.get_authorized_school_codes(db)
        has_access = (db_staff.ecole_id and db_staff.ecole_id in auth_ids) or \
                     (db_staff.ET_CODEETABLISSEMENT and db_staff.ET_CODEETABLISSEMENT in auth_codes)
        if not has_access:
            raise HTTPException(status_code=403, detail="Accès refusé à ce membre du personnel d'un autre établissement")

    if db_staff.statut != "en_attente":
        raise HTTPException(
            status_code=400,
            detail=f"Ce dossier n'est pas en attente (statut actuel : {db_staff.statut})"
        )
    result = crud.valider_staff(db=db, staff_id=clean_id)
    return result

@router.patch("/{staff_id}/rejeter", status_code=status.HTTP_200_OK)
def rejeter_dossier_personnel(
    staff_id: str,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """
    Rejette et supprime une demande de personnel en attente.
    Supprime également le compte utilisateur associé.
    """
    clean_id = _clean_staff_id(staff_id)
    db_staff = crud.get_staff_by_id(db, staff_id=clean_id)
    if db_staff is None:
        raise HTTPException(status_code=404, detail="Membre du personnel non trouvé")

    # Vérifier l'accès : utilisateur ne peut rejeter que le personnel de ses établissements autorisés
    if not scope.is_global:
        auth_ids = scope.get_authorized_school_ids(db)
        auth_codes = scope.get_authorized_school_codes(db)
        has_access = (db_staff.ecole_id and db_staff.ecole_id in auth_ids) or \
                     (db_staff.ET_CODEETABLISSEMENT and db_staff.ET_CODEETABLISSEMENT in auth_codes)
        if not has_access:
            raise HTTPException(status_code=403, detail="Accès refusé à ce membre du personnel d'un autre établissement")

    crud.rejeter_staff(db=db, staff_id=clean_id)
    return {"message": "Dossier rejeté et supprimé avec succès."}

@router.delete("/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_staff_member(
    staff_id: str,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    clean_id = _clean_staff_id(staff_id)
    db_staff = crud.get_staff_by_id(db, staff_id=clean_id)
    if db_staff is None:
        raise HTTPException(status_code=404, detail="Membre du personnel non trouvé")

    if not scope.is_global:
        auth_ids = scope.get_authorized_school_ids(db)
        auth_codes = scope.get_authorized_school_codes(db)
        has_access = (db_staff.ecole_id and db_staff.ecole_id in auth_ids) or \
                     (db_staff.ET_CODEETABLISSEMENT and db_staff.ET_CODEETABLISSEMENT in auth_codes)
        if not has_access:
            raise HTTPException(status_code=403, detail="Accès refusé à ce membre du personnel d'un autre établissement")

    crud.delete_staff(db=db, staff_id=clean_id)
    return None


@router.get("/groupe-strategique/list", response_model=List[schemas.StaffResponse])
def get_groupe_strategique(
    ecole_id: Optional[int] = None,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Liste les membres du Groupe Stratégique (Cadres clés désignés, 30% de réduction, Max 7)."""
    query = db.query(models.Personnel).filter(models.Personnel.is_groupe_strategique == True)
    
    if not scope.is_global:
        auth_ids = scope.get_authorized_school_ids(db)
        auth_codes = scope.get_authorized_school_codes(db)
        conds = []
        if auth_ids:
            conds.append(models.Personnel.ecole_id.in_(auth_ids))
        if auth_codes:
            conds.append(models.Personnel.ET_CODEETABLISSEMENT.in_(auth_codes))
        if conds:
            query = query.filter(or_(*conds))

    if ecole_id:
        query = query.filter(models.Personnel.ecole_id == ecole_id)

    return query.order_by(models.Personnel.nom.asc(), models.Personnel.prenom.asc()).all()


@router.post("/{staff_id}/toggle-groupe-strategique")
def toggle_groupe_strategique(
    staff_id: str,
    payload: Optional[dict] = Body(None),
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """
    Active ou désactive le statut 'Groupe Stratégique' pour un membre du personnel.
    Règle stricte : Limité à 7 membres au maximum par établissement / ville de Daloa.
    Donne droit à 30% de réduction sur la scolarité de leurs enfants.
    """
    clean_id = _clean_staff_id(staff_id)
    staff = crud.get_staff_by_id(db, staff_id=clean_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Membre du personnel non trouvé")

    # Déterminer la valeur cible (toggle si non spécifié)
    target_value = not bool(staff.is_groupe_strategique)
    if payload and "is_groupe_strategique" in payload:
        target_value = bool(payload["is_groupe_strategique"])

    nomme_par = (payload.get("nomme_par") if payload else None) or "Directeur des Études de Daloa"

    if target_value:
        # Vérifier le quota max 7 dans l'établissement / Daloa
        count_query = db.query(func.count(models.Personnel.id)).filter(
            models.Personnel.is_groupe_strategique == True,
            models.Personnel.id != clean_id
        )
        if scope.ecole_id and not scope.is_global:
            count_query = count_query.filter(models.Personnel.ecole_id == scope.ecole_id)
        
        current_count = count_query.scalar() or 0
        if current_count >= 7:
            raise HTTPException(
                status_code=400,
                detail=f"Quota atteint : Le Groupe Stratégique est limité à 7 personnes au maximum (actuellement {current_count} membres désignés)."
            )

        staff.is_groupe_strategique = True
        staff.date_nomination_strategique = datetime.utcnow()
        staff.nomme_par = nomme_par
    else:
        staff.is_groupe_strategique = False
        staff.date_nomination_strategique = None
        staff.nomme_par = None

    db.commit()
    db.refresh(staff)

    # Récupérer le nombre total actuel
    target_ecole = staff.ecole_id or (scope.ecole_id if not scope.is_global else None)
    total_strategique = db.query(func.count(models.Personnel.id)).filter(
        models.Personnel.is_groupe_strategique == True
    )
    if target_ecole:
        total_strategique = total_strategique.filter(or_(models.Personnel.ecole_id == target_ecole, models.Personnel.ecole_id.is_(None)))
    total_membres = total_strategique.scalar() or 0

    return {
        "success": True,
        "is_groupe_strategique": staff.is_groupe_strategique,
        "nomme_par": staff.nomme_par,
        "date_nomination": staff.date_nomination_strategique.isoformat() if staff.date_nomination_strategique else None,
        "total_membres_groupe": total_membres,
        "quota_max": 7,
        "message": f"{staff.nom} {staff.prenom} {'ajouté au' if staff.is_groupe_strategique else 'retiré du'} Groupe Stratégique (30% de réduction scolarité)."
    }

