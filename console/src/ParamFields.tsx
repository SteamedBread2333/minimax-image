import type { GenerationParams } from "./types";
import {
  AREAS,
  ASPECT_RATIOS,
  MODELS,
  OUTPUT_FORMATS,
  RESPONSE_FORMATS,
} from "./types";
import {
  AREA_LABELS,
  AREA_LABELS_FULL,
  MODEL_LABELS,
  MODEL_LABELS_FULL,
  OUTPUT_FORMAT_LABELS,
  OUTPUT_FORMAT_LABELS_FULL,
  RATIO_LABELS,
  RATIO_LABELS_FULL,
  RESPONSE_FORMAT_LABELS,
  RESPONSE_FORMAT_LABELS_FULL,
} from "./paramLabels";
import { FormField } from "./components/FormField";
import { CheckboxRow } from "./components/CheckboxRow";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { SelectNative } from "./components/ui/select-native";

type Props = {
  params: GenerationParams;
  onChange: (next: GenerationParams) => void;
  showPromptEnhance?: boolean;
};

export function ParamFields({ params, onChange, showPromptEnhance = true }: Props) {
  const useCustomPixels =
    params.size.trim() !== "" && params.size.trim() !== "auto";

  const set = <K extends keyof GenerationParams>(key: K, value: GenerationParams[K]) => {
    onChange({ ...params, [key]: value });
  };

  const setStream = (stream: boolean) => {
    onChange({
      ...params,
      stream,
      ...(stream && params.response_format === "b64_json" ? { response_format: "url" as const } : {}),
    });
  };

  return (
    <div className="space-y-5">
      <p className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
        填写<strong className="font-medium text-neutral-900">画面描述</strong>后即可生成，其余项有默认值。
      </p>

      <FormField label="生成模式" hint="不确定选标准版。">
        <SelectNative
          value={params.model}
          onChange={(e) => set("model", e.target.value as GenerationParams["model"])}
        >
          {MODELS.map((m) => (
            <option key={m} value={m} title={MODEL_LABELS_FULL[m]}>
              {MODEL_LABELS[m] ?? m}
            </option>
          ))}
        </SelectNative>
      </FormField>

      <FormField
        label="画面描述"
        hint="说明主体、风格、光线。支持中英文。"
      >
        <Textarea
          value={params.prompt}
          onChange={(e) => set("prompt", e.target.value)}
          placeholder="描述你想生成的画面…"
          maxLength={32000}
          rows={6}
          className="min-h-[140px]"
        />
      </FormField>

      <CheckboxRow
        checked={useCustomPixels}
        onCheckedChange={(on) =>
          onChange({ ...params, size: on ? "2720x1536" : "auto" })
        }
      >
        自定义像素宽高（一般用「画面形状 + 清晰度」即可）
      </CheckboxRow>

      {!useCustomPixels ? (
        <RatioAreaFields params={params} set={set} />
      ) : (
        <FormField label="宽高（像素）" hint="例如 1920x1080">
          <Input
            value={params.size}
            onChange={(e) => set("size", e.target.value)}
            placeholder="2720x1536"
            className="font-mono text-sm"
          />
        </FormField>
      )}

      <FormField label="生成数量" hint="1～10 张，同一段描述可出多张。">
        <Input
          type="number"
          min={1}
          max={10}
          value={params.n}
          onChange={(e) => set("n", Number(e.target.value))}
          className="w-full max-w-[8rem]"
        />
      </FormField>

      {params.n > 1 && (
        <CheckboxRow checked={params.stream} onCheckedChange={setStream}>
          边生成边显示（多张时）
        </CheckboxRow>
      )}

      <details className="rounded-md border border-neutral-200 px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium text-neutral-800">高级选项</summary>
        <div className="mt-4 space-y-4 border-t border-neutral-100 pt-4">
          {showPromptEnhance && (
            <CheckboxRow
              checked={params.disable_prompt_enhanced}
              onCheckedChange={(v) => set("disable_prompt_enhanced", v)}
            >
              关闭自动优化描述
            </CheckboxRow>
          )}

          <div className="space-y-4">
            <FormField label="输出格式">
              <SelectNative
                value={params.output_format}
                onChange={(e) =>
                  set("output_format", e.target.value as GenerationParams["output_format"])
                }
              >
                {OUTPUT_FORMATS.filter((f) => f !== "jpg").map((f) => (
                  <option key={f} value={f} title={OUTPUT_FORMAT_LABELS_FULL[f]}>
                    {OUTPUT_FORMAT_LABELS[f] ?? f}
                  </option>
                ))}
              </SelectNative>
            </FormField>
            <FormField
              label="返回方式"
              hint="要稳定写入本机历史并离线看图，请选 Base64；选链接时可能只存外链（约 24h）。"
            >
              <SelectNative
                value={params.response_format}
                disabled={params.stream}
                onChange={(e) =>
                  set("response_format", e.target.value as GenerationParams["response_format"])
                }
              >
                {RESPONSE_FORMATS.map((f) => (
                  <option key={f} value={f} title={RESPONSE_FORMAT_LABELS_FULL[f]}>
                    {RESPONSE_FORMAT_LABELS[f] ?? f}
                  </option>
                ))}
              </SelectNative>
            </FormField>
          </div>

          <FormField label={`压缩质量 ${params.output_compression}`}>
            <input
              type="range"
              min={0}
              max={100}
              value={params.output_compression}
              onChange={(e) => set("output_compression", Number(e.target.value))}
              className="w-full accent-neutral-900"
            />
          </FormField>

          {params.n <= 1 && (
            <CheckboxRow checked={params.stream} onCheckedChange={setStream}>
              流式返回（SSE）
            </CheckboxRow>
          )}
        </div>
      </details>
    </div>
  );
}

function RatioAreaFields({
  params,
  set,
}: {
  params: GenerationParams;
  set: <K extends keyof GenerationParams>(key: K, value: GenerationParams[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <FormField
        label="画面形状"
        hint={RATIO_LABELS_FULL[params.aspect_ratio] ?? "选择输出宽高比"}
      >
        <SelectNative
          value={params.aspect_ratio}
          onChange={(e) => set("aspect_ratio", e.target.value)}
          title={RATIO_LABELS_FULL[params.aspect_ratio]}
        >
          {ASPECT_RATIOS.map((r) => (
            <option key={r} value={r} title={RATIO_LABELS_FULL[r]}>
              {RATIO_LABELS[r] ?? r}
            </option>
          ))}
        </SelectNative>
      </FormField>
      <FormField
        label="清晰度"
        hint={AREA_LABELS_FULL[params.area] ?? "越高越慢、占用额度越多"}
      >
        <SelectNative
          value={params.area}
          onChange={(e) => set("area", e.target.value as GenerationParams["area"])}
          title={AREA_LABELS_FULL[params.area]}
        >
          {AREAS.map((a) => (
            <option key={a} value={a} title={AREA_LABELS_FULL[a]}>
              {AREA_LABELS[a] ?? a}
            </option>
          ))}
        </SelectNative>
      </FormField>
    </div>
  );
}
