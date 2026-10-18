import random

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from database.database import get_db
from models.song import Song

from services.genres import parse_genres
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
    Rekindle 0.1.0 - Generic shuffle
    """
    return RekindleService(db).rekindle_any()

@router.get("/rekindle/genre")
def rekindle_genre(genre: str = Query(min_length=1), db: Session = Depends(get_db)):
    """
    Rekindle songs matching a selected genre
    """
    return RekindleService(db).rekindle_genre(genre)

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

@router.get("/popular-genres")
@router.get("/genre-count")
def genre_count(db: Session = Depends(get_db)):
    """
    Get the nine most popular genres and their song counts
    """
    genre_rows = db.query(Song.genres).filter(
        Song.genres.is_not(None),
        Song.genres != "",
    ).all()
    genre_counts = {}

    for (stored_genres,) in genre_rows:
        for genre in set(parse_genres(stored_genres)):
            genre_counts[genre] = genre_counts.get(genre, 0) + 1

    top_genres = sorted(
        genre_counts.items(),
        key=lambda item: (-item[1], item[0].casefold()),
    )[:9]
    return dict(top_genres)

@router.get("/genre-artwork")
def genre_artwork(db: Session = Depends(get_db)):
    genre_rows = db.query(Song.genres, Song.artwork).filter(
        Song.genres.is_not(None),
        Song.genres != "",
    ).all()
    genre_counts = {}
    artwork_by_genre = {}

    for stored_genres, artwork in genre_rows:
        for genre in set(parse_genres(stored_genres)):
            genre_counts[genre] = genre_counts.get(genre, 0) + 1
            if artwork:
                artwork_by_genre.setdefault(genre, []).append(artwork)

    top_genres = sorted(
        genre_counts.items(),
        key=lambda item: (-item[1], item[0].casefold()),
    )[:9]
    return {
        genre: random.choice(artwork_by_genre[genre]) if genre in artwork_by_genre else None
        for genre, _ in top_genres
    }