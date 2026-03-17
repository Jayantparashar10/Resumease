"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/context/AuthContext";

interface RoleGuardProps {
  children: ReactNode;
  role: "student" | "recruiter";
}

export default function RoleGuard({ children, role }: RoleGuardProps) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user || !user.onboarding_completed) return;
    if (user.role !== role) {
      router.replace(user.role === "recruiter" ? "/recruiter/dashboard" : "/student/dashboard");
    }
  }, [role, router, user]);

  return (
    <AuthGuard requireCompletedOnboarding>
      {user?.role === role ? children : null}
    </AuthGuard>
  );
}
