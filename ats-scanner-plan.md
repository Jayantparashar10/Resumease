Perfect! Based on your team structure and timeline (now until mid-April = ~10 weeks), here's a detailed week-by-week plan:

## **Project Overview**

**Team**: 5 members
- **Jayant & Aditey**: FastAPI backend, MongoDB, LLM integration, GitHub/LinkedIn/link analysis, Docker/CI-CD
- **Rishav & Samir**: Full stack - API integration, recruiter dashboard, authentication system
- **E Pravin**: Frontend UI/UX, React components

**Tech Stack**:
- Backend: FastAPI + MongoDB Atlas (512MB free) [hevodata](https://hevodata.com/learn/mongodb-storage-and-hosting-services/)
- Frontend: React + Vite + Tailwind CSS + shadcn/ui
- LLM: Cerebras API gpt-oss-120B ($0.25/M input, $0.69/M output) [cerebras](https://www.cerebras.ai/blog/cerebras-launches-openai-s-gpt-oss-120b-at-a-blistering-3-000-tokens-sec)
- Hosting: Render.com (750 hours free/month) or Railway (free tier) [reddit](https://www.reddit.com/r/FastAPI/comments/1aljf4h/free_fastapi_hosting/)
- Database: MongoDB Atlas Free Tier [testdriven](https://testdriven.io/blog/fastapi-mongo/)
- CI/CD: GitHub Actions + Docker → Render/Railway [youtube](https://www.youtube.com/watch?v=QcN89peJfWQ)
- File Storage: MongoDB GridFS for resume PDFs
- Background Jobs: FastAPI BackgroundTasks (MVP) → Celery + Redis (if needed)

***

## **Link Extraction & Analysis System: Detailed Explanation**

### **Phase 1: Resume Link Extraction**

**Step 1: Resume Text Extraction**
- Parse uploaded PDF/DOCX using pypdf2, pdfplumber, or python-docx
- Extract raw text content from all pages
- Clean text: remove extra whitespace, special characters that break parsing

**Step 2: Link Detection via Regex Patterns**
- Scan extracted text for URL patterns and social media handles
- Detection patterns for:
  - **GitHub**: `github.com/username`, `@username` in context
  - **LinkedIn**: `linkedin.com/in/profile-name`
  - **Portfolio**: Any http/https URL not matching above patterns
  - **HuggingFace**: `huggingface.co/username`
  - **LeetCode**: `leetcode.com/username`
  - **Email**: Standard email regex
  - **Phone**: Country-specific phone patterns
- Store extracted links in structured format with link type classification

**Step 3: Username/Profile Extraction**
- Parse URLs to extract actual username/profile ID
- Handle various URL formats (with/without www, trailing slashes, query parameters)
- Normalize usernames for API calls

### **Phase 2: GitHub Profile Analysis**

**What We Extract:**
1. **Basic Profile Data**
   - Name, bio, location, company
   - Public repositories count
   - Followers, following count
   - Account creation date

2. **Repository Analysis (Top 10 by stars/activity)**
   - Repository name, description, URL
   - Primary language used
   - Stars, forks, watchers count
   - Last commit date
   - Commit frequency (activity score)
   - Topics/tags

3. **Language Proficiency**
   - Aggregate all languages across repos
   - Calculate percentage distribution
   - Identify primary vs secondary languages

4. **Contribution Patterns**
   - Commit count (last 6 months)
   - Active days per week
   - Contribution consistency score

5. **Code Quality Indicators**
   - README quality (length, structure)
   - License usage
   - Documentation presence
   - CI/CD setup (GitHub Actions)

**API Approach:**
- Use GitHub REST API v3 (60 requests/hour unauthenticated, 5000/hour with token)
- Endpoints used:
  - `/users/{username}` - Profile data
  - `/users/{username}/repos` - Repository list
  - `/repos/{owner}/{repo}` - Individual repo details
  - `/repos/{owner}/{repo}/languages` - Language breakdown
  - `/repos/{owner}/{repo}/stats/commit_activity` - Commit stats

**Scoring Logic:**
- Repository quality: stars × 0.3 + forks × 0.2 + recent_commits × 0.5
- Profile completeness: bio + readme + documentation presence
- Activity level: commits_last_6_months / 26 (weekly average)
- Language diversity: unique_languages_count × relevance_to_job

### **Phase 3: LinkedIn Analysis**

**Challenge**: LinkedIn blocks scraping and API access is restricted

**Workaround Approaches:**
1. **Extract from Resume**
   - Don't rely on live LinkedIn scraping
   - Use profile URL validation only (check if accessible)
   - Trust resume content for LinkedIn-listed skills/experience

2. **Profile Validation**
   - Check if LinkedIn URL returns 200 status
   - Verify URL format is valid
   - Flag if profile is private/inaccessible
   - Extract vanity URL username for display

3. **Alternative: Manual Input**
   - Ask candidates to paste LinkedIn "About" section
   - Parse pasted content for skills, headline, experience keywords
   - Match keywords with job requirements

**What We Can Extract (Without API):**
- Profile URL validity
- Vanity username
- Public profile accessibility status
- Note: Actual profile scraping violates LinkedIn TOS, so we rely on resume content

### **Phase 4: Portfolio Website Analysis**

**Step 1: Website Accessibility**
- Send HTTP request to portfolio URL
- Check response status (200 = live, 404 = broken link)
- Verify SSL certificate presence
- Measure load time

**Step 2: Content Extraction**
- Fetch HTML content using httpx or requests
- Parse HTML with BeautifulSoup4
- Extract:
  - Meta tags (title, description, keywords)
  - All heading tags (h1-h6) for project titles
  - Technology mentions (React, Python, AWS, etc.)
  - Links to live projects or demos
  - Contact information
  - Social proof (testimonials, client logos)

**Step 3: Technology Detection**
- Scan HTML for framework indicators:
  - React: `__REACT__`, `react-root` div IDs
  - Next.js: `__NEXT_DATA__` script tags
  - Vue: `v-app`, Vue-specific attributes
  - WordPress: `wp-content` in links
- Check loaded JavaScript files for library names
- Identify CSS frameworks (Bootstrap, Tailwind classes)

**Step 4: Project Identification**
- Parse project sections (headings containing "project", "work", "portfolio")
- Extract project names and descriptions
- Look for GitHub repo links within portfolio
- Screenshot generation (optional, using headless browser)

**Scoring Logic:**
- Website live + SSL: +20 points
- Professional design indicators: +15 points
- Number of projects showcased: +10 per project (max 30)
- Technology stack alignment with job: +25 points
- Load time < 3s: +10 points

### **Phase 5: HuggingFace Analysis (Bonus)**

**What We Extract:**
- Public models published
- Datasets shared
- Model downloads count
- Community engagement (likes, comments)
- Specialization area (NLP, Computer Vision, etc.)

**API Approach:**
- HuggingFace Inference API (free tier available)
- Endpoints:
  - `/api/models/{username}` - User's models
  - `/api/datasets/{username}` - User's datasets

**Scoring Logic:**
- Published models/datasets count × 20
- Total downloads × 0.1
- Community engagement score

### **Phase 6: Aggregated Link Score Calculation**

**Weighted Scoring System:**
- GitHub Profile: 40% weight
  - Repository quality: 15%
  - Activity level: 15%
  - Language match: 10%
- Portfolio Website: 30% weight
  - Professional presence: 10%
  - Projects relevance: 20%
- LinkedIn: 15% weight
  - Profile completeness: 15%
- Other Links (HuggingFace, LeetCode): 15% weight

**Final Link Verification Score: 0-100**
- 90-100: Exceptional online presence with strong technical portfolio
- 70-89: Good presence with active contributions
- 50-69: Basic presence, some verification
- 30-49: Minimal presence, links present but inactive
- 0-29: Broken/invalid links or no presence

**Red Flags Detection:**
- All links return 404 (likely fake resume)
- GitHub account < 1 month old with suspicious activity
- No commits in last 12 months on claimed "active" projects
- Mismatched names between resume and GitHub profile
- Private repositories only (can't verify work)

**Output Format:**
```json
{
  "links_found": {
    "github": "github.com/username",
    "linkedin": "linkedin.com/in/profile",
    "portfolio": "https://example.com"
  },
  "verification_score": 87,
  "github_analysis": {
    "repos_count": 23,
    "top_languages": ["Python", "JavaScript", "Go"],
    "total_stars": 145,
    "activity_score": 92,
    "notable_repos": [...]
  },
  "portfolio_analysis": {
    "is_live": true,
    "technologies_detected": ["React", "Node.js", "AWS"],
    "projects_count": 5
  },
  "red_flags": [],
  "confidence_level": "high"
}
```

***

## **Week 1 (Feb 3-9): Project Setup & Architecture**

### **Day 1-2: Repository & Environment Setup**

**Everyone (2 hours)**
- Create GitHub organization "ATS-Scanner" or use shared account
- Initialize monorepo structure with /backend and /frontend folders
- Set up branch protection rules: main (protected), dev (active development), feature/* (individual features)
- Create .gitignore for Python and Node.js
- Set up Discord/Slack channel with dedicated threads per module
- Install required software: Python 3.11+, Node.js 18+, MongoDB Compass, Postman/Thunder Client, Docker Desktop

**Jayant & Aditey (Backend) - 10 hours**
- Initialize FastAPI project:
  - Create virtual environment
  - Install core dependencies: fastapi, uvicorn, motor (async MongoDB), pydantic, python-dotenv, httpx, pytest
  - Set up project structure: /app/routers, /app/models, /app/services, /app/utils, /app/config
- Create .env.example with placeholders: MONGODB_URI, JWT_SECRET, CEREBRAS_API_KEY
- Create main.py with basic FastAPI app, CORS middleware, health check endpoint
- Set up MongoDB Atlas:
  - Create free M0 cluster
  - Whitelist IP 0.0.0.0/0 for development
  - Create database "ats_db" with collections: users, resumes, jobs, ats_scores
  - Get connection string and test local connection
- Create database.py with Motor async client initialization
- Write basic Pydantic models: UserBase, ResumeBase, JobPostingBase
- Test MongoDB CRUD operations with pytest
- Document API structure in README: /api/v1/auth, /api/v1/resumes, /api/v1/jobs, /api/v1/analysis, /api/v1/ats

**Rishav & Samir (Full Stack) - 8 hours**
- Design MongoDB schema document:
  - Users collection: _id, email, password_hash, role (student/recruiter), created_at, profile{}
  - Resumes collection: _id, user_id, filename, file_url, parsed_text, extracted_links{}, skills[], uploaded_at
  - Jobs collection: _id, recruiter_id, title, description, required_skills[], posted_at, status
  - ATS_Scores collection: _id, resume_id, job_id, overall_score, breakdown{}, link_verification{}, timestamp
- Create ER diagram showing relationships
- Create data flow diagram: Upload → Parse → Extract Links → Analyze → Score → Store
- Research JWT authentication flow for FastAPI
- Set up Postman workspace with environment variables
- Create API endpoint documentation template

**Pravin (Frontend) - 8 hours**
- Initialize React project with Vite: npm create vite@latest frontend -- --template react
- Install dependencies: react-router-dom, axios, tailwindcss, shadcn/ui, lucide-react (icons)
- Configure Tailwind CSS with shadcn/ui
- Set up routing structure in App.jsx:
  - / - Landing page
  - /login, /register - Auth pages
  - /student/dashboard - Student view
  - /recruiter/dashboard - Recruiter view
  - /resume/upload - Upload interface
  - /resume/:id - Resume detail + ATS score
- Create folder structure: /components/common, /components/student, /components/recruiter, /pages, /services, /utils, /hooks
- Create axios instance in services/api.js with base URL from env
- Set up .env with VITE_API_URL=http://localhost:8000

**Deliverable Checklist:**
- [ ] GitHub repo with proper structure
- [ ] FastAPI app running on localhost:8000 with /health endpoint
- [ ] MongoDB Atlas connected and test data inserted
- [ ] React app running on localhost:5173
- [ ] README with setup instructions
- [ ] Team wiki with tech stack decisions documented

***

## **Week 2 (Feb 10-16): Authentication & Resume Upload**

### **Day 1-3: Authentication System**

**Rishav & Samir (Lead) - 12 hours**
- Install dependencies: python-jose, passlib, bcrypt, python-multipart
- Create /app/services/auth.py:
  - hash_password function using bcrypt
  - verify_password function
  - create_access_token with 24hr expiry
  - verify_token and get_current_user dependency
- Create /app/routers/auth.py:
  - POST /api/v1/auth/register - Create user with hashed password
  - POST /api/v1/auth/login - Return JWT token
  - GET /api/v1/auth/me - Get current user details (protected route)
- Add role-based middleware: student vs recruiter access control
- Create MongoDB indexes on email field for fast lookups
- Write 10+ unit tests for auth flows
- Document authentication in Postman with example tokens

**Jayant & Aditey (Support) - 5 hours**
- Review and test authentication endpoints
- Add error handling for duplicate email, invalid credentials
- Set up environment variable management
- Create utility functions for token validation

**Pravin (Frontend Auth) - 10 hours**
- Create Login and Register page components
- Build reusable form components with validation
- Implement form validation: email format, password strength (8+ chars, special char)
- Create auth context/hook for managing user state
- Store JWT in localStorage and add to axios headers
- Create ProtectedRoute component checking authentication
- Add loading states and error messages
- Design responsive forms with Tailwind

### **Day 4-7: Resume Upload & Parsing**

**Jayant & Aditey (Lead) - 15 hours**
- Install: pypdf2, pdfplumber, python-docx, python-magic (file type detection)
- Create /app/services/resume_parser.py:
  - extract_text_from_pdf function handling both pypdf2 and pdfplumber fallback
  - extract_text_from_docx function
  - validate_file_type function checking MIME type
  - extract_links function using regex for URLs, emails, phone numbers
  - extract_skills function with keyword matching from tech skills database
  - extract_sections function identifying Education, Experience, Projects sections
- Create /app/routers/resumes.py:
  - POST /api/v1/resumes/upload - Accept file, parse, store in MongoDB GridFS
  - GET /api/v1/resumes/list - Get user's uploaded resumes
  - GET /api/v1/resumes/:id - Get specific resume details
  - DELETE /api/v1/resumes/:id - Delete resume
- Set up GridFS for binary file storage in MongoDB
- Add file size validation (max 5MB)
- Add file format validation (PDF, DOCX only)
- Extract structured data: name, email, phone, links, skills, experience years
- Write 15+ tests for various resume formats
- Handle edge cases: encrypted PDFs, scanned PDFs (OCR not in MVP), corrupt files

**Rishav & Samir (Support) - 6 hours**
- Create skills database: JSON file with 200+ tech skills categorized by domain
- Build skill matching algorithm comparing resume skills vs job requirements
- Add resume metadata fields in database
- Test file upload with various resume formats
- Create mock data generator for testing

**Pravin (Frontend Upload) - 12 hours**
- Create drag-and-drop file upload component using react-dropzone
- Show file preview before upload
- Add upload progress bar
- Create resume list view showing: filename, upload date, status
- Create resume detail modal displaying parsed information
- Add delete confirmation dialog
- Show extracted skills as tags/badges
- Show extracted links with icons
- Add empty state illustrations when no resumes uploaded
- Mobile responsive upload interface

**Deliverable Checklist:**
- [ ] Working registration and login with JWT
- [ ] Protected routes requiring authentication
- [ ] Resume upload accepting PDF/DOCX
- [ ] Text extraction working for 90%+ of resumes
- [ ] Links and skills extracted and displayed
- [ ] Uploaded resumes stored in MongoDB
- [ ] Resume list and detail views working
- [ ] 25+ tests passing

***

## **Week 3 (Feb 17-23): Link Extraction & GitHub Analysis**

### **Day 1-2: Enhanced Link Extraction**

**Jayant & Aditey (Lead) - 10 hours**
- Create /app/services/link_extractor.py:
  - Advanced regex patterns for GitHub, LinkedIn, Portfolio, HuggingFace, LeetCode, CodePen, Medium
  - extract_all_links function returning dict with categorized links
  - validate_url function checking URL format and reachability
  - normalize_username function parsing URLs to extract clean usernames
  - detect_link_type function classifying URLs by platform
- Handle edge cases: 
  - URLs with www vs without
  - HTTP vs HTTPS
  - Trailing slashes
  - URL shorteners (bit.ly, tinyurl) - expand them
  - Social media @mentions without full URLs
- Create /app/models/link_analysis.py Pydantic model for structured storage
- Add link extraction to resume parsing pipeline
- Write 20+ tests for different URL formats

**Rishav & Samir (Support) - 6 hours**
- Build link validation service checking HTTP status codes
- Create database fields for link verification results
- Set up retry logic for failed HTTP requests
- Test link extraction on 50+ sample resumes

### **Day 3-7: GitHub API Integration & Analysis**

**Jayant & Aditey (Lead) - 20 hours**
- Create GitHub personal access token (classic) with repo and user scopes
- Install PyGithub library for easier API interaction
- Create /app/services/github_analyzer.py:
  - fetch_user_profile function getting name, bio, location, followers, repos count
  - fetch_repositories function getting all public repos sorted by stars/updated
  - fetch_repo_details function for each repo: languages, stars, forks, commits
  - fetch_language_stats function aggregating language percentages across repos
  - calculate_activity_score based on commit frequency and recency
  - calculate_repo_quality_score based on stars, forks, readme, documentation
  - detect_trending_projects identifying recently popular repos
  - analyze_contribution_patterns from commit history
- Handle API rate limiting:
  - Check X-RateLimit-Remaining header
  - Implement exponential backoff
  - Cache results for 24 hours in MongoDB
  - Use authenticated requests (5000/hour limit)
- Create /app/routers/analysis.py:
  - POST /api/v1/analysis/github - Trigger GitHub analysis for a username
  - GET /api/v1/analysis/github/:username - Get cached analysis
  - POST /api/v1/analysis/links - Analyze all links from a resume
- Parse repository READMEs to extract project descriptions
- Identify key projects: most starred, most recent, language-diverse
- Calculate technology proficiency scores
- Store analysis results with timestamp in MongoDB
- Implement background task for async analysis (FastAPI BackgroundTasks)
- Write 15+ tests with mocked GitHub API responses

**Rishav & Samir (Support) - 8 hours**
- Create mock GitHub API responses for testing without hitting rate limits
- Build admin dashboard to monitor API usage and rate limits
- Set up logging for all GitHub API calls
- Create visualization data structure for frontend consumption
- Test with various GitHub profiles: active devs, students, inactive accounts

**Pravin (Frontend) - 12 hours**
- Create GitHub analysis visualization component:
  - Profile summary card with avatar, bio, stats
  - Language distribution pie chart or bar graph
  - Repository showcase with top 5-10 repos
  - Activity timeline or contribution graph
  - Skill tags extracted from languages
- Create loading skeleton during analysis
- Show analysis status: pending, in-progress, completed, failed
- Add refresh button to reanalyze (with cooldown timer)
- Create comparison view showing resume skills vs GitHub languages
- Mobile responsive design for all visualizations
- Add error states for private profiles or API failures

**Deliverable Checklist:**
- [ ] Link extraction working for 95% of URLs in resumes
- [ ] GitHub API integration complete with rate limit handling
- [ ] Profile and repository analysis functional
- [ ] Language and activity metrics calculated
- [ ] Analysis results stored in MongoDB
- [ ] Frontend displaying GitHub insights beautifully
- [ ] Background jobs running for async processing
- [ ] 35+ tests passing

***

## **Week 4 (Feb 24-Mar 2): Portfolio Analysis & ATS Scoring with LLM**

### **Day 1-3: Portfolio Website Analysis**

**Jayant & Aditey (Lead) - 12 hours**
- Install: httpx (async HTTP), beautifulsoup4, lxml
- Create /app/services/portfolio_analyzer.py:
  - check_website_accessibility function with timeout handling
  - fetch_website_content function with user-agent headers
  - extract_meta_tags function for title, description, keywords, og:tags
  - extract_technologies function detecting React, Vue, Angular, Next.js, WordPress, etc.
  - extract_project_sections parsing HTML for portfolio projects
  - analyze_performance measuring load time and response size
  - check_ssl_certificate validation
  - extract_contact_info finding email, social links
  - calculate_portfolio_score based on presence, professionalism, projects count
- Handle various website structures: single-page apps, multi-page sites, no-JS sites
- Add User-Agent rotation to avoid blocking
- Implement caching to avoid re-scraping
- Create fallback for failed scrapes
- Write 12+ tests with mocked HTTP responses

**Rishav & Samir (Support) - 6 hours**
- Build URL validation and normalization
- Create technology dictionary for detection
- Test with 30+ portfolio websites
- Handle edge cases: broken sites, redirect chains, 404s

### **Day 4-7: Cerebras LLM Integration for ATS Scoring**

**Jayant & Aditey (Lead) - 18 hours**
- Sign up for Cerebras API and get API key
- Install cerebras-sdk or use httpx for direct API calls
- Create /app/services/llm_service.py:
  - initialize_client function with API key
  - generate_ats_prompt function building structured prompt with:
    - Resume text
    - Job description
    - GitHub analysis summary
    - Portfolio insights
    - Skills match analysis
  - call_cerebras_api function handling requests with retry logic
  - parse_llm_response extracting structured scores and feedback
  - calculate_final_score combining LLM output with link verification
  - track_token_usage for cost monitoring
- Create comprehensive prompt template:
  - Ask LLM to rate 0-100 on: Skills Match, Experience Relevance, Project Quality, Cultural Fit
  - Request actionable feedback for improvement
  - Ask for keyword optimization suggestions
  - Request missing skills identification
- Create /app/routers/ats.py:
  - POST /api/v1/ats/score - Score resume against job posting
  - GET /api/v1/ats/score/:id - Get existing score
  - POST /api/v1/ats/batch-score - Score multiple resumes for one job
- Implement caching: same resume + job combo cached for 7 days
- Add cost tracking in database: tokens used, cost per request
- Set max tokens limit to prevent runaway costs
- Parse structured output from LLM into JSON
- Combine LLM score with link verification score: 70% LLM + 30% links
- Create feedback categories: strengths, weaknesses, suggestions
- Write 10+ tests with mocked LLM responses

**Rishav & Samir (API Testing) - 8 hours**
- Create job posting CRUD endpoints:
  - POST /api/v1/jobs/create - Recruiter creates job
  - GET /api/v1/jobs/list - List all jobs (with pagination)
  - GET /api/v1/jobs/:id - Get single job details
  - PUT /api/v1/jobs/:id - Update job
  - DELETE /api/v1/jobs/:id - Soft delete job
- Add required_skills array field to job model
- Extract required skills from job description using NLP or regex
- Build skills matching algorithm comparing resume vs job
- Test ATS scoring with 20+ resume-job combinations
- Monitor LLM costs and optimize prompts

**Pravin (Frontend ATS Display) - 14 hours**
- Create ATS score page with beautiful visualizations:
  - Overall score with animated progress circle
  - Category breakdown: 4 horizontal bars for each metric
  - Skills match section: matched skills in green, missing in red
  - Feedback sections with expandable cards
  - Suggestions list with checkboxes for tracking improvements
- Create job listing page for students:
  - Search and filter by skills
  - Apply to jobs (triggers ATS scoring)
  - See matching percentage before applying
- Create job application status tracker
- Add loading animations during LLM processing (can take 10-30 seconds)
- Show token usage and cost to users (transparency)
- Create before/after comparison when resume improved
- Mobile responsive score display

**Deliverable Checklist:**
- [ ] Portfolio analysis extracting technologies and projects
- [ ] Cerebras LLM integration complete
- [ ] ATS scoring endpoint functional
- [ ] Combined scoring: LLM + GitHub + Portfolio
- [ ] Detailed feedback generation working
- [ ] Job posting CRUD complete
- [ ] Cost tracking implemented
- [ ] Frontend displaying scores beautifully
- [ ] 30+ tests passing
- [ ] Sample scoring under $1 in API costs

***

## **Week 5 (Mar 3-9): Recruiter Features & Candidate Matching**

### **Day 1-3: Candidate Recommendation System**

**Jayant & Aditey (Lead) - 12 hours**
- Create /app/services/matching_service.py:
  - calculate_match_percentage function comparing resume skills with job requirements
  - rank_candidates_for_job function sorting by combined ATS + link score
  - filter_candidates function by score threshold, location, experience years
  - generate_recruiter_summary function creating candidate highlights
  - batch_score_resumes function processing multiple candidates efficiently
- Create /app/routers/recruiter.py:
  - GET /api/v1/recruiter/candidates/:job_id - Get all candidates for a job
  - GET /api/v1/recruiter/candidates/recommended/:job_id - Top 10 candidates
  - POST /api/v1/recruiter/shortlist - Add candidate to shortlist
  - POST /api/v1/recruiter/reject - Reject candidate
  - GET /api/v1/recruiter/analytics - Dashboard statistics
- Implement smart filtering:
  - Minimum ATS score threshold
  - Required skills must-haves
  - Experience range
  - GitHub activity level
  - Portfolio presence
- Create candidate comparison feature: side-by-side view of 2-3 candidates
- Add bulk actions: shortlist multiple, reject multiple
- Write 12+ tests for ranking algorithms

**Rishav & Samir (Backend Support) - 10 hours**
- Build email notification system:
  - Install python-email or SendGrid SDK
  - Use Gmail SMTP (free) or SendGrid free tier (100 emails/day)
  - Create email templates: application received, shortlisted, rejected
  - send_email function with HTML templates
  - Queue emails to avoid blocking requests
- Create notification preferences model
- Add email triggers on status changes
- Build activity log tracking all recruiter actions
- Implement rate limiting on API endpoints: 100 requests/hour per user
- Add API key authentication for recruiter accounts
- Create audit trail for compliance

### **Day 4-7: Recruiter Dashboard & Candidate Management**

**Pravin (Lead) - 18 hours**
- Build comprehensive recruiter dashboard:
  - **Overview Section**:
    - Total jobs posted count
    - Total applications received
    - Average ATS score across applications
    - Top skills in candidate pool
  - **Job List View**:
    - Card/table view toggle
    - Each job showing: title, applications count, posted date, status
    - Quick actions: view candidates, edit, close job
    - Search and filter jobs
  - **Candidate Pipeline**:
    - Kanban board: New Applications → Reviewed → Shortlisted → Rejected
    - Drag-and-drop to change status
    - Candidate cards showing: name, ATS score, key skills, GitHub link
    - Click card to expand full profile
  - **Candidate Profile Modal**:
    - Resume preview/download
    - ATS score breakdown
    - GitHub profile visualization
    - Portfolio preview
    - Action buttons: shortlist, reject, email, notes
  - **Analytics Page**:
    - Applications over time line chart
    - Score distribution histogram
    - Top technologies bar chart
    - Conversion funnel: Applied → Shortlisted → Interviewed
- Create mobile-responsive tables using data-tables
- Add export functionality: download candidates CSV
- Implement infinite scroll for candidate lists
- Add filters: score range, skills, GitHub activity, application date

**Rishav & Samir (Frontend Support) - 6 hours**
- Build real-time notifications using WebSocket or polling
- Create notification bell icon with unread count
- Add toast messages for successful actions
- Implement optimistic UI updates for faster feel
- Test recruiter flow end-to-end

**Jayant & Aditey (API Support) - 6 hours**
- Optimize database queries with proper indexing
- Add pagination to all list endpoints: limit=20, offset=0
- Implement search functionality: MongoDB text search on skills, job titles
- Cache frequently accessed data: job lists, candidate counts
- Add response time logging

**Deliverable Checklist:**
- [ ] Candidate ranking and filtering working
- [ ] Email notification system functional
- [ ] Recruiter dashboard complete with all sections
- [ ] Candidate pipeline with drag-and-drop
- [ ] Bulk actions working
- [ ] Rate limiting implemented
- [ ] Export to CSV functional
- [ ] 20+ tests passing

***

## **Week 6 (Mar 10-16): Student Dashboard, Testing & Bug Fixes**

### **Day 1-3: Student Dashboard Completion**

**Pravin (Lead) - 12 hours**
- Build student dashboard with sections:
  - **Overview**:
    - Total resumes uploaded
    - Average ATS score across applications
    - Jobs applied count
    - Profile completion percentage
  - **Resumes Section**:
    - List of uploaded resumes with thumbnails
    - Each showing: filename, upload date, times used
    - Quick actions: download, delete, view analysis
    - "Upload New Resume" prominent CTA
  - **Applications Section**:
    - Table of applied jobs with: company, role, application date, status, ATS score
    - Color-coded status badges
    - Filter by status: pending, shortlisted, rejected
    - Click to see detailed ATS feedback
  - **Profile Verification**:
    - GitHub connection status with link
    - LinkedIn connection status
    - Portfolio verification status
    - "Verify Now" buttons triggering analysis
  - **Improvement Suggestions**:
    - AI-generated tips from ATS feedback
    - Missing skills to add
    - Resume optimization checklist
- Create job search page:
  - Search by keywords, location, company
  - Filter by required skills, experience level
  - Job cards showing: title, company, required skills, posted date
  - Match percentage indicator before applying
  - "Apply" button triggering ATS scoring
- Add profile settings page:
  - Update personal info
  - Change password
  - Notification preferences
  - Account deletion

**Rishav & Samir (Backend Support) - 8 hours**
- Create student-specific endpoints:
  - GET /api/v1/student/dashboard - Dashboard stats
  - GET /api/v1/student/applications - Application history
  - POST /api/v1/student/apply/:job_id - Apply to job (triggers scoring)
  - GET /api/v1/student/recommendations - Job recommendations based on skills
- Build job recommendation algorithm:
  - Match student skills with job requirements
  - Consider student's previous applications
  - Weight by ATS score likelihood
- Add profile completion calculator
- Implement application tracking

### **Day 4-7: Comprehensive Testing & Bug Fixing**

**Everyone (30 hours total)**
- **Unit Testing**:
  - Jayant & Aditey: Backend services with pytest (target 80% coverage)
  - Test all parsing functions with edge cases
  - Test API rate limiting and error handling
  - Mock all external APIs (GitHub, Cerebras)
- **Integration Testing**:
  - Test full flows: signup → upload → analyze → score → apply
  - Test recruiter flows: post job → view candidates → shortlist
  - Test authentication across all endpoints
  - Verify CORS settings
- **Frontend Testing**:
  - Pravin: Component testing with React Testing Library
  - Test form validations
  - Test API error handling and loading states
  - Test responsive design on mobile devices
- **Manual Testing**:
  - Everyone: Create test accounts and perform realistic workflows
  - Test with 20+ real resumes in various formats
  - Test with 10+ real job postings
  - Test edge cases: very long resumes, no GitHub links, broken portfolio URLs
- **Bug Tracking & Fixing**:
  - Use GitHub Issues to track all bugs
  - Prioritize: Critical (blocks core function) → High → Medium → Low
  - Daily standup reviewing bug status
  - Fix critical and high bugs immediately

**Performance Optimization:**
- Jayant & Aditey:
  - Add database indexes on frequently queried fields
  - Optimize slow queries (use MongoDB explain)
  - Implement caching with TTL for expensive operations
  - Reduce LLM API calls through aggressive caching
- Pravin:
  - Code splitting for faster initial load
  - Lazy load heavy components
  - Optimize images and assets
  - Add service worker for offline capability

**Security Hardening:**
- Implement input validation on all endpoints using Pydantic
- Add SQL injection protection (MongoDB parameterized queries)
- Implement XSS protection in frontend (sanitize user inputs)
- Add HTTPS redirect in production
- Implement CSRF protection
- Add security headers: CSP, X-Frame-Options, etc.
- Rate limit authentication endpoints: 5 attempts per 15 minutes
- Hash sensitive data before logging

**Deliverable Checklist:**
- [ ] Student dashboard fully functional
- [ ] Job search and application flow complete
- [ ] 80%+ test coverage on backend
- [ ] All critical bugs fixed
- [ ] Performance optimized (API <500ms, page load <3s)
- [ ] Security audit passed
- [ ] Cross-browser testing complete (Chrome, Firefox, Safari)
- [ ] Mobile responsive verified

***

## **Week 7 (Mar 17-23): Docker, CI/CD & Production Deployment**

### **Day 1-2: Dockerization**

**Jayant & Aditey (Lead) - 10 hours**
- Create backend/Dockerfile:
  - Use python:3.11-slim base image
  - Set working directory to /app
  - Copy requirements.txt first for layer caching
  - Install dependencies
  - Copy application code
  - Expose port 8000
  - Use non-root user for security
  - CMD with uvicorn --host 0.0.0.0 --port 8000
- Create backend/.dockerignore excluding: __pycache__, .env, .pytest_cache, venv
- Create frontend/Dockerfile:
  - Multi-stage build: build stage + nginx serve stage
  - Build stage: node:18-alpine, npm install, npm run build
  - Serve stage: nginx:alpine, copy build files
  - Expose port 80
- Create frontend/.dockerignore excluding: node_modules, .env, dist
- Create docker-compose.yml:
  - Services: backend, frontend, mongodb (for local dev)
  - Networks: app-network
  - Volumes: mongodb-data persistence
  - Environment variables from .env file
- Test local build: docker-compose up --build
- Verify all services communicate correctly
- Document Docker commands in README

**Rishav & Samir (Support) - 4 hours**
- Set up environment variable management for different environments
- Create .env.development, .env.production templates
- Test MongoDB connection from Docker containers
- Verify CORS settings work across containers

### **Day 3-4: GitHub Actions CI/CD**

**Jayant & Aditey (Lead) - 8 hours**
- Create .github/workflows/backend-ci.yml:
  - Trigger on push to main and pull requests
  - Jobs: test (run pytest), lint (flake8/black), security (bandit)
  - Use Python 3.11 matrix
  - Cache pip dependencies
  - Upload coverage reports
- Create .github/workflows/frontend-ci.yml:
  - Trigger on push to main and pull requests
  - Jobs: test (npm test), lint (eslint), build (npm run build)
  - Use Node 18 matrix
  - Cache node_modules
- Create .github/workflows/deploy.yml:
  - Trigger on push to main only
  - Build Docker images
  - Push to Docker Hub or GitHub Container Registry
  - Trigger Render deployment via webhook
- Add GitHub secrets:
  - MONGODB_URI_PROD
  - CEREBRAS_API_KEY
  - JWT_SECRET
  - RENDER_DEPLOY_HOOK_BACKEND
  - RENDER_DEPLOY_HOOK_FRONTEND
- Test CI pipeline with a test commit
- Set up branch protection: require CI pass before merge

**Rishav & Samir (Support) - 4 hours**
- Review CI/CD configuration
- Set up status badges in README
- Create deployment checklist document
- Test deployment rollback procedure

### **Day 5-7: Production Deployment to Render**

**Everyone (Collaborative) - 12 hours**
- **MongoDB Atlas Production Setup**:
  - Upgrade security: remove 0.0.0.0/0, whitelist Render IPs only
  - Create production database user with strong password
  - Set up backup schedule (available in free tier)
  - Enable connection pooling
  - Note production connection string
- **Backend Deployment on Render**:
  - Create new Web Service on Render
  - Connect GitHub repository
  - Set build command: pip install -r requirements.txt
  - Set start command: uvicorn app.main:app --host 0.0.0.0 --port 8000
  - Add environment variables from GitHub secrets
  - Choose free tier instance
  - Set auto-deploy from main branch
  - Note backend URL: https://ats-scanner-api.onrender.com
- **Frontend Deployment on Render**:
  - Create Static Site on Render
  - Connect GitHub repository, set root directory to /frontend
  - Set build command: npm install && npm run build
  - Set publish directory: dist
  - Add VITE_API_URL environment variable pointing to backend URL
  - Set custom headers for CORS if needed
  - Choose free tier
  - Note frontend URL: https://ats-scanner.onrender.com
- **Post-Deployment Verification**:
  - Test all API endpoints from production frontend
  - Verify CORS working correctly
  - Test file upload with real resumes
  - Test GitHub API integration from production
  - Test LLM scoring end-to-end
  - Monitor logs for errors
  - Set up error tracking (Sentry free tier)
- **Domain Setup (Optional)**:
  - Register domain from Namecheap (~$10/year for .tech domain)
  - Add custom domain to Render
  - Configure DNS records: A record and CNAME
  - Enable SSL certificate (automatic on Render)
- **Monitoring Setup**:
  - Set up uptime monitoring with UptimeRobot (free, 50 monitors)
  - Configure email alerts for downtime
  - Set up simple analytics with Plausible or Google Analytics
  - Create status page for system health

**Deliverable Checklist:**
- [ ] Docker images building successfully
- [ ] docker-compose.yml working locally
- [ ] CI/CD pipeline passing all checks
- [ ] Backend deployed to Render and accessible
- [ ] Frontend deployed to Render and accessible
- [ ] MongoDB Atlas production database configured
- [ ] All environment variables set correctly
- [ ] HTTPS working on both frontend and backend
- [ ] Auto-deployment working on push to main
- [ ] Monitoring and alerting configured
- [ ] Deployment documentation complete

***

## **Week 8 (Mar 24-30): Advanced Features & Polish**

### **Day 1-3: HuggingFace & Additional Platform Analysis**

**Jayant & Aditey - 10 hours**
- Create /app/services/huggingface_analyzer.py:
  - Install huggingface_hub library
  - fetch_user_models function getting published models
  - fetch_user_datasets function getting shared datasets
  - calculate_huggingface_score based on downloads, likes
  - Integrate into link analysis pipeline
- Add LeetCode analysis if feasible:
  - Scrape public profile (no official API)
  - Extract problems solved, contest rating
  - Handle potential blocking with retry logic
- Add CodePen/CodeSandbox analysis:
  - Check profile existence
  - Count public pens/sandboxes
- Update link verification score calculation including these platforms
- Test with profiles having multiple platforms

### **Day 2-4: Resume Improvement Suggestions**

**Jayant & Aditey - 12 hours**
- Create /app/services/suggestion_engine.py:
  - analyze_resume_gaps function comparing with high-scoring resumes
  - suggest_keywords function based on job description ATS keywords
  - suggest_skills_to_add based on job requirements not in resume
  - suggest_format_improvements analyzing structure
  - generate_action_items creating prioritized todo list
- Enhance LLM prompt to provide specific, actionable suggestions
- Create /app/routers/suggestions.py:
  - GET /api/v1/suggestions/:resume_id - Get improvement suggestions
  - POST /api/v1/suggestions/generate - Generate fresh suggestions
- Store suggestion history to track student progress
- Add severity levels: critical, important, nice-to-have

**Pravin - 8 hours**
- Create Suggestions page in student dashboard:
  - Categorized improvement cards
  - Progress tracking: completed vs pending
  - Before/after preview for each suggestion
  - "Mark as Done" functionality
  - Re-scan button after improvements
- Add tooltips explaining each suggestion
- Create improvement trends chart showing score over time

### **Day 4-5: Bulk Resume Upload**

**Jayant & Aditey - 6 hours**
- Modify /api/v1/resumes/upload to accept multiple files
- Add queue system processing resumes sequentially
- Return batch_id for tracking progress
- Create GET /api/v1/resumes/batch-status/:batch_id endpoint
- Limit: max 10 resumes per batch for free tier

**Pravin - 4 hours**
- Update upload component accepting multiple files
- Show batch upload progress bar
- Display processing status for each file in batch
- Handle partial failures gracefully

### **Day 5-7: Analytics & Admin Dashboard**

**Rishav & Samir - 12 hours**
- Create admin role with elevated permissions
- Build /app/routers/admin.py:
  - GET /api/v1/admin/stats - System-wide statistics
  - GET /api/v1/admin/users - User management
  - GET /api/v1/admin/api-usage - LLM API usage and costs
  - POST /api/v1/admin/toggle-user - Enable/disable users
- Implement analytics tracking:
  - Track API endpoint usage
  - Monitor LLM token consumption
  - Track average ATS scores
  - Monitor GitHub API rate limits
  - Track user activity patterns
- Create cost projection based on usage trends

**Pravin - 10 hours**
- Build admin dashboard with charts:
  - Daily active users line chart
  - Resumes uploaded per day
  - ATS scores distribution histogram
  - Top skills in platform bar chart
  - API costs over time
  - User growth chart
- Create user management table:
  - Search users
  - View user details
  - Suspend/activate accounts
  - View user activity log
- Add export functionality for analytics data

### **Day 6-7: UI/UX Polish**

**Pravin (Lead) - 10 hours**
- Add micro-interactions:
  - Button hover effects
  - Card flip animations
  - Smooth page transitions
  - Loading skeletons for all data
  - Success/error toast animations
- Implement dark mode:
  - Add theme toggle in header
  - Store preference in localStorage
  - Dark mode color scheme with Tailwind
  - Ensure all components support both themes
- Improve accessibility:
  - Add ARIA labels to interactive elements
  - Ensure keyboard navigation works
  - Add focus indicators
  - Test with screen reader
  - Ensure color contrast meets WCAG AA standards
- Add empty states with illustrations:
  - No resumes uploaded
  - No jobs available
  - No applications yet
  - Search with no results
- Create help/onboarding:
  - First-time user tour with react-joyride
  - Tooltips explaining features
  - FAQ page
  - Tutorial videos embedded

**Everyone - 5 hours**
- User testing session: invite 5-10 students and 2-3 recruiters
- Collect feedback via survey
- Document UX pain points
- Prioritize quick fixes

**Deliverable Checklist:**
- [ ] HuggingFace analysis integrated
- [ ] Resume improvement suggestions working
- [ ] Bulk upload functional
- [ ] Admin analytics dashboard complete
- [ ] Dark mode implemented
- [ ] Accessibility improvements done
- [ ] Onboarding tour added
- [ ] User feedback collected

***

## **Week 9 (Mar 31-Apr 6): User Acceptance Testing & Optimization**

### **Day 1-2: Comprehensive User Testing**

**Everyone (Collaborative) - 10 hours**
- **Recruit Test Users**:
  - Invite 15-20 students from your college
  - Recruit 3-5 faculty members or alumni recruiters
  - Create test accounts for each user type
  - Provide test job postings for realistic scenarios
- **Prepare Testing Environment**:
  - Clone production environment for testing
  - Seed database with sample data
  - Create testing guide document with scenarios
  - Set up feedback collection form (Google Forms/Typeform)
- **Testing Scenarios for Students**:
  1. Sign up and login
  2. Upload resume (PDF and DOCX)
  3. View link extraction results
  4. Check GitHub analysis visualization
  5. Browse job listings
  6. Apply to 3-5 jobs
  7. View ATS scores and feedback
  8. Use improvement suggestions
  9. Update resume and re-apply
  10. Navigate entire dashboard
- **Testing Scenarios for Recruiters**:
  1. Sign up as recruiter
  2. Post 2-3 job openings
  3. View applications as they come in
  4. Use filtering and sorting
  5. Shortlist and reject candidates
  6. Compare multiple candidates
  7. Export candidate data
  8. View analytics dashboard
- **Collect Feedback On**:
  - Ease of use (1-10 scale)
  - Speed/performance
  - Feature suggestions
  - Bugs encountered
  - Confusing UI elements
  - Missing features
  - Overall satisfaction
- **Testing Metrics**:
  - Task completion rate
  - Time taken for key flows
  - Error rate
  - Feature discovery rate
  - NPS (Net Promoter Score)

### **Day 3-4: Bug Fixing Sprint**

**Everyone (All Hands) - 16 hours**
- Review all feedback and categorize issues:
  - Critical (breaks core functionality)
  - High (major usability issue)
  - Medium (minor issue, has workaround)
  - Low (cosmetic, nice to have)
- Create GitHub issues for each bug with:
  - Reproduction steps
  - Expected vs actual behavior
  - Screenshots/videos
  - Priority label
  - Assigned team member
- **Bug Fixing Priority**:
  1. Authentication failures
  2. File upload errors
  3. ATS scoring failures
  4. API errors and timeouts
  5. UI breaking on mobile
  6. Incorrect data display
  7. Navigation issues
  8. Performance problems
  9. Visual inconsistencies
- Hold daily bug triage meetings (30 min)
- Set goal: Fix all critical and high bugs by Day 4 end
- Verify fixes with test users if possible

### **Day 5-7: Performance Optimization**

**Jayant & Aditey (Backend Optimization) - 12 hours**
- **Database Optimization**:
  - Add compound indexes on frequently queried fields:
    - users: email, role
    - resumes: user_id, created_at
    - jobs: recruiter_id, status, created_at
    - ats_scores: resume_id, job_id, score
  - Use MongoDB explain() to analyze slow queries
  - Implement query result caching with 5-minute TTL
  - Add pagination to all list endpoints (max 50 items)
  - Use projection to return only needed fields
- **API Performance**:
  - Profile endpoint response times with logging
  - Optimize slow endpoints (target <300ms)
  - Implement aggressive caching for:
    - GitHub analysis (24 hour cache)
    - ATS scores (7 day cache for same resume+job)
    - Job listings (5 minute cache)
  - Add connection pooling for MongoDB
  - Reduce LLM token usage by prompt optimization
  - Implement batch processing for multiple analyses
- **Background Jobs**:
  - Move long-running tasks to background:
    - Resume parsing
    - GitHub analysis
    - Portfolio scraping
    - ATS scoring
  - Use FastAPI BackgroundTasks or Celery
  - Add job status tracking
  - Implement retry logic for failed jobs
- **Load Testing**:
  - Use Locust or Apache JMeter
  - Simulate 100 concurrent users
  - Test critical endpoints under load
  - Identify bottlenecks
  - Ensure API handles 50 requests/second

**Pravin (Frontend Optimization) - 12 hours**
- **Bundle Size Reduction**:
  - Analyze bundle with vite-plugin-bundle-analyzer
  - Code split by route (React.lazy + Suspense)
  - Lazy load heavy components (charts, tables)
  - Remove unused dependencies
  - Target bundle size <500KB initial load
- **Image Optimization**:
  - Compress all images with TinyPNG
  - Use WebP format with PNG fallback
  - Implement lazy loading for images
  - Add loading skeletons for images
- **Rendering Performance**:
  - Use React.memo for expensive components
  - Implement virtualization for long lists (react-window)
  - Debounce search inputs
  - Throttle scroll events
  - Minimize re-renders with proper state management
- **Loading Experience**:
  - Add loading skeletons everywhere
  - Show progress indicators for uploads
  - Optimistic UI updates where possible
  - Add transition animations between pages
- **Caching**:
  - Implement service worker for offline capability
  - Cache static assets
  - Add stale-while-revalidate for API responses
- **Performance Metrics**:
  - Run Lighthouse audits (target 90+ performance score)
  - Measure Core Web Vitals:
    - LCP (Largest Contentful Paint) <2.5s
    - FID (First Input Delay) <100ms
    - CLS (Cumulative Layout Shift) <0.1
  - Test on slow 3G network
  - Test on low-end devices

**Rishav & Samir (Monitoring & Logging) - 8 hours**
- Set up structured logging:
  - Install loguru for Python
  - Log all API requests with request ID
  - Log errors with full stack traces
  - Log performance metrics (response time)
  - Implement log levels: DEBUG, INFO, WARNING, ERROR
- Set up error tracking:
  - Integrate Sentry free tier (5k errors/month)
  - Capture frontend errors with Sentry SDK
  - Capture backend exceptions automatically
  - Add breadcrumbs for debugging
  - Set up error notifications
- Create monitoring dashboard:
  - Track key metrics: API response times, error rates, user signups, resumes uploaded
  - Set up alerts for anomalies
  - Monitor LLM API costs daily
  - Track GitHub API rate limit usage

**Deliverable Checklist:**
- [ ] 20+ users tested the platform
- [ ] Feedback collected and analyzed
- [ ] All critical and high priority bugs fixed
- [ ] Database queries optimized with indexes
- [ ] API response times <300ms average
- [ ] Frontend bundle size <500KB
- [ ] Lighthouse performance score >90
- [ ] Error tracking with Sentry configured
- [ ] Comprehensive logging implemented
- [ ] Load testing completed successfully

***

## **Week 10 (Apr 7-13): Documentation, Presentation & Final Polish**

### **Day 1-2: Technical Documentation**

**Jayant & Aditey (Backend Docs) - 10 hours**
- Write comprehensive README.md:
  - Project overview and unique features
  - Tech stack with version numbers
  - System architecture diagram
  - Setup instructions (local development)
  - Environment variables documentation
  - API endpoint documentation with examples
  - Troubleshooting guide
  - Contributing guidelines
- Document API in detail:
  - FastAPI auto-generates Swagger UI at /docs
  - Add descriptions to all endpoints
  - Add request/response examples
  - Document authentication flow
  - Add error code reference
- Create DEPLOYMENT.md:
  - Step-by-step deployment guide
  - CI/CD pipeline explanation
  - Environment configuration
  - Monitoring setup
  - Backup and recovery procedures
- Create ARCHITECTURE.md:
  - System architecture diagram with mermaid
  - Data flow diagrams
  - Database schema with relationships
  - Third-party integrations explanation
  - Security architecture
- Document link analysis algorithm:
  - Detailed explanation of scoring logic
  - Examples with screenshots
  - Edge case handling

**Rishav & Samir (User Documentation) - 8 hours**
- Create user guide for students:
  - Getting started tutorial
  - How to upload resume
  - Understanding ATS scores
  - How to improve scores
  - Applying to jobs walkthrough
  - FAQ section
- Create user guide for recruiters:
  - How to post jobs
  - Understanding candidate profiles
  - Using filters effectively
  - Shortlisting process
  - Exporting data
  - FAQ section
- Create video tutorials (screen recordings):
  - Student onboarding (5 min)
  - Resume upload and scoring (8 min)
  - Recruiter dashboard tour (7 min)
  - Upload to YouTube with captions
- Create troubleshooting guide:
  - Common issues and solutions
  - Browser compatibility
  - File upload problems
  - Login issues

### **Day 3-5: Demo Video & Presentation**

**Everyone (Collaborative) - 18 hours**
- **Prepare Demo Environment**:
  - Clean database with curated sample data
  - 10 realistic student profiles
  - 5 job postings
  - Variety of ATS scores to showcase
  - Multiple scenarios ready to demonstrate
- **Record Demo Video (15-20 minutes)**:
  - Script the demo flow
  - Introduction (1 min):
    - Problem statement: ATS systems lack link verification
    - Your solution and unique features
    - Team introduction
  - Student Flow (6 min):
    - Signup and login
    - Resume upload with real resume
    - Show parsing and link extraction
    - Show GitHub profile analysis
    - Browse jobs and apply
    - View ATS score breakdown
    - Show improvement suggestions
  - Recruiter Flow (5 min):
    - Recruiter dashboard overview
    - Post a job
    - View candidates with scores
    - Filter and sort candidates
    - View detailed candidate profile with GitHub insights
    - Shortlist candidates
    - Export data
  - Technical Highlights (3 min):
    - Show link verification uniqueness
    - Demonstrate scoring algorithm
    - Show admin analytics dashboard
  - Conclusion (2 min):
    - Impact and benefits
    - Future enhancements
    - Q&A preparation
  - Use OBS Studio or Loom for recording
  - Add background music and transitions
  - Add text overlays highlighting features
  - Export in 1080p

**Create Presentation Deck (30-40 slides)**:
- Slide 1-3: Title, Team, Agenda
- Slide 4-8: Problem Statement
  - Current ATS limitations
  - Fake resume problem
  - Need for link verification
  - Statistics about resume fraud
- Slide 9-12: Solution Overview
  - ATS Scanner with link verification
  - Unique features vs competitors
  - Technology-driven approach
  - System architecture diagram
- Slide 13-18: Technical Implementation
  - Tech stack with logos
  - FastAPI + MongoDB architecture
  - Link extraction algorithm flow
  - GitHub API integration
  - LLM scoring mechanism
  - Data flow diagram
- Slide 19-25: Features Demo (screenshots)
  - Student dashboard
  - Resume upload interface
  - Link extraction results
  - GitHub analysis visualization
  - ATS score breakdown
  - Recruiter candidate view
  - Analytics dashboard
- Slide 26-30: Technical Challenges & Solutions
  - Challenge 1: GitHub API rate limits → Solution: Caching + authenticated requests
  - Challenge 2: LLM costs → Solution: Aggressive caching + prompt optimization
  - Challenge 3: Resume parsing variety → Solution: Multiple parsers + fallbacks
  - Challenge 4: Zero budget hosting → Solution: Free tiers + optimization
- Slide 31-35: Results & Impact
  - Testing metrics: X users tested, Y resumes processed
  - Performance metrics: <300ms API, 90+ Lighthouse score
  - Cost analysis: Total spent vs projected
  - User feedback highlights
  - Comparison with traditional ATS
- Slide 36-38: Future Enhancements
  - AI-powered resume builder
  - Video interview integration
  - Mobile app development
  - Enterprise features
  - Multi-language support
- Slide 39-40: Conclusion & Q&A
  - Key takeaways
  - GitHub repository link
  - Live demo link
  - Thank you

### **Day 6-7: Final Testing & Polish**

**Everyone (All Hands) - 12 hours**
- **Final Testing Checklist**:
  - Test complete student flow 5 times
  - Test complete recruiter flow 5 times
  - Test on multiple browsers: Chrome, Firefox, Safari, Edge
  - Test on mobile devices: iOS and Android
  - Test with slow network (throttle to 3G)
  - Test file uploads with 20+ different resumes
  - Verify all links in documentation
  - Test deployment rollback procedure
  - Verify backup systems working
  - Test error scenarios: invalid inputs, API failures
- **Visual Polish**:
  - Fix any remaining visual bugs
  - Ensure consistent spacing and alignment
  - Verify logo and branding consistent
  - Check all text for typos and grammar
  - Ensure loading states everywhere
  - Verify dark mode works perfectly
- **Performance Final Check**:
  - Run Lighthouse on all pages
  - Check API response times
  - Verify caching working
  - Check database query performance
  - Monitor production logs for errors
- **Security Final Check**:
  - Verify all API endpoints require authentication
  - Check CORS configuration
  - Verify input validation on all forms
  - Check for exposed secrets
  - Run security scan with OWASP ZAP
- **Prepare for Submission**:
  - Ensure GitHub repo is public with clean commit history
  - Add LICENSE file (MIT recommended)
  - Add CODE_OF_CONDUCT.md
  - Add CONTRIBUTING.md
  - Ensure README has badges (build status, coverage, etc.)
  - Create project poster/infographic
  - Prepare project report document
- **Presentation Practice**:
  - Full team rehearsal 3-5 times
  - Time each section
  - Assign speaking roles
  - Prepare for common questions:
    - How is this different from existing ATS?
    - What happens if GitHub link is fake?
    - How do you prevent cheating/resume fraud?
    - What's the cost to run this?
    - How scalable is the system?
    - Privacy and data security measures?
  - Practice demo flow to avoid technical glitches
  - Prepare backup plan if live demo fails (video)

**Deliverable Checklist:**
- [ ] Complete technical documentation
- [ ] User guides for students and recruiters
- [ ] 15-20 minute demo video
- [ ] 40 slide presentation deck
- [ ] All documentation links verified
- [ ] Final testing completed on all devices
- [ ] Security audit passed
- [ ] Presentation rehearsed 3+ times
- [ ] Backup demo video ready
- [ ] GitHub repo cleaned and organized
- [ ] Project report document prepared
- [ ] Team ready for presentation and Q&A

***

## **Key Technical Decisions & Risk Mitigation**

### **Free Hosting Setup** [reddit](https://www.reddit.com/r/FastAPI/comments/1aljf4h/free_fastapi_hosting/)
- **Backend**: Render.com Web Service (750 free hours/month, sleeps after 15min inactivity)
  - Alternative: Railway (500 execution hours, $5 credit)
  - Mitigation: Keep service awake with UptimeRobot pings every 5 minutes
- **Frontend**: Render Static Site (unlimited) or Vercel (unlimited for personal)
- **Database**: MongoDB Atlas M0 (512MB free, 100 connections) [hevodata](https://hevodata.com/learn/mongodb-storage-and-hosting-services/)
  - Limitation: 512MB storage = ~5000 resumes max
  - Mitigation: Delete old analysis data after 90 days, compress stored data
- **File Storage**: MongoDB GridFS for resume PDFs
  - Limitation: Counts toward 512MB limit
  - Mitigation: Store only parsed text, not PDFs (or delete PDFs after 30 days)
- **Background Jobs**: FastAPI BackgroundTasks (free, in-memory)
  - Alternative: Upstash Redis free tier (10k requests/day) + Celery
- **Email**: Gmail SMTP (free, 500 emails/day) or SendGrid (100 emails/day free)
- **Monitoring**: UptimeRobot (50 monitors free), Sentry (5k events/month free)
- **Analytics**: Plausible (free for small sites) or Google Analytics (free)

### **Cost Estimates (10 Week Semester)**
**Fixed Costs:**
- Domain name: $10-15/year (.tech or .dev domain) - OPTIONAL
- Total Fixed: $0-15

**Variable Costs (API Usage):**
- **Cerebras API**: $0.25/M input tokens, $0.69/M output tokens [cerebras](https://www.cerebras.ai/blog/cerebras-launches-openai-s-gpt-oss-120b-at-a-blistering-3-000-tokens-sec)
  - Average resume: 1000 tokens input
  - Average job description: 500 tokens input
  - Expected output: 500 tokens (feedback + scores)
  - Cost per scoring: (1500 × $0.25/M) + (500 × $0.69/M) = $0.00072
  - Testing phase: 50 resume-job pairs = $0.036
  - User testing: 100 resume-job pairs = $0.072
  - Demo preparation: 30 pairs = $0.022
  - **Total LLM cost: ~$0.15** (negligible with caching)
- **GitHub API**: Free (5000 requests/hour with token)
- **Other APIs**: All free tiers sufficient

**Total Project Cost: $0-15** (depending on domain purchase)

**Cost Mitigation Strategies:**
1. Aggressive caching: Cache LLM responses for identical resume-job pairs (7 days)
2. Cache GitHub analysis (24 hours)
3. Batch processing: Score multiple resumes together to reduce redundant LLM context
4. Optimize prompts: Reduce token count without sacrificing quality
5. Rate limiting: Max 5 ATS scores per user per day (prevents abuse)
6. Use free GitHub education pack benefits if available

### **GitHub Repository Structure**
```
ats-scanner/
├── .github/
│   ├── workflows/
│   │   ├── backend-ci.yml
│   │   ├── frontend-ci.yml
│   │   └── deploy.yml
│   └── ISSUE_TEMPLATE/
├── backend/
│   ├── app/
│   │   ├── routers/          # API endpoints
│   │   │   ├── auth.py
│   │   │   ├── resumes.py
│   │   │   ├── jobs.py
│   │   │   ├── analysis.py
│   │   │   ├── ats.py
│   │   │   ├── recruiter.py
│   │   │   └── admin.py
│   │   ├── services/         # Business logic
│   │   │   ├── resume_parser.py
│   │   │   ├── link_extractor.py
│   │   │   ├── github_analyzer.py
│   │   │   ├── portfolio_analyzer.py
│   │   │   ├── llm_service.py
│   │   │   ├── matching_service.py
│   │   │   └── auth.py
│   │   ├── models/           # Pydantic models
│   │   │   ├── user.py
│   │   │   ├── resume.py
│   │   │   ├── job.py
│   │   │   └── ats_score.py
│   │   ├── utils/            # Helper functions
│   │   ├── config.py         # Configuration
│   │   ├── database.py       # MongoDB connection
│   │   └── main.py           # FastAPI app
│   ├── tests/                # Pytest tests
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/       # Reusable components
│   │   │   ├── student/      # Student-specific
│   │   │   └── recruiter/    # Recruiter-specific
│   │   ├── pages/            # Route pages
│   │   ├── services/         # API calls
│   │   ├── hooks/            # Custom React hooks
│   │   ├── utils/            # Helper functions
│   │   ├── context/          # React context (auth, theme)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── docs/                     # Documentation
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   ├── API.md
│   └── USER_GUIDE.md
├── docker-compose.yml
├── README.md
├── LICENSE
└── .gitignore
```

### **Risk Assessment & Mitigation**

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|---------------------|
| **GitHub API rate limit exceeded** | High | Medium | Use authenticated requests (5000/hr), implement aggressive caching (24hr), handle 403 gracefully with retry after window |
| **LLM API costs exceed budget** | High | Low | Cache identical queries (7 days), set daily limits per user (5 scores/day), optimize prompts, monitor costs daily |
| **Free hosting tier insufficient** | Medium | Low | Optimize queries, implement caching, compress data, monitor usage weekly, have Railway as backup |
| **MongoDB 512MB limit reached** | Medium | Low | Delete old data (90 days), store text only not PDFs, implement data retention policy, monitor storage weekly |
| **Resume parsing fails for complex formats** | Medium | Medium | Use multiple parsers (pypdf2, pdfplumber fallback), handle errors gracefully, provide manual text input option |
| **Team member unavailable** | Medium | Medium | Cross-training: every feature has primary + backup owner, detailed documentation, code reviews ensure knowledge sharing |
| **Scope creep / missed deadlines** | High | Medium | Strict MVP definition, weekly sprint reviews, buffer time in Week 10, cut nice-to-have features if needed |
| **Security vulnerability** | High | Low | Follow OWASP guidelines, input validation everywhere, security audit Week 9, use Snyk for dependency scanning |
| **LinkedIn scraping violation** | Low | High | Don't scrape LinkedIn, use manual input or resume data only, clearly document this limitation |
| **Performance issues under load** | Medium | Low | Load testing Week 9, optimize slow queries, implement caching, use background jobs for heavy tasks |

### **Critical Success Factors**
1. **Week 3-4 are pivotal**: Link analysis and LLM integration are core differentiators
   - Allocate extra time here if needed
   - Have backup plan for LLM (use GPT-4o-mini if Cerebras fails)
2. **Daily standups (15 minutes, 6:00 PM)**:
   - What did you complete yesterday?
   - What will you complete today?
   - Any blockers?
   - Track progress in GitHub Projects
3. **Weekly demos every Sunday**:
   - Show working features to stakeholders/professor
   - Get early feedback
   - Adjust plan if needed
4. **Code reviews mandatory**:
   - All PRs require 1 approval before merge
   - Catches bugs early
   - Knowledge sharing
5. **Documentation as you go**:
   - Don't wait until Week 10
   - Document each feature when completed
   - Update API docs immediately
6. **Buffer time in Week 10**:
   - Expect unexpected issues
   - Have 2-3 days buffer for emergencies
7. **Test with real users early (Week 6)**:
   - Don't wait until Week 9
   - Get feedback when changes are easier
8. **Monitor costs daily**:
   - Set up Cerebras API usage alerts
   - Track GitHub API rate limits
   - Monitor MongoDB storage
9. **Keep scope flexible**:
   - Must-have: Resume upload, link extraction, GitHub analysis, ATS scoring, basic recruiter dashboard
   - Nice-to-have: HuggingFace, LeetCode, bulk upload, dark mode, advanced analytics
   - Can drop nice-to-haves if time constrained
10. **Communication is key**:
    - Use Discord for quick questions
    - Use GitHub Issues for bugs/features
    - Use GitHub Projects for sprint planning
    - Document decisions in GitHub wiki

### **Team Communication & Collaboration**

**Regular Standup (45 min, 6:00 PM on Discord, Sunday)**
- Round robin updates
- Update GitHub Project board
- Identify blockers immediately

**Weekly Planning (Sunday, 1 hour)**
- Review previous week deliverables
- Demo to stakeholders if available
- Plan next week's tasks
- Assign tasks in GitHub Projects
- Identify dependencies

**Code Review Process**
- Create feature branch from dev: `git checkout -b feature/resume-upload`
- Commit with meaningful messages: `feat: add resume PDF parsing`
- Push and create PR to dev branch
- Request review from at least 1 team member
- Address review comments
- Merge after approval and CI passes
- Delete feature branch

**GitHub Projects Board Columns**
- Backlog
- Todo (This Week)
- In Progress
- In Review (PR created)
- Done (Merged)

**Decision Log (GitHub Wiki)**
- Document all major technical decisions
- Why Cerebras over OpenAI? (Cost)
- Why Render over Railway? (Better free tier)
- Why FastAPI over Flask? (Async support, auto docs)
- Maintain decision log for semester report

### **Backup Plans**

**If Cerebras API fails/pricing changes:**
- Use OpenAI GPT-4o-mini ($0.15/M input, $0.6/M output)
- Use Anthropic Claude Haiku (similar pricing)
- Use open-source LLM with Hugging Face Inference API
- Implement rule-based scoring as last resort

**If Render free tier insufficient:**
- Migrate to Railway ($5 credit)
- Use Google Cloud free tier ($300 credit)
- Use AWS free tier (EC2 t2.micro)
- Run on local machine and use ngrok for demo

**If GitHub API rate limits become problem:**
- Create multiple GitHub accounts for more tokens
- Reduce analysis frequency
- Focus on critical metrics only
- Implement smart caching strategies

**If MongoDB 512MB limit reached:**
- Delete test data
- Implement aggressive data retention (30 days)
- Upgrade to M2 tier ($9/month) if absolutely necessary
- Use PostgreSQL free tier as alternative (Supabase 500MB)
