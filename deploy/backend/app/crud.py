from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func
from fastapi import HTTPException
from typing import List, Optional, Union, Dict, Any
from datetime import datetime, date
from decimal import Decimal
import hashlib
import base64
import secrets
import random
import json
import re
# from datetime import datetime

from . import models, schemas
from .timezone_utils import now_abidjan, today_abidjan
from .services import rdv_slots

# ----------------- PASSWORD SECURITY HELPERS -----------------
try:
    from passlib.context import CryptContext
    pwd_context = CryptContext(
        schemes=[
            "django_pbkdf2_sha256",
            "pbkdf2_sha256",
            "bcrypt",
            "sha256_crypt",
            "md5_crypt",
            "plaintext"
        ],
        deprecated="auto"
    )
except Exception:
    pwd_context = None

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password or not plain_password:
        return False
    # 1. Plain text comparison
    if plain_password == hashed_password:
        return True
    # 2. Multi-scheme CryptContext (handles Django pbkdf2, bcrypt, etc.)
    if pwd_context is not None:
        try:
            if pwd_context.verify(plain_password, hashed_password):
                return True
        except Exception:
            pass
    # 3. Direct Django pbkdf2_sha256 calculation fallback
    if hashed_password.startswith("pbkdf2_sha256$"):
        try:
            parts = hashed_password.split("$")
            if len(parts) == 4:
                iterations = int(parts[1])
                salt = parts[2]
                expected_b64 = parts[3]
                key = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt.encode('utf-8'), iterations)
                computed_b64 = base64.b64encode(key).decode('ascii')
                if secrets.compare_digest(computed_b64, expected_b64):
                    return True
        except Exception:
            pass
    # 4. MD5 / SHA1 / SHA256 hex digest fallback
    try:
        if hashlib.md5(plain_password.encode('utf-8')).hexdigest().lower() == hashed_password.lower():
            return True
        if hashlib.sha1(plain_password.encode('utf-8')).hexdigest().lower() == hashed_password.lower():
            return True
        if hashlib.sha256(plain_password.encode('utf-8')).hexdigest().lower() == hashed_password.lower():
            return True
    except Exception:
        pass
    return False

def get_password_hash(password: str) -> str:
    iterations = 260000
    salt = secrets.token_hex(12)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), iterations)
    b64_hash = base64.b64encode(key).decode('ascii')
    return f"pbkdf2_sha256${iterations}${salt}${b64_hash}"


# ----------------- AUTH CRUD -----------------
def get_user_by_username(db: Session, username: str) -> Optional[models.CustomUser]:
    if not username:
        return None
    u = username.strip().lower()
    return db.query(models.CustomUser).filter(
        or_(
            func.lower(models.CustomUser.username) == u,
            func.lower(models.CustomUser.email) == u
        )
    ).first()

def get_user_by_email(db: Session, email: str) -> Optional[models.CustomUser]:
    if not email:
        return None
    e = email.strip().lower()
    return db.query(models.CustomUser).filter(
        or_(
            func.lower(models.CustomUser.email) == e,
            func.lower(models.CustomUser.username) == e
        )
    ).first()

