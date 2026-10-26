from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Identity, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from database.database import Base


class Playlist(Base):
    __tablename__ = "playlist"

    id: Mapped[int] = mapped_column(Integer, Identity(), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"))
    apple_music_id: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str | None] = mapped_column(String)
    artwork: Mapped[str | None] = mapped_column(String)
    date_added: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    can_edit: Mapped[bool] = mapped_column(Boolean)
    is_public: Mapped[bool] = mapped_column(Boolean)
