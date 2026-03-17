import json
from typing import Optional

import httpx
from pydantic import BaseModel, Field, ValidationError

from app.config import settings

CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions"

ATS_PROMPT_TEMPLATE = """You are an expert ATS (Applicant Tracking System) scoring system.

Analyze the following resume against the job description and provide a detailed evaluation.

## Resume Text:
{resume_text}

## Job Description:
{job_description}

## Required Skills:
{required_skills}

Return ONLY valid JSON in the following format:
{{
  "overall_score": <0-100>,
  "breakdown": {{
    "skills_match": <0-100>,
    "experience_relevance": <0-100>,
    "project_quality": <0-100>,
    "cultural_fit": <0-100>
  }},
  "matched_skills": ["skill1", "skill2"],
  "missing_skills": ["skill3", "skill4"],
  "feedback": {{
    "strengths": "Brief paragraph on candidate strengths",
    "weaknesses": "Brief paragraph on candidate weaknesses",
    "overall": "Brief overall assessment"
  }},
  "suggestions": [
    "Actionable improvement 1",
    "Actionable improvement 2",
    "Actionable improvement 3"
  ]
}}
"""


class _LLMBreakdown(BaseModel):
    skills_match: float = Field(ge=0, le=100)
    experience_relevance: float = Field(ge=0, le=100)
    project_quality: float = Field(ge=0, le=100)
    cultural_fit: float = Field(ge=0, le=100)


class _LLMFeedback(BaseModel):
    strengths: str = ""
    weaknesses: str = ""
    overall: str = ""


class _LLMResult(BaseModel):
    overall_score: float = Field(ge=0, le=100)
    breakdown: _LLMBreakdown
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    feedback: _LLMFeedback = Field(default_factory=_LLMFeedback)
    suggestions: list[str] = Field(default_factory=list)


def _extract_json_block(content: str) -> str:
    """Extract the first top-level JSON object from model text output."""
    start = content.find("{")
    if start == -1:
        raise ValueError("LLM response does not contain JSON")

    depth = 0
    for i in range(start, len(content)):
        ch = content[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return content[start : i + 1]

    raise ValueError("LLM JSON object is not balanced")


def _to_result_dict(validated: _LLMResult) -> dict:
    return {
        "overall_score": round(float(validated.overall_score), 2),
        "breakdown": {
            "skills_match": round(float(validated.breakdown.skills_match), 2),
            "experience_relevance": round(float(validated.breakdown.experience_relevance), 2),
            "project_quality": round(float(validated.breakdown.project_quality), 2),
            "cultural_fit": round(float(validated.breakdown.cultural_fit), 2),
        },
        "matched_skills": validated.matched_skills,
        "missing_skills": validated.missing_skills,
        "feedback": validated.feedback.model_dump(),
        "suggestions": validated.suggestions,
    }


async def score_resume_with_llm(
    resume_text: str,
    job_description: str,
    required_skills: list[str],
    github_score: Optional[float] = None,
) -> dict:
    """Call Cerebras LLM to score a resume against a job description."""

    if not settings.CEREBRAS_API_KEY:
        # Return a rule-based mock score when no API key is configured
        return _rule_based_score(
            resume_text,
            required_skills,
            github_score=github_score,
            fallback_reason="CEREBRAS_API_KEY not set",
        )

    prompt = ATS_PROMPT_TEMPLATE.format(
        resume_text=resume_text[:4000],  # truncate to avoid token overflow
        job_description=job_description[:2000],
        required_skills=", ".join(required_skills),
    )

    payload = {
        "model": settings.CEREBRAS_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 1024,
        "temperature": 0.2,
    }

    headers = {
        "Authorization": f"Bearer {settings.CEREBRAS_API_KEY}",
        "Content-Type": "application/json",
    }

    total_tokens = 0
    parse_or_validation_error = None

    async with httpx.AsyncClient(timeout=60) as client:
        for attempt in range(2):
            payload["messages"] = [{"role": "user", "content": prompt}]
            if attempt == 1:
                payload["messages"][0]["content"] += (
                    "\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no prose, no code fences."
                )

            try:
                response = await client.post(CEREBRAS_API_URL, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                total_tokens += data.get("usage", {}).get("total_tokens", 0)
                content = data["choices"][0]["message"]["content"]

                raw_json = _extract_json_block(content)
                parsed = json.loads(raw_json)
                validated = _LLMResult.model_validate(parsed)
                result = _to_result_dict(validated)

                # Blend link-verification score (30%) with LLM score (70%)
                if github_score is not None:
                    llm_score = result.get("overall_score", 0)
                    result["overall_score"] = round(llm_score * 0.7 + github_score * 0.3, 2)

                result["tokens_used"] = total_tokens
                result["estimated_cost"] = round(total_tokens * 0.00000094, 6)
                result["llm_provider"] = "cerebras"
                result["model_name"] = settings.CEREBRAS_MODEL
                return result
            except (ValueError, json.JSONDecodeError, ValidationError) as exc:
                parse_or_validation_error = str(exc)
                continue
            except httpx.HTTPError as exc:
                return _rule_based_score(
                    resume_text,
                    required_skills,
                    github_score=github_score,
                    fallback_reason=f"Cerebras request failed: {exc}",
                )

    return _rule_based_score(
        resume_text,
        required_skills,
        github_score=github_score,
        fallback_reason=f"Malformed LLM output after retry: {parse_or_validation_error}",
    )


def _rule_based_score(
    resume_text: str,
    required_skills: list[str],
    github_score: Optional[float] = None,
    fallback_reason: Optional[str] = None,
) -> dict:
    """Fallback rule-based scorer when no LLM key is available."""
    text_lower = resume_text.lower()
    matched = [s for s in required_skills if s.lower() in text_lower]
    missing = [s for s in required_skills if s.lower() not in text_lower]

    ratio = len(matched) / max(len(required_skills), 1)
    llm_like_score = round(ratio * 80, 2)  # max 80 for rule-based
    overall_score = llm_like_score
    if github_score is not None:
        overall_score = round(llm_like_score * 0.7 + github_score * 0.3, 2)

    return {
        "overall_score": overall_score,
        "breakdown": {
            "skills_match": round(ratio * 100),
            "experience_relevance": llm_like_score,
            "project_quality": 50,
            "cultural_fit": 50,
        },
        "matched_skills": matched,
        "missing_skills": missing,
        "feedback": {
            "strengths": "Matched key skills from the job description.",
            "weaknesses": fallback_reason or "No LLM analysis available.",
            "overall": f"Rule-based score: {len(matched)}/{len(required_skills)} required skills matched.",
        },
        "suggestions": [
            f"Add missing skill: {s}" for s in missing[:5]
        ],
        "tokens_used": 0,
        "estimated_cost": 0.0,
        "llm_provider": "rule-based",
        "model_name": "fallback",
        "fallback_reason": fallback_reason,
    }
