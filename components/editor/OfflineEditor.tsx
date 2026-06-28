"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { Editor } from "./Editor";

interface Props {
  docId: string;
  userName: string | null;
  userEmail: string | null;
}

export function OfflineEditor({ docId, userName, userEmail }: Props) {
  const [localDoc, setLocalDoc] = useState<{
    title: string;
    userRole: string;
  } | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    db.documents.get(docId).then((doc) => {
      if (doc) {
        setLocalDoc({
          title: doc.title,
          userRole: doc.userRole ?? "VIEWER",
        });
      }
      setChecked(true);
    });
  }, [docId]);

  if (!checked) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    );
  }

  if (!localDoc) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950 flex-col gap-3">
        <p className="text-white font-medium">You're offline</p>
        <p className="text-gray-400 text-sm text-center max-w-xs">
          This document hasn't been opened on this device before. Connect to the internet to load it.
        </p>
      </div>
    );
  }

  return (
    <Editor
      docId={docId}
      userRole={localDoc.userRole}
      initialTitle={localDoc.title}
      userName={userName}
      userEmail={userEmail}
    />
  );
}
