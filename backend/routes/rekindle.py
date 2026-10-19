from fastapi import APIRouter, Depends, HTTPException
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


@router.post("/{song_id}/favourite")
def toggle_favourite(song_id: int, db: Session = Depends(get_db)):
    rekindle = db.scalar(
        select(Rekindle).where(Rekindle.song_id == song_id)
    )
    if rekindle is None:
        raise HTTPException(status_code=404, detail="Song not found")

    try:
        rekindle.favourite = not rekindle.favourite
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {"favourite": rekindle.favourite}
