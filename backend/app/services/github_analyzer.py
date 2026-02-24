import asyncio
from datetime import datetime, timedelta
from typing import Optional

import httpx

from app.config import settings


async def fetch_github_profile(username: str) -> dict:
    """Fetch GitHub user profile + repos and compute scores."""
    headers = {}
    if settings.GITHUB_TOKEN:
        headers["Authorization"] = f"token {settings.GITHUB_TOKEN}"
    headers["Accept"] = "application/vnd.github.v3+json"

    async with httpx.AsyncClient(timeout=15) as client:
        # User profile
        r_user = await client.get(
            f"https://api.github.com/users/{username}", headers=headers
        )
        if r_user.status_code == 404:
            return {"error": "GitHub user not found", "username": username}
        if r_user.status_code != 200:
            return {"error": f"GitHub API error: {r_user.status_code}", "username": username}

        user_data = r_user.json()

        # Repositories
        r_repos = await client.get(
            f"https://api.github.com/users/{username}/repos",
            params={"sort": "updated", "per_page": 30},
            headers=headers,
        )
        repos = r_repos.json() if r_repos.status_code == 200 else []

    # Aggregate languages
    language_counts: dict[str, int] = {}
    top_repos = []

    for repo in repos[:10]:
        lang = repo.get("language")
        if lang:
            language_counts[lang] = language_counts.get(lang, 0) + 1

        top_repos.append(
            {
                "name": repo.get("name"),
                "description": repo.get("description"),
                "url": repo.get("html_url"),
                "stars": repo.get("stargazers_count", 0),
                "forks": repo.get("forks_count", 0),
                "language": repo.get("language"),
                "updated_at": repo.get("updated_at"),
            }
        )

    # Compute scores
    total_stars = sum(r.get("stargazers_count", 0) for r in repos)
    total_forks = sum(r.get("forks_count", 0) for r in repos)
    repos_count = len(repos)
    has_bio = bool(user_data.get("bio"))
    has_location = bool(user_data.get("location"))
    followers = user_data.get("followers", 0)

    profile_completeness = (
        (20 if has_bio else 0)
        + (10 if has_location else 0)
        + (10 if user_data.get("blog") else 0)
        + min(followers * 2, 20)
        + min(repos_count * 2, 40)
    )

    repo_quality = min(
        (total_stars * 3) + (total_forks * 2) + (repos_count * 1), 100
    )

    github_score = round(
        profile_completeness * 0.4 + repo_quality * 0.6
    )
    github_score = min(github_score, 100)

    return {
        "username": username,
        "name": user_data.get("name"),
        "bio": user_data.get("bio"),
        "location": user_data.get("location"),
        "company": user_data.get("company"),
        "avatar_url": user_data.get("avatar_url"),
        "profile_url": user_data.get("html_url"),
        "followers": followers,
        "following": user_data.get("following", 0),
        "public_repos": repos_count,
        "account_created": user_data.get("created_at"),
        "languages": language_counts,
        "top_repos": top_repos[:5],
        "total_stars": total_stars,
        "total_forks": total_forks,
        "github_score": github_score,
        "analyzed_at": datetime.utcnow().isoformat(),
    }
