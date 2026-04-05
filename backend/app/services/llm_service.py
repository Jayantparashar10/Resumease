import json
from typing import Optional

import httpx
from pydantic import BaseModel, Field, ValidationError

from app.config import settings

CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions"

# Job-specific analysis prompts
JOB_SPECIFIC_PROMPTS = {
    "ai": """You are an expert AI/ML recruiting specialist. Evaluate the candidate's readiness for an AI/ML engineering role.

Focus on:
- Deep learning and neural network knowledge (TensorFlow, PyTorch)
- Experience with NLP, computer vision, or other ML domains
- Understanding of MLOps, model deployment, and scalability
- Python proficiency and data manipulation skills
- Research contributions or publications in ML fields
- Portfolio projects demonstrating ML capabilities

Evaluation criteria:
- Skills Match (50%): Technical ML/AI skills alignment
- Experience Relevance (25%): Relevant ML projects and roles
- Project Quality (25%): Complexity and impact of ML projects""",
    
    "intern": """You are an expert technical recruiter evaluating interns. Focus on learning potential and fundamentals.

Focus on:
- Understanding of data structures and algorithms
- Core programming language proficiency
- Ability to learn quickly
- Academic performance and relevant coursework
- Small projects or hackathon experiences
- Soft skills and communication ability
- Internship motivation and career goals

Evaluation criteria:
- Skills Match (40%): Programming fundamentals and required languages
- Experience Relevance (30%): Relevant projects, academic work, or previous internships
- Project Quality (30%): Quality of coding and problem-solving approach""",
    
    "sde": """You are an expert software engineering manager evaluating mid-level SDE positions.

Focus on:
- Backend development experience (APIs, databases, microservices)
- System design understanding and scalability thinking
- Code quality and engineering best practices
- Experience with cloud platforms and DevOps
- Full software development lifecycle understanding
- Team collaboration and communication
- Problem-solving and debugging approach

Evaluation criteria:
- Skills Match (40%): Backend languages, databases, cloud platforms
- Experience Relevance (35%): Years in production environments, scale of systems
- Project Quality (25%): Architecture decisions and performance optimization""",
    
    "data": """You are an expert data science recruiter. Evaluate the candidate's analytics capabilities.

Focus on:
- SQL and data manipulation expertise
- Statistical knowledge and analysis methodology
- Data visualization and dashboard creation skills
- Experience with analytics tools (Tableau, Power BI, Looker)
- Python/R usage for statistical analysis
- Business acumen and metric understanding
- Storytelling with data capability

Evaluation criteria:
- Skills Match (40%): SQL, statistics, visualization tools, analytics platforms
- Experience Relevance (35%): Data analysis projects, business analytics experience
- Project Quality (25%): Quality of insights and impact on decisions""",
    
    "business": """You are an expert business development recruiter. Evaluate the candidate's fit for BD/Sales roles.

Focus on:
- Sales track record and achievement of targets
- Relationship building and negotiation skills
- Market understanding and business acumen
- CRM and sales tools experience
- Deal closing ability and pipeline management
- Communication and presentation skills
- Strategic thinking and partnership development

Evaluation criteria:
- Skills Match (35%): Sales skills, CRM proficiency, communication
- Experience Relevance (40%): Sales/BD experience, target achievement, deal size
- Project Quality (25%): Quality of partnerships and strategic value""",
    
    "product": """You are an expert product management recruiter. Evaluate the candidate's PM readiness.

Focus on:
- Product strategy and roadmap experience
- User research and customer empathy
- Analytics and data-driven decision making
- Technical understanding and collaboration with engineers
- Cross-functional leadership and communication
- Agile/Scrum expertise
- Track record of successful product launches

Evaluation criteria:
- Skills Match (35%): Product strategy, analytics, Agile knowledge
- Experience Relevance (40%): PM experience, scale of products owned
- Project Quality (25%): Impact and success metrics of products"""
}

ATS_PROMPT_TEMPLATE = """You are an expert ATS (Applicant Tracking System) scoring system.

{job_focus}

Analyze the following resume against the job description and evaluate the candidate's fit.

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
        "project_quality": <0-100>
  }},
  "matched_skills": ["skill1", "skill2"],
  "missing_skills": ["skill3", "skill4"],
  "feedback": {{
    "strengths": "Brief paragraph on candidate strengths for this role",
    "weaknesses": "Brief paragraph on gaps and areas to improve for this role",
    "overall": "Overall assessment and recommendation"
  }},
  "suggestions": [
    "Specific action 1 to improve fit for this role",
    "Specific action 2 to improve fit for this role",
    "Specific action 3 to improve fit for this role"
  ]
}}
"""

