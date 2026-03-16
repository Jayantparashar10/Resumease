from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Literal, Optional
from datetime import datetime, timezone
from enum import Enum


class UserRole(str, Enum):
    STUDENT = "student"
    RECRUITER = "recruiter"
    ADMIN = "admin"


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.STUDENT


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class GoogleLoginRequest(BaseModel):
    id_token: str


class StudentOnboardingData(BaseModel):
    model_config = ConfigDict(extra="forbid")

    college: str = Field(min_length=2, max_length=120)
    degree: str = Field(min_length=2, max_length=120)
    graduation_year: int = Field(ge=2000, le=2100)
    target_roles: list[str] = Field(default_factory=list)
    skills_self_reported: list[str] = Field(default_factory=list)


class RecruiterOnboardingData(BaseModel):
    model_config = ConfigDict(extra="forbid")

    company: str = Field(min_length=2, max_length=120)
    designation: str = Field(min_length=2, max_length=120)
    hiring_for: list[str] = Field(default_factory=list)
    company_size: str = Field(min_length=1, max_length=50)


class OnboardingRequest(BaseModel):
    role: Literal["student", "recruiter"]
    data: dict


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    avatar_url: Optional[str] = None
    onboarding_data: Optional[dict] = None


class UserInDB(UserBase):
    id: Optional[str] = Field(default=None, alias="_id")
    password_hash: Optional[str] = None
    google_sub: Optional[str] = None
    avatar_url: Optional[str] = None
    onboarding_completed: bool = False
    onboarding_data: dict = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login_at: Optional[datetime] = None
    is_active: bool = True

    class Config:
        populate_by_name = True


class UserPublic(UserBase):
    id: str
    avatar_url: Optional[str] = None
    onboarding_completed: bool = False
    created_at: datetime
    is_active: bool

    class Config:
        populate_by_name = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic
    onboarding_completed: bool = False
