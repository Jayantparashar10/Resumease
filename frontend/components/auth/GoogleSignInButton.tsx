"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (args: Record<string, unknown>) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface GoogleCredentialResponse {
  credential?: string;
}

export default function GoogleSignInButton() {
  const router = useRouter();
  const { googleLogin, getPostLoginRoute } = useAuth();
  const [rendered, setRendered] = useState(false);

  const handleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      const token = response.credential;
      if (!token) {
        toast.error("Google did not return an ID token");
        return;
      }

      try {
        const nextUser = await googleLogin(token);
        toast.success("Signed in successfully");
        router.push(getPostLoginRoute(nextUser));
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          "Google sign-in failed";
        toast.error(message);
      }
    },
    [getPostLoginRoute, googleLogin, router]
  );

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const root = document.getElementById("google-signin-button");

    if (!clientId || !root) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.google) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredential,
      });
      window.google.accounts.id.renderButton(root, {
        type: "standard",
        theme: "outline",
        size: "large",
        width: 320,
        text: "continue_with",
      });
      setRendered(true);
    };

    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [handleCredential]);

  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Google sign-in is currently unavailable. Please try again later.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div id="google-signin-button" className="min-h-10" />
      {!rendered ? <p className="text-xs text-zinc-500">Loading Google sign-in...</p> : null}
    </div>
  );
}
