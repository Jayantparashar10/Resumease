import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Global 401 handler — clear token and redirect to login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ── Auth ─────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "student" | "recruiter" | "admin";
  created_at: string;
  is_active: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export const authApi = {
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    role: "student" | "recruiter";
  }) => api.post<AuthResponse>("/api/v1/auth/register", data),

  login: (email: string, password: string) =>
    api.post<AuthResponse>("/api/v1/auth/login", { email, password }),

  me: () => api.get<User>("/api/v1/auth/me"),
};

// ── Resumes ───────────────────────────────────────────────────────
export interface ExtractedLinks {
  github?: string;
  linkedin?: string;
  portfolio?: string;
  huggingface?: string;
  leetcode?: string;
  email?: string;
  phone?: string;
  other?: string[];
}

export interface Resume {
  id: string;
  user_id: string;
  filename: string;
  file_size?: number;
  extracted_links: ExtractedLinks;
  skills: string[];
  status: string;
  uploaded_at: string;
  parsed_text?: string;
}

export const resumeApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<Resume>("/api/v1/resumes/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  list: () => api.get<Resume[]>("/api/v1/resumes/list"),
  get: (id: string) => api.get<Resume>(`/api/v1/resumes/${id}`),
  delete: (id: string) => api.delete(`/api/v1/resumes/${id}`),
};

// ── Jobs ──────────────────────────────────────────────────────────
export interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  required_skills: string[];
  location?: string;
  experience_years?: number;
  recruiter_id: string;
  status: string;
  posted_at: string;
}

export const jobApi = {
  create: (data: Omit<Job, "id" | "recruiter_id" | "status" | "posted_at">) =>
    api.post<Job>("/api/v1/jobs/create", data),
  list: (skip = 0, limit = 20) =>
    api.get<Job[]>(`/api/v1/jobs/list?skip=${skip}&limit=${limit}`),
  get: (id: string) => api.get<Job>(`/api/v1/jobs/${id}`),
  update: (
    id: string,
    data: Omit<Job, "id" | "recruiter_id" | "status" | "posted_at">
  ) => api.put<Job>(`/api/v1/jobs/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/jobs/${id}`),
};

// ── Analysis ──────────────────────────────────────────────────────
export const analysisApi = {
  analyzeGithub: (username: string) =>
    api.post("/api/v1/analysis/github", { username }),
  getGithub: (username: string) =>
    api.get(`/api/v1/analysis/github/${username}`),
  analyzeLinks: (resumeId: string) =>
    api.post(`/api/v1/analysis/links/${resumeId}`),
};

// ── ATS ───────────────────────────────────────────────────────────
export interface ScoreBreakdown {
  skills_match: number;
  experience_relevance: number;
  project_quality: number;
  cultural_fit: number;
}

export interface ATSScore {
  id: string;
  resume_id: string;
  job_id: string;
  overall_score: number;
  breakdown: ScoreBreakdown;
  feedback: { strengths?: string; weaknesses?: string; overall?: string };
  suggestions: string[];
  matched_skills: string[];
  missing_skills: string[];
  created_at: string;
}

export const atsApi = {
  score: (resume_id: string, job_id: string) =>
    api.post<ATSScore>("/api/v1/ats/score", { resume_id, job_id }),
  get: (id: string) => api.get<ATSScore>(`/api/v1/ats/score/${id}`),
  history: () => api.get<{ id: string; resume_id: string; job_id: string; overall_score: number; created_at: string }[]>("/api/v1/ats/history"),
};
