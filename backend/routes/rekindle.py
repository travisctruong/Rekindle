from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from database.database import get_db
from models.playlist import Playlist
from models.rekindle import Rekindle
from models.song import Song
from routes.apple_music import get_user_id

router = APIRouter(prefix="/api/rekindle")


class FavouriteSongs(BaseModel):
    song_ids: list[int]
    favourite: bool


@router.get("/dashboard-stats")
def dashboard_stats(
    request: Request,
    month_start: datetime | None = None,
    db: Session = Depends(get_db),
):
    user_id = get_user_id(request)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Connect Apple Music first")

    now = datetime.now(timezone.utc)
    if month_start is None:
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif month_start.tzinfo is None or not now - timedelta(days=32) <= month_start <= now:
        raise HTTPException(status_code=422, detail="Invalid month start")

    rows = db.execute(
        select(Song.id, Song.album, Song.artist, Rekindle.first_synced_at, Rekindle.favourite, Rekindle.rekindle_count)
        .outerjoin(Rekindle, Rekindle.song_id == Song.id)
        .where(Song.user_id == user_id)
    ).all()
    songs = {}
    albums = {}
    artists = {}
    undated_albums = set()
    undated_artists = set()
    for song_id, album, artist, synced_at, favourite, rekindle_count in rows:
        song = songs.setdefault(song_id, {"synced_at": None, "favourite": False, "rekindled": False})
        song["favourite"] = song["favourite"] or bool(favourite)
        song["rekindled"] = song["rekindled"] or (rekindle_count is not None and rekindle_count > 0)
        if synced_at is None:
            if album:
                undated_albums.add(album)
            if artist:
                undated_artists.add(artist)
            continue
        if synced_at.tzinfo is None:
            synced_at = synced_at.replace(tzinfo=timezone.utc)
        if song["synced_at"] is None or synced_at < song["synced_at"]:
            song["synced_at"] = synced_at
        for name, dates in ((album, albums), (artist, artists)):
            if name and (name not in dates or synced_at < dates[name]):
                dates[name] = synced_at

    periods = {}
    for period, days in (("day", 1), ("week", 7), ("month", 30)):
        cutoff = now - timedelta(days=days)

        def in_period(value):
            return value is not None and cutoff <= value <= now

        periods[period] = {
            "songs": sum(in_period(song["synced_at"]) for song in songs.values()),
            "albums": sum(in_period(date) for date in albums.values()),
            "artists": sum(in_period(date) for date in artists.values()),
        }

    album_names = set(albums) | undated_albums
    artist_names = set(artists) | undated_artists
    monthly = {}
    monthly_sync = {}
    for name, total, dates, uncertain in (
        ("songs", len(songs), [song["synced_at"] for song in songs.values()], any(song["synced_at"] is None for song in songs.values())),
        ("albums", len(album_names), list(albums.values()), any(albums.get(item) is None or albums[item] >= month_start for item in undated_albums)),
        ("artists", len(artist_names), list(artists.values()), any(artists.get(item) is None or artists[item] >= month_start for item in undated_artists)),
    ):
        added = sum(date is not None and month_start <= date <= now for date in dates)
        monthly[name] = None if uncertain else {"added": added, "baseline": total - added}
        counts = Counter(date for date in dates if date is not None and month_start <= date <= now)
        monthly_sync[name] = None if uncertain else [
            {"at": date.isoformat(), "count": count}
            for date, count in sorted(counts.items())
        ]

    return {
        "periods": periods,
        "favourites": sum(song["favourite"] for song in songs.values()),
        "rekindled": sum(song["rekindled"] for song in songs.values()),
        "songs": len(songs),
        "albums": len(album_names),
        "artists": len(artist_names),
        "playlists": db.scalar(select(func.count(Playlist.id)).where(Playlist.user_id == user_id)),
        "monthly": monthly,
        "monthly_sync": monthly_sync,
        "as_of": now.isoformat(),
    }


@router.get("/last-synced")
def get_last_synced(db: Session = Depends(get_db)):
    """
    Get last-synced date
    """
    return db.scalar(select(func.max(Rekindle.first_synced_at)))


@router.get("/latest-first-sync")
def get_latest_first_sync(request: Request, db: Session = Depends(get_db)):
    user_id = get_user_id(request)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Connect Apple Music first")
    return db.scalar(
        select(func.max(Rekindle.first_synced_at))
        .join(Song, Song.id == Rekindle.song_id)
        .where(Song.user_id == user_id)
    )


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
