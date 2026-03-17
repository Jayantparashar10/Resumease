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
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border bg-white p-6">
      <div>
        <p className="mb-2 text-sm font-medium text-zinc-700">I am joining as</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRole("student")}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${
              role === "student" ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-zinc-300"
            }`}
          >
            Student
          </button>
          <button
            type="button"
            onClick={() => setRole("recruiter")}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${
              role === "recruiter" ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-zinc-300"
            }`}
          >
            Recruiter
          </button>
        </div>
      </div>

      {role === "student" ? (
        <>
          <input
            required
            value={student.college}
            onChange={(e) => setStudent((prev) => ({ ...prev, college: e.target.value }))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="College"
          />
          <input
            required
            value={student.degree}
            onChange={(e) => setStudent((prev) => ({ ...prev, degree: e.target.value }))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Degree"
          />
          <input
            required
            type="number"
            min={2000}
            max={2100}
            value={student.graduation_year}
            onChange={(e) => setStudent((prev) => ({ ...prev, graduation_year: Number(e.target.value) }))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Graduation year"
          />
          <input
            value={student.target_roles}
            onChange={(e) => setStudent((prev) => ({ ...prev, target_roles: e.target.value }))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Target roles (comma-separated)"
          />
          <input
            value={student.skills_self_reported}
            onChange={(e) => setStudent((prev) => ({ ...prev, skills_self_reported: e.target.value }))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Skills (comma-separated)"
          />
        </>
      ) : (
        <>
          <input
            required
            value={recruiter.company}
            onChange={(e) => setRecruiter((prev) => ({ ...prev, company: e.target.value }))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Company"
          />
          <input
            required
            value={recruiter.designation}
            onChange={(e) => setRecruiter((prev) => ({ ...prev, designation: e.target.value }))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Designation"
          />
          <input
            value={recruiter.hiring_for}
            onChange={(e) => setRecruiter((prev) => ({ ...prev, hiring_for: e.target.value }))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Hiring for (comma-separated)"
          />
          <input
            required
            value={recruiter.company_size}
            onChange={(e) => setRecruiter((prev) => ({ ...prev, company_size: e.target.value }))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Company size"
          />
        </>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {loading ? "Saving..." : "Complete onboarding"}
      </button>
    </form>
  );
}
