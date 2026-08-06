import { useState, useRef, useCallback } from "react";
import { copyToClipboard } from "../utils/clipboard";
import { toast } from "../components/ui/sonner";

export function useCopyToClipboard() {
  const [copiedText, setCopiedText] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const copyText = useCallback(async (text: string) => {
    try {
      copyToClipboard(text);
      setCopiedText(text);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopiedText(""), 1600);
      toast.info("已复制到剪贴板");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "复制失败");
    }
  }, []);

  return { copiedText, copyText };
}
