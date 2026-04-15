"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Brain, ArrowRight } from "lucide-react";
import { GlowyWavesHero } from "@/components/ui/glowy-waves-hero-shadcnui";
import { GlassmorphismMinimalMetricsBlock } from "@/components/ui/glassmorphism-minimal-metrics-block-shadcnui";

export default function LandingPage() {
  const { user } = useAuth();
  const dashboardHref =
    user?.role === "recruiter" ? "/recruiter/dashboard" : "/student/dashboard";

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/60 bg-background/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-sky-600 shadow-sm shadow-blue-500/30">
            <Brain className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-foreground">
            Resume<span className="text-primary">Ase</span>
          </span>
        </div>
        <div className="flex gap-3">
          {user ? (
            <Link
              href={dashboardHref}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-blue-500/25 hover:shadow-blue-500/40 hover:opacity-90 transition-all"
            >
              Dashboard <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-1 py-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors sm:rounded-lg sm:border sm:border-border sm:px-4 sm:hover:bg-muted"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-gradient-to-r from-blue-600 to-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-500/25 hover:opacity-90 transition-opacity"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <GlowyWavesHero />

      <div className="relative h-14 overflow-hidden bg-background sm:h-16">
        <div className="absolute inset-x-0 -top-10 h-24 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent blur-2xl" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Features / Metrics */}
      <GlassmorphismMinimalMetricsBlock />

      <footer className="border-t border-border bg-background py-8 text-center text-sm text-muted-foreground">
        © 2026 ResumeAse · Built with FastAPI + Next.js
      </footer>
    </div>
  );
}
