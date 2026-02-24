"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Brain, LogOut, LayoutDashboard, FileText, Briefcase } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();

  const navLinks =
    user?.role === "recruiter"
      ? [
          { href: "/recruiter/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
          { href: "/jobs/manage", label: "Jobs", icon: <Briefcase className="h-4 w-4" /> },
        ]
      : [
          { href: "/student/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
          { href: "/student/resumes", label: "Resumes", icon: <FileText className="h-4 w-4" /> },
          { href: "/jobs", label: "Browse Jobs", icon: <Briefcase className="h-4 w-4" /> },
        ];

  return (
    <nav className="border-b bg-white px-6 py-3 flex items-center justify-between sticky top-0 z-10">
      <Link href="/" className="flex items-center gap-2">
        <Brain className="h-6 w-6 text-indigo-600" />
        <span className="font-bold text-indigo-600">ResumeAse</span>
      </Link>
      <div className="flex items-center gap-1">
        {navLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          >
            {l.icon}
            {l.label}
          </Link>
        ))}
        {user && (
          <button
            onClick={logout}
            className="ml-2 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        )}
      </div>
    </nav>
  );
}
