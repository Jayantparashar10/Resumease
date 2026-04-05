"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Brain } from "lucide-react";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const { user, loading, getPostLoginRoute } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace(getPostLoginRoute(user));
    }
  }, [loading, getPostLoginRoute, router, user]);

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

          <GoogleSignInButton />
        </div>
      </div>
    </div>
  );
}
