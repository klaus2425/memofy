use serde::Deserialize;
use std::fs;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

#[derive(Deserialize)]
pub struct ExportData {
    pub title: String,
    pub date: String,
    pub summary: String,
    pub transcript: Option<String>,
    pub include_transcript: bool,
}

#[tauri::command]
pub async fn export_to_markdown(app: AppHandle, data: ExportData) -> Result<String, String> {
    let mut content = format!("# {}\n\n**Date:** {}\n\n", data.title, data.date);
    content.push_str("## Summary\n\n");
    content.push_str(&data.summary);
    content.push_str("\n\n");

    if data.include_transcript {
        if let Some(transcript) = &data.transcript {
            content.push_str("## Transcript\n\n");
            content.push_str(transcript);
            content.push_str("\n");
        }
    }

    // Open native save dialog
    let file_path = app
        .dialog()
        .file()
        .set_file_name(&format!("{}.md", data.title))
        .add_filter("Markdown", &["md"])
        .blocking_save_file();

    match file_path {
        Some(path) => {
            fs::write(&path, content).map_err(|e| format!("Failed to write file: {e}"))?;
            Ok(path.to_string())
        }
        None => Err("Export cancelled".to_string()),
    }
}
