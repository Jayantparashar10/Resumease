"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { jobApi, Job, resumeApi, Resume, atsApi } from "@/services/api";
import toast from "react-hot-toast";
import { Briefcase, MapPin, Clock, Zap } from "lucide-react";

export default function JobsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [fetching, setFetching] = useState(true);
  const [applyingJob, setApplyingJob] = useState<string | null>(null);
  const [selectedResume, setSelectedResume] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([jobApi.list(), resumeApi.list()]).then(([jRes, rRes]) => {
      setJobs(jRes.data);
      setResumes(rRes.data);
      if (rRes.data.length) setSelectedResume(rRes.data[0].id);
    }).finally(() => setFetching(false));
  }, [user]);

  const handleApply = async (jobId: string) => {
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

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-slate-50">Browse Jobs</h1>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          Click &ldquo;Check ATS Score&rdquo; to instantly see how well your resume matches.
        </p>

        {/* Resume selector */}
        {resumes.length > 0 && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">Score with:</label>
            <select
              value={selectedResume}
              onChange={(e) => setSelectedResume(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
            >
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>{r.filename}</option>
              ))}
            </select>
          </div>
        )}

        {fetching ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Loading jobs…</p>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center">
            <Briefcase className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No jobs posted yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md dark:hover:shadow-slate-900/50 transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h2 className="font-semibold text-slate-900 dark:text-slate-100">{job.title}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{job.company}</p>
                  </div>
                  <button
                    onClick={() => handleApply(job.id)}
                    disabled={applyingJob === job.id}
                    className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 hover:opacity-90 disabled:opacity-60 shrink-0 transition-opacity"
                  >
                    <Zap className="h-3 w-3" />
                    {applyingJob === job.id ? "Scoring…" : "Check ATS Score"}
                  </button>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500 mb-3">
                  {job.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {job.location}
                    </span>
                  )}
                  {job.experience_years && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {job.experience_years}+ yrs
                    </span>
                  )}
                  <span>{new Date(job.posted_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{job.description}</p>
                {job.required_skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {job.required_skills.map((s) => (
                      <span key={s} className="rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 text-xs text-slate-600 dark:text-slate-400">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
