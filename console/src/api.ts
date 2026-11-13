import {
  getApiBase,
  loadClientSettings,
  minimaxHeaders,
  regionHintFromSettings,
  REGION_BASE,
} from "./clientSettings";
import { formatApiError } from "./formatApiError";
import type { ApiResponse, GenerationParams, EditParams } from "./types";

const REQUEST_MS = 620_000;

function buildGenerationBody(p: GenerationParams): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: p.model,
    prompt: p.prompt,
    n: p.n,
    output_format: p.output_format,
    response_format: p.response_format,
    stream: p.stream,
    output_compression: p.output_compression,
  };

  if (p.disable_prompt_enhanced) {
    body.disable_prompt_enhanced = true;
  }

  const customSize = p.size.trim() && p.size.trim() !== "auto";
  if (customSize) {
    body.size = p.size.trim();
  } else {
    body.size = "auto";
    if (p.aspect_ratio && p.aspect_ratio !== "auto") {
      body.aspect_ratio = p.aspect_ratio;
    }
    body.area = p.area;
  }

  return body;
}

function buildEditBody(p: EditParams): Record<string, unknown> {
  const base = buildGenerationBody({
    ...p,
    disable_prompt_enhanced: false,
  });
  delete base.disable_prompt_enhanced;
  base.images = p.imageUrls
    .map((u) => u.trim())
    .filter(Boolean)
    .map((image_url) => ({ image_url }));
  return base;
}

export type StreamHandlers = {
  onImage: (item: { url?: string; image_index?: number; revised_prompt?: string; size?: string }) => void;
  onDone: (payload: Record<string, unknown>) => void;
  onError: (message: string) => void;
};

async function minimaxFetch(
  path: string,
  init: RequestInit & { stream?: boolean }
): Promise<Response> {
  const base = getApiBase();
  const isForm = init.body instanceof FormData;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_MS);
  const headers: Record<string, string> = {
    ...(minimaxHeaders({
      json: !isForm,
      stream: init.stream,
    }) as Record<string, string>),
  };
  try {
    return await fetch(`${base}${path}`, {
      ...init,
      signal: controller.signal,
      headers,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function consumeSse(res: Response, handlers: StreamHandlers) {
  if (!res.ok) {
    const text = await res.text();
    try {
      const j = JSON.parse(text) as ApiResponse;
      handlers.onError(formatApiError(j.error?.message || text || `HTTP ${res.status}`));
    } catch {
      handlers.onError(text || `HTTP ${res.status}`);
    }
    return;
  }
  const reader = res.body?.getReader();
  if (!reader) {
    handlers.onError("No response body");
    return;
  }
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const block of parts) {
      const line = block.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      const raw = line.slice(5).trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        const ev = JSON.parse(raw) as Record<string, unknown>;
        const t = ev.type as string | undefined;
        if (t?.includes("partial_succeeded") && typeof ev.url === "string") {
          handlers.onImage({
            url: ev.url,
            image_index: ev.image_index as number | undefined,
            revised_prompt: ev.revised_prompt as string | undefined,
            size: ev.size as string | undefined,
          });
        } else if (t?.includes("completed")) {
          handlers.onDone(ev);
        } else if (t === "error") {
          const err = ev.error as { message?: string } | undefined;
          handlers.onError(formatApiError(err?.message || "Stream error"));
        }
      } catch {
        /* ignore partial JSON */
      }
    }
  }
}

export async function generateImages(
  p: GenerationParams,
  streamHandlers?: StreamHandlers
): Promise<ApiResponse | null> {
  const res = await minimaxFetch("/v1/images/generations", {
    method: "POST",
    body: JSON.stringify(buildGenerationBody(p)),
    stream: p.stream,
  });
  if (p.stream && streamHandlers) {
    await consumeSse(res, streamHandlers);
    return null;
  }
  return (await res.json()) as ApiResponse;
}

export async function editImagesJson(
  p: EditParams,
  streamHandlers?: StreamHandlers
): Promise<ApiResponse | null> {
  const res = await minimaxFetch("/v1/images/edits", {
    method: "POST",
    body: JSON.stringify(buildEditBody(p)),
    stream: p.stream,
  });
  if (p.stream && streamHandlers) {
    await consumeSse(res, streamHandlers);
    return null;
  }
  return (await res.json()) as ApiResponse;
}

export async function editImagesUpload(p: EditParams, files: File[]): Promise<ApiResponse> {
  const form = new FormData();
  form.append("model", p.model);
  form.append("prompt", p.prompt);
  form.append("n", String(p.n));
  form.append("output_format", p.output_format);
  form.append("response_format", p.response_format);
  form.append("stream", String(p.stream));
  form.append("output_compression", String(p.output_compression));

  const customSize = p.size.trim() && p.size.trim() !== "auto";
  if (customSize) {
    form.append("size", p.size.trim());
  } else {
    form.append("size", "auto");
    if (p.aspect_ratio && p.aspect_ratio !== "auto") {
      form.append("aspect_ratio", p.aspect_ratio);
    }
    form.append("area", p.area);
  }

  for (const file of files) {
    form.append("image[]", file);
  }

  const res = await minimaxFetch("/v1/images/edits", { method: "POST", body: form });
  return (await res.json()) as ApiResponse;
}

export function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export type HealthInfo = {
  ok?: boolean;
  apiBase?: string;
  regionHint?: "global" | "china" | "custom";
  keySource?: "client" | "none";
};

export async function checkHealth(): Promise<HealthInfo> {
  const s = loadClientSettings();
  if (!s) {
    return { ok: false, keySource: "none" };
  }
  return {
    ok: true,
    apiBase: REGION_BASE[s.region],
    regionHint: regionHintFromSettings(),
    keySource: "client",
  };
}

export { buildGenerationBody, buildEditBody };
