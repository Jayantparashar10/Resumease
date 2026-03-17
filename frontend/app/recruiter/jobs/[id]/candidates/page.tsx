"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import RoleGuard from "@/components/auth/RoleGuard";
import Navbar from "@/components/Navbar";
import { recruiterApi, RecruiterCandidateScore } from "@/services/api";

export default function RecruiterCandidatesPage() {
  const params = useParams<{ id: string }>();
  const [rows, setRows] = useState<RecruiterCandidateScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    recruiterApi
      .getCandidates(params.id)
      .then((res) => setRows(res.data))
      .catch(() => {
        toast.error("Candidates endpoint is not available on backend yet");
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  return (
    <RoleGuard role="recruiter">
      <div className="min-h-screen bg-zinc-50">
        <Navbar />
        <main className="mx-auto max-w-4xl px-6 py-10">
          <h1 className="mb-2 text-2xl font-bold text-zinc-900">Candidates</h1>
          <p className="mb-6 text-sm text-zinc-500">Job ID: {params.id}</p>

          {loading ? <p className="text-sm text-zinc-400">Loading candidates...</p> : null}

          {!loading && rows.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed bg-white p-10 text-center text-sm text-zinc-500">
              No candidate scores yet.
            </div>
          ) : null}

          {rows.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border bg-white">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-left text-zinc-600">
                  <tr>
                    <th className="px-4 py-3">Candidate</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-4 py-3">{row.candidate_name || row.candidate_email || row.resume_id}</td>
                      <td className="px-4 py-3">{row.overall_score}/100</td>
                      <td className="px-4 py-3">{new Date(row.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </main>
      </div>
    </RoleGuard>
  );
}
