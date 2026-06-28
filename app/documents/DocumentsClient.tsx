"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";

function getInitials(name: string | null | undefined, email: string | null | undefined) {
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email ? email[0].toUpperCase() : "?";
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const CARD_GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-orange-400 to-amber-500",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-sky-600",
  "from-fuchsia-500 to-purple-500",
  "from-lime-500 to-emerald-500",
];

function cardGradient(id: string) {
  const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return CARD_GRADIENTS[hash % CARD_GRADIENTS.length];
}

interface Document {
  id: string;
  title: string;
  updatedAt: string;
  owner: { name: string | null; email: string | null };
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden bg-gray-900/80 border border-white/8 animate-pulse">
      <div className="h-24 bg-gray-800" />
      <div className="p-4 space-y-2.5">
        <div className="h-4 bg-gray-800 rounded-full w-3/4" />
        <div className="h-3 bg-gray-800/70 rounded-full w-1/2" />
        <div className="h-3 bg-gray-800/70 rounded-full w-1/3" />
      </div>
    </div>
  );
}

export function DocumentsClient() {
  const router = useRouter();
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  const fetchDocuments = useCallback(async () => {
    const res = await fetch("/api/documents");
    if (res.ok) setDocuments(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  async function createDocument() {
    setCreating(true);
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled" }),
    });
    if (res.ok) {
      const doc = await res.json();
      router.push(`/documents/${doc.id}`);
    }
    setCreating(false);
  }

  const filtered = useMemo(() =>
    documents.filter((d) =>
      d.title.toLowerCase().includes(search.toLowerCase())
    ),
    [documents, search]
  );

  const userName = session?.user?.name?.split(" ")[0] || session?.user?.email?.split("@")[0] || "";
  const userEmail = session?.user?.email;

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{
        backgroundColor: "#030712",
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
        `,
        backgroundSize: "72px 72px",
      }}
    >
      {/* Emerald glow from top */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 100% 40% at 50% 0%, rgba(16,185,129,0.12), transparent)",
        }}
      />


      {/* Navbar */}
      <header className="sticky top-0 z-30 bg-gray-950/90 backdrop-blur border-b border-white/8 text-white px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="5" height="5" rx="1" fill="white" />
              <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity=".6" />
              <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity=".6" />
              <rect x="8" y="8" width="5" height="5" rx="1" fill="white" fillOpacity=".3" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight">DocSync</span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors" />
          <Link
            href="/profile"
            aria-label={`Profile — ${session?.user?.name || userEmail || "Account"}`}
            className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center justify-center transition-colors"
          >
            <span aria-hidden="true">{getInitials(session?.user?.name, userEmail)}</span>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            aria-label="Sign out"
            className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10">

        {/* Hero row */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {getGreeting()}{userName ? `, ${userName}` : ""}.
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {loading
                ? "Loading your workspace…"
                : documents.length === 0
                ? "No documents yet — create your first one."
                : `${documents.length} document${documents.length !== 1 ? "s" : ""} in your workspace`}
            </p>
          </div>

          {!loading && documents.length > 0 && (
            <button
              onClick={createDocument}
              disabled={creating}
              aria-label="Create new document"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors shrink-0 shadow-lg shadow-emerald-900/20"
            >
              <span aria-hidden="true" className="text-lg leading-none">+</span>
              {creating ? "Creating…" : "New Document"}
            </button>
          )}
        </div>

        {/* Search */}
        {!loading && documents.length > 0 && (
          <div role="search" className="mb-6">
            <label htmlFor="doc-search" className="sr-only">Search documents</label>
            <div className="relative max-w-sm">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none"
                fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                id="doc-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-700 bg-gray-800/60 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && documents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-300 mb-1">No documents yet</h2>
            <p className="text-sm text-gray-500 mb-6">Create your first document to get started.</p>
            <button
              onClick={createDocument}
              disabled={creating}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {creating ? "Creating…" : "Create document"}
            </button>
          </div>
        )}

        {/* No search results */}
        {!loading && documents.length > 0 && filtered.length === 0 && (
          <div className="text-center py-16 text-gray-500 text-sm">
            No documents match &quot;{search}&quot;
          </div>
        )}

        {/* Document grid */}
        {!loading && filtered.length > 0 && (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            aria-label="Documents"
          >
            {filtered.map((doc) => {
              const isShared = doc.owner.email !== userEmail;
              return (
                <button
                  key={doc.id}
                  onClick={() => router.push(`/documents/${doc.id}`)}
                  aria-label={`Open ${doc.title || "Untitled"}`}
                  className="group text-left rounded-2xl overflow-hidden bg-gray-900/80 border border-white/8 hover:border-white/15 shadow-sm hover:shadow-xl hover:shadow-black/30 backdrop-blur-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  {/* Colour strip */}
                  <div className={`h-24 bg-linear-to-br ${cardGradient(doc.id)} relative overflow-hidden`}>
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,white,transparent)]" />
                    <div className="absolute bottom-3 left-4">
                      <svg className="w-8 h-8 text-white/70" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" />
                        <path d="M14 2v6h6" />
                      </svg>
                    </div>
                    {isShared && (
                      <span className="absolute top-2.5 right-2.5 text-[10px] font-semibold bg-black/30 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                        Shared
                      </span>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="p-4">
                    <p className="font-semibold text-gray-100 truncate text-sm group-hover:text-emerald-400 transition-colors">
                      {doc.title || "Untitled"}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {isShared
                        ? `by ${doc.owner.name || doc.owner.email || "Unknown"}`
                        : "My document"}
                    </p>
                    <p className="text-xs text-gray-600 mt-2">
                      {timeAgo(doc.updatedAt)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
      <div className="relative z-10"><Footer /></div>
    </div>
  );
}
