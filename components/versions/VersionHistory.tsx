"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import * as Y from "yjs";
import { yDocToProsemirrorJSON } from "y-prosemirror";
import { type Editor } from "@tiptap/react";
import toast from "react-hot-toast";

interface VersionRecord {
  id: string;
  label: string | null;
  createdAt: string;
  isAutoSave: boolean;
  user: { name: string | null; email: string | null };
}

interface VersionHistoryProps {
  docId: string;
  ydoc: Y.Doc;
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
}

export function VersionHistory({ docId, ydoc, editor, isOpen, onClose }: VersionHistoryProps) {
  const [versions, setVersions] = useState<VersionRecord[]>([]);
  const [labelInput, setLabelInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchVersions = useCallback(async () => {
    const res = await fetch(`/api/documents/${docId}/versions`);
    if (res.ok) setVersions(await res.json());
  }, [docId]);

  useEffect(() => {
    if (isOpen) fetchVersions();
  }, [isOpen, fetchVersions]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  async function saveVersion() {
    setIsSaving(true);
    const snapshot = Y.encodeStateAsUpdate(ydoc);
    const res = await fetch(`/api/documents/${docId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: labelInput || null, snapshot: Array.from(snapshot) }),
    });
    setIsSaving(false);
    if (res.ok) {
      setLabelInput("");
      fetchVersions();
      toast.success("Version saved");
    } else {
      toast.error("Failed to save version");
    }
  }

  async function restoreVersion(versionId: string) {
    if (!editor) return;
    const res = await fetch(`/api/documents/${docId}/versions/${versionId}/restore`, { method: "POST" });
    if (!res.ok) { toast.error("Restore failed"); return; }
    const { snapshot } = await res.json();
    const tempDoc = new Y.Doc();
    Y.applyUpdate(tempDoc, new Uint8Array(snapshot));
    const json = yDocToProsemirrorJSON(tempDoc, "default");
    editor.commands.setContent(json);
    toast.success("Version restored");
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />

      {/* Panel — full-width on mobile, fixed 288 px on sm+ */}
      <div
        ref={panelRef}
        role="complementary"
        aria-label="Version History"
        className="fixed top-14 z-50 flex flex-col bg-gray-950 border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden
                   inset-x-2 max-h-[calc(100vh-5rem)]
                   sm:inset-x-auto sm:right-4 sm:w-72"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
          <span className="text-xs font-semibold text-white tracking-wide uppercase">Version History</span>
          <button
            onClick={onClose}
            aria-label="Close version history"
            className="text-gray-500 hover:text-gray-300 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Save section */}
        <div className="px-3 py-3 border-b border-white/8 space-y-2">
          <label htmlFor="version-label" className="sr-only">Version label</label>
          <input
            id="version-label"
            type="text"
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            placeholder="Version label (optional)"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-white/25 transition-colors"
          />
          <button
            onClick={saveVersion}
            disabled={isSaving}
            aria-label="Save current version"
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            {isSaving ? "Saving…" : "Save snapshot"}
          </button>
        </div>

        {/* Version list */}
        <div className="flex-1 overflow-y-auto min-h-0" aria-label="Saved versions">
          {versions.length === 0 ? (
            <p className="px-4 py-6 text-xs text-gray-600 text-center">No saved versions yet.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {versions.map((v) => (
                <li key={v.id} className="px-4 py-3 hover:bg-white/5 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">
                        {v.label || "Unnamed version"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(v.createdAt)}</p>
                      <p className="text-xs text-gray-600 truncate">
                        {v.user.name || v.user.email || "Unknown"}
                      </p>
                    </div>
                    <button
                      onClick={() => restoreVersion(v.id)}
                      aria-label={`Restore version ${v.label || formatDate(v.createdAt)}`}
                      className="shrink-0 text-xs text-gray-300 border border-white/15 rounded-md px-2.5 py-1 hover:bg-white/10 hover:border-white/25 transition-colors"
                    >
                      Restore
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
