import re
from datetime import datetime, timezone

import httpx

from app.config import settings

CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions"


def _extract_latex(content: str) -> str:
    fence_match = re.search(r"```(?:latex)?\s*([\s\S]*?)```", content, re.IGNORECASE)
    candidate = fence_match.group(1).strip() if fence_match else content.strip()

    # Ensure we return a complete compilable document.
    if "\\documentclass" not in candidate:
        return ""
    return candidate


def _escape_latex(text: str) -> str:
    replacements = {
        "\\": r"\\textbackslash{}",
        "&": r"\\&",
        "%": r"\\%",
        "$": r"\\$",
        "#": r"\\#",
        "_": r"\\_",
        "{": r"\\{",
        "}": r"\\}",
        "~": r"\\textasciitilde{}",
        "^": r"\\textasciicircum{}",
    }
    return "".join(replacements.get(ch, ch) for ch in text)


def _fallback_resume_latex(full_name: str, email: str, resume_text: str, skills: list[str]) -> str:
    escaped_name = _escape_latex(full_name or "Candidate Name")
    escaped_email = _escape_latex(email or "candidate@example.com")
    escaped_summary = _escape_latex((resume_text or "").strip()[:1200])
    skill_line = ", ".join(_escape_latex(s) for s in skills[:18])

    if not skill_line:
        skill_line = "Python, JavaScript, SQL"

    now_iso = datetime.now(timezone.utc).date().isoformat()

    return f"""\\documentclass[11pt]{{article}}
\\usepackage[margin=0.8in]{{geometry}}
\\usepackage[hidelinks]{{hyperref}}
\\usepackage{{enumitem}}
\\setlist[itemize]{{leftmargin=*,itemsep=2pt,topsep=2pt}}
\\pagestyle{{empty}}

\\begin{{document}}

\\begin{{center}}
{{\\LARGE \\textbf{{{escaped_name}}}}}\\\\
\\vspace{{2pt}}
{escaped_email}
\\end{{center}}

\\section*{{Professional Summary}}
{escaped_summary if escaped_summary else 'Detail-oriented candidate with strong technical problem-solving skills.'}

\\section*{{Skills}}
{_escape_latex(skill_line)}

\\section*{{Experience}}
\\begin{{itemize}}
    \\item Add your latest work experience here with measurable outcomes.
    \\item Use bullet points with action verbs and numbers.
\\end{{itemize}}

\\section*{{Projects}}
\\begin{{itemize}}
    \\item Add your top projects, stack, and impact.
    \\item Include links to GitHub repositories.
\\end{{itemize}}

\\section*{{Education}}
Add your education details here.

\\vspace{{8pt}}
{{\\footnotesize Generated fallback LaTeX template on {now_iso}.}}

\\end{{document}}
"""


async def generate_resume_latex_with_llm(
    *,
    resume_text: str,
    skills: list[str],
    full_name: str,
    email: str,
) -> tuple[str, str]:
    """Generate compilable resume LaTeX from parsed resume text.

    Returns (latex_source, mode) where mode is one of: llm, fallback.
    """
    if not settings.CEREBRAS_API_KEY:
        return _fallback_resume_latex(full_name, email, resume_text, skills), "fallback"

    skill_line = ", ".join(skills[:25])
    prompt = f"""
You are a professional resume writer and LaTeX specialist.
Convert the following candidate information into a clean, single-page, ATS-friendly LaTeX resume.

Requirements:
- Return ONLY valid LaTeX source code (no markdown fences, no explanation).
- Must include \\documentclass, packages, \\begin{{document}}, and \\end{{document}}.
- Use clear sections: Summary, Skills, Experience, Projects, Education.
- Keep it editable and simple.
- Avoid uncommon packages that might break on basic LaTeX installs.
- Do not fabricate personal details; if missing, add placeholder text.

Candidate Name: {full_name}
Candidate Email: {email}
Skills: {skill_line}
Parsed Resume Text:
{resume_text[:5000]}
"""

    payload = {
        "model": settings.CEREBRAS_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 2200,
        "temperature": 0.2,
    }

    headers = {
        "Authorization": f"Bearer {settings.CEREBRAS_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(CEREBRAS_API_URL, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            latex = _extract_latex(content)
            if latex:
                return latex, "llm"
    except Exception:
        pass

    return _fallback_resume_latex(full_name, email, resume_text, skills), "fallback"
