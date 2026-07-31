use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;

use crate::DbState;

const FORMAT: &str = "hang-wu-backup";
const VERSION: u32 = 1;

#[derive(Debug, Serialize, Deserialize)]
struct BackupFile {
    format: String,
    version: u32,
    app_version: String,
    exported_at: String,
    tables: BackupTables,
}

#[derive(Debug, Serialize, Deserialize)]
struct BackupTables {
    san_pham: Vec<Value>,
    ceo: Vec<Value>,
    nhom_san_pham: Vec<Value>,
    nhom_san_pham_san_pham: Vec<Value>,
    sales_session: Vec<Value>,
}

fn now_iso() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    // Simple ISO-like format
    let naive = chrono::DateTime::from_timestamp(secs as i64, 0)
        .map(|d| d.naive_utc())
        .unwrap_or_default();
    naive.format("%Y-%m-%dT%H:%M:%SZ").to_string()
}

fn dump_table(db: &rusqlite::Connection, table: &str) -> Result<Vec<Value>, String> {
    let mut stmt = db
        .prepare(&format!("SELECT * FROM {}", table))
        .map_err(|e| e.to_string())?;
    let cols: Vec<String> = stmt
        .column_names()
        .into_iter()
        .map(|s| s.to_string())
        .collect();
    let rows = stmt
        .query_map([], |row| {
            let mut map = serde_json::Map::new();
            for (i, col) in cols.iter().enumerate() {
                let val: Value = match row.get_ref(i)? {
                    rusqlite::types::ValueRef::Null => Value::Null,
                    rusqlite::types::ValueRef::Integer(n) => Value::from(n),
                    rusqlite::types::ValueRef::Real(f) => Value::from(f),
                    rusqlite::types::ValueRef::Text(s) => {
                        Value::String(String::from_utf8_lossy(s).into_owned())
                    }
                    rusqlite::types::ValueRef::Blob(b) => {
                        Value::String(base64_encode(b))
                    }
                };
                map.insert(col.clone(), val);
            }
            Ok(Value::Object(map))
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|e| e.to_string())
}

fn base64_encode(data: &[u8]) -> String {
    // Simple base64 without external deps
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::new();
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = chunk.get(1).copied().unwrap_or(0) as u32;
        let b2 = chunk.get(2).copied().unwrap_or(0) as u32;
        let n = (b0 << 16) | (b1 << 8) | b2;
        out.push(CHARS[((n >> 18) & 63) as usize] as char);
        out.push(CHARS[((n >> 12) & 63) as usize] as char);
        out.push(if chunk.len() > 1 { CHARS[((n >> 6) & 63) as usize] as char } else { '=' });
        out.push(if chunk.len() > 2 { CHARS[(n & 63) as usize] as char } else { '=' });
    }
    out
}

/// Dựng JSON sao lưu từ một connection đang giữ sẵn. Tách khỏi command
/// `build_backup` để đường sao lưu lên cloud tái dùng được cùng một định dạng.
pub fn build_backup_json(
    db: &rusqlite::Connection,
    app_version: &str,
) -> Result<String, String> {
    let backup = BackupFile {
        format: FORMAT.into(),
        version: VERSION,
        app_version: app_version.to_string(),
        exported_at: now_iso(),
        tables: BackupTables {
            san_pham: dump_table(db, "san_pham")?,
            ceo: dump_table(db, "ceo")?,
            nhom_san_pham: dump_table(db, "nhom_san_pham")?,
            nhom_san_pham_san_pham: dump_table(db, "nhom_san_pham_san_pham")?,
            sales_session: dump_table(db, "sales_session")?,
        },
    };
    serde_json::to_string_pretty(&backup).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn build_backup(state: State<DbState>, app_version: String) -> Result<String, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    build_backup_json(&db, &app_version)
}

