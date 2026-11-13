import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FormField, FormGroup, FormStack, FormTextarea } from "./components/FormField";
import { FileInput } from "./components/ui/file-input";
import { cn } from "./lib/utils";

type Props = {
  files: File[];
  imageUrls: string;
  onReplaceFiles: (files: File[]) => void;
  onImageUrlsChange: (value: string) => void;
  onPickFiles: (list: FileList | null) => void;
};

function objectUrl(file: File): string {
  return URL.createObjectURL(file);
}

export function ReferenceImagesEditor({
  files,
  imageUrls,
  onReplaceFiles,
  onImageUrlsChange,
  onPickFiles,
}: Props) {
  const urlLines = useMemo(
    () => imageUrls.split("\n").map((l) => l.trim()).filter(Boolean),
    [imageUrls]
  );
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map(objectUrl);
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= files.length) return;
    const copy = [...files];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    onReplaceFiles(copy);
  };

  const removeFile = (index: number) => {
    onReplaceFiles(files.filter((_, i) => i !== index));
  };

  return (
    <FormStack className="gap-5">
      <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs leading-relaxed text-neutral-600">
        <p className="font-medium text-neutral-800">如何组织参考图</p>
        <ul className="mt-1 list-inside list-disc space-y-0.5">
          <li>
            <strong>顺序即编号</strong>：第 1 张上传图 =「图 1」，第 2 张 =「图 2」……最多 16 张。
          </li>
          <li>
            在画面描述里用同样编号说明用途，例如：「把图 1 的人物放进图 2 的背景里」。
          </li>
          <li>
            若用「图片 URL」，<strong>每行一个</strong>，从上到下对应图 1、图 2；可与本地上传混用（先上传的本地文件再接 URL 行）。
          </li>
          <li>需要换顺序时，用每张图旁的 ↑↓ 调整，编号会随之更新。</li>
        </ul>
      </div>

      <FormField label="参考图片" hint="1～16 张；顺序与提示词中的「图 N」一致">
        <div className="flex flex-col gap-3">
        <FileInput
          accept="image/*"
          multiple
          onFiles={onPickFiles}
          buttonLabel={files.length ? "继续添加图片" : "选择图片"}
        />
        {files.length > 0 && (
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${f.size}-${i}`}
                className="flex gap-2.5 rounded-md border border-neutral-200 bg-white p-2.5"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-neutral-100">
                  {previews[i] ? (
                    <img src={previews[i]} alt="" className="h-full w-full object-cover" />
                  ) : null}
                  <span className="absolute left-0 top-0 rounded-br bg-neutral-900/75 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    图 {i + 1}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-neutral-800">{f.name}</p>
                  <p className="text-[10px] text-neutral-500">
                    {(f.size / 1024).toFixed(0)} KB
                  </p>
                  <div className="mt-1 flex gap-0.5">
                    <button
                      type="button"
                      className={cn(
                        "rounded p-1 text-neutral-500 hover:bg-neutral-100",
                        i === 0 && "opacity-30"
                      )}
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                      aria-label={`图 ${i + 1} 上移`}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "rounded p-1 text-neutral-500 hover:bg-neutral-100",
                        i === files.length - 1 && "opacity-30"
                      )}
                      disabled={i === files.length - 1}
                      onClick={() => move(i, 1)}
                      aria-label={`图 ${i + 1} 下移`}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-red-600"
                      onClick={() => removeFile(i)}
                      aria-label={`移除图 ${i + 1}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {urlLines.length > 0 && files.length === 0 && (
          <p className="text-xs text-neutral-500">
            已填 {urlLines.length} 个 URL：第 1 行 = 图 1，以此类推。
          </p>
        )}
        </div>
      </FormField>

      <details className="rounded-md border border-neutral-200 px-4 py-3.5 text-sm">
        <summary className="cursor-pointer select-none font-medium text-neutral-800">
          图片网址
        </summary>
        <FormGroup className="mt-3 border-t border-neutral-100 pt-4">
          <FormField label="图片 URL" hint="每行一个；行序 = 图 1、图 2…（接在本地上传之后编号）">
            <FormTextarea
              value={imageUrls}
              onChange={(e) => onImageUrlsChange(e.target.value)}
              rows={3}
              className="min-h-[72px] resize-y font-mono text-xs"
              placeholder={"https://example.com/photo-1.jpg\nhttps://example.com/photo-2.jpg"}
              spellCheck={false}
            />
          </FormField>
        </FormGroup>
      </details>
    </FormStack>
  );
}
