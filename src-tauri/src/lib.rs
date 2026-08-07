use std::io::Read;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use tauri::Emitter;
use windows::Win32::Foundation::*;
use windows::Win32::UI::WindowsAndMessaging::*;
use windows::Win32::UI::Input::KeyboardAndMouse::*;

// ─── Global drag state ─────────────────────────────────────

static IS_DRAGGING: AtomicBool = AtomicBool::new(false);
static DRAG_START: Mutex<(i32, i32)> = Mutex::new((0, 0));
static MOUSE_DOWN: AtomicBool = AtomicBool::new(false);
const DRAG_THRESHOLD: i32 = 8;

// ─── Check if a drag likely involves files ─────────────────

fn is_likely_file_drag() -> bool {
    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.0.is_null() {
            return false;
        }

        let mut class: [u16; 64] = [0; 64];
        let len = GetClassNameW(hwnd, &mut class);
        let name = String::from_utf16_lossy(&class[..len as usize]);

        // Explorer file views and Desktop
        matches!(
            name.as_str(),
            "SysListView32"       // classic file list
            | "DirectUIHWND"      // modern Explorer view
            | "Progman"           // desktop
            | "WorkerW"           // desktop worker
            | "CabinetWClass"     // Explorer window frame
            | "ExploreWClass"     // Explorer window (alt)
        )
    }
}

// ─── Tauri commands ────────────────────────────────────────────

#[tauri::command]
fn read_file_base64(path: String) -> Result<String, String> {
    let mut file = std::fs::File::open(&path).map_err(|e| format!("无法打开文件: {}", e))?;
    let mut bytes = Vec::new();
    file.read_to_end(&mut bytes).map_err(|e| format!("无法读取文件: {}", e))?;

    let ext = std::path::Path::new(&path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");
    let mime = match ext.to_lowercase().as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        "svg" => "image/svg+xml",
        "ico" => "image/x-icon",
        "tiff" | "tif" => "image/tiff",
        _ => "image/png",
    };

    use base64::Engine;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{};base64,{}", mime, b64))
}

// ─── App entry point ───────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![read_file_base64])
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let handle = app.handle().clone();
            let drop_width = 200.0;
            let drop_height = 200.0;
            let margin = 24.0;

            // Create the drop-zone window (hidden initially)
            if let Some(monitor) = app.primary_monitor()? {
                let size = monitor.size();
                let x = size.width as f64 - drop_width - margin;
                let y = size.height as f64 - drop_height - margin;

                let _drop_zone = tauri::WebviewWindowBuilder::new(
                    app,
                    "dropzone",
                    tauri::WebviewUrl::App("index.html?window=dropzone".into()),
                )
                    .title("ImageFlow 拖拽上传")
                    .inner_size(drop_width, drop_height)
                    .position(x, y)
                    .always_on_top(true)
                    .decorations(false)
                    .skip_taskbar(true)
                    .resizable(false)
                    .transparent(true)
                    .visible(false)
                    .build()?;
            }

            // ── Global drag detection thread ──────────────

            thread::spawn(move || {
                let mut was_dragging = false;
                let mut drag_source_is_file = false;

                loop {
                    let left_down = unsafe {
                        (GetAsyncKeyState(VK_LBUTTON.0 as i32) as u16 & 0x8000) != 0
                    };

                    if left_down && !MOUSE_DOWN.load(Ordering::SeqCst) {
                        MOUSE_DOWN.store(true, Ordering::SeqCst);
                        let mut pt = POINT::default();
                        unsafe { GetCursorPos(&mut pt).ok(); }
                        if let Ok(mut start) = DRAG_START.lock() {
                            *start = (pt.x, pt.y);
                        }
                        // Check if this drag started from a file-managing window
                        drag_source_is_file = is_likely_file_drag();
                    } else if !left_down && MOUSE_DOWN.load(Ordering::SeqCst) {
                        MOUSE_DOWN.store(false, Ordering::SeqCst);
                        if IS_DRAGGING.swap(false, Ordering::SeqCst) {
                            let _ = handle.emit("imageflow:drag-leave", ());
                            was_dragging = false;
                        }
                        drag_source_is_file = false;
                    }

                    if MOUSE_DOWN.load(Ordering::SeqCst)
                        && !IS_DRAGGING.load(Ordering::SeqCst)
                        && drag_source_is_file
                    {
                        let mut pt = POINT::default();
                        unsafe { GetCursorPos(&mut pt).ok(); }
                        if let Ok(start) = DRAG_START.lock() {
                            let dx = pt.x - start.0;
                            let dy = pt.y - start.1;
                            if dx * dx + dy * dy > DRAG_THRESHOLD * DRAG_THRESHOLD {
                                IS_DRAGGING.store(true, Ordering::SeqCst);
                            }
                        }
                    }

                    let is_dragging = IS_DRAGGING.load(Ordering::SeqCst);

                    if is_dragging != was_dragging {
                        log::info!("Drag state changed: {} (from file source)", is_dragging);
                        if is_dragging {
                            let _ = handle.emit("imageflow:drag-enter", ());
                        } else {
                            let _ = handle.emit("imageflow:drag-leave", ());
                        }
                        was_dragging = is_dragging;
                    }

                    thread::sleep(Duration::from_millis(50));
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
