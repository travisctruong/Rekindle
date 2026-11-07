import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from database.database import Base
from models.playlist import Playlist
from models.rekindle import Rekindle
from models.song import Song
from models.user import User
from routes.rekindle import dashboard_stats, get_latest_first_sync


NOW = datetime(2026, 11, 7, 12, tzinfo=timezone.utc)
MONTH_START = datetime(2026, 11, 1, 4, tzinfo=timezone.utc)


class FrozenDatetime(datetime):
    @classmethod
    def now(cls, tz=None):
        return NOW.astimezone(tz) if tz else NOW.replace(tzinfo=None)


class MonthlyDashboardTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        Base.metadata.create_all(self.engine, tables=[User.__table__, Song.__table__, Rekindle.__table__, Playlist.__table__])
        self.db = Session(self.engine)
        self.db.add_all([User(id=1, user_token="one", name="One"), User(id=2, user_token="two", name="Two")])
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def add_song(self, song_id, user_id, album, artist, date, favourite=False, rekindle_count=0):
        self.db.add(Song(
            id=song_id, user_id=user_id, apple_music_id=str(song_id), title="Song",
            album=album, artist=artist, genres="", artwork="", duration=0,
        ))
        if date is not None:
            self.db.add(Rekindle(song_id=song_id, first_synced_at=date, favourite=favourite, rekindle_count=rekindle_count))
        self.db.commit()

    def stats(self):
        with patch("routes.rekindle.get_user_id", return_value=1), patch("routes.rekindle.datetime", FrozenDatetime):
            return dashboard_stats(None, MONTH_START, self.db)

    def test_calendar_growth_and_user_scoped_playlist_count(self):
        self.add_song(1, 1, "Old", "Old artist", MONTH_START - timedelta(seconds=1), True, 5)
        self.add_song(2, 1, "Old", "Old artist", MONTH_START)
        self.add_song(3, 1, "New", "New artist", NOW)
        self.add_song(4, 2, "Other", "Other artist", NOW, True, 3)
        self.db.add_all([
            Playlist(user_id=1, apple_music_id="a", name="A", can_edit=True, is_public=False),
            Playlist(user_id=1, apple_music_id="b", name="B", can_edit=False, is_public=False),
            Playlist(user_id=2, apple_music_id="c", name="C", can_edit=True, is_public=False),
        ])
        self.db.commit()

        result = self.stats()
        self.assertEqual((result["songs"], result["albums"], result["artists"], result["playlists"]), (3, 2, 2, 2))
        self.assertEqual(result["favourites"], 1)
        self.assertEqual(result["rekindled"], 1)
        self.assertEqual(result["monthly"], {
            "songs": {"added": 2, "baseline": 1},
            "albums": {"added": 1, "baseline": 1},
            "artists": {"added": 1, "baseline": 1},
        })
        self.assertEqual(result["monthly_sync"], {
            "songs": [{"at": MONTH_START.isoformat(), "count": 1}, {"at": NOW.isoformat(), "count": 1}],
            "albums": [{"at": NOW.isoformat(), "count": 1}],
            "artists": [{"at": NOW.isoformat(), "count": 1}],
        })
        self.assertEqual(result["as_of"], NOW.isoformat())
        with patch("routes.rekindle.get_user_id", return_value=1):
            self.assertEqual(get_latest_first_sync(None, self.db), NOW.replace(tzinfo=None))

    def test_unknown_dates_and_empty_baseline(self):
        self.assertEqual(self.stats()["monthly"]["songs"], {"added": 0, "baseline": 0})
        self.assertEqual(self.stats()["rekindled"], 0)
        self.add_song(1, 1, "New", "Artist", NOW)
        self.assertEqual(self.stats()["monthly"]["songs"], {"added": 1, "baseline": 0})
        self.add_song(2, 1, "New", "Artist", None)
        self.assertEqual(self.stats()["monthly"], {"songs": None, "albums": None, "artists": None})
        self.assertEqual(self.stats()["monthly_sync"], {"songs": None, "albums": None, "artists": None})

    def test_rekindled_counts_each_song_once_even_with_multiple_records(self):
        self.add_song(1, 1, "Album", "Artist", NOW, rekindle_count=2)
        self.add_song(2, 1, "Album", "Artist", NOW)
        self.add_song(3, 1, "Album", "Artist", None)
        self.db.add(Rekindle(song_id=1, first_synced_at=NOW, favourite=False, rekindle_count=1))
        self.db.commit()
        result = self.stats()
        self.assertEqual(result["songs"], 3)
        self.assertEqual(result["rekindled"], 1)

    def test_invalid_month_start(self):
        with patch("routes.rekindle.get_user_id", return_value=1), patch("routes.rekindle.datetime", FrozenDatetime):
            with self.assertRaises(HTTPException) as error:
                dashboard_stats(None, datetime(2026, 11, 1), self.db)
        self.assertEqual(error.exception.status_code, 422)


if __name__ == "__main__":
    unittest.main()
