"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";

function AuthCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { googleLogin, getPostLoginRoute } = useAuth();

  useEffect(() => {
    const idToken = params.get("id_token");

    if (!idToken) {
      toast.error("Missing Google token in callback URL");
      router.replace("/login");
      return;
    }

    googleLogin(idToken)
      .then((nextUser) => {
        toast.success("Signed in successfully");
        router.replace(getPostLoginRoute(nextUser));
      })
      .catch((err: unknown) => {
        const message =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          "Google sign-in failed";
        toast.error(message);
        router.replace("/login");
      });
  }, [getPostLoginRoute, googleLogin, params, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <p className="text-sm text-zinc-600">Completing sign-in...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50">
          <p className="text-sm text-zinc-600">Loading callback...</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
