import { ScrollText } from "lucide-react";
import { useState } from "react";
import type { HealthInfo } from "./api";
import { ChangelogModal } from "./ChangelogModal";
import { Button } from "./components/ui/button";
import { cn } from "./lib/utils";

function statusCopy(health: HealthInfo | null): { label: string; tone: "ok" | "warn" | "idle" } {
  if (health === null) {
    return { label: "检测连接…", tone: "idle" };
  }
  if (!health.ok) {
    return { label: "未配置 API Key", tone: "warn" };
  }
  const region =
    health.regionHint === "china"
      ? "国内"
      : health.regionHint === "global"
        ? "国际"
        : "自定义";
  return { label: `${region} · 直连`, tone: "ok" };
}

export function HeaderToolbar({ health }: { health: HealthInfo | null }) {
  const [changelogOpen, setChangelogOpen] = useState(false);
  const { label, tone } = statusCopy(health);

  return (
    <>
      <div
        className={cn(
          "inline-flex h-10 max-w-full items-center rounded-full border border-neutral-200/80 bg-neutral-50/90",
          "pl-3 pr-1 shadow-sm backdrop-blur-[2px] sm:pl-3.5"
        )}
      >
        <span className="flex min-w-0 items-center gap-2 pr-2 text-xs font-medium text-neutral-700">
          <span
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full",
              tone === "ok" && "bg-emerald-500",
              tone === "warn" && "bg-amber-500",
              tone === "idle" && "animate-pulse bg-neutral-400"
            )}
            aria-hidden
          />
          <span className="truncate">{label}</span>
        </span>
        <span className="mr-1 h-4 w-px bg-neutral-200" aria-hidden />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-full text-neutral-500 hover:bg-white hover:text-neutral-900"
          title="更新记录"
          aria-label="查看更新记录"
          onClick={() => setChangelogOpen(true)}
        >
          <ScrollText className="h-4 w-4" strokeWidth={2} />
        </Button>
      </div>

      <ChangelogModal open={changelogOpen} onOpenChange={setChangelogOpen} />
    </>
  );
}
