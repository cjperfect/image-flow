import { useState } from "react";
import { X, HelpCircle, Maximize2 } from "lucide-react";
import { Button } from "./ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./ui/drawer";
import ImagePreviewModal from "./ImagePreviewModal";

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
      <Drawer direction="right" open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <button
            type="button"
            className="fixed right-0 top-1/2 z-20 -translate-y-1/2 rounded-l-xl border border-r-0 border-border bg-card px-2.5 py-4 shadow-md transition-all hover:shadow-lg hover:bg-muted/50"
            title="连接说明"
          >
            <span className="flex flex-col items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <HelpCircle className="h-4 w-4" />
              <span className="[writing-mode:vertical-rl] tracking-wider">连接说明</span>
            </span>
          </button>
        </DrawerTrigger>

        <DrawerContent className="inset-y-0 right-0 left-auto mt-0 h-full max-w-[480px] rounded-l-[10px] rounded-t-none">
          <DrawerHeader className="text-left">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle>连接说明</DrawerTitle>
                <DrawerDescription>如何获取 OBS / OSS 的连接信息</DrawerDescription>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon-sm">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          <div className="pretty-scrollbar flex-1 overflow-auto px-6 pb-6">
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
        </DrawerContent>
      </Drawer>

      <ImagePreviewModal
        open={!!previewImg}
        src={previewImg?.src ?? ""}
        alt={previewImg?.alt ?? ""}
        onClose={() => setPreviewImg(null)}
      />
    </>
  );
}
