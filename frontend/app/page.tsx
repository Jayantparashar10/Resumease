"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Brain, Github, BarChart3, FileText, ArrowRight } from "lucide-react";

const features = [
  {
    icon: <FileText className="h-6 w-6 text-indigo-600" />,
    title: "Smart Resume Parsing",
    description:
      "PDF & DOCX parsing with automatic skill extraction and link detection.",
  },
  {
    icon: <Github className="h-6 w-6 text-indigo-600" />,
    title: "GitHub Analysis",
    description:
      "Deep-dive into GitHub profiles: repos, languages, activity and contributions.",
  },
  {
    icon: <Brain className="h-6 w-6 text-indigo-600" />,
    title: "LLM-Powered Scoring",
    description:
      "Cerebras-powered ATS scoring with detailed feedback and improvement suggestions.",
  },
  {
    icon: <BarChart3 className="h-6 w-6 text-indigo-600" />,
    title: "Recruiter Dashboard",
    description:
      "Manage job postings, rank candidates, and shortlist top talent effortlessly.",
  },
];

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-indigo-600">ResumeAse</span>
        <div className="flex gap-3">
          {user ? (
            <Link
              href={user.role === "recruiter" ? "/recruiter/dashboard" : "/student/dashboard"}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Dashboard →
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-zinc-50"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-24 text-center">
        <span className="mb-4 inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 uppercase tracking-wider">
          AI-Powered ATS
        </span>
        <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight text-zinc-900">
          Beat the ATS.<br />Land Your Dream Job.
        </h1>
        <p className="mx-auto mb-10 max-w-xl text-lg text-zinc-500">
          ResumeAse scans your resume, verifies your GitHub, and uses LLM to
          give you an accurate ATS score with actionable feedback.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/register"
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow hover:bg-indigo-700"
          >
            Get Started Free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-zinc-300 px-6 py-3 font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            Log in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold text-zinc-900">
            Everything you need to stand out
          </h2>
          <div className="grid gap-8 sm:grid-cols-2">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border bg-zinc-50 p-6 hover:shadow-md transition-shadow"
              >
                <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50">
                  {f.icon}
                </div>
                <h3 className="mb-2 font-semibold text-zinc-900">{f.title}</h3>
                <p className="text-sm text-zinc-500">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t bg-white py-8 text-center text-sm text-zinc-400">
        © 2026 ResumeAse · Built with FastAPI + Next.js
      </footer>
    </div>
  );
}
