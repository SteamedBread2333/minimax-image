import { Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { historyHasUrlOnlyAssets, importFilesIntoHistory } from "./historyMaterialize";
import { blobToObjectUrl } from "./historySave";
import {
  clearAllHistory,
  deleteHistoryRecord,
  getHistoryRecord,
  listHistoryRecords,
  type HistoryListItem,
  type HistoryRecord,
} from "./historyDb";
import type { StoredReference } from "./historyDb";
import type { GenerationParams } from "./types";

export type EditRestorePayload = {
  files: File[];
  imageUrls: string;
};

function buildEditRestore(record: HistoryRecord): EditRestorePayload | undefined {
  if (record.mode !== "edit" || !record.referenceImages?.length) return undefined;
  const files: File[] = [];
  const urlOnly: string[] = [];
  for (const ref of record.referenceImages) {
    if (ref.blob) {
      const name = ref.fileName || `reference-${ref.index}.jpg`;
      files.push(new File([ref.blob], name, { type: ref.blob.type || "image/jpeg" }));
    } else if (ref.sourceUrl) {
      urlOnly.push(ref.sourceUrl);
    } else if (ref.remoteUrl) {
      urlOnly.push(ref.remoteUrl);
    }
  }
  return { files, imageUrls: urlOnly.join("\n") };
}
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import { ScrollArea } from "./components/ui/scroll-area";
import { cn } from "./lib/utils";

type Props = {
  onRestore: (
    mode: "generate" | "edit",
    params: GenerationParams,
    edit?: EditRestorePayload
  ) => void;
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function HistorySidebar({ onRestore }: Props) {
  const [list, setList] = useState<HistoryListItem[]>([]);
  const [modalRecord, setModalRecord] = useState<HistoryRecord | null>(null);
  const [modalUrls, setModalUrls] = useState<string[]>([]);
  const [modalRefUrls, setModalRefUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [materializing, setMaterializing] = useState(false);
  const [materializeHint, setMaterializeHint] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      setList(await listHistoryRecords(100));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
    const onUpdate = () => loadList();
    window.addEventListener("minimax-history-updated", onUpdate);
    return () => window.removeEventListener("minimax-history-updated", onUpdate);
  }, [loadList]);

  const openModal = async (id: string) => {
    const record = await getHistoryRecord(id);
    if (!record) return;
    setMaterializeHint(null);
    setModalRecord(record);
  };

  const handleImportFiles = async (files: FileList | null) => {
    if (!modalRecord || materializing || !files?.length) return;
    setMaterializing(true);
    setMaterializeHint(null);
    try {
      const r = await importFilesIntoHistory(modalRecord, Array.from(files));
      const fresh = await getHistoryRecord(modalRecord.id);
      if (fresh) setModalRecord(fresh);
      if (r.imagesImported + r.refsImported === 0) {
        setMaterializeHint("没有可填充的空位（可能都已缓存，或文件数量不足）。");
      } else {
        const parts: string[] = [];
        if (r.imagesImported) parts.push(`结果图 ${r.imagesImported} 张`);
        if (r.refsImported) parts.push(`参考图 ${r.refsImported} 张`);
        setMaterializeHint(`已写入 IndexedDB（Blob + Base64）：${parts.join("、")}`);
      }
      await loadList();
    } catch (e) {
      setMaterializeHint(e instanceof Error ? e.message : "导入失败");
    } finally {
      setMaterializing(false);
    }
  };

  useEffect(() => {
    if (!modalRecord) {
      setModalUrls([]);
      setModalRefUrls([]);
      return;
    }
    const toRevoke: string[] = [];
    const urls = modalRecord.images.map((img) => {
      if (img.blob) {
        const u = blobToObjectUrl(img.blob);
        toRevoke.push(u);
        return u;
      }
      return img.remoteUrl ?? "";
    });
    const refUrls = (modalRecord.referenceImages ?? []).map((ref) => {
      if (ref.blob) {
        const u = blobToObjectUrl(ref.blob);
        toRevoke.push(u);
        return u;
      }
      return ref.sourceUrl ?? ref.remoteUrl ?? "";
    });
    setModalUrls(urls);
    setModalRefUrls(refUrls);
    return () => toRevoke.forEach((u) => URL.revokeObjectURL(u));
  }, [modalRecord]);

  const handleDelete = async (e: MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("删除这条记录？")) return;
    await deleteHistoryRecord(id);
    if (modalRecord?.id === id) setModalRecord(null);
    await loadList();
  };

  const scrollHeight = "min(560px, calc(100vh - 11rem))";

  return (
    <>
      <Card className="flex h-full flex-col lg:sticky lg:top-6">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold">历史</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">{loading ? "…" : `${list.length} 条`}</span>
            {list.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={async () => {
                  if (!confirm("清空全部历史？")) return;
                  await clearAllHistory();
                  setModalRecord(null);
                  await loadList();
                }}
              >
                清空
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 pt-0">
          <ScrollArea style={{ height: scrollHeight }} className="w-full pr-2">
            {loading && (
              <p className="py-8 text-center text-xs text-neutral-500">加载中…</p>
            )}
            {!loading && !list.length && (
              <p className="py-8 text-center text-xs leading-relaxed text-neutral-500">
                生成成功后自动保存于此
              </p>
            )}
            <ul className="space-y-2 pb-2">
              {list.map((item) => (
                <HistoryListRow
                  key={item.id}
                  item={item}
                  onOpen={() => openModal(item.id)}
                  onDelete={(e) => handleDelete(e, item.id)}
                />
              ))}
            </ul>
          </ScrollArea>
        </CardContent>
      </Card>

      <HistoryDetailDialog
        record={modalRecord}
        imageUrls={modalUrls}
        referenceUrls={modalRefUrls}
        open={Boolean(modalRecord)}
        onOpenChange={(open) => !open && setModalRecord(null)}
        onRestore={onRestore}
        onImportFiles={handleImportFiles}
        importing={materializing}
        importHint={materializeHint}
        onDelete={async () => {
          if (!modalRecord) return;
          if (!confirm("删除这条记录？")) return;
          await deleteHistoryRecord(modalRecord.id);
          setModalRecord(null);
          await loadList();
        }}
      />
    </>
  );
}

function HistoryListRow({
  item,
  onOpen,
  onDelete,
}: {
  item: HistoryListItem;
  onOpen: () => void;
  onDelete: (e: MouseEvent) => void;
}) {
  const [thumb, setThumb] = useState<string | null>(null);

  useEffect(() => {
    let revoked: string | null = null;
    getHistoryRecord(item.id).then((record) => {
      const img0 = record?.images[0];
      if (!img0) return;
      if (img0.blob) {
        revoked = blobToObjectUrl(img0.blob);
        setThumb(revoked);
      } else if (img0.remoteUrl) {
        setThumb(img0.remoteUrl);
      }
    });
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [item.id]);

  return (
    <li className="relative">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-md border border-neutral-200 p-2 pr-8 text-left transition-colors hover:border-neutral-400 hover:bg-neutral-50"
      >
        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-neutral-100">
          {thumb ? (
            <img src={thumb} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[10px] text-neutral-400">
              …
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-[10px] text-neutral-500">
            {item.mode === "generate" ? "文生图" : "编辑"} · {formatTime(item.createdAt)}
          </span>
          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-neutral-900">
            {item.prompt || "（无描述）"}
          </p>
          <span className="mt-0.5 text-[10px] text-neutral-500">
            {item.mode === "edit" && item.referenceCount
              ? `参考 ${item.referenceCount} · 结果 ${item.imageCount}`
              : `${item.imageCount} 张`}
          </span>
        </span>
      </button>
      <button
        type="button"
        title="删除"
        aria-label="删除这条记录"
        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:bg-neutral-200 hover:text-neutral-900"
        onClick={onDelete}
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </li>
  );
}

function ReferenceThumb({
  refItem,
  src,
}: {
  refItem: StoredReference;
  src: string;
}) {
  const link = refItem.sourceUrl ?? refItem.remoteUrl;
  return (
    <figure className="overflow-hidden rounded-md border border-neutral-200">
      {src ? (
        <a href={src} target="_blank" rel="noreferrer">
          <img src={src} alt="" className="max-h-40 w-full object-contain bg-neutral-50" />
        </a>
      ) : (
        <div className="flex max-h-40 items-center justify-center bg-neutral-50 p-4 text-xs text-neutral-500">
          无法预览
        </div>
      )}
      <figcaption className="space-y-0.5 px-2 py-2 text-[11px] text-neutral-500">
        <div className="font-medium text-neutral-700">图 {refItem.index}</div>
        {refItem.fileName && <div className="truncate">{refItem.fileName}</div>}
        {link && (
          <a href={link} target="_blank" rel="noreferrer" className="block truncate text-blue-600">
            {link}
          </a>
        )}
        {!refItem.blob && link && (
          <span className="text-[10px] text-amber-700">仅保存链接，未缓存到本机</span>
        )}
      </figcaption>
    </figure>
  );
}

function HistoryDetailDialog({
  record,
  imageUrls,
  referenceUrls,
  open,
  onOpenChange,
  onRestore,
  onImportFiles,
  importing,
  importHint,
  onDelete,
}: {
  record: HistoryRecord | null;
  imageUrls: string[];
  referenceUrls: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore: Props["onRestore"];
  onImportFiles: (files: FileList | null) => void;
  importing: boolean;
  importHint: string | null;
  onDelete: () => void;
}) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {record.mode === "generate" ? "文生图" : "图片编辑"} ·{" "}
            {formatTime(record.createdAt)}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div>
            <p className="mb-1 text-xs font-medium text-neutral-700">画面描述</p>
            <p className="text-sm leading-relaxed text-neutral-800">{record.prompt}</p>
          </div>
          {record.mode === "edit" && record.referenceImages && record.referenceImages.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-neutral-700">参考图（提交顺序）</p>
              <div
                className={cn(
                  "grid gap-3",
                  record.referenceImages.length > 1 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1"
                )}
              >
                {record.referenceImages.map((ref, i) => (
                  <ReferenceThumb key={ref.id} refItem={ref} src={referenceUrls[i] ?? ""} />
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-medium text-neutral-700">生成结果</p>
            <div
              className={cn(
                "grid gap-3",
                record.images.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
              )}
            >
            {record.images.map((img, i) => (
              <figure key={img.id} className="overflow-hidden rounded-md border border-neutral-200">
                <a href={imageUrls[i]} target="_blank" rel="noreferrer" download>
                  <img
                    src={imageUrls[i]}
                    alt=""
                    className="max-h-[50vh] w-full object-contain bg-neutral-50"
                  />
                </a>
                {(img.size || img.revised_prompt) && (
                  <figcaption className="px-2 py-2 text-[11px] text-neutral-500">
                    {img.size && <div>尺寸 {img.size}</div>}
                    {img.revised_prompt && (
                      <p className="mt-1 line-clamp-3" title={img.revised_prompt}>
                        {img.revised_prompt}
                      </p>
                    )}
                  </figcaption>
                )}
              </figure>
            ))}
            </div>
          </div>
          {record && historyHasUrlOnlyAssets(record) && (
            <div className="rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-xs leading-relaxed text-amber-950">
              <p className="space-y-1.5">
                <span>
                  纯前端无法从 OSS 外链用脚本下载（无 CORS）。可：① 生成时选
                  <strong> Base64 返回</strong>；② 点上方图片「新标签打开」另存为后，再
                  <strong> 导入本机文件</strong> 写入 Blob / Base64。
                </span>
              </p>
              <label className="mt-2 inline-flex cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  disabled={importing}
                  onChange={(e) => {
                    onImportFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <span className="inline-flex h-8 items-center gap-2 rounded-md border border-amber-300 bg-white px-3 text-xs font-medium text-neutral-900 hover:bg-amber-50">
                  {importing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      写入中…
                    </>
                  ) : (
                    "导入本机图片（Blob + Base64）"
                  )}
                </span>
              </label>
              <p className="mt-1.5 text-[11px] text-amber-900/90">
                按顺序填充尚未本地缓存的结果图，再填充参考图。
              </p>
            </div>
          )}
          {importHint && (
            <p className="text-xs leading-relaxed text-neutral-600">{importHint}</p>
          )}
          <details className="text-xs">
            <summary className="cursor-pointer text-neutral-600">请求参数 JSON</summary>
            <pre className="mt-2 max-h-32 overflow-auto rounded border border-neutral-200 bg-neutral-50 p-2 font-mono text-[10px]">
              {JSON.stringify(
                { prompt: record.prompt, params: record.params, requestBody: record.requestBody },
                null,
                2
              )}
            </pre>
          </details>
          <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-4">
            <Button
              type="button"
              className="flex-1"
              onClick={() => {
                const edit = buildEditRestore(record);
                onRestore(record.mode, record.params, edit);
                onOpenChange(false);
              }}
            >
              {record.mode === "edit" && record.referenceImages?.length
                ? "恢复参数与参考图"
                : "恢复参数到表单"}
            </Button>
            <Button type="button" variant="outline" onClick={onDelete}>
              删除此记录
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
