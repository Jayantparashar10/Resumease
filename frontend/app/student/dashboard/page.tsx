"use client";

import { useEffect, useState } from "react";
import RoleGuard from "@/components/auth/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { resumeApi, Resume, atsApi } from "@/services/api";
import { FileText, BarChart3, Upload, ExternalLink, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [scoreHistory, setScoreHistory] = useState<
    { id: string; resume_id: string; job_id: string; overall_score: number; created_at: string }[]
  >([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([resumeApi.list(), atsApi.history()]).then(([rRes, sRes]) => {
      setResumes(rRes.data);
      setScoreHistory(sRes.data);
    }).finally(() => setFetching(false));
  }, [user]);

  if (!user) return null;

  const avgScore =
    scoreHistory.length
      ? Math.round(scoreHistory.reduce((a, s) => a + s.overall_score, 0) / scoreHistory.length)
      : null;

  const scoreColor = (score: number) =>
    score >= 70
      ? "text-emerald-600 dark:text-emerald-400"
      : score >= 50
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-600 dark:text-red-400";

  const scoreBadge = (score: number) =>
    score >= 70
      ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
      : score >= 50
      ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60"
      : "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/60";

  return (
    <RoleGuard role="student">
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <main className="mx-auto max-w-5xl px-6 py-10">
          <div className="mb-8">
            <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-slate-50">
              Welcome back, {user.full_name.split(" ")[0]} 👋
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Here&apos;s a snapshot of your profile.
            </p>
          </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/50">
              <FileText className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{resumes.length}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Resumes uploaded</p>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/50">
              <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{scoreHistory.length}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">ATS scores run</p>
          </div>
          <div className="col-span-2 sm:col-span-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/50">
              <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <p className={`text-2xl font-bold ${avgScore !== null ? scoreColor(avgScore) : "text-slate-900 dark:text-slate-50"}`}>
              {avgScore !== null ? `${avgScore}/100` : "—"}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Avg. ATS score</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mb-8 flex gap-3">
          <Link
            href="/student/resumes"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-500/25 hover:opacity-90 transition-opacity"
          >
            <Upload className="h-4 w-4" /> Upload Resume
          </Link>
          <Link
            href="/jobs"
            className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Browse Jobs
          </Link>
          <Link
            href="/student/ats-history"
            className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            ATS History
          </Link>
        </div>

        {/* Recent resumes */}
        <section className="mb-8">
          <h2 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">Recent Resumes</h2>
          {fetching ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">Loading…</p>
          ) : resumes.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center">
              <FileText className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No resumes yet.</p>
              <Link href="/student/resumes" className="mt-2 inline-block text-sm text-violet-600 dark:text-violet-400 hover:underline">
                Upload your first resume →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {resumes.slice(0, 5).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950/50 shrink-0">
                      <FileText className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{r.filename}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {new Date(r.uploaded_at).toLocaleDateString()} · {r.skills.length} skills
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/student/resumes?id=${r.id}`}
                    className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:underline"
                  >
                    View <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Score history */}
        {scoreHistory.length > 0 && (
          <section>
            <h2 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">Recent ATS Scores</h2>
            <div className="space-y-2">
              {scoreHistory.slice(0, 5).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3"
                >
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Score run on {new Date(s.created_at).toLocaleDateString()}
                  </p>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${scoreBadge(s.overall_score)}`}>
                    {s.overall_score} / 100
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
        </main>
      </div>
    </RoleGuard>
  );
}
