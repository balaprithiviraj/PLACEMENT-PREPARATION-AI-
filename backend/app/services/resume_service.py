"""Resume text extraction + heuristic ATS-style analysis.

No network calls. Works offline for PDF/DOCX/TXT.
All returned dicts match what the frontend expects:
  _id, fileName, createdAt, overallScore, atsScore, summary,
  breakdown{skills,projects,education,experience,formatting},
  skills[], missingSkills[], recommendedRoles[],
  strengths[], weaknesses[], improvements[], interviewTopics[]
"""

from __future__ import annotations

import io
import re
import zipfile
from datetime import datetime, timezone
from xml.etree import ElementTree as ET

# Canonical skill vocabulary (lowercase match keys -> display names).
SKILLS_MAP: dict[str, str] = {
    "python": "Python",
    "java": "Java",
    "javascript": "JavaScript",
    "typescript": "TypeScript",
    "react": "React",
    "angular": "Angular",
    "vue": "Vue",
    "next.js": "Next.js",
    "node": "Node.js",
    "express": "Express",
    "fastapi": "FastAPI",
    "django": "Django",
    "flask": "Flask",
    "html": "HTML",
    "css": "CSS",
    "tailwind": "Tailwind CSS",
    "sql": "SQL",
    "mysql": "MySQL",
    "postgresql": "PostgreSQL",
    "mongodb": "MongoDB",
    "git": "Git",
    "github": "GitHub",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "aws": "AWS",
    "azure": "Azure",
    "gcp": "GCP",
    "machine learning": "Machine Learning",
    "deep learning": "Deep Learning",
    "nlp": "NLP",
    "tensorflow": "TensorFlow",
    "pytorch": "PyTorch",
    "scikit-learn": "Scikit-learn",
    "pandas": "Pandas",
    "numpy": "NumPy",
    "data structures": "Data Structures",
    "algorithms": "Algorithms",
    "oop": "OOP",
    "dbms": "DBMS",
    "operating systems": "Operating Systems",
    "computer networks": "Computer Networks",
    "c++": "C++",
    "c#": "C#",
    "go": "Go",
    "rust": "Rust",
    "php": "PHP",
    "ruby": "Ruby",
    "graphql": "GraphQL",
    "rest": "REST APIs",
    "jest": "Jest",
    "pytest": "Pytest",
    "selenium": "Selenium",
    "linux": "Linux",
    "bash": "Bash",
    "excel": "Excel",
    "power bi": "Power BI",
    "tableau": "Tableau",
    "figma": "Figma",
    "redux": "Redux",
    "testing": "Testing",
}

# Standalone "c" is too noisy — detect only when clearly a language token.
_C_SKILL_PATTERN = re.compile(r"(?<![\w+#])c(?![\w+#])", re.IGNORECASE)

ROLE_TEMPLATES: list[dict] = [
    {
        "role": "Full Stack Developer",
        "required": ["JavaScript", "React", "Node.js", "HTML", "CSS", "SQL", "Git", "REST APIs"],
        "preparation": "Build 2 full-stack projects with React + Node + SQL, add auth, testing and deployment on AWS.",
    },
    {
        "role": "Backend Developer",
        "required": ["Python", "FastAPI", "SQL", "MongoDB", "Docker", "Git", "REST APIs", "Testing"],
        "preparation": "Master FastAPI/Django, SQL + MongoDB, Docker, and system-design basics with one deployed API project.",
    },
    {
        "role": "Frontend Developer",
        "required": ["JavaScript", "React", "HTML", "CSS", "Tailwind CSS", "Git", "Testing", "REST APIs"],
        "preparation": "Ship 2 polished React apps with routing, state management and responsive Tailwind styling.",
    },
    {
        "role": "Data Scientist",
        "required": ["Python", "Pandas", "NumPy", "Machine Learning", "SQL", "Scikit-learn", "Excel", "Tableau"],
        "preparation": "Finish an end-to-end ML project: data cleaning with Pandas, modelling with Scikit-learn, dashboard in Tableau.",
    },
    {
        "role": "ML Engineer",
        "required": ["Python", "Machine Learning", "Deep Learning", "PyTorch", "TensorFlow", "SQL", "Docker", "Git"],
        "preparation": "Train and deploy one deep-learning model with PyTorch, Dockerize it and document metrics.",
    },
    {
        "role": "DevOps Engineer",
        "required": ["Linux", "Docker", "Kubernetes", "AWS", "Bash", "Git", "Testing", "Python"],
        "preparation": "Learn Linux + Bash, containerize apps with Docker, deploy on AWS with CI/CD via GitHub Actions.",
    },
]

ACTION_VERBS = [
    "built", "developed", "designed", "implemented", "led", "managed",
    "created", "optimized", "improved", "deployed", "launched", "achieved",
]


def extract_txt(data: bytes) -> str:
    return data.decode("utf-8", errors="ignore")


