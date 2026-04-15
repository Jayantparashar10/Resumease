"use client";

import { useEffect, useState } from "react";
import RoleGuard from "@/components/auth/RoleGuard";
import Navbar from "@/components/Navbar";
import { atsApi, ATSScore } from "@/services/api";
import toast from "react-hot-toast";

interface HistoryItem {
  id: string;
  resume_id: string;
  job_id: string;
  overall_score: number;
  created_at: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400";
  if (score >= 60) return "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400";
  if (score >= 40) return "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400";
  return "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent Match";
  if (score >= 60) return "Good Match";
  if (score >= 40) return "Fair Match";
  return "Needs Improvement";
}

function ScoreMetric({ label, value }: { label: string; value: number }) {
  const percentage = (value / 100) * 100;
  let barColor = "bg-blue-500";
  if (value <= 33) barColor = "bg-red-500";
  else if (value <= 66) barColor = "bg-yellow-500";
  else barColor = "bg-green-500";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{Math.round(value)}/100</p>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function AtsHistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedScore, setSelectedScore] = useState<ATSScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    atsApi
      .history()
      .then((res) => {
        setHistory(res.data);
        setError(null);
      })
      .catch((err) => {
        const errorCode = err?.response?.status;
        if (errorCode === 503) {
          setError(
            "Database service is temporarily unavailable. Please try again in a few moments. Our backend is attempting to reconnect..."
          );
        } else if (errorCode === 500) {
          setError("Server error. Please refresh the page and try again.");
        } else {
          setError("Failed to load ATS history. Please try again later.");
        }
        toast.error("Failed to load ATS history");
      })
      .finally(() => setLoading(false));
  }, []);

  const loadDetails = async (scoreId: string) => {
    setLoadingDetails(true);
    try {
      const res = await atsApi.get(scoreId);
      setSelectedScore(res.data);
    } catch {
      toast.error("Failed to load score details");
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <RoleGuard role="student">
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <main className="mx-auto max-w-6xl px-6 py-12">
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-slate-50">📈 ATS Score History</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Review detailed analysis of your resume compatibility with job postings
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-blue-600 mx-auto"></div>
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Loading your ATS scores...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-8 text-center">
              <p className="mb-3 text-lg font-semibold text-red-900 dark:text-red-400">⚠ Unable to Load History</p>
              <p className="mb-4 text-sm text-red-700 dark:text-red-400">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  atsApi
                    .history()
                    .then((res) => {
                      setHistory(res.data);
                      setError(null);
                    })
                    .catch((err) => {
                      const errorCode = err?.response?.status;
                      if (errorCode === 503) {
                        setError(
                          "Database service is temporarily unavailable. Please try again in a few moments."
                        );
                      } else {
                        setError("Failed to load ATS history. Please try again.");
                      }
                    })
                    .finally(() => setLoading(false));
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-all"
              >
                Retry
              </button>
            </div>
          ) : !loading && history.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center">
              <p className="mb-2 text-lg font-semibold text-slate-700 dark:text-slate-300">No ATS scores yet</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Run a score by going to Jobs or Resumes section to see your analysis here
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {/* History List */}
              <div className="md:col-span-1">
                <div className="space-y-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Recent Scores</p>
                  <div className="space-y-2">
                    {history.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => loadDetails(item.id)}
                        className={`w-full rounded-lg border-2 px-4 py-3 text-left transition-all ${
                          selectedScore?.id === item.id
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
                      >
                        <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">
                          {new Date(item.created_at).toLocaleDateString()}
                        </p>
                        <p className="flex items-center justify-between">
                          <span className="text-xs text-slate-600 dark:text-slate-400">Resume vs Job</span>
                          <span className={`rounded font-semibold ${getScoreColor(item.overall_score)} border px-2 py-1 text-xs`}>
                            {item.overall_score}
                          </span>
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Details Panel */}
              {selectedScore && (
                <div className="md:col-span-2 space-y-4">
                  {/* Overall Score Card */}
                  <div className={`rounded-2xl border-2 p-6 ${getScoreColor(selectedScore.overall_score)}`}>
                    <p className="mb-1 text-sm font-medium opacity-80">Overall Match Score</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">{selectedScore.overall_score}</span>
                      <span className="text-lg opacity-80">/100</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold">{getScoreLabel(selectedScore.overall_score)}</p>
                  </div>

                  {/* Breakdown Metrics */}
                  <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                    <p className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Score Breakdown</p>
                    <div className="space-y-4">
                      <ScoreMetric
                        label="Skills Match"
                        value={selectedScore.breakdown.skills_match || 0}
                      />
                      <ScoreMetric
                        label="Experience Relevance"
                        value={selectedScore.breakdown.experience_relevance || 0}
                      />
                      <ScoreMetric
                        label="Project Quality"
                        value={selectedScore.breakdown.project_quality || 0}
                      />
                      <ScoreMetric
                        label="Link Verification"
                        value={(selectedScore.breakdown.link_verification || 0) > 0 ? 100 : 0}
                      />
                    </div>
                  </div>

                  {/* Matched & Missing Skills */}
                  {(selectedScore.matched_skills.length > 0 || selectedScore.missing_skills.length > 0) && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {selectedScore.matched_skills.length > 0 && (
                        <div className="rounded-2xl border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4">
                          <p className="mb-3 text-sm font-semibold text-green-900 dark:text-green-400">Matched Skills</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedScore.matched_skills.map((skill) => (
                              <span
                                key={skill}
                                className="rounded-full bg-green-600 dark:bg-green-700 px-3 py-1 text-xs font-medium text-white"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedScore.missing_skills.length > 0 && (
                        <div className="rounded-2xl border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
                          <p className="mb-3 text-sm font-semibold text-red-900 dark:text-red-400">Missing Skills</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedScore.missing_skills.map((skill) => (
                              <span
                                key={skill}
                                className="rounded-full bg-red-600 dark:bg-red-700 px-3 py-1 text-xs font-medium text-white"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Feedback */}
                  {selectedScore.feedback && (
                    <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                      <p className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Analysis & Feedback</p>
                      <div className="space-y-4">
                        {selectedScore.feedback.strengths && (
                          <div className="border-l-4 border-green-500 bg-green-50 dark:bg-green-950/30 p-4">
                            <p className="mb-1 text-xs font-semibold uppercase text-green-900 dark:text-green-400">Strengths</p>
                            <p className="text-sm text-green-800 dark:text-green-300">{selectedScore.feedback.strengths}</p>
                          </div>
                        )}
                        {selectedScore.feedback.weaknesses && (
                          <div className="border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-950/30 p-4">
                            <p className="mb-1 text-xs font-semibold uppercase text-orange-900 dark:text-orange-400">Areas to Improve</p>
                            <p className="text-sm text-orange-800 dark:text-orange-300">{selectedScore.feedback.weaknesses}</p>
                          </div>
                        )}
                        {selectedScore.feedback.overall && (
                          <div className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/30 p-4">
                            <p className="mb-1 text-xs font-semibold uppercase text-blue-900 dark:text-blue-400">Overall Assessment</p>
                            <p className="text-sm text-blue-800 dark:text-blue-300">{selectedScore.feedback.overall}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Suggestions */}
                  {selectedScore.suggestions && selectedScore.suggestions.length > 0 && (
                    <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-6">
                      <p className="mb-4 text-sm font-semibold text-blue-900 dark:text-blue-400">Improvement Suggestions</p>
                      <ul className="space-y-2">
                        {selectedScore.suggestions.map((suggestion, idx) => (
                          <li key={idx} className="flex gap-3 text-sm text-blue-800 dark:text-blue-300">
                            <span className="font-bold text-blue-600 dark:text-blue-400">{idx + 1}.</span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </RoleGuard>
  );
}
