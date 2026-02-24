from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ExtractedLinks(BaseModel):
    github: Optional[str] = None
    linkedin: Optional[str] = None
    portfolio: Optional[str] = None
    huggingface: Optional[str] = None
    leetcode: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    other: list[str] = []


class ResumeBase(BaseModel):
    filename: str
    file_size: Optional[int] = None


class ResumeInDB(ResumeBase):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    parsed_text: str = ""
    extracted_links: ExtractedLinks = Field(default_factory=ExtractedLinks)
    skills: list[str] = []
    sections: dict = {}
    status: str = "pending"  # pending | parsed | failed
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class ResumePublic(ResumeBase):
    id: str
    user_id: str
    extracted_links: ExtractedLinks
    skills: list[str]
    status: str
    uploaded_at: datetime
    parsed_text: Optional[str] = None

    class Config:
        populate_by_name = True
