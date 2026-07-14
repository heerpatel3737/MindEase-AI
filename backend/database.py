import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Dual Database Routing Engine
# If DATABASE_URL is provided (e.g. from Supabase), we connect to it.
# Otherwise, we fallback to local zero-config SQLite.
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # SQLAlchemy requires connection strings starting with postgresql:// or postgresql+driver://
    # Supabase typically provides connection strings starting with postgres://
    # Also, we enforce the pg8000 pure-python driver to avoid C-compilation dependencies.
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+pg8000://", 1)
    elif DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+pg8000://", 1)
        
    print(f"DATABASE CONNECTION: Connecting to PostgreSQL (Supabase/External) via pg8000.")
    # PostgreSQL configuration
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=3600
    )
else:
    # Local SQLite fallback
    DB_PATH = os.path.join(os.path.dirname(__file__), "mindease.db")
    DATABASE_URL = f"sqlite:///{DB_PATH}"
    print(f"DATABASE CONNECTION: Connecting to local offline SQLite database ({DB_PATH}).")
    # SQLite configuration (requires check_same_thread=False for FastAPI concurrency)
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )

def is_postgres() -> bool:
    return DATABASE_URL.startswith("postgresql")

# Create Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative Base for models
Base = declarative_base()

def get_db():
    """
    Database Session Dependency injection for FastAPI endpoints.
    Ensures sessions are closed properly after request-response cycles.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
