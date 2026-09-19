from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from database.database import Base


class Song(Base):
    __tablename__ = "song"

    id: Mapped[int] = mapped_column(primary_key=True)
    apple_music_id: Mapped[str] = mapped_column(String, unique=True)
    title: Mapped[str] = mapped_column(String)
    artist: Mapped[str] = mapped_column(String)
    album: Mapped[str] = mapped_column(String)