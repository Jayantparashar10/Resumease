"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { jobApi, Job, resumeApi, Resume, atsApi } from "@/services/api";
import toast from "react-hot-toast";
import { Briefcase, MapPin, Clock } from "lucide-react";

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
    <div className="min-h-screen bg-zinc-50">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="mb-2 text-2xl font-bold text-zinc-900">Browse Jobs</h1>
        <p className="mb-6 text-sm text-zinc-500">
          Click "Check ATS Score" to instantly see how well your resume matches.
        </p>

        {/* Resume selector */}
        {resumes.length > 0 && (
          <div className="mb-6 flex items-center gap-3">
            <label className="text-sm font-medium text-zinc-700">Score with resume:</label>
            <select
              value={selectedResume}
              onChange={(e) => setSelectedResume(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>{r.filename}</option>
              ))}
            </select>
          </div>
        )}

        {fetching ? (
          <p className="text-sm text-zinc-400">Loading jobs…</p>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed bg-white p-12 text-center">
            <Briefcase className="mx-auto mb-3 h-8 w-8 text-zinc-300" />
            <p className="text-sm text-zinc-500">No jobs posted yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="rounded-2xl border bg-white p-6 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h2 className="font-semibold text-zinc-900">{job.title}</h2>
                    <p className="text-sm text-zinc-500">{job.company}</p>
                  </div>
                  <button
                    onClick={() => handleApply(job.id)}
                    disabled={applyingJob === job.id}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 shrink-0"
                  >
                    {applyingJob === job.id ? "Scoring…" : "Check ATS Score"}
                  </button>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-400 mb-3">
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
                <p className="text-sm text-zinc-600 line-clamp-2">{job.description}</p>
                {job.required_skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {job.required_skills.map((s) => (
                      <span key={s} className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600">
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
