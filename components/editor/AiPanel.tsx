"use client";

import { useEffect, useRef, useState } from "react";
import { type Editor } from "@tiptap/react";

interface AiPanelProps {
  docId: string;
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
}

type AiAction = "summarize" | "improve" | "keypoints";

const actions: { value: AiAction; label: string; desc: string; icon: string }[] = [
  { value: "summarize", label: "Summarize",       desc: "Get a brief summary",          icon: "◈" },
  { value: "improve",   label: "Improve writing", desc: "Enhance clarity and style",    icon: "✦" },
  { value: "keypoints", label: "Key points",      desc: "Extract main ideas",           icon: "◉" },
];

export function AiPanel({ docId, editor, isOpen, onClose }: AiPanelProps) {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<AiAction>("summarize");
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  async function runAction(action: AiAction) {
    if (!editor) return;
    const content = editor.getText();
    if (!content.trim()) { setError("Document is empty."); return; }

    setActiveAction(action);
    setLoading(true);
    setError("");
    setResult("");

    const res = await fetch(`/api/documents/${docId}/ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, action }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "AI request failed");
      return;
    }
    const { result } = await res.json();
    setResult(result);
  }

  function insertResult() {
    if (!editor || !result) return;
    editor.chain().focus().insertContent(`\n\n${result}`).run();
    setResult("");
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />

      {/* Panel — full-width on mobile, fixed 320 px on sm+ */}
      <div
        ref={panelRef}
        role="complementary"
        aria-label="AI Assistant"
        className="fixed top-14 z-50 flex flex-col bg-gray-950 border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden
                   inset-x-2 max-h-[calc(100vh-5rem)]
                   sm:inset-x-auto sm:right-4 sm:w-80"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white tracking-wide uppercase">AI Assistant</span>
            <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-medium border border-purple-500/20">
              Beta
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close AI panel"
            className="text-gray-500 hover:text-gray-300 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Actions */}
        <div className="px-3 py-3 space-y-1.5 border-b border-white/8">
          {actions.map((a) => (
            <button
              key={a.value}
              onClick={() => runAction(a.value)}
              disabled={loading}
              aria-label={a.label}
              aria-pressed={activeAction === a.value && !!result}
              className="w-full text-left px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/15 disabled:opacity-40 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-purple-400 text-sm" aria-hidden="true">{a.icon}</span>
                <div>
                  <p className="text-sm font-medium text-gray-200">{a.label}</p>
                  <p className="text-xs text-gray-500">{a.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Result */}
        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          {loading && (
            <div className="flex items-center gap-2.5 px-1 py-2" role="status" aria-live="polite">
              <div className="w-3.5 h-3.5 border-2 border-purple-500/40 border-t-purple-400 rounded-full animate-spin shrink-0" aria-hidden="true" />
              <span className="text-sm text-gray-400">Thinking…</span>
            </div>
          )}

          {error && (
            <p role="alert" className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {result && (
            <div className="space-y-2">
              <div className="bg-white/5 border border-white/8 rounded-lg p-3">
                <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{result}</p>
              </div>
              <button
                onClick={insertResult}
                className="w-full py-2 text-xs font-medium text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors"
              >
                Insert into document
              </button>
            </div>
          )}

          {!loading && !result && !error && (
            <p className="text-xs text-gray-600 text-center mt-3">
              Choose an action above to get started.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
