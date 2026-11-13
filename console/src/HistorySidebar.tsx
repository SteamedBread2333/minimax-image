import { X } from "lucide-react";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { blobToObjectUrl } from "./historySave";
import {
  clearAllHistory,
  deleteHistoryRecord,
  getHistoryRecord,
  listHistoryRecords,
  type HistoryListItem,
  type HistoryRecord,
} from "./historyDb";
import type { GenerationParams } from "./types";
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
  onRestore: (mode: "generate" | "edit", params: GenerationParams) => void;
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
  const [loading, setLoading] = useState(true);

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
    setModalRecord(record);
  };

  useEffect(() => {
    if (!modalRecord) {
      setModalUrls([]);
      return;
    }
    const urls = modalRecord.images.map((img) => blobToObjectUrl(img.blob));
    setModalUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
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
        open={Boolean(modalRecord)}
        onOpenChange={(open) => !open && setModalRecord(null)}
        onRestore={onRestore}
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
      const blob = record?.images[0]?.blob;
      if (blob) {
        revoked = blobToObjectUrl(blob);
        setThumb(revoked);
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
          <span className="mt-0.5 text-[10px] text-neutral-500">{item.imageCount} 张</span>
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

function HistoryDetailDialog({
  record,
  imageUrls,
  open,
  onOpenChange,
  onRestore,
  onDelete,
}: {
  record: HistoryRecord | null;
  imageUrls: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore: Props["onRestore"];
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
                onRestore(record.mode, record.params);
                onOpenChange(false);
              }}
            >
              恢复参数到表单
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
