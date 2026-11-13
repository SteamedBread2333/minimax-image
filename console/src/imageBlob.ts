import type { GenerationParams, ImageResult } from "./types";

export function mimeFromOutputFormat(fmt: GenerationParams["output_format"]): string {
  if (fmt === "png") return "image/png";
  if (fmt === "webp") return "image/webp";
  return "image/jpeg";
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result;
      if (typeof data !== "string") {
        reject(new Error("read failed"));
        return;
      }
      const comma = data.indexOf(",");
      resolve(comma >= 0 ? data.slice(comma + 1) : data);
    };
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

export function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export type ResultDisplaySrc = {
  src: string;
  /** 为 true 时需在不用后 revokeObjectURL */
  objectUrl: boolean;
};

export function resultDisplaySrc(
  item: ImageResult,
  outputFormat: GenerationParams["output_format"]
): ResultDisplaySrc | null {
  if (item.url) {
    return { src: item.url, objectUrl: false };
  }
  if (item.b64_json) {
    const blob = base64ToBlob(item.b64_json, mimeFromOutputFormat(outputFormat));
    return { src: URL.createObjectURL(blob), objectUrl: true };
  }
  return null;
}

export function revokeResultDisplaySrcs(entries: ResultDisplaySrc[]): void {
  for (const e of entries) {
    if (e.objectUrl) URL.revokeObjectURL(e.src);
  }
}
