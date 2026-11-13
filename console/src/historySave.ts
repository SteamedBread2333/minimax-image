import {
  saveHistoryRecord,
  type HistoryRecord,
  type StoredImage,
} from "./historyDb";
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
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`下载图片失败 (${res.status})`);
  return await res.blob();
}

async function resultToStored(
  item: ImageResult,
  mime: string,
  index: number
): Promise<StoredImage | null> {
  try {
    let blob: Blob;
    if (item.b64_json) {
      blob = base64ToBlob(item.b64_json, mime);
    } else if (item.url) {
      blob = await fetchRemoteImage(item.url);
    } else {
      return null;
    }
    return {
      id: `img-${index}`,
      mimeType: blob.type || mime,
      size: item.size,
      revised_prompt: item.revised_prompt,
      blob,
    };
  } catch {
    if (item.url) {
      return null;
    }
    return null;
  }
}

export type SaveHistoryInput = {
  mode: "generate" | "edit";
  params: GenerationParams;
  requestBody: Record<string, unknown>;
  results: ImageResult[];
  editMeta?: HistoryRecord["editMeta"];
  rawResponse?: string;
};

export async function persistGeneration(input: SaveHistoryInput): Promise<number> {
  const mime = mimeFromFormat(input.params.output_format);
  const images: StoredImage[] = [];
  for (let i = 0; i < input.results.length; i++) {
    const stored = await resultToStored(input.results[i], mime, i);
    if (stored) images.push(stored);
  }
  if (!images.length) return 0;

  const record: HistoryRecord = {
    id: newId(),
    createdAt: Date.now(),
    mode: input.mode,
    prompt: input.params.prompt,
    params: { ...input.params },
    requestBody: input.requestBody,
    editMeta: input.editMeta,
    images,
    rawResponse: input.rawResponse,
  };
  await saveHistoryRecord(record);
  return images.length;
}

export function blobToObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}
