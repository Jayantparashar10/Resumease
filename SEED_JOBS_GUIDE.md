# Seed Sample Job Postings

This guide explains how to populate ResumeAse with sample job postings for testing and development.

## Job Postings Included

The seed script adds 6 sample job postings:

### 1. AI/ML Engineer (TechCorp AI)
- **Experience Level:** 3+ years
- **Location:** San Francisco, CA
- **Key Skills:** Python, TensorFlow, PyTorch, NLP, Deep Learning, AWS
- **Focus:** Machine learning model development, deployment, and scaling

### 2. Software Development Engineer - Intern (StartupXYZ)
- **Experience Level:** 0 (Student/Recent grad)
- **Location:** Remote / New York, NY
- **Key Skills:** Python, JavaScript, Java, REST APIs, Git, Web Development
- **Focus:** Learning fundamentals, real-world feature development

### 3. Software Development Engineer - SDE 1 (CloudTech Solutions)
- **Experience Level:** 1-2 years
- **Location:** San Francisco, CA / Remote
- **Key Skills:** Python, Java, Go, Microservices, Docker, AWS, SQL
- **Focus:** Backend services, APIs, scalable systems

### 4. Data Analyst (Analytics Pro Inc)
- **Experience Level:** 2+ years
- **Location:** New York, NY / Remote
- **Key Skills:** SQL, Tableau, Power BI, Python, Statistics, Excel
- **Focus:** Data extraction, visualization, business insights

### 5. Business Development Manager (GrowthCorp)
- **Experience Level:** 3+ years
- **Location:** San Francisco, CA
- **Key Skills:** Sales, Negotiation, CRM, Salesforce, Business Strategy
- **Focus:** Partnerships, deal closing, market expansion

### 6. Product Manager (InnovateTech)
- **Experience Level:** 4+ years
- **Location:** San Francisco, CA / Remote
- **Key Skills:** Product Strategy, Analytics, User Research, Agile, SQL
- **Focus:** Strategy, cross-functional leadership, roadmap execution

## How to Seed Jobs

### Option 1: Using Python Script (Recommended)

```bash
# From the backend directory
cd backend

# Activate your environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Run the seed script
python -m scripts.seed_jobs
```

### Option 2: Manual Database Insert

If the script doesn't work, you can manually insert using Supabase dashboard:

1. Go to Supabase dashboard → SQL Editor
2. Copy the SQL from `backend/scripts/seed_jobs.sql` (create if needed)
3. Execute to insert jobs

## Job-Specific Resume Analysis

The ATS scoring system now includes **job-specific analysis prompts** that tailor evaluations to each role:

### AI/ML Engineer Analysis
- **Skills Match (50%):** Focus on TensorFlow, PyTorch, NLP/CV experience
- **Experience Relevance (25%):** ML projects, research, publications
- **Project Quality (15%):** Complexity of ML implementations
- **Cultural Fit (10%):** Learning mindset, research contribution

### Intern Analysis
- **Skills Match (40%):** Programming fundamentals, basics
- **Experience Relevance (30%):** Academic projects, hackathons
- **Project Quality (20%):** Code quality, problem-solving approach
- **Cultural Fit (10%):** Learning ability, teamwork

### SDE 1 Analysis
- **Skills Match (40%):** Backend languages, databases, cloud platforms
- **Experience Relevance (35%):** Production experience, system scale
- **Project Quality (15%):** Architecture, optimization decisions
- **Cultural Fit (10%):** Team collaboration, communication

### Data Analyst Analysis
- **Skills Match (40%):** SQL, statistics, visualization tools
- **Experience Relevance (35%):** Analytics projects, business impact
- **Project Quality (15%):** Quality of insights and recommendations
- **Cultural Fit (10%):** Ability to communicate technical to non-technical

### Business Development Analysis
- **Skills Match (35%):** Sales skills, CRM tools, communication
- **Experience Relevance (40%):** Sales track record, target achievement
- **Project Quality (15%):** Partnership value, deal quality
- **Cultural Fit (10%):** Sales mentality, entrepreneurship

### Product Manager Analysis
- **Skills Match (35%):** Product strategy, analytics, Agile
- **Experience Relevance (40%):** PM experience, product scale
- **Project Quality (15%):** Product impact, success metrics
- **Cultural Fit (10%):** Leadership, cross-functional collaboration

## Testing Resume Scoring

1. **Upload a resume** in the student resumes section
2. **Go to Jobs** page
3. **Select a job** and click "Check ATS Score"
4. **View the analysis** - notice how feedback is tailored to the specific role

## Customizing Jobs

To add more jobs or modify existing ones:

1. Edit `backend/scripts/seed_jobs.py`
2. Add new job dictionary to `SAMPLE_JOBS` list
3. Include proper structure:
   ```python
   {
       "title": "Your Job Title",
       "company": "Company Name",
       "description": "Detailed job description...",
       "required_skills": ["skill1", "skill2", ...],
       "location": "City, State",
       "experience_years": 2,
       "recruiter_id": "system-recruiter",
       "status": "active",
       "posted_at": datetime.now(timezone.utc),
   }
   ```
4. Re-run the seed script

## Adding New Job-Specific Prompts

To add analysis for a new job type:

1. Edit `backend/app/services/llm_service.py`
2. Add entry to `JOB_SPECIFIC_PROMPTS` dict:
   ```python
   "your_role_type": """
   You are an expert [role] recruiter. Evaluate the candidate...
   
   Focus on:
   - ...
   
   Evaluation criteria:
   - Skills Match: X%
   - Experience Relevance: Y%
   - Project Quality: Z%
   - Cultural Fit: W%
   """
   ```
3. Update `_get_job_focus_prompt()` function to map job title keywords to your role type
4. Restart the backend

## Database Schema

The `jobs` table structure:
```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  description TEXT NOT NULL,
  required_skills TEXT[] DEFAULT '{}',
  location TEXT,
  experience_years INTEGER,
  recruiter_id UUID NOT NULL,
  status TEXT DEFAULT 'active',
  posted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Troubleshooting

**Q: Script says "Failed to create job"**
- Check that Supabase credentials are set in `.env`
- Verify the `jobs` table exists in Supabase
- Check database connection error details

**Q: Jobs appear but scoring seems generic**
- Verify `CEREBRAS_API_KEY` is set in `.env`
- Check that job title matches a known pattern in `_get_job_focus_prompt()`
- If using fallback scoring, Cerebras key is missing or expired

**Q: Want to clear and re-seed jobs**
- Go to Supabase dashboard → SQL Editor
- Run: `DELETE FROM jobs WHERE company IN ('TechCorp AI', 'StartupXYZ', ...)`
- Then re-run the seed script

## Next Steps

1. ✓ Seed sample jobs
2. ✓ Upload a test resume
3. ✓ Run ATS scoring against different jobs
4. ✓ Notice the tailored feedback for each role
5. ✓ Test with real resumes to validate analysis quality
