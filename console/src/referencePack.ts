import type { StoredReference } from "./historyDb";

function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function dataUriToBlob(dataUri: string): Blob | null {
  const m = dataUri.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!m) return null;
  return base64ToBlob(m[2], m[1]);
}

async function fetchRemoteImage(url: string): Promise<Blob | null> {
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
    if (blob.size > 0) return blob;
  } catch {
    /* ignore */
  }
  return null;
}

function isHttpUrl(u: string): boolean {
  return /^https?:\/\//i.test(u);
}

export type PackReferencesInput = {
  files: File[];
  /** JSON / data-uri 模式时实际提交的 URL 或 data URI 列表；multipart 时可为空 */
  submittedUrls: string[];
  usedMultipart: boolean;
};

/** 将本次编辑的参考图打成可写入 IndexedDB 的结构 */
export async function packReferencesForHistory(
  input: PackReferencesInput
): Promise<StoredReference[]> {
  const { files, submittedUrls, usedMultipart } = input;
  const refs: StoredReference[] = [];

  if (usedMultipart) {
    for (let i = 0; i < files.length; i++) {
      refs.push({
        id: `ref-${i}`,
        index: i + 1,
        fileName: files[i].name,
        blob: files[i],
      });
    }
    return refs;
  }

  for (let i = 0; i < submittedUrls.length; i++) {
    const u = submittedUrls[i];
    const ref: StoredReference = {
      id: `ref-${i}`,
      index: i + 1,
      fileName: i < files.length ? files[i].name : undefined,
    };

    if (u.startsWith("data:")) {
      const blob = dataUriToBlob(u);
      if (blob) ref.blob = blob;
    } else if (isHttpUrl(u)) {
      ref.sourceUrl = u;
      const blob = await fetchRemoteImage(u);
      if (blob) ref.blob = blob;
      else ref.remoteUrl = u;
    }

    refs.push(ref);
  }

  return refs;
}

export function storedReferenceSrc(ref: StoredReference): string | undefined {
  if (ref.blob) return URL.createObjectURL(ref.blob);
  return ref.sourceUrl ?? ref.remoteUrl;
}
