from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from .. import crud, schemas
from ..database import get_db
from ..routers.auth import get_school_scope, SchoolScope

router = APIRouter(prefix="/courriers", tags=["Courriers"])

@router.get("/", response_model=List[schemas.CourrierResponse])
def read_courriers(
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    return crud.get_courriers(db, code_etablissement=scope.code_etablissement)

@router.post("/", response_model=schemas.CourrierResponse, status_code=status.HTTP_201_CREATED)
def create_new_courrier(
    courrier: schemas.CourrierCreate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    return crud.create_courrier(db=db, courrier=courrier, code_etablissement=scope.code_etablissement)
