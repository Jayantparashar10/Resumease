from fastapi import APIRouter, HTTPException, status, Depends
from bson import ObjectId
from datetime import datetime

from app.database import get_db
from app.models.user import UserCreate, UserLogin, UserPublic, TokenResponse
from app.services.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

router = APIRouter()


def serialize_user(user: dict) -> dict:
    user["_id"] = str(user["_id"])
    return user


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(user_data: UserCreate):
    db = get_db()
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    doc = {
        "email": user_data.email,
        "full_name": user_data.full_name,
        "role": user_data.role,
        "password_hash": hash_password(user_data.password),
        "created_at": datetime.utcnow(),
        "is_active": True,
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = str(result.inserted_id)

    token = create_access_token({"sub": doc["_id"], "role": doc["role"]})
    user_public = UserPublic(
        id=doc["_id"],
        email=doc["email"],
        full_name=doc["full_name"],
        role=doc["role"],
        created_at=doc["created_at"],
        is_active=doc["is_active"],
    )
    return TokenResponse(access_token=token, user=user_public)


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    db = get_db()
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user["_id"] = str(user["_id"])
    token = create_access_token({"sub": user["_id"], "role": user["role"]})
    user_public = UserPublic(
        id=user["_id"],
        email=user["email"],
        full_name=user["full_name"],
        role=user["role"],
        created_at=user["created_at"],
        is_active=user["is_active"],
    )
    return TokenResponse(access_token=token, user=user_public)


@router.get("/me", response_model=UserPublic)
async def me(current_user=Depends(get_current_user)):
    return UserPublic(
        id=current_user["_id"],
        email=current_user["email"],
        full_name=current_user["full_name"],
        role=current_user["role"],
        created_at=current_user["created_at"],
        is_active=current_user["is_active"],
    )
