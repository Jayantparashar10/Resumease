"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Plus, Trash2, Briefcase } from "lucide-react";
import RoleGuard from "@/components/auth/RoleGuard";
import Navbar from "@/components/Navbar";
import { jobApi, Job } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

const EMPTY_FORM = {
  title: "",
  company: "",
  description: "",
  location: "",
  experience_years: "" as string | number,
  required_skills: "",
};

export default function RecruiterJobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const loadJobs = useCallback(async () => {
    const res = await jobApi.list();
    setJobs(res.data.filter((j) => j.recruiter_id === user?.id));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    loadJobs();
  }, [loadJobs, user]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await jobApi.create({
        title: form.title,
        company: form.company,
        description: form.description,
        location: form.location || undefined,
        experience_years: form.experience_years ? Number(form.experience_years) : undefined,
        required_skills: form.required_skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
      });
      toast.success("Job posted");
      setForm(EMPTY_FORM);
      setShowForm(false);
      loadJobs();
    } catch {
      toast.error("Failed to post job");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (jobId: string) => {
    await jobApi.delete(jobId);
    setJobs((prev) => prev.filter((job) => job.id !== jobId));
    toast.success("Job removed");
  };

  return (
    <RoleGuard role="recruiter">
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <main className="mx-auto max-w-5xl px-6 py-10">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Recruiter Jobs</h1>
            <button
              onClick={() => setShowForm((prev) => !prev)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> New Job
            </button>
          </div>

          {showForm ? (
            <form
              onSubmit={handleSubmit}
              className="mb-8 space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6"
            >
              <input
                required
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="Job title"
              />
              <input
                required
                value={form.company}
                onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="Company"
              />
              <textarea
                required
                rows={4}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="Job description"
              />
              <input
                value={form.required_skills}
                onChange={(e) => setForm((prev) => ({ ...prev, required_skills: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="Required skills (comma-separated)"
              />
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? "Posting..." : "Post Job"}
              </button>
            </form>
          ) : null}

          {jobs.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center">
              <Briefcase className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No jobs posted yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-start justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
                >
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{job.title}</p>
                    <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">{job.company}</p>
                    <Link
                      href={`/recruiter/jobs/${job.id}/candidates`}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View candidates
                    </Link>
                  </div>
                  <button
                    onClick={() => handleDelete(job.id)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </RoleGuard>
  );
}
