use serde_json::Value;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::{process::CommandChild, ShellExt};

/// Manages the Python sidecar process lifecycle.
pub struct SidecarManager {
    child: Mutex<Option<CommandChild>>,
}

impl SidecarManager {
    pub fn new() -> Self {
        Self {
            child: Mutex::new(None),
        }
    }

    /// Spawn the sidecar if not already running, and send a command.
    pub fn send_command(&self, app: &AppHandle, command: Value) -> Result<(), String> {
        let mut child_lock = self.child.lock().map_err(|e| e.to_string())?;

        // Spawn sidecar if not running
        if child_lock.is_none() {
            let sidecar = app
                .shell()
                .sidecar("memofy-sidecar")
                .map_err(|e| format!("Failed to create sidecar command: {e}"))?;

            let (mut rx, child) = sidecar
                .spawn()
                .map_err(|e| format!("Failed to spawn sidecar: {e}"))?;

            // Forward stdout events to frontend
            let app_handle = app.clone();
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_shell::process::CommandEvent;
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => {
                            let line_str = String::from_utf8_lossy(&line);
                            if let Ok(msg) = serde_json::from_str::<Value>(&line_str) {
                                let _ = app_handle.emit("sidecar-message", msg);
                            }
                        }
                        CommandEvent::Stderr(line) => {
                            let line_str = String::from_utf8_lossy(&line);
                            eprintln!("Sidecar stderr: {}", line_str);
                        }
                        CommandEvent::Terminated(_) => {
                            let _ = app_handle.emit("sidecar-terminated", ());
                            break;
                        }
                        _ => {}
                    }
                }
            });

            *child_lock = Some(child);
        }

        // Write command to stdin
        if let Some(ref child) = *child_lock {
            let json_str = serde_json::to_string(&command)
                .map_err(|e| format!("Failed to serialize command: {e}"))?;
            child
                .write((json_str + "\n").as_bytes())
                .map_err(|e| format!("Failed to write to sidecar stdin: {e}"))?;
        }

        Ok(())
    }

    /// Kill the sidecar process if running.
    pub fn kill(&self) -> Result<(), String> {
        let mut child_lock = self.child.lock().map_err(|e| e.to_string())?;
        if let Some(child) = child_lock.take() {
            child
                .kill()
                .map_err(|e| format!("Failed to kill sidecar: {e}"))?;
        }
        Ok(())
    }
}

#[tauri::command]
pub fn send_to_sidecar(app: AppHandle, command: Value) -> Result<(), String> {
    let manager = app.state::<SidecarManager>();
    manager.send_command(&app, command)
}

#[tauri::command]
pub fn check_ollama_status() -> Result<Value, String> {
    let client = reqwest::blocking::Client::new();
    match client.get("http://localhost:11434/api/tags").send() {
        Ok(resp) => {
            if resp.status().is_success() {
                let body: Value = resp.json().map_err(|e| e.to_string())?;
                Ok(serde_json::json!({
                    "status": "running",
                    "models": body.get("models").cloned().unwrap_or(Value::Array(vec![]))
                }))
            } else {
                Ok(serde_json::json!({"status": "error", "message": "Unexpected response"}))
            }
        }
        Err(_) => Ok(serde_json::json!({"status": "not_running"})),
    }
}
