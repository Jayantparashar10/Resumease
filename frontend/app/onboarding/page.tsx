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
         <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-10 overflow-hidden">
            <div className="orb -top-40 -right-40 h-96 w-96 bg-violet-400/20 dark:bg-violet-700/15" />
            <div className="orb -bottom-20 -left-20 h-72 w-72 bg-indigo-400/15 dark:bg-indigo-700/10" />

            <main className="relative mx-auto max-w-xl">
               <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-slate-50">
                  Complete your onboarding
               </h1>
               <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
                  We use this to personalize your student or recruiter
                  experience.
               </p>
               <OnboardingForm />
            </main>
         </div>
      </AuthGuard>
   );
}
