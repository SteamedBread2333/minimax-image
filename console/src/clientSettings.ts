const STORAGE_KEY = "minimax_client_settings_v1";

export type ApiRegion = "china" | "global";

export type ClientSettings = {
  apiKey: string;
  region: ApiRegion;
};

export const REGION_BASE: Record<ApiRegion, string> = {
  china: "https://api.minimaxi.com",
  global: "https://api.minimax.io",
};

export function loadClientSettings(): ClientSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClientSettings;
    if (!parsed.apiKey?.trim()) return null;
    if (parsed.region !== "china" && parsed.region !== "global") {
      parsed.region = "china";
    }
    return { apiKey: parsed.apiKey.trim(), region: parsed.region };
  } catch {
    return null;
  }
}

export function saveClientSettings(settings: ClientSettings): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      apiKey: settings.apiKey.trim(),
      region: settings.region,
    })
  );
  window.dispatchEvent(new CustomEvent("minimax-settings-changed"));
}

export function clearClientSettings(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("minimax-settings-changed"));
}

export function maskApiKey(key: string): string {
  if (key.length <= 12) return "••••••••";
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

export function requireClientSettings(): ClientSettings {
  const s = loadClientSettings();
  if (!s) {
    throw new Error("请先在「API 连接」中配置并保存 Key");
  }
  return s;
}

export function getApiBase(): string {
  return REGION_BASE[requireClientSettings().region];
}

export function minimaxHeaders(opts?: { json?: boolean; stream?: boolean }): HeadersInit {
  const s = requireClientSettings();
  const h: Record<string, string> = {
    Authorization: `Bearer ${s.apiKey}`,
  };
  if (opts?.json) h["Content-Type"] = "application/json";
  if (opts?.stream) h.Accept = "text/event-stream";
  return h;
}

export function regionHintFromSettings(): "global" | "china" {
  const s = loadClientSettings();
  return s?.region === "global" ? "global" : "china";
}
