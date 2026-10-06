from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.database import get_db
from models.song import Song

from services.rekindle import RekindleService


router = APIRouter(prefix="/api/songs")

@router.get("/")
def get_songs(db: Session = Depends(get_db)):
    """
    Get all songs in database
    """
    return db.query(Song).all()

@router.get("/rekindle")
def rekindle(db: Session = Depends(get_db)):
    """
    Rekindle 0.1.0
    """
    return RekindleService(db).rekindle_any()