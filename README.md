# ATS Scanner - Project Progress Tracker

> **Applicant Tracking System with GitHub Link Verification**  
> A modern ATS platform that verifies candidate credentials through GitHub, LinkedIn, and portfolio analysis using AI-powered scoring.

---

## 🎯 Project Overview

**Duration**: Feb 3, 2026 - Apr 13, 2026 (10 Weeks)  
**Team Size**: 5 Members  
**Budget**: $0 (Free tier hosting + optional domain)

### Team

- **Jayant & Aditey**: Backend (FastAPI, MongoDB, LLM, GitHub/Link Analysis, Docker/CI-CD)
- **Rishav & Samir**: Full Stack (API Integration, Authentication, Recruiter Features)
- **E Pravin**: Frontend (React, UI/UX, Component Design)

### Tech Stack

- **Backend**: FastAPI + MongoDB Atlas + Motor (Async)
- **Frontend**: React + Next.js + Tailwind CSS + shadcn/ui
- **LLM**: Cerebras API (gpt-oss-120B)
- **Hosting**: Render.com (Free Tier)
- **CI/CD**: GitHub Actions + Docker
- **Analytics**: Sentry (Error Tracking) + UptimeRobot (Monitoring)

---

## Week-by-Week Implementation Progress

| Week | Dates | Focus Area | Key Features | Status | Progress |
|------|-------|------------|--------------|--------|----------|
| **Week 1** | Feb 3-9 | **Project Setup & Architecture** | • GitHub repo setup<br>• FastAPI initialization<br>• MongoDB Atlas setup<br>• React app setup<br>• Basic routing & API structure | 🔄 In Progress | ▓▓▓░░░░░░░ 30% |
| **Week 2** | Feb 10-16 | **Authentication & Resume Upload** | • JWT authentication<br>• User registration/login<br>• Resume upload (PDF/DOCX)<br>• Text extraction & parsing<br>• Link extraction (GitHub, LinkedIn, Portfolio) | ⏳ Not Started | ░░░░░░░░░░ 0% |
| **Week 3** | Feb 17-23 | **Link Extraction & GitHub Analysis** | • Advanced link detection<br>• GitHub API integration<br>• Repository analysis<br>• Language proficiency calculation<br>• Activity score calculation | ⏳ Not Started | ░░░░░░░░░░ 0% |
| **Week 4** | Feb 24-Mar 2 | **Portfolio Analysis & ATS Scoring** | • Portfolio website scraping<br>• Technology detection<br>• Cerebras LLM integration<br>• ATS scoring algorithm<br>• Job posting CRUD | ⏳ Not Started | ░░░░░░░░░░ 0% |
| **Week 5** | Mar 3-9 | **Recruiter Features & Matching** | • Candidate recommendation system<br>• Email notifications<br>• Recruiter dashboard<br>• Candidate pipeline (Kanban)<br>• Bulk actions & filters | ⏳ Not Started | ░░░░░░░░░░ 0% |
| **Week 6** | Mar 10-16 | **Student Dashboard & Testing** | • Student dashboard<br>• Job search & application<br>• Comprehensive testing (Unit + Integration)<br>• Bug fixing sprint<br>• Security hardening | ⏳ Not Started | ░░░░░░░░░░ 0% |
| **Week 7** | Mar 17-23 | **Docker, CI/CD & Deployment** | • Dockerization (Backend + Frontend)<br>• GitHub Actions pipelines<br>• Production deployment (Render)<br>• MongoDB Atlas production setup<br>• Monitoring setup | ⏳ Not Started | ░░░░░░░░░░ 0% |
| **Week 8** | Mar 24-30 | **Advanced Features & Polish** | • HuggingFace analysis<br>• Resume improvement suggestions<br>• Bulk upload<br>• Admin analytics dashboard<br>• Dark mode & UI polish | ⏳ Not Started | ░░░░░░░░░░ 0% |
| **Week 9** | Mar 31-Apr 6 | **User Testing & Optimization** | • User acceptance testing (20+ users)<br>• Bug fixing sprint<br>• Performance optimization<br>• Load testing<br>• Sentry & logging setup | ⏳ Not Started | ░░░░░░░░░░ 0% |
| **Week 10** | Apr 7-13 | **Documentation & Presentation** | • Technical documentation<br>• User guides<br>• Demo video (15-20 min)<br>• Presentation deck (40 slides)<br>• Final polish & rehearsal | ⏳ Not Started | ░░░░░░░░░░ 0% |

---

## Deliverables by Week

### Week 1 Deliverables 
- [x] GitHub repository with proper structure
- [ ] FastAPI app running on localhost:8000
- [ ] MongoDB Atlas connected
- [ ] Next.js app running on localhost:3000
- [ ] README with setup instructions
- [ ] Team communication channels set up

