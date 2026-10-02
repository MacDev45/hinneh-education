from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
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

router = APIRouter(prefix="/salles", tags=["Salles"])


@router.get("/", response_model=List[schemas.SalleResponse])
def read_salles(
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    return crud.get_salles(db, ecole_id=scope.ecole_id, code_etablissement=scope.code_etablissement)


@router.post("/import")
def import_salles_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
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
            'nom salle': 'nom',
            'salle': 'nom',
            'capacite': 'capacite',
            'type': 'type',
            'batiment': 'batiment',
            'etage': 'etage',
            'equipements': 'equipements',
        }
        normalized_mapping = {_normalize_header(k): v for k, v in header_mapping.items()}

        if not any(_normalize_header(h) in normalized_mapping and normalized_mapping[_normalize_header(h)] == 'nom' for h in raw_headers):
            return {
                "success": False,
                "imported": 0,
                "updated": 0,
                "errors": [f"Colonne requise manquante : nom. Colonnes détectées : {', '.join(raw_headers[:12])}."]
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
                
                nom = clean_row.get('nom')
                if not nom:
                    errors.append(f"Ligne {index}: Nom de salle requis.")
                    continue
                
                code = nom.upper().replace(" ", "_")
                
                # Capacity
                capacite = 30
                cap_str = clean_row.get('capacite')
                if cap_str:
                    try:
                        capacite = int(cap_str)
                    except ValueError:
                        pass
                
                # Type
                type_salle = clean_row.get('type') or 'classe'
                
                # Building
                batiment = clean_row.get('batiment') or None
                
                # Floor (etage)
                etage_str = clean_row.get('etage')
                etage = 0
                if etage_str:
                    etage_str_lower = etage_str.lower()
                    if 'rdc' in etage_str_lower or 'rez' in etage_str_lower:
                        etage = 0
                    else:
                        m = re.search(r'\d+', etage_str)
                        if m:
                            etage = int(m.group(0))
                
                # Equipments (stored in description)
                equipements = clean_row.get('equipements') or None
                
                db_salle = db.query(models.Salle).filter(models.Salle.code == code).first()
                if db_salle:
                    db_salle.libelle = nom
                    db_salle.capacite = capacite
                    db_salle.type_salle = type_salle
                    db_salle.batiment = batiment
                    db_salle.etage = etage
                    db_salle.description = equipements
                    db.commit()
                    updated_count += 1
                else:
                    salle_in = schemas.SalleCreate(
                        code=code,
                        libelle=nom,
                        type_salle=type_salle,
                        capacite=capacite,
                        etage=etage,
                        batiment=batiment,
                        description=equipements,
                        disponible=True,
                        ecole_id=first_school.IDETABLISSEMENT
                    )
                    crud.create_salle(db=db, salle=salle_in)
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


@router.get("/{salle_id}", response_model=schemas.SalleResponse)
def read_salle(
    salle_id: int,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    db_salle = crud.get_salle_by_id(db, salle_id=salle_id)
    if db_salle is None:
        raise HTTPException(status_code=404, detail="Salle non trouvée")
    if not scope.is_global and scope.code_etablissement:
        if db_salle.ET_CODEETABLISSEMENT and db_salle.ET_CODEETABLISSEMENT != scope.code_etablissement:
            raise HTTPException(status_code=403, detail="Accès refusé à cette salle d'un autre établissement")
    return db_salle


@router.post("/", response_model=schemas.SalleResponse, status_code=status.HTTP_201_CREATED)
def create_new_salle(
    salle: schemas.SalleCreate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    if not scope.is_global:
        if scope.ecole_id:
            salle.ecole_id = scope.ecole_id
        if scope.code_etablissement:
            setattr(salle, "ET_CODEETABLISSEMENT", scope.code_etablissement)
    return crud.create_salle(db=db, salle=salle, code_etablissement=scope.code_etablissement)


@router.put("/{salle_id}", response_model=schemas.SalleResponse)
def update_salle(
    salle_id: int,
    salle_update: schemas.SalleUpdate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    db_salle = crud.get_salle_by_id(db, salle_id=salle_id)
    if db_salle is None:
        raise HTTPException(status_code=404, detail="Salle non trouvée")
    if not scope.is_global and scope.code_etablissement:
        if db_salle.ET_CODEETABLISSEMENT and db_salle.ET_CODEETABLISSEMENT != scope.code_etablissement:
            raise HTTPException(status_code=403, detail="Accès refusé à cette salle d'un autre établissement")
    update_data = salle_update.model_dump(exclude_unset=True)
    return crud.update_salle(db=db, db_salle=db_salle, update_data=update_data)


@router.delete("/{salle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_salle(
    salle_id: int,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    db_salle = crud.get_salle_by_id(db, salle_id=salle_id)
    if db_salle is None:
        raise HTTPException(status_code=404, detail="Salle non trouvée")
    if not scope.is_global and scope.code_etablissement:
        if db_salle.ET_CODEETABLISSEMENT and db_salle.ET_CODEETABLISSEMENT != scope.code_etablissement:
            raise HTTPException(status_code=403, detail="Accès refusé à cette salle d'un autre établissement")
    success = crud.delete_salle(db, salle_id=salle_id)
    if not success:
        raise HTTPException(status_code=404, detail="Salle non trouvée")
    return
