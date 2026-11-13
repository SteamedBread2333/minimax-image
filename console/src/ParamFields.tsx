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
import { FormField, FormGroup, FormInput, FormStack, FormTextarea } from "./components/FormField";
import { FormSelect, type SelectOption } from "./components/FormSelect";
import { CheckboxRow } from "./components/CheckboxRow";
import { Slider } from "./components/ui/slider";

type Props = {
  params: GenerationParams;
  onChange: (next: GenerationParams) => void;
  showPromptEnhance?: boolean;
};

const modelOptions: SelectOption<GenerationParams["model"]>[] = MODELS.map((m) => ({
  value: m,
  label: MODEL_LABELS[m] ?? m,
  description: MODEL_LABELS_FULL[m],
}));

const outputFormatOptions: SelectOption<GenerationParams["output_format"]>[] = OUTPUT_FORMATS.filter(
  (f) => f !== "jpg"
).map((f) => ({
  value: f,
  label: OUTPUT_FORMAT_LABELS[f] ?? f,
  description: OUTPUT_FORMAT_LABELS_FULL[f],
}));

const responseFormatOptions: SelectOption<GenerationParams["response_format"]>[] = RESPONSE_FORMATS.map(
  (f) => ({
    value: f,
    label: RESPONSE_FORMAT_LABELS[f] ?? f,
    description: RESPONSE_FORMAT_LABELS_FULL[f],
  })
);

const ratioOptions: SelectOption[] = ASPECT_RATIOS.map((r) => ({
  value: r,
  label: RATIO_LABELS[r] ?? r,
  description: RATIO_LABELS_FULL[r],
}));

const areaOptions: SelectOption<GenerationParams["area"]>[] = AREAS.map((a) => ({
  value: a,
  label: AREA_LABELS[a] ?? a,
  description: AREA_LABELS_FULL[a],
}));

function clampCount(n: number): number {
  if (Number.isNaN(n)) return 1;
  return Math.min(10, Math.max(1, Math.round(n)));
}

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
    <FormStack>
      <p className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm leading-relaxed text-neutral-600">
        填写<strong className="font-medium text-neutral-900">画面描述</strong>后即可生成，其余项有默认值。
      </p>

      <FormField label="生成模式" hint="不确定选标准版。">
        <FormSelect
          value={params.model}
          onValueChange={(v) => set("model", v)}
          options={modelOptions}
        />
      </FormField>

      <FormField
        label="画面描述"
        hint="说明主体、风格、光线。支持中英文。"
      >
        <FormTextarea
          value={params.prompt}
          onChange={(e) => set("prompt", e.target.value)}
          placeholder="描述你想生成的画面…"
          maxLength={32000}
          rows={6}
          className="min-h-[140px] resize-y"
        />
      </FormField>

      <FormGroup className="gap-3">
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
            <FormInput
              value={params.size}
              onChange={(e) => set("size", e.target.value)}
              placeholder="2720x1536"
              className="font-mono"
              inputMode="text"
              autoComplete="off"
            />
          </FormField>
        )}
      </FormGroup>

      <FormField label="生成数量" hint="1～10 张，同一段描述可出多张。">
        <FormInput
          type="number"
          min={1}
          max={10}
          step={1}
          value={params.n}
          onChange={(e) => {
            const next = clampCount(Number(e.target.value));
            set("n", next);
          }}
          onBlur={(e) => set("n", clampCount(Number(e.target.value)))}
          className="w-full max-w-[8rem]"
        />
      </FormField>

      {params.n > 1 && (
        <CheckboxRow checked={params.stream} onCheckedChange={setStream}>
          边生成边显示（多张时）
        </CheckboxRow>
      )}

      <details className="rounded-md border border-neutral-200 px-4 py-3.5 text-sm">
        <summary className="cursor-pointer select-none font-medium text-neutral-800">高级选项</summary>
        <div className="mt-3 flex flex-col gap-5 border-t border-neutral-100 pt-4">
          {showPromptEnhance && (
            <CheckboxRow
              checked={params.disable_prompt_enhanced}
              onCheckedChange={(v) => set("disable_prompt_enhanced", v)}
            >
              关闭自动优化描述
            </CheckboxRow>
          )}

          <FormGroup>
            <FormField label="输出格式">
              <FormSelect
                value={params.output_format}
                onValueChange={(v) => set("output_format", v)}
                options={outputFormatOptions}
              />
            </FormField>
            <FormField
              label="返回方式"
              hint="要稳定写入本机历史并离线看图，请选 Base64；选链接时可能只存外链（约 24h）。"
            >
              <FormSelect
                value={params.response_format}
                disabled={params.stream}
                onValueChange={(v) => set("response_format", v)}
                options={responseFormatOptions}
              />
            </FormField>
          </FormGroup>

          <FormField label={`压缩质量 ${params.output_compression}`}>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[params.output_compression]}
              onValueChange={([v]) => set("output_compression", v)}
              className="py-1"
            />
          </FormField>

          {params.n <= 1 && (
            <CheckboxRow checked={params.stream} onCheckedChange={setStream}>
              流式返回（SSE）
            </CheckboxRow>
          )}
        </div>
      </details>
    </FormStack>
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
    <FormGroup>
      <FormField
        label="画面形状"
        hint={RATIO_LABELS_FULL[params.aspect_ratio] ?? "选择输出宽高比"}
      >
        <FormSelect
          value={params.aspect_ratio}
          onValueChange={(v) => set("aspect_ratio", v)}
          options={ratioOptions}
        />
      </FormField>
      <FormField
        label="清晰度"
        hint={AREA_LABELS_FULL[params.area] ?? "越高越慢、占用额度越多"}
      >
        <FormSelect
          value={params.area}
          onValueChange={(v) => set("area", v)}
          options={areaOptions}
        />
      </FormField>
    </FormGroup>
  );
}