### Week 2 Deliverables
- [ ] Working JWT authentication
- [ ] User registration & login
- [ ] Resume upload (PDF/DOCX support)
- [ ] Text extraction working (90%+ accuracy)
- [ ] Links and skills extracted
- [ ] 25+ tests passing

### Week 3 Deliverables
- [ ] Link extraction (95%+ accuracy)
- [ ] GitHub API integration complete
- [ ] Profile & repository analysis
- [ ] Language & activity metrics
- [ ] Frontend GitHub visualizations
- [ ] 35+ tests passing

### Week 4 Deliverables
- [ ] Portfolio website analysis
- [ ] Cerebras LLM integration
- [ ] ATS scoring functional
- [ ] Combined scoring (LLM + GitHub + Portfolio)
- [ ] Job posting CRUD
- [ ] 30+ tests passing

### Week 5 Deliverables
- [ ] Candidate ranking & filtering
- [ ] Email notification system
- [ ] Recruiter dashboard complete
- [ ] Candidate pipeline (Kanban)
- [ ] Bulk actions & CSV export
- [ ] 20+ tests passing

### Week 6 Deliverables
- [ ] Student dashboard functional
- [ ] Job search & application flow
- [ ] 80%+ test coverage
- [ ] All critical bugs fixed
- [ ] Performance optimized (<500ms API)
- [ ] Security audit passed

### Week 7 Deliverables
- [ ] Docker images building
- [ ] CI/CD pipeline passing
- [ ] Backend deployed to Render
- [ ] Frontend deployed to Render
- [ ] MongoDB production configured
- [ ] Auto-deployment working

### Week 8 Deliverables
- [ ] HuggingFace analysis integrated
- [ ] Resume improvement suggestions
- [ ] Bulk upload functional
- [ ] Admin analytics dashboard
- [ ] Dark mode implemented
- [ ] Accessibility improvements

### Week 9 Deliverables
- [ ] 20+ users tested platform
- [ ] All critical/high bugs fixed
- [ ] Database queries optimized
- [ ] API <300ms average
- [ ] Lighthouse score >90
- [ ] Load testing completed

### Week 10 Deliverables
- [ ] Complete technical documentation
- [ ] User guides (Student + Recruiter)
- [ ] 15-20 min demo video
- [ ] 40 slide presentation deck
- [ ] Final testing complete
- [ ] Team ready for presentation

---

## 🚀 Quick Start

### Prerequisites
```bash
# Required installations
- Python 3.11+
- Node.js 18+
- MongoDB Compass (optional)
- Docker Desktop
- Git
```

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Add your MongoDB URI and API keys to .env
uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Add NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

### Docker Setup
```bash
docker-compose up --build
```

---

## 📈 Key Metrics & Goals

### Performance Targets
- ✅ API Response Time: <300ms average
- ✅ Frontend Load Time: <3s
- ✅ Lighthouse Performance: >90
- ✅ Test Coverage: >80%

### Cost Targets
- 🎯 LLM API Cost: <$1 for entire semester
- 🎯 Total Budget: $0 (domain optional)
- 🎯 GitHub API: Stay within 5000 req/hr limit
- 🎯 MongoDB: Stay within 512MB free tier

### Feature Completion
- 🎯 Core Features: 100% by Week 6
- 🎯 Advanced Features: 100% by Week 8
- 🎯 Polish & Optimization: 100% by Week 9
- 🎯 Documentation: 100% by Week 10

---

## 🔗 Important Links

- **Live Application**: [Coming Soon]
- **API Documentation**: [Coming Soon]
- **Demo Video**: [Coming Soon]
- **Presentation**: [Coming Soon]
- **Project Plan**: [ats-scanner-plan.md](./ats-scanner-plan.md)

---

## 📝 Status Legend

| Symbol | Status | Description |
|--------|--------|-------------|
| ✅ | Completed | Feature fully implemented and tested |
| 🔄 | In Progress | Currently being worked on |
| ⏳ | Not Started | Scheduled but not yet begun |
| ⚠️ | Blocked | Waiting on dependencies or facing issues |
| 🐛 | Bug Found | Issues discovered, needs fixing |

---

## Contact & Support

For questions or support, contact the team:
- **Jayant (Backend Lead)**: [Your contact]
- **Project Repository**: [GitHub URL]
- **Documentation**: See detailed plan in `ats-scanner-plan.md`

---

## License

This project is developed as part of academic semester project. See the [LICENSE](./LICENSE) file for details.

---

**Last Updated**: February 3, 2026  
**Current Sprint**: Week 1 - Project Setup & Architecture  
**Next Milestone**: Complete FastAPI and React setup by Feb 9, 2026x
