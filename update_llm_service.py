import re

file_path = "backend/app/services/llm_service.py"
content = open(file_path).read()

# Update signature
old_sig = """async def score_resume_with_llm(
    resume_text: str,
    job_description: str,
    required_skills: list[str],
    job_title: str = "Software Position",
    github_score: Optional[float] = None,
) -> dict:"""

new_sig = """async def score_resume_with_llm(
    resume_text: str,
    job_description: str,
    required_skills: list[str],
    job_title: str = "Software Position",
    github_score: Optional[float] = None,
    portfolio_score: Optional[float] = None,
) -> dict:"""

content = content.replace(old_sig, new_sig)

# Update scoring execution (around line 290-300)
old_scoring = """                # Blend link-verification score (30%) with LLM score (70%)
                if github_score is not None:
                    llm_score = result.get("overall_score", 0)
                    result["overall_score"] = round(llm_score * 0.7 + github_score * 0.3, 2)"""

new_scoring = """                # Blend link-verification scores
                llm_score = result.get("overall_score", 0)
                if github_score is not None and portfolio_score is not None:
                    result["overall_score"] = round(llm_score * 0.60 + github_score * 0.25 + portfolio_score * 0.15, 2)
                elif github_score is not None:
                    result["overall_score"] = round(llm_score * 0.70 + github_score * 0.30, 2)
                elif portfolio_score is not None:
                    result["overall_score"] = round(llm_score * 0.85 + portfolio_score * 0.15, 2)"""

content = content.replace(old_scoring, new_scoring)

# Update fallback scoring (around line 335)
old_fallback = """    overall_score = llm_like_score
    if github_score is not None:
        overall_score = round(llm_like_score * 0.7 + github_score * 0.3, 2)"""

new_fallback = """    overall_score = llm_like_score
    if github_score is not None and portfolio_score is not None:
        overall_score = round(llm_like_score * 0.60 + github_score * 0.25 + portfolio_score * 0.15, 2)
    elif github_score is not None:
        overall_score = round(llm_like_score * 0.70 + github_score * 0.30, 2)
    elif portfolio_score is not None:
        overall_score = round(llm_like_score * 0.85 + portfolio_score * 0.15, 2)"""

content = content.replace(old_fallback, new_fallback)

open(file_path, "w").write(content)
