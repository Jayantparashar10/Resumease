"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RoleGuard from "@/components/auth/RoleGuard";
import Navbar from "@/components/Navbar";
import { jobApi, Job } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

export default function RecruiterDashboardPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    if (!user) return;
    jobApi.list().then((res) => {
      setJobs(res.data.filter((job) => job.recruiter_id === user.id));
    });
  }, [user]);

  return (
    <RoleGuard role="recruiter">
      <div className="min-h-screen bg-zinc-50">
        <Navbar />
        <main className="mx-auto max-w-5xl px-6 py-10">
          <h1 className="mb-2 text-2xl font-bold text-zinc-900">Recruiter Dashboard</h1>
          <p className="mb-8 text-sm text-zinc-500">Manage job postings and review candidate ATS scores.</p>

          <div className="mb-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-2xl font-bold text-zinc-900">{jobs.length}</p>
              <p className="text-xs text-zinc-400">Active jobs posted by you</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href="/recruiter/jobs"
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Manage Jobs
            </Link>
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}
