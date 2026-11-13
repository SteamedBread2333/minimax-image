import {
  saveHistoryRecord,
  type HistoryRecord,
  type StoredImage,
} from "./historyDb";
import { base64ToBlob, mimeFromOutputFormat, blobToBase64 } from "./imageBlob";
import { fetchUrlAsBlob } from "./historyMaterialize";
import { packReferencesForHistory, type PackReferencesInput } from "./referencePack";
import type { GenerationParams, ImageResult } from "./types";

function newId(): string {
  return crypto.randomUUID();
}

async function blobFromResult(item: ImageResult, mime: string): Promise<Blob | null> {
  if (item.b64_json) {
    return base64ToBlob(item.b64_json, mime);
  }
  if (!item.url) return null;
  return fetchUrlAsBlob(item.url, mime);
}

async function resultToStored(
  item: ImageResult,
  mime: string,
  index: number
): Promise<StoredImage | null> {
  if (!item.url && !item.b64_json) return null;

  const blob = await blobFromResult(item, mime);

  if (blob) {
    const b64 =
      item.b64_json ?? (item.url ? await blobToBase64(blob).catch(() => undefined) : undefined);
    return {
      id: `img-${index}`,
      mimeType: blob.type || mime,
      size: item.size,
      revised_prompt: item.revised_prompt,
      blob,
      ...(b64 ? { b64 } : {}),
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
  const mime = mimeFromOutputFormat(input.params.output_format);
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
