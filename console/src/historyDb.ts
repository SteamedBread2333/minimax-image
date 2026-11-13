import type { GenerationParams } from "./types";

const DB_NAME = "minimax_image_history";
const DB_VERSION = 1;
const STORE = "records";

export type StoredImage = {
  id: string;
  mimeType: string;
  size?: string;
  revised_prompt?: string;
  /** 本机缓存的二进制；若无则可能仅有 remoteUrl */
  blob?: Blob;
  /** 由 URL 代理下载后可选缓存的 Base64（与 blob 二选一或兼有） */
  b64?: string;
  remoteUrl?: string;
};

/** 编辑任务提交的参考图（顺序与 API 的 image 数组一致，对应提示词里的「图 1」「图 2」） */
export type StoredReference = {
  id: string;
  /** 从 1 开始，与上传 / URL 列表顺序一致 */
  index: number;
  fileName?: string;
  /** 用户在「图片 URL」里填写的原始链接 */
  sourceUrl?: string;
  blob?: Blob;
  /** 无法缓存二进制时保留的可访问外链 */
  remoteUrl?: string;
};

export type HistoryRecord = {
  id: string;
  createdAt: number;
  mode: "generate" | "edit";
  prompt: string;
  params: GenerationParams;
  requestBody: Record<string, unknown>;
  editMeta?: {
    referenceCount: number;
    usedMultipart: boolean;
  };
  referenceImages?: StoredReference[];
  images: StoredImage[];
  rawResponse?: string;
};

export type HistoryListItem = Omit<HistoryRecord, "images" | "rawResponse" | "referenceImages"> & {
  imageCount: number;
  referenceCount?: number;
  thumbMime?: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("无法打开本地数据库"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
  });
}

export async function saveHistoryRecord(record: HistoryRecord): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(record);
  });
  window.dispatchEvent(new CustomEvent("minimax-history-updated"));
}

export async function listHistoryRecords(limit = 50): Promise<HistoryListItem[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const index = store.index("createdAt");
    const items: HistoryListItem[] = [];
    const req = index.openCursor(null, "prev");
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor || items.length >= limit) {
        db.close();
        resolve(items);
        return;
      }
      const r = cursor.value as HistoryRecord;
      items.push({
        id: r.id,
        createdAt: r.createdAt,
        mode: r.mode,
        prompt: r.prompt,
        params: r.params,
        requestBody: r.requestBody,
        editMeta: r.editMeta,
        imageCount: r.images.length,
        referenceCount: r.referenceImages?.length,
        thumbMime: r.images[0]?.mimeType,
      });
      cursor.continue();
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getHistoryRecord(id: string): Promise<HistoryRecord | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => {
      db.close();
      resolve((req.result as HistoryRecord | undefined) ?? null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteHistoryRecord(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => {
      db.close();
      window.dispatchEvent(new CustomEvent("minimax-history-updated"));
      resolve();
    };
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).delete(id);
  });
}

export async function clearAllHistory(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => {
      db.close();
      window.dispatchEvent(new CustomEvent("minimax-history-updated"));
      resolve();
    };
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).clear();
  });
}
