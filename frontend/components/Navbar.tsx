"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Brain,
  LogOut,
  LayoutDashboard,
  FileText,
  Briefcase,
  BarChart3,
  UserCircle2,
} from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const navLinks =
    user?.role === "recruiter"
      ? [
          { href: "/recruiter/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
          { href: "/recruiter/jobs", label: "Jobs", icon: <Briefcase className="h-4 w-4" /> },
          { href: "/profile", label: "Profile", icon: <UserCircle2 className="h-4 w-4" /> },
        ]
      : [
          { href: "/student/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
          { href: "/student/resumes", label: "Resumes", icon: <FileText className="h-4 w-4" /> },
          { href: "/student/jobs", label: "Jobs", icon: <Briefcase className="h-4 w-4" /> },
          { href: "/student/ats-history", label: "ATS History", icon: <BarChart3 className="h-4 w-4" /> },
          { href: "/profile", label: "Profile", icon: <UserCircle2 className="h-4 w-4" /> },
        ];

  return (
    <nav className="sticky top-0 z-10 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl px-6 py-3 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2 group">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 shadow-sm shadow-violet-500/30 group-hover:shadow-violet-500/50 transition-shadow">
          <Brain className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-slate-900 dark:text-slate-100">
          Resume<span className="text-violet-600 dark:text-violet-400">Ase</span>
        </span>
      </Link>

      <div className="flex items-center gap-1">
        {navLinks.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {l.icon}
              {l.label}
            </Link>
          );
        })}
        {user && (
          <button
            onClick={() => { void logout(); }}
            className="ml-2 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        )}
      </div>
    </nav>
  );
}
