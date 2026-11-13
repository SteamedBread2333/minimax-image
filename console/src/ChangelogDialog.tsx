import { ScrollText } from "lucide-react";
import { useState } from "react";
import { CHANGELOG } from "./changelog";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import { cn } from "./lib/utils";

export function ChangelogDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="更新记录"
        aria-label="查看更新记录"
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-neutral-300",
          "text-neutral-600 transition-colors hover:border-neutral-400 hover:bg-neutral-50 hover:text-neutral-900"
        )}
      >
        <ScrollText className="h-4 w-4" strokeWidth={2} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>更新记录</DialogTitle>
          </DialogHeader>
          <DialogBody className="max-h-[min(60vh,420px)] space-y-6">
            {CHANGELOG.map((entry) => (
              <section key={`${entry.date}-${entry.title}`}>
                <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0">
                  <time className="text-xs font-medium text-neutral-500">{entry.date}</time>
                  <h3 className="text-sm font-semibold text-neutral-900">{entry.title}</h3>
                </div>
                <ul className="list-inside list-disc space-y-1 text-sm leading-relaxed text-neutral-700">
                  {entry.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
