from config import DATABASE_URL
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, select, MetaData, Table


class DBManager:
    def __init__(self, database_url: str = DATABASE_URL):
        self._engine = create_engine(database_url)
        self._Session = sessionmaker(bind=self._engine)
        self.session = self._Session()

    def select_all_from_table(self, table_name: str):
        """ function of sql-method SELECT (all rows) -table_name- """

        metadata = MetaData()
        table = Table(table_name, metadata, autoload_with=self.engine)

        with self.engine.connect() as connection:
            stmt = select(table)
            result = connection.execute(stmt)
            return result.fetchall()

    @property
    def engine(self):
        return self._engine


