use super::websocket::send;
use rdev::{listen, Event, EventType};
use serde::Serialize;
use serde_json::{json, to_string, Value};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{async_runtime, command};
use tokio_tungstenite::tungstenite::Message;

static IS_RUNNING: AtomicBool = AtomicBool::new(false);

#[derive(Debug, Clone, Serialize)]
pub enum DeviceKind {
    MousePress,
    MouseRelease,
    MouseMove,
    KeyboardPress,
    KeyboardRelease,
}

#[derive(Debug, Clone, Serialize)]
pub struct DeviceEvent {
    kind: DeviceKind,
    value: Value,
}

#[command]
pub async fn start_listening() -> Result<(), String> {
    if IS_RUNNING.load(Ordering::SeqCst) {
        return Err("Device listener is already running".to_string());
    }

    IS_RUNNING.store(true, Ordering::SeqCst);

    let callback = move |event: Event| {
        let device = match event.event_type {
            EventType::ButtonPress(button) => DeviceEvent {
                kind: DeviceKind::MousePress,
                value: json!(format!("{:?}", button)),
            },
            EventType::ButtonRelease(button) => DeviceEvent {
                kind: DeviceKind::MouseRelease,
                value: json!(format!("{:?}", button)),
            },
            EventType::MouseMove { x, y } => DeviceEvent {
                kind: DeviceKind::MouseMove,
                value: json!({ "x": x, "y": y }),
            },
            EventType::KeyPress(key) => DeviceEvent {
                kind: DeviceKind::KeyboardPress,
                value: json!(format!("{:?}", key)),
            },
            EventType::KeyRelease(key) => DeviceEvent {
                kind: DeviceKind::KeyboardRelease,
                value: json!(format!("{:?}", key)),
            },
            _ => return,
        };

        if let Ok(json_str) = to_string(&device) {
            async_runtime::spawn(async move {
                send(Message::Text(json_str.into())).await;
            });
        }
    };

    #[cfg(target_os = "macos")]
    listen(callback).map_err(|err| format!("{:?}", err))?;

    #[cfg(not(target_os = "macos"))]
    std::thread::spawn(move || {
        if let Err(e) = listen(callback) {
            eprintln!("Device listening error: {:?}", e);
        }
    });

    Ok(())
}
