import {
  saveHistoryRecord,
  type HistoryRecord,
  type StoredImage,
} from "./historyDb";
import { packReferencesForHistory, type PackReferencesInput } from "./referencePack";
import type { GenerationParams, ImageResult } from "./types";

function newId(): string {
  return crypto.randomUUID();
}

function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function mimeFromFormat(fmt: GenerationParams["output_format"]): string {
  if (fmt === "png") return "image/png";
  if (fmt === "webp") return "image/webp";
  return "image/jpeg";
}

async function fetchRemoteImage(url: string): Promise<Blob> {
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 0) return blob;
    }
  } catch {
    /* CORS 失败时继续 */
  }
  // 不透明响应仍可存 IndexedDB，并用 blob: URL 在本页展示
  const res = await fetch(url, { mode: "no-cors", credentials: "omit" });
  const blob = await res.blob();
  if (blob.size > 0) return blob;
  throw new Error("empty blob");
}

function loadImageViaCanvas(url: string): Promise<Blob> {
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
        "image/jpeg",
        0.92
      );
    };
    img.onerror = () => reject(new Error("image load"));
    img.src = url;
  });
}

async function blobFromResult(item: ImageResult, mime: string): Promise<Blob | null> {
  if (item.b64_json) {
    return base64ToBlob(item.b64_json, mime);
  }
  if (!item.url) return null;

  try {
    return await fetchRemoteImage(item.url);
  } catch {
    /* continue */
  }
  try {
    return await loadImageViaCanvas(item.url);
  } catch {
    return null;
  }
}

async function resultToStored(
  item: ImageResult,
  mime: string,
  index: number
): Promise<StoredImage | null> {
  if (!item.url && !item.b64_json) return null;

  const blob = await blobFromResult(item, mime);

  if (blob) {
    return {
      id: `img-${index}`,
      mimeType: blob.type || mime,
      size: item.size,
      revised_prompt: item.revised_prompt,
      blob,
    };
  }

  if (item.url) {
    return {
      id: `img-${index}`,
      mimeType: mime,
      size: item.size,
      revised_prompt: item.revised_prompt,
      remoteUrl: item.url,
    };
  }

  return null;
}

export type SaveHistoryInput = {
  mode: "generate" | "edit";
  params: GenerationParams;
  requestBody: Record<string, unknown>;
  results: ImageResult[];
  editMeta?: HistoryRecord["editMeta"];
  referencePack?: PackReferencesInput;
  rawResponse?: string;
};

export type PersistResult = {
  saved: number;
  total: number;
  blobCount: number;
  urlOnlyCount: number;
};

export async function persistGeneration(input: SaveHistoryInput): Promise<PersistResult> {
  const mime = mimeFromFormat(input.params.output_format);
  const images: StoredImage[] = [];
  let blobCount = 0;
  let urlOnlyCount = 0;

  for (let i = 0; i < input.results.length; i++) {
    const stored = await resultToStored(input.results[i], mime, i);
    if (!stored) continue;
    images.push(stored);
    if (stored.blob) blobCount++;
    else urlOnlyCount++;
  }

  if (!images.length) {
    return { saved: 0, total: input.results.length, blobCount: 0, urlOnlyCount: 0 };
  }

  let referenceImages: HistoryRecord["referenceImages"];
  if (input.mode === "edit" && input.referencePack) {
    referenceImages = await packReferencesForHistory(input.referencePack);
  }

  const record: HistoryRecord = {
    id: newId(),
    createdAt: Date.now(),
    mode: input.mode,
    prompt: input.params.prompt,
    params: { ...input.params },
    requestBody: input.requestBody,
    editMeta: input.editMeta,
    referenceImages,
    images,
    rawResponse: input.rawResponse,
  };
  await saveHistoryRecord(record);
  return { saved: images.length, total: input.results.length, blobCount, urlOnlyCount };
}

export function storedImageSrc(img: StoredImage): string | undefined {
  if (img.blob) return blobToObjectUrl(img.blob);
  return img.remoteUrl;
}

export function blobToObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}
