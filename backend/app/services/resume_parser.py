import io
import re
from typing import Optional

from app.models.resume import ExtractedLinks
from app.services.link_extractor import extract_all_links

# Tech skills database (subset — extend as needed)
TECH_SKILLS = [
    # Languages
    "python", "javascript", "typescript", "java", "c++", "c#", "go", "rust",
    "kotlin", "swift", "ruby", "php", "scala", "r", "dart", "elixir",
    # Frontend
    "react", "next.js", "vue", "angular", "svelte", "html", "css", "tailwind",
    "bootstrap", "sass", "webpack", "vite", "redux", "zustand",
    # Backend
    "node.js", "fastapi", "django", "flask", "express", "spring boot",
    "nestjs", "graphql", "rest api", "grpc",
    # Databases
    "mongodb", "postgresql", "mysql", "sqlite", "redis", "elasticsearch",
    "cassandra", "dynamodb", "firebase",
    # Cloud / DevOps
    "aws", "azure", "gcp", "docker", "kubernetes", "github actions",
    "terraform", "ansible", "jenkins", "nginx", "linux",
    # ML / AI
    "tensorflow", "pytorch", "scikit-learn", "hugging face", "langchain",
    "openai", "machine learning", "deep learning", "nlp", "computer vision",
    # Tools
    "git", "jira", "figma", "postman", "pytest", "jest", "cypress",
]


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF using pdfplumber (primary) with PyPDF2 fallback."""
    text = ""
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception:
        pass

    if not text.strip():
        try:
            import PyPDF2
            reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                text += (page.extract_text() or "") + "\n"
        except Exception:
            pass

    return text.strip()


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from DOCX file."""
    try:
        from docx import Document
        doc = Document(io.BytesIO(file_bytes))
        return "\n".join(para.text for para in doc.paragraphs if para.text.strip())
    except Exception as e:
        raise ValueError(f"Failed to parse DOCX: {e}")


def extract_skills(text: str) -> list[str]:
    """Match tech skills from text."""
    text_lower = text.lower()
    found = []
    for skill in TECH_SKILLS:
        # Use word boundary matching for short skills to avoid false positives
        pattern = r"\b" + re.escape(skill.lower()) + r"\b"
        if re.search(pattern, text_lower):
            found.append(skill)
    return list(set(found))


def extract_sections(text: str) -> dict:
    """Try to identify main resume sections."""
    section_headers = [
        "education", "experience", "work experience", "projects",
        "skills", "certifications", "achievements", "summary",
        "objective", "publications",
    ]
    sections = {}
    lines = text.split("\n")
    current_section = "general"
    content: list[str] = []

    for line in lines:
        line_lower = line.strip().lower()
        matched = next(
            (h for h in section_headers if line_lower.startswith(h)), None
        )
        if matched and len(line.strip()) < 40:
            if content:
                sections[current_section] = "\n".join(content).strip()
            current_section = matched
            content = []
        else:
            content.append(line)

    if content:
        sections[current_section] = "\n".join(content).strip()

    return sections


def parse_resume(file_bytes: bytes, filename: str) -> dict:
    """Parse resume file; return parsed data dict."""
    filename_lower = filename.lower()

    if filename_lower.endswith(".pdf"):
        text = extract_text_from_pdf(file_bytes)
    elif filename_lower.endswith((".docx", ".doc")):
        text = extract_text_from_docx(file_bytes)
    else:
        raise ValueError("Unsupported file type. Only PDF and DOCX are allowed.")

    if not text:
        raise ValueError("Could not extract text from resume.")

    links: ExtractedLinks = extract_all_links(text)
    skills = extract_skills(text)
    sections = extract_sections(text)

    return {
        "parsed_text": text,
        "extracted_links": links.model_dump(),
        "skills": skills,
        "sections": sections,
        "status": "parsed",
    }
