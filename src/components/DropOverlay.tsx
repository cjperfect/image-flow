import { Plus } from "lucide-react";
import { Badge } from "../components/ui/badge";

interface DropOverlayProps {
  activeFolderUrl: string;
  visible: boolean;
}

export default function DropOverlay({ activeFolderUrl, visible }: DropOverlayProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-blue-100/20 p-6 backdrop-blur-lg animate-in fade-in">
      <div className="drop-overlay flex h-full max-h-[520px] w-full max-w-[780px] flex-col items-center justify-center rounded-[42px] text-center animate-in zoom-in-95">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <Plus className="h-10 w-10" strokeWidth={1.5} />
        </div>
        <p className="text-3xl font-semibold tracking-tight text-slate-950">释放以上传图片</p>
        <p className="mt-4 text-base text-slate-500">文件将自动压缩并上传到当前云存储目录</p>
        <Badge variant="primary" className="mt-8 font-mono">
          {activeFolderUrl || "请先完成连接配置"}
        </Badge>
      </div>
    </div>
  );
}
