from fastapi_users import schemas
from pydantic import EmailStr

from app.src.models.models import AccountStatus


class UserRead(schemas.BaseUser[int]):
    id: int
    username: str
    user_status: AccountStatus
    email: EmailStr
    is_active: bool
    is_superuser: bool
    is_verified: bool


class UserCreate(schemas.BaseUserCreate):
    id: int
    username: str
    user_status: AccountStatus
    password: str
    email: EmailStr
    is_active: bool
    is_superuser: bool
    is_verified: bool

    class Config:
        # This setting allows using ORM objects directly
        from_attributes = True


class UserUpdate(schemas.BaseUserUpdate):
    id: int
    username: str
    email: EmailStr
    password: str
    is_active: bool
    is_superuser: bool
    is_verified: bool

    class Config:
        # This setting allows using ORM objects directly
        from_attributes = True
