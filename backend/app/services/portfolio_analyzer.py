import logging
from datetime import datetime, timezone
import json
import re
from typing import Any, Optional

import httpx
from bs4 import BeautifulSoup

from app.config import settings
from app.services.supabase_db import get_portfolio_analysis as db_get_portfolio, upsert_portfolio_analysis

logger = logging.getLogger(__name__)
CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions"

async def fetch_portfolio_content(url: str) -> Optional[str]:
    """Fetch and extract visible text from a portfolio URL."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")
            
            for element in soup(["script", "style", "nav", "footer", "header", "meta", "noscript"]):
                element.decompose()
            
            text = soup.get_text(separator="\n", strip=True)
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            cleaned_text = "\n".join(lines)
            
            return cleaned_text[:10000]

    except Exception as e:
        logger.error(f"Error fetching portfolio {url}: {str(e)}")
        return None

def _extract_json(text: str) -> Optional[dict[str, Any]]:
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def _rule_based_portfolio_score(url: str, text: str) -> dict[str, Any]:
    tech_keywords = [
        "python", "javascript", "typescript", "react", "next.js", "node", "fastapi",
        "django", "flask", "docker", "kubernetes", "aws", "azure", "gcp", "postgres",
        "mongodb", "redis", "tensorflow", "pytorch", "machine learning",
    ]
    lowered = text.lower()
    found = [kw for kw in tech_keywords if kw in lowered]
    unique_found = sorted(set(found))
    score = min(100, 20 + len(unique_found) * 8)
    return {
        "url": url,
        "portfolio_score": score,
        "technologies": unique_found[:12],
        "assessment": "Rule-based portfolio analysis used because LLM analysis was unavailable.",
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
        "analysis_mode": "rule_based",
    }


async def _call_cerebras(system_prompt: str, user_prompt: str) -> str:
    if not settings.CEREBRAS_API_KEY:
        raise ValueError("CEREBRAS_API_KEY not configured")

    payload = {
        "model": settings.CEREBRAS_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": 800,
        "temperature": 0.2,
    }
    headers = {
        "Authorization": f"Bearer {settings.CEREBRAS_API_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
        response = await client.post(CEREBRAS_API_URL, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def analyze_portfolio_with_llm(url: str, text: str) -> dict[str, Any]:
    """Use Cerebras to analyze the extracted portfolio text and generate an ATS component score."""
    if not text or len(text.strip()) < 50:
        return {
            "url": url,
            "portfolio_score": 0,
            "technologies": [],
            "assessment": "Could not extract meaningful content from portfolio.",
            "analyzed_at": datetime.now(timezone.utc).isoformat(),
            "analysis_mode": "insufficient_content",
        }

    system_prompt = "You are a senior technical recruiter analyzing a candidate's portfolio website text. Extract key technologies and assess project depth to score it from 0-100."
    user_prompt = f"""
Analyze the following text extracted from a candidate's portfolio website.

Portfolio URL: {url}

Portfolio Text:
{text}

Return ONLY a valid JSON object matching exactly this schema:
{{
    "portfolio_score": 0-100 integer reflecting the depth, quality, and technical complexity showcased,
    "technologies": ["List", "of", "detected", "technologies", "and", "frameworks"],
    "assessment": "A brief 2-3 sentence assessment of the projects described."
}}
"""

    try:
        raw_output = await _call_cerebras(system_prompt=system_prompt, user_prompt=user_prompt)
        data = _extract_json(raw_output)
        if not data:
            raise ValueError("LLM returned malformed JSON")

        parsed_score = int(float(data.get("portfolio_score", 50)))
        technologies = data.get("technologies", [])
        if not isinstance(technologies, list):
            technologies = []

        return {
            "url": url,
            "portfolio_score": max(0, min(100, parsed_score)),
            "technologies": technologies[:20],
            "assessment": data.get("assessment", "Portfolio analyzed."),
            "analyzed_at": datetime.now(timezone.utc).isoformat(),
            "analysis_mode": "llm",
        }

    except Exception as e:
        logger.error(f"Error analyzing portfolio {url} with LLM: {e}")
        return _rule_based_portfolio_score(url, text)


async def get_portfolio_analysis(url: str) -> dict[str, Any]:
    """Get portfolio analysis from DB if available, or generate and cache it."""
    try:
        cached = await db_get_portfolio(url)
        if cached:
            cached_data = cached.get("data", {})
            analyzed_at = cached.get("analyzed_at")
            if analyzed_at:
                cache_age = datetime.now(timezone.utc) - datetime.fromisoformat(str(analyzed_at).replace("Z", "+00:00"))
                if cache_age.days < 7:
                    return cached_data
    except Exception as e:
        logger.error(f"DB Error getting portfolio cache: {e}")

    text = await fetch_portfolio_content(url)
    result = await analyze_portfolio_with_llm(url, text or "")
    
    try:
        await upsert_portfolio_analysis({
            "url": url,
            "data": result,
            "analyzed_at": datetime.now(timezone.utc).isoformat()
        })
    except Exception as e:
        logger.error(f"DB Error upserting portfolio cache: {e}")
        
    return result

