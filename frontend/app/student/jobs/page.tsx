"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RoleGuard from "@/components/auth/RoleGuard";
import Navbar from "@/components/Navbar";
import { jobApi, Job, resumeApi, Resume, atsApi } from "@/services/api";
import toast from "react-hot-toast";
import { Briefcase, MapPin, Clock, Zap } from "lucide-react";

export default function StudentJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [fetching, setFetching] = useState(true);
  const [applyingJob, setApplyingJob] = useState<string | null>(null);
  const [selectedResume, setSelectedResume] = useState("");

  useEffect(() => {
    Promise.all([jobApi.list(), resumeApi.list()])
      .then(([jobsRes, resumesRes]) => {
        setJobs(jobsRes.data);
        setResumes(resumesRes.data);
        if (resumesRes.data.length > 0) {
          setSelectedResume(resumesRes.data[0].id);
        }
      })
      .finally(() => setFetching(false));
  }, []);

  const handleScore = async (jobId: string) => {
    if (!selectedResume) {
      toast.error("Upload a resume first");
      router.push("/student/resumes");
      return;
    }

    setApplyingJob(jobId);
    try {
      const res = await atsApi.score(selectedResume, jobId);
      toast.success(`ATS Score: ${res.data.overall_score}/100`);
    } catch {
      toast.error("Scoring failed");
    } finally {
      setApplyingJob(null);
    }
  };

  return (
    <RoleGuard role="student">
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <main className="mx-auto max-w-5xl px-6 py-10">
          <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-slate-50">Browse Jobs</h1>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
            Score your resume against active jobs in one click.
          </p>

          {resumes.length > 0 ? (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                Score with resume:
              </label>
              <select
                value={selectedResume}
                onChange={(e) => setSelectedResume(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
              >
                {resumes.map((resume) => (
                  <option key={resume.id} value={resume.id}>
                    {resume.filename}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {fetching ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">Loading jobs...</p>
          ) : jobs.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center">
              <Briefcase className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No jobs posted yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md dark:hover:shadow-slate-900/50 transition-all"
                >
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-semibold text-slate-900 dark:text-slate-100">{job.title}</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{job.company}</p>
                    </div>
                    <button
                      onClick={() => handleScore(job.id)}
                      disabled={applyingJob === job.id}
                      className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 hover:opacity-90 disabled:opacity-60 shrink-0 transition-opacity"
                    >
                      <Zap className="h-3 w-3" />
                      {applyingJob === job.id ? "Scoring..." : "Check ATS Score"}
                    </button>
                  </div>

                  <div className="mb-3 flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                    {job.location ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {job.location}
                      </span>
                    ) : null}
                    {job.experience_years ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {job.experience_years}+ yrs
                      </span>
                    ) : null}

                    {job.posted_at ? <span>{new Date(job.posted_at).toLocaleDateString()}</span> : null}
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                    {job.description}
                  </p>

                  {job.required_skills?.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {job.required_skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 text-xs text-slate-600 dark:text-slate-400"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </RoleGuard>
  );
}
