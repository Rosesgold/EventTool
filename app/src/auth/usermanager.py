import smtplib
from typing import Optional
from fastapi import Request, HTTPException
from fastapi.openapi.models import Response
from fastapi_users import BaseUserManager, IntegerIDMixin
from itsdangerous import URLSafeTimedSerializer
from sqlalchemy import select
from app.src.auth.cookie_jwt_config import encode_jwt, decode_jwt
from app.src.settings.config import SECRET_KEY as SECRET, async_session_maker
from app.src.models.models import UserORM
from app.src.auth.send_email import send_verification_email, send_updated_data_email


class UserManager(IntegerIDMixin, BaseUserManager[UserORM, int]):
    reset_password_token_secret = SECRET
    verification_token_secret = SECRET

    def get_serializer(self):
        return URLSafeTimedSerializer(self.verification_token_secret)

    @staticmethod
    async def generate_verification_token(user: UserORM) -> str:
        # data = {"email": user.email}
        data = {"id": user.id}
        return encode_jwt(data)

    async def get_user_by_verification_token(self, token: str):
        try:
            data = decode_jwt(token)
            # email = data.get("email")
            # return await self.user_db.get_by_email(email)
            id_user = data.get("id")
            return await self.user_db.get(id_user)
        except HTTPException as e:
            raise e

    async def on_after_register(self, user: UserORM, request: Request = None):
        verification_token = await self.generate_verification_token(user)
        await send_verification_email(user.email, verification_token)

    @staticmethod
    async def confirm(user: UserORM):
        async with async_session_maker() as session:  # Получаем асинхронную сессию
            async with session.begin():  # Начинаем транзакцию
                # Находим пользователя по ID
                stmt = select(UserORM).where(UserORM.id == user.id)
                result = await session.execute(stmt)
                db_user = result.scalar_one_or_none()

                if not db_user:
                    raise HTTPException(status_code=404, detail="User not found")

                # Обновляем статус пользователя
                db_user.is_verified = True
                session.add(db_user)  # Добавляем пользователя обратно в сессию
                await session.commit()  # Коммитим изменения

    async def verify(self, token: str, request: Optional[Request] = None):
        user = await self.get_user_by_verification_token(token)
        if not user:
            raise HTTPException(status_code=400, detail="Invalid or expired token")
        await self.confirm(user)

    async def on_after_forgot_password(
            self, user: UserORM, token: str, request: Optional[Request] = None
    ):
        print(f"User {user.id} has forgot their password. Reset token: {token}")

    async def on_after_reset_password(
            self, user: UserORM, request: Optional[Request] = None
    ):
        print(f"User {user.id}, email: {user.email} has got a new password")

    async def on_after_request_verify(
            self, user: UserORM, token: str, request: Optional[Request] = None
    ):
        user = await self.get_user_by_verification_token(token)
        if not user:
            raise HTTPException(status_code=400, detail="Invalid token")
        await self.confirm(user)
        print(f"Verification requested for user {user.id}. Verification token: {token}")

    async def on_after_login(
            self, user: UserORM, request: Optional[Request] = None, response: Optional[Response] = None, ):
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Please verify your email before logging in")
        print(f"User {user.email} has logged in.")

    async def on_after_update(
            self, user: UserORM, update_dict: dict, request: Optional[Request] = None) -> None:

        await send_updated_data_email(update_dict, user.email)

        if not user.is_verified:
            verification_token = await self.generate_verification_token(user)
            await send_verification_email(user.email, verification_token)
