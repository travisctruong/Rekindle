import random
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from backend.validators.playlist_validator import PlaylistValidation
from database.database import get_db
from models.song import Song

from apple_music.auth import generate_developer_token
from routes import apple_music
from services.genres import parse_genres
from services.rekindle import RekindleService


router = APIRouter(prefix="/api/songs")


@router.post("/create-playlist")
async def create_playlist(data: PlaylistValidation, db: Session = Depends(get_db)):
    """
    Create an Apple Music playlist from ten Rekindle recommendations.
    """
    if not apple_music.music_user_token:
        raise HTTPException(status_code=400, detail="Connect Apple Music first")

    songs_by_id = {
        song.id: song
        for song in db.query(Song).filter(Song.id.in_(data.song_ids)).all()
    }
    if len(songs_by_id) != len(data.song_ids):
        raise HTTPException(
            status_code=400,
            detail="One or more playlist songs could not be found",
        )

    headers = {
        "Authorization": f"Bearer {generate_developer_token()}",
        "Music-User-Token": apple_music.music_user_token,
    }
    user_timezone = timezone(timedelta(minutes=-data.timezone_offset_minutes))
    rekindled_at = datetime.now(user_timezone)
    time_text = f"{rekindled_at.hour % 12 or 12}:{rekindled_at:%M}{'am' if rekindled_at.hour < 12 else 'pm'}"
    payload = {
        "attributes": {
            "name": data.playlist_name,
            "description": (
                f"Rekindled: {rekindled_at:%B}, {rekindled_at.day} @ "
                f"{time_text} {data.timezone_name}"
            ),
        },
        "relationships": {
            "tracks": {
                "data": [
                    {"id": songs_by_id[song_id].apple_music_id, "type": "library-songs"}
                    for song_id in data.song_ids
                ]
            }
        },
    }

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=10.0)) as client:
            response = await client.post(
                "https://api.music.apple.com/v1/me/library/playlists",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
    except httpx.TimeoutException as exc:
        raise HTTPException(
            status_code=504,
            detail="Apple Music API timed out; retry the request later",
        ) from exc
    except httpx.HTTPStatusError as exc:
        status_code = 429 if exc.response.status_code == 429 else 502
        detail = (
            "Apple Music rate limit reached; retry the request later"
            if status_code == 429
            else "Apple Music failed to create the playlist"
        )
        raise HTTPException(status_code=status_code, detail=detail) from exc

    try:
        playlist = response.json()["data"][0]
        return {
            "id": playlist["id"],
            "name": playlist["attributes"]["name"],
        }
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=502,
            detail="Apple Music returned an invalid playlist response",
        ) from exc


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