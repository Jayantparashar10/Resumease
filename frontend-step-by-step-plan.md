# Resumease Frontend Plan - Phase 1 Quick MVP

## 1) Frontend Objective
Build a role-based frontend that starts with Google onboarding and supports:
- Student: onboarding -> resume screening -> ATS scoring
- Recruiter: onboarding -> job posting -> candidate scores

This plan is aligned with backend Phase 1 contracts.

## 2) Core Frontend User Journey
1. Landing page -> Continue with Google.
2. After token exchange, check `onboarding_completed`.
3. If incomplete, redirect to onboarding form.
4. After onboarding, route by role:
- student -> student dashboard
- recruiter -> recruiter dashboard

## 3) Required Pages and Route Plan

### Public Routes
- `/` Landing page
- `/auth/callback` Google callback/token exchange page

### Shared Protected Routes
- `/onboarding` Role-based onboarding form
- `/profile` Edit profile

### Student Routes
- `/student/dashboard`
- `/student/resumes`
- `/student/jobs`
- `/student/ats-history`

### Recruiter Routes
- `/recruiter/dashboard`
- `/recruiter/jobs`
- `/recruiter/jobs/[id]/candidates`

## 4) Endpoint Mapping by Feature

## 4.1 Authentication + Session
1. Google login exchange
- `POST /api/v1/auth/google`

2. Restore session on app load
- `GET /api/v1/auth/me`

3. Optional logout call
- `POST /api/v1/auth/logout`

## 4.2 Onboarding
1. Submit onboarding form
- `POST /api/v1/auth/onboarding`

2. Update profile
- `PUT /api/v1/auth/profile`

## 4.3 Student Features
1. Upload resume
- `POST /api/v1/resumes/upload`

2. List resumes
- `GET /api/v1/resumes/list`

3. Resume details
- `GET /api/v1/resumes/{resume_id}`

4. Delete resume
- `DELETE /api/v1/resumes/{resume_id}`

5. View jobs
- `GET /api/v1/jobs/list`

6. Score resume against job
- `POST /api/v1/ats/score`

7. Get score details
- `GET /api/v1/ats/score/{score_id}`

8. Score history
- `GET /api/v1/ats/history`

## 4.4 Recruiter Features
1. Create job
- `POST /api/v1/jobs/create`

2. List recruiter jobs
- `GET /api/v1/jobs/list`

3. Get single job
- `GET /api/v1/jobs/{job_id}`

4. Update job
- `PUT /api/v1/jobs/{job_id}`

5. Delete job
- `DELETE /api/v1/jobs/{job_id}`

6. Candidate scores for job
- `GET /api/v1/recruiter/candidates/{job_id}`

## 5) Step-by-Step Frontend Build Plan

### Step 1: Auth Foundation + Route Guards (Day 1)
Tasks:
- extend auth context for Google flow and onboarding status
- add `ProtectedRoute` and `RoleRoute` wrappers
- persist JWT in localStorage (current pattern can stay)
- on app load, call `GET /api/v1/auth/me`

UI behavior:
- no token -> landing/login
- token + onboarding incomplete -> onboarding page
- token + onboarding complete -> role dashboard

### Step 2: Google Login UX (Day 1)
Tasks:
- add "Continue with Google" button on landing/login
- handle callback and send id token to backend
- call `POST /api/v1/auth/google`
- store access token + user state

Error states:
- popup blocked
- invalid token
- network failure

### Step 3: Role-Based Onboarding Screen (Day 2)
Tasks:
- create onboarding form with shared fields and role-specific fields
- student fields:
  - college, degree, graduation_year, target_roles, skills_self_reported
- recruiter fields:
  - company, designation, hiring_for, company_size
- submit to `POST /api/v1/auth/onboarding`
- add profile edit page using `PUT /api/v1/auth/profile`

Validation:
- role-specific required fields
- year and list input validation

### Step 4: Student MVP Screens (Day 2-3)
Tasks:
- build student dashboard summary cards
- build resumes page:
  - upload -> `POST /api/v1/resumes/upload`
  - list -> `GET /api/v1/resumes/list`
  - detail -> `GET /api/v1/resumes/{resume_id}`
  - delete -> `DELETE /api/v1/resumes/{resume_id}`
- build jobs list page -> `GET /api/v1/jobs/list`
- add score action button on job card:
  - `POST /api/v1/ats/score` with selected resume/job
- build ATS history page -> `GET /api/v1/ats/history`
- build ATS score detail modal/page -> `GET /api/v1/ats/score/{score_id}`

### Step 5: Recruiter MVP Screens (Day 3-4)
Tasks:
- build recruiter dashboard (basic metrics from job and candidate counts)
- build jobs management page:
  - create, edit, delete with jobs endpoints
- build job candidates page:
  - list candidate ATS scores via `GET /api/v1/recruiter/candidates/{job_id}`

### Step 6: Shared UX States + Reliability (Day 4)
Tasks:
- loading and empty states for each list page
- toast alerts for success/error
- 401 interceptor behavior (already present) for redirect to login
- onboarding-incomplete redirect guard on all protected role pages

### Step 7: Frontend Testing + Demo Prep (Day 5)
Tasks:
- test auth and onboarding flow manually and with component tests
- test student flow: upload -> score -> history
- test recruiter flow: create job -> view candidates
- verify mobile responsiveness for core pages

## 6) Frontend Component Checklist
- `components/auth/GoogleSignInButton`
- `components/auth/AuthGuard`
- `components/auth/RoleGuard`
- `components/onboarding/OnboardingForm`
- `components/student/ResumeUploader`
- `components/student/ResumeList`
- `components/student/JobList`
- `components/student/ScoreCard`
- `components/recruiter/JobForm`
- `components/recruiter/CandidateScoreTable`

## 7) API Client Changes Needed
Update frontend API layer to add:
- `authApi.googleLogin(id_token)` -> POST `/api/v1/auth/google`
- `authApi.completeOnboarding(payload)` -> POST `/api/v1/auth/onboarding`
- `authApi.updateProfile(payload)` -> PUT `/api/v1/auth/profile`
- `recruiterApi.getCandidates(jobId)` -> GET `/api/v1/recruiter/candidates/{job_id}`

Keep existing clients for resumes, jobs, and ats.

## 8) Definition of Done (Frontend Phase 1)
Frontend Phase 1 is done when:
- user can sign in with Google and complete onboarding
- role-based routing works reliably
- student can upload resume and run ATS scoring
- student can view ATS history and score details
- recruiter can manage jobs and view candidate scores
- core pages are usable on desktop and mobile
