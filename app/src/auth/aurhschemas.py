from fastapi_users import schemas
from app.src.models.models import AccountStatus


class UserRead(schemas.BaseUser[int]):
    id: int
    username: str
    user_status: AccountStatus

    email: str
    is_active: bool
    is_superuser: bool
    is_verified: bool


class UserCreate(schemas.BaseUserCreate):
    id: int
    username: str
    user_status: AccountStatus
    password: str

    email: str
    is_active: bool
    is_superuser: bool
    is_verified: bool

    class Config:
        # This setting allows using ORM objects directly
        from_attributes = True


class UserUpdate(schemas.BaseUserUpdate):
    id: int
    username: str
    user_status: AccountStatus

    email: str
    password: str
    is_active: bool
    is_superuser: bool
    is_verified: bool

    class Config:
        # This setting allows using ORM objects directly
        from_attributes = True