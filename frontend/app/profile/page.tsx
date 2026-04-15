"use client";

import { FormEvent, useState } from "react";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        full_name: fullName,
        avatar_url: avatarUrl || undefined,
      });
      toast.success("Profile updated successfully");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Profile update failed";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <main className="mx-auto max-w-4xl px-6 py-10">
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-slate-50">Profile</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage your personal information and preferences
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Profile Preview Card */}
            <div className="md:col-span-1">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center">
                <div className="mb-4 flex justify-center">
                  {avatarUrl ? (
                    <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-blue-100 dark:border-blue-900/30">
                      <Image
                        src={avatarUrl}
                        alt={fullName || "Profile"}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-slate-200 dark:border-slate-700 bg-gradient-to-br from-blue-500 to-purple-600 text-3xl font-bold text-white">
                      {fullName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  )}
                </div>
                <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {fullName || "Anonymous User"}
                </h2>
                <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-950/50 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
                  <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                  {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                </div>
              </div>
            </div>

            {/* Profile Form */}
            <div className="md:col-span-2">
              <form
                onSubmit={handleSubmit}
                className="space-y-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6"
              >
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Full Name
                  </label>
                  <input
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Email Address
                  </label>
                  <input
                    disabled
                    value={user?.email || ""}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/40 px-4 py-2.5 text-sm text-slate-500 dark:text-slate-400 outline-none cursor-not-allowed"
                    placeholder="Email address"
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Email cannot be changed
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Profile Picture URL
                  </label>
                  <input
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="https://example.com/avatar.jpg (optional)"
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Enter a URL to your profile picture or leave blank for default avatar
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Member since {new Date(user?.created_at || "").toLocaleDateString()}
                  </p>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
