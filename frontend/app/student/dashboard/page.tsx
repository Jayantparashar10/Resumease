"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { resumeApi, Resume, atsApi } from "@/services/api";
import { FileText, BarChart3, Upload, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function StudentDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [scoreHistory, setScoreHistory] = useState<
    { id: string; resume_id: string; job_id: string; overall_score: number; created_at: string }[]
  >([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user?.role === "recruiter") router.push("/recruiter/dashboard");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([resumeApi.list(), atsApi.history()]).then(([rRes, sRes]) => {
      setResumes(rRes.data);
      setScoreHistory(sRes.data);
    }).finally(() => setFetching(false));
  }, [user]);

  if (loading || !user) return null;

  const avgScore =
    scoreHistory.length
      ? Math.round(scoreHistory.reduce((a, s) => a + s.overall_score, 0) / scoreHistory.length)
      : null;

  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="mb-2 text-2xl font-bold text-zinc-900">
          Welcome back, {user.full_name.split(" ")[0]} 👋
        </h1>
        <p className="mb-8 text-sm text-zinc-500">
          Here's a snapshot of your profile.
        </p>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            { label: "Resumes uploaded", value: resumes.length, icon: <FileText className="h-5 w-5 text-indigo-500" /> },
            { label: "ATS scores run", value: scoreHistory.length, icon: <BarChart3 className="h-5 w-5 text-green-500" /> },
            { label: "Avg. ATS score", value: avgScore !== null ? `${avgScore}/100` : "—", icon: <BarChart3 className="h-5 w-5 text-amber-500" /> },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="mb-2">{s.icon}</div>
              <p className="text-2xl font-bold text-zinc-900">{s.value}</p>
              <p className="text-xs text-zinc-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="mb-8 flex gap-3">
          <Link
            href="/student/resumes"
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Upload className="h-4 w-4" /> Upload Resume
          </Link>
          <Link
            href="/jobs"
            className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            Browse Jobs
          </Link>
        </div>

        {/* Recent resumes */}
        <section className="mb-8">
          <h2 className="mb-4 font-semibold text-zinc-900">Recent Resumes</h2>
          {fetching ? (
            <p className="text-sm text-zinc-400">Loading…</p>
          ) : resumes.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed bg-white p-10 text-center">
              <FileText className="mx-auto mb-3 h-8 w-8 text-zinc-300" />
              <p className="text-sm text-zinc-500">No resumes yet.</p>
              <Link href="/student/resumes" className="mt-2 inline-block text-sm text-indigo-600 hover:underline">
                Upload your first resume →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {resumes.slice(0, 5).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl border bg-white px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-zinc-400" />
                    <div>
                      <p className="text-sm font-medium text-zinc-800">{r.filename}</p>
                      <p className="text-xs text-zinc-400">
                        {new Date(r.uploaded_at).toLocaleDateString()} · {r.skills.length} skills
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/student/resumes?id=${r.id}`}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
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
            <h2 className="mb-4 font-semibold text-zinc-900">Recent ATS Scores</h2>
            <div className="space-y-2">
              {scoreHistory.slice(0, 5).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border bg-white px-4 py-3"
                >
                  <p className="text-sm text-zinc-600">
                    Score run on {new Date(s.created_at).toLocaleDateString()}
                  </p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      s.overall_score >= 70
                        ? "bg-green-100 text-green-700"
                        : s.overall_score >= 50
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {s.overall_score} / 100
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
