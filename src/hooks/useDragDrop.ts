import { useState, useRef, useCallback } from "react";

export function useDragDrop(onFilesDrop: (files: FileList) => void) {
  const [isDragging, setIsDragging] = useState(false);
  const depthRef = useRef(0);

  const containsFiles = (event: React.DragEvent | DragEvent) =>
    [...event.dataTransfer!.types].includes("Files");

  const handleDragEnter = useCallback((event: React.DragEvent) => {
    if (!containsFiles(event)) return;
    event.preventDefault();
    depthRef.current += 1;
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    if (!containsFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    if (!containsFiles(event)) return;
    event.preventDefault();
    depthRef.current -= 1;
    if (depthRef.current <= 0) {
      depthRef.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    if (!containsFiles(event)) return;
    event.preventDefault();
    depthRef.current = 0;
    setIsDragging(false);
    onFilesDrop(event.dataTransfer.files);
  }, [onFilesDrop]);

  return { isDragging, handleDragEnter, handleDragOver, handleDragLeave, handleDrop };
}
