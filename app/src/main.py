from fastapi import FastAPI, Depends, APIRouter, Form
from fastapi_users import FastAPIUsers
from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import HTMLResponse
from fastapi import HTTPException
from app.src.auth.aurhschemas import UserRead, UserCreate
from app.src.auth.cookie_jwt_config import auth_backend
from app.src.auth.usermanager import UserManager
from app.src.models.models import UserORM, EventORM
from sqlalchemy import select
from app.src.models.schemas import *
from app.src.database.config import async_session_maker


app = FastAPI()
verify = APIRouter()


async def get_async_session() -> AsyncSession:
    """ function is responsible for creating an asynchronous session and passing it to dependencies """
    async with async_session_maker() as session:
        yield session


async def get_user_db(session: AsyncSession = Depends(get_async_session)):
    yield SQLAlchemyUserDatabase(session, UserORM)


async def get_user_manager(user_db=Depends(get_user_db)):
    yield UserManager(user_db)


fastapi_users = FastAPIUsers[UserORM, int](
    get_user_manager,
    [auth_backend],
)


app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"],
)


app.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="/auth",
    tags=["auth"],
)


@verify.post("/verify")
async def verify_user(token: str = Form(...), user_manager: UserManager = Depends(get_user_manager)):
    print(f"Received token: {token}")  # Проверка значения токена
    if not token:
        raise HTTPException(status_code=400, detail="Token is missing")

    try:
        user = await user_manager.get_user_by_verification_token(token)
    except Exception as e:
        print(f"Error while getting user by token: {e}")
        raise HTTPException(status_code=400, detail="Error retrieving user")

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    try:
        await user_manager.confirm(user)
    except Exception as e:
        print(f"Error while confirming user: {e}")
        raise HTTPException(status_code=500, detail="Error confirming user")

    return {"detail": "Email successfully verified"}


@app.get("/auth/verify-email")
async def serve_verification_page(token: str):
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Email Verification</title>
    </head>
    <body>
        <h1>Email Verification</h1>
        <p>Click the button below to verify your email:</p>
        <form action="/auth/verify" method="POST">
            <input type="hidden" name="token" value="{token}">
            <button type="submit">Verify Email</button>
        </form>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)


app.include_router(
    verify,
    prefix="/auth",
    tags=["auth"],
)


@app.get("/")
async def main_page():
    return {"status": 200}


@app.get("/profile")
async def get_user_profile():
    pass


@app.get("/users", response_model=list[UserSchema])
async def get_users(id_: int = None, db: AsyncSession = Depends(get_async_session)):
    if id_ is None:
        result = await db.execute(select(UserORM))
    else:
        result = await db.execute(select(UserORM).filter_by(id=id_))
    users = result.scalars().all()
    return users




