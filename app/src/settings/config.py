from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv
from sqlalchemy import create_engine
import os


load_dotenv()   # loading variables from .env

DATABASE_URL = os.getenv('DATABASE_URL')
SECRET_KEY = os.getenv('SECRET_KEY')
ALGORITHM = os.getenv('ALGORITHM')
SMTP_SERVER = os.getenv('SMTP_SERVER')
SMTP_PORT = os.getenv('SMTP_PORT')
SMTP_USERNAME = os.getenv('SMTP_USERNAME')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD')
API_GUARDIAN_KEY = os.getenv('API_GUARDIAN_KEY')
DATABASE_URL_SYNC = os.getenv('DATABASE_URL_SYNC')

Base = declarative_base()

# creating an asynchronous engine for interaction with PostgreSQL via asyncpg
async_engine = create_async_engine(DATABASE_URL, echo=True)

# creating factories for asynchronous sessions. Sessions are used to perform settings queries
async_session_maker = async_sessionmaker(bind=async_engine, expire_on_commit=False, class_=AsyncSession)

# creating a synchronous engine for interaction with PostgreSQL
engine = create_engine(DATABASE_URL_SYNC, echo=True)

# creating factories for synchronous sessions
session_maker = sessionmaker(bind=engine, expire_on_commit=False)
