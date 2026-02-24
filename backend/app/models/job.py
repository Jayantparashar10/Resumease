from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class JobBase(BaseModel):
    title: str
    company: str
    description: str
    required_skills: list[str] = []
    location: Optional[str] = None
    experience_years: Optional[int] = None


class JobCreate(JobBase):
    pass


class JobInDB(JobBase):
    id: Optional[str] = Field(default=None, alias="_id")
    recruiter_id: str
    status: str = "active"
    posted_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class JobPublic(JobBase):
    id: str
    recruiter_id: str
    status: str
    posted_at: datetime

    class Config:
        populate_by_name = True
