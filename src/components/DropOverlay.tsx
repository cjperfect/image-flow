import { Plus } from "lucide-react";
import { Badge } from "../components/ui/badge";

interface DropOverlayProps {
  activeFolderUrl: string;
  visible: boolean;
}

export default function DropOverlay({ activeFolderUrl, visible }: DropOverlayProps) {
  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center bg-background/80 p-6 animate-in fade-in">
      <div className="flex h-full max-h-[520px] w-full max-w-[780px] flex-col items-center justify-center rounded-[42px] border-2 border-dashed border-primary/30 bg-card/90 text-center animate-in zoom-in-95">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Plus className="h-10 w-10" strokeWidth={1.5} />
        </div>
        <p className="font-display text-3xl tracking-tight">释放以上传图片</p>
        <p className="mt-4 text-base text-muted-foreground">文件将自动压缩并上传到当前云存储目录</p>
        <Badge variant="primary" className="mt-8 font-mono">
          {activeFolderUrl || "请先完成连接配置"}
        </Badge>
      </div>
    </div>
  );
}
