"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface ProfileClientProps {
  initialName: string;
  email: string;
}

function getInitials(name: string, email: string) {
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email ? email[0].toUpperCase() : "?";
}

export function ProfileClient({ initialName, email }: ProfileClientProps) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    setSaving(false);

    if (res.ok) {
      setMessage("Name updated successfully.");
    } else {
      const data = await res.json();
      setMessage(data.error || "Failed to update.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/documents"
            className="text-gray-300 hover:text-white text-sm transition-colors"
          >
            ← Docs
          </Link>
          <span className="text-sm font-semibold">Profile</span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle className="text-gray-300 hover:text-white transition-colors text-base leading-none" />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm text-gray-300 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center pt-16 px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm w-full max-w-md p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-full bg-purple-600 text-white text-2xl font-bold flex items-center justify-center mb-3">
              {getInitials(name, email)}
            </div>
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{name || "No name set"}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">{email}</p>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Display name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Email cannot be changed.</p>
            </div>

            {message && (
              <p className={`text-xs ${message.includes("success") ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
