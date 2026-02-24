from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ScoreBreakdown(BaseModel):
    skills_match: float = 0.0
    experience_relevance: float = 0.0
    project_quality: float = 0.0
    cultural_fit: float = 0.0
    link_verification: float = 0.0


class ATSScoreBase(BaseModel):
    resume_id: str
    job_id: str


class ATSScoreInDB(ATSScoreBase):
    id: Optional[str] = Field(default=None, alias="_id")
    overall_score: float = 0.0
    breakdown: ScoreBreakdown = Field(default_factory=ScoreBreakdown)
    feedback: dict = {}
    suggestions: list[str] = []
    matched_skills: list[str] = []
    missing_skills: list[str] = []
    tokens_used: int = 0
    estimated_cost: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class ATSScorePublic(ATSScoreBase):
    id: str
    overall_score: float
    breakdown: ScoreBreakdown
    feedback: dict
    suggestions: list[str]
    matched_skills: list[str]
    missing_skills: list[str]
    created_at: datetime

    class Config:
        populate_by_name = True


class ScoreRequest(BaseModel):
    resume_id: str
    job_id: str