def extract_docx(data: bytes) -> str:
    """Try python-docx first, fall back to raw zip/xml parsing (stdlib only)."""
    try:
        from docx import Document  # type: ignore

        doc = Document(io.BytesIO(data))
        return "\n".join(p.text for p in doc.paragraphs)
    except Exception:
        pass
    # Fallback: DOCX is a zip containing word/document.xml
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            xml_bytes = z.read("word/document.xml")
        root = ET.fromstring(xml_bytes)
        texts: list[str] = []
        for elem in root.iter():
            if elem.tag.endswith("}t") and elem.text:
                texts.append(elem.text)
                # add line breaks after paragraphs
                if elem.tag.endswith("}t"):
                    pass
        return " ".join(texts)
    except Exception:
        return ""


def extract_pdf(data: bytes) -> str:
    """Try pypdf, fall back to a naive byte-decode so upload never crashes."""
    try:
        from pypdf import PdfReader  # type: ignore

        reader = PdfReader(io.BytesIO(data))
        parts = [(page.extract_text() or "") for page in reader.pages]
        text = "\n".join(parts).strip()
        if text:
            return text
    except Exception:
        pass
    # Naive fallback: PDFs often contain text in parentheses / streams.
    try:
        raw = data.decode("latin-1", errors="ignore")
        candidates = re.findall(r"\(([^)]{3,})\)", raw)
        cleaned = " ".join(c for c in candidates if re.search(r"[A-Za-z]{3,}", c))
        return cleaned[:20000]
    except Exception:
        return ""


def extract_text(filename: str, data: bytes) -> str:
    lower = filename.lower()
    if lower.endswith(".txt"):
        return extract_txt(data)
    if lower.endswith(".docx"):
        return extract_docx(data)
    if lower.endswith(".pdf"):
        return extract_pdf(data)
    return extract_txt(data)


def detect_skills(text: str) -> list[str]:
    lowered = f"\n{text.lower()}\n"
    found: list[str] = []
    for key, display in SKILLS_MAP.items():
        # word-boundary match so "java" doesn't match "javascript"
        pattern = r"(?<![\w+#.])" + re.escape(key) + r"(?![\w+#.])"
        if re.search(pattern, lowered):
            found.append(display)
    if _C_SKILL_PATTERN.search(text):
        found.append("C")
    # de-dupe preserving order
    seen: set[str] = set()
    unique: list[str] = []
    for skill in found:
        if skill not in seen:
            seen.add(skill)
            unique.append(skill)
    return unique


def _has(pattern: str, text_lower: str) -> bool:
    return re.search(pattern, text_lower) is not None


