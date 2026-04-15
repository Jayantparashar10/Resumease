# DeepTech & System-Based Project Details

## 1) Problem Statement and Core System/Technology Being Replicated

### Problem Statement
Traditional resume screening is often keyword-heavy, manual, and easy to game. Recruiters face three major issues:
- Low trust in candidate claims because resumes can overstate skills.
- High screening time due to manual shortlisting and profile verification.
- Weak role-fit scoring because ATS systems usually ignore external technical evidence (GitHub/portfolio depth and recency).

Resumease addresses this by building a verification-first ATS pipeline that combines resume parsing, link intelligence, and LLM-assisted scoring.

### Core System/Technology Being Replicated
This project replicates a modern enterprise ATS + technical due-diligence system with these capabilities:
- Structured ingestion of resume artifacts (PDF/DOCX), text normalization, skill extraction, and sectioning.
- External proof-of-skill verification (GitHub + portfolio signals) with cache-aware analysis.
- Hybrid ATS scoring that blends LLM reasoning with deterministic verification metrics.
- Recruiter-facing candidate intelligence views (score breakdown, matched/missing skills, links, resume evidence).
- Secure document access model (private storage + short-lived signed URLs) for role-based review.

In short, it replicates the behavior of systems that do both ATS ranking and technical profile validation, not just text matching.

## 2) Implementation Details and Key Modules/Replication Approach

### Implementation Details
System architecture follows a modular full-stack pattern:
- Frontend: Next.js (App Router), role-based views for student and recruiter workflows.
- Backend: FastAPI with router-based APIs for auth, resumes, analysis, ATS, jobs, and recruiter actions.
- Data layer: Supabase (Auth + Postgres via REST + Storage) with migration-driven schema updates.
- AI layer: Cerebras-based LLM scoring and generation for ATS reasoning and LaTeX resume generation.
- Storage/security: Private object storage with server-generated signed URLs and authorization checks.

Scoring strategy is hybrid:
- Deterministic features: extracted skills, verified links, GitHub activity metrics, portfolio tech signals.
- LLM features: semantic fit feedback, suggestions, and structured ATS outputs.
- Final output: weighted, explainable score breakdown suitable for recruiter decision-making.

### Key Modules and Replication Approach

- Authentication & Roles: Multi-actor ATS access control. Implementation approach: Supabase-backed auth with student/recruiter role guards in backend and frontend routes.
- Resume Ingestion: Enterprise CV ingestion pipeline. Implementation approach: Upload validation, PDF/DOCX parsing, text extraction, skill/section/link extraction, and structured persistence.
- Link Intelligence: Candidate profile verification. Implementation approach: Extract GitHub/portfolio links and compute technical credibility signals.
- GitHub Analyzer: Engineering profile due diligence. Implementation approach: Profile + repo metadata analysis, recency/consistency activity metrics, and cached scoring with versioning.
- Portfolio Analyzer: Project depth assessment. Implementation approach: Web content extraction with LLM/rule-based scoring fallback and cached analysis.
- ATS Scoring Engine: Explainable ranking engine. Implementation approach: LLM score generation plus deterministic verification features for blended scoring and explainable breakdown.
- Recruiter Intelligence Views: Decision support dashboard. Implementation approach: Candidate profile overview, score decomposition, matched/missing skills, and resume/link evidence.
- Resume File Evidence: Secure original-document access. Implementation approach: Store original files in a private bucket and provide short-lived signed URLs for authorized viewers.
- LaTeX Resume Assistant: AI-assisted resume authoring. Implementation approach: Generate editable LaTeX source, persist edits, and support .tex export.
- Reliability/Deployability: Production-grade service operation. Implementation approach: Environment-driven config, CORS normalization, cache-aware APIs, and CI/CD workflow for backend deployment.

### Replication Philosophy
The system intentionally mirrors real ATS constraints:
- Evidence over claims: external links and repository activity influence confidence.
- Explainability over black-box ranking: recruiter-visible score factors and suggestions.
- Security over convenience: private resume files and signed, time-bound access.
- Extensibility over hard-coding: modular routers/services and migration-based data evolution.
