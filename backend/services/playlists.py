from sqlalchemy import func, select
from sqlalchemy.orm import Session

from models.playlist import Playlist
from models.playlist_song import PlaylistSong
from models.user import User


def _fetch_playlists(
    db: Session,
    music_user_token: str,
    can_edit: bool,
    limit: int | None,
    sort_by_track_count: bool = False,
) -> dict[str, dict]:
    user = db.scalar(select(User).where(User.user_token == music_user_token))
    if user is None:
        return {}

    statement = select(Playlist).where(
            Playlist.user_id == user.id,
            Playlist.can_edit.is_(can_edit),
        )
    if sort_by_track_count:
        statement = (
            statement.outerjoin(PlaylistSong, PlaylistSong.playlist_id == Playlist.id)
            .group_by(Playlist.id)
            .order_by(func.count(PlaylistSong.id).desc(), Playlist.id)
        )
    else:
        statement = statement.order_by(Playlist.id)

    if limit is not None:
        statement = statement.limit(limit)
    playlists = db.scalars(statement).all()

    return {
        playlist.apple_music_id: {
            "name": playlist.name,
            "description": playlist.description,
            "artwork": playlist.artwork,
            "dateAdded": (
                playlist.date_added.isoformat()
                if playlist.date_added is not None
                else None
            ),
            "canEdit": playlist.can_edit,
            "isPublic": playlist.is_public,
        }
        for playlist in playlists
    }


def fetch_user_playlists(
    db: Session, music_user_token: str, limit: int | None = 6
) -> dict[str, dict]:
    return _fetch_playlists(
        db,
        music_user_token,
        can_edit=True,
        limit=limit,
        sort_by_track_count=True,
    )


def fetch_apple_playlists(
    db: Session, music_user_token: str, limit: int | None = 6
) -> dict[str, dict]:
    return _fetch_playlists(db, music_user_token, can_edit=False, limit=limit)