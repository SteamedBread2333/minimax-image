import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildEditBody,
  buildGenerationBody,
  checkHealth,
  type HealthInfo,
  editImagesJson,
  editImagesUpload,
  fileToDataUri,
  generateImages,
} from "./api";
import { ApiKeyPanel } from "./ApiKeyPanel";
import { formatApiError } from "./formatApiError";
import { HistorySidebar } from "./HistorySidebar";
import { persistGeneration } from "./historySave";
import { CheckboxRow } from "./components/CheckboxRow";
import { FormField } from "./components/FormField";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Textarea } from "./components/ui/textarea";
import { ParamFields } from "./ParamFields";
import { cn } from "./lib/utils";
import type { ApiResponse, EditParams, GenerationParams, ImageResult } from "./types";

const defaultParams = (): GenerationParams => ({
  model: "MiniMax-H3-Image",
  prompt: "",
  disable_prompt_enhanced: false,
  n: 1,
  size: "auto",
  aspect_ratio: "auto",
  area: "4K",
  output_format: "jpeg",
  response_format: "url",
  stream: false,
  output_compression: 95,
});

function imageSrc(item: ImageResult): string | undefined {
  if (item.url) return item.url;
  if (item.b64_json) return `data:image/jpeg;base64,${item.b64_json}`;
  return undefined;
}

