import random
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from models.rekindle import Rekindle
from models.song import Song
from services.genres import parse_genres


class RekindleService:
    def __init__(self, db: Session):
        self.db = db

    def _rekindle_songs(self, songs: list[Song]) -> list[dict]:
        rekindle_by_song_id = {}
        for song in songs:
            song_rekindle = self.db.scalar(
                select(Rekindle).where(Rekindle.song_id == song.id)
            )

            if song_rekindle is None:
                raise RuntimeError(
                    f"Missing Rekindle record for song id {song.id}"
                )

            rekindle_by_song_id[song.id] = song_rekindle
            song_rekindle.rekindle_count += 1
            song_rekindle.last_rekindled_at = datetime.now(timezone.utc)

        response = [
            {
                "id": song.id,
                "user_id": song.user_id,
                "apple_music_id": song.apple_music_id,
                "title": song.title,
                "artist": song.artist,
                "album": song.album,
                "genres": song.genres,
                "artwork": song.artwork,
                "favourite": rekindle_by_song_id[song.id].favourite,
            }
            for song in songs
        ]

        self.db.commit()
        return response

    def rekindle_any(self):
        """
        Rekindles songs based on lowest rekindle_count. Proper Rekindle algorithm not included
        """
        try:
            songs = self.db.scalars(
                select(Song)
                .join(Rekindle, Rekindle.song_id == Song.id)
                .where(Rekindle.favourite.is_(False))
                .order_by(func.random())
                .limit(10)
            ).all()
            return self._rekindle_songs(songs)

        except Exception:
            self.db.rollback()
            raise

    def rekindle_genre(self, genre: str):
        """
        Rekindle up to ten randomly selected songs matching a genre
        """
        try:
            genre = genre.strip()
            songs = [
                song
                for song in self.db.scalars(
                    select(Song)
                    .join(Rekindle, Rekindle.song_id == Song.id)
                    .where(Rekindle.favourite.is_(False))
                ).all()
                if genre in parse_genres(song.genres)
            ]
            return self._rekindle_songs(random.sample(songs, min(10, len(songs))))
        except Exception:
            self.db.rollback()
            raise