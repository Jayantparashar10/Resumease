"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
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

export default function RecruiterDashboard() {
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

  const loadJobs = async () => {
    const res = await jobApi.list();
    // Filter only recruiter's own jobs
    setJobs(res.data.filter((j) => j.recruiter_id === user?.id));
  };

  useEffect(() => {
    if (!user) return;
    loadJobs();
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
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
    <div className="min-h-screen bg-zinc-50">
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900">Recruiter Dashboard</h1>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> Post a Job
          </button>
        </div>

        {/* Create job form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-8 rounded-2xl border bg-white p-6 shadow-sm"
          >
            <h2 className="mb-4 font-semibold text-zinc-900">New Job Posting</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Job title *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  placeholder="e.g. Frontend Engineer"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Company *</label>
                <input
                  required
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  placeholder="e.g. Acme Inc."
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Location</label>
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  placeholder="e.g. Remote"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Min. experience (years)</label>
                <input
                  type="number"
                  min={0}
                  value={form.experience_years}
                  onChange={(e) => setForm({ ...form, experience_years: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  placeholder="e.g. 2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Required skills (comma-separated) *
                </label>
                <input
                  required
                  value={form.required_skills}
                  onChange={(e) => setForm({ ...form, required_skills: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  placeholder="e.g. React, TypeScript, Node.js"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Job description *
                </label>
                <textarea
                  required
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 resize-none"
                  placeholder="Describe the role, responsibilities, and requirements…"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {submitting ? "Posting…" : "Post Job"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-2xl font-bold text-zinc-900">{jobs.length}</p>
            <p className="text-xs text-zinc-400">Active job postings</p>
          </div>
        </div>

        {/* Jobs list */}
        <h2 className="mb-4 font-semibold text-zinc-900">Your Job Postings</h2>
        {jobs.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed bg-white p-12 text-center">
            <Briefcase className="mx-auto mb-3 h-8 w-8 text-zinc-300" />
            <p className="text-sm text-zinc-500">No jobs posted yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-start justify-between rounded-2xl border bg-white p-5"
              >
                <div>
                  <p className="font-semibold text-zinc-900">{job.title}</p>
                  <p className="text-sm text-zinc-500 mb-2">{job.company} {job.location ? `· ${job.location}` : ""}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {job.required_skills.map((s) => (
                      <span key={s} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(job.id)}
                  className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-500 ml-4 shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
