from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import settings
from app.services.supabase_auth import (
    SupabaseAuthError,
    get_profile,
    get_user_from_access_token,
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(hours=settings.JWT_EXPIRE_HOURS)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials
    try:
        sb_user = await get_user_from_access_token(token)
        user_id = sb_user.get("id")
        email = sb_user.get("email")
        metadata = sb_user.get("user_metadata") or {}
        profile = await get_profile(user_id) if user_id else None

        merged_user = {
            "_id": user_id,
            "email": email,
            "full_name": (
                (profile or {}).get("full_name")
                or metadata.get("full_name")
                or metadata.get("name")
                or (email.split("@")[0] if email else "user")
            ),
            "role": (profile or {}).get("role", "student"),
            "avatar_url": (profile or {}).get("avatar_url") or metadata.get("avatar_url") or metadata.get("picture"),
            "onboarding_completed": (profile or {}).get("onboarding_completed", False),
            "onboarding_data": (profile or {}).get("onboarding_data", {}),
            "created_at": (profile or {}).get("created_at") or datetime.now(timezone.utc),
            "is_active": (profile or {}).get("is_active", True),
        }

        if not merged_user.get("is_active", True):
            raise HTTPException(status_code=403, detail="User account is inactive")

        return merged_user
    except SupabaseAuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))


async def get_current_onboarded_user(user=Depends(get_current_user)):
    if not user.get("onboarding_completed", False):
        raise HTTPException(status_code=403, detail="Complete onboarding to access this resource")
    return user


async def get_current_onboarded_student(user=Depends(get_current_onboarded_user)):
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    return user


async def get_current_recruiter(user=Depends(get_current_user)):
    if user.get("role") != "recruiter":
        raise HTTPException(status_code=403, detail="Recruiter access required")
    return user


async def get_current_onboarded_recruiter(user=Depends(get_current_onboarded_user)):
    if user.get("role") != "recruiter":
        raise HTTPException(status_code=403, detail="Recruiter access required")
    return user
