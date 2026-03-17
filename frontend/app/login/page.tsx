"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Brain } from "lucide-react";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, getPostLoginRoute } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace(getPostLoginRoute(user));
    }
  }, [getPostLoginRoute, loading, router, user]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <Brain className="h-7 w-7 text-indigo-600" />
          <span className="text-xl font-bold text-indigo-600">ResumeAse</span>
        </div>
        <h1 className="mb-1 text-2xl font-bold text-zinc-900">Continue with Google</h1>
        <p className="mb-6 text-sm text-zinc-500">
          Sign in to continue onboarding and access your dashboard.
        </p>
        <GoogleSignInButton />
        <Link href="/" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
          Back to home
        </Link>
      </div>
    </div>
  );
}
