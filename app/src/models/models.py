from app.src.database.config import Base
from sqlalchemy.orm import Mapped, mapped_column
from fastapi_users_db_sqlalchemy import SQLAlchemyBaseUserTable
from datetime import datetime
from enum import Enum
from sqlalchemy import String, Boolean


class AccountStatus(Enum):
    BASE: str = "base account"
    PRO: str = "pro account"
    CREATOR: str = "creator account"


class UserORM(SQLAlchemyBaseUserTable[int], Base):
    __tablename__ = 'Users'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(nullable=False)
    user_status: Mapped[AccountStatus] = mapped_column(nullable=False, default=AccountStatus.BASE)

    email: Mapped[str] = mapped_column(String(length=320), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(length=1024), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class EventORM(Base):
    __tablename__ = 'Events'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    roe: Mapped[float] = mapped_column(nullable=True)
    title: Mapped[str] = mapped_column(nullable=False)
    category: Mapped[str] = mapped_column(nullable=True)
    date: Mapped[datetime] = mapped_column(nullable=False)
    url: Mapped[str] = mapped_column(nullable=True)

