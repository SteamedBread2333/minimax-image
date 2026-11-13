import {
  createContext,
  useContext,
  useId,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { cn } from "../lib/utils";

const FormFieldIdContext = createContext<string | undefined>(undefined);

/** 在 FormField 内为控件绑定与 Label 一致的 id */
export function useFormFieldId(): string {
  const fromContext = useContext(FormFieldIdContext);
  const fallback = useId();
  return fromContext ?? fallback;
}

export function FormInput(props: ComponentProps<typeof Input>) {
  const id = useFormFieldId();
  return <Input id={props.id ?? id} {...props} />;
}

export function FormTextarea(props: ComponentProps<typeof Textarea>) {
  const id = useFormFieldId();
  return <Textarea id={props.id ?? id} {...props} />;
}

/** 表单项之间的标准纵向间距 */
export function FormStack({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("flex flex-col gap-6", className)}>{children}</div>;
}

/** 同一主题下多字段（略紧） */
export function FormGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("flex flex-col gap-4", className)}>{children}</div>;
}

export function FormField({
  label,
  hint,
  children,
  className,
  controlId: controlIdProp,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  /** 与表单控件 id 对应，便于 Label 聚焦 */
  controlId?: string;
}) {
  const autoId = useId();
  const controlId = controlIdProp ?? autoId;
  const hintId = hint ? `${controlId}-hint` : undefined;

  return (
    <FormFieldIdContext.Provider value={controlId}>
      <div className={cn("flex flex-col gap-1.5", className)}>
        <Label htmlFor={controlId} className="text-sm">
          {label}
        </Label>
        <div aria-describedby={hintId}>{children}</div>
        {hint ? (
          <p id={hintId} className="text-xs leading-relaxed text-neutral-500">
            {hint}
          </p>
        ) : null}
      </div>
    </FormFieldIdContext.Provider>
  );
}
