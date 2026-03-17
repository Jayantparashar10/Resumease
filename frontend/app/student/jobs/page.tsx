"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RoleGuard from "@/components/auth/RoleGuard";
import Navbar from "@/components/Navbar";
import { jobApi, Job, resumeApi, Resume, atsApi } from "@/services/api";
import toast from "react-hot-toast";
import { Briefcase, MapPin, Clock } from "lucide-react";

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
      <div className="min-h-screen bg-zinc-50">
        <Navbar />
        <main className="mx-auto max-w-4xl px-6 py-10">
          <h1 className="mb-2 text-2xl font-bold text-zinc-900">Browse Jobs</h1>
          <p className="mb-6 text-sm text-zinc-500">Score your resume against active jobs in one click.</p>

          {resumes.length > 0 ? (
            <div className="mb-6 flex items-center gap-3">
              <label className="text-sm font-medium text-zinc-700">Score with resume:</label>
              <select
                value={selectedResume}
                onChange={(e) => setSelectedResume(e.target.value)}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
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
            <p className="text-sm text-zinc-400">Loading jobs...</p>
          ) : jobs.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed bg-white p-12 text-center">
              <Briefcase className="mx-auto mb-3 h-8 w-8 text-zinc-300" />
              <p className="text-sm text-zinc-500">No jobs posted yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div key={job.id} className="rounded-2xl border bg-white p-6">
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-semibold text-zinc-900">{job.title}</h2>
                      <p className="text-sm text-zinc-500">{job.company}</p>
                    </div>
                    <button
                      onClick={() => handleScore(job.id)}
                      disabled={applyingJob === job.id}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {applyingJob === job.id ? "Scoring..." : "Check ATS Score"}
                    </button>
                  </div>
                  <div className="mb-3 flex items-center gap-4 text-xs text-zinc-400">
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
                  </div>
                  <p className="text-sm text-zinc-600">{job.description}</p>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </RoleGuard>
  );
}
