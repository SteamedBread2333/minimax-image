import type { ReactNode } from "react";
import { Checkbox } from "./ui/checkbox";
import { cn } from "../lib/utils";

export function CheckboxRow({
  checked,
  onCheckedChange,
  children,
  className,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5 py-0.5 text-sm leading-snug", className)}>
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className="mt-0.5 shrink-0"
      />
      <span className="text-neutral-800">{children}</span>
    </label>
  );
}
