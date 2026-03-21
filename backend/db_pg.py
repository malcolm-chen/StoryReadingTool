"""
PostgreSQL via SQLAlchemy for StoryBook users.
"""
from __future__ import annotations

import os
from typing import Optional
from contextlib import contextmanager
from urllib.parse import quote_plus

from sqlalchemy import String, Text, create_engine, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


def _database_url() -> str:
    user = quote_plus(os.environ["PGUSER"])
    password = quote_plus(os.environ["PGPASSWORD"])
    host = os.environ["PGHOST"]
    port = int(os.environ.get("PGPORT", "5432"))
    dbname = quote_plus(os.environ["PGDATABASE"])
    return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{dbname}"


def _connect_args() -> dict:
    return {"sslmode": os.environ.get("PGSSLMODE", "require")}


def ensure_database_exists() -> None:
    """
    Create PGDATABASE if it does not exist (uses PG_MAINTENANCE_DB, default 'postgres').
    Set PG_AUTO_CREATE_DATABASE=0 to skip (e.g. you create DB only in the console).
    """
    if os.environ.get("PG_AUTO_CREATE_DATABASE", "1").lower() in ("0", "false", "no"):
        return
    target = os.environ.get("PGDATABASE")
    if not target:
        return
    maintenance = os.environ.get("PG_MAINTENANCE_DB", "postgres")
    if target == maintenance:
        return

    import psycopg2
    import psycopg2.extensions
    from psycopg2 import sql

    conn = psycopg2.connect(
        host=os.environ["PGHOST"],
        port=os.environ.get("PGPORT", "5432"),
        user=os.environ["PGUSER"],
        password=os.environ["PGPASSWORD"],
        dbname=maintenance,
        sslmode=os.environ.get("PGSSLMODE", "require"),
    )
    conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM pg_database WHERE datname = %s",
                (target,),
            )
            if cur.fetchone():
                return
            cur.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(target)))
    except Exception as e:
        raise RuntimeError(
            f'Could not create database "{target}". Either create it in the AWS/Lightsail '
            f"console, or ensure PGUSER can CREATE DATABASE. Original error: {e}"
        ) from e
    finally:
        conn.close()


_engine = None
SessionLocal = sessionmaker(autocommit=False, autoflush=False)


def get_engine():
    global _engine
    if _engine is None:
        _engine = create_engine(
            _database_url(),
            connect_args=_connect_args(),
            pool_pre_ping=True,
        )
        SessionLocal.configure(bind=_engine)
    return _engine


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(
        String(512),
        unique=True,
        nullable=False,
        index=True,
    )
    password: Mapped[str] = mapped_column(Text, nullable=False)
    current_book: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    current_page: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    asked_questions: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )
    chat_history: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )


def ensure_schema() -> None:
    ensure_database_exists()
    Base.metadata.create_all(get_engine(), checkfirst=True)


@contextmanager
def session_scope():
    get_engine()
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
