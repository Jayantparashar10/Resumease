"""
Seed script to populate sample job postings for testing.
Run: python -m scripts.seed_jobs
"""

import asyncio
import httpx
from app.services.supabase_db import create_job, _headers
from app.config import settings
from datetime import datetime, timezone

SAMPLE_JOBS = [
    {
        "title": "AI/ML Engineer",
        "company": "TechCorp AI",
        "description": """
We are seeking an experienced AI/ML Engineer to join our rapidly growing team. You will design, develop, and deploy machine learning models that power our next-generation product suite.

Responsibilities:
- Design and implement machine learning pipelines for large-scale data processing
- Develop and optimize neural networks and deep learning models
- Collaborate with data engineers and product teams to integrate ML solutions
- Conduct experiments and implement best practices in model training and evaluation
- Work with cloud platforms (AWS/GCP/Azure) for model deployment and scaling
- Mentor junior engineers on ML best practices

Requirements:
- 3+ years of experience in machine learning or AI development
- Proficiency in Python, TensorFlow, PyTorch, or similar frameworks
- Strong understanding of neural networks, NLP, and computer vision
- Experience with cloud platforms (AWS, GCP, or Azure)
- Knowledge of MLOps, model deployment, and CI/CD pipelines
- Experience with large language models a plus
- Strong problem-solving and communication skills
        """,
        "required_skills": [
            "Python",
            "TensorFlow",
            "PyTorch",
            "Machine Learning",
            "Deep Learning",
            "NLP",
            "AWS",
            "Data Analysis",
            "SQL",
            "Model Deployment"
        ],
        "location": "San Francisco, CA",
        "experience_years": 3,
        "recruiter_id": "",
        "status": "active",
        "posted_at": datetime.now(timezone.utc),
    },
    {
        "title": "Software Development Engineer - Intern",
        "company": "StartupXYZ",
        "description": """
Join our team as an SDE Intern for a 12-week internship program. Work on real-world projects and gain hands-on experience with modern software development practices.

Responsibilities:
- Develop and test new features for our web and mobile applications
- Fix bugs reported by QA and customers
- Participate in code reviews and contribute to codebase improvements
- Collaborate with full-time engineers in an Agile environment
- Document code and create technical specifications
- Attend daily standups and sprint planning meetings

Requirements:
- Currently pursuing a degree in Computer Science or related field
- Solid understanding of data structures and algorithms
- Knowledge of at least one programming language (Python, Java, JavaScript, or C++)
- Familiarity with web development concepts (REST APIs, HTTP)
- Experience with Git and version control
- Strong communication and teamwork skills
- Ability to learn quickly and ask for help when needed
        """,
        "required_skills": [
            "Python",
            "JavaScript",
            "Java",
            "REST APIs",
            "Git",
            "SQL",
            "Web Development",
            "Data Structures",
            "Algorithms",
            "HTML/CSS"
        ],
        "location": "Remote / New York, NY",
        "experience_years": 0,
        "recruiter_id": "",
        "status": "active",
        "posted_at": datetime.now(timezone.utc),
    },
    {
        "title": "Software Development Engineer - SDE 1",
        "company": "CloudTech Solutions",
        "description": """
We are looking for a Software Development Engineer 1 to join our rapidly expanding infrastructure team. As an SDE 1, you will own features end-to-end and contribute to the core platform that powers our cloud services.

Responsibilities:
- Design and implement scalable backend services using microservices architecture
- Build REST APIs and work with database systems
- Write clean, testable, and maintainable code following engineering best practices
- Participate in code reviews and provide constructive feedback
- Collaborate with product managers and other engineers to understand requirements
- Debug and optimize application performance
- Participate in on-call rotation to support production systems

Requirements:
- Bachelor's degree in Computer Science or equivalent practical experience
- 1-2 years of professional software development experience
- Proficiency in at least one backend language (Python, Java, Go, C++)
- Understanding of RESTful APIs and microservices architecture
- Experience with SQL and NoSQL databases
- Familiarity with version control (Git) and CI/CD pipelines
- Knowledge of cloud platforms (AWS, GCP, or Azure) is a plus
- Strong problem-solving and communication skills
        """,
        "required_skills": [
            "Python",
            "Java",
            "Go",
            "REST APIs",
            "SQL",
            "Microservices",
            "Docker",
            "AWS",
            "Git",
            "Linux"
        ],
        "location": "San Francisco, CA / Remote",
        "experience_years": 1,
        "recruiter_id": "",
        "status": "active",
        "posted_at": datetime.now(timezone.utc),
    },
    {
        "title": "Data Analyst",
        "company": "Analytics Pro Inc",
        "description": """
Join our Data Analytics team and help drive business decisions with data-driven insights. We are looking for a skilled Data Analyst to work with large datasets and create meaningful analytics.

Responsibilities:
- Extract, transform, and analyze data from various sources
- Create dashboards and visualizations for stakeholders
- Perform statistical analysis and A/B testing
- Write SQL queries to explore databases and answer business questions
- Collaborate with product and business teams to understand data requirements
- Identify trends, patterns, and opportunities in data
- Document findings and present insights to non-technical audiences
- Optimize data pipelines and reporting workflows

Requirements:
- Bachelor's degree in Mathematics, Statistics, Economics, or Computer Science
- 2+ years of experience in data analysis or business intelligence
- Proficiency in SQL for data extraction and manipulation
- Experience with data visualization tools (Tableau, Power BI, Looker, or similar)
- Strong statistical knowledge and Excel expertise
- Knowledge of Python or R for statistical analysis
- Understanding of business metrics and KPIs
- Excellent communication and presentation skills
        """,
        "required_skills": [
            "SQL",
            "Tableau",
            "Power BI",
            "Python",
            "R",
            "Statistics",
            "Excel",
            "Data Visualization",
            "A/B Testing",
            "Google Analytics"
        ],
        "location": "New York, NY / Remote",
        "experience_years": 2,
        "recruiter_id": "",
        "status": "active",
        "posted_at": datetime.now(timezone.utc),
    },
    {
        "title": "Business Development Manager",
        "company": "GrowthCorp",
        "description": """
We are seeking a dynamic Business Development Manager to drive growth and expand our market presence. You will identify and cultivate new business opportunities and help establish strategic partnerships.

Responsibilities:
- Identify and evaluate new business opportunities and market segments
- Build and maintain relationships with potential clients and partners
- Conduct market research and competitive analysis
- Develop business proposals and negotiate contracts
- Track pipeline and forecast revenue
- Collaborate with sales and product teams to understand customer needs
- Present product solutions to prospective clients
- Achieve monthly and quarterly revenue targets

Requirements:
- Bachelor's degree in Business, Marketing, or related field
- 3+ years of experience in business development, sales, or account management
- Proven track record of closing deals and exceeding targets
- Strong communication and negotiation skills
- Excellent presentation and persuasion abilities
- Knowledge of CRM tools and sales analytics
- Self-motivated with entrepreneurial mindset
- Ability to work independently and manage multiple priorities
        """,
        "required_skills": [
            "Sales",
            "Negotiation",
            "CRM",
            "Salesforce",
            "Business Strategy",
            "Market Research",
            "Communication",
            "Presentation",
            "Project Management",
            "Financial Analysis"
        ],
        "location": "San Francisco, CA",
        "experience_years": 3,
        "recruiter_id": "",
        "status": "active",
        "posted_at": datetime.now(timezone.utc),
    },
    {
        "title": "Product Manager",
        "company": "InnovateTech",
        "description": """
We are looking for an experienced Product Manager to lead the vision and execution of our flagship platform. You will work cross-functionally to define product strategy and deliver exceptional user experiences.

Responsibilities:
- Define product vision, strategy, and roadmap
- Conduct user research and gather market insights
- Create product specifications and user stories
- Work with engineering to prioritize features and manage releases
- Analyze product metrics and user behavior to drive decisions
- Collaborate with design, marketing, and sales teams
- Present product updates to stakeholders and investors
- Manage product launches and go-to-market strategies

Requirements:
- Bachelor's degree in Business, Computer Science, or related field
- 4+ years of experience as a Product Manager or similar role
- Strong analytical and problem-solving skills
- Experience with product analytics and user research
- Knowledge of agile and scrum methodologies
- Excellent communication and leadership abilities
- Understanding of technical concepts and software development
- Data-driven mindset with focus on user impact
        """,
        "required_skills": [
            "Product Strategy",
            "Analytics",
            "User Research",
            "Agile",
            "SQL",
            "Tableau",
            "Jira",
            "Figma",
            "Communication",
            "Leadership"
        ],
        "location": "San Francisco, CA / Remote",
        "experience_years": 4,
        "recruiter_id": "",
        "status": "active",
        "posted_at": datetime.now(timezone.utc),
    },
]


