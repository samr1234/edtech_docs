"use client";

import { useState, useEffect, useRef } from "react";

interface Permission {
  id: string;
  role: "EDITOR" | "VIEWER";
  user: { name: string | null; email: string | null };
  userId: string;
}

interface ShareDialogProps {
  docId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareDialog({ docId, isOpen, onClose }: ShareDialogProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) fetchPermissions();
  }, [isOpen]);

  // Focus the first focusable element when opened
  useEffect(() => {
    if (!isOpen) return;
    const el = dialogRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable[0]?.focus();
  }, [isOpen]);

  // Trap focus inside the dialog
  useEffect(() => {
    if (!isOpen) return;
    const el = dialogRef.current;
    if (!el) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      const focusable = Array.from(
        el!.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((n) => !n.hasAttribute("disabled"));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  async function fetchPermissions() {
    const res = await fetch(`/api/documents/${docId}/permissions`);
    if (res.ok) setPermissions(await res.json());
  }

  async function handleShare(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    const res = await fetch(`/api/documents/${docId}/permissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to share");
      return;
    }
    setEmail("");
    setSuccess(`Shared with ${email} as ${role}`);
    fetchPermissions();
  }

  async function handleRemove(userId: string) {
    await fetch(`/api/documents/${docId}/permissions?userId=${userId}`, { method: "DELETE" });
    fetchPermissions();
  }

  if (!isOpen) return null;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      aria-hidden="false"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-dialog-title"
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h2
            id="share-dialog-title"
            className="text-lg font-semibold text-gray-900 dark:text-gray-100"
          >
            Share document
          </h2>
          <button
            onClick={onClose}
            aria-label="Close share dialog"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleShare} className="space-y-3 mb-6">
          <div className="flex gap-2">
            <div className="flex-1">
              <label
                htmlFor="share-email"
                className="sr-only"
              >
                Email address
              </label>
              <input
                id="share-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                aria-required="true"
                aria-describedby={error ? "share-error" : undefined}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            <div>
              <label htmlFor="share-role" className="sr-only">Permission role</label>
              <select
                id="share-role"
                value={role}
                onChange={(e) => setRole(e.target.value as "EDITOR" | "VIEWER")}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="EDITOR">Editor</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </div>
          </div>

          {error && (
            <p id="share-error" role="alert" className="text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {success && (
            <p role="status" className="text-xs text-green-600 dark:text-green-400">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-50 transition-colors"
          >
            {loading ? "Sharing…" : "Share"}
          </button>
        </form>

        {permissions.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              People with access
            </p>
            <ul className="space-y-2" aria-label="People with access">
              {permissions.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {p.user.name || p.user.email}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{p.role}</p>
                  </div>
                  <button
                    onClick={() => handleRemove(p.userId)}
                    aria-label={`Remove ${p.user.name || p.user.email}`}
                    className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 shrink-0"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
