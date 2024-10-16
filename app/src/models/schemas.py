import datetime
from pydantic import BaseModel, Field
from typing import Optional
from app.src.models.models import AccountStatus


class UserSchema(BaseModel):
    id: int
    username: str
    password: str
    user_status: AccountStatus

    class Config:
        # This setting allows using ORM objects directly
        from_attributes = True


class EventSchema(BaseModel):
    id: int
    roe: Optional[float] = Field(None, description="Return on Equity")
    title: str
    category: str
    date: str
    url: str

    class Config:
        from_attributes = True

