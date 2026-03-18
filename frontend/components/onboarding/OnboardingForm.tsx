"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";

export default function OnboardingForm() {
  const router = useRouter();
  const { user, completeOnboarding, getPostLoginRoute } = useAuth();

  const initialRole = useMemo(
    () => (user?.role === "recruiter" ? "recruiter" : "student"),
    [user?.role]
  );

  const [role, setRole] = useState<"student" | "recruiter">(initialRole);
  const [loading, setLoading] = useState(false);

  const [student, setStudent] = useState({
    college: "",
    degree: "",
    graduation_year: new Date().getFullYear(),
    target_roles: "",
    skills_self_reported: "",
  });

  const [recruiter, setRecruiter] = useState({
    company: "",
    designation: "",
    hiring_for: "",
    company_size: "",
  });

  const toArray = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const inputClass = "w-full rounded-lg border-2 border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors";
  const labelClass = "block text-xs font-semibold uppercase tracking-wide text-zinc-600 mb-2";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const payload =
        role === "student"
          ? {
              role,
              data: {
                college: student.college,
                degree: student.degree,
                graduation_year: Number(student.graduation_year),
                target_roles: toArray(student.target_roles),
                skills_self_reported: toArray(student.skills_self_reported),
              },
            }
          : {
              role,
              data: {
                company: recruiter.company,
                designation: recruiter.designation,
                hiring_for: toArray(recruiter.hiring_for),
                company_size: recruiter.company_size,
              },
            };

      const nextUser = await completeOnboarding(payload);
      toast.success("Onboarding completed");
      router.push(getPostLoginRoute(nextUser));
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Unable to complete onboarding";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border bg-white p-8">
      <div>
        <p className="mb-4 text-sm font-semibold text-zinc-700 uppercase tracking-wide">I am joining as</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRole("student")}
            className={`rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all ${
              role === "student" 
                ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm" 
                : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300"
            }`}
          >
            👨‍🎓 Student
          </button>
          <button
            type="button"
            onClick={() => setRole("recruiter")}
            className={`rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all ${
              role === "recruiter" 
                ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm" 
                : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300"
            }`}
          >
            💼 Recruiter
          </button>
        </div>
      </div>

      {role === "student" ? (
        <div className="space-y-5 pt-4">
          <div>
            <label className={labelClass}>College/University</label>
            <input
              required
              value={student.college}
              onChange={(e) => setStudent((prev) => ({ ...prev, college: e.target.value }))}
              className={inputClass}
              placeholder="e.g., MIT, Stanford, Delhi University"
            />
          </div>
          <div>
            <label className={labelClass}>Degree</label>
            <input
              required
              value={student.degree}
              onChange={(e) => setStudent((prev) => ({ ...prev, degree: e.target.value }))}
              className={inputClass}
              placeholder="e.g., B.Tech Computer Science, B.Sc Physics"
            />
          </div>
          <div>
            <label className={labelClass}>Graduation Year</label>
            <input
              required
              type="number"
              min={2000}
              max={2100}
              value={student.graduation_year}
              onChange={(e) => setStudent((prev) => ({ ...prev, graduation_year: Number(e.target.value) }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Target Roles</label>
            <input
              value={student.target_roles}
              onChange={(e) => setStudent((prev) => ({ ...prev, target_roles: e.target.value }))}
              className={inputClass}
              placeholder="e.g., Frontend Engineer, Data Scientist, Product Manager"
            />
            <p className="mt-1 text-xs text-zinc-500">Separate multiple roles with commas</p>
          </div>
          <div>
            <label className={labelClass}>Skills</label>
            <input
              value={student.skills_self_reported}
              onChange={(e) => setStudent((prev) => ({ ...prev, skills_self_reported: e.target.value }))}
              className={inputClass}
              placeholder="e.g., Python, React, Machine Learning, SQL"
            />
            <p className="mt-1 text-xs text-zinc-500">Separate multiple skills with commas</p>
          </div>
        </div>
      ) : (
        <div className="space-y-5 pt-4">
          <div>
            <label className={labelClass}>Company Name</label>
            <input
              required
              value={recruiter.company}
              onChange={(e) => setRecruiter((prev) => ({ ...prev, company: e.target.value }))}
              className={inputClass}
              placeholder="e.g., Google, Microsoft, Accenture"
            />
          </div>
          <div>
            <label className={labelClass}>Your Designation</label>
            <input
              required
              value={recruiter.designation}
              onChange={(e) => setRecruiter((prev) => ({ ...prev, designation: e.target.value }))}
              className={inputClass}
              placeholder="e.g., Hiring Manager, Tech Lead, HR Manager"
            />
          </div>
          <div>
            <label className={labelClass}>Currently Hiring For</label>
            <input
              value={recruiter.hiring_for}
              onChange={(e) => setRecruiter((prev) => ({ ...prev, hiring_for: e.target.value }))}
              className={inputClass}
              placeholder="e.g., Software Engineer, Data Scientist, Product Manager"
            />
            <p className="mt-1 text-xs text-zinc-500">Separate multiple positions with commas</p>
          </div>
          <div>
            <label className={labelClass}>Company Size</label>
            <input
              required
              value={recruiter.company_size}
              onChange={(e) => setRecruiter((prev) => ({ ...prev, company_size: e.target.value }))}
              className={inputClass}
              placeholder="e.g., 50-200, 1000+, Early-stage startup"
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-8 w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 transition-colors"
      >
        {loading ? "Saving your onboarding..." : "✓ Complete onboarding"}
      </button>
    </form>
  );
}
