import { CHANGELOG } from "./changelog";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ChangelogModal({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
  );
}