def analyze_resume_text(text: str, file_name: str = "Resume") -> dict:
    cleaned = (text or "").strip()
    words = re.findall(r"[A-Za-z][A-Za-z0-9+#.]*", cleaned)
    word_count = len(words)
    text_lower = cleaned.lower()

    skills = detect_skills(cleaned)

    has_email = bool(re.search(r"[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}", text_lower))
    has_phone = bool(re.search(r"(\+?\d[\d\s\-]{7,}\d)", cleaned))
    has_linkedin = "linkedin" in text_lower
    has_github = "github" in text_lower
    has_education = bool(re.search(r"\b(education|b\.?e\b|b\.?tech|bachelor|master|m\.?tech|university|college|cgpa|gpa)\b", text_lower))
    has_experience = bool(re.search(r"\b(experience|intern|worked|employment|company)\b", text_lower))
    has_projects = bool(re.search(r"\b(project|projects|built|developed|portfolio)\b", text_lower))
    has_skills_section = bool(re.search(r"\b(skills|tech stack|technologies)\b", text_lower))
    bullets = len(re.findall(r"(?m)^\s*(?:[-*•]|\d+\.)\s+\S", cleaned))
    action_hits = sum(1 for verb in ACTION_VERBS if verb in text_lower)

    # --- section scores (0-100) ---
    skills_score = min(95, 25 + len(skills) * 7) if skills else 20
    projects_score = 85 if has_projects and bullets >= 3 else (65 if has_projects else 30)
    education_score = 85 if has_education else 30
    experience_score = 80 if has_experience and action_hits >= 2 else (60 if has_experience else 35)

    formatting_score = 50
    if has_email:
        formatting_score += 12
    if has_phone:
        formatting_score += 8
    if has_linkedin or has_github:
        formatting_score += 10
    if has_skills_section:
        formatting_score += 10
    if 250 <= word_count <= 1200:
        formatting_score += 10
    elif word_count > 80:
        formatting_score += 4
    formatting_score = min(95, formatting_score)

    # --- ATS score: recruiters' parser checks ---
    ats = 40
    if has_email:
        ats += 12
    if has_phone:
        ats += 6
    if has_skills_section:
        ats += 10
    if has_education:
        ats += 8
    if has_experience:
        ats += 8
    if has_projects:
        ats += 6
    if word_count >= 150:
        ats += 5
    if len(skills) >= 5:
        ats += 5
    ats_score = min(97, ats)

    overall = round(
        skills_score * 0.28
        + projects_score * 0.22
        + experience_score * 0.20
        + education_score * 0.15
        + formatting_score * 0.15
    )
    overall = max(25, min(97, overall))

    # --- missing skills vs best-fit roles ---
    scored_roles: list[tuple[int, dict]] = []
    for template in ROLE_TEMPLATES:
        required = template["required"]
        matched = [s for s in required if s in skills]
        pct = round(len(matched) / len(required) * 100) if required else 0
        scored_roles.append((pct, template))
    scored_roles.sort(key=lambda item: item[0], reverse=True)
    top_roles = scored_roles[:3]

    # Aggregate missing skills across top roles, keep order, cap at 8.
    missing_ordered: list[str] = []
    for _, template in top_roles:
        for req in template["required"]:
            if req not in skills and req not in missing_ordered:
                missing_ordered.append(req)
    missing_top = missing_ordered[:8]

    priority_cycle = ["High", "High", "Medium", "Medium", "Medium", "Low", "Low", "Low"]
    missing_skills = [
        {
            "skill": name,
            "priority": priority_cycle[i] if i < len(priority_cycle) else "Medium",
            "reason": f"Required for {top_roles[0][1]['role']} roles; add a project or certification that uses it.",
        }
        for i, name in enumerate(missing_top)
    ]

    recommended_roles = []
    for pct, template in top_roles:
        required = template["required"]
        matched = [s for s in required if s in skills]
        missing = [s for s in required if s not in skills]
        recommended_roles.append(
            {
                "role": template["role"],
                "matchPercentage": pct,
                "requiredSkills": required,
                "missingSkills": missing[:5],
                "preparation": template["preparation"],
            }
        )

    strengths: list[str] = []
    weaknesses: list[str] = []
    improvements: list[str] = []

    if len(skills) >= 6:
        strengths.append(f"Strong technical breadth with {len(skills)} detected skills ({', '.join(skills[:5])}).")
    elif skills:
        strengths.append(f"Relevant skills detected: {', '.join(skills[:5])}.")
    if has_projects:
        strengths.append("Projects section present — good signal for recruiters.")
    if action_hits >= 3:
        strengths.append("Uses strong action verbs to describe impact.")
    if has_linkedin or has_github:
        strengths.append("Includes professional links (LinkedIn/GitHub).")
    if not strengths:
        strengths.append("Resume is parseable — a good base to build on.")

    if not has_email:
        weaknesses.append("No email address detected — ATS parsers flag this.")
        improvements.append("Add a professional email address at the top of the resume.")
    if not has_phone:
        weaknesses.append("No phone number detected.")
        improvements.append("Add a phone number alongside your email and location.")
    if not has_education:
        weaknesses.append("Education section not clearly detected.")
        improvements.append("Add an Education section with degree, college and year.")
    if not has_experience:
        weaknesses.append("No experience/internship section detected.")
        improvements.append("Add internships, freelance work or significant coursework as experience.")
    if not has_projects:
        weaknesses.append("No projects section detected.")
        improvements.append("Add 2–3 projects with tech stack, your role and measurable outcomes.")
    if len(skills) < 5:
        weaknesses.append(f"Only {len(skills)} technical skills detected — aim for 8+.")
        improvements.append("Add a Skills section grouping languages, frameworks, tools and databases.")
    if word_count < 150:
        weaknesses.append("Resume looks too short — parsers may have missed content (scanned PDF?).")
        improvements.append("Export the resume as text-based PDF/DOCX (not a photo scan) with 300–800 words.")
    if not (has_linkedin or has_github):
        improvements.append("Add LinkedIn and GitHub links to boost credibility.")
    if bullets < 3:
        improvements.append("Use bullet points with numbers (e.g. 'improved latency by 30%') for each project/role.")
    if missing_top:
        improvements.append(f"Learn high-priority gaps first: {', '.join(missing_top[:3])}.")

    interview_topics = (skills[:6] + missing_top[:4]) or ["Data Structures", "OOP", "DBMS"]
    # de-dupe
    seen_topics: set[str] = set()
    topics_unique: list[str] = []
    for topic in interview_topics:
        if topic not in seen_topics:
            seen_topics.add(topic)
            topics_unique.append(topic)

    summary = (
        f"Detected {len(skills)} skills in {word_count} words. "
        f"Best fit: {top_roles[0][1]['role']} ({top_roles[0][0]}% match). "
        + (f"Top gaps: {', '.join(missing_top[:3])}." if missing_top else "Well-rounded for your target roles.")
    )

    breakdown = {
        "skills": skills_score,
        "projects": projects_score,
        "education": education_score,
        "experience": experience_score,
        "formatting": formatting_score,
    }

    return {
        "overallScore": overall,
        "atsScore": ats_score,
        "breakdown": breakdown,
        "skills": skills,
        "missingSkills": missing_skills,
        "recommendedRoles": recommended_roles,
        "strengths": strengths[:6],
        "weaknesses": weaknesses[:6],
        "improvements": improvements[:7],
        "interviewTopics": topics_unique[:8],
        "summary": summary,
        "wordCount": word_count,
    }


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
