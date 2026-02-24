"use client";

import { Suspense } from "react";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { resumeApi, Resume, jobApi, Job, atsApi, ATSScore, analysisApi } from "@/services/api";
import toast from "react-hot-toast";
import { Upload, Trash2, Github, ExternalLink } from "lucide-react";
import { useDropzone } from "react-dropzone";

function ResumesContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
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

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

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

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="mb-6 text-2xl font-bold text-zinc-900">My Resumes</h1>

        {/* Upload zone */}
        <div
          {...getRootProps()}
          className={`mb-6 cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
            isDragActive ? "border-indigo-400 bg-indigo-50" : "border-zinc-300 bg-white hover:border-indigo-300"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
          {uploading ? (
            <p className="text-sm text-zinc-600">Parsing resume…</p>
          ) : isDragActive ? (
            <p className="text-sm text-indigo-600">Drop the file here</p>
          ) : (
            <>
              <p className="text-sm font-medium text-zinc-700">
                Drag & drop your resume here
              </p>
              <p className="text-xs text-zinc-400 mt-1">PDF or DOCX, max 5MB</p>
            </>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Resume list */}
          <div className="space-y-2">
            {resumes.length === 0 && (
              <p className="text-sm text-zinc-400">No resumes uploaded yet.</p>
            )}
            {resumes.map((r) => (
              <div
                key={r.id}
                onClick={() => setSelected(r)}
                className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
                  selected?.id === r.id
                    ? "border-indigo-400 bg-indigo-50"
                    : "bg-white hover:bg-zinc-50"
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-zinc-800">{r.filename}</p>
                  <p className="text-xs text-zinc-400">
                    {new Date(r.uploaded_at).toLocaleDateString()} · {r.skills.length} skills
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="rounded-2xl border bg-white p-6">
              <h2 className="mb-3 font-semibold text-zinc-900">{selected.filename}</h2>

              {/* Skills */}
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase text-zinc-400 tracking-wider">Skills detected</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.skills.map((s) => (
                    <span key={s} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Links */}
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase text-zinc-400 tracking-wider">Links found</p>
                <div className="space-y-1">
                  {selected.extracted_links.github && (
                    <a
                      href={selected.extracted_links.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-zinc-600 hover:text-indigo-600"
                    >
                      <Github className="h-3.5 w-3.5" />
                      {selected.extracted_links.github}
                    </a>
                  )}
                  {selected.extracted_links.linkedin && (
                    <a
                      href={selected.extracted_links.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-zinc-600 hover:text-indigo-600"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      LinkedIn
                    </a>
                  )}
                </div>
              </div>

              {/* GitHub analysis */}
              {selected.extracted_links.github && (
                <button
                  onClick={handleGithubAnalysis}
                  className="mb-4 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Analyze GitHub Profile
                </button>
              )}

              {githubData && (
                <div className="mb-4 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-600">
                  <p className="font-semibold text-zinc-800 mb-1">GitHub Score: {String(githubData.github_score ?? "—")}/100</p>
                  <p>📦 {String(githubData.public_repos ?? 0)} public repos · ⭐ {String(githubData.total_stars ?? 0)} stars</p>
                  <p>Languages: {Object.keys((githubData.languages as Record<string,number>) ?? {}).join(", ") || "N/A"}</p>
                </div>
              )}

              {/* ATS Score */}
              <div className="border-t pt-4">
                <p className="mb-2 text-xs font-semibold uppercase text-zinc-400 tracking-wider">Score against a job</p>
                <select
                  value={selectedJob}
                  onChange={(e) => setSelectedJob(e.target.value)}
                  className="mb-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
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
                  className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {scoring ? "Scoring… (may take 30s)" : "Get ATS Score"}
                </button>

                {atsResult && (
                  <div className="mt-4 rounded-xl bg-zinc-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-semibold text-zinc-900">Overall Score</span>
                      <span
                        className={`text-2xl font-extrabold ${
                          atsResult.overall_score >= 70
                            ? "text-green-600"
                            : atsResult.overall_score >= 50
                            ? "text-amber-600"
                            : "text-red-600"
                        }`}
                      >
                        {atsResult.overall_score}/100
                      </span>
                    </div>
                    {/* Breakdown bars */}
                    {(Object.entries(atsResult.breakdown) as [string, number][]).map(([k, v]) => (
                      <div key={k} className="mb-1.5">
                        <div className="flex justify-between text-xs text-zinc-500 mb-0.5">
                          <span className="capitalize">{k.replace(/_/g, " ")}</span>
                          <span>{v}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-zinc-200">
                          <div
                            className="h-1.5 rounded-full bg-indigo-500"
                            style={{ width: `${v}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {/* Suggestions */}
                    {atsResult.suggestions.length > 0 && (
                      <div className="mt-3 border-t pt-3">
                        <p className="mb-1 text-xs font-semibold text-zinc-600">Suggestions</p>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {atsResult.suggestions.map((s, i) => (
                            <li key={i} className="text-xs text-zinc-600">{s}</li>
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
  );
}
export default function ResumesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-50"><Navbar /><div className="p-10 text-center text-zinc-400">Loading…</div></div>}>
      <ResumesContent />
    </Suspense>
  );
}