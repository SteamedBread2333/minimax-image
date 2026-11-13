import { blobToBase64, mimeFromOutputFormat } from "./imageBlob";
import {
  saveHistoryRecord,
  type HistoryRecord,
  type StoredImage,
  type StoredReference,
} from "./historyDb";

export async function fetchUrlAsBlob(url: string, fallbackMime: string): Promise<Blob | null> {
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 0) return blob;
    }
  } catch {
    /* CORS */
  }
  try {
    const res = await fetch(url, { mode: "no-cors", credentials: "omit" });
    const blob = await res.blob();
    if (blob.size > 0 && blob.type && blob.type !== "application/octet-stream") {
      return blob;
    }
    if (blob.size > 0) return new Blob([blob], { type: fallbackMime });
  } catch {
    /* ignore */
  }
  try {
    return await loadImageViaCanvas(url, fallbackMime);
  } catch {
    return null;
  }
}

function loadImageViaCanvas(url: string, mime: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob"))),
        mime.startsWith("image/") ? mime : "image/jpeg",
        0.92
      );
    };
    img.onerror = () => reject(new Error("image load"));
    img.src = url;
  });
}

export function historyHasUrlOnlyAssets(record: HistoryRecord): boolean {
  const results = record.images.some((i) => !i.blob && i.remoteUrl);
  const refs =
    record.referenceImages?.some((r) => !r.blob && (r.sourceUrl || r.remoteUrl)) ?? false;
  return results || refs;
}

export type MaterializeResult = {
  record: HistoryRecord;
  imagesOk: number;
  imagesFail: number;
  refsOk: number;
  refsFail: number;
};

async function materializeImage(img: StoredImage, fallbackMime: string): Promise<StoredImage> {
  if (img.blob || !img.remoteUrl) return img;
  const blob = await fetchUrlAsBlob(img.remoteUrl, img.mimeType || fallbackMime);
  if (!blob) return img;
  return {
    ...img,
    blob,
    mimeType: blob.type || img.mimeType || fallbackMime,
  };
}

async function materializeReference(ref: StoredReference, fallbackMime: string): Promise<StoredReference> {
  if (ref.blob) return ref;
  const url = ref.sourceUrl ?? ref.remoteUrl;
  if (!url) return ref;
  const blob = await fetchUrlAsBlob(url, fallbackMime);
  if (!blob) return ref;
  return {
    ...ref,
    blob,
  };
}

/** 将历史中仅存 URL 的条目下载为 Blob 写回 IndexedDB（与 Base64 本地保存等效） */
export async function materializeHistoryRecord(record: HistoryRecord): Promise<MaterializeResult> {
  const mime = mimeFromOutputFormat(record.params.output_format);
  let imagesOk = 0;
  let imagesFail = 0;
  const images: StoredImage[] = [];
  for (const img of record.images) {
    const next = await materializeImage(img, mime);
    if (!img.blob && img.remoteUrl) {
      if (next.blob) imagesOk++;
      else imagesFail++;
    }
    images.push(next);
  }

  let refsOk = 0;
  let refsFail = 0;
  let referenceImages = record.referenceImages;
  if (referenceImages?.length) {
    const refs: StoredReference[] = [];
    for (const ref of referenceImages) {
      const next = await materializeReference(ref, mime);
      const hadUrl = !ref.blob && (ref.sourceUrl || ref.remoteUrl);
      if (hadUrl) {
        if (next.blob) refsOk++;
        else refsFail++;
      }
      refs.push(next);
    }
    referenceImages = refs;
  }

  const updated: HistoryRecord = { ...record, images, referenceImages };
  await saveHistoryRecord(updated);
  return { record: updated, imagesOk, imagesFail, refsOk, refsFail };
}

/** 单张图转 Base64 字符串（便于导出）；需先有 blob 或可拉取的 remoteUrl */
export async function storedImageToBase64(img: StoredImage): Promise<string | null> {
  if (img.blob) return blobToBase64(img.blob);
  if (!img.remoteUrl) return null;
  const blob = await fetchUrlAsBlob(img.remoteUrl, img.mimeType || "image/jpeg");
  if (!blob) return null;
  return blobToBase64(blob);
}
