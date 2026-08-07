import { useState, useEffect, useRef } from "react";
import { emit } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

export default function DropZone() {
  const [isOver, setIsOver] = useState(false);
  const [success, setSuccess] = useState(false);
  const processingRef = useRef(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    (async () => {
      try {
        const win = getCurrentWebviewWindow();
        unlisten = await win.onDragDropEvent(async (event) => {
          const { type } = event.payload;

          if (type === "over") {
            setIsOver(true);
          } else if (type === "leave") {
            setIsOver(false);
          } else if (type === "drop") {
            if (processingRef.current) return;
            processingRef.current = true;
            setIsOver(false);
            const paths = event.payload.paths;
            if (!paths || !paths.length) {
              processingRef.current = false;
              return;
            }

            // Clone immediately — the event payload may be reused across callbacks
            const safePaths = [...paths];

            const payload: {
              name: string;
              size: number;
              type: string;
              base64: string;
            }[] = [];
            for (const path of safePaths) {
              try {
                const base64: string = await invoke("read_file_base64", { path });
                const name = path.split(/[/\\]/).pop() || "image";
                const mimeMatch = base64.match(/^data:(.*?);/);
                const type = mimeMatch ? mimeMatch[1] : "image/png";
                const sizeBytes = Math.round((base64.length * 3) / 4);
                payload.push({ name, size: sizeBytes, type, base64 });
              } catch {
                // Skip unreadable files
              }
            }

            if (payload.length > 0) {
              try {
                await emit("imageflow:drop", payload);
                setSuccess(true);
                setTimeout(() => setSuccess(false), 1800);
              } catch {
                // Event emission failed
              }
            }
            // Reset after a short delay to catch any trailing duplicate events
            setTimeout(() => { processingRef.current = false; }, 500);
          }
        });
      } catch {
        // Tauri API not available
      }
    })();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const stateClass = success
    ? " dropzone-success"
    : isOver
      ? " dropzone-over"
      : " dropzone-idle";

  return (
    <div className="dropzone-window">
      <div className={`dropzone-card${stateClass}`}>
        {/* Animated border ring */}
        <svg className="dropzone-ring" viewBox="0 0 160 160">
          <circle
            cx="80" cy="80" r="76"
            fill="none"
            strokeWidth="2"
            className="dropzone-ring-track"
          />
          <circle
            cx="80" cy="80" r="76"
            fill="none"
            strokeWidth="2"
            className="dropzone-ring-progress"
          />
        </svg>

        {/* Success: checkmark */}
        {success ? (
          <div className="dropzone-success-inner">
            <svg className="dropzone-check" viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="26" className="dropzone-check-bg" />
              <path
                d="M16 27l7 7 13-13"
                fill="none"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="dropzone-check-stroke"
              />
            </svg>
            <span className="dropzone-text dropzone-text-success">已上传</span>
          </div>
        ) : (
          <>
            {/* Upload icon */}
            <svg
              className={`dropzone-upload-icon ${isOver ? "dropzone-upload-icon-active" : ""}`}
              viewBox="0 0 48 48"
              fill="none"
            >
              {/* Arrow */}
              <path
                d="M24 32V16M24 16l-6 6M24 16l6 6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="dropzone-upload-arrow"
              />
              {/* Tray */}
              <path
                d="M8 30v4a4 4 0 004 4h24a4 4 0 004-4v-4"
                strokeWidth="2"
                strokeLinecap="round"
                className="dropzone-upload-tray"
              />
            </svg>

            <span className="dropzone-text">
              {isOver ? "释放上传" : "拖拽到此处"}
            </span>

            {/* Particle dots */}
            {isOver && (
              <>
                <div className="dropzone-particle p1" />
                <div className="dropzone-particle p2" />
                <div className="dropzone-particle p3" />
                <div className="dropzone-particle p4" />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
