import { useState } from "react";
import { X, HelpCircle, Maximize2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

const STEPS = [
  {
    title: "获取 Access Key",
    desc: "登录华为云 OBS 控制台，在「我的凭证」中创建 Access Key ID 和 Secret Access Key。",
    img: "/api-key.png",
  },
  {
    title: "OBS 文件夹地址",
    desc: "在 OBS 控制台进入目标 Bucket，复制文件夹路径，格式为 obs://bucket-name/path/。",
    img: "/obs-folder.png",
  },
  {
    title: "OSS 文件夹地址",
    desc: "阿里云 OSS 用户：进入 Bucket 概览页获取 Endpoint，复制文件夹路径格式为 oss://bucket-name/path/。",
    img: "/oss-folder.png",
  },
];

export default function ConnectionGuide() {
  const [open, setOpen] = useState(false);
  const [previewImg, setPreviewImg] = useState<{ src: string; alt: string } | null>(null);

  return (
    <>
      {/* Floating trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-0 top-1/2 z-20 -translate-y-1/2 rounded-l-xl border border-r-0 border-border bg-card px-2.5 py-4 shadow-md transition-all hover:shadow-lg hover:bg-muted/50"
        title="连接说明"
      >
        <span className="flex flex-col items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <HelpCircle className="h-4 w-4" />
          <span className="[writing-mode:vertical-rl] tracking-wider">连接说明</span>
        </span>
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-foreground/20 transition-opacity" onClick={() => setOpen(false)} />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full max-w-[480px] border-l border-border bg-card shadow-xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-6 py-5">
            <div>
              <h2 className="font-display text-xl tracking-tight">连接说明</h2>
              <p className="mt-1 text-sm text-muted-foreground">如何获取 OBS / OSS 的连接信息</p>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="pretty-scrollbar flex-1 overflow-auto px-6 py-6">
            <div className="space-y-10">
              {STEPS.map((step, i) => (
                <div key={step.title}>
                  <div className="flex items-start gap-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewImg({ src: step.img, alt: step.title })}
                    className="group relative mt-4 block w-full overflow-hidden rounded-xl border border-border"
                  >
                    <img
                      src={step.img}
                      alt={step.title}
                      className="w-full object-contain transition group-hover:scale-105"
                      loading="lazy"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-foreground/0 opacity-0 transition group-hover:bg-foreground/5 group-hover:opacity-100">
                      <span className="flex items-center gap-1.5 rounded-lg bg-card/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
                        <Maximize2 className="h-3.5 w-3.5" />
                        点击预览
                      </span>
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImg} onOpenChange={(v) => !v && setPreviewImg(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">{previewImg?.alt}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center overflow-hidden rounded-xl bg-muted/30">
            {previewImg && (
              <img
                src={previewImg.src}
                alt={previewImg.alt}
                className="max-h-[75vh] w-full object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
