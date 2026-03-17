"use client";

import { Suspense } from "react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import RoleGuard from "@/components/auth/RoleGuard";
import Navbar from "@/components/Navbar";
import { resumeApi, Resume, jobApi, Job, atsApi, ATSScore, analysisApi } from "@/services/api";
import toast from "react-hot-toast";
import { Upload, Trash2, Github, ExternalLink, FileText } from "lucide-react";
import { useDropzone } from "react-dropzone";

function ResumesContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selected, setSelected] = useState<Resume | null>(null);
  const [uploading, setUploading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [scoring, setScoring] = useState(false);
  const [atsResult, setAtsResult] = useState<ATSScore | null>(null);
  const [githubData, setGithubData] = useState<Record<string, unknown> | null>(null);

  const loadResumes = useCallback(async () => {
    const res = await resumeApi.list();
    setResumes(res.data);
  }, []);

  useEffect(() => {
    if (!user) return;
    loadResumes();
    jobApi.list().then((r) => setJobs(r.data));
  }, [user, loadResumes]);

  useEffect(() => {
    if (selectedId) {
      resumeApi.get(selectedId).then((r) => setSelected(r.data));
    }
  }, [selectedId]);

  const onDrop = useCallback(
    async (files: File[]) => {
      if (!files[0]) return;
      setUploading(true);
      try {
        await resumeApi.upload(files[0]);
        toast.success("Resume uploaded and parsed!");
        await loadResumes();
      } catch {
        toast.error("Upload failed. Check file type and size.");
      } finally {
        setUploading(false);
      }
    },
    [loadResumes]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"] },
    maxFiles: 1,
  });

  const handleDelete = async (id: string) => {
    await resumeApi.delete(id);
    toast.success("Deleted");
    setResumes((prev) => prev.filter((r) => r.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const handleScore = async () => {
    if (!selected || !selectedJob) {
      toast.error("Select a resume and job");
      return;
    }
    setScoring(true);
    try {
      const res = await atsApi.score(selected.id, selectedJob);
      setAtsResult(res.data);
      toast.success("ATS score ready!");
    } catch {
      toast.error("Scoring failed");
    } finally {
      setScoring(false);
    }
  };

  const handleGithubAnalysis = async () => {
    if (!selected?.extracted_links?.github) return;
    const url = selected.extracted_links.github;
    const match = url.match(/github\.com\/([^/]+)/);
    if (!match) return;
    try {
      const res = await analysisApi.analyzeLinks(selected.id);
      setGithubData(res.data.github);
      toast.success("GitHub analyzed!");
    } catch {
      toast.error("GitHub analysis failed");
    }
  };

  if (!user) return null;

  const scoreColor = (score: number) =>
    score >= 70 ? "text-emerald-600 dark:text-emerald-400" : score >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";

  const barColor = (score: number) =>
    score >= 70 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <RoleGuard role="student">
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <main className="mx-auto max-w-6xl px-6 py-10">
          <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-slate-50">My Resumes</h1>

        {/* Upload zone */}
        <div
          {...getRootProps()}
          className={`mb-6 cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
            isDragActive
              ? "border-violet-400 dark:border-violet-500 bg-violet-50 dark:bg-violet-950/30"
              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50/50 dark:hover:bg-violet-950/20"
          }`}
        >
          <input {...getInputProps()} />
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <Upload className="h-5 w-5 text-slate-400 dark:text-slate-500" />
          </div>
          {uploading ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">Parsing resume…</p>
          ) : isDragActive ? (
            <p className="text-sm font-medium text-violet-600 dark:text-violet-400">Drop the file here</p>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Drag & drop your resume here
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">PDF or DOCX, max 5MB</p>
            </>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Resume list */}
          <div className="space-y-2">
            {resumes.length === 0 && (
              <p className="text-sm text-slate-400 dark:text-slate-500">No resumes uploaded yet.</p>
            )}
            {resumes.map((r) => (
              <div
                key={r.id}
                onClick={() => setSelected(r)}
                className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition-all ${
                  selected?.id === r.id
                    ? "border-violet-400 dark:border-violet-600 bg-violet-50 dark:bg-violet-950/40"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                    selected?.id === r.id ? "bg-violet-100 dark:bg-violet-900/50" : "bg-slate-100 dark:bg-slate-800"
                  }`}>
                    <FileText className={`h-3.5 w-3.5 ${selected?.id === r.id ? "text-violet-600 dark:text-violet-400" : "text-slate-400 dark:text-slate-500"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{r.filename}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {new Date(r.uploaded_at).toLocaleDateString()} · {r.skills.length} skills
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <h2 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">{selected.filename}</h2>

              {/* Skills */}
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Skills detected
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.skills.map((s) => (
                    <span key={s} className="rounded-full bg-violet-50 dark:bg-violet-950/50 border border-violet-100 dark:border-violet-800/50 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Links */}
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Links found
                </p>
                <div className="space-y-1.5">
                  {selected.extracted_links.github && (
                    <a
                      href={selected.extracted_links.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                    >
                      <Github className="h-3.5 w-3.5 shrink-0" />
                      {selected.extracted_links.github}
                    </a>
                  )}
                  {selected.extracted_links.linkedin && (
                    <a
                      href={selected.extracted_links.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      LinkedIn
                    </a>
                  )}
                </div>
              </div>

              {/* GitHub analysis */}
              {selected.extracted_links.github && (
                <button
                  onClick={handleGithubAnalysis}
                  className="mb-4 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Analyze GitHub Profile
                </button>
              )}

              {githubData && (
                <div className="mb-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 text-xs text-slate-600 dark:text-slate-400">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    GitHub Score: <span className="text-violet-600 dark:text-violet-400">{String(githubData.github_score ?? "—")}/100</span>
                  </p>
                  <p>📦 {String(githubData.public_repos ?? 0)} public repos · ⭐ {String(githubData.total_stars ?? 0)} stars</p>
                  <p className="mt-0.5">Languages: {Object.keys((githubData.languages as Record<string, number>) ?? {}).join(", ") || "N/A"}</p>
                </div>
              )}

              {/* ATS Score */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Score against a job
                </p>
                <select
                  value={selectedJob}
                  onChange={(e) => setSelectedJob(e.target.value)}
                  className="mb-3 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-colors"
                >
                  <option value="">Select a job posting…</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} — {j.company}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleScore}
                  disabled={scoring || !selectedJob}
                  className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 py-2 text-sm font-semibold text-white shadow-sm shadow-violet-500/20 hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {scoring ? "Scoring… (may take 30s)" : "Get ATS Score"}
                </button>

                {atsResult && (
                  <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">Overall Score</span>
                      <span className={`text-2xl font-extrabold ${scoreColor(atsResult.overall_score)}`}>
                        {atsResult.overall_score}/100
                      </span>
                    </div>
                    {/* Breakdown bars */}
                    {(Object.entries(atsResult.breakdown) as [string, number][]).map(([k, v]) => (
                      <div key={k} className="mb-2">
                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                          <span className="capitalize">{k.replace(/_/g, " ")}</span>
                          <span className="font-medium">{v}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            className={`h-1.5 rounded-full transition-all ${barColor(v)}`}
                            style={{ width: `${v}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {/* Suggestions */}
                    {atsResult.suggestions.length > 0 && (
                      <div className="mt-3 border-t border-slate-200 dark:border-slate-700 pt-3">
                        <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-400">Suggestions</p>
                        <ul className="space-y-1">
                          {atsResult.suggestions.map((s, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                              <span className="mt-0.5 text-violet-500">•</span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        </main>
      </div>
    </RoleGuard>
  );
}

export default function ResumesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <div className="p-10 text-center text-slate-400 dark:text-slate-500">Loading…</div>
      </div>
    }>
      <ResumesContent />
    </Suspense>
  );
}
