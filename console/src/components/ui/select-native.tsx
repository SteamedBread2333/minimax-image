import * as React from "react";
import { cn } from "../../lib/utils";

/** 原生 select，样式与 Input 一致 */
const SelectNative = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  ({ className, children, ...props }, ref) => (
    <select
      className={cn(
        "flex h-10 w-full max-w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </select>
  )
);
SelectNative.displayName = "SelectNative";

export { SelectNative };
