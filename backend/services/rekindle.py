from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from models.song import Song
from models.rekindle import Rekindle


class RekindleService:
    def __init__(self, db: Session):
        self.db = db

    def rekindle_any(self):
        """
        Rekindles songs based on lowest rekindle_count. Proper Rekindle algorithm not included
        """
        try:
            songs = self.db.scalars(
                select(Song).order_by(func.random()).limit(10)
            ).all()
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
                }
                for song in songs
            ]

            for song in songs:
                song_rekindle = self.db.scalar(
                    select(Rekindle).where(Rekindle.song_id == song.id)
                )

                if song_rekindle is None:
                    raise RuntimeError(
                        f"Missing Rekindle record for song id {song.id}"
                    )

                song_rekindle.rekindle_count += 1
                song_rekindle.last_rekindled_at = datetime.now(timezone.utc)

            self.db.commit()
            return response
        
        except Exception:
            self.db.rollback()
            raise

    def rekindle_genre():
        return