from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Identity, Integer
from sqlalchemy.orm import Mapped, mapped_column

from database.database import Base


class Rekindle(Base):
    __tablename__ = "rekindle"

    id: Mapped[int] = mapped_column(Integer, Identity(), primary_key=True)
    song_id: Mapped[int] = mapped_column(ForeignKey("song.id"))
    first_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_rekindled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rekindle_count: Mapped[int] = mapped_column(Integer, default=0)
