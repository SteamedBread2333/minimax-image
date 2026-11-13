import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import {
  clearClientSettings,
  loadClientSettings,
  maskApiKey,
  saveClientSettings,
  type ApiRegion,
  type ClientSettings,
} from "./clientSettings";
import { FormField } from "./components/FormField";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { SelectNative } from "./components/ui/select-native";
import { cn } from "./lib/utils";

type Props = {
  onSaved?: () => void;
};

export function ApiKeyPanel({ onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [region, setRegion] = useState<ApiRegion>("china");
  const [saved, setSaved] = useState<ClientSettings | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const s = loadClientSettings();
    setSaved(s);
    if (s) {
      setApiKey(s.apiKey);
      setRegion(s.region);
    }
  }, []);

  const handleSave = () => {
    if (!apiKey.trim()) {
      setMessage("请填写 API Key");
      return;
    }
    const next = { apiKey: apiKey.trim(), region };
    saveClientSettings(next);
    setSaved(next);
    setMessage("已保存到本浏览器");
    onSaved?.();
  };

  const handleClear = () => {
    clearClientSettings();
    setSaved(null);
    setApiKey("");
    setRegion("china");
    setMessage("已清除，需重新保存 Key 才能生成");
    onSaved?.();
  };

  return (
    <Card className="mb-6">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div>
          <p className="text-sm font-medium">API 连接</p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {saved ? `已保存 ${maskApiKey(saved.apiKey)}` : "未配置 — 保存后即可调用 API"}
          </p>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-neutral-500 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <CardContent className="space-y-4 border-t border-neutral-100 pt-0">
          <p className="text-xs leading-relaxed text-neutral-500">
            Key 仅存于本浏览器。国内 Key 选国内，国际 Key 选国际。
          </p>
          <FormField label="API Key">
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-api-…"
              autoComplete="off"
            />
          </FormField>
          <FormField label="账号区域">
            <SelectNative value={region} onChange={(e) => setRegion(e.target.value as ApiRegion)}>
              <option value="china">国内</option>
              <option value="global">国际</option>
            </SelectNative>
          </FormField>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleSave} className="min-w-[120px]">
              保存
            </Button>
            <Button type="button" variant="outline" onClick={handleClear}>
              清除
            </Button>
          </div>
          {message && <p className="text-xs text-neutral-600">{message}</p>}
        </CardContent>
      )}
    </Card>
  );
}