export default function App() {
  const [tab, setTab] = useState<"generate" | "edit">("generate");
  const [params, setParams] = useState<GenerationParams>(defaultParams);
  const [editExtra, setEditExtra] = useState({
    imageUrls: "",
    useMultipart: false,
    files: [] as File[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ImageResult[]>([]);
  const [rawResponse, setRawResponse] = useState<string>("");
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [saveHint, setSaveHint] = useState<string | null>(null);

  const refreshHealth = useCallback(() => {
    checkHealth().then(setHealth);
  }, []);

  useEffect(() => {
    refreshHealth();
    const t = setInterval(refreshHealth, 30_000);
    const onSettings = () => refreshHealth();
    window.addEventListener("minimax-settings-changed", onSettings);
    return () => {
      clearInterval(t);
      window.removeEventListener("minimax-settings-changed", onSettings);
    };
  }, [refreshHealth]);

  const requestPreview = useMemo(() => {
    if (tab === "generate") {
      return JSON.stringify(buildGenerationBody(params), null, 2);
    }
    const editParams: EditParams = {
      ...params,
      imageUrls: editExtra.imageUrls.split("\n").filter((l) => l.trim()),
      useMultipart: editExtra.useMultipart,
    };
    return JSON.stringify(buildEditBody(editParams), null, 2);
  }, [tab, params, editExtra.imageUrls, editExtra.useMultipart]);

  const applyResponse = useCallback((data: ApiResponse): boolean => {
    setRawResponse(JSON.stringify(data, null, 2));
    if (data.type === "error" || data.error?.message) {
      const msg = data.error?.message ?? "请求失败";
      setError(formatApiError(msg));
      return false;
    }
    if (data.data?.length) {
      setResults(data.data);
    }
    return Boolean(data.data?.length);
  }, []);

  const run = async () => {
    setError(null);
    setResults([]);
    setRawResponse("");
    setSaveHint(null);
    if (!params.prompt.trim()) {
      setError("请先填写「画面描述」");
      return;
    }
    const mode = tab;

    setLoading(true);
    let collected: ImageResult[] = [];
    let failed = false;
    let responseText = "";

    const streamHandlers = {
      onImage: (item: ImageResult) => {
        collected.push(item);
        setResults((prev) => [...prev, item]);
      },
      onDone: (payload: Record<string, unknown>) => {
        responseText = JSON.stringify(payload, null, 2);
        setRawResponse(responseText);
      },
      onError: (message: string) => {
        failed = true;
        setError(message);
      },
    };

    try {
      if (mode === "generate") {
        const requestBody = buildGenerationBody(params);
        const data = await generateImages(params, params.stream ? streamHandlers : undefined);
        if (data) {
          if (!applyResponse(data)) failed = true;
          else if (data.data?.length) collected = data.data;
          responseText = JSON.stringify(data, null, 2);
        }
        if (!failed && collected.length) {
          await saveRun(mode, params, requestBody, collected, responseText);
        }
      } else {
        const editParams: EditParams = {
          ...params,
          imageUrls: [],
          useMultipart: editExtra.useMultipart,
        };

        if (editExtra.useMultipart) {
          if (!editExtra.files.length) {
            setError("请先上传参考图片（1～16 张）");
            setLoading(false);
            return;
          }
          if (editParams.stream) {
            setError("大文件直传模式暂不支持「边生成边显示」，请先关闭该选项");
            setLoading(false);
            return;
          }
          const data = await editImagesUpload(editParams, editExtra.files);
          const requestBody = buildEditBody({
            ...editParams,
            imageUrls: [`（${editExtra.files.length} 个上传文件）`],
          });
          if (!applyResponse(data)) failed = true;
          else if (data.data?.length) {
            collected = data.data;
            await saveRun(mode, params, requestBody, collected, JSON.stringify(data, null, 2), {
              referenceCount: editExtra.files.length,
              usedMultipart: true,
            });
          }
        } else {
          const urls = editExtra.imageUrls.split("\n").map((l) => l.trim()).filter(Boolean);
          if (!urls.length && editExtra.files.length) {
            for (const f of editExtra.files) {
              urls.push(await fileToDataUri(f));
            }
          }
          if (!urls.length) {
            setError("请上传参考图片，或在「高级」里填写图片网址");
            setLoading(false);
            return;
          }
          editParams.imageUrls = urls;
          const requestBody = buildEditBody(editParams);
          const data = await editImagesJson(editParams, params.stream ? streamHandlers : undefined);
          if (data) {
            if (!applyResponse(data)) failed = true;
            else if (data.data?.length) collected = data.data;
            responseText = JSON.stringify(data, null, 2);
          }
          if (!failed && collected.length) {
            await saveRun(mode, params, requestBody, collected, responseText, {
              referenceCount: urls.length,
              usedMultipart: false,
            });
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "请求失败");
    } finally {
      setLoading(false);
    }

    async function saveRun(
      mode: "generate" | "edit",
      p: GenerationParams,
      requestBody: Record<string, unknown>,
      images: ImageResult[],
      raw: string,
      editMeta?: { referenceCount: number; usedMultipart: boolean }
    ) {
      try {
        const n = await persistGeneration({
          mode,
          params: p,
          requestBody,
          results: images,
          rawResponse: raw,
          editMeta,
        });
        if (n > 0) setSaveHint(`已自动保存 ${n} 张图片与参数到本机（IndexedDB）`);
      } catch {
        setSaveHint("生成成功，但保存到本机失败（可能是磁盘或权限问题）");
      }
    }
  };

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    setEditExtra((s) => ({ ...s, files: Array.from(files).slice(0, 16) }));
  };

  const healthLabel =
    health === null
      ? "检测中…"
      : health.ok
        ? `${health.regionHint === "china" ? "国内" : health.regionHint === "global" ? "国际" : "自定义"} · 浏览器直连`
        : "请配置 API Key";

  return (
    <div className="min-h-screen bg-white text-neutral-950">
      <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6">
        <header className="mb-6 flex flex-col gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">MiniMax 图片工作台</h1>
            <p className="mt-1 text-sm text-neutral-500">文生图与图片编辑 · 白底简洁界面</p>
          </div>
          <span
            className={cn(
              "inline-flex w-fit items-center rounded-md border px-3 py-1.5 text-xs",
              health?.ok ? "border-neutral-300 text-neutral-700" : "border-neutral-400 text-neutral-900"
            )}
          >
            {healthLabel}
          </span>
        </header>

        <ApiKeyPanel onSaved={refreshHealth} />

        <Tabs value={tab} onValueChange={(v) => setTab(v as "generate" | "edit")} className="mb-4">
          <TabsList>
            <TabsTrigger value="generate">文生图</TabsTrigger>
            <TabsTrigger value="edit">图片编辑</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
          <Card className="min-w-0 lg:col-span-4">
            <CardHeader>
              <CardTitle>{tab === "generate" ? "生成设置" : "编辑设置"}</CardTitle>
              <CardDescription>填写后点击底部「开始生成」</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <ParamFields
                params={params}
                onChange={setParams}
                showPromptEnhance={tab === "generate"}
              />

              {tab === "edit" && (
                <div className="space-y-4 border-t border-neutral-100 pt-4">
                  <FormField
                    label="参考图片"
                    hint="1～16 张，在画面描述中说明如何修改。"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => onFiles(e.target.files)}
                      className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-md file:border file:border-neutral-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium"
                    />
                    {editExtra.files.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs text-neutral-600">
                        {editExtra.files.map((f, i) => (
                          <li key={f.name}>
                            图 {i + 1}：{f.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </FormField>

                  <details className="rounded-md border border-neutral-200 px-3 py-2 text-sm">
                    <summary className="cursor-pointer font-medium">图片网址 / 大文件模式</summary>
                    <div className="mt-3 space-y-3 border-t border-neutral-100 pt-3">
                      <FormField label="图片 URL" hint="每行一个链接">
                        <Textarea
                          value={editExtra.imageUrls}
                          onChange={(e) =>
                            setEditExtra((s) => ({ ...s, imageUrls: e.target.value }))
                          }
                          rows={3}
                          className="min-h-[72px]"
                        />
                      </FormField>
                      <CheckboxRow
                        checked={editExtra.useMultipart}
                        onCheckedChange={(v) =>
                          setEditExtra((s) => ({ ...s, useMultipart: v }))
                        }
                      >
                        大文件直传（multipart）
                      </CheckboxRow>
                    </div>
                  </details>
                </div>
              )}

              <div className="flex flex-col gap-2 border-t border-neutral-100 pt-4 sm:flex-row">
                <Button
                  type="button"
                  className="h-11 flex-1 sm:min-w-[140px]"
                  disabled={loading}
                  onClick={run}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      生成中…
                    </>
                  ) : (
                    "开始生成"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  disabled={loading}
                  onClick={() => {
                    setParams(defaultParams());
                    setEditExtra({ imageUrls: "", useMultipart: false, files: [] });
                    setResults([]);
                    setError(null);
                    setRawResponse("");
                    setSaveHint(null);
                  }}
                >
                  重置
                </Button>
              </div>

              <details className="text-xs text-neutral-500">
                <summary className="cursor-pointer font-medium text-neutral-700">请求 JSON</summary>
                <pre className="mt-2 max-h-40 overflow-auto rounded border border-neutral-200 bg-neutral-50 p-2 font-mono text-[11px] leading-relaxed">
                  {requestPreview}
                </pre>
              </details>
            </CardContent>
          </Card>

          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle>结果</CardTitle>
              <CardDescription>本次生成的图片</CardDescription>
            </CardHeader>
            <CardContent>
              {loading && (
                <div className="mb-4 flex items-center gap-2 text-sm text-neutral-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  等待响应（约 1～10 分钟）
                </div>
              )}
              {error && (
                <div className="mb-4 rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-900">
                  {error}
                </div>
              )}
              {saveHint && !error && (
                <div className="mb-4 text-sm text-neutral-600">{saveHint}</div>
              )}
              {!loading && !error && results.length === 0 && (
                <p className="py-12 text-center text-sm text-neutral-500">暂无结果</p>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {results.map((item, i) => {
                  const src = imageSrc(item);
                  if (!src) return null;
                  return (
                    <figure
                      key={`${src}-${i}`}
                      className="overflow-hidden rounded-md border border-neutral-200"
                    >
                      <a href={src} target="_blank" rel="noreferrer" className="block">
                        <img src={src} alt="" className="aspect-square w-full object-cover" />
                      </a>
                      <figcaption className="space-y-0.5 px-2 py-2 text-[11px] text-neutral-500">
                        {item.size && <div>尺寸 {item.size}</div>}
                        {item.revised_prompt && (
                          <div className="line-clamp-2" title={item.revised_prompt}>
                            {item.revised_prompt}
                          </div>
                        )}
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
              {rawResponse && (
                <details className="mt-4 text-xs">
                  <summary className="cursor-pointer font-medium text-neutral-700">原始响应</summary>
                  <pre className="mt-2 max-h-48 overflow-auto rounded border border-neutral-200 bg-neutral-50 p-2 font-mono text-[11px]">
                    {rawResponse}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-3">
            <HistorySidebar
              onRestore={(mode, p) => {
                setParams(p);
                setTab(mode);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
