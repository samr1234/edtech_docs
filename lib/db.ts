import Dexie, { type Table } from "dexie";

export interface LocalDocument {
  id: string;
  title: string;
  yjsState: Uint8Array;
  updatedAt: number;
  userRole?: string;
}

export interface OutboxItem {
  id?: number;
  documentId: string;
  update: Uint8Array;
  clientId: string;
  timestamp: number;
  synced: boolean;
}

export interface SyncState {
  documentId: string;
  lastServerVersion: number;
  lastSyncedAt: number;
}

export interface LocalVersion {
  id: string;
  documentId: string;
  label: string;
  snapshot: Uint8Array;
  createdAt: number;
}

export class EditorDB extends Dexie {
  documents!: Table<LocalDocument>;
  outbox!: Table<OutboxItem>;
  syncState!: Table<SyncState>;
  localVersions!: Table<LocalVersion>;

  constructor() {
    super("edtech-editor");
    this.version(1).stores({
      documents: "id, updatedAt",
      outbox: "++id, documentId, synced, timestamp",
      syncState: "documentId",
      localVersions: "id, documentId",
    });
  }
}

export const db = new EditorDB();
