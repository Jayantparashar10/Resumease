"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { Brain } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      const stored = localStorage.getItem("access_token");
      if (stored) {
        const payload = JSON.parse(atob(stored.split(".")[1]));
        router.push(
          payload.role === "recruiter"
            ? "/recruiter/dashboard"
            : "/student/dashboard"
        );
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Login failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950 px-4">
      {/* Background orbs */}
      <div className="orb -top-40 -left-40 h-96 w-96 bg-violet-400/20 dark:bg-violet-700/15" />
      <div className="orb -bottom-20 -right-20 h-72 w-72 bg-indigo-400/15 dark:bg-indigo-700/10" />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-8 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50">
          {/* Logo */}
          <Link href="/" className="mb-6 flex items-center gap-2 w-fit">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 shadow-sm shadow-violet-500/30">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Resume<span className="text-violet-600 dark:text-violet-400">Ase</span>
            </span>
          </Link>

          <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-slate-50">Sign in</h1>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
            New here?{" "}
            <Link href="/register" className="font-medium text-violet-600 dark:text-violet-400 hover:underline">
              Create an account
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-colors"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 font-semibold text-white shadow-sm shadow-violet-500/25 hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
