from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from database.database import Base


class User(Base):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_token: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String)