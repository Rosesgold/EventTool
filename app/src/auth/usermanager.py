import smtplib
from typing import Optional
from fastapi import Request, HTTPException
from fastapi.openapi.models import Response
from fastapi_users import BaseUserManager, IntegerIDMixin
from itsdangerous import URLSafeTimedSerializer
from sqlalchemy import select
from app.src.auth.cookie_jwt_config import encode_jwt, decode_jwt
from app.src.database.config import SECRET_KEY as SECRET, async_session_maker
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pydantic import EmailStr
from app.src.database.config import SMTP_SERVER, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD
from app.src.models.models import UserORM


async def send_verification_email(email: EmailStr, token: str):
    # Ссылка для подтверждения
    verification_link = f"http://127.0.0.1:8000/auth/verify-email?token={token}"
    # print(f"Verification link: {verification_link}")  # Для проверки URL
    # Формирование сообщения
    msg = MIMEMultipart()
    msg['From'] = SMTP_USERNAME
    msg['To'] = email
    msg['Subject'] = "Please confirm your email"

    body = f"Click on the following link to verify your email: {verification_link}"
    msg.attach(MIMEText(body, 'html'))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.sendmail(SMTP_USERNAME, email, msg.as_string())
        server.quit()

        print("Verification email sent successfully!")
    except Exception as e:
        print(f"Failed to send email: {e}")


class UserManager(IntegerIDMixin, BaseUserManager[UserORM, int]):
    reset_password_token_secret = SECRET
    verification_token_secret = SECRET

    def get_serializer(self):
        return URLSafeTimedSerializer(self.verification_token_secret)

    @staticmethod
    async def generate_verification_token(user: UserORM) -> str:
        data = {"email": user.email}
        return encode_jwt(data)

    async def get_user_by_verification_token(self, token: str):
        try:
            data = decode_jwt(token)
            email = data.get("email")
            return await self.user_db.get_by_email(email)
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

    async def on_after_request_verify(
            self, user: UserORM, token: str, request: Optional[Request] = None
    ):
        user = await self.get_user_by_verification_token(token)
        if not user:
            raise HTTPException(status_code=400, detail="Invalid token")
        await self.confirm(user)
        print(f"Verification requested for user {user.id}. Verification token: {token}")

    async def on_after_login(self, user: UserORM, request: Optional[Request] = None,
                             response: Optional[Response] = None, ):
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Please verify your email before logging in")
        print(f"User {user.email} has logged in.")