from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import crud, schemas, models
from ..database import get_db
from ..routers.auth import get_school_scope, SchoolScope
from sqlalchemy import func

router = APIRouter(prefix="/schools", tags=["Schools"])

@router.get("/debug-authorized", response_model=dict)
def debug_authorized_schools(
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    """Debug endpoint pour voir quelles écoles l'utilisateur peut voir.

    Affiche:
    - L'ID et le code d'établissement de l'utilisateur
    - La ville de l'utilisateur
    - TOUTES les écoles autorisées (les 3 écoles du campus)
    """
    auth_ids = scope.get_authorized_school_ids(db)
    schools = db.query(models.Etablissement).filter(
        models.Etablissement.IDETABLISSEMENT.in_(auth_ids)
    ).all() if auth_ids else []

    # Calculer l'effectif total
    total_effectif = 0
    for s in schools:
        count = db.query(func.count(models.Eleve.id)).filter(
            models.Eleve.ecole_id == s.IDETABLISSEMENT,
            models.Eleve.statut == "actif"
        ).scalar() or 0
        total_effectif += count

    return {
        "user_info": {
            "username": scope.username,
            "role": scope.role,
            "ecole_id": scope.ecole_id,
            "code_etablissement": scope.code_etablissement,
            "ville": scope.ville,
            "is_global": scope.is_global
        },
        "schools_authorized": [
            {
                "id": s.IDETABLISSEMENT,
                "nom": s.ET_NOMESTABLISSEMENT,
                "code": s.ET_CODEETABLISSEMENT,
                "ville": s.ET_VILLE,
                "cycle": s.CY_LIBELLECYCLE or "N/A"
            }
            for s in schools
        ],
        "total_effectif": total_effectif
    }


@router.get("/", response_model=List[schemas.SchoolResponse])
def read_schools(
    skip: int = 0,
    limit: int = 100,
    ville: Optional[str] = None,
    all_schools: bool = Query(False),
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    if all_schools or scope.is_global or scope.role == "guest":
        schools = crud.get_schools(db, ecole_id=None, ville=ville, skip=skip, limit=limit)
    else:
        auth_ids = scope.get_authorized_school_ids(db)
        if auth_ids:
            query = db.query(models.Etablissement).filter(models.Etablissement.IDETABLISSEMENT.in_(auth_ids))
            if ville:
                query = query.filter(func.lower(models.Etablissement.ET_VILLE) == ville.lower().strip())
            schools = query.offset(skip).limit(limit).all()
        else:
            schools = crud.get_schools(db, ecole_id=scope.ecole_id, ville=ville, skip=skip, limit=limit)

    return schools

@router.get("/{school_id}", response_model=schemas.SchoolResponse)
def read_school(school_id: int, db: Session = Depends(get_db)):
    db_school = crud.get_school_by_id(db, school_id=school_id)
    if db_school is None:
        raise HTTPException(status_code=404, detail="École non trouvée")
    return db_school

@router.post("/", response_model=schemas.SchoolResponse, status_code=status.HTTP_201_CREATED)
def create_new_school(school: schemas.SchoolCreate, db: Session = Depends(get_db)):
    return crud.create_school(db=db, school=school)

@router.put("/{school_id}", response_model=schemas.SchoolResponse)
def update_school_info(school_id: int, school_update: schemas.SchoolUpdate, db: Session = Depends(get_db)):
    db_school = crud.get_school_by_id(db, school_id=school_id)
    if db_school is None:
        raise HTTPException(status_code=404, detail="École non trouvée")
    update_data = school_update.model_dump(by_alias=True, exclude_none=True)
    return crud.update_school(db=db, db_school=db_school, update_data=update_data)

@router.delete("/{school_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_school(school_id: int, db: Session = Depends(get_db)):
    db_school = crud.get_school_by_id(db, school_id=school_id)
    if db_school is None:
        raise HTTPException(status_code=404, detail="École non trouvée")
    crud.delete_school(db=db, school_id=school_id)


@router.get("/{school_id}/rapport-rentree", response_model=Optional[schemas.RapportRentreeResponse])
def get_school_rapport_rentree(school_id: int, annee_scolaire: str, db: Session = Depends(get_db)):
    return crud.get_rapport_rentree(db, ecole_id=school_id, annee_scolaire=annee_scolaire)


@router.post("/{school_id}/rapport-rentree", response_model=schemas.RapportRentreeResponse)
def save_school_rapport_rentree(school_id: int, report_in: schemas.RapportRentreeCreate, db: Session = Depends(get_db)):
    db_school = crud.get_school_by_id(db, school_id=school_id)
    if db_school is None:
        raise HTTPException(status_code=404, detail="École non trouvée")
    return crud.save_rapport_rentree(db=db, rapport_in=report_in, ecole_id=school_id)


@router.get("/{school_id}/rapport-trimestriel", response_model=Optional[schemas.RapportTrimestrielResponse])
def get_school_rapport_trimestriel(school_id: int, trimestre: int, annee_scolaire: str, db: Session = Depends(get_db)):
    return crud.get_rapport_trimestriel(db, ecole_id=school_id, trimestre=trimestre, annee_scolaire=annee_scolaire)


@router.post("/{school_id}/rapport-trimestriel", response_model=schemas.RapportTrimestrielResponse)
def save_school_rapport_trimestriel(school_id: int, report_in: schemas.RapportTrimestrielCreate, db: Session = Depends(get_db)):
    db_school = crud.get_school_by_id(db, school_id=school_id)
    if db_school is None:
        raise HTTPException(status_code=404, detail="École non trouvée")
    return crud.save_rapport_trimestriel(db=db, rapport_in=report_in, ecole_id=school_id)

