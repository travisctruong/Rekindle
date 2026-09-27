from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.database import get_db
from models.song import Song

router = APIRouter(prefix="/api/songs")

@router.get("/")
def get_songs(db: Session = Depends(get_db)):
    return db.query(Song).all()