async def get_system_recruiter_id():
    """Get a valid profile user_id for seeding jobs."""
    try:
        # Prefer an existing recruiter profile when available.
        base = settings.SUPABASE_URL.rstrip("/")
        url = f"{base}/rest/v1/profiles?role=eq.recruiter&select=user_id&limit=1"
        
        async with httpx.AsyncClient(timeout=30, verify=True) as client:
            resp = await client.get(
                url,
                headers=_headers(),
            )
            
            if resp.status_code == 200:
                recruiters = resp.json()
                if recruiters and len(recruiters) > 0:
                    recruiter_id = recruiters[0]["user_id"]
                    print(f"✓ Using existing recruiter: {recruiter_id}")
                    return recruiter_id
    except Exception as e:
        print(f"  Could not query for existing recruiters: {e}")

    # Fallback: use any existing profile to satisfy FK constraints.
    try:
        base = settings.SUPABASE_URL.rstrip("/")
        url = f"{base}/rest/v1/profiles?select=user_id,role,email&limit=1"

        async with httpx.AsyncClient(timeout=30, verify=True) as client:
            resp = await client.get(
                url,
                headers=_headers(),
            )

            if resp.status_code == 200:
                profiles = resp.json()
                if profiles and len(profiles) > 0:
                    profile = profiles[0]
                    profile_id = profile["user_id"]
                    role = profile.get("role", "unknown")
                    email = profile.get("email", "unknown")
                    print(f"✓ No recruiter found; using existing profile: {profile_id}")
                    print(f"  Profile role={role}, email={email}")
                    return profile_id
    except Exception as e:
        print(f"  Could not query for existing profiles: {e}")

    print("\n✗ No profiles found in the database.")
    print("Create at least one account by signing up in the app, then run this script again.")
    
    return None


async def seed_jobs():
    """Insert sample jobs into the database."""
    # Get or create system recruiter first
    recruiter_id = await get_system_recruiter_id()
    
    if recruiter_id is None:
        print("\n✗ Cannot seed jobs without a recruiter profile.")
        return False
    
    # Update all jobs to use the recruiter ID
    for job in SAMPLE_JOBS:
        job["recruiter_id"] = recruiter_id
    
    print("\nSeeding sample jobs...")
    successful = 0
    for job in SAMPLE_JOBS:
        try:
            created = await create_job(job)
            print(f"✓ Created job: {created['title']} at {created['company']}")
            successful += 1
        except Exception as e:
            print(f"✗ Failed to create job {job['title']}: {e}")
    
    return successful > 0


if __name__ == "__main__":
    success = asyncio.run(seed_jobs())
    if success:
        print("\nDone! Sample jobs have been added to the database.")
    else:
        print("\nFailed to seed jobs. Please follow the instructions above.")
