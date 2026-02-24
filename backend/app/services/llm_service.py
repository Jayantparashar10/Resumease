import json
import re
from typing import Optional

import httpx

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


async def score_resume_with_llm(
    resume_text: str,
    job_description: str,
    required_skills: list[str],
    github_score: Optional[float] = None,
) -> dict:
    """Call Cerebras LLM to score a resume against a job description."""

    if not settings.CEREBRAS_API_KEY:
        # Return a rule-based mock score when no API key is configured
        return _rule_based_score(resume_text, required_skills)

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

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(CEREBRAS_API_URL, json=payload, headers=headers)
        response.raise_for_status()

    data = response.json()
    content = data["choices"][0]["message"]["content"]
    tokens_used = data.get("usage", {}).get("total_tokens", 0)

    # Extract JSON from response
    json_match = re.search(r"\{.*\}", content, re.DOTALL)
    if not json_match:
        raise ValueError("LLM did not return valid JSON")

    result = json.loads(json_match.group())

    # Blend link-verification score (30%) with LLM score (70%)
    if github_score is not None:
        llm_score = result.get("overall_score", 0)
        result["overall_score"] = round(llm_score * 0.7 + github_score * 0.3)

    result["tokens_used"] = tokens_used
    result["estimated_cost"] = round(tokens_used * 0.00000094, 6)  # Cerebras pricing

    return result


def _rule_based_score(resume_text: str, required_skills: list[str]) -> dict:
    """Fallback rule-based scorer when no LLM key is available."""
    text_lower = resume_text.lower()
    matched = [s for s in required_skills if s.lower() in text_lower]
    missing = [s for s in required_skills if s.lower() not in text_lower]

    ratio = len(matched) / max(len(required_skills), 1)
    score = round(ratio * 80)  # max 80 for rule-based

    return {
        "overall_score": score,
        "breakdown": {
            "skills_match": round(ratio * 100),
            "experience_relevance": score,
            "project_quality": 50,
            "cultural_fit": 50,
        },
        "matched_skills": matched,
        "missing_skills": missing,
        "feedback": {
            "strengths": "Matched key skills from the job description.",
            "weaknesses": "No LLM analysis available (CEREBRAS_API_KEY not set).",
            "overall": f"Rule-based score: {len(matched)}/{len(required_skills)} required skills matched.",
        },
        "suggestions": [
            f"Add missing skill: {s}" for s in missing[:5]
        ],
        "tokens_used": 0,
        "estimated_cost": 0.0,
    }
