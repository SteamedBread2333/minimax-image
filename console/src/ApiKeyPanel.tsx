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
import { FormField, FormInput, FormStack } from "./components/FormField";
import { FormSelect, type SelectOption } from "./components/FormSelect";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import { cn } from "./lib/utils";

type Props = {
  onSaved?: () => void;
};

const regionOptions: SelectOption<ApiRegion>[] = [
  { value: "china", label: "国内", description: "api.minimaxi.com" },
  { value: "global", label: "国际", description: "api.minimax.io" },
];

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
        <CardContent className="border-t border-neutral-100 pt-4">
          <FormStack className="gap-5">
          <p className="text-xs leading-relaxed text-neutral-500">
            Key 仅存于本浏览器。国内 Key 选国内，国际 Key 选国际。
          </p>
          <FormField label="API Key" hint="以 sk-api- 开头，仅保存在本浏览器。">
            <FormInput
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-api-…"
              autoComplete="off"
              spellCheck={false}
            />
          </FormField>
          <FormField label="账号区域" hint="须与 Key 签发区域一致，否则会报无效 Key。">
            <FormSelect
              value={region}
              onValueChange={setRegion}
              options={regionOptions}
            />
          </FormField>
          <div className="flex flex-wrap gap-2.5 pt-1">
            <Button type="button" onClick={handleSave} className="min-w-[120px]">
              保存
            </Button>
            <Button type="button" variant="outline" onClick={handleClear}>
              清除
            </Button>
          </div>
          {message && <p className="-mt-1 text-xs text-neutral-600">{message}</p>}
          </FormStack>
        </CardContent>
      )}
    </Card>
  );
}