def _get_job_focus_prompt(job_title: str) -> str:
    """Get job-specific analysis focus based on job title."""
    title_lower = job_title.lower()
    
    if "ai" in title_lower or "ml" in title_lower or "machine" in title_lower:
        return JOB_SPECIFIC_PROMPTS["ai"]
    elif "intern" in title_lower:
        return JOB_SPECIFIC_PROMPTS["intern"]
    elif "sde" in title_lower or ("engineer" in title_lower and "software" in title_lower):
        return JOB_SPECIFIC_PROMPTS["sde"]
    elif "data" in title_lower and ("analyst" in title_lower or "scientist" in title_lower):
        return JOB_SPECIFIC_PROMPTS["data"]
    elif "business" in title_lower or ("development" in title_lower and "business" in title_lower):
        return JOB_SPECIFIC_PROMPTS["business"]
    elif "product" in title_lower:
        return JOB_SPECIFIC_PROMPTS["product"]
    else:
        # Default generic prompt
        return "You are an expert ATS specialist. Evaluate the candidate's overall fit for the position."


class _LLMBreakdown(BaseModel):
    skills_match: float = Field(ge=0, le=100)
    experience_relevance: float = Field(ge=0, le=100)
    project_quality: float = Field(ge=0, le=100)


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
    job_title: str = "Software Position",
    github_score: Optional[float] = None,
    portfolio_score: Optional[float] = None,
) -> dict:
    """Call Cerebras LLM to score a resume against a job description with job-specific analysis."""

    if not settings.CEREBRAS_API_KEY:
        # Return a rule-based mock score when no API key is configured
        return _rule_based_score(
            resume_text,
            required_skills,
            github_score=github_score,
            portfolio_score=portfolio_score,
            fallback_reason="CEREBRAS_API_KEY not set",
        )

    job_focus = _get_job_focus_prompt(job_title)
    prompt = ATS_PROMPT_TEMPLATE.format(
        job_focus=job_focus,
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

                # Blend link-verification scores
                llm_score = result.get("overall_score", 0)
                
                if github_score is not None and portfolio_score is not None:
                    # 60% LLM, 25% GitHub, 15% Portfolio
                    result["overall_score"] = round(llm_score * 0.6 + github_score * 0.25 + portfolio_score * 0.15, 2)
                elif github_score is not None:
                    # 70% LLM, 30% GitHub
                    result["overall_score"] = round(llm_score * 0.7 + github_score * 0.3, 2)
                elif portfolio_score is not None:
                    # 80% LLM, 20% Portfolio
                    result["overall_score"] = round(llm_score * 0.8 + portfolio_score * 0.2, 2)

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
                    portfolio_score=portfolio_score,
                    fallback_reason=f"Cerebras request failed: {exc}",
                )

    return _rule_based_score(
        resume_text,
        required_skills,
        github_score=github_score,
        portfolio_score=portfolio_score,
        fallback_reason=f"Malformed LLM output after retry: {parse_or_validation_error}",
    )


def _rule_based_score(
    resume_text: str,
    required_skills: list[str],
    github_score: Optional[float] = None,
    portfolio_score: Optional[float] = None,
    fallback_reason: Optional[str] = None,
) -> dict:
    """Fallback rule-based scorer when no LLM key is available."""
    text_lower = resume_text.lower()
    matched = [s for s in required_skills if s.lower() in text_lower]
    missing = [s for s in required_skills if s.lower() not in text_lower]

    ratio = len(matched) / max(len(required_skills), 1)
    llm_like_score = round(ratio * 80, 2)  # max 80 for rule-based
    overall_score = llm_like_score
    
    if github_score is not None and portfolio_score is not None:
        overall_score = round(llm_like_score * 0.6 + github_score * 0.25 + portfolio_score * 0.15, 2)
    elif github_score is not None:
        overall_score = round(llm_like_score * 0.7 + github_score * 0.3, 2)
    elif portfolio_score is not None:
        overall_score = round(llm_like_score * 0.8 + portfolio_score * 0.2, 2)

    return {
        "overall_score": overall_score,
        "breakdown": {
            "skills_match": round(ratio * 100),
            "experience_relevance": llm_like_score,
            "project_quality": 50,
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
