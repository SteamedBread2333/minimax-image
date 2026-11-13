import { ExternalLink } from "lucide-react";
import { Button } from "./components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";

type Props = {
  src: string | null;
  title?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** HTTP(S) 可在新标签打开 */
  allowExternalOpen?: boolean;
  downloadName?: string;
};

export function ImagePreviewDialog({
  src,
  title = "图片预览",
  open,
  onOpenChange,
  allowExternalOpen = false,
  downloadName = "minimax-image.jpg",
}: Props) {
  if (!src) return null;

  const showNewTab = allowExternalOpen && /^https?:\/\//i.test(src);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="flex max-h-[min(55dvh,520px)] items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 sm:max-h-[min(75vh,720px)]">
            <img
              src={src}
              alt=""
              className="max-h-[min(55dvh,520px)] w-full object-contain sm:max-h-[min(75vh,720px)]"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {showNewTab && (
              <Button type="button" variant="outline" className="h-11 w-full gap-2 sm:w-auto" asChild>
                <a href={src} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  在新标签页打开
                </a>
              </Button>
            )}
            <Button type="button" variant="outline" className="h-11 w-full sm:w-auto" asChild>
              <a href={src} download={downloadName}>
                下载图片
              </a>
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
