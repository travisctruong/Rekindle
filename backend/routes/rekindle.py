from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from database.database import get_db
from models.rekindle import Rekindle

router = APIRouter(prefix="/api/rekindle")

@router.get("/last-synced")
def get_last_synced(db: Session = Depends(get_db)):
    """
    Get last-synced date
    """
    return db.scalar(select(func.max(Rekindle.first_synced_at)))
