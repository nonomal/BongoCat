use rdev::{listen, Event, EventType};
use serde::Serialize;
use serde_json::{json, Value};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{command, ipc::Channel};

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
pub async fn start_device_listening(channel: Channel<DeviceEvent>) -> Result<(), String> {
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

        let _ = channel.send(device);
    };

    listen(callback).map_err(|err| format!("{:?}", err))?;

    Ok(())
}
