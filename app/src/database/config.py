from sqlalchemy.orm import declarative_base
from db import DBManager

DATABASE_URL = "postgresql://postgres:1234567@localhost/EventToolDB"

Base = declarative_base()
db_manager = DBManager(DATABASE_URL)

