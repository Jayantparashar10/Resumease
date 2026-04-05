"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import RoleGuard from "@/components/auth/RoleGuard";
import Navbar from "@/components/Navbar";
import { jobApi, Job } from "@/services/api";
import toast from "react-hot-toast";
import { Plus, Trash2, Briefcase } from "lucide-react";

const EMPTY_FORM = {
  title: "",
  company: "",
  description: "",
  location: "",
  experience_years: "" as string | number,
  required_skills: "",
};

export default function RecruiterDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user?.role === "student") router.push("/student/dashboard");
  }, [loading, user, router]);

  const loadJobs = useCallback(async () => {
    const res = await jobApi.list();
    setJobs(res.data.filter((j) => j.recruiter_id === user?.id));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    loadJobs();
  }, [loadJobs, user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await jobApi.create({
        title: form.title,
        company: form.company,
        description: form.description,
        location: form.location || undefined,
        experience_years: form.experience_years
          ? Number(form.experience_years)
          : undefined,
        required_skills: form.required_skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      toast.success("Job posted!");
      setShowForm(false);
      setForm(EMPTY_FORM);
      loadJobs();
    } catch {
      toast.error("Failed to post job");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await jobApi.delete(id);
    toast.success("Job removed");
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  if (loading || !user) return null;

  return (
    <RoleGuard role="recruiter">
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <main className="mx-auto max-w-5xl px-6 py-10">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                Recruiter Dashboard
              </h1>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Manage your job postings
              </p>
            </div>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/25 hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" /> Post a Job
            </button>
          </div>

          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="mb-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm"
            >
              <h2 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">
                New Job Posting
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Job title *
                  </label>
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    placeholder="e.g. Frontend Engineer"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Company *
                  </label>
                  <input
                    required
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    placeholder="e.g. Acme Inc."
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Location
                  </label>
                  <input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    placeholder="e.g. Remote"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Min. experience (years)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.experience_years}
                    onChange={(e) =>
                      setForm({ ...form, experience_years: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    placeholder="e.g. 2"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Required skills (comma-separated) *
                  </label>
                  <input
                    required
                    value={form.required_skills}
                    onChange={(e) =>
                      setForm({ ...form, required_skills: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    placeholder="e.g. React, TypeScript, Node.js"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Job description *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors resize-none"
                    placeholder="Describe the role, responsibilities, and requirements..."
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {submitting ? "Posting..." : "Post Job"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50">
                <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                {jobs.length}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Active job postings
              </p>
            </div>
          </div>

          <h2 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">
            Your Job Postings
          </h2>
          {jobs.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center">
              <Briefcase className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No jobs posted yet.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Post your first job -&gt;
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-start justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {job.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {job.company}
                      {job.location ? ` · ${job.location}` : ""}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {job.required_skills.map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 text-xs text-slate-600 dark:text-slate-400"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(job.id)}
                    className="ml-4 shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 dark:hover:text-red-400 transition-colors"
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
