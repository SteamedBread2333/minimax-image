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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="flex max-h-[min(75vh,720px)] items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-neutral-50">
            <img src={src} alt="" className="max-h-[min(75vh,720px)] w-full object-contain" />
          </div>
          <div className="flex flex-wrap gap-2">
            {showNewTab && (
              <Button type="button" variant="outline" className="gap-2" asChild>
                <a href={src} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  在新标签页打开
                </a>
              </Button>
            )}
            <Button type="button" variant="outline" asChild>
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
