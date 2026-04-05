"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <main className="mx-auto max-w-4xl px-6 py-10">
          <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-slate-50">Candidates</h1>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">Job ID: {params.id}</p>

          {loading ? <p className="text-sm text-slate-400 dark:text-slate-500">Loading candidates...</p> : null}

          {!loading && rows.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
              No candidate scores yet.
            </div>
          ) : null}

          {rows.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-left text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Candidate</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Profile</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={`${row.score_id}-${row.resume_id}`} className="border-t border-slate-200 dark:border-slate-800">
                      <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{row.candidate_name || row.candidate_email || row.resume_filename || row.resume_id}</td>
                      <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{row.overall_score}/100</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{new Date(row.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/recruiter/jobs/${params.id}/candidates/${row.score_id}`}
                          className="inline-flex rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          View profile
                        </Link>
                      </td>
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
