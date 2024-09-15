from pydantic import BaseModel
from app.src.models.models import AccountStatus


class UserSchema(BaseModel):
    id: int
    username: str
    password: str
    user_status: AccountStatus

    class Config:
        # This setting allows using ORM objects directly
        from_attributes = True



