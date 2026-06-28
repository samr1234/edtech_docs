import * as Y from "yjs";
import { db } from "./db";
import toast from "react-hot-toast";

export type SyncStatus =
  | "synced"
  | "syncing"
  | "offline"
  | "error"
  | "reconnecting"
  | "idle";

export class SyncEngine {
  private docId: string;
  private ydoc: Y.Doc;
  private clientId: string;
  private readOnly: boolean;
  private interval: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;
  private onStatusChange: (status: SyncStatus) => void;

  constructor(
    docId: string,
    ydoc: Y.Doc,
    clientId: string,
    onStatusChange: (s: SyncStatus) => void,
    readOnly = false
  ) {
    this.docId = docId;
    this.ydoc = ydoc;
    this.clientId = clientId;
    this.readOnly = readOnly;
    this.onStatusChange = onStatusChange;
  }

  start() {
    this.ydoc.on("update", this.handleUpdate);
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
    this.interval = setInterval(this.trySync, 5000);
    if (navigator.onLine) this.trySync();
    else this.onStatusChange("offline");
  }

  stop() {
    this.ydoc.off("update", this.handleUpdate);
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
    if (this.interval) clearInterval(this.interval);
  }

  private handleUpdate = async (update: Uint8Array, origin: unknown) => {
    if (origin === "remote" || origin === "restore") return;
    if (this.readOnly) return;
    await db.outbox.add({
      documentId: this.docId,
      update,
      clientId: this.clientId,
      timestamp: Date.now(),
      synced: false,
    });
    const state = Y.encodeStateAsUpdate(this.ydoc);
    await db.documents.update(this.docId, {
      yjsState: state,
      updatedAt: Date.now(),
    });
  };

  private handleOnline = () => {
    this.onStatusChange("reconnecting");
    this.trySync();
  };

  private handleOffline = () => {
    this.onStatusChange("offline");
  };

  trySync = async () => {
    if (!navigator.onLine || this.isSyncing) return;

    const allOutbox = await db.outbox
      .where("documentId")
      .equals(this.docId)
      .toArray();
    const pending = allOutbox.filter((item) => !item.synced);

    this.isSyncing = true;
    this.onStatusChange("syncing");
    let hasError = false;
    try {
      if (!this.readOnly && pending.length > 0) {
        try {
          await this.push(pending);
        } catch (err) {
          hasError = true;
          const message = err instanceof Error ? err.message : "Push failed";
          toast.error(message, { id: "sync-error", duration: 4000 });
        }
      }
      await this.pull();
      await this.cleanOutbox();
      this.onStatusChange(hasError ? "error" : "synced");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync failed";
      toast.error(message, { id: "sync-error", duration: 4000 });
      this.onStatusChange("error");
    } finally {
      this.isSyncing = false;
    }
  };

  private push = async (
    pending: Array<{
      id?: number;
      update: Uint8Array;
      clientId: string;
      timestamp: number;
    }>
  ) => {
    const updates = pending.map((p) => ({
      id: p.id,
      update: Array.from(p.update),
      clientId: p.clientId,
      timestamp: p.timestamp,
    }));
    const res = await fetch(`/api/documents/${this.docId}/sync/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
    if (!res.ok) throw new Error(`Push failed: ${res.status}`);
    const { acknowledgedIds } = await res.json();
    for (const id of acknowledgedIds) {
      await db.outbox.update(id, { synced: true });
    }
  };

  private pull = async () => {
    const syncState = await db.syncState.get(this.docId);
    const since = syncState?.lastServerVersion ?? 0;
    const res = await fetch(
      `/api/documents/${this.docId}/sync/pull?since=${since}`,
      { headers: { "x-client-id": this.clientId } }
    );
    if (!res.ok) throw new Error(`Pull failed: ${res.status}`);
    const { updates, serverVersion } = await res.json();
    for (const u of updates) {
      Y.applyUpdate(this.ydoc, new Uint8Array(u.update), "remote");
    }
    await db.syncState.put({
      documentId: this.docId,
      lastServerVersion: serverVersion,
      lastSyncedAt: Date.now(),
    });
  };

  // Remove acknowledged outbox items to keep IndexedDB lean
  private cleanOutbox = async () => {
    const synced = await db.outbox
      .where("documentId")
      .equals(this.docId)
      .filter((item) => item.synced)
      .toArray();
    const ids = synced.map((item) => item.id).filter((id): id is number => id != null);
    if (ids.length > 0) await db.outbox.bulkDelete(ids);
  };
}
