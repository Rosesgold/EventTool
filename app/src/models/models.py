from app.src.database.config import Base
from sqlalchemy.orm import Mapped, mapped_column
from userstatus import AccountStatus
from datetime import datetime


class UserORM(Base):
    __tablename__ = 'Users'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(nullable=False)
    password: Mapped[str] = mapped_column(nullable=False)
    user_status: Mapped[AccountStatus] = mapped_column(nullable=False, default=AccountStatus.BASE)


class EventORM(Base):
    __tablename__ = 'Events'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    roe: Mapped[float] = mapped_column(nullable=True)
    title: Mapped[str] = mapped_column(nullable=False)
    category: Mapped[str] = mapped_column(nullable=True)
    date: Mapped[datetime] = mapped_column(nullable=False)
    url: Mapped[str] = mapped_column(nullable=True)

