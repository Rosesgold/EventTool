from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from dotenv import load_dotenv
import os


load_dotenv()   # завантаження змінних з .env

DATABASE_URL = os.getenv('DATABASE_URL')
SECRET_KEY = os.getenv('SECRET_KEY')
ALGORITHM = os.getenv('ALGORITHM')
SMTP_SERVER = os.getenv('SMTP_SERVER')
SMTP_PORT = os.getenv('SMTP_PORT')
SMTP_USERNAME = os.getenv('SMTP_USERNAME')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD')

Base = declarative_base()

# creating an asynchronous engine for interaction with PostgreSQL via asyncpg
engine = create_async_engine(DATABASE_URL, echo=True)

# creating factories for asynchronous sessions. Sessions are used to perform database queries
async_session_maker = async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)



