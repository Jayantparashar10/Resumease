"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { Brain } from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "student" as "student" | "recruiter",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await register(form);
      toast.success("Account created!");
      router.push(
        form.role === "recruiter"
          ? "/recruiter/dashboard"
          : "/student/dashboard"
      );
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Registration failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950 px-4 py-10">
      {/* Background orbs */}
      <div className="orb -top-40 -right-40 h-96 w-96 bg-violet-400/20 dark:bg-violet-700/15" />
      <div className="orb bottom-0 -left-20 h-72 w-72 bg-indigo-400/15 dark:bg-indigo-700/10" />

      <div className="relative w-full max-w-md">
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

          <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-slate-50">Create account</h1>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
            Already have one?{" "}
            <Link href="/login" className="font-medium text-violet-600 dark:text-violet-400 hover:underline">
              Sign in
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Full name
              </label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-colors"
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
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
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-colors"
                placeholder="Min. 8 characters"
              />
            </div>

            {/* Role selector */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                I am a…
              </label>
              <div className="flex gap-3">
                {(["student", "recruiter"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm({ ...form, role: r })}
                    className={`flex-1 rounded-lg border py-2.5 text-sm font-medium capitalize transition-all ${
                      form.role === r
                        ? "border-violet-500 bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 shadow-sm"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 font-semibold text-white shadow-sm shadow-violet-500/25 hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
