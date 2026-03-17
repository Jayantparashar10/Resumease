"use client";

import { useEffect, useState } from "react";
import RoleGuard from "@/components/auth/RoleGuard";
import Navbar from "@/components/Navbar";
import { atsApi, ATSScore } from "@/services/api";

interface HistoryItem {
  id: string;
  resume_id: string;
  job_id: string;
  overall_score: number;
  created_at: string;
}

export default function AtsHistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedScore, setSelectedScore] = useState<ATSScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    atsApi
      .history()
      .then((res) => setHistory(res.data))
      .finally(() => setLoading(false));
  }, []);

  const loadDetails = async (scoreId: string) => {
    const res = await atsApi.get(scoreId);
    setSelectedScore(res.data);
  };

  return (
    <RoleGuard role="student">
      <div className="min-h-screen bg-zinc-50">
        <Navbar />
        <main className="mx-auto max-w-5xl px-6 py-10">
          <h1 className="mb-2 text-2xl font-bold text-zinc-900">ATS History</h1>
          <p className="mb-6 text-sm text-zinc-500">Review all your past ATS scoring runs.</p>

          {loading ? <p className="text-sm text-zinc-400">Loading history...</p> : null}
          {!loading && history.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed bg-white p-8 text-center text-sm text-zinc-500">
              No ATS scores yet. Run a score from Jobs or Resumes.
            </div>
          ) : null}

          <div className="space-y-3">
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => loadDetails(item.id)}
                className="flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-left"
              >
                <span className="text-sm text-zinc-700">{new Date(item.created_at).toLocaleString()}</span>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                  {item.overall_score}/100
                </span>
              </button>
            ))}
          </div>

          {selectedScore ? (
            <section className="mt-6 rounded-2xl border bg-white p-6">
              <h2 className="mb-3 text-lg font-semibold text-zinc-900">Score details</h2>
              <p className="mb-4 text-sm text-zinc-600">Overall: {selectedScore.overall_score}/100</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(selectedScore.breakdown).map(([key, value]) => (
                  <div key={key} className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                    {key.replaceAll("_", " ")}: {value}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </RoleGuard>
  );
}
