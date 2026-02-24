import re
from typing import Optional
from app.models.resume import ExtractedLinks


# Regex patterns for link detection
PATTERNS = {
    "github": [
        r"github\.com/([a-zA-Z0-9_-]+)(?:/[a-zA-Z0-9_\-\.]*)?",
    ],
    "linkedin": [
        r"linkedin\.com/in/([a-zA-Z0-9_-]+)/?",
    ],
    "huggingface": [
        r"huggingface\.co/([a-zA-Z0-9_-]+)/?",
    ],
    "leetcode": [
        r"leetcode\.com/([a-zA-Z0-9_-]+)/?",
    ],
    "email": [
        r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}",
    ],
    "phone": [
        r"(?:\+?\d{1,3}[\s\-]?)?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}",
    ],
    "portfolio": [
        r"https?://(?:www\.)?(?!github\.com|linkedin\.com|huggingface\.co|leetcode\.com)[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}(?:/[^\s]*)?",
    ],
}


def extract_all_links(text: str) -> ExtractedLinks:
    """Extract and categorize all links from text."""
    links = ExtractedLinks()
    other = []

    for link_type, patterns_list in PATTERNS.items():
        for pattern in patterns_list:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                match = matches[0]
                # Reconstruct full URL for certain types
                if link_type == "github":
                    links.github = f"https://github.com/{match}"
                elif link_type == "linkedin":
                    links.linkedin = f"https://linkedin.com/in/{match}"
                elif link_type == "huggingface":
                    links.huggingface = f"https://huggingface.co/{match}"
                elif link_type == "leetcode":
                    links.leetcode = f"https://leetcode.com/{match}"
                elif link_type == "email":
                    links.email = match
                elif link_type == "phone":
                    links.phone = match
                elif link_type == "portfolio":
                    links.portfolio = match
                break

    return links


def extract_github_username(url: str) -> Optional[str]:
    """Extract GitHub username from URL."""
    match = re.search(r"github\.com/([a-zA-Z0-9_-]+)", url, re.IGNORECASE)
    return match.group(1) if match else None


def detect_link_type(url: str) -> str:
    """Detect the type of a given URL."""
    url_lower = url.lower()
    if "github.com" in url_lower:
        return "github"
    elif "linkedin.com" in url_lower:
        return "linkedin"
    elif "huggingface.co" in url_lower:
        return "huggingface"
    elif "leetcode.com" in url_lower:
        return "leetcode"
    return "other"
