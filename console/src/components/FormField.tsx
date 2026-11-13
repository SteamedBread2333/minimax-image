import type { ReactNode } from "react";
import { Label } from "./ui/label";
import { cn } from "../lib/utils";

export function FormField({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
      <p
        className={cn(
          "min-h-[2.25rem] text-xs leading-relaxed text-neutral-500",
          !hint && "opacity-0 select-none"
        )}
        aria-hidden={!hint}
      >
        {hint || "\u00a0"}
      </p>
    </div>
  );
}
