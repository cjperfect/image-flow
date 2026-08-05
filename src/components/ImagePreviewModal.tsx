import { useEffect } from "react";
import { X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { useImagePreview } from "../hooks/useImagePreview";
import { cn } from "../lib/utils";

interface ImagePreviewModalProps {
  open: boolean;
  src: string;
  alt: string;
  onClose: () => void;
}

export default function ImagePreviewModal({ open, src, alt, onClose }: ImagePreviewModalProps) {
  const preview = useImagePreview();

  useEffect(() => {
    if (open && src) {
      preview.open({ src, alt });
    }
  }, [open, src, alt]);

  function handleClose() {
    preview.close();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-[1120px] p-4 !overflow-hidden [&>button.absolute]:hidden" onMouseDown={(e) => e.stopPropagation()}>
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle className="truncate text-sm font-medium text-foreground">{alt}</DialogTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{Math.round(preview.scale * 100)}%</Badge>
            <Button variant="ghost" size="sm" onClick={() => preview.fitToViewport()}>重置</Button>
            <Button variant="ghost" size="icon-sm" onClick={handleClose}><X className="h-4 w-4" /></Button>
          </div>
        </DialogHeader>

        <div
          ref={preview.viewportRef}
          className={cn(
            "relative flex h-[76vh] items-center justify-center overflow-hidden rounded-2xl bg-muted/30",
            preview.isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
          onWheel={preview.handleWheel}
          onPointerDown={preview.handlePointerDown}
          onPointerMove={preview.handlePointerMove}
          onPointerUp={preview.handlePointerUp}
          onPointerCancel={preview.handlePointerCancel}
        >
          {preview.image && (
            <img
              src={preview.image.src}
              alt={preview.image.alt}
              draggable={false}
              onLoad={preview.handleImageLoad}
              className="absolute left-1/2 top-1/2 max-w-none select-none"
              style={{
                width: preview.size.width || "auto",
                height: preview.size.height || "auto",
                transform: `translate(-50%, -50%) translate(${preview.pan.x}px, ${preview.pan.y}px) scale(${preview.scale})`,
                transformOrigin: "center center",
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
