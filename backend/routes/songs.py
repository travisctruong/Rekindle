import heapq

from fastapi import APIRouter, Depends
from sqlalchemy import func
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

@router.get("/songs-count")
def songs_count(db: Session = Depends(get_db)):
    """
    Get total number of songs
    """
    return db.query(Song).count()

@router.get("/albums-count")
def albums_count(db: Session = Depends(get_db)):
    """
    Get the number of unique albums
    """
    return db.query(func.count(func.distinct(Song.album))).filter(Song.album != "").scalar()

@router.get("/artists-count")
def artists_count(db: Session = Depends(get_db)):
    """
    Get the number of unique artists
    """
    return db.query(func.count(func.distinct(Song.artist))).filter(Song.artist != "").scalar()

@router.get("/genre-count")
def genre_count(db: Session = Depends(get_db)):
    """
    Get the top five genres with their counts
    """
    genre_rows = db.query(Song.genres).filter(Song.genres.is_not(None), Song.genres != "").all()
    genres = {}
    for (genre,) in genre_rows:
        genre = genre.replace('"', "").replace("{", "").replace("}", "")

        if genre not in genres:
            genres[genre] = 1
        else:
            genres[genre] += 1

    top_genres = heapq.nlargest(5, genres, key=genres.get)
    return {genre: genres[genre] for genre in top_genres}