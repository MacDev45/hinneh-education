from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from .. import crud, schemas
from ..database import get_db
from ..routers.auth import get_school_scope, SchoolScope

router = APIRouter(prefix="/stocks", tags=["Stocks"])

@router.get("/", response_model=List[schemas.StockResponse])
def read_stocks(
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    return crud.get_stocks(db, code_etablissement=scope.code_etablissement)

@router.post("/", response_model=schemas.StockResponse, status_code=status.HTTP_201_CREATED)
def create_new_stock(
    stock: schemas.StockCreate,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope)
):
    return crud.create_stock(db=db, stock=stock, code_etablissement=scope.code_etablissement)