#[tauri::command]
pub fn write_backup_file(path: String, content: String) -> Result<(), String> {
    // Atomic write via temp file
    let tmp = format!("{}.tmp", path);
    std::fs::write(&tmp, content.as_bytes()).map_err(|e| e.to_string())?;
    std::fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_backup_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn restore_backup(state: State<DbState>, json: String) -> Result<RestoredCounts, String> {
    let backup: BackupFile =
        serde_json::from_str(&json).map_err(|_| "File backup không hợp lệ".to_string())?;

    if backup.format != FORMAT {
        return Err("Không phải file backup của ứng dụng này".into());
    }
    if backup.version != VERSION {
        return Err(format!("Phiên bản backup không tương thích ({})", backup.version));
    }

    let db = state.0.lock().map_err(|e| e.to_string())?;

    db.execute_batch(
        "BEGIN;
         PRAGMA defer_foreign_keys=ON;
         DELETE FROM nhom_san_pham_san_pham;
         DELETE FROM nhom_san_pham;
         DELETE FROM san_pham;
         DELETE FROM ceo;
         DELETE FROM sales_session;",
    )
    .map_err(|e| e.to_string())?;

    let result: Result<RestoredCounts, String> = (|| {
        restore_table(&db, "san_pham", &backup.tables.san_pham)?;
        restore_table(&db, "ceo", &backup.tables.ceo)?;
        restore_table(&db, "nhom_san_pham", &backup.tables.nhom_san_pham)?;
        restore_table(&db, "nhom_san_pham_san_pham", &backup.tables.nhom_san_pham_san_pham)?;
        restore_table(&db, "sales_session", &backup.tables.sales_session)?;

        Ok(RestoredCounts {
            san_pham: backup.tables.san_pham.len(),
            ceo: backup.tables.ceo.len(),
            nhom_san_pham: backup.tables.nhom_san_pham.len(),
            sales_session: backup.tables.sales_session.len(),
        })
    })();

    match &result {
        Ok(_) => db.execute_batch("COMMIT").map_err(|e| e.to_string())?,
        Err(_) => { let _ = db.execute_batch("ROLLBACK"); }
    }

    result
}

fn restore_table(
    db: &rusqlite::Connection,
    table: &str,
    rows: &[Value],
) -> Result<(), String> {
    if rows.is_empty() {
        return Ok(());
    }
    let cols: Vec<String> = rows[0]
        .as_object()
        .ok_or("Invalid row")?
        .keys()
        .cloned()
        .collect();
    let placeholders: Vec<String> = (1..=cols.len()).map(|i| format!("?{}", i)).collect();
    let sql = format!(
        "INSERT INTO {} ({}) VALUES ({})",
        table,
        cols.join(", "),
        placeholders.join(", ")
    );

    for row in rows {
        let obj = row.as_object().ok_or("Invalid row")?;
        let vals: Vec<rusqlite::types::Value> = cols
            .iter()
            .map(|c| json_to_sql(obj.get(c).unwrap_or(&Value::Null)))
            .collect();
        db.execute(&sql, rusqlite::params_from_iter(vals.iter()))
            .map_err(|e| format!("Restore {}: {}", table, e))?;
    }
    Ok(())
}

fn json_to_sql(v: &Value) -> rusqlite::types::Value {
    match v {
        Value::Null => rusqlite::types::Value::Null,
        Value::Bool(b) => rusqlite::types::Value::Integer(*b as i64),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                rusqlite::types::Value::Integer(i)
            } else if let Some(f) = n.as_f64() {
                rusqlite::types::Value::Real(f)
            } else {
                rusqlite::types::Value::Null
            }
        }
        Value::String(s) => rusqlite::types::Value::Text(s.clone()),
        _ => rusqlite::types::Value::Text(v.to_string()),
    }
}

#[derive(Debug, Serialize)]
pub struct RestoredCounts {
    pub san_pham: usize,
    pub ceo: usize,
    pub nhom_san_pham: usize,
    pub sales_session: usize,
}
