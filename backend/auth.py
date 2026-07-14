import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.orm import Session
from dotenv import load_dotenv

import models
from database import get_db

load_dotenv()

# OAuth2 scheme for token retrieval
# Since the frontend will pass the token in standard Authorization Headers
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

# Security Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "mindease-ultra-secure-cognitive-os-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
REFRESH_TOKEN_EXPIRE_DAYS = 7  # 7 days

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain text password against its bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """Generates a bcrypt hash for a plain text password."""
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generates a secure HS256 JWT Access Token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token_for_user(db: Session, user: models.User, days: int = REFRESH_TOKEN_EXPIRE_DAYS) -> str:
    """Creates a persistent refresh token record and returns the token string."""
    import secrets
    token = secrets.token_urlsafe(48)
    expires_at = datetime.utcnow() + timedelta(days=days)
    # store in DB
    rt = models.RefreshToken(user_id=user.id, token=token, expires_at=expires_at)
    db.add(rt)
    db.commit()
    db.refresh(rt)
    return token


def verify_refresh_token(db: Session, token: str) -> Optional[models.User]:
    """Verifies a refresh token string and returns the User if valid and not revoked/expired."""
    if not token:
        return None
    rt = db.query(models.RefreshToken).filter(models.RefreshToken.token == token).first()
    if not rt or rt.revoked:
        return None
    if rt.expires_at < datetime.utcnow():
        return None
    user = db.query(models.User).filter(models.User.id == rt.user_id).first()
    return user

def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    """
    FastAPI dependency that extracts and validates the JWT token,
    returning the authenticated User model.
    Throws a 401 Unauthorized exception if invalid or expired.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception
        
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
        
    return user


def revoke_refresh_token(db: Session, token: str) -> None:
    """Marks a refresh token as revoked so it can no longer be used."""
    if not token:
        return
    rt = db.query(models.RefreshToken).filter(models.RefreshToken.token == token).first()
    if not rt:
        return
    rt.revoked = True
    db.commit()


import re

def validate_password_strength(password: str) -> None:
    """
    Enforces strong password rules:
    - Minimum 8 characters.
    - At least one uppercase letter.
    - At least one lowercase letter.
    - At least one digit.
    - At least one special symbol.
    """
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )
    if not re.search(r"[A-Z]", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one uppercase letter."
        )
    if not re.search(r"[a-z]", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one lowercase letter."
        )
    if not re.search(r"\d", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one digit."
        )
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>\-_=+\\\/\[\];']", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one special symbol."
        )

