"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Brain, ArrowRight } from "lucide-react";
import { GlowyWavesHero } from "@/components/ui/glowy-waves-hero-shadcnui";
import { GlassmorphismMinimalMetricsBlock } from "@/components/ui/glassmorphism-minimal-metrics-block-shadcnui";

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/60 bg-background/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 shadow-sm shadow-violet-500/30">
            <Brain className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-foreground">
            Resume<span className="text-primary">Ase</span>
          </span>
        </div>
        <div className="flex gap-3">
          {user ? (
            <Link
              href={user.role === "recruiter" ? "/recruiter/dashboard" : "/student/dashboard"}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-violet-500/25 hover:shadow-violet-500/40 hover:opacity-90 transition-all"
            >
              Dashboard <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/80 hover:bg-muted transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-violet-500/25 hover:opacity-90 transition-opacity"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <GlowyWavesHero />

      {/* Features / Metrics */}
      <GlassmorphismMinimalMetricsBlock />

      <footer className="border-t border-border bg-background py-8 text-center text-sm text-muted-foreground">
        © 2026 ResumeAse · Built with FastAPI + Next.js
      </footer>
    </div>
  );
}
