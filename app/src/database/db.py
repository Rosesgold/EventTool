from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, select, MetaData, Table
from sqlalchemy.ext.asyncio import AsyncSession


# class AsyncDBManager:
#     def __init__(self, session: AsyncSession):
#         self._session = session
#
#     async def select_from_table(self, table_name: str, id: int = None):
#         """ async function of sql-method SELECT (all records or record by id) -table_name- """
#         metadata = MetaData()
#         table = Table(table_name, metadata)
#
#         if id is None:
#             stmt = select(table)
#         else:
#             stmt = select(table).filter_by(id=id)
#
#         result = await self.session.execute(stmt)
#         return result.fetchall()
#
#     @property
#     def session(self):
#         return self._session
#
#
# class DBManager:
#     """ sync version of class """
#
#     def __init__(self, database_url: str):
#         self._engine = create_engine(database_url)
#         self._Session = sessionmaker(bind=self._engine)
#         self.session = self._Session()
#
#     def select_from_table(self, table_name: str, id: int = None):
#         """ function of sql-method SELECT (all records or record by id) -table_name- """
#
#         metadata = MetaData()
#         table = Table(table_name, metadata, autoload_with=self.engine)
#
#         with self.engine.connect() as connection:
#             if id is None:
#                 stmt = select(table)
#             else:
#                 stmt = select(table).filter_by(id=id)
#             result = connection.execute(stmt)
#             return result.fetchall()
#
#     @property
#     def engine(self):
#         return self._engine
