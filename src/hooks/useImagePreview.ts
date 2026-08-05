import { useState, useRef, useCallback } from "react";

interface PreviewImage {
  src: string;
  alt: string;
}

interface PreviewSize {
  width: number;
  height: number;
}

interface PreviewPan {
  x: number;
  y: number;
}

export function useImagePreview() {
  const [image, setImage] = useState<PreviewImage | null>(null);
  const [scale, setScale] = useState(1);
  const [size, setSize] = useState<PreviewSize>({ width: 0, height: 0 });
  const [pan, setPan] = useState<PreviewPan>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; pan: PreviewPan } | null>(null);

  const fitToViewport = useCallback((nextSize?: PreviewSize) => {
    const viewport = viewportRef.current;
    const s = nextSize || size;
    if (!viewport || !s.width || !s.height) return;
    const fitScale = Math.min(1, viewport.clientWidth / s.width, viewport.clientHeight / s.height);
    setScale(Math.max(0.1, fitScale));
    setPan({ x: 0, y: 0 });
  }, [size]);

  const open = useCallback((img: PreviewImage) => {
    setScale(1);
    setSize({ width: 0, height: 0 });
    setPan({ x: 0, y: 0 });
    setImage(img);
  }, []);

  const close = useCallback(() => setImage(null), []);

  const handleWheel = useCallback((event: React.WheelEvent | WheelEvent) => {
    event.preventDefault();
    setScale((prev) => Math.min(4, Math.max(0.1, prev * (event.deltaY < 0 ? 1.1 : 0.9))));
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startY: event.clientY, pan };
    setIsDragging(true);
  }, [pan]);

  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    if (!dragRef.current) return;
    setPan({
      x: dragRef.current.pan.x + event.clientX - dragRef.current.startX,
      y: dragRef.current.pan.y + event.clientY - dragRef.current.startY,
    });
  }, []);

  const cancelDrag = useCallback(() => {
    dragRef.current = null;
    setIsDragging(false);
  }, []);

  const handlePointerUp = useCallback((event: React.PointerEvent) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    cancelDrag();
  }, [cancelDrag]);

  const handlePointerCancel = useCallback(() => {
    cancelDrag();
  }, [cancelDrag]);

  const handleImageLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const nextSize = { width: img.naturalWidth, height: img.naturalHeight };
    setSize(nextSize);
    const viewport = viewportRef.current;
    if (viewport) {
      const fitScale = Math.min(1, viewport.clientWidth / nextSize.width, viewport.clientHeight / nextSize.height);
      setScale(Math.max(0.1, fitScale));
      setPan({ x: 0, y: 0 });
    }
  }, []);

  return {
    image,
    scale,
    size,
    pan,
    isDragging,
    viewportRef,
    open,
    close,
    fitToViewport,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleImageLoad,
  };
}
