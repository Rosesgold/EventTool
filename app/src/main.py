from fastapi import FastAPI, Depends, APIRouter, Form
from fastapi_users import FastAPIUsers
from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request
from starlette.responses import HTMLResponse, Response
from fastapi import HTTPException
from app.src.auth.authschemas import UserRead, UserCreate, UserUpdate
from app.src.auth.cookie_jwt_config import auth_backend
from app.src.auth.usermanager import UserManager
from app.src.models.models import UserORM, EventORM
from sqlalchemy import select
from app.src.models.schemas import *
from app.src.database.config import async_session_maker
from fastapi.templating import Jinja2Templates


app = FastAPI()

verify = APIRouter()
verify_email = APIRouter()
delete_current_user = APIRouter()
update_current_user = APIRouter()

templates = Jinja2Templates(directory="app/templates")


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


@delete_current_user.delete('/delete/me')
async def delete_my_account(
        user: UserORM = Depends(fastapi_users.current_user(active=True, verified=True)),
        user_manager: UserManager = Depends(get_user_manager),
        response: Response = None):
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await user_manager.delete(user)

    response.delete_cookie("fastapiusersauth")
    return {"detail": f"User {user.username} deleted successfully!"}


@update_current_user.patch('/update/me')
async def update_my_account(
        user_update_data: UserUpdate,
        user: UserORM = Depends(fastapi_users.current_user(active=True, verified=True)),
        user_manager: UserManager = Depends(get_user_manager),
        response: Response = None):
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_update_data.username is None or user_update_data.username == "string":
        user_update_data.username = user.username

    if user_update_data.email is None or user_update_data.email == "string":
        user_update_data.email = user.email

    if user_update_data.password == "string":
        user_update_data.password = None

    # Обновляем пользователя в базе данных
    await user_manager.update(user_update_data, user, safe=True)

    return {"detail": f"User {user.username} updated their data"}


@verify_email.get("/verify-email")
async def serve_verification_page(request: Request, token: str):
    return templates.TemplateResponse("email_verification.html", {"request": request, "token": token})


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

app.include_router(
    fastapi_users.get_reset_password_router(),
    prefix="/auth",
    tags=["auth"],
)

# app.include_router(
#     fastapi_users.get_users_router(UserRead, UserUpdate, requires_verification=False),
#     prefix="/auth",
#     tags=["auth"]
# )

app.include_router(
    verify,
    prefix="/auth",
    tags=["auth"],
)

app.include_router(
    verify_email,
    prefix="/auth",
    tags=["auth"],
)

app.include_router(
    delete_current_user,
    prefix="/auth",
    tags=["auth"]
)

app.include_router(
    update_current_user,
    prefix="/auth",
    tags=["auth"]
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
