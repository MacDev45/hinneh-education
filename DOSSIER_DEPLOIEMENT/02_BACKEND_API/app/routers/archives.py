from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from .. import crud, schemas
from ..database import get_db
from ..routers.auth import get_school_scope, SchoolScope

router = APIRouter(prefix="/archives", tags=["Archives"])

@router.get("/", response_model=List[schemas.ArchiveResponse])
def read_archives(
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    return crud.get_archives(db, code_etablissement=scope.code_etablissement)

@router.post("/", response_model=schemas.ArchiveResponse, status_code=status.HTTP_201_CREATED)
def create_new_archive(
    archive: schemas.ArchiveCreate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    return crud.create_archive(db=db, archive=archive, code_etablissement=scope.code_etablissement)