def create_custom_user(db: Session, user_schema: schemas.StaffCreate) -> models.CustomUser:
    hashed_pwd = get_password_hash(user_schema.password)
    from sqlalchemy import func, text
    max_id = db.query(func.max(models.CustomUser.id)).scalar()
    next_id = (max_id + 1) if max_id is not None else 1
    admin_fonctions = {'admin', 'superuser', 'direction'}
    is_superuser = bool(user_schema.fonction and user_schema.fonction.lower() in admin_fonctions)
    is_en_attente = getattr(user_schema, 'statut', None) == 'en_attente'
    is_active_initial = not is_en_attente

    db_user = models.CustomUser(
        id=next_id,
        username=user_schema.username,
        email=user_schema.email,
        password=hashed_pwd,
        first_name=user_schema.prenom,
        last_name=user_schema.nom,
        is_staff=True,
        is_active=is_active_initial,
        is_superuser=is_superuser,
        PROFIL=getattr(user_schema, 'fonction', None)
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Keep api_customuser in sync to satisfy any foreign keys (e.g. in api_personnel)
    try:
        db.execute(
            text(
                "INSERT INTO api_customuser (id, password, is_superuser, username, first_name, last_name, is_staff, is_active, date_joined, email) "
                "VALUES (:id, :password, :is_superuser, :username, :first_name, :last_name, :is_staff, :is_active, :date_joined, :email)"
            ),
            {
                "id": db_user.id,
                "password": db_user.password,
                "is_superuser": 1 if db_user.is_superuser else 0,
                "username": db_user.username,
                "first_name": db_user.first_name,
                "last_name": db_user.last_name,
                "is_staff": 1 if db_user.is_staff else 0,
                "is_active": 1 if db_user.is_active else 0,
                "date_joined": datetime.utcnow(),
                "email": db_user.email
            }
        )
        db.commit()
    except Exception as e:
        print(f"Sync to api_customuser failed: {e}")
        
    return db_user


# ----------------- SCHOOLS CRUD -----------------
def get_schools(db: Session, ecole_id: Optional[int] = None, ville: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[models.Etablissement]:
    query = db.query(models.Etablissement)
    if ecole_id is not None:
        query = query.filter(models.Etablissement.IDETABLISSEMENT == ecole_id)
    if ville:
        query = query.filter(func.lower(models.Etablissement.ET_VILLE) == ville.lower().strip())
    return query.order_by(models.Etablissement.ET_DENOMMINATION.asc()).offset(skip).limit(limit).all()

def get_school_by_id(db: Session, school_id: int) -> Optional[models.Etablissement]:
    return db.query(models.Etablissement).filter(models.Etablissement.IDETABLISSEMENT == school_id).first()

def update_school(db: Session, db_school: models.Etablissement, update_data: dict) -> models.Etablissement:
    for key, value in update_data.items():
        setattr(db_school, key, value)
    db.commit()
    db.refresh(db_school)
    return db_school

def delete_school(db: Session, school_id: int) -> bool:
    db_school = db.query(models.Etablissement).filter(models.Etablissement.IDETABLISSEMENT == school_id).first()
    if db_school:
        db.delete(db_school)
        db.commit()
        return True
    return False

def create_school(db: Session, school: schemas.SchoolCreate) -> models.Etablissement:
    db_school = models.Etablissement(
        ET_DENOMMINATION=school.name,
        ET_CODEETABLISSEMENT=school.code,
        ET_REGION=school.region,
        ET_VILLE=school.city,
        ET_ADRESSE_POSTALE=school.address,
        ET_CONTACTS=school.contacts,
        ET_EMAIL=school.email,
        ET_CYCLES=school.cycles,
        ET_STATUT=school.status,
        ET_DATECREATION=datetime.utcnow()
    )
    db.add(db_school)
    db.commit()
    db.refresh(db_school)
    return db_school


# ----------------- CLASSES CRUD -----------------
def get_cycles(db: Session, ecole_id: Optional[int] = None, code_etablissement: Optional[str] = None) -> List[models.Cycle]:
    query = db.query(models.Cycle).order_by(models.Cycle.ordre)
    if code_etablissement:
        query = query.filter(or_(models.Cycle.ET_CODEETABLISSEMENT == code_etablissement, models.Cycle.ET_CODEETABLISSEMENT.is_(None)))
    elif ecole_id is not None:
        ecole = db.query(models.Etablissement).filter(models.Etablissement.IDETABLISSEMENT == ecole_id).first()
        if ecole and ecole.ET_CODEETABLISSEMENT:
            query = query.filter(or_(models.Cycle.ET_CODEETABLISSEMENT == ecole.ET_CODEETABLISSEMENT, models.Cycle.ET_CODEETABLISSEMENT.is_(None)))
    return query.all()

def get_niveaux(db: Session, ecole_id: Optional[int] = None, code_etablissement: Optional[str] = None) -> List[models.Niveau]:
    query = db.query(models.Niveau).order_by(models.Niveau.ordre)
    if code_etablissement:
        query = query.filter(or_(models.Niveau.ET_CODEETABLISSEMENT == code_etablissement, models.Niveau.ET_CODEETABLISSEMENT.is_(None)))
    elif ecole_id is not None:
        ecole = db.query(models.Etablissement).filter(models.Etablissement.IDETABLISSEMENT == ecole_id).first()
        if ecole and ecole.ET_CODEETABLISSEMENT:
            query = query.filter(or_(models.Niveau.ET_CODEETABLISSEMENT == ecole.ET_CODEETABLISSEMENT, models.Niveau.ET_CODEETABLISSEMENT.is_(None)))
    return query.all()

def get_classes(
    db: Session, 
    ecole_id: Optional[int] = None, 
    code_etablissement: Optional[str] = None,
    ecole_ids: Optional[List[int]] = None,
    code_etablissements: Optional[List[str]] = None
) -> List[models.Classe]:
    query = db.query(models.Classe)
    filters = []
    if code_etablissement:
        filters.append(models.Classe.ET_CODEETABLISSEMENT == code_etablissement)
    if ecole_id is not None:
        filters.append(models.Classe.ecole_id == ecole_id)
    if not code_etablissement and not ecole_id:
        if code_etablissements:
            filters.append(models.Classe.ET_CODEETABLISSEMENT.in_(code_etablissements))
        if ecole_ids:
            filters.append(models.Classe.ecole_id.in_(ecole_ids))
    if filters:
        query = query.filter(or_(*filters))
    return query.order_by(models.Classe.CE_LIBELLE.asc()).all()

def get_class_by_id(db: Session, class_id: int) -> Optional[models.Classe]:
    return db.query(models.Classe).filter(models.Classe.id == class_id).first()

def create_class(db: Session, class_room: schemas.ClassCreate) -> models.Classe:
    code_etab = getattr(class_room, "ET_CODEETABLISSEMENT", None)
    ecole_id = class_room.ecole_id
    if not code_etab and ecole_id:
        ecole = db.query(models.Etablissement).filter(models.Etablissement.IDETABLISSEMENT == ecole_id).first()
        if ecole and ecole.ET_CODEETABLISSEMENT:
            code_etab = ecole.ET_CODEETABLISSEMENT
    elif not ecole_id and code_etab:
        ecole = db.query(models.Etablissement).filter(func.upper(models.Etablissement.ET_CODEETABLISSEMENT) == str(code_etab).strip().upper()).first()
        if ecole:
            ecole_id = ecole.IDETABLISSEMENT

    if not code_etab:
        first_sch = db.query(models.Etablissement).first()
        if first_sch:
            code_etab = first_sch.ET_CODEETABLISSEMENT
            if not ecole_id:
                ecole_id = first_sch.IDETABLISSEMENT

    db_class = models.Classe(
        CE_LIBELLE=class_room.CE_LIBELLE,
        capacite=class_room.capacite,
        cycle_id=class_room.cycle_id,
        ecole_id=ecole_id,
        enseignant_id=class_room.enseignant_id,
        niveau_id=class_room.niveau_id,
        CE_CODECLASSE=class_room.CE_CODECLASSE or class_room.CE_LIBELLE.upper().replace(" ", "_"),
        CE_ABREGE=class_room.CE_ABREGE,
        CE_LIBELLENIVEAU=class_room.CE_LIBELLENIVEAU,
        CY_LIBELLECYCLE=class_room.CY_LIBELLECYCLE,
        CE_ORDRE=class_room.CE_ORDRE,
        ET_CODEETABLISSEMENT=code_etab,
        date_creation=datetime.utcnow()
    )
    db.add(db_class)
    db.commit()
    db.refresh(db_class)
    return db_class

def update_class(db: Session, class_id: int, class_data: dict) -> Optional[models.Classe]:
    db_class = db.query(models.Classe).filter(models.Classe.id == class_id).first()
    if not db_class:
        return None
    for key, value in class_data.items():
        if hasattr(db_class, key) and value is not None:
            setattr(db_class, key, value)
    db.commit()
    db.refresh(db_class)
    return db_class

def delete_class(db: Session, class_id: int) -> bool:
    db_class = db.query(models.Classe).filter(models.Classe.id == class_id).first()
    if not db_class:
        return False
    db.delete(db_class)
    db.commit()
    return True

def update_level(db: Session, level_id: int, level_data: dict) -> Optional[models.Niveau]:
    db_level = db.query(models.Niveau).filter(models.Niveau.id == level_id).first()
    if not db_level:
        return None
    for key, value in level_data.items():
        if hasattr(db_level, key) and value is not None:
            setattr(db_level, key, value)
    db.commit()
    db.refresh(db_level)
    return db_level

def delete_level(db: Session, level_id: int) -> bool:
    db_level = db.query(models.Niveau).filter(models.Niveau.id == level_id).first()
    if not db_level:
        return False
    db.delete(db_level)
    db.commit()
    return True


# ----------------- STUDENTS CRUD -----------------
def get_students(
    db: Session, 
    ecole_id: Optional[int] = None, 
    code_etablissement: Optional[str] = None,
    classe_id: Optional[int] = None, 
    ecole_ids: Optional[List[int]] = None,
    code_etablissements: Optional[List[str]] = None,
    statut: Optional[str] = "actif",
    skip: int = 0, 
    limit: int = 2000
) -> List[models.Eleve]:
    query = db.query(models.Eleve)
    filters = []
    if statut and statut != "all":
        if statut == "actif":
            filters.append(or_(models.Eleve.statut == "actif", models.Eleve.statut.is_(None)))
        else:
            filters.append(models.Eleve.statut == statut)

    if ecole_id is not None:
        ecole = db.query(models.Etablissement).filter(models.Etablissement.IDETABLISSEMENT == ecole_id).first()
        if ecole and ecole.ET_CODEETABLISSEMENT:
            filters.append(or_(
                models.Eleve.ecole_id == ecole_id,
                models.Eleve.ET_CODEETABLISSEMENT == ecole.ET_CODEETABLISSEMENT
            ))
        else:
            filters.append(models.Eleve.ecole_id == ecole_id)

    if code_etablissement:
        filters.append(models.Eleve.ET_CODEETABLISSEMENT == code_etablissement)

    if not ecole_id and not code_etablissement:
        if ecole_ids or code_etablissements:
            multi_conds = []
            if ecole_ids:
                multi_conds.append(models.Eleve.ecole_id.in_(ecole_ids))
            if code_etablissements:
                multi_conds.append(models.Eleve.ET_CODEETABLISSEMENT.in_(code_etablissements))
            if multi_conds:
                filters.append(or_(*multi_conds))

    if classe_id is not None:
        filters.append(models.Eleve.classe_id == classe_id)

    if filters:
        query = query.filter(and_(*filters))

    # La boucle ci-dessous touche s.classe et s.ecole pour chaque élève : sans chargement
    # anticipé, SQLAlchemy émettait deux requêtes par élève (N+1), soit plus de 5 000 requêtes
    # pour une liste complète. joinedload ramène tout en une seule.
    results = (
        query.options(joinedload(models.Eleve.classe), joinedload(models.Eleve.ecole))
        .order_by(models.Eleve.nom.asc(), models.Eleve.prenom.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    for s in results:
        if s.classe:
            setattr(s, 'classe_name', s.classe.CE_LIBELLE)
        if not s.ET_CODEETABLISSEMENT and s.ecole:
            s.ET_CODEETABLISSEMENT = s.ecole.ET_CODEETABLISSEMENT
    return results

def get_student_by_id(db: Session, student_id: int) -> Optional[models.Eleve]:
    s = db.query(models.Eleve).filter(models.Eleve.id == student_id).first()
    if s and s.classe:
        setattr(s, 'classe_name', s.classe.CE_LIBELLE)
    if s and not s.ET_CODEETABLISSEMENT and s.ecole:
        s.ET_CODEETABLISSEMENT = s.ecole.ET_CODEETABLISSEMENT
    return s

def get_student_by_matricule(db: Session, matricule: str) -> Optional[models.Eleve]:
    s = db.query(models.Eleve).filter(models.Eleve.matricule == matricule).first()
    if s and s.classe:
        setattr(s, 'classe_name', s.classe.CE_LIBELLE)
    if s and not s.ET_CODEETABLISSEMENT and s.ecole:
        s.ET_CODEETABLISSEMENT = s.ecole.ET_CODEETABLISSEMENT
    return s

def create_student(db: Session, student: schemas.StudentCreate) -> models.Eleve:
    # Set default values if not specified
    # print(student.matricule)
    matricule = student.matricule
    if not matricule or matricule == "AUTO" or str(matricule).strip() == "":
        while True:
            current_year = "2026" #datetime.now().year
            candidate = f"HE{current_year}{random.randint(100000, 999999)}"
            exists = db.query(models.Eleve).filter(models.Eleve.matricule == candidate).first()
            if not exists:
                matricule = candidate
                break

    # Resolve ET_CODEETABLISSEMENT and ecole_id from school or class
    code_etab = student.ET_CODEETABLISSEMENT or student.code_etablissement or student.codeEtablissement
    ecole_id = student.ecole_id
    if not code_etab and ecole_id:
        ecole = db.query(models.Etablissement).filter(models.Etablissement.IDETABLISSEMENT == ecole_id).first()
        if ecole and ecole.ET_CODEETABLISSEMENT:
            code_etab = ecole.ET_CODEETABLISSEMENT
    elif not ecole_id and code_etab:
        ecole = db.query(models.Etablissement).filter(func.upper(models.Etablissement.ET_CODEETABLISSEMENT) == str(code_etab).strip().upper()).first()
        if ecole:
            ecole_id = ecole.IDETABLISSEMENT

    if not code_etab and student.classe_id:
        cls = db.query(models.Classe).filter(models.Classe.id == student.classe_id).first()
        if cls:
            if cls.ET_CODEETABLISSEMENT:
                code_etab = cls.ET_CODEETABLISSEMENT
            if cls.ecole_id and not ecole_id:
                ecole_id = cls.ecole_id

    db_student = models.Eleve(
        matricule=matricule,
        prenom=student.prenom,
        nom=student.nom,
        date_naissance=student.date_naissance,
        genre=student.genre,
        ecole_id=ecole_id,
        classe_id=student.classe_id,
        statut=student.statut,
        notes_sante=student.notes_sante,
        ET_CODEETABLISSEMENT=code_etab,
        AU_LIEU_NAISSANCE=student.AU_LIEU_NAISSANCE,
        AU_ADRESSE_POSTALE=student.AU_ADRESSE_POSTALE,
        AU_ADRESSE_GEO=student.AU_ADRESSE_GEO,
        AU_CONTACTS=student.AU_CONTACTS,
        AU_E_MAIL=student.AU_E_MAIL,
        REDOUBLANT=student.REDOUBLANT,
        ETAT_BOURSE=student.ETAT_BOURSE,
        AU_SCOLARITE=student.AU_SCOLARITE,
        AU_MONTANTARRIERE=student.AU_MONTANTARRIERE,
        AU_TOTALDEPOT=student.AU_TOTALDEPOT,
        AU_TOTALRETRAIT=student.AU_TOTALRETRAIT,
        AU_SOLDECOMPTE=student.AU_SOLDECOMPTE,
        AU_HANDICAP=student.AU_HANDICAP,
        AU_TYPEHANDICAP=student.AU_TYPEHANDICAP,
        AU_AUTRESHANDICAP=student.AU_AUTRESHANDICAP,
        AU_COMMUNE=student.AU_COMMUNE,
        AU_QUARTIER=student.AU_QUARTIER,
        AU_LOT=student.AU_LOT,
        AU_NUMEROEXTRAITNAISSANCE=student.AU_NUMEROEXTRAITNAISSANCE,
        AU_MERENOMPRENOMS=student.AU_MERENOMPRENOMS,
        AU_MERECONTACTS=student.AU_MERECONTACTS,
        AU_PERENOMPRENOMS=student.AU_PERENOMPRENOMS,
        AU_PERECONTACTS=student.AU_PERECONTACTS,
        AU_TUTEURLEGAL=student.AU_TUTEURLEGAL,
        AU_TUTEURLEGALCONTACTS=student.AU_TUTEURLEGALCONTACTS,
        AU_NATIONALITE=student.AU_NATIONALITE,
        AU_NUMEROPIECEIDENTITE=student.AU_NUMEROPIECEIDENTITE,
        AU_ETABLISSEMENTPRECEDENT=student.AU_ETABLISSEMENTPRECEDENT,
        AU_CLASSEPRECEDENTE=student.AU_CLASSEPRECEDENTE or getattr(student, 'level', None) or getattr(student, 'niveau', None) or getattr(student, 'className', None),
        AU_PERSONNEACONTACTERURGENCE=student.AU_PERSONNEACONTACTERURGENCE,
        AU_CONTACTURGENCES=student.AU_CONTACTURGENCES,
        AU_TOP_AFFECTE=student.AU_TOP_AFFECTE,
        AU_STATUTPENSION=student.AU_STATUTPENSION,
        MA_LV2=getattr(student, 'MA_LV2', None),
        AU_LANGUEVIVANTE2=getattr(student, 'AU_LANGUEVIVANTE2', None),
        is_fraterie=getattr(student, 'is_fraterie', False) or False,
        rang_fraterie=getattr(student, 'rang_fraterie', 1) or 1,
        parent_whatsapp=getattr(student, 'parent_whatsapp', None) or getattr(student, 'parent_tel', None) or student.AU_CONTACTS,
        parent_nom_complet=getattr(student, 'parent_nom_complet', None) or student.AU_PERENOMPRENOMS or student.AU_MERENOMPRENOMS or student.AU_TUTEURLEGAL,
        parent_personnel_id=getattr(student, 'parent_personnel_id', None),
        reduction_type_appliquee=getattr(student, 'reduction_type_appliquee', None),
        reduction_taux_applique=getattr(student, 'reduction_taux_applique', 0.0) or 0.0,
        date_creation=datetime.utcnow(),
        parent_password=student.parent_password or "hinneh2026"
    )
    db.add(db_student)
    db.commit()
    db.refresh(db_student)

    # Automatically generate official Hînneh Échéancier upon student registration
    try:
        auto_apply_echeancier_for_student(db, db_student)
    except Exception as e:
        print(f"Auto-echeancier warning: {e}")

    return db_student

def auto_apply_echeancier_for_student(db: Session, db_student: models.Eleve, annee_scolaire: str = "2026-2027"):
    """Applique l'échéancier UNIQUEMENT si une grille tarifaire réelle a été configurée pour cet établissement."""
    if not db_student.classe_id:
        return
        
    cls = db.query(models.Classe).filter(models.Classe.id == db_student.classe_id).first()
    if not cls:
        return

    # Vérifier si l'établissement a configuré une grille tarifaire en base de données
    query_grille = db.query(models.GrilleTarifaire).filter(
        models.GrilleTarifaire.is_active == True,
        models.GrilleTarifaire.annee_scolaire == annee_scolaire
    )
    if db_student.ecole_id:
        query_grille = query_grille.filter(models.GrilleTarifaire.ecole_id == db_student.ecole_id)
    elif db_student.ET_CODEETABLISSEMENT:
        query_grille = query_grille.filter(func.upper(models.GrilleTarifaire.ET_CODEETABLISSEMENT) == db_student.ET_CODEETABLISSEMENT.strip().upper())
    else:
        return

    db_presets = query_grille.all()
    if not db_presets:
        # Aucune grille configurée pour cette école -> Ne créer AUCUNE donnée mock
        return

    cls_code = f"{cls.CE_CODECLASSE or ''} {cls.CE_LIBELLENIVEAU or ''} {cls.CE_LIBELLE or ''}".upper().strip()
    cycle_name = str(getattr(cls, "CY_LIBELLECYCLE", "") or "").lower()
    is_mat_or_prim = any(k in cls_code.lower() for k in ["mat", "ps", "ms", "gs", "cp", "ce", "cm", "prim"]) or ("mat" in cycle_name or "prim" in cycle_name)
    statut_orient = (getattr(db_student, 'statut_orientation', '') or getattr(db_student, 'AU_STATUT', '') or '').lower()
    is_aff = 'affecté' in statut_orient or 'aff' in statut_orient or 'subvention' in statut_orient

    matched_preset = None
    for p in db_presets:
        p_statut = (p.statut_affectation or "TOUS").upper()
        if not is_mat_or_prim:
            if p_statut == "AFF" and not is_aff:
                continue
            if p_statut == "NAFF" and is_aff:
                continue

        niveaux_list = p.niveaux if isinstance(p.niveaux, list) else (json.loads(p.niveaux) if p.niveaux else [])
        if any(str(n).upper() in cls_code for n in niveaux_list):
            matched_preset = p
            break

    if not matched_preset:
        return

    tranches_list = matched_preset.tranches if isinstance(matched_preset.tranches, list) else (json.loads(matched_preset.tranches) if matched_preset.tranches else [])
    if not tranches_list:
        return

    db_student.AU_SCOLARITE = Decimal(str(matched_preset.total or sum(float(t.get("montant", 0)) for t in tranches_list)))

    existing = db.query(models.EcheancierPaiement).filter(
        models.EcheancierPaiement.eleve_id == db_student.id,
        models.EcheancierPaiement.annee_scolaire == annee_scolaire
    ).all()

    if any(e.montant_paye > 0 for e in existing):
        db.commit()
        return

    for e in existing:
        db.delete(e)
    db.commit()

    for idx, tr in enumerate(tranches_list, start=1):
        try:
            due_date = datetime.strptime(tr["date"], "%Y-%m-%d").date()
        except Exception:
            due_date = date.today()
        create_echeance(
            db,
            echeance=schemas.EcheancierCreate(
                eleve_id=db_student.id,
                ecole_id=db_student.ecole_id,
                ET_CODEETABLISSEMENT=db_student.ET_CODEETABLISSEMENT,
                libelle=tr["libelle"],
                tranche_numero=idx,
                montant_prevu=Decimal(str(tr["montant"])),
                montant_paye=Decimal("0.00"),
                date_echeance=due_date,
                statut="non_paye",
                annee_scolaire=annee_scolaire
            )
        )

def update_student(db: Session, db_student: models.Eleve, update_data: dict) -> models.Eleve:
    old_class_id = db_student.classe_id
    date_fields = {
        "date_naissance",
        "date_inscription",
        "AU_DATEETABLISSEMENTEXTRAIT",
        "AU_DATESORTIE",
        "AJOUTELE",
        "MODIFIELE",
    }
    for key, value in update_data.items():
        if hasattr(db_student, key):
            if key in date_fields:
                if isinstance(value, str):
                    val_str = value.strip()
                    if val_str:
                        try:
                            value = datetime.strptime(val_str.split("T")[0], "%Y-%m-%d").date()
                        except Exception:
                            continue
                    else:
                        value = None
                elif value is not None and not isinstance(value, date):
                    continue
            setattr(db_student, key, value)
            
    # Traitement spécifique des affectations transport
    if "service_transport" in update_data or "serviceTransport" in update_data:
        is_transport = bool(update_data.get("service_transport", update_data.get("serviceTransport", False)))
        setattr(db_student, "serviceTransport", is_transport)
        setattr(db_student, "service_transport", 1 if is_transport else 0)
        try:
            if is_transport:
                existing_aff = db.query(models.AffectationTransport).filter(models.AffectationTransport.eleveId == db_student.id).first()
                if not existing_aff:
                    car = db.query(models.Car).filter(models.Car.statut == "actif").first() or db.query(models.Car).first()
                    if not car:
                        car = models.Car(
                            immatriculation="CAR-01",
                            marque="Toyota",
                            modele="Coaster",
                            capacite=30,
                            chauffeurNom="Chauffeur Principal",
                            statut="actif"
                        )
                        db.add(car)
                        db.commit()
                        db.refresh(car)
                    arret_val = getattr(db_student, "AU_QUARTIER", None) or getattr(db_student, "AU_ADRESSE_GEO", None) or getattr(db_student, "AU_COMMUNE", None) or "Arrêt Principal"
                    aff = models.AffectationTransport(
                        eleveId=db_student.id,
                        vehiculeId=car.id,
                        arret=arret_val,
                        matin=True,
                        soir=True
                    )
                    db.add(aff)
            else:
                db.query(models.AffectationTransport).filter(models.AffectationTransport.eleveId == db_student.id).delete()
        except Exception as transport_err:
            print(f"Transport sync warning: {transport_err}")

    if "service_cantine" in update_data or "serviceCantine" in update_data:
        is_cantine = bool(update_data.get("service_cantine", update_data.get("serviceCantine", False)))
        setattr(db_student, "serviceCantine", is_cantine)
        setattr(db_student, "service_cantine", 1 if is_cantine else 0)

    db.commit()

    if db_student.classe_id and db_student.classe_id != old_class_id:
        try:
            auto_apply_echeancier_for_student(db, db_student)
        except Exception as e:
            print(f"Auto-echeancier update warning: {e}")

    db.refresh(db_student)
    return db_student

def archive_and_withdraw_student(
    db: Session,
    student_id: int,
    motif: Optional[str] = None,
    date_retrait: Optional[Union[str, date]] = None,
    etablissement_accueil: Optional[str] = None,
    observations: Optional[str] = None,
    operator: Optional[str] = None
) -> models.HistoriqueEleve:
    db_student = db.query(models.Eleve).filter(models.Eleve.id == student_id).first()
    if not db_student:
        raise HTTPException(status_code=404, detail="Élève non trouvé")

    try:
        nom_complet = f"{db_student.nom} {db_student.prenom}".strip()
        matricule = db_student.matricule or ""
        ecole_id = db_student.ecole_id
        
        # Résoudre le libellé de l'école et de la classe
        nom_ecole = ""
        if db_student.ecole:
            nom_ecole = db_student.ecole.ET_DENOMMINATION or db_student.ecole.name or ""
        elif db_student.ecole_id:
            ecole_obj = db.query(models.Etablissement).filter(models.Etablissement.IDETABLISSEMENT == db_student.ecole_id).first()
            if ecole_obj:
                nom_ecole = ecole_obj.ET_DENOMMINATION or ecole_obj.name or ""

        nom_classe = ""
        cycle_libelle = ""
        niveau_libelle = ""
        if db_student.classe:
            nom_classe = db_student.classe.CE_LIBELLE or db_student.classe.nom or ""
            if db_student.classe.cycle:
                cycle_libelle = db_student.classe.cycle.libelle or db_student.classe.cycle.code or ""
            if db_student.classe.niveau:
                niveau_libelle = db_student.classe.niveau.libelle or db_student.classe.niveau.code or ""
        elif db_student.classe_id:
            cls_obj = db.query(models.Classe).filter(models.Classe.id == db_student.classe_id).first()
            if cls_obj:
                nom_classe = cls_obj.CE_LIBELLE or cls_obj.nom or ""
                if cls_obj.cycle:
                    cycle_libelle = cls_obj.cycle.libelle or cls_obj.cycle.code or ""
                if cls_obj.niveau:
                    niveau_libelle = cls_obj.niveau.libelle or cls_obj.niveau.code or ""

        # Parse date_retrait
        parsed_date_retrait = date.today()
        if date_retrait:
            if isinstance(date_retrait, date):
                parsed_date_retrait = date_retrait
            elif isinstance(date_retrait, str):
                try:
                    parsed_date_retrait = datetime.strptime(date_retrait.split("T")[0].strip(), "%Y-%m-%d").date()
                except Exception:
                    parsed_date_retrait = date.today()

        # Snapshot JSON complet des données de l'élève
        tuteur_nom = db_student.parent_nom_complet or db_student.AU_PERENOMPRENOMS or db_student.AU_MERENOMPRENOMS or db_student.AU_TUTEURLEGAL
        tuteur_contact = db_student.parent_whatsapp or db_student.AU_CONTACTS or db_student.AU_PERECONTACTS or db_student.AU_MERECONTACTS
        snapshot = {
            "id": db_student.id,
            "matricule": db_student.matricule,
            "nom": db_student.nom,
            "prenom": db_student.prenom,
            "date_naissance": str(db_student.date_naissance) if db_student.date_naissance else None,
            "genre": db_student.genre,
            "ecole_id": db_student.ecole_id,
            "nom_ecole": nom_ecole,
            "classe_id": db_student.classe_id,
            "nom_classe": nom_classe,
            "cycle": cycle_libelle,
            "niveau": niveau_libelle,
            "ET_CODEETABLISSEMENT": db_student.ET_CODEETABLISSEMENT,
            "lieu_naissance": db_student.AU_LIEU_NAISSANCE,
            "contacts": db_student.AU_CONTACTS,
            "email": db_student.AU_E_MAIL,
            "scolarite": float(db_student.AU_SCOLARITE or 0),
            "solde": float(db_student.solde or 0),
            "tuteur_nom": tuteur_nom,
            "tuteur_contact": tuteur_contact,
            "date_inscription": str(db_student.date_inscription) if db_student.date_inscription else None
        }

        # 1. Enregistrement dans la table historique
        history_entry = models.HistoriqueEleve(
            eleve_id=db_student.id,
            matricule=matricule,
            nom=db_student.nom or "",
            prenom=db_student.prenom or "",
            nom_complet=nom_complet,
            genre=db_student.genre or "",
            date_naissance=db_student.date_naissance,
            lieu_naissance=db_student.AU_LIEU_NAISSANCE,
            ecole_id=db_student.ecole_id,
            nom_ecole=nom_ecole,
            classe_id=db_student.classe_id,
            nom_classe=nom_classe,
            cycle=cycle_libelle,
            niveau=niveau_libelle,
            ET_CODEETABLISSEMENT=db_student.ET_CODEETABLISSEMENT,
            motif_retrait=motif or "Retrait de l'établissement",
            date_retrait=parsed_date_retrait,
            etablissement_accueil=etablissement_accueil,
            observations=observations,
            tuteur_nom=tuteur_nom,
            tuteur_contact=tuteur_contact,
            solde=Decimal(str(snapshot.get("solde", 0.00))),
            donnees_eleve=snapshot,
            statut="retire",
            operateur=operator or "SYSTEM",
            date_creation=datetime.utcnow()
        )
        db.add(history_entry)

        # 2. Retrait de la scolarité active SANS suppression physique des tables liées (notes, paiements, présences sont conservés)
        db_student.statut = "retire"

        # 3. Journal d'audit
        try:
            audit = models.AuditLog(
                user_id=operator or "SYSTEM",
                action="RETRAIT_ELEVE_HISTORIQUE",
                target_type="ELEVE",
                target_id=str(student_id),
                target_name=f"{nom_complet} ({matricule})",
                details=f"Retrait de l'élève {nom_complet} (Matricule: {matricule}) et archivage dans la table historique. Motif: {motif or 'Retrait officiel'}",
                ecole_id=ecole_id,
                created_at=datetime.utcnow()
            )
            db.add(audit)
        except Exception as audit_err:
            print(f"Audit log warning: {audit_err}")

        db.commit()
        db.refresh(history_entry)
        return history_entry
    except Exception as e:
        db.rollback()
        print(f"Error during archive_and_withdraw_student({student_id}): {e}")
        raise e

def delete_student(db: Session, student_id: int, motif: Optional[str] = None, operator: Optional[str] = None) -> bool:
    try:
        archive_and_withdraw_student(db=db, student_id=student_id, motif=motif, operator=operator)
        return True
    except Exception as e:
        print(f"delete_student fallback error: {e}")
        return False

def get_historique_retraits(
    db: Session,
    ecole_id: Optional[int] = None,
    code_etablissement: Optional[str] = None,
    ecole_ids: Optional[List[int]] = None,
    code_etablissements: Optional[List[str]] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 500
) -> List[models.HistoriqueEleve]:
    query = db.query(models.HistoriqueEleve)
    filters = []

    if ecole_id is not None:
        filters.append(models.HistoriqueEleve.ecole_id == ecole_id)
    if code_etablissement:
        filters.append(models.HistoriqueEleve.ET_CODEETABLISSEMENT == code_etablissement)

    if not ecole_id and not code_etablissement:
        if ecole_ids or code_etablissements:
            multi_conds = []
            if ecole_ids:
                multi_conds.append(models.HistoriqueEleve.ecole_id.in_(ecole_ids))
            if code_etablissements:
                multi_conds.append(models.HistoriqueEleve.ET_CODEETABLISSEMENT.in_(code_etablissements))
            if multi_conds:
                filters.append(or_(*multi_conds))

    if search and search.strip():
        term = f"%{search.strip()}%"
        filters.append(or_(
            models.HistoriqueEleve.matricule.ilike(term),
            models.HistoriqueEleve.nom.ilike(term),
            models.HistoriqueEleve.prenom.ilike(term),
            models.HistoriqueEleve.nom_complet.ilike(term),
            models.HistoriqueEleve.nom_classe.ilike(term),
            models.HistoriqueEleve.motif_retrait.ilike(term)
        ))

    if filters:
        query = query.filter(and_(*filters))

    return query.order_by(models.HistoriqueEleve.date_creation.desc()).offset(skip).limit(limit).all()

def restaurer_eleve_retire(db: Session, historique_id: int, operator: Optional[str] = None) -> models.Eleve:
    entry = db.query(models.HistoriqueEleve).filter(models.HistoriqueEleve.id == historique_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entrée d'historique non trouvée")

    db_student = db.query(models.Eleve).filter(models.Eleve.id == entry.eleve_id).first()
    if not db_student:
        raise HTTPException(status_code=404, detail="L'élève associé est introuvable")

    try:
        db_student.statut = "actif"
        entry.statut = "restaure"

        try:
            audit = models.AuditLog(
                user_id=operator or "SYSTEM",
                action="RESTAURATION_ELEVE",
                target_type="ELEVE",
                target_id=str(db_student.id),
                target_name=f"{db_student.nom} {db_student.prenom} ({db_student.matricule})",
                details=f"Restauration de l'élève {db_student.nom} {db_student.prenom} depuis la table historique",
                ecole_id=db_student.ecole_id,
                created_at=datetime.utcnow()
            )
            db.add(audit)
        except Exception as audit_err:
            print(f"Audit log warning: {audit_err}")

        db.commit()
        db.refresh(db_student)
        return db_student
    except Exception as e:
        db.rollback()
        raise e


# ----------------- STAFF CRUD -----------------
def get_staff(db: Session, ecole_id: Optional[int] = None, code_etablissement: Optional[str] = None, statut: Optional[str] = None) -> List[models.Personnel]:
    query = db.query(models.Personnel)
    filters = []
    if code_etablissement:
        filters.append(models.Personnel.ET_CODEETABLISSEMENT == code_etablissement)
    if ecole_id is not None:
        filters.append(models.Personnel.ecole_id == ecole_id)
    if filters:
        query = query.filter(or_(*filters))
    if statut is not None:
        query = query.filter(models.Personnel.statut == statut)
    return query.order_by(models.Personnel.nom.asc(), models.Personnel.prenom.asc()).all()

def get_staff_by_schools(db: Session, ecole_ids: Optional[List[int]] = None, statut: Optional[str] = None) -> List[models.Personnel]:
    """Retourne le personnel de liste d'écoles (identifiants). Filtre sécurisé par établissement autorisé."""
    query = db.query(models.Personnel)
    if ecole_ids:
        query = query.filter(models.Personnel.ecole_id.in_(ecole_ids))
    if statut is not None:
        query = query.filter(models.Personnel.statut == statut)
    return query.order_by(models.Personnel.nom.asc(), models.Personnel.prenom.asc()).all()

def get_staff_by_id(db: Session, staff_id: int) -> Optional[models.Personnel]:
    return db.query(models.Personnel).filter(models.Personnel.id == staff_id).first()

def create_staff(db: Session, staff: schemas.StaffCreate, user_id: int) -> models.Personnel:
    code_etab = getattr(staff, "ET_CODEETABLISSEMENT", None)
    if not code_etab and staff.ecole_id:
        ecole = db.query(models.Etablissement).filter(models.Etablissement.IDETABLISSEMENT == staff.ecole_id).first()
        if ecole and ecole.ET_CODEETABLISSEMENT:
            code_etab = ecole.ET_CODEETABLISSEMENT

    db_staff = models.Personnel(
        prenom=staff.prenom,
        nom=staff.nom,
        email=staff.email,
        telephone=staff.telephone,
        fonction=staff.fonction,
        statut=staff.statut,
        charge_horaire=staff.charge_horaire,
        ecole_id=staff.ecole_id,
        user_id=user_id,
        disponibilites=staff.disponibilites,
        ecoles_autorisees=staff.ecoles_autorisees,
        ET_CODEETABLISSEMENT=code_etab,
        date_creation=datetime.utcnow()
    )
    db.add(db_staff)

    # Sync ecoles_autorisees with user_educ account
    if user_id:
        db_user = db.query(models.CustomUser).filter(models.CustomUser.id == user_id).first()
        if db_user:
            db_user.ecoles_autorisees = staff.ecoles_autorisees
            if code_etab and not db_user.ET_CODEETABLISSEMENT:
                db_user.ET_CODEETABLISSEMENT = code_etab

    db.commit()
    db.refresh(db_staff)
    return db_staff

def update_staff(db: Session, db_staff: models.Personnel, update_data: dict) -> models.Personnel:
    for key, value in update_data.items():
        if hasattr(db_staff, key):
            setattr(db_staff, key, value)
    if db_staff.user_id:
        db_user = db.query(models.CustomUser).filter(models.CustomUser.id == db_staff.user_id).first()
        if db_user:
            if "fonction" in update_data:
                db_user.PROFIL = update_data["fonction"]
            if "statut" in update_data:
                db_user.is_active = (update_data["statut"] == "actif")
            if "ecoles_autorisees" in update_data:
                db_user.ecoles_autorisees = update_data["ecoles_autorisees"]
            if "villes_autorisees" in update_data:
                db_user.villes_autorisees = update_data["villes_autorisees"]
            if "password" in update_data and update_data["password"]:
                from .auth import get_password_hash
                db_user.password = get_password_hash(update_data["password"])
    db.commit()
    db.refresh(db_staff)
    return db_staff




def delete_staff(db: Session, staff_id: int) -> bool:
    db_staff = db.query(models.Personnel).filter(models.Personnel.id == staff_id).first()
    if db_staff:
        # Also delete associated user account
        if db_staff.user_id:
            db_user = db.query(models.CustomUser).filter(models.CustomUser.id == db_staff.user_id).first()
            if db_user:
                db.delete(db_user)
        db.delete(db_staff)
        db.commit()
        return True
    return False

def valider_staff(db: Session, staff_id: int) -> Optional[models.Personnel]:
    """Valide une demande de personnel : passe le statut de 'en_attente' à 'actif' et active le compte utilisateur."""
    db_staff = db.query(models.Personnel).filter(models.Personnel.id == staff_id).first()
    if db_staff:
        db_staff.statut = 'actif'
        if db_staff.user_id:
            db_user = db.query(models.CustomUser).filter(models.CustomUser.id == db_staff.user_id).first()
            if db_user:
                db_user.is_active = True
                if db_staff.fonction:
                    db_user.PROFIL = db_staff.fonction
        db.commit()
        db.refresh(db_staff)
    return db_staff

def rejeter_staff(db: Session, staff_id: int) -> bool:
    """Rejette (supprime) une demande de personnel en attente."""
    db_staff = db.query(models.Personnel).filter(models.Personnel.id == staff_id).first()
    if db_staff:
        if db_staff.user_id:
            db_user = db.query(models.CustomUser).filter(models.CustomUser.id == db_staff.user_id).first()
            if db_user:
                db.delete(db_user)
        db.delete(db_staff)
        db.commit()
        return True
    return False


# ----------------- EVALUATIONS / GRADES CRUD -----------------
def get_evaluations(
    db: Session, 
    classe_id: Optional[int] = None, 
    eleve_id: Optional[int] = None,
    devoir_numero: Optional[str] = None,
    ecole_id: Optional[int] = None,
    code_etablissement: Optional[str] = None
) -> List[models.Evaluation]:
    query = db.query(models.Evaluation)
    filters = []
    if classe_id is not None:
        filters.append(models.Evaluation.classe_id == classe_id)
    if eleve_id is not None:
        filters.append(models.Evaluation.eleve_id == eleve_id)
    if devoir_numero is not None and devoir_numero != "":
        filters.append(models.Evaluation.devoir_numero == devoir_numero)
    if code_etablissement:
        filters.append(models.Evaluation.ET_CODEETABLISSEMENT == code_etablissement)
    elif ecole_id is not None:
        ecole = db.query(models.Etablissement).filter(models.Etablissement.IDETABLISSEMENT == ecole_id).first()
        if ecole and ecole.ET_CODEETABLISSEMENT:
            filters.append(models.Evaluation.ET_CODEETABLISSEMENT == ecole.ET_CODEETABLISSEMENT)
    if filters:
        query = query.filter(and_(*filters))
    return query.all()

def create_evaluation(db: Session, evaluation: schemas.EvaluationCreate) -> models.Evaluation:
    code_etab = getattr(evaluation, "ET_CODEETABLISSEMENT", None)
    if not code_etab and evaluation.eleve_id:
        student = db.query(models.Eleve).filter(models.Eleve.id == evaluation.eleve_id).first()
        if student and student.ET_CODEETABLISSEMENT:
            code_etab = student.ET_CODEETABLISSEMENT
    if not code_etab and evaluation.classe_id:
        cls = db.query(models.Classe).filter(models.Classe.id == evaluation.classe_id).first()
        if cls and cls.ET_CODEETABLISSEMENT:
            code_etab = cls.ET_CODEETABLISSEMENT

    db_eval = models.Evaluation(
        matiere=evaluation.matiere,
        type=evaluation.type,
        trimestre=evaluation.trimestre,
        note=evaluation.note,
        coefficient=evaluation.coefficient,
        date=evaluation.date,
        appreciation=evaluation.appreciation,
        classe_id=evaluation.classe_id,
        eleve_id=evaluation.eleve_id,
        devoir_numero=evaluation.devoir_numero,
        date_recuperation=evaluation.date_recuperation,
        date_correction=evaluation.date_correction,
        date_remise=evaluation.date_remise,
        valide=evaluation.valide,
        ET_CODEETABLISSEMENT=code_etab,
        date_creation=datetime.utcnow()
    )
    db.add(db_eval)
    db.commit()
    db.refresh(db_eval)
    return db_eval


# ----------------- ATTENDANCE / PRESENCE CRUD -----------------
def get_presences(
    db: Session, 
    classe_id: Optional[int] = None, 
    eleve_id: Optional[int] = None,
    date_val: Optional[date] = None,
    ecole_id: Optional[int] = None,
    code_etablissement: Optional[str] = None
) -> List[models.Presence]:
    query = db.query(models.Presence)
    filters = []
    if classe_id is not None:
        filters.append(models.Presence.classe_id == classe_id)
    if eleve_id is not None:
        filters.append(models.Presence.eleve_id == eleve_id)
    if date_val is not None:
        filters.append(models.Presence.date == date_val)
    if code_etablissement:
        filters.append(models.Presence.ET_CODEETABLISSEMENT == code_etablissement)
    elif ecole_id is not None:
        ecole = db.query(models.Etablissement).filter(models.Etablissement.IDETABLISSEMENT == ecole_id).first()
        if ecole and ecole.ET_CODEETABLISSEMENT:
            filters.append(models.Presence.ET_CODEETABLISSEMENT == ecole.ET_CODEETABLISSEMENT)
    if filters:
        query = query.filter(and_(*filters))
    
    results = query.all()
    for r in results:
        # lock after 1 hour (3600 seconds)
        r.locked = (datetime.utcnow() - r.date_creation).total_seconds() > 3600
    return results

def create_presence(
    db: Session,
    presence: schemas.PresenceCreate,
    code_etablissement: Optional[str] = None,
    ecole_id: Optional[int] = None
) -> models.Presence:
    code_etab = code_etablissement or getattr(presence, "ET_CODEETABLISSEMENT", None)
    if not code_etab and presence.eleve_id:
        student = db.query(models.Eleve).filter(models.Eleve.id == presence.eleve_id).first()
        if student and student.ET_CODEETABLISSEMENT:
            code_etab = student.ET_CODEETABLISSEMENT
    if not code_etab and presence.classe_id:
        cls = db.query(models.Classe).filter(models.Classe.id == presence.classe_id).first()
        if cls and cls.ET_CODEETABLISSEMENT:
            code_etab = cls.ET_CODEETABLISSEMENT

    # Check if a record already exists for this eleve, date and heure -> update it (upsert)
    existing_query = db.query(models.Presence).filter(
        models.Presence.eleve_id == presence.eleve_id,
        models.Presence.date == presence.date
    )
    if presence.heure:
        existing_query = existing_query.filter(models.Presence.heure == presence.heure)
    existing = existing_query.first()

    if existing:
        existing.statut = presence.statut
        if presence.justification:
            existing.justification = presence.justification
        existing.classe_id = presence.classe_id
        if presence.heure:
            existing.heure = presence.heure
        if code_etab:
            existing.ET_CODEETABLISSEMENT = code_etab
        if ecole_id:
            existing.ecole_id = ecole_id
        db.commit()
        db.refresh(existing)
        existing.locked = False
        return existing

    db_pres = models.Presence(
        date=presence.date,
        statut=presence.statut,
        justification=presence.justification,
        classe_id=presence.classe_id,
        eleve_id=presence.eleve_id,
        heure=presence.heure,
        ET_CODEETABLISSEMENT=code_etab,
        ecole_id=ecole_id,
        date_creation=datetime.utcnow()
    )
    db.add(db_pres)
    db.commit()
    db.refresh(db_pres)
    # attach locked check
    db_pres.locked = False
    return db_pres


# ----------------- FINANCE / PAYMENTS CRUD -----------------
def get_payments(
    db: Session,
    eleve_id: Optional[int] = None,
    ecole_id: Optional[int] = None,
    code_etablissement: Optional[str] = None,
    ecole_ids: Optional[List[int]] = None,
    code_etablissements: Optional[List[str]] = None,
    skip: int = 0,
    limit: Optional[int] = None
) -> List[models.Paiement]:
    query = db.query(models.Paiement)
    if eleve_id is not None:
        query = query.filter(models.Paiement.eleve_id == eleve_id)
    if code_etablissement:
        code_clean = code_etablissement.strip().lower()
        conds = [
            func.lower(models.Paiement.ET_CODEETABLISSEMENT) == code_clean,
            models.Paiement.eleve_id.in_(db.query(models.Eleve.id).filter(func.lower(models.Eleve.ET_CODEETABLISSEMENT) == code_clean))
        ]
        ecole = db.query(models.Etablissement).filter(func.lower(models.Etablissement.ET_CODEETABLISSEMENT) == code_clean).first()
        if ecole:
            conds.append(models.Paiement.ecole_id == ecole.IDETABLISSEMENT)
            conds.append(models.Paiement.eleve_id.in_(db.query(models.Eleve.id).filter(models.Eleve.ecole_id == ecole.IDETABLISSEMENT)))
        query = query.filter(or_(*conds))
    elif ecole_id is not None:
        ecole = db.query(models.Etablissement).filter(models.Etablissement.IDETABLISSEMENT == ecole_id).first()
        conds = [
            models.Paiement.ecole_id == ecole_id,
            models.Paiement.eleve_id.in_(db.query(models.Eleve.id).filter(models.Eleve.ecole_id == ecole_id))
        ]
        if ecole and ecole.ET_CODEETABLISSEMENT:
            c_code = ecole.ET_CODEETABLISSEMENT.strip().lower()
            conds.append(func.lower(models.Paiement.ET_CODEETABLISSEMENT) == c_code)
            conds.append(models.Paiement.eleve_id.in_(db.query(models.Eleve.id).filter(func.lower(models.Eleve.ET_CODEETABLISSEMENT) == c_code)))
        query = query.filter(or_(*conds))
    elif ecole_ids or code_etablissements:
        conditions = []
        if code_etablissements:
            clean_codes = [c.strip().lower() for c in code_etablissements if c]
            conditions.append(func.lower(models.Paiement.ET_CODEETABLISSEMENT).in_(clean_codes))
            conditions.append(models.Paiement.eleve_id.in_(
                db.query(models.Eleve.id).filter(func.lower(models.Eleve.ET_CODEETABLISSEMENT).in_(clean_codes))
            ))
        if ecole_ids:
            conditions.append(models.Paiement.ecole_id.in_(ecole_ids))
            conditions.append(models.Paiement.eleve_id.in_(
                db.query(models.Eleve.id).filter(models.Eleve.ecole_id.in_(ecole_ids))
            ))
        if conditions:
            query = query.filter(or_(*conditions))
    query = query.order_by(models.Paiement.id.desc())
    if skip > 0:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)
    return query.all()

def create_payment(db: Session, payment: schemas.PaymentCreate) -> models.Paiement:
    op_dt = now_abidjan()
    date_acq = payment.date_acquittement or (op_dt if payment.statut in ["paye", "payé"] else None)

    code_etab = getattr(payment, "ET_CODEETABLISSEMENT", None) or getattr(payment, "code_etablissement", None)
    if not code_etab and payment.eleve_id:
        student = db.query(models.Eleve).filter(models.Eleve.id == payment.eleve_id).first()
        if student and student.ET_CODEETABLISSEMENT:
            code_etab = student.ET_CODEETABLISSEMENT

    db_pay = models.Paiement(
        montant=payment.montant,
        type=payment.type,
        mode=payment.mode,
        statut=payment.statut,
        date=op_dt,
        date_echeance=payment.date_echeance,
        date_acquittement=date_acq,
        eleve_id=payment.eleve_id,
        frais_annexe_valide=payment.frais_annexe_valide,
        numero_transaction=payment.numero_transaction,
        ET_CODEETABLISSEMENT=code_etab,
        date_creation=op_dt
    )
    db.add(db_pay)
    db.flush()  # attribue l'id auto-incrémenté (garanti unique) sans encore valider la transaction
    # Numéro de reçu basé sur cet id : aucune collision possible, même en cas d'encaissements simultanés.
    db_pay.numero_recu = f"REC-{op_dt.strftime('%Y%m%d')}-{db_pay.id:06d}"

    # Update student balance (solde) and tranches if payment is confirmed (paye)
    if payment.statut in ["paye", "payé"]:
        student = db.query(models.Eleve).filter(models.Eleve.id == payment.eleve_id).first()
        if student:
            student.solde += payment.montant
            student.AU_TOTALDEPOT = (student.AU_TOTALDEPOT or Decimal("0.00")) + Decimal(str(payment.montant))
            if student.AU_SCOLARITE:
                student.AU_SOLDECOMPTE = student.AU_SCOLARITE - student.AU_TOTALDEPOT

            # Priority allocation to unpaid tuition echeances regardless of payment type
            target_echeances = db.query(models.EcheancierPaiement).filter(
                models.EcheancierPaiement.eleve_id == student.id,
                models.EcheancierPaiement.statut.in_(["non_paye", "partiel", "en_retard"])
            ).order_by(models.EcheancierPaiement.tranche_numero.asc()).all()

            remains_to_allocate = Decimal(str(payment.montant))
            for ech in target_echeances:
                if remains_to_allocate <= 0:
                    break
                due_amount = ech.montant_prevu - ech.montant_paye
                if due_amount <= 0:
                    continue

                part = min(remains_to_allocate, due_amount)
                ech.montant_paye += part
                remains_to_allocate -= part

                if ech.montant_paye >= ech.montant_prevu:
                    ech.statut = "paye"
                else:
                    ech.statut = "partiel"

    db.commit()
    db.refresh(db_pay)
    return db_pay

def update_payment(db: Session, payment_id: int, payment_update: schemas.PaymentUpdate) -> Optional[models.Paiement]:
    db_pay = db.query(models.Paiement).filter(models.Paiement.id == payment_id).first()
    if not db_pay:
        return None

    update_data = payment_update.model_dump(exclude_unset=True) if hasattr(payment_update, "model_dump") else payment_update.dict(exclude_unset=True)
    old_montant = float(db_pay.montant) if db_pay.montant else 0.0
    old_statut = db_pay.statut

    # Passage à l'état "annulé" par simple mise à jour du statut : rembourser d'abord les
    # tranches d'échéancier créditées, sinon elles resteraient payées sans paiement actif.
    # (Le remboursement ajuste déjà les soldes de l'élève, d'où le drapeau ci-dessous.)
    soldes_deja_ajustes = False
    if update_data.get("statut") == "annule" and old_statut != "annule":
        revert_payment_allocations(db, db_pay)
        soldes_deja_ajustes = True

    for key, value in update_data.items():
        if value is not None and hasattr(db_pay, key):
            setattr(db_pay, key, value)

    if db_pay.statut in ["paye", "payé"] and not db_pay.date_acquittement:
        db_pay.date_acquittement = datetime.utcnow()

    student = db.query(models.Eleve).filter(models.Eleve.id == db_pay.eleve_id).first()
    if student and not soldes_deja_ajustes:
        new_montant = float(db_pay.montant) if db_pay.montant else 0.0
        new_statut = db_pay.statut
        if old_statut in ["paye", "payé"]:
            student.solde -= Decimal(str(old_montant))
        if new_statut in ["paye", "payé"]:
            student.solde += Decimal(str(new_montant))

    db.commit()
    db.refresh(db_pay)
    return db_pay

# Correspondance type de paiement -> service d'échéancier crédité.
# 'examen' n'y figure pas : les frais d'examen ne sont adossés à aucune tranche.
PAYMENT_TYPE_TO_SERVICE = {
    "scolarite": "scolarite",
    "frais_annexe": "scolarite",
    "frais_inscription": "scolarite",
    "inscription": "scolarite",
    "reinscription": "scolarite",
    "cantine": "cantine",
    "transport": "transport",
    "uniforme": "uniforme",
}


def revert_payment_allocations(db: Session, db_pay: models.Paiement) -> None:
    """Rembourse intégralement un paiement : tranches d'échéancier créditées + soldes de
    l'élève. Point d'entrée unique utilisé par TOUS les chemins d'annulation, pour qu'aucun
    résidu ne subsiste (scolarité, frais annexes, cantine, transport, examen…).
    Ne valide pas la transaction : l'appelant fait le commit."""
    student = db.query(models.Eleve).filter(models.Eleve.id == db_pay.eleve_id).first()
    montant_dec = Decimal(str(db_pay.montant or 0))

    ptype = (db_pay.type or "").lower().strip()
    # 1. Soldes cumulés de la fiche élève (strictement pour la scolarité / inscription)
    if student and ptype in ("scolarite", "frais_inscription", "frais_annexe", "inscription", "reinscription"):
        total_scol_paye = db.query(func.coalesce(func.sum(models.Paiement.montant), Decimal("0.00"))).filter(
            models.Paiement.eleve_id == student.id,
            models.Paiement.id != db_pay.id,
            models.Paiement.type.in_(["scolarite", "frais_inscription", "frais_annexe", "inscription", "reinscription"]),
            models.Paiement.statut != "annule"
        ).scalar() or Decimal("0.00")
        student.AU_TOTALDEPOT = Decimal(str(total_scol_paye))
        student.AU_SOLDECOMPTE = max(Decimal("0.00"), (student.AU_SCOLARITE or Decimal("0.00")) - student.AU_TOTALDEPOT)
        if hasattr(student, "solde"):
            student.solde = student.AU_SOLDECOMPTE

    service = PAYMENT_TYPE_TO_SERVICE.get(ptype)
    if not student or service is None:
        # Frais d'examen (ou type non adossé) : aucune tranche à rembourser.
        return

    def _refresh_statut(tr: models.EcheancierPaiement) -> None:
        if tr.montant_paye <= 0:
            tr.montant_paye = Decimal("0.00")
            tr.statut = "non_paye"
        elif tr.montant_paye >= tr.montant_prevu:
            tr.statut = "paye"
        else:
            tr.statut = "partiel"

    # 2. Tranches créditées — trace exacte si disponible
    allocations = []
    if db_pay.echeances_affectees:
        try:
            allocations = json.loads(db_pay.echeances_affectees)
        except (TypeError, ValueError):
            allocations = []

    if allocations:
        for alloc in allocations:
            tr = db.query(models.EcheancierPaiement).filter(
                models.EcheancierPaiement.id == alloc.get("echeance_id")
            ).first()
            if not tr:
                continue
            tr.montant_paye -= min(Decimal(str(alloc.get("montant", 0))), tr.montant_paye)
            _refresh_statut(tr)
        return

    # 3. Repli (paiements anciens sans trace) : on décrédite les tranches les plus récentes
    #    du MÊME service, sans jamais toucher aux autres services.
    tranches = db.query(models.EcheancierPaiement).filter(
        models.EcheancierPaiement.eleve_id == student.id,
        models.EcheancierPaiement.service_type == service,
        models.EcheancierPaiement.montant_paye > 0,
    ).order_by(models.EcheancierPaiement.date_echeance.desc()).all()

    remains = montant_dec
    for tr in tranches:
        if remains <= 0:
            break
        deduct = min(remains, tr.montant_paye)
        tr.montant_paye -= deduct
        remains -= deduct
        _refresh_statut(tr)


def cancel_payment(db: Session, payment_id: int, motif_annulation: Optional[str] = None) -> Optional[models.Paiement]:
    db_pay = db.query(models.Paiement).filter(models.Paiement.id == payment_id).first()
    if not db_pay:
        return None

    if db_pay.statut == "annule":
        return db_pay

    revert_payment_allocations(db, db_pay)

    db_pay.statut = "annule"
    db.commit()
    db.refresh(db_pay)
    return db_pay


# ----------------- ECHEANCIER CRUD -----------------
def get_echeanciers(
    db: Session,
    eleve_id: Optional[int] = None,
    ecole_id: Optional[int] = None,
    code_etablissement: Optional[str] = None,
    ecole_ids: Optional[List[int]] = None,
    code_etablissements: Optional[List[str]] = None,
    classe_id: Optional[int] = None,
    annee_scolaire: Optional[str] = None,
    ville: Optional[str] = None
) -> List[models.EcheancierPaiement]:
    query = db.query(models.EcheancierPaiement)
    if eleve_id is not None:
        query = query.filter(models.EcheancierPaiement.eleve_id == eleve_id)
    if code_etablissement:
        code_clean = code_etablissement.strip().upper()
        query = query.filter(or_(
            func.upper(models.EcheancierPaiement.ET_CODEETABLISSEMENT) == code_clean,
            models.EcheancierPaiement.eleve_id.in_(db.query(models.Eleve.id).filter(func.upper(models.Eleve.ET_CODEETABLISSEMENT) == code_clean))
        ))
    elif ecole_id is not None:
        query = query.filter(or_(
            models.EcheancierPaiement.ecole_id == ecole_id,
            models.EcheancierPaiement.eleve_id.in_(db.query(models.Eleve.id).filter(models.Eleve.ecole_id == ecole_id))
        ))
    elif ecole_ids or code_etablissements:
        conds = []
        if code_etablissements:
            clean_codes = [c.strip().upper() for c in code_etablissements if c]
            conds.append(func.upper(models.EcheancierPaiement.ET_CODEETABLISSEMENT).in_(clean_codes))
        if ecole_ids:
            conds.append(models.EcheancierPaiement.ecole_id.in_(ecole_ids))
        if code_etablissements or ecole_ids:
            conds.append(models.EcheancierPaiement.eleve_id.in_(
                db.query(models.Eleve.id).filter(or_(
                    models.Eleve.ecole_id.in_(ecole_ids or []),
                    func.upper(models.Eleve.ET_CODEETABLISSEMENT).in_([c.strip().upper() for c in (code_etablissements or []) if c])
                ))
            ))
        if conds:
            query = query.filter(or_(*conds))
    if classe_id is not None:
        query = query.join(models.Eleve, models.EcheancierPaiement.eleve_id == models.Eleve.id).filter(models.Eleve.classe_id == classe_id)
    if ville:
        query = query.join(models.Etablissement, models.EcheancierPaiement.ecole_id == models.Etablissement.IDETABLISSEMENT).filter(func.lower(models.Etablissement.ET_VILLE) == ville.lower())
    if annee_scolaire:
        query = query.filter(or_(
            models.EcheancierPaiement.annee_scolaire == annee_scolaire,
            models.EcheancierPaiement.annee_scolaire.is_(None),
            models.EcheancierPaiement.annee_scolaire == "2026-2027",
            models.EcheancierPaiement.annee_scolaire == "2025-2026"
        ))

    items = query.order_by(models.EcheancierPaiement.tranche_numero.asc()).all()
    today = date.today()
    for item in items:
        if item.statut != "paye" and item.date_echeance < today:
            if item.statut != "en_retard":
                item.statut = "en_retard"
                db.commit()
    return items

def create_echeance(db: Session, echeance: schemas.EcheancierCreate) -> models.EcheancierPaiement:
    st = getattr(echeance, "service_type", None)
    if not st or st == "scolarite":
        lib_lower = (echeance.libelle or "").lower()
        if "cantine" in lib_lower or "cant" in lib_lower:
            st = "cantine"
        elif "transport" in lib_lower or "car" in lib_lower:
            st = "transport"
        elif any(kw in lib_lower for kw in ["examen", "bepc", "cepe", "bac"]):
            st = "examen"
        else:
            st = "scolarite"

    code_etab = getattr(echeance, "ET_CODEETABLISSEMENT", None) or getattr(echeance, "code_etablissement", None)
    ecole_id = getattr(echeance, "ecole_id", None)

    # Récupérer automatiquement depuis l'élève si non renseigné
    if echeance.eleve_id:
        student = db.query(models.Eleve).filter(models.Eleve.id == echeance.eleve_id).first()
        if student:
            if not code_etab and student.ET_CODEETABLISSEMENT:
                code_etab = student.ET_CODEETABLISSEMENT
            if not ecole_id and student.ecole_id:
                ecole_id = student.ecole_id

    # Synchronisation croisée école
    if not code_etab and ecole_id:
        ecole = db.query(models.Etablissement).filter(models.Etablissement.IDETABLISSEMENT == ecole_id).first()
        if ecole and ecole.ET_CODEETABLISSEMENT:
            code_etab = ecole.ET_CODEETABLISSEMENT
    elif not ecole_id and code_etab:
        ecole = db.query(models.Etablissement).filter(func.upper(models.Etablissement.ET_CODEETABLISSEMENT) == str(code_etab).strip().upper()).first()
        if ecole:
            ecole_id = ecole.IDETABLISSEMENT

    db_item = models.EcheancierPaiement(
        eleve_id=echeance.eleve_id,
        ecole_id=ecole_id,
        ET_CODEETABLISSEMENT=code_etab,
        libelle=echeance.libelle,
        service_type=st,
        tranche_numero=echeance.tranche_numero,
        montant_prevu=echeance.montant_prevu,
        montant_paye=echeance.montant_paye,
        date_echeance=echeance.date_echeance,
        statut=echeance.statut,
        remarque=echeance.remarque,
        annee_scolaire=echeance.annee_scolaire,
        date_creation=datetime.utcnow()
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def update_echeance(db: Session, echeance_id: int, update_data: dict) -> Optional[models.EcheancierPaiement]:
    db_item = db.query(models.EcheancierPaiement).filter(models.EcheancierPaiement.id == echeance_id).first()
    if not db_item:
        return None
    for key, value in update_data.items():
        if value is not None and hasattr(db_item, key):
            setattr(db_item, key, value)

    if db_item.montant_paye >= db_item.montant_prevu:
        db_item.statut = "paye"
    elif db_item.montant_paye > 0:
        db_item.statut = "partiel"
    elif db_item.date_echeance < date.today():
        db_item.statut = "en_retard"
    else:
        db_item.statut = "non_paye"

    db.commit()
    db.refresh(db_item)
    return db_item

def delete_echeance(db: Session, echeance_id: int) -> bool:
    db_item = db.query(models.EcheancierPaiement).filter(models.EcheancierPaiement.id == echeance_id).first()
    if db_item:
        db.delete(db_item)
        db.commit()
        return True
    return False


# ----------------- DEMANDE CRUD -----------------
def get_requests(db: Session, demandeur_id: Optional[int] = None) -> List[models.DemandeTraitement]:
    query = db.query(models.DemandeTraitement)
    if demandeur_id is not None:
        query = query.filter(models.DemandeTraitement.demandeur_id == demandeur_id)
    return query.all()

def create_request(db: Session, req: schemas.RequestCreate) -> models.DemandeTraitement:
    db_req = models.DemandeTraitement(
        type=req.type,
        sujet=req.sujet,
        description=req.description,
        priorite=req.priorite,
        statut=req.statut,
        demandeur_id=req.demandeur_id,
        eleve_concerne_id=req.eleve_concerne_id,
        date_creation=datetime.utcnow(),
        date_update=datetime.utcnow()
    )
    db.add(db_req)
    db.commit()
    db.refresh(db_req)
    return db_req

def update_request_status(db: Session, request_id: int, statut: str, motif_rejet: Optional[str] = None) -> Optional[models.DemandeTraitement]:
    db_req = db.query(models.DemandeTraitement).filter(models.DemandeTraitement.id == request_id).first()
    if db_req:
        db_req.statut = statut
        db_req.date_update = datetime.utcnow()
        if motif_rejet:
            db_req.motif_rejet = motif_rejet
        db.commit()
        db.refresh(db_req)
    return db_req


# ----------------- ANNÉES SCOLAIRES -----------------
class AnneeScolaireInvalide(Exception):
    """Libellé mal formé, doublon, ou dates incohérentes."""
    pass


def _valider_libelle_annee(libelle: str) -> str:
    """Impose la forme 'AAAA-AAAA' sur deux années consécutives.

    Le libellé est recopié tel quel dans la colonne `annee_scolaire` des
    grilles tarifaires, échéanciers et bulletins : une graphie divergente
    ('2026/2027', '2026-2028') casserait silencieusement ces rapprochements.
    """
    libelle = (libelle or "").strip()
    if not re.fullmatch(r"\d{4}-\d{4}", libelle):
        raise AnneeScolaireInvalide(
            "Le libellé doit être de la forme AAAA-AAAA, par exemple 2026-2027."
        )
    debut, fin = (int(p) for p in libelle.split("-"))
    if fin != debut + 1:
        raise AnneeScolaireInvalide(
            f"Une année scolaire couvre deux années consécutives : {debut}-{debut + 1} attendu."
        )
    return libelle


def get_annees_scolaires(db: Session) -> List[models.AnneeScolaire]:
    """De la plus récente à la plus ancienne, comme à l'écran."""
    return db.query(models.AnneeScolaire).order_by(models.AnneeScolaire.date_debut.desc()).all()


def get_annee_scolaire_active(db: Session) -> Optional[models.AnneeScolaire]:
    return db.query(models.AnneeScolaire).filter(models.AnneeScolaire.active.is_(True)).first()


def create_annee_scolaire(db: Session, annee: schemas.AnneeScolaireCreate) -> models.AnneeScolaire:
    libelle = _valider_libelle_annee(annee.libelle)

    if annee.date_debut >= annee.date_fin:
        raise AnneeScolaireInvalide("La date de début doit précéder la date de fin.")

    existante = db.query(models.AnneeScolaire).filter(
        func.lower(models.AnneeScolaire.libelle) == libelle.lower()
    ).first()
    if existante:
        raise AnneeScolaireInvalide(f"L'année scolaire {libelle} existe déjà.")

    # La toute première année créée devient active : sans cela, l'application
    # démarrerait sans aucune année de référence.
    premiere = db.query(models.AnneeScolaire).count() == 0

    db_annee = models.AnneeScolaire(
        libelle=libelle,
        date_debut=annee.date_debut,
        date_fin=annee.date_fin,
        active=premiere,
        date_creation=datetime.utcnow(),
    )
    db.add(db_annee)
    db.commit()
    db.refresh(db_annee)
    return db_annee


def activer_annee_scolaire(db: Session, annee_id: int) -> models.AnneeScolaire:
    """Rend une année active et désactive toutes les autres.

    L'unicité est garantie par la désactivation en masse dans la même
    transaction : deux années ne peuvent jamais être actives simultanément.
    """
    db_annee = db.query(models.AnneeScolaire).filter(models.AnneeScolaire.id == annee_id).first()
    if not db_annee:
        raise AnneeScolaireInvalide("Année scolaire introuvable.")

    db.query(models.AnneeScolaire).filter(
        models.AnneeScolaire.id != annee_id
    ).update({"active": False}, synchronize_session=False)
    db_annee.active = True
    db.commit()
    db.refresh(db_annee)
    return db_annee


# ----------------- MOT DE PASSE OUBLIÉ -----------------
class ReinitialisationRefusee(Exception):
    """Identité non vérifiée, ou dossier non validé par les ressources humaines."""
    pass


# Alphabet sans caractères ambigus (0/O, 1/l/I) : le mot de passe est lu à
# l'écran puis retapé à la main, les confusions coûtent des appels au support.
_ALPHABET_MDP = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
_SYMBOLES_MDP = "!@#$%*+-="


def generer_mot_de_passe(longueur: int = 10) -> str:
    """Mot de passe aléatoire de `longueur` caractères, avec au moins un chiffre,
    une majuscule, une minuscule et un symbole. Tiré avec `secrets`, jamais
    avec `random` : c'est un secret d'authentification.
    """
    longueur = max(longueur, 8)
    obligatoires = [
        secrets.choice("ABCDEFGHJKLMNPQRSTUVWXYZ"),
        secrets.choice("abcdefghijkmnopqrstuvwxyz"),
        secrets.choice("23456789"),
        secrets.choice(_SYMBOLES_MDP),
    ]
    reste = [secrets.choice(_ALPHABET_MDP) for _ in range(longueur - len(obligatoires))]
    caracteres = obligatoires + reste
    # Mélange non biaisé, pour que les caractères obligatoires ne soient pas
    # toujours en tête.
    for i in range(len(caracteres) - 1, 0, -1):
        j = secrets.randbelow(i + 1)
        caracteres[i], caracteres[j] = caracteres[j], caracteres[i]
    return "".join(caracteres)


def normaliser_telephone(valeur: Optional[str]) -> str:
    """Ne garde que les chiffres et compare sur les 8 derniers.

    Les numéros sont saisis de façons très variables ('+225 07 12 34 56 78',
    '0022507123456 78', '0712345678'). Les 8 derniers chiffres identifient le
    numéro national ivoirien indépendamment du préfixe international.
    """
    chiffres = "".join(c for c in str(valeur or "") if c.isdigit())
    return chiffres[-8:] if len(chiffres) >= 8 else chiffres


def reinitialiser_mot_de_passe(db: Session, identifiant: str, telephone: str):
    """Génère un nouveau mot de passe après vérification à deux facteurs.

    1. `identifiant` (e-mail, nom d'utilisateur ou téléphone) désigne un compte.
    2. `telephone` doit correspondre à celui de la fiche personnel de CE compte.
    3. La fiche doit être validée par les ressources humaines.

    Retourne (utilisateur, mot_de_passe_en_clair). Le mot de passe n'est stocké
    que sous forme de hachage ; il n'est lisible qu'une fois, dans la réponse.
    """
    identifiant = (identifiant or "").strip()
    if not identifiant or not (telephone or "").strip():
        raise ReinitialisationRefusee(
            "Veuillez renseigner votre identifiant et votre numéro de téléphone."
        )

    tel_saisi = normaliser_telephone(telephone)
    if not tel_saisi:
        raise ReinitialisationRefusee("Numéro de téléphone invalide.")

    # ── 1. Retrouver le compte à partir de l'identifiant ─────────────────────
    db_user = (
        db.query(models.CustomUser)
        .filter(
            or_(
                func.lower(models.CustomUser.username) == identifiant.lower(),
                func.lower(models.CustomUser.email) == identifiant.lower(),
            )
        )
        .first()
    )

    # L'identifiant peut aussi être le numéro de téléphone : on passe alors par
    # la fiche personnel pour remonter au compte.
    personnel = None
    if not db_user:
        id_tel = normaliser_telephone(identifiant)
        if id_tel:
            for p in db.query(models.Personnel).filter(models.Personnel.telephone.isnot(None)).all():
                if normaliser_telephone(p.telephone) == id_tel:
                    personnel = p
                    break
        if personnel is None:
            raise ReinitialisationRefusee(
                "Aucun compte ne correspond à cet identifiant et à ce numéro de téléphone."
            )
        db_user = (
            db.query(models.CustomUser).filter(models.CustomUser.id == personnel.user_id).first()
            if personnel.user_id else None
        )
        if not db_user:
            raise ReinitialisationRefusee(
                "Aucun compte utilisateur n'est rattaché à ce dossier. Contactez l'administrateur."
            )

    # ── 2. Retrouver la fiche personnel du compte ────────────────────────────
    if personnel is None:
        personnel = (
            db.query(models.Personnel)
            .filter(
                or_(
                    models.Personnel.user_id == db_user.id,
                    func.lower(models.Personnel.email) == func.lower(db_user.email),
                    func.lower(models.Personnel.email) == func.lower(db_user.username),
                )
            )
            .first()
        )

    if personnel is None:
        # Comptes techniques (superadmin créé en base) : pas de fiche RH, donc
        # ni téléphone à vérifier ni validation à contrôler. On refuse plutôt
        # que de réinitialiser sans second facteur.
        raise ReinitialisationRefusee(
            "Ce compte n'est rattaché à aucun dossier du personnel. "
            "Rapprochez-vous de l'administrateur système."
        )

    # ── 3. Vérifier le second facteur ────────────────────────────────────────
    if normaliser_telephone(personnel.telephone) != tel_saisi:
        # Message identique au cas « identifiant inconnu » : ne pas révéler
        # qu'un compte existe pour cet identifiant.
        raise ReinitialisationRefusee(
            "Aucun compte ne correspond à cet identifiant et à ce numéro de téléphone."
        )

    # ── 4. Vérifier la validation par les ressources humaines ────────────────
    # Mêmes règles que la connexion : un dossier en attente ou rejeté n'ouvre
    # aucun accès, la réinitialisation ne doit pas servir à les contourner.
    if personnel.statut == "en_attente" or not db_user.is_active:
        raise ReinitialisationRefusee(
            "Votre dossier est encore en attente de validation par les ressources humaines. "
            "Vos accès seront activés dès sa validation."
        )
    if personnel.statut in ("rejete", "refuse"):
        raise ReinitialisationRefusee(
            "Votre dossier a été rejeté par les ressources humaines. "
            "Rapprochez-vous du service RH."
        )

    # ── 5. Générer et enregistrer ────────────────────────────────────────────
    nouveau = generer_mot_de_passe()
    db_user.password = get_password_hash(nouveau)
    db_user.must_change_password = True
    db.commit()
    db.refresh(db_user)
    return db_user, nouveau


def changer_mot_de_passe(db: Session, username: str, ancien: str, nouveau: str) -> models.CustomUser:
    """Change le mot de passe et lève l'obligation posée par une réinitialisation."""
    nouveau = (nouveau or "").strip()
    if len(nouveau) < 6:
        raise ReinitialisationRefusee("Le nouveau mot de passe doit faire au moins 6 caractères.")

    db_user = (
        db.query(models.CustomUser)
        .filter(
            or_(
                func.lower(models.CustomUser.username) == (username or "").strip().lower(),
                func.lower(models.CustomUser.email) == (username or "").strip().lower(),
            )
        )
        .first()
    )
    if not db_user or not verify_password(ancien, db_user.password):
        raise ReinitialisationRefusee("Identifiant ou mot de passe actuel incorrect.")

    db_user.password = get_password_hash(nouveau)
    db_user.must_change_password = False
    db.commit()
    db.refresh(db_user)
    return db_user


# ----------------- RENDEZ-VOUS CRUD -----------------
def get_rendezvous(db: Session, rdv_id: int) -> Optional[models.RendezVous]:
    return db.query(models.RendezVous).filter(models.RendezVous.id == rdv_id).first()

def get_rendezvous_list(
    db: Session,
    statut: Optional[str] = None,
    ecole_id: Optional[int] = None,
    ordre: str = "asc",
    limit: Optional[int] = None,
) -> List[models.RendezVous]:
    """Liste des rendez-vous.

    L'ordre par défaut est chronologique croissant : c'est la file d'attente,
    traitée en FIFO. L'historique demande `ordre="desc"` pour présenter les
    demandes les plus récentes en premier.
    """
    query = db.query(models.RendezVous)
    if statut is not None:
        query = query.filter(models.RendezVous.statut == statut)
    if ecole_id is not None:
        query = query.filter(models.RendezVous.ecole_id == ecole_id)

    colonne = models.RendezVous.date_creation
    query = query.order_by(colonne.desc() if ordre == "desc" else colonne.asc())
    if limit is not None and limit > 0:
        query = query.limit(limit)
    return query.all()

def get_rendezvous_disponibilites(
    db: Session,
    jour: date,
    ecole_id: Optional[int] = None,
    verrouiller: bool = False,
) -> dict:
    """Décompte des places restantes pour une école et une journée données.

    Le quota journalier (100 par défaut) est réparti sur les créneaux de la
    plage horaire ; les places restantes d'un créneau ne peuvent jamais
    dépasser celles encore disponibles sur la journée. Seuls les rendez-vous
    'en_attente' et 'traite' consomment une place, un RDV annulé la libère.

    `verrouiller` pose un verrou d'écriture sur les rendez-vous de la journée
    (SELECT ... FOR UPDATE sur MySQL) afin que deux demandes simultanées ne
    puissent pas réserver la même dernière place.
    """
    creneaux = rdv_slots.generer_creneaux()
    quota_jour = rdv_slots.capacite_jour(jour)
    quota_creneau = rdv_slots.capacite_creneau(jour)

    query = db.query(models.RendezVous.heure_souhaitee).filter(
        models.RendezVous.date_souhaitee == jour,
        models.RendezVous.statut.in_(rdv_slots.STATUTS_OCCUPANTS),
    )
    if ecole_id is not None:
        query = query.filter(models.RendezVous.ecole_id == ecole_id)
    if verrouiller:
        query = query.with_for_update()

    occupees_par_creneau: dict = {}
    total_occupees = 0
    for (heure_brute,) in query.all():
        total_occupees += 1
        heure = rdv_slots.normaliser_heure(heure_brute)
        if heure:
            occupees_par_creneau[heure] = occupees_par_creneau.get(heure, 0) + 1

    restantes_jour = max(quota_jour - total_occupees, 0)

    detail_creneaux = []
    for heure in creneaux:
        occupees = occupees_par_creneau.get(heure, 0)
        restantes = min(max(quota_creneau - occupees, 0), restantes_jour)
        detail_creneaux.append({
            "heure": heure,
            "capacite": quota_creneau,
            "occupees": occupees,
            "restantes": restantes,
            "complet": restantes <= 0,
        })

    return {
        "date": jour,
        "libelle_date": rdv_slots.formater_journee(jour),  # ex. 'samedi 5 septembre'
        "ecole_id": ecole_id,
        "capacite_jour": quota_jour,
        "capacite_creneau": quota_creneau,
        "places_occupees": total_occupees,
        "places_restantes": restantes_jour,
        "complet": restantes_jour <= 0,
        "creneaux": detail_creneaux,
    }

def trouver_eleve_par_matricule(db: Session, matricule: Optional[str]) -> Optional[models.Eleve]:
    """Retrouve un élève déjà scolarisé dans le réseau à partir de son matricule.

    Accepte indifféremment le matricule national (AU_MATRICULENATIONAL) et le
    matricule interne de l'établissement : les parents fournissent l'un ou
    l'autre. La comparaison ignore la casse et les espaces.

    La recherche porte sur tout le réseau, sans filtre d'école : une
    réinscription peut concerner un élève venant d'un autre établissement du
    réseau.
    """
    if not matricule:
        return None
    cle = str(matricule).strip().upper().replace(" ", "")
    if not cle:
        return None

    return db.query(models.Eleve).filter(
        or_(
            func.upper(func.replace(models.Eleve.AU_MATRICULENATIONAL, " ", "")) == cle,
            func.upper(func.replace(models.Eleve.matricule, " ", "")) == cle,
        )
    ).first()

def get_rendezvous_options(db: Session, ecole_id: Optional[int] = None) -> dict:
    """Options du formulaire public : journées ouvertes, créneaux, niveaux.

    Chaque journée porte son nombre de places restantes, ce qui permet à la
    liste déroulante d'afficher « 85 place(s) restante(s) ce jour-là » et de
    griser les journées complètes sans requête supplémentaire.
    """
    jours_ouverts = rdv_slots.generer_journees()

    # Un seul comptage groupé pour toute la période, plutôt qu'une requête par
    # journée : l'endpoint est public et peut être appelé en rafale.
    occupees_par_jour: dict = {}
    if jours_ouverts:
        query = db.query(
            models.RendezVous.date_souhaitee,
            func.count(models.RendezVous.id),
        ).filter(
            models.RendezVous.statut.in_(rdv_slots.STATUTS_OCCUPANTS),
            models.RendezVous.date_souhaitee.in_(jours_ouverts),
        )
        if ecole_id is not None:
            query = query.filter(models.RendezVous.ecole_id == ecole_id)
        occupees_par_jour = dict(query.group_by(models.RendezVous.date_souhaitee).all())

    journees = []
    for jour in jours_ouverts:
        quota_jour_j = rdv_slots.capacite_jour(jour)
        restantes = max(quota_jour_j - occupees_par_jour.get(jour, 0), 0)
        journees.append({
            "date": jour,
            "libelle": rdv_slots.formater_journee(jour),
            "places_restantes": restantes,
            "complet": restantes <= 0,
        })

    return {
        "journees": journees,
        "creneaux": rdv_slots.generer_creneaux(),
        "capacite_jour": rdv_slots.capacite_jour(),
        "capacite_creneau": rdv_slots.capacite_creneau(),
        "niveaux": {t: rdv_slots.niveaux_pour(t) for t in rdv_slots.TYPES_DEMARCHE},
        "niveaux_par_cycle": rdv_slots.niveaux_groupes(),
        "types_demarche": list(rdv_slots.TYPES_DEMARCHE),
    }

def create_rendezvous(db: Session, rdv: schemas.RendezVousCreate) -> models.RendezVous:
    now = datetime.utcnow()

    # ── Validation du type d'inscription et du niveau ────────────────────────
    if rdv.type_demarche not in rdv_slots.TYPES_DEMARCHE:
        raise rdv_slots.RendezVousIndisponibleError(
            "Type d'inscription invalide. Choisir 'inscription' ou 'reinscription'."
        )
    niveaux_admis = rdv_slots.niveaux_pour(rdv.type_demarche)
    if rdv.niveau not in niveaux_admis:
        raise rdv_slots.RendezVousIndisponibleError(
            f"Niveau invalide pour une {rdv.type_demarche}. "
            f"Choisir parmi : {', '.join(niveaux_admis)}."
        )

    # ── Validation de la journée d'ouverture ─────────────────────────────────
    if not rdv_slots.journee_ouverte(rdv.date_souhaitee):
        raise rdv_slots.RendezVousIndisponibleError(
            f"Le {rdv.date_souhaitee.strftime('%d/%m/%Y')} ne fait pas partie des "
            "journées d'accueil ouvertes. Veuillez choisir une date proposée."
        )

    # ── Validation du créneau demandé ────────────────────────────────────────
    heure = rdv_slots.normaliser_heure(rdv.heure_souhaitee)
    if heure is None or heure not in rdv_slots.generer_creneaux():
        raise rdv_slots.RendezVousIndisponibleError(
            f"Créneau invalide. Les rendez-vous sont ouverts {rdv_slots.libelle_plage()}."
        )

    # ── Décompte des places (verrou posé sur la journée) ─────────────────────
    dispo = get_rendezvous_disponibilites(
        db, jour=rdv.date_souhaitee, ecole_id=rdv.ecole_id, verrouiller=True
    )
    if dispo["places_restantes"] <= 0:
        raise rdv_slots.RendezVousIndisponibleError(
            f"Plus aucune place disponible le {rdv.date_souhaitee.strftime('%d/%m/%Y')} "
            f"(limite de {dispo['capacite_jour']} rendez-vous par jour). "
            "Veuillez choisir une autre date."
        )
    creneau = next((c for c in dispo["creneaux"] if c["heure"] == heure), None)
    if creneau is None or creneau["complet"]:
        raise rdv_slots.RendezVousIndisponibleError(
            f"Le créneau de {heure} est complet. Veuillez en choisir un autre."
        )

    # ── Aiguillage réinscription ─────────────────────────────────────────────
    # Si l'élève est déjà connu du réseau, le rendez-vous lui est rattaché tout
    # de suite : le dossier part directement en procédure d'inscription, sans
    # que la famille ait à ressaisir une fiche de renseignements. Sinon (nouvel
    # élève, ou matricule inconnu / non fourni), la fiche reste à compléter.
    eleve_existant = None
    if rdv.type_demarche == "reinscription":
        eleve_existant = trouver_eleve_par_matricule(db, rdv.matricule_national)

    db_rdv = models.RendezVous(
        nom=rdv.nom,
        telephone=rdv.telephone,
        email=rdv.email,
        nom_eleve=rdv.nom_eleve,
        matricule_national=rdv.matricule_national,
        classe_precedente=rdv.classe_precedente,
        type_demarche=rdv.type_demarche,
        niveau=rdv.niveau,
        eleve_id=eleve_existant.id if eleve_existant else None,
        ecole_id=rdv.ecole_id,
        date_souhaitee=rdv.date_souhaitee,
        heure_souhaitee=heure,
        motif=rdv.motif,
        statut="en_attente",
        date_creation=now,
        date_update=now,
    )
    db.add(db_rdv)
    db.flush()  # attribue l'id auto-incrémenté (garanti unique) sans encore valider la transaction
    # Numéro de ticket basé sur cet id : aucune collision possible, même en cas de demandes simultanées.
    db_rdv.numero_ticket = f"RDV-{now.strftime('%Y%m%d')}-{db_rdv.id:04d}"
    db.commit()
    db.refresh(db_rdv)
    return db_rdv

def update_rendezvous_statut(db: Session, rdv_id: int, statut: str, eleve_id: Optional[int] = None) -> Optional[models.RendezVous]:
    db_rdv = db.query(models.RendezVous).filter(models.RendezVous.id == rdv_id).first()
    if db_rdv:
        # Réactiver un rendez-vous annulé reprend une place : elle doit encore
        # être disponible sur la journée et sur le créneau concerné.
        reactivation = (
            db_rdv.statut not in rdv_slots.STATUTS_OCCUPANTS
            and statut in rdv_slots.STATUTS_OCCUPANTS
            and db_rdv.date_souhaitee is not None
        )
        if reactivation:
            dispo = get_rendezvous_disponibilites(
                db, jour=db_rdv.date_souhaitee, ecole_id=db_rdv.ecole_id, verrouiller=True
            )
            heure = rdv_slots.normaliser_heure(db_rdv.heure_souhaitee)
            creneau = next((c for c in dispo["creneaux"] if c["heure"] == heure), None)
            if dispo["places_restantes"] <= 0:
                raise rdv_slots.RendezVousIndisponibleError(
                    f"Impossible de réactiver ce rendez-vous : la journée du "
                    f"{db_rdv.date_souhaitee.strftime('%d/%m/%Y')} est complète "
                    f"({dispo['capacite_jour']} places)."
                )
            if creneau is not None and creneau["complet"]:
                raise rdv_slots.RendezVousIndisponibleError(
                    f"Impossible de réactiver ce rendez-vous : le créneau de {heure} est complet."
                )

        db_rdv.statut = statut
        db_rdv.date_update = datetime.utcnow()
        if eleve_id is not None:
            db_rdv.eleve_id = eleve_id
        db.commit()
        db.refresh(db_rdv)
    return db_rdv


# ----------------- REPORTS CRUD -----------------
def get_rapport_rentree(db: Session, ecole_id: int, annee_scolaire: str) -> Optional[models.RapportRentree]:
    return db.query(models.RapportRentree).filter(
        models.RapportRentree.ecole_id == ecole_id,
        models.RapportRentree.annee_scolaire == annee_scolaire
    ).first()

def save_rapport_rentree(db: Session, rapport_in: schemas.RapportRentreeCreate, ecole_id: int) -> models.RapportRentree:
    db_report = db.query(models.RapportRentree).filter(
        models.RapportRentree.ecole_id == ecole_id,
        models.RapportRentree.annee_scolaire == rapport_in.annee_scolaire
    ).first()

    data = rapport_in.model_dump() if hasattr(rapport_in, "model_dump") else rapport_in.dict()

    if db_report:
        for key, value in data.items():
            setattr(db_report, key, value)
        db_report.date_modification = datetime.utcnow()
    else:
        db_report = models.RapportRentree(
            ecole_id=ecole_id,
            **data
        )
        db.add(db_report)
    
    db.commit()
    db.refresh(db_report)
    return db_report

def get_rapport_trimestriel(db: Session, ecole_id: int, trimestre: int, annee_scolaire: str) -> Optional[models.RapportTrimestriel]:
    return db.query(models.RapportTrimestriel).filter(
        models.RapportTrimestriel.ecole_id == ecole_id,
        models.RapportTrimestriel.trimestre == trimestre,
        models.RapportTrimestriel.annee_scolaire == annee_scolaire
    ).first()

def save_rapport_trimestriel(db: Session, rapport_in: schemas.RapportTrimestrielCreate, ecole_id: int) -> models.RapportTrimestriel:
    db_report = db.query(models.RapportTrimestriel).filter(
        models.RapportTrimestriel.ecole_id == ecole_id,
        models.RapportTrimestriel.trimestre == rapport_in.trimestre,
        models.RapportTrimestriel.annee_scolaire == rapport_in.annee_scolaire
    ).first()

    data = rapport_in.model_dump() if hasattr(rapport_in, "model_dump") else rapport_in.dict()

    if db_report:
        for key, value in data.items():
            setattr(db_report, key, value)
        db_report.date_modification = datetime.utcnow()
    else:
        db_report = models.RapportTrimestriel(
            ecole_id=ecole_id,
            **data
        )
        db.add(db_report)
    
    db.commit()
    db.refresh(db_report)
    return db_report


# ----------------- SUBJECTS / MATIERES CRUD -----------------
def get_subjects(db: Session, skip: int = 0, limit: int = 100, ecole_id: Optional[int] = None, code_etablissement: Optional[str] = None) -> List[models.Matiere]:
    query = db.query(models.Matiere)
    if code_etablissement:
        query = query.filter(or_(models.Matiere.ET_CODEETABLISSEMENT == code_etablissement, models.Matiere.ET_CODEETABLISSEMENT.is_(None)))
    elif ecole_id is not None:
        ecole = db.query(models.Etablissement).filter(models.Etablissement.IDETABLISSEMENT == ecole_id).first()
        if ecole and ecole.ET_CODEETABLISSEMENT:
            query = query.filter(or_(models.Matiere.ET_CODEETABLISSEMENT == ecole.ET_CODEETABLISSEMENT, models.Matiere.ET_CODEETABLISSEMENT.is_(None)))
    return query.offset(skip).limit(limit).all()

def get_subject_by_code(db: Session, code: str) -> Optional[models.Matiere]:
    return db.query(models.Matiere).filter(models.Matiere.code == code).first()

def create_subject(db: Session, subject: schemas.SubjectCreate, code_etablissement: Optional[str] = None) -> models.Matiere:
    code_etab = getattr(subject, "ET_CODEETABLISSEMENT", None) or code_etablissement
    db_subj = models.Matiere(
        libelle=subject.libelle,
        code=subject.code,
        actif=subject.actif,
        parent_id=getattr(subject, 'parent_id', None),
        ET_CODEETABLISSEMENT=code_etab
    )
    db.add(db_subj)
    db.commit()
    db.refresh(db_subj)
    return db_subj

# ----------------- ATTRIBUTIONS CRUD -----------------
def get_attributions(db: Session, classe_id: Optional[int] = None, teacher_id: Optional[int] = None, ecole_id: Optional[int] = None, code_etablissement: Optional[str] = None) -> List[models.AttributionMatiere]:
    query = db.query(models.AttributionMatiere)
    if classe_id is not None:
        query = query.filter(models.AttributionMatiere.classe_id == classe_id)
    if teacher_id is not None:
        query = query.filter(models.AttributionMatiere.enseignant_id == teacher_id)
    if code_etablissement:
        query = query.filter(or_(models.AttributionMatiere.ET_CODEETABLISSEMENT == code_etablissement, models.AttributionMatiere.ET_CODEETABLISSEMENT.is_(None)))
    elif ecole_id is not None:
        ecole = db.query(models.Etablissement).filter(models.Etablissement.IDETABLISSEMENT == ecole_id).first()
        if ecole and ecole.ET_CODEETABLISSEMENT:
            query = query.filter(or_(models.AttributionMatiere.ET_CODEETABLISSEMENT == ecole.ET_CODEETABLISSEMENT, models.AttributionMatiere.ET_CODEETABLISSEMENT.is_(None)))
    return query.all()

def is_time_overlapping(slot1: str, slot2: str) -> bool:
    if not slot1 or not slot2:
        return False
    try:
        def parse_slot(s: str):
            if not s:
                return None
            s_clean = s.strip().lower().replace('h', ':')
            parts = s_clean.split('-')
            if len(parts) != 2:
                return None
            def to_mins(t_str):
                t_str = t_str.strip()
                if ':' in t_str:
                    sub = t_str.split(':')
                    h = int(sub[0]) if sub[0] else 0
                    m = int(sub[1]) if len(sub) > 1 and sub[1] else 0
                    return h * 60 + m
                else:
                    return int(t_str) * 60
            sm = to_mins(parts[0])
            em = to_mins(parts[1])
            return sm, em

        t1 = parse_slot(slot1)
        t2 = parse_slot(slot2)
        if not t1 or not t2:
            return slot1.strip().lower() == slot2.strip().lower()
        return t1[0] < t2[1] and t2[0] < t1[1]
    except Exception:
        return slot1.strip().lower() == slot2.strip().lower()

# Libellés de salle génériques/placeholder : ne désignent aucune pièce physique distincte,
# on ne peut donc pas s'en servir pour détecter un conflit d'occupation de salle.
GENERIC_SALLE_LABELS = {"", "salle de cours", "salle", "n/a", "non défini", "non defini"}

def _check_attribution_conflicts(
    db: Session,
    classe_id: Optional[int],
    enseignant_id: Optional[int],
    salle: Optional[str],
    jour: Optional[str],
    heure: Optional[str],
    exclude_id: Optional[int] = None,
) -> None:
    """Vérifie l'absence de conflit d'horaire avant de créer/modifier un créneau d'emploi
    du temps : un enseignant ne peut pas être sur deux cours en même temps, une classe ne
    peut pas suivre deux cours en même temps, et une salle ne peut pas accueillir deux
    classes en même temps. Lève une HTTPException 400 au premier conflit détecté."""
    if not jour or not heure:
        return
    jour_norm = jour.strip().lower()

    def _first_overlap(query):
        for ex in query.all():
            if is_time_overlapping(ex.heure, heure):
                return ex
        return None

    # 1. Conflit enseignant : déjà occupé sur un autre cours au même horaire
    if enseignant_id:
        q = db.query(models.AttributionMatiere).filter(
            models.AttributionMatiere.enseignant_id == enseignant_id,
            func.lower(models.AttributionMatiere.jour) == jour_norm,
        )
        if exclude_id:
            q = q.filter(models.AttributionMatiere.id != exclude_id)
        ex = _first_overlap(q)
        if ex:
            cls = db.query(models.Classe).filter(models.Classe.id == ex.classe_id).first()
            cls_name = getattr(cls, 'CE_LIBELLE', None) or getattr(cls, 'libelle', None) or f"ID {ex.classe_id}"
            raise HTTPException(
                status_code=400,
                detail=f"Cet enseignant est déjà occupé le {jour} de {ex.heure} avec la classe {cls_name}."
            )

    # 2. Conflit classe : la classe a déjà un autre cours prévu à cet horaire (deux
    # matières simultanées pour la même classe, ce qui est structurellement impossible)
    if classe_id:
        q = db.query(models.AttributionMatiere).filter(
            models.AttributionMatiere.classe_id == classe_id,
            func.lower(models.AttributionMatiere.jour) == jour_norm,
        )
        if exclude_id:
            q = q.filter(models.AttributionMatiere.id != exclude_id)
        ex = _first_overlap(q)
        if ex:
            subj = db.query(models.Matiere).filter(models.Matiere.id == ex.matiere_id).first()
            subj_name = getattr(subj, 'libelle', None) or 'un autre cours'
            raise HTTPException(
                status_code=400,
                detail=f"Cette classe suit déjà {subj_name} le {jour} de {ex.heure}. Une classe ne peut pas avoir deux cours en même temps."
            )

    # 3. Conflit salle : déjà occupée par une autre classe au même horaire (on ignore les
    # libellés génériques qui ne représentent pas une salle physique distincte)
    salle_norm = (salle or "").strip().lower()
    if salle_norm and salle_norm not in GENERIC_SALLE_LABELS:
        q = db.query(models.AttributionMatiere).filter(
            func.lower(models.AttributionMatiere.salle) == salle_norm,
            func.lower(models.AttributionMatiere.jour) == jour_norm,
        )
        if classe_id:
            q = q.filter(models.AttributionMatiere.classe_id != classe_id)
        if exclude_id:
            q = q.filter(models.AttributionMatiere.id != exclude_id)
        ex = _first_overlap(q)
        if ex:
            cls = db.query(models.Classe).filter(models.Classe.id == ex.classe_id).first()
            cls_name = getattr(cls, 'CE_LIBELLE', None) or getattr(cls, 'libelle', None) or f"ID {ex.classe_id}"
            raise HTTPException(
                status_code=400,
                detail=f"La salle « {salle} » est déjà occupée le {jour} de {ex.heure} par la classe {cls_name}."
            )

def create_attribution(db: Session, attr: schemas.AttributionCreate, code_etablissement: Optional[str] = None) -> models.AttributionMatiere:
    # Empêcher les doublons / conflits d'emploi du temps (enseignant, classe et salle)
    _check_attribution_conflicts(db, attr.classe_id, attr.enseignant_id, attr.salle, attr.jour, attr.heure)

    code_etab = getattr(attr, "ET_CODEETABLISSEMENT", None) or code_etablissement
    ecole_id = getattr(attr, "ecole_id", None)
    if attr.classe_id:
        cls = db.query(models.Classe).filter(models.Classe.id == attr.classe_id).first()
        if cls:
            if not code_etab and cls.ET_CODEETABLISSEMENT:
                code_etab = cls.ET_CODEETABLISSEMENT
            if not ecole_id and cls.ecole_id:
                ecole_id = cls.ecole_id

    db_attr = models.AttributionMatiere(
        classe_id=attr.classe_id,
        enseignant_id=attr.enseignant_id,
        matiere_id=attr.matiere_id,
        jour=attr.jour,
        heure=attr.heure,
        salle=attr.salle,
        statut=attr.statut,
        groupe=attr.groupe or "Classe entière",
        ecole_id=ecole_id,
        ET_CODEETABLISSEMENT=code_etab
    )
    db.add(db_attr)
    db.commit()
    db.refresh(db_attr)
    return db_attr

def delete_attribution(db: Session, attr_id: int) -> bool:
    db_attr = db.query(models.AttributionMatiere).filter(models.AttributionMatiere.id == attr_id).first()
    if db_attr:
        db.delete(db_attr)
        db.commit()
        return True
    return False

def update_attribution(db: Session, attr_id: int, attr_in: schemas.AttributionUpdate) -> Optional[models.AttributionMatiere]:
    db_attr = db.query(models.AttributionMatiere).filter(models.AttributionMatiere.id == attr_id).first()
    if not db_attr:
        return None

    target_classe_id = attr_in.classe_id if attr_in.classe_id is not None else db_attr.classe_id
    target_enseignant_id = attr_in.enseignant_id if attr_in.enseignant_id is not None else db_attr.enseignant_id
    target_salle = attr_in.salle if attr_in.salle is not None else db_attr.salle
    target_jour = attr_in.jour if attr_in.jour is not None else db_attr.jour
    target_heure = attr_in.heure if attr_in.heure is not None else db_attr.heure

    # Vérifier l'absence de conflit (enseignant, classe et salle) sur le créneau résultant
    _check_attribution_conflicts(db, target_classe_id, target_enseignant_id, target_salle, target_jour, target_heure, exclude_id=attr_id)

    if attr_in.classe_id is not None:
        db_attr.classe_id = attr_in.classe_id
    if attr_in.enseignant_id is not None:
        db_attr.enseignant_id = attr_in.enseignant_id
    if attr_in.matiere_id is not None:
        db_attr.matiere_id = attr_in.matiere_id
    if attr_in.jour is not None:
        db_attr.jour = attr_in.jour
    if attr_in.heure is not None:
        db_attr.heure = attr_in.heure
    if attr_in.salle is not None:
        db_attr.salle = attr_in.salle
    if attr_in.statut is not None:
        db_attr.statut = attr_in.statut
    if attr_in.groupe is not None:
        db_attr.groupe = attr_in.groupe

    db.commit()
    db.refresh(db_attr)
    return db_attr


# ----------------- SALLE CRUD -----------------

def get_salles(db: Session, ecole_id: Optional[int] = None, code_etablissement: Optional[str] = None) -> list:
    query = db.query(models.Salle)
    filters = []
    if code_etablissement:
        filters.append(models.Salle.ET_CODEETABLISSEMENT == code_etablissement)
    if ecole_id is not None:
        filters.append(models.Salle.ecole_id == ecole_id)
    if filters:
        query = query.filter(or_(*filters))
    return query.order_by(models.Salle.code).all()

def get_salle_by_id(db: Session, salle_id: int) -> Optional[models.Salle]:
    return db.query(models.Salle).filter(models.Salle.id == salle_id).first()

def create_salle(db: Session, salle: schemas.SalleCreate, code_etablissement: Optional[str] = None) -> models.Salle:
    code_etab = getattr(salle, "ET_CODEETABLISSEMENT", None) or code_etablissement
    if not code_etab and salle.ecole_id:
        ecole = db.query(models.Etablissement).filter(models.Etablissement.IDETABLISSEMENT == salle.ecole_id).first()
        if ecole and ecole.ET_CODEETABLISSEMENT:
            code_etab = ecole.ET_CODEETABLISSEMENT

    db_salle = models.Salle(
        code=salle.code,
        libelle=salle.libelle,
        type_salle=salle.type_salle,
        capacite=salle.capacite,
        etage=salle.etage,
        batiment=salle.batiment,
        description=salle.description,
        disponible=salle.disponible,
        ecole_id=salle.ecole_id,
        ET_CODEETABLISSEMENT=code_etab,
        date_creation=datetime.utcnow()
    )
    db.add(db_salle)
    db.commit()
    db.refresh(db_salle)
    return db_salle

def update_salle(db: Session, db_salle: models.Salle, update_data: dict) -> models.Salle:
    for key, value in update_data.items():
        setattr(db_salle, key, value)
    db.commit()
    db.refresh(db_salle)
    return db_salle

def delete_salle(db: Session, salle_id: int) -> bool:
    db_salle = db.query(models.Salle).filter(models.Salle.id == salle_id).first()
    if db_salle:
        db.delete(db_salle)
        db.commit()
        return True
    return False


# ----------------- COURRIER CRUD -----------------
def get_courriers(db: Session, code_etablissement: Optional[str] = None):
    query = db.query(models.Courrier)
    if code_etablissement:
        query = query.filter(or_(models.Courrier.ET_CODEETABLISSEMENT == code_etablissement, models.Courrier.ET_CODEETABLISSEMENT.is_(None)))
    return query.order_by(models.Courrier.id.desc()).all()

def create_courrier(db: Session, courrier: schemas.CourrierCreate, code_etablissement: Optional[str] = None):
    code_etab = getattr(courrier, "ET_CODEETABLISSEMENT", None) or code_etablissement
    db_courrier = models.Courrier(
        type=courrier.type,
        objet=courrier.objet,
        expediteur=courrier.expediteur,
        status=courrier.status,
        priorite=courrier.priorite,
        ref=courrier.ref,
        description=courrier.description,
        ET_CODEETABLISSEMENT=code_etab,
        date=datetime.utcnow(),
        date_creation=datetime.utcnow()
    )
    db.add(db_courrier)
    db.commit()
    db.refresh(db_courrier)
    return db_courrier


# ----------------- STOCK CRUD -----------------
def get_stocks(db: Session, code_etablissement: Optional[str] = None):
    query = db.query(models.Stock)
    if code_etablissement:
        query = query.filter(or_(models.Stock.ET_CODEETABLISSEMENT == code_etablissement, models.Stock.ET_CODEETABLISSEMENT.is_(None)))
    return query.order_by(models.Stock.article).all()

def create_stock(db: Session, stock: schemas.StockCreate, code_etablissement: Optional[str] = None):
    code_etab = getattr(stock, "ET_CODEETABLISSEMENT", None) or code_etablissement
    db_stock = models.Stock(
        article=stock.article,
        categorie=stock.categorie,
        quantite=stock.quantite,
        seuil=stock.seuil,
        unite=stock.unite,
        fournisseur=stock.fournisseur,
        prix=stock.prix,
        ET_CODEETABLISSEMENT=code_etab,
        date_creation=datetime.utcnow()
    )
    db.add(db_stock)
    db.commit()
    db.refresh(db_stock)
    return db_stock


# ----------------- TACHE CRUD -----------------
def get_taches(db: Session, code_etablissement: Optional[str] = None):
    query = db.query(models.Tache)
    if code_etablissement:
        query = query.filter(or_(models.Tache.ET_CODEETABLISSEMENT == code_etablissement, models.Tache.ET_CODEETABLISSEMENT.is_(None)))
    return query.order_by(models.Tache.echeance.asc()).all()

def create_tache(db: Session, tache: schemas.TacheCreate, code_etablissement: Optional[str] = None):
    code_etab = getattr(tache, "ET_CODEETABLISSEMENT", None) or code_etablissement
    db_tache = models.Tache(
        titre=tache.titre,
        priorite=tache.priorite,
        echeance=tache.echeance,
        status=tache.status,
        assignee=tache.assignee,
        ET_CODEETABLISSEMENT=code_etab,
        date_creation=datetime.utcnow()
    )
    db.add(db_tache)
    db.commit()
    db.refresh(db_tache)
    return db_tache

def update_tache_status(db: Session, tache_id: int, status: str):
    db_tache = db.query(models.Tache).filter(models.Tache.id == tache_id).first()
    if db_tache:
        db_tache.status = status
        db.commit()
        db.refresh(db_tache)
    return db_tache


# ----------------- ARCHIVE CRUD -----------------
def get_archives(db: Session, code_etablissement: Optional[str] = None):
    query = db.query(models.Archive)
    if code_etablissement:
        query = query.filter(or_(models.Archive.ET_CODEETABLISSEMENT == code_etablissement, models.Archive.ET_CODEETABLISSEMENT.is_(None)))
    return query.order_by(models.Archive.date_creation.desc()).all()

def create_archive(db: Session, archive: schemas.ArchiveCreate, code_etablissement: Optional[str] = None):
    code_etab = getattr(archive, "ET_CODEETABLISSEMENT", None) or code_etablissement
    db_archive = models.Archive(
        titre=archive.titre,
        categorie=archive.categorie,
        description=archive.description,
        fichier_url=archive.fichier_url,
        ET_CODEETABLISSEMENT=code_etab,
        date_creation=datetime.utcnow()
    )
    db.add(db_archive)
    db.commit()
    db.refresh(db_archive)
    return db_archive


# ----------------- SEANCES CRUD -----------------
def get_seances(
    db: Session,
    classe_id: Optional[int] = None,
    enseignant_id: Optional[int] = None,
    matiere_id: Optional[int] = None,
    ecole_id: Optional[int] = None,
    code_etablissement: Optional[str] = None
) -> List[models.Seance]:
    query = db.query(models.Seance)
    filters = []
    if classe_id is not None:
        filters.append(models.Seance.classe_id == classe_id)
    if enseignant_id is not None:
        filters.append(models.Seance.enseignant_id == enseignant_id)
    if matiere_id is not None:
        filters.append(models.Seance.matiere_id == matiere_id)
    if code_etablissement:
        filters.append(or_(models.Seance.ET_CODEETABLISSEMENT == code_etablissement, models.Seance.ET_CODEETABLISSEMENT.is_(None)))
    elif ecole_id is not None:
        ecole = db.query(models.Etablissement).filter(models.Etablissement.IDETABLISSEMENT == ecole_id).first()
        if ecole and ecole.ET_CODEETABLISSEMENT:
            filters.append(or_(models.Seance.ET_CODEETABLISSEMENT == ecole.ET_CODEETABLISSEMENT, models.Seance.ET_CODEETABLISSEMENT.is_(None)))
    if filters:
        query = query.filter(and_(*filters))
    return query.all()

def create_seance(db: Session, seance: schemas.SeanceCreate, code_etablissement: Optional[str] = None) -> models.Seance:
    code_etab = getattr(seance, "ET_CODEETABLISSEMENT", None) or code_etablissement
    if not code_etab and seance.classe_id:
        cls = db.query(models.Classe).filter(models.Classe.id == seance.classe_id).first()
        if cls and cls.ET_CODEETABLISSEMENT:
            code_etab = cls.ET_CODEETABLISSEMENT

    db_seance = models.Seance(
        titre=seance.titre,
        contenu=seance.contenu,
        date=seance.date,
        heure=seance.heure,
        classe_id=seance.classe_id,
        enseignant_id=seance.enseignant_id,
        matiere_id=seance.matiere_id,
        ET_CODEETABLISSEMENT=code_etab
    )
    db.add(db_seance)
    db.commit()
    db.refresh(db_seance)
    return db_seance


# ----------------- POINTAGE CRUD -----------------
def get_pointages(
    db: Session,
    personnel_id: Optional[int] = None,
    date_str: Optional[str] = None,
    code_etablissement: Optional[str] = None
) -> List[models.Pointage]:
    query = db.query(models.Pointage)
    if personnel_id is not None:
        query = query.filter(models.Pointage.personnel_id == personnel_id)
    if code_etablissement:
        query = query.filter(or_(models.Pointage.ET_CODEETABLISSEMENT == code_etablissement, models.Pointage.ET_CODEETABLISSEMENT.is_(None)))
    if date_str is not None:
        from datetime import datetime
        try:
            d = datetime.strptime(date_str, "%Y-%m-%d").date()
            query = query.filter(models.Pointage.date == d)
        except Exception:
            pass
    return query.all()

def create_or_update_pointage(db: Session, pointage: schemas.PointageCreate, code_etablissement: Optional[str] = None) -> models.Pointage:
    code_etab = getattr(pointage, "ET_CODEETABLISSEMENT", None) or code_etablissement
    if not code_etab and pointage.personnel_id:
        st = db.query(models.Personnel).filter(models.Personnel.id == pointage.personnel_id).first()
        if st and st.ET_CODEETABLISSEMENT:
            code_etab = st.ET_CODEETABLISSEMENT

    db_pointage = db.query(models.Pointage).filter(
        models.Pointage.personnel_id == pointage.personnel_id,
        models.Pointage.date == pointage.date
    ).first()
    
    if db_pointage:
        if pointage.heure_depart:
            db_pointage.heure_depart = pointage.heure_depart
        if pointage.heure_arrivee:
            db_pointage.heure_arrivee = pointage.heure_arrivee
        if pointage.statut:
            db_pointage.statut = pointage.statut
        if code_etab and not db_pointage.ET_CODEETABLISSEMENT:
            db_pointage.ET_CODEETABLISSEMENT = code_etab
        db.commit()
        db.refresh(db_pointage)
        return db_pointage
    else:
        db_pointage = models.Pointage(
            date=pointage.date,
            heure_arrivee=pointage.heure_arrivee,
            heure_depart=pointage.heure_depart,
            statut=pointage.statut,
            personnel_id=pointage.personnel_id,
            ET_CODEETABLISSEMENT=code_etab
        )
        db.add(db_pointage)
        db.commit()
        db.refresh(db_pointage)
        return db_pointage


# ----------------- TRANSPORT / CAR CRUD -----------------
def get_cars(db: Session, ecole_id: Optional[int] = None, code_etablissement: Optional[str] = None, ville: Optional[str] = None) -> List[models.Car]:
    query = db.query(models.Car)
    if code_etablissement:
        query = query.filter(or_(models.Car.ET_CODEETABLISSEMENT == code_etablissement, models.Car.ET_CODEETABLISSEMENT.is_(None)))
    elif ecole_id:
        ecole = db.query(models.Etablissement).filter(models.Etablissement.IDETABLISSEMENT == ecole_id).first()
        if ecole and ecole.ET_CODEETABLISSEMENT:
            query = query.filter(or_(models.Car.ET_CODEETABLISSEMENT == ecole.ET_CODEETABLISSEMENT, models.Car.ET_CODEETABLISSEMENT.is_(None)))
    if ville:
        ecoles_ville = db.query(models.Etablissement.ET_CODEETABLISSEMENT).filter(func.lower(models.Etablissement.ET_VILLE) == ville.lower().strip()).all()
        codes = [e[0] for e in ecoles_ville if e[0]]
        if codes:
            query = query.filter((models.Car.ET_CODEETABLISSEMENT.in_(codes)) | (models.Car.ET_CODEETABLISSEMENT.is_(None)))
    return query.all()

def get_car_by_id(db: Session, car_id: int) -> Optional[models.Car]:
    return db.query(models.Car).filter(models.Car.id == car_id).first()

def get_car_by_immatriculation(db: Session, immatriculation: str) -> Optional[models.Car]:
    return db.query(models.Car).filter(models.Car.immatriculation == immatriculation).first()

def create_car(db: Session, car: schemas.CarCreate, code_etablissement: Optional[str] = None) -> models.Car:
    data = car.dict()
    if not data.get("ET_CODEETABLISSEMENT") and code_etablissement:
        data["ET_CODEETABLISSEMENT"] = code_etablissement
    db_car = models.Car(**data)
    db.add(db_car)
    db.commit()
    db.refresh(db_car)
    return db_car

def update_car(db: Session, db_car: models.Car, update_data: dict) -> models.Car:
    for key, value in update_data.items():
        setattr(db_car, key, value)
    db.commit()
    db.refresh(db_car)
    return db_car

def delete_car(db: Session, car_id: int) -> bool:
    db_car = get_car_by_id(db, car_id)
    if db_car:
        db.delete(db_car)
        db.commit()
        return True
    return False

# ----------------- TRAJETS CRUD -----------------
def get_trajets_bus(db: Session, code_etablissement: Optional[str] = None) -> List[models.TrajetBus]:
    query = db.query(models.TrajetBus)
    if code_etablissement:
        query = query.filter(or_(models.TrajetBus.ET_CODEETABLISSEMENT == code_etablissement, models.TrajetBus.ET_CODEETABLISSEMENT.is_(None)))
    return query.all()

def get_trajet_bus_by_id(db: Session, trajet_id: int) -> Optional[models.TrajetBus]:
    return db.query(models.TrajetBus).filter(models.TrajetBus.id == trajet_id).first()

def create_trajet_bus(db: Session, trajet: schemas.TrajetBusCreate, code_etablissement: Optional[str] = None) -> models.TrajetBus:
    data = trajet.dict()
    if not data.get("ET_CODEETABLISSEMENT") and code_etablissement:
        data["ET_CODEETABLISSEMENT"] = code_etablissement
    db_trajet = models.TrajetBus(**data)
    db.add(db_trajet)
    db.commit()
    db.refresh(db_trajet)
    return db_trajet

def update_trajet_bus(db: Session, db_trajet: models.TrajetBus, update_data: dict) -> models.TrajetBus:
    for key, value in update_data.items():
        setattr(db_trajet, key, value)
    db.commit()
    db.refresh(db_trajet)
    return db_trajet

def delete_trajet_bus(db: Session, trajet_id: int) -> bool:
    db_trajet = get_trajet_bus_by_id(db, trajet_id)
    if db_trajet:
        db.delete(db_trajet)
        db.commit()
        return True
    return False

# ----------------- AFFECTATIONS CRUD -----------------
def get_affectations_transport(db: Session, code_etablissement: Optional[str] = None) -> List[models.AffectationTransport]:
    query = db.query(models.AffectationTransport)
    if code_etablissement:
        query = query.join(models.Eleve, models.AffectationTransport.eleveId == models.Eleve.id).filter(
            models.Eleve.ET_CODEETABLISSEMENT == code_etablissement
        )
    return query.all()

def create_affectation_transport(db: Session, affectation: schemas.AffectationTransportCreate, code_etablissement: Optional[str] = None) -> models.AffectationTransport:
    # Remove any existing affectation for this student to maintain 1-to-1/unique
    db.query(models.AffectationTransport).filter(models.AffectationTransport.eleveId == affectation.eleveId).delete()
    data = affectation.dict()
    if not data.get("ET_CODEETABLISSEMENT") and code_etablissement:
        data["ET_CODEETABLISSEMENT"] = code_etablissement
    db_affect = models.AffectationTransport(**data)
    db.add(db_affect)
    
    # Synchroniser l'état service_transport sur la fiche de l'élève
    db_student = db.query(models.Eleve).filter(models.Eleve.id == affectation.eleveId).first()
    if db_student:
        if hasattr(db_student, "serviceTransport"):
            db_student.serviceTransport = True
        if hasattr(db_student, "service_transport"):
            db_student.service_transport = 1
            
    db.commit()
    db.refresh(db_affect)
    return db_affect

def delete_affectation_transport(db: Session, eleve_id: int) -> bool:
    deleted = db.query(models.AffectationTransport).filter(models.AffectationTransport.eleveId == eleve_id).delete()
    db_student = db.query(models.Eleve).filter(models.Eleve.id == eleve_id).first()
    if db_student:
        if hasattr(db_student, "serviceTransport"):
            db_student.serviceTransport = False
        if hasattr(db_student, "service_transport"):
            db_student.service_transport = 0

        # Annuler / supprimer les échéances de transport futures non payées
        # et ajuster les échéances partielles pour conserver exactement ce qui a été payé sur le reçu
        echeances = db.query(models.EcheancierPaiement).filter(
            models.EcheancierPaiement.eleve_id == eleve_id
        ).all()
        for ech in echeances:
            ech_svc = (ech.service_type or "").lower()
            ech_lib = (ech.libelle or "").lower()
            if ech_svc in ("transport", "bus", "car") or any(k in ech_lib for k in ["transport", "car ", "car-", "bus", "zone ", "ligne "]):
                montant_paye = Decimal(str(ech.montant_paye or 0))
                if montant_paye <= Decimal("0.00"):
                    db.delete(ech)
                else:
                    ech.montant_prevu = montant_paye
                    ech.statut = "paye"

        db.flush()
        # Recalculer le solde de l'élève
        remaining = db.query(models.EcheancierPaiement).filter(models.EcheancierPaiement.eleve_id == eleve_id).all()
        total_p = sum((e.montant_prevu for e in remaining), Decimal("0.00"))
        total_v = sum((e.montant_paye for e in remaining), Decimal("0.00"))
        db_student.solde = total_p - total_v
        db_student.AU_SOLDECOMPTE = db_student.solde

    db.commit()
    return deleted > 0

# ----------------- POINTAGES CRUD -----------------
def get_pointages_bus(db: Session, code_etablissement: Optional[str] = None) -> List[models.PointageBus]:
    query = db.query(models.PointageBus)
    if code_etablissement:
        query = query.join(models.Eleve, models.PointageBus.eleveId == models.Eleve.id).filter(
            models.Eleve.ET_CODEETABLISSEMENT == code_etablissement
        )
    return query.all()

def create_pointage_bus(db: Session, pointage: schemas.PointageBusCreate, code_etablissement: Optional[str] = None) -> models.PointageBus:
    # Update if already pointed, else add new pointage
    db_pointage = db.query(models.PointageBus).filter(
        models.PointageBus.eleveId == pointage.eleveId,
        models.PointageBus.trajetId == pointage.trajetId
    ).first()
    if db_pointage:
        db_pointage.statut = pointage.statut
        db_pointage.heure = pointage.heure
    else:
        data = pointage.dict()
        if not data.get("ET_CODEETABLISSEMENT") and code_etablissement:
            data["ET_CODEETABLISSEMENT"] = code_etablissement
        db_pointage = models.PointageBus(**data)
        db.add(db_pointage)
    db.commit()
    db.refresh(db_pointage)
    return db_pointage


# ----------------- TARIFS SERVICE CRUD -----------------
def get_tarifs_services(
    db: Session,
    service_type: Optional[str] = None,
    code_etablissement: Optional[str] = None,
    auth_codes: Optional[List[str]] = None
) -> List[models.TarifService]:
    query = db.query(models.TarifService)
    if service_type:
        query = query.filter(models.TarifService.service_type == service_type)
    if code_etablissement:
        query = query.filter(func.upper(models.TarifService.ET_CODEETABLISSEMENT) == code_etablissement.strip().upper())
    elif auth_codes:
        query = query.filter(func.upper(models.TarifService.ET_CODEETABLISSEMENT).in_([c.strip().upper() for c in auth_codes]))
    return query.order_by(models.TarifService.id.asc()).all()


def create_tarif_service(db: Session, data: schemas.TarifServiceCreate, code_etablissement: Optional[str] = None) -> models.TarifService:
    d = data.dict()
    if not d.get("ET_CODEETABLISSEMENT") and code_etablissement:
        d["ET_CODEETABLISSEMENT"] = code_etablissement
    db_obj = models.TarifService(**d)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_tarif_service(db: Session, tarif_id: int, data: schemas.TarifServiceCreate) -> Optional[models.TarifService]:
    db_obj = db.query(models.TarifService).filter(models.TarifService.id == tarif_id).first()
    if not db_obj:
        return None
    for field, val in data.dict(exclude_unset=True).items():
        setattr(db_obj, field, val)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete_tarif_service(db: Session, tarif_id: int) -> bool:
    deleted = db.query(models.TarifService).filter(models.TarifService.id == tarif_id).delete()
    db.commit()
    return deleted > 0


# --- CHAUFFEUR CRUD ---
def get_chauffeurs(db: Session) -> List[models.Chauffeur]:
    return db.query(models.Chauffeur).order_by(models.Chauffeur.id.desc()).all()

def get_chauffeur_by_id(db: Session, chauffeur_id: int) -> Optional[models.Chauffeur]:
    return db.query(models.Chauffeur).filter(models.Chauffeur.id == chauffeur_id).first()

def create_chauffeur(db: Session, chauffeur: schemas.ChauffeurCreate) -> models.Chauffeur:
    db_obj = models.Chauffeur(**chauffeur.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_chauffeur(db: Session, db_chauffeur: models.Chauffeur, update_data: dict) -> models.Chauffeur:
    for key, value in update_data.items():
        setattr(db_chauffeur, key, value)
    db.commit()
    db.refresh(db_chauffeur)
    return db_chauffeur

def delete_chauffeur(db: Session, chauffeur_id: int) -> bool:
    deleted = db.query(models.Chauffeur).filter(models.Chauffeur.id == chauffeur_id).delete()
    db.commit()
    return deleted > 0


# ----------------- VILLES CRUD -----------------
def seed_default_villes(db: Session):
    """Seed all Ivorian cities - crée les villes manquantes plutôt que de vérifier si la table est vide."""
    try:
        # Liste complète des villes de Côte d'Ivoire
        default_villes = [
            {"code": "ABJ", "libelle": "Abidjan", "region": "Lagunes"},
            {"code": "BKE", "libelle": "Bouaké", "region": "Gbêkê"},
            {"code": "YMK", "libelle": "Yamoussoukro", "region": "Bélier"},
            {"code": "SP", "libelle": "San-Pédro", "region": "San-Pédro"},
            {"code": "KHO", "libelle": "Korhogo", "region": "Poro"},
            {"code": "DAL", "libelle": "Daloa", "region": "Haut-Sassandra"},
            {"code": "MAN", "libelle": "Man", "region": "Tonkpi"},
            {"code": "GAG", "libelle": "Gagnoa", "region": "Gôh"},
            {"code": "AGB", "libelle": "Agboville", "region": "Agnéby-Tiassa"},
            {"code": "ALP", "libelle": "Alépé", "region": "La Mé"},
        ]

        # Créer les villes manquantes (une par une)
        for ville_data in default_villes:
            existing = db.query(models.Ville).filter(
                func.lower(models.Ville.libelle) == ville_data["libelle"].lower().strip()
            ).first()

            if not existing:
                new_ville = models.Ville(
                    code=ville_data["code"],
                    libelle=ville_data["libelle"],
                    region=ville_data["region"],
                    statut="actif"
                )
                db.add(new_ville)

        db.commit()
    except Exception:
        pass


# ===================== TENUE SCOLAIRE CRUD =====================

def get_tenues(
    db: Session,
    ecole_ids: Optional[List[int]] = None,
    code_etablissement: Optional[str] = None,
    cycle: Optional[str] = None,
    genre: Optional[str] = None,
    actif: Optional[bool] = True
) -> List[models.TenuteScolaire]:
    """Récupère les tenues scolaires filtrées par établissement."""
    query = db.query(models.TenuteScolaire)

    if ecole_ids:
        query = query.filter(models.TenuteScolaire.ecole_id.in_(ecole_ids))
    if code_etablissement:
        query = query.filter(models.TenuteScolaire.ET_CODEETABLISSEMENT == code_etablissement)
    if cycle:
        query = query.filter(models.TenuteScolaire.cycle == cycle)
    if genre:
        query = query.filter(models.TenuteScolaire.genre == genre)
    if actif is not None:
        query = query.filter(models.TenuteScolaire.actif == actif)

    return query.order_by(models.TenuteScolaire.cycle, models.TenuteScolaire.niveau, models.TenuteScolaire.genre).all()


def get_tenue_by_id(db: Session, tenue_id: int) -> Optional[models.TenuteScolaire]:
    """Récupère une tenue par son ID."""
    return db.query(models.TenuteScolaire).filter(models.TenuteScolaire.id == tenue_id).first()


def create_tenue(
    db: Session,
    tenue: schemas.TenuteScolaireCreate,
    ecole_id: Optional[int] = None,
    code_etablissement: Optional[str] = None
) -> models.TenuteScolaire:
    """Crée une nouvelle tenue scolaire."""
    db_tenue = models.TenuteScolaire(
        nom=tenue.nom,
        description=tenue.description,
        cycle=tenue.cycle,
        niveau=tenue.niveau,
        genre=tenue.genre,
        prix_unitaire=tenue.prix_unitaire,
        quantite_stock=tenue.quantite_stock,
        quantite_critique=tenue.quantite_critique,
        actif=tenue.actif,
        ecole_id=tenue.ecole_id or ecole_id,
        ET_CODEETABLISSEMENT=tenue.ET_CODEETABLISSEMENT or code_etablissement
    )
    db.add(db_tenue)
    db.commit()
    db.refresh(db_tenue)
    return db_tenue


def update_tenue(
    db: Session,
    tenue_id: int,
    tenue_data: schemas.TenuteScolaireUpdate
) -> Optional[models.TenuteScolaire]:
    """Met à jour une tenue scolaire."""
    db_tenue = db.query(models.TenuteScolaire).filter(models.TenuteScolaire.id == tenue_id).first()
    if not db_tenue:
        return None

    update_data = tenue_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_tenue, key, value)

    db.commit()
    db.refresh(db_tenue)
    return db_tenue


def delete_tenue(db: Session, tenue_id: int) -> bool:
    """Supprime une tenue scolaire."""
    db_tenue = db.query(models.TenuteScolaire).filter(models.TenuteScolaire.id == tenue_id).first()
    if not db_tenue:
        return False

    db.delete(db_tenue)
    db.commit()
    return True


def provision_yamoussoukro_if_needed(db: Session):
    try:
        # Provision Yamoussoukro Etablissement if not exists
        sch_yakro = db.query(models.Etablissement).filter(
            (func.lower(models.Etablissement.ET_VILLE) == "yamoussoukro") |
            (models.Etablissement.ET_CODEETABLISSEMENT == "CSH-03")
        ).first()

        if not sch_yakro:
            sch_yakro = models.Etablissement(
                ET_DENOMMINATION="Complexe Scolaire Hînneh Yamoussoukro",
                ET_CODEETABLISSEMENT="CSH-03",
                ET_REGION="Bélier",
                ET_VILLE="Yamoussoukro",
                ET_CONTACTS="07 08 09 10 11",
                ET_EMAIL="direction.yamoussoukro@hinneh.ci",
                ET_STATUT="actif"
            )
            db.add(sch_yakro)
            db.commit()
            db.refresh(sch_yakro)

        # Provision Yamoussoukro Dedicated Private User Account
        user_yakro = db.query(models.CustomUser).filter(
            or_(models.CustomUser.username == "yamoussoukro", models.CustomUser.username == "admin.yamoussoukro")
        ).first()

        if not user_yakro:
            max_id = db.query(func.max(models.CustomUser.id)).scalar()
            next_id = (max_id + 1) if max_id is not None else 100
            user_yakro = models.CustomUser(
                id=next_id,
                username="yamoussoukro",
                email="direction.yamoussoukro@hinneh.ci",
                password=get_password_hash("Yakro2026!"),
                first_name="Direction",
                last_name="Yamoussoukro",
                is_staff=True,
                is_active=True,
                is_superuser=False,
                ville="Yamoussoukro",
                villes_autorisees=["Yamoussoukro"],
                ecoles_autorisees=["CSH-03"],
                ET_CODEETABLISSEMENT="CSH-03",
                PROFIL="directeur_ecole"
            )
            db.add(user_yakro)
            db.commit()
            db.refresh(user_yakro)

        # Provision Personnel entry linked to user
        staff_yakro = db.query(models.Personnel).filter(models.Personnel.user_id == user_yakro.id).first()
        if not staff_yakro:
            staff_yakro = models.Personnel(
                prenom="Direction",
                nom="Yamoussoukro",
                email="direction.yamoussoukro@hinneh.ci",
                telephone="+225 07 08 09 10 11",
                fonction="directeur_ecole",
                statut="actif",
                ecole_id=sch_yakro.IDETABLISSEMENT,
                user_id=user_yakro.id,
                ET_CODEETABLISSEMENT="CSH-03"
            )
            db.add(staff_yakro)
            db.commit()
    except Exception:
        db.rollback()

def get_villes(db: Session, statut: Optional[str] = None) -> List[dict]:
    try:
        seed_default_villes(db)
    except Exception:
        pass
    try:
        query = db.query(models.Ville)
        if statut:
            query = query.filter(models.Ville.statut == statut)
        villes = query.order_by(models.Ville.libelle.asc()).all()

        result = []
        for v in villes:
            try:
                count_ecoles = db.query(models.Etablissement).filter(
                    func.lower(models.Etablissement.ET_VILLE) == v.libelle.lower().strip()
                ).count()
            except Exception:
                count_ecoles = 0
            v_dict = {
                "id": v.id,
                "code": v.code,
                "libelle": v.libelle,
                "code_postal": getattr(v, "code_postal", None),
                "region": getattr(v, "region", None),
                "statut": getattr(v, "statut", "actif"),
                "nb_ecoles": count_ecoles,
                "date_creation": getattr(v, "date_creation", None)
            }
            result.append(v_dict)
        return result
    except Exception:
        return []

def create_ville(db: Session, ville: schemas.VilleCreate) -> models.Ville:
    db_obj = models.Ville(**ville.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_ville(db: Session, ville_id: int, update_data: dict) -> Optional[models.Ville]:
    db_obj = db.query(models.Ville).filter(models.Ville.id == ville_id).first()
    if not db_obj:
        return None
    for field, val in update_data.items():
        setattr(db_obj, field, val)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_ville(db: Session, ville_id: int) -> bool:
    deleted = db.query(models.Ville).filter(models.Ville.id == ville_id).delete()
    db.commit()
    return deleted > 0


# ----------------- BIBLIOTHEQUE CRUD -----------------
def seed_default_livres(db: Session):
    if db.query(models.Livre).count() == 0:
        defaults = [
            models.Livre(titre="Le Pagne Noir", auteur="Bernard Dadié", isbn="978-2708701234", categorie="Littérature Ivoirienne", nombre_exemplaires=10, disponibles=7, emplacement="Rayon A1"),
            models.Livre(titre="L'Aventure Ambiguë", auteur="Cheikh Hamidou Kane", isbn="978-2266023456", categorie="Roman Africain", nombre_exemplaires=8, disponibles=5, emplacement="Rayon A2"),
            models.Livre(titre="Mathématiques 3ème Collection Pythagore", auteur="EDICEF", isbn="978-2753109876", categorie="Manuel Scolaire", nombre_exemplaires=25, disponibles=18, emplacement="Rayon M3"),
            models.Livre(titre="SVT 1ère D Collection Savanes", auteur="NEI CEDA", isbn="978-2844871234", categorie="Manuel Scolaire", nombre_exemplaires=15, disponibles=12, emplacement="Rayon S1"),
            models.Livre(titre="Les Soleils des Indépendances", auteur="Ahmadou Kourouma", isbn="978-2020239871", categorie="Roman Africain", nombre_exemplaires=12, disponibles=4, emplacement="Rayon A3"),
        ]
        for b in defaults:
            db.add(b)
        db.commit()

def get_livres(db: Session, code_ecole: Optional[str] = None) -> List[models.Livre]:
    seed_default_livres(db)
    query = db.query(models.Livre)
    if code_ecole:
        query = query.filter(or_(models.Livre.ET_CODEETABLISSEMENT == code_ecole, models.Livre.ET_CODEETABLISSEMENT.is_(None)))
    return query.order_by(models.Livre.id.desc()).all()

def create_livre(db: Session, livre_in: schemas.LivreCreate, code_ecole: Optional[str] = None) -> models.Livre:
    data = livre_in.dict()
    if not data.get("ET_CODEETABLISSEMENT") and code_ecole:
        data["ET_CODEETABLISSEMENT"] = code_ecole
    db_livre = models.Livre(**data)
    db.add(db_livre)
    db.commit()
    db.refresh(db_livre)
    return db_livre

def update_livre(db: Session, livre_id: int, livre_in: schemas.LivreUpdate) -> Optional[models.Livre]:
    db_livre = db.query(models.Livre).filter(models.Livre.id == livre_id).first()
    if not db_livre:
        return None
    for field, value in livre_in.dict(exclude_unset=True).items():
        setattr(db_livre, field, value)
    db.commit()
    db.refresh(db_livre)
    return db_livre

def delete_livre(db: Session, livre_id: int) -> bool:
    deleted = db.query(models.Livre).filter(models.Livre.id == livre_id).delete()
    db.commit()
    return deleted > 0

def get_emprunts(db: Session, code_ecole: Optional[str] = None) -> List[dict]:
    query = db.query(models.EmpruntLivre)
    if code_ecole:
        query = query.filter(or_(models.EmpruntLivre.ET_CODEETABLISSEMENT == code_ecole, models.EmpruntLivre.ET_CODEETABLISSEMENT.is_(None)))
    emprunts = query.order_by(models.EmpruntLivre.id.desc()).all()
    
    res = []
    for emp in emprunts:
        titre = emp.livre.titre if emp.livre else f"Livre #{emp.livre_id}"
        nom = ""
        if emp.eleve:
            nom = f"{emp.eleve.nom} {emp.eleve.prenom} (Élève)"
        elif emp.personnel:
            nom = f"{emp.personnel.nom} {emp.personnel.prenom} (Personnel)"
        else:
            nom = emp.remarque or "Emprunteur inconnu"
            
        res.append({
            "id": emp.id,
            "livre_id": emp.livre_id,
            "titre_livre": titre,
            "emprunteur_nom": nom,
            "type_emprunteur": "eleve" if emp.eleve_id else "personnel",
            "date_emprunt": str(emp.date_emprunt),
            "date_retour_prevue": str(emp.date_retour_prevue),
            "date_retour_effective": str(emp.date_retour_effective) if emp.date_retour_effective else None,
            "statut": emp.statut,
            "remarque": emp.remarque
        })
    return res

def create_emprunt(db: Session, emprunt_in: schemas.EmpruntLivreCreate, code_ecole: Optional[str] = None) -> models.EmpruntLivre:
    data = emprunt_in.dict()
    emprunteur_nom = data.pop("emprunteur_nom", None)
    if emprunteur_nom and not data.get("remarque"):
        data["remarque"] = emprunteur_nom
    if not data.get("ET_CODEETABLISSEMENT") and code_ecole:
        data["ET_CODEETABLISSEMENT"] = code_ecole

    db_emp = models.EmpruntLivre(**data)
    db.add(db_emp)
    
    book = db.query(models.Livre).filter(models.Livre.id == emprunt_in.livre_id).first()
    if book and book.disponibles > 0:
        book.disponibles -= 1
        
    db.commit()
    db.refresh(db_emp)
    return db_emp

def retour_emprunt(db: Session, emprunt_id: int) -> Optional[models.EmpruntLivre]:
    db_emp = db.query(models.EmpruntLivre).filter(models.EmpruntLivre.id == emprunt_id).first()
    if not db_emp:
        return None
        
    db_emp.statut = "retourne"
    db_emp.date_retour_effective = date.today()
    
    book = db.query(models.Livre).filter(models.Livre.id == db_emp.livre_id).first()
    if book:
        book.disponibles += 1
        
    db.commit()
    db.refresh(db_emp)
    return db_emp


# ----------------- ATTRIBUTIONS EDUCATEUR CRUD -----------------
def get_educateur_attributions(
    db: Session,
    educateur_id: Optional[int] = None,
    ecole_id: Optional[int] = None,
    code_etablissement: Optional[str] = None
) -> List[models.AttributionEducateur]:
    query = db.query(models.AttributionEducateur)
    if educateur_id:
        query = query.filter(models.AttributionEducateur.educateur_id == educateur_id)
    if code_etablissement:
        query = query.filter(or_(
            models.AttributionEducateur.code_etablissement == code_etablissement,
            models.AttributionEducateur.code_etablissement.is_(None)
        ))
    elif ecole_id:
        query = query.filter(or_(
            models.AttributionEducateur.ecole_id == ecole_id,
            models.AttributionEducateur.ecole_id.is_(None)
        ))
    return query.order_by(models.AttributionEducateur.id.desc()).all()


def assign_educateur_attributions(
    db: Session,
    data: schemas.AttributionEducateurAssignRequest,
    attribue_par: Optional[str] = None
) -> List[models.AttributionEducateur]:
    """Attribue des cycles et/ou niveaux à un ou plusieurs éducateurs.
    
    Pour chaque éducateur ciblé :
    - Si des cycles sont passés sans niveaux spécifiques, on associe les cycles entiers.
    - Si des niveaux spécifiques sont passés, on associe chaque niveau (avec son cycle parent).
    """
    created_attributions = []

    # Résoudre les cycles
    cycles_dict = {}
    if data.cycle_ids:
        db_cycles = db.query(models.Cycle).filter(models.Cycle.id.in_(data.cycle_ids)).all()
        for c in db_cycles:
            cycles_dict[c.id] = c

    # Résoudre les niveaux
    niveaux_dict = {}
    if data.niveau_ids:
        db_niveaux = db.query(models.Niveau).filter(models.Niveau.id.in_(data.niveau_ids)).all()
        for n in db_niveaux:
            niveaux_dict[n.id] = n
            if n.cycle_id and n.cycle_id not in cycles_dict:
                c = db.query(models.Cycle).filter(models.Cycle.id == n.cycle_id).first()
                if c:
                    cycles_dict[c.id] = c

    for edu_id in data.educateur_ids:
        staff = db.query(models.Personnel).filter(models.Personnel.id == edu_id).first()
        if not staff:
            continue

        ecole_id = data.ecole_id or staff.ecole_id
        code_etab = data.code_etablissement or staff.ET_CODEETABLISSEMENT

        # 1. Si des niveaux spécifiques ont été choisis
        if data.niveau_ids:
            for n_id in data.niveau_ids:
                niv = niveaux_dict.get(n_id)
                if not niv:
                    continue
                cyc = cycles_dict.get(niv.cycle_id)

                existing = db.query(models.AttributionEducateur).filter(
                    models.AttributionEducateur.educateur_id == edu_id,
                    models.AttributionEducateur.niveau_id == n_id
                ).first()
                if not existing:
                    attr = models.AttributionEducateur(
                        educateur_id=edu_id,
                        cycle_id=cyc.id if cyc else niv.cycle_id,
                        cycle_code=cyc.code if cyc else None,
                        cycle_libelle=cyc.libelle if cyc else None,
                        niveau_id=niv.id,
                        niveau_code=niv.code,
                        niveau_libelle=niv.libelle,
                        ecole_id=ecole_id,
                        code_etablissement=code_etab,
                        attribue_par=attribue_par,
                        date_attribution=datetime.utcnow()
                    )
                    db.add(attr)
                    created_attributions.append(attr)

        # 2. Si des cycles ont été passés (au niveau cycle entier)
        if data.cycle_ids:
            for c_id in data.cycle_ids:
                cyc = cycles_dict.get(c_id)
                if not cyc:
                    continue

                existing = db.query(models.AttributionEducateur).filter(
                    models.AttributionEducateur.educateur_id == edu_id,
                    models.AttributionEducateur.cycle_id == c_id,
                    models.AttributionEducateur.niveau_id.is_(None)
                ).first()

                if not data.niveau_ids and not existing:
                    attr = models.AttributionEducateur(
                        educateur_id=edu_id,
                        cycle_id=cyc.id,
                        cycle_code=cyc.code,
                        cycle_libelle=cyc.libelle,
                        niveau_id=None,
                        niveau_code=None,
                        niveau_libelle=None,
                        ecole_id=ecole_id,
                        code_etablissement=code_etab,
                        attribue_par=attribue_par,
                        date_attribution=datetime.utcnow()
                    )
                    db.add(attr)
                    created_attributions.append(attr)

    db.commit()
    for attr in created_attributions:
        db.refresh(attr)
    return created_attributions


def delete_educateur_attributions(db: Session, educateur_id: int) -> int:
    deleted = db.query(models.AttributionEducateur).filter(
        models.AttributionEducateur.educateur_id == educateur_id
    ).delete()
    db.commit()
    return deleted


def delete_attribution_educateur(db: Session, attribution_id: int) -> bool:
    deleted = db.query(models.AttributionEducateur).filter(
        models.AttributionEducateur.id == attribution_id
    ).delete()
    db.commit()
    return deleted > 0






