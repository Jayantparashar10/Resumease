"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import OnboardingForm from "@/components/onboarding/OnboardingForm";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/context/AuthContext";

export default function OnboardingPage() {
  const { user, getPostLoginRoute } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.onboarding_completed) {
      router.replace(getPostLoginRoute(user));
    }
  }, [getPostLoginRoute, router, user]);

  return (
    <AuthGuard requireCompletedOnboarding={false}>
      <div className="min-h-screen bg-zinc-50 px-4 py-10">
        <main className="mx-auto max-w-xl">
          <h1 className="mb-2 text-2xl font-bold text-zinc-900">Complete your onboarding</h1>
          <p className="mb-6 text-sm text-zinc-500">
            We use this to personalize your student or recruiter experience.
          </p>
          <OnboardingForm />
        </main>
      </div>
    </AuthGuard>
  );
}
