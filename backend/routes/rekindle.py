from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from database.database import get_db
from models.rekindle import Rekindle

router = APIRouter(prefix="/api/rekindle")


class FavouriteSongs(BaseModel):
    song_ids: list[int]
    favourite: bool


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


@router.post("/{song_id}/played")
def record_song_played(song_id: int, db: Session = Depends(get_db)):
    rekindle = db.scalar(
        select(Rekindle).where(Rekindle.song_id == song_id)
    )
    if rekindle is None:
        raise HTTPException(status_code=404, detail="Song not found")

    try:
        rekindle.rekindle_count += 1
        rekindle.last_rekindled_at = datetime.now(timezone.utc)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {"rekindle_count": rekindle.rekindle_count}


@router.post("/favourites")
def favourite_songs(data: FavouriteSongs, db: Session = Depends(get_db)):
    rekindles = db.scalars(
        select(Rekindle).where(Rekindle.song_id.in_(data.song_ids))
    ).all()
    found_song_ids = {rekindle.song_id for rekindle in rekindles}
    missing_song_ids = set(data.song_ids) - found_song_ids
    if missing_song_ids:
        raise HTTPException(status_code=404, detail="One or more songs could not be found")

    try:
        for rekindle in rekindles:
            rekindle.favourite = data.favourite
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {"song_ids": data.song_ids, "favourite": data.favourite}
