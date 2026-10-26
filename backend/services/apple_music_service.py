import asyncio
from datetime import datetime, timezone
from urllib.parse import quote, urljoin

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from apple_music.auth import generate_developer_token
from models.playlist import Playlist
from models.playlist_song import PlaylistSong
from models.rekindle import Rekindle
from models.song import Song
from models.user import User


class AppleMusicService:
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def _parse_timestamp(value: str | None):
        if not value:
            return None

        value = value.strip()
        if not value:
            return None

        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None

    async def _fetch_library_page(
        self, client: httpx.AsyncClient, url: str, headers: dict
    ) -> dict:
        for attempt in range(4):
            try:
                response = await client.get(url, headers=headers)
            except httpx.TimeoutException:
                if attempt == 3:
                    raise
                await asyncio.sleep(min(2 ** attempt, 30))
                continue

            if response.status_code == 429 or response.status_code >= 500:
                if attempt == 3:
                    response.raise_for_status()
                retry_after = response.headers.get("Retry-After")
                try:
                    delay = min(float(retry_after), 30) if retry_after else min(2 ** attempt, 30)
                except ValueError:
                    delay = min(2 ** attempt, 30)
                await asyncio.sleep(delay)
                continue

            response.raise_for_status()
            return response.json()

        raise RuntimeError(f"Failed to fetch Apple Music page: {url}")

    # Sync Apple Music Library
    async def fetch_and_store_songs(
        self, music_user_token: str
    ) -> int:
        headers = {
            "Authorization": f"Bearer {generate_developer_token()}",
            "Music-User-Token": music_user_token,
        }
        initial_url = "https://api.music.apple.com/v1/me/library/songs"
        songs_by_id = {}

        timeout = httpx.Timeout(30.0, connect=10.0)
        pending_urls = [initial_url]
        seen_urls = {initial_url}

        async with httpx.AsyncClient(timeout=timeout) as client:
            while pending_urls:
                batch_size = min(3, len(pending_urls))
                batch_urls = [pending_urls.pop(0) for _ in range(batch_size)]
                page_payloads = await asyncio.gather(
                    *[
                        self._fetch_library_page(client, page_url, headers)
                        for page_url in batch_urls
                    ]
                )

                for page_url, payload in zip(batch_urls, page_payloads):
                    for item in payload.get("data", []):
                        songs_by_id[item["id"]] = item.get("attributes", {})

                    next_url = payload.get("next")
                    if not next_url:
                        continue

                    full_next_url = urljoin(page_url, next_url)
                    if full_next_url not in seen_urls:
                        seen_urls.add(full_next_url)
                        pending_urls.append(full_next_url)

        # Push to database
        try:
            # Handle new/existing users
            user = self.db.scalar(
                select(User).where(User.user_token == music_user_token)
            )

            # TODO: Support authentication later on
            if user is None:
                user = User(user_token=music_user_token, name="Test User")
                self.db.add(user)
                self.db.flush()
            user_id = user.id

            # Grab list of user's songs that are already stored
            existing_song_ids = {
                song.apple_music_id
                for song in self.db.scalars(
                    select(Song).where(Song.user_id == user_id)
                ).all()
            }

            # Add new songs to database
            new_songs = []
            for apple_music_id, attributes in songs_by_id.items():
                if apple_music_id in existing_song_ids:
                    continue

                artwork = attributes.get("artwork")
                artwork_url = (
                    artwork.get("url", "") if isinstance(artwork, dict) else ""
                )
                new_songs.append(
                    Song(
                        user_id=user_id,
                        apple_music_id=apple_music_id,
                        title=attributes.get("name", ""),
                        artist=attributes.get("artistName", ""),
                        album=attributes.get("albumName", ""),
                        genres=attributes.get("genreNames", ""),
                        artwork=artwork_url,
                    )
                )

            # Flush database rows
            if new_songs:
                self.db.add_all(new_songs)
                self.db.flush()
                first_synced_at = datetime.now(timezone.utc)

                # Create corresponding rekindle rows
                self.db.add_all(
                    [
                        Rekindle(
                            song_id=song.id,
                            first_synced_at=first_synced_at,
                            last_rekindled_at=None,
                            rekindle_count=0,
                            favourite=False,
                        )
                        for song in new_songs
                    ]
                )

            self.db.commit()

        except Exception:
            self.db.rollback()
            raise

        return len(songs_by_id)

    async def fetch_and_store_playlists(self, music_user_token: str) -> int:
        headers = {
            "Authorization": f"Bearer {generate_developer_token()}",
            "Music-User-Token": music_user_token,
        }
        url = "https://api.music.apple.com/v1/me/library/playlists"
        timeout = httpx.Timeout(30.0, connect=10.0)
        playlists_by_id = {}

        async with httpx.AsyncClient(timeout=timeout) as client:
            while url:
                payload = await self._fetch_library_page(client, url, headers)
                for item in payload.get("data", []):
                    if item.get("type") == "library-playlists":
                        playlists_by_id[item["id"]] = item.get("attributes", {})
                next_url = payload.get("next")
                url = urljoin(url, next_url) if next_url else ""

            tracks_by_playlist_id = {}
            for playlist_id in playlists_by_id:
                tracks_url = (
                    "https://api.music.apple.com/v1/me/library/playlists/"
                    f"{quote(playlist_id, safe='')}/tracks"
                )
                tracks_by_id = {}
                while tracks_url:
                    payload = await self._fetch_library_page(client, tracks_url, headers)
                    for item in payload.get("data", []):
                        tracks_by_id[item["id"]] = item.get("attributes", {})
                    next_url = payload.get("next")
                    tracks_url = urljoin(tracks_url, next_url) if next_url else ""
                tracks_by_playlist_id[playlist_id] = tracks_by_id

        try:
            user = self.db.scalar(
                select(User).where(User.user_token == music_user_token)
            )
            if user is None:
                user = User(user_token=music_user_token, name="Test User")
                self.db.add(user)
                self.db.flush()

            existing_playlists = self.db.scalars(
                select(Playlist).where(Playlist.user_id == user.id)
            ).all()
            playlists_by_apple_id = {
                playlist.apple_music_id: playlist
                for playlist in existing_playlists
            }

            for apple_music_id, attributes in playlists_by_id.items():
                playlist = playlists_by_apple_id.get(apple_music_id)
                if playlist is None:
                    playlist = Playlist(
                        user_id=user.id,
                        apple_music_id=apple_music_id,
                        name="",
                    )
                    self.db.add(playlist)
                    playlists_by_apple_id[apple_music_id] = playlist

                description = attributes.get("description")
                if isinstance(description, dict):
                    description = description.get("standard")

                artwork = attributes.get("artwork")
                playlist.name = attributes.get("name") or ""
                playlist.description = description
                playlist.artwork = (
                    artwork.get("url") if isinstance(artwork, dict) else None
                )
                playlist.date_added = self._parse_timestamp(attributes.get("dateAdded"))
                playlist.can_edit = attributes.get("canEdit") is True
                playlist.is_public = attributes.get("isPublic") is True

            self.db.flush()

            for apple_music_id in playlists_by_id:
                playlist = playlists_by_apple_id[apple_music_id]
                existing_tracks = self.db.scalars(
                    select(PlaylistSong).where(
                        PlaylistSong.playlist_id == playlist.id
                    )
                ).all()
                tracks_by_apple_id = {
                    track.apple_music_id: track for track in existing_tracks
                }

                for track_id, track_attributes in tracks_by_playlist_id[apple_music_id].items():
                    track = tracks_by_apple_id.get(track_id)
                    if track is None:
                        track = PlaylistSong(
                            playlist_id=playlist.id,
                            apple_music_id=track_id,
                            title="",
                            artist="",
                            album="",
                        )
                        self.db.add(track)

                    genres = track_attributes.get("genreNames")
                    artwork = track_attributes.get("artwork")
                    duration = track_attributes.get("durationInMillis")
                    track.title = track_attributes.get("name") or ""
                    track.artist = track_attributes.get("artistName") or ""
                    track.album = track_attributes.get("albumName") or ""
                    track.genres = ", ".join(genres) if isinstance(genres, list) else genres
                    track.artwork = (
                        artwork.get("url") if isinstance(artwork, dict) else None
                    )
                    track.duration = duration if isinstance(duration, int) else None

            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

        return len(playlists_by_id)

    async def fetch_recently_added(
        self, music_user_token: str
    ) -> dict[str, dict]:
        headers = {
            "Authorization": f"Bearer {generate_developer_token()}",
            "Music-User-Token": music_user_token,
        }
        url = "https://api.music.apple.com/v1/me/library/recently-added?limit=10"
        timeout = httpx.Timeout(30.0, connect=10.0)
        albums_by_id = {}

        async with httpx.AsyncClient(timeout=timeout) as client:
            while url and len(albums_by_id) < 10:
                payload = await self._fetch_library_page(client, url, headers)
                for item in payload.get("data", []):
                    if item.get("type") == "library-albums":
                        albums_by_id[item["id"]] = item.get("attributes", {})
                        if len(albums_by_id) == 10:
                            break

                next_url = payload.get("next")
                url = urljoin(url, next_url) if next_url else ""

        return albums_by_id

    async def fetch_playlist_data(
        self, music_user_token: str, playlist_id: str
    ) -> dict[str, dict]:
        headers = {
            "Authorization": f"Bearer {generate_developer_token()}",
            "Music-User-Token": music_user_token,
        }
        url = f"https://api.music.apple.com/v1/me/library/playlists/{playlist_id}/tracks"
        timeout = httpx.Timeout(30.0, connect=10.0)
        tracks_by_id = {}

        async with httpx.AsyncClient(timeout=timeout) as client:
            while url:
                payload = await self._fetch_library_page(client, url, headers)
                for item in payload.get("data", []):
                    attributes = item.get("attributes", {})
                    tracks_by_id[item["id"]] = attributes
                next_url = payload.get("next")
                url = urljoin(url, next_url) if next_url else ""

        user = self.db.scalar(select(User).where(User.user_token == music_user_token))
        if user is not None and tracks_by_id:
            saved_tracks = self.db.execute(
                select(Song.apple_music_id, Song.id, Rekindle.favourite)
                .join(Rekindle, Rekindle.song_id == Song.id)
                .where(
                    Song.user_id == user.id,
                    Song.apple_music_id.in_(tracks_by_id),
                )
            )
            for apple_music_id, song_id, favourite in saved_tracks:
                tracks_by_id[apple_music_id]["songId"] = song_id
                tracks_by_id[apple_music_id]["favourite"] = favourite

        return tracks_by_id
