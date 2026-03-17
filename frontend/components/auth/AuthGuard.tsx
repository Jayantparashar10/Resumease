"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface AuthGuardProps {
  children: ReactNode;
  requireCompletedOnboarding?: boolean;
}

export default function AuthGuard({
  children,
  requireCompletedOnboarding = true,
}: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/");
      return;
    }

    if (
      requireCompletedOnboarding &&
      !user.onboarding_completed &&
      pathname !== "/onboarding"
    ) {
      router.replace("/onboarding");
    }
  }, [loading, pathname, requireCompletedOnboarding, router, user]);

  if (loading || !user) return null;
  if (requireCompletedOnboarding && !user.onboarding_completed && pathname !== "/onboarding") {
    return null;
  }

  return <>{children}</>;
}
