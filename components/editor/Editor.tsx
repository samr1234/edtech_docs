"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { clsx } from "clsx";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import TiptapLink from "@tiptap/extension-link";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { db } from "@/lib/db";
import { SyncEngine, type SyncStatus } from "@/lib/sync-engine";
import { useAppStore } from "@/store/app-store";
import { Toolbar } from "./Toolbar";
import { StatusBar } from "./StatusBar";
import { VersionHistory } from "@/components/versions/VersionHistory";
import { ShareDialog } from "./ShareDialog";
import { AiPanel } from "./AiPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import toast from "react-hot-toast";

interface EditorProps {
  docId: string;
  userRole: string;
  initialTitle: string;
  userName: string | null;
  userEmail: string | null;
}

function getInitials(name: string | null, email: string | null) {
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email ? email[0].toUpperCase() : "?";
}

export function Editor({ docId, userRole, initialTitle, userName, userEmail }: EditorProps) {
  const router = useRouter();
  const { syncStatus, setSyncStatus, pendingCount, setPendingCount } =
    useAppStore();

  const [title, setTitle] = useState(initialTitle);
  const [showVersions, setShowVersions] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  async function handleNew() {
    setIsCreating(true);
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled" }),
    });
    setIsCreating(false);
    if (res.ok) {
      const doc = await res.json();
      router.push(`/documents/${doc.id}`);
    }
  }

  const ydocRef = useRef<Y.Doc>(new Y.Doc());
  const providerRef = useRef<IndexeddbPersistence | null>(null);
  const engineRef = useRef<SyncEngine | null>(null);
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clientIdRef = useRef<string>("");

  const isReadOnly = userRole === "VIEWER";

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }),
      Collaboration.configure({ document: ydocRef.current }),
      TiptapLink.configure({
        openOnClick: true,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
    ],
    editable: !isReadOnly,
    immediatelyRender: false,
    autofocus: "end",
  });

  const updatePendingCount = useCallback(async () => {
    const count = await db.outbox
      .where("documentId")
      .equals(docId)
      .filter((item) => !item.synced)
      .count();
    setPendingCount(count);
  }, [docId, setPendingCount]);

  useEffect(() => {
    const ydoc = ydocRef.current!;

    // Persist clientId across sessions
    let clientId = sessionStorage.getItem("clientId");
    if (!clientId) {
      clientId = crypto.randomUUID();
      sessionStorage.setItem("clientId", clientId);
    }
    clientIdRef.current = clientId;

    // Ensure doc record exists in local Dexie store
    db.documents.get(docId).then((existing) => {
      if (!existing) {
        db.documents.add({
          id: docId,
          title: initialTitle,
          yjsState: new Uint8Array(),
          updatedAt: Date.now(),
        });
      }
    });

    const provider = new IndexeddbPersistence(`doc-${docId}`, ydoc);
    providerRef.current = provider;

    provider.whenSynced.then(() => {
      setIsReady(true);

      const engine = new SyncEngine(
        docId,
        ydoc,
        clientId!,
        (status: SyncStatus) => {
          setSyncStatus(status);
          updatePendingCount();
        },
        isReadOnly
      );
      engineRef.current = engine;
      engine.start();
    });

    return () => {
      engineRef.current?.stop();
      providerRef.current?.destroy();
    };
  }, [docId, initialTitle, isReadOnly, setSyncStatus, updatePendingCount]);

  useEffect(() => {
    if (!editor || !isReady) return;
    editor.commands.focus("end");
  }, [editor, isReady]);

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    titleDebounceRef.current = setTimeout(async () => {
      await fetch(`/api/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      await db.documents.update(docId, { title: newTitle });
    }, 800);
  }

  function handleDelete() {
    toast(
      (t) => (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-100">Delete this document?</span>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              await fetch(`/api/documents/${docId}`, { method: "DELETE" });
              router.push("/documents");
            }}
            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors shrink-0"
          >
            Delete
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-medium rounded transition-colors shrink-0"
          >
            Cancel
          </button>
        </div>
      ),
      {
        duration: Infinity,
        position: "top-center",
        style: {
          background: "#111827",
          color: "#f9fafb",
          border: "1px solid rgba(255,255,255,0.1)",
        },
      }
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-white dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="shrink-0 bg-gray-950 border-b border-gray-800 text-white px-3 sm:px-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 py-2 sm:h-14 sm:py-0">

        {/* Left: back + divider + title */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Link
            href="/documents"
            title="All documents"
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 text-sm"
          >
            ←
          </Link>
          <div className="w-px h-5 bg-gray-800 shrink-0" />
          {isReadOnly ? (
            <span className="text-sm font-medium text-gray-100 truncate px-2">{title}</span>
          ) : (
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              className="bg-transparent text-sm font-medium text-white placeholder-gray-600 outline-none min-w-0 flex-1 max-w-sm hover:bg-white/5 focus:bg-white/5 px-2 py-1 rounded-md transition-colors"
              placeholder="Untitled"
            />
          )}
          {isReadOnly && (
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full shrink-0">
              View only
            </span>
          )}
        </div>

        {/* Right: panel toggles | owner actions | utilities */}
        <div className="flex items-center gap-1 shrink-0">

          {/* Panel toggles */}
          <button
            onClick={() => { setShowAi((v) => !v); setShowVersions(false); }}
            aria-expanded={showAi}
            aria-controls="ai-panel"
            aria-label="AI Assistant"
            className={clsx(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              showAi
                ? "bg-purple-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/10"
            )}
          >
            AI
          </button>
          <button
            onClick={() => { setShowVersions((v) => !v); setShowAi(false); }}
            aria-expanded={showVersions}
            aria-controls="version-history"
            aria-label="Version history"
            className={clsx(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              showVersions
                ? "bg-white/15 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/10"
            )}
          >
            History
          </button>

          {/* Owner actions */}
          {userRole === "OWNER" && (
            <>
              <div className="w-px h-5 bg-gray-800 mx-1 shrink-0" aria-hidden="true" />
              <button
                onClick={() => setShowShare(true)}
                aria-label="Share document"
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                Share
              </button>
              <button
                onClick={handleDelete}
                aria-label="Delete document"
                className="px-2 py-1.5 rounded-md text-xs font-medium text-gray-600 hover:text-red-400 hover:bg-white/10 transition-colors"
              >
                Delete
              </button>
            </>
          )}

          {/* New document */}
          <div className="w-px h-5 bg-gray-800 mx-1 shrink-0" aria-hidden="true" />
          <button
            onClick={handleNew}
            disabled={isCreating}
            aria-label="Create new document"
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors"
          >
            {isCreating ? "…" : "+ New"}
          </button>

          {/* Utilities */}
          <div className="w-px h-5 bg-gray-800 mx-1 shrink-0" aria-hidden="true" />
          <ThemeToggle className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors" />
          <Link
            href="/profile"
            aria-label={`Profile — ${userName || userEmail || "Account"}`}
            className="w-8 h-8 rounded-full bg-purple-600 text-white text-xs font-semibold flex items-center justify-center hover:bg-purple-500 transition-colors shrink-0"
          >
            <span aria-hidden="true">{getInitials(userName, userEmail)}</span>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            aria-label="Sign out"
            className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-white/10 transition-colors text-sm leading-none"
          >
            <span aria-hidden="true">↩</span>
          </button>
        </div>
      </header>

      {/* Editor area — column on mobile (toolbar on top), row on md+ (toolbar as sidebar) */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        <Toolbar editor={editor} isReadOnly={isReadOnly} />

        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-950">
            <div className="px-10 py-8 h-full">
              {!isReady ? (
                <p className="text-gray-400 dark:text-gray-500 text-sm">Loading document…</p>
              ) : (
                <EditorContent
                  editor={editor}
                  className="prose prose-gray max-w-none min-h-[80vh] focus:outline-none"
                />
              )}
            </div>
          </div>

          <StatusBar syncStatus={syncStatus} pendingCount={pendingCount} />
        </div>

      </div>

      <VersionHistory
        docId={docId}
        ydoc={ydocRef.current}
        editor={editor}
        isOpen={showVersions}
        onClose={() => setShowVersions(false)}
      />
      <AiPanel
        docId={docId}
        editor={editor}
        isOpen={showAi}
        onClose={() => setShowAi(false)}
      />

      <ShareDialog
        docId={docId}
        isOpen={showShare}
        onClose={() => setShowShare(false)}
      />
    </div>
  );
}
