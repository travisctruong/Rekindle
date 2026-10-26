from sqlalchemy import ForeignKey, Identity, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from database.database import Base


class PlaylistSong(Base):
    __tablename__ = "playlist_song"

    id: Mapped[int] = mapped_column(Integer, Identity(), primary_key=True)
    playlist_id: Mapped[int] = mapped_column(ForeignKey("playlist.id"))
    apple_music_id: Mapped[str] = mapped_column(String)
    title: Mapped[str] = mapped_column(String)
    artist: Mapped[str] = mapped_column(String)
    album: Mapped[str] = mapped_column(String)
    genres: Mapped[str] = mapped_column(String)
    artwork: Mapped[str] = mapped_column(String)
    duration: Mapped[int] = mapped_column(Integer)