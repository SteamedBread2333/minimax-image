import { blobToBase64, mimeFromOutputFormat } from "./imageBlob";
import {
  saveHistoryRecord,
  type HistoryRecord,
  type StoredImage,
  type StoredReference,
} from "./historyDb";

async function blobFromResponse(res: Response, fallbackMime: string): Promise<Blob | null> {
  if (!res.ok) return null;
  const blob = await res.blob();
  if (blob.size === 0) return null;
  if (!blob.type || blob.type === "application/octet-stream") {
    return new Blob([blob], { type: fallbackMime });
  }
  return blob;
}

/** 仅对带 CORS 的外链有效；MiniMax OSS 签名链在纯前端下一般会失败 */
export async function fetchUrlAsBlob(url: string, fallbackMime: string): Promise<Blob | null> {
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    const blob = await blobFromResponse(res, fallbackMime);
    if (blob) return blob;
  } catch {
    /* CORS */
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

export type ImportFilesResult = {
  record: HistoryRecord;
  imagesImported: number;
  refsImported: number;
};

/**
 * 纯前端落库：用户先在浏览器「另存为」外链图，再从此处选文件写入 Blob + Base64。
 * 按顺序填充尚未有 blob 的结果图 / 参考图。
 */
export async function importFilesIntoHistory(
  record: HistoryRecord,
  files: File[]
): Promise<ImportFilesResult> {
  if (!files.length) {
    return { record, imagesImported: 0, refsImported: 0 };
  }
  const mime = mimeFromOutputFormat(record.params.output_format);
  let fileIdx = 0;
  let imagesImported = 0;
  let refsImported = 0;

  const images: StoredImage[] = [];
  for (const img of record.images) {
    if (img.blob || fileIdx >= files.length) {
      images.push(img);
      continue;
    }
    const f = files[fileIdx++];
    const b64 = await blobToBase64(f);
    images.push({
      ...img,
      blob: f,
      b64,
      mimeType: f.type || img.mimeType || mime,
    });
    imagesImported++;
  }

  let referenceImages = record.referenceImages;
  if (referenceImages?.length) {
    const refs: StoredReference[] = [];
    for (const ref of referenceImages) {
      if (ref.blob || fileIdx >= files.length) {
        refs.push(ref);
        continue;
      }
      const f = files[fileIdx++];
      refs.push({ ...ref, blob: f });
      refsImported++;
    }
    referenceImages = refs;
  }

  const updated: HistoryRecord = { ...record, images, referenceImages };
  await saveHistoryRecord(updated);
  return { record: updated, imagesImported, refsImported };
}

/** 单张图转 Base64；需已有 blob */
export async function storedImageToBase64(img: StoredImage): Promise<string | null> {
  if (img.b64) return img.b64;
  if (img.blob) return blobToBase64(img.blob);
  return null;
}
