import asyncio
from datetime import datetime, timezone, timedelta

import httpx

from app.config import settings


GITHUB_SCORING_VERSION = "v2_recent_activity"


def _parse_github_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except Exception:
        return None


async def _fetch_recent_commit_dates(
    client: httpx.AsyncClient,
    full_repo_name: str,
    headers: dict[str, str],
    since_iso: str,
) -> list[datetime]:
    """Fetch commit dates for a repository since a timestamp (best-effort)."""
    try:
        resp = await client.get(
            f"https://api.github.com/repos/{full_repo_name}/commits",
            params={"since": since_iso, "per_page": 100},
            headers=headers,
        )
    except Exception:
        return []

    if resp.status_code in {404, 409}:
        return []
    if resp.status_code != 200:
        return []

    rows = resp.json() if resp.text else []
    commit_dates: list[datetime] = []
    if not isinstance(rows, list):
        return commit_dates

    for row in rows:
        commit_obj = row.get("commit") or {}
        author_obj = commit_obj.get("author") or {}
        dt = _parse_github_datetime(author_obj.get("date"))
        if dt:
            commit_dates.append(dt)
    return commit_dates


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

    # Compute baseline scores
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

    # Activity metrics (recent commits + consistency in last 90 days)
    now = datetime.now(timezone.utc)
    cutoff_90 = now - timedelta(days=90)
    since_iso = cutoff_90.isoformat().replace("+00:00", "Z")

    repos_sorted_by_push = sorted(
        repos,
        key=lambda r: _parse_github_datetime(r.get("pushed_at")) or datetime.fromtimestamp(0, tz=timezone.utc),
        reverse=True,
    )
    activity_candidates = [r for r in repos_sorted_by_push if not r.get("fork")]
    if not activity_candidates:
        activity_candidates = repos_sorted_by_push
    sampled_repos = activity_candidates[:6]

    recent_commit_dates: list[datetime] = []
    if sampled_repos:
        async with httpx.AsyncClient(timeout=15) as client:
            tasks = []
            for repo in sampled_repos:
                full_name = repo.get("full_name") or f"{username}/{repo.get('name', '')}"
                if "/" not in str(full_name):
                    continue
                tasks.append(_fetch_recent_commit_dates(client, str(full_name), headers, since_iso))

            if tasks:
                results = await asyncio.gather(*tasks, return_exceptions=True)
                for item in results:
                    if isinstance(item, list):
                        recent_commit_dates.extend(item)

    recent_commits_90d = len(recent_commit_dates)
    active_weeks_90d = len({(d.isocalendar().year, d.isocalendar().week) for d in recent_commit_dates})
    active_months_90d = len({(d.year, d.month) for d in recent_commit_dates})

    pushed_dates = [
        _parse_github_datetime(repo.get("pushed_at"))
        for repo in repos
    ]
    pushed_dates = [d for d in pushed_dates if d is not None]
    active_repos_90d = sum(1 for d in pushed_dates if d >= cutoff_90)

    latest_push_at = max(pushed_dates) if pushed_dates else None
    latest_commit_at = max(recent_commit_dates) if recent_commit_dates else None
    activity_points = [d for d in [latest_push_at, latest_commit_at] if d is not None]
    latest_activity_at = max(activity_points) if activity_points else None
    days_since_activity = (now - latest_activity_at).days if latest_activity_at else 9999

    recent_commit_score = min(recent_commits_90d * 2, 40)
    consistency_score = min(active_weeks_90d * 2.5, 30)
    active_repo_score = min(active_repos_90d * 3, 15)

    if days_since_activity <= 7:
        freshness_score = 15
    elif days_since_activity <= 30:
        freshness_score = 12
    elif days_since_activity <= 60:
        freshness_score = 8
    elif days_since_activity <= 90:
        freshness_score = 4
    else:
        freshness_score = 0

    activity_score = min(
        round(recent_commit_score + consistency_score + active_repo_score + freshness_score),
        100,
    )

    github_score = round(
        profile_completeness * 0.25
        + repo_quality * 0.35
        + activity_score * 0.40
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
        "recent_commits_90d": recent_commits_90d,
        "active_weeks_90d": active_weeks_90d,
        "active_months_90d": active_months_90d,
        "active_repos_90d": active_repos_90d,
        "days_since_last_activity": days_since_activity if days_since_activity != 9999 else None,
        "profile_completeness": profile_completeness,
        "repo_quality": repo_quality,
        "activity_score": activity_score,
        "scoring_version": GITHUB_SCORING_VERSION,
        "scoring_breakdown": {
            "weights": {
                "profile_completeness": 0.25,
                "repo_quality": 0.35,
                "activity_score": 0.40,
            },
            "components": {
                "profile_completeness": profile_completeness,
                "repo_quality": repo_quality,
                "activity_score": activity_score,
            },
            "activity_components": {
                "recent_commit_score": recent_commit_score,
                "consistency_score": consistency_score,
                "active_repo_score": active_repo_score,
                "freshness_score": freshness_score,
            },
        },
        "github_score": github_score,
        "analyzed_at": now.isoformat(),
    }
