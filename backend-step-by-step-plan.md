# Resumease Backend Plan - Phase 1 Quick MVP (70% Functional)

## 1) Phase 1 Goal
Build a quick, demo-ready backend where users:
1. Sign in with Google.
2. Complete onboarding details.
3. Are routed by role (`student` or `recruiter`).
4. Use core role-based features.

Primary MVP focus:
- Google authentication + JWT session
- role-based onboarding
- student-first resume screening pipeline
- ATS scoring with Cerebras API
- minimal recruiter job posting + candidate score view

## 2) Product Flow (Must Work End-to-End)
1. User clicks Continue with Google.
2. Backend verifies Google ID token.
3. If first login, user is marked onboarding incomplete.
4. User submits onboarding form with role-specific fields.
5. Student uploads resume and gets parsed profile.
6. Student gets ATS score from Cerebras for a selected job.
7. Recruiter can create jobs and view candidate scores.

## 3) Role-Based Feature Scope for Phase 1

### Student Features (Must Have)
- Google login + onboarding completion
- profile details save/update
- resume upload (PDF/DOCX)
- resume parsing (skills, links, sections)
- jobs list view (read only)
- ATS score generation for resume vs job
- ATS history view

### Recruiter Features (MVP-Level)
- Google login + onboarding completion
- recruiter profile details save/update
- job CRUD (basic)
- view ATS scores for applications/candidates (simple list)

Out of scope in Phase 1:
- GitHub deep analytics scoring
- portfolio crawling/scoring
- advanced candidate ranking engine
- admin dashboard and advanced analytics

## 4) Backend Data Contracts (Phase 1)

### users collection
Required fields:
- `_id`
- `google_sub` (unique)
- `email` (unique)
- `full_name`
- `role`: `student | recruiter`
- `avatar_url`
- `is_active`
- `onboarding_completed`
- `onboarding_data`:
  - student: `college`, `degree`, `graduation_year`, `target_roles`, `skills_self_reported`
  - recruiter: `company`, `designation`, `hiring_for`, `company_size`
- `created_at`, `updated_at`, `last_login_at`

### resumes collection
- keep current fields from existing implementation
- add `parser_version` and `screening_summary`

### jobs collection
- keep current fields from existing implementation
- ensure `required_skills` and recruiter ownership checks

### ats_scores collection
- keep current fields
- include `llm_provider="cerebras"`, `model_name`, `tokens_used`, `estimated_cost`

## 5) Endpoint Plan (Phase 1)

## 5.1 Auth and Onboarding Endpoints
1. `POST /api/v1/auth/google`
- Input: `{ id_token: string }`
- Action: verify Google token, create/find user, return JWT + onboarding status
- Output: `{ access_token, user, onboarding_completed }`

2. `GET /api/v1/auth/me`
- Output includes role and onboarding status

3. `POST /api/v1/auth/onboarding`
- Input: role-specific onboarding payload
- Action: validate by role, save `onboarding_data`, set `onboarding_completed=true`

4. `PUT /api/v1/auth/profile`
- update editable profile fields

5. `POST /api/v1/auth/logout` (optional stateless ack)

## 5.2 Student Endpoints
1. `POST /api/v1/resumes/upload`
2. `GET /api/v1/resumes/list`
3. `GET /api/v1/resumes/{resume_id}`
4. `DELETE /api/v1/resumes/{resume_id}`
5. `GET /api/v1/jobs/list`
6. `POST /api/v1/ats/score`
7. `GET /api/v1/ats/score/{score_id}`
8. `GET /api/v1/ats/history`

## 5.3 Recruiter Endpoints (MVP)
1. `POST /api/v1/jobs/create`
2. `GET /api/v1/jobs/list`
3. `GET /api/v1/jobs/{job_id}`
4. `PUT /api/v1/jobs/{job_id}`
5. `DELETE /api/v1/jobs/{job_id}`
6. `GET /api/v1/recruiter/candidates/{job_id}` (simple ATS score list for job)

## 6) Step-by-Step Backend Build Plan

### Step 1: Google Auth Foundation (Day 1)
Tasks:
- add Google token verification service (`google-auth` library)
- create `POST /api/v1/auth/google`
- issue platform JWT after successful verification
- upsert user with `google_sub`, email, avatar
- set `onboarding_completed=false` for first-time users

Done when:
- Google login returns valid JWT and user profile

### Step 2: Role-Based Onboarding API (Day 1-2)
Tasks:
- create onboarding schema validators per role
- create `POST /api/v1/auth/onboarding`
- ensure users cannot submit recruiter fields as student and vice versa
- add `PUT /api/v1/auth/profile`

Done when:
- onboarding completes and user is role-ready

### Step 3: Authorization Guardrails (Day 2)
Tasks:
- add role guards for student and recruiter routes
- reject requests if onboarding is incomplete on protected feature routes
- tighten token decode error handling and inactive user checks

Done when:
- unauthorized/incomplete users are blocked predictably

### Step 4: Student Resume Screening Pipeline (Day 2-3)
Tasks:
- keep/upgrade file validation (MIME + extension + 5MB)
- improve PDF fallback parser behavior and section extraction reliability
- preserve extracted links and skills in stable schema
- add `screening_summary` field for quick UI rendering

Done when:
- uploaded resumes are parsed with consistent output

### Step 5: Cerebras ATS Scoring Stabilization (Day 3-4)
Tasks:
- improve prompt template and enforce strict JSON response parsing
- add retry-on-malformed-response (1 retry)
- fallback to rule-based score if Cerebras call fails
- persist tokens used and estimated cost
- keep 7-day cache for same resume-job pair

Done when:
- scoring endpoint returns consistent structure in success and fallback modes

### Step 6: Recruiter Basic Pipeline (Day 4)
Tasks:
- keep current job CRUD and enforce recruiter ownership
- add simple `GET /api/v1/recruiter/candidates/{job_id}`
- return candidate resume id, score id, overall score, timestamp

Done when:
- recruiter can post jobs and view candidate scores

### Step 7: Reliability and Test Pass (Day 5)
Tasks:
- unit tests for Google auth service, onboarding validators, parser, LLM parser
- integration test of main flow:
  - Google login -> onboarding -> upload -> score -> history
- update API docs and sample payloads in Swagger

Done when:
- critical path tests pass and demo flow is stable

## 7) Acceptance Criteria for 70% MVP
Phase 1 is complete if all are true:
- Google sign-in works and returns JWT
- onboarding collects role-specific details and persists them
- student can upload resume and get parsed screening output
- student can generate ATS score via Cerebras and see score history
- recruiter can create jobs and view candidate scores
- critical API tests pass for auth, onboarding, upload, and scoring

## 8) Backend Risks and Mitigation
- Google token verification errors:
  - mitigate with strict audience/issuer checks and clear 401 messages
- Cerebras malformed output or timeout:
  - mitigate with strict parser, one retry, rule-based fallback
- Resume parsing failures:
  - mitigate with multi-parser fallback and user-facing parse error reason
- Scope creep:
  - defer GitHub deep analysis and advanced analytics to Phase 2

## 9) Phase 2 Hand-off
After this MVP, implement:
- GitHub and portfolio weighted scoring
- advanced recruiter ranking and filtering
- notification/email workflows
- admin analytics and CI/CD hardening
