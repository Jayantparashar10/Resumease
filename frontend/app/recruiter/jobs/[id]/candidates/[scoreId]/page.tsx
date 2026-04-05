"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import RoleGuard from "@/components/auth/RoleGuard";
import {
  recruiterApi,
  RecruiterCandidateProfileDetail,
  RecruiterCandidateResumeView,
} from "@/services/api";

export default function RecruiterCandidateProfilePage() {
  const params = useParams<{ id: string; scoreId: string }>();
  const [profile, setProfile] = useState<RecruiterCandidateProfileDetail | null>(null);
  const [resumeData, setResumeData] = useState<RecruiterCandidateResumeView | null>(null);
  const [openingResumeData, setOpeningResumeData] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      recruiterApi.getCandidateProfile(params.id, params.scoreId),
      recruiterApi.getCandidateResume(params.id, params.scoreId),
    ])
      .then(([profileRes, resumeRes]) => {
        setProfile(profileRes.data);
        setResumeData(resumeRes.data);
      })
      .catch(() => {
        toast.error("Failed to load candidate profile overview");
      })
      .finally(() => setLoading(false));
  }, [params.id, params.scoreId]);

  const openResumeData = async () => {
    setOpeningResumeData(true);
    try {
      const payload =
        resumeData ||
        (await recruiterApi.getCandidateResume(params.id, params.scoreId)).data;

      if (!resumeData) {
        setResumeData(payload);
      }

      const pretty = JSON.stringify(payload, null, 2);
      const blob = new Blob([pretty], { type: "application/json;charset=utf-8" });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch {
      toast.error("Unable to open resume data right now");
    } finally {
      setOpeningResumeData(false);
    }
  };

  const normalizedPreview = useMemo(() => {
    const source = resumeData?.parsed_text || profile?.resume_parsed_text || "";
    if (!source) return "Resume text not available.";

    let text = source
      .replace(/\r\n/g, "\n")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/([A-Za-z])(\d)/g, "$1 $2")
      .replace(/(\d)([A-Za-z])/g, "$1 $2")
      .replace(/\s{2,}/g, " ");

    text = text
      .replace(/\s[oO]\s/g, "\n• ")
      .replace(/\n?(Work Experience|Experience|Projects|Education|Skills|Achievements|Certifications|Summary|Technical Skills)\s*/gi, "\n\n$1\n");

    return text.trim().slice(0, 4000);
  }, [profile?.resume_parsed_text, resumeData?.parsed_text]);

  const parsedPreview = useMemo(() => {
    return normalizedPreview;
  }, [normalizedPreview]);

  return (
    <RoleGuard role="recruiter">
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <main className="mx-auto max-w-5xl px-6 py-10">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Candidate Profile Overview</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Job ID: {params.id}</p>
            </div>
            <Link
              href={`/recruiter/jobs/${params.id}/candidates`}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Back to Candidates
            </Link>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading profile...</p>
          ) : null}

          {!loading && !profile ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
              Candidate profile not found.
            </div>
          ) : null}

          {!loading && profile ? (
            <div className="grid gap-6 lg:grid-cols-3">
              <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 lg:col-span-2">
                <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Candidate Summary</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Name</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{profile.candidate_name || "Unknown Candidate"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{profile.candidate_email || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Overall Score</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{profile.overall_score}/100</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Resume</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{profile.resume_filename || profile.resume_id}</p>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Score Breakdown</p>
                  <div className="space-y-2">
                    {Object.entries(profile.breakdown || {}).map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-sm">
                        <span className="text-slate-600 dark:text-slate-300">{label.replace(/_/g, " ")}</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900/60 dark:bg-green-950/30">
                    <p className="mb-2 text-sm font-semibold text-green-800 dark:text-green-300">Matched Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(profile.matched_skills || []).length > 0 ? (
                        profile.matched_skills?.map((skill) => (
                          <span key={skill} className="rounded-full bg-green-600 px-2.5 py-0.5 text-xs font-medium text-white">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-green-700 dark:text-green-300">No matched skills listed.</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
                    <p className="mb-2 text-sm font-semibold text-red-800 dark:text-red-300">Missing Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(profile.missing_skills || []).length > 0 ? (
                        profile.missing_skills?.map((skill) => (
                          <span key={skill} className="rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-medium text-white">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-red-700 dark:text-red-300">No missing skills listed.</span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Resume & Links</h2>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Resume ID</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{profile.resume_id}</p>
                  </div>

                  <button
                    onClick={openResumeData}
                    disabled={openingResumeData}
                    className="inline-flex rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {openingResumeData ? "Opening..." : "Open Resume Data Link"}
                  </button>

                  {profile.github_url ? (
                    <a href={profile.github_url} target="_blank" rel="noreferrer" className="block text-blue-600 hover:underline dark:text-blue-400">
                      GitHub Profile
                    </a>
                  ) : null}

                  {profile.portfolio_url ? (
                    <a href={profile.portfolio_url} target="_blank" rel="noreferrer" className="block text-blue-600 hover:underline dark:text-blue-400">
                      Portfolio Link
                    </a>
                  ) : null}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 lg:col-span-3">
                <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Resume Preview</h2>
                <pre className="max-h-[460px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 dark:bg-slate-800/60 p-5 text-sm leading-7 text-slate-700 dark:text-slate-200">
                  {parsedPreview}
                </pre>
              </section>
            </div>
          ) : null}
        </main>
      </div>
    </RoleGuard>
  );
}
