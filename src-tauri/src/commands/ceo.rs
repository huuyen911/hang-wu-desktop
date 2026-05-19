use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::DbState;

#[derive(Debug, Serialize, Deserialize)]
pub struct Ceo {
    pub id: i64,
    pub ma_ceo: String,
    pub ten_ceo: String,
    pub ceo_cap_tren_id: Option<i64>,
    pub nhan_vien_cham_soc: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CeoBody {
    pub ma_ceo: String,
    pub ten_ceo: String,
    pub ceo_cap_tren_id: Option<i64>,
    pub nhan_vien_cham_soc: String,
}

const SELECT: &str = "SELECT id, ma_ceo, ten_ceo, ceo_cap_tren_id, nhan_vien_cham_soc,
    created_at, updated_at FROM ceo";

fn row_to_ceo(row: &rusqlite::Row<'_>) -> rusqlite::Result<Ceo> {
    Ok(Ceo {
        id: row.get(0)?,
        ma_ceo: row.get(1)?,
        ten_ceo: row.get(2)?,
        ceo_cap_tren_id: row.get(3)?,
        nhan_vien_cham_soc: row.get(4)?,
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
    })
}

fn validate(body: &CeoBody, id: Option<i64>) -> Option<String> {
    if body.ma_ceo.trim().is_empty() {
        return Some("Mã CEO không được để trống".into());
    }
    if body.ten_ceo.trim().is_empty() {
        return Some("Tên CEO không được để trống".into());
    }
    if !["Hằng", "Hiền"].contains(&body.nhan_vien_cham_soc.as_str()) {
        return Some("Nhân viên chăm sóc không hợp lệ".into());
    }
    if let (Some(cap_tren), Some(current_id)) = (body.ceo_cap_tren_id, id) {
        if cap_tren == current_id {
            return Some("CEO không thể là cấp trên của chính mình".into());
        }
    }
    None
}

#[tauri::command]
pub fn list_ceo(state: State<DbState>) -> Result<Vec<Ceo>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(&format!("{} ORDER BY ma_ceo", SELECT))
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], row_to_ceo)
        .map_err(|e| e.to_string())?;
    rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_ceo(state: State<DbState>, data: CeoBody) -> Result<Ceo, String> {
    if let Some(err) = validate(&data, None) {
        return Err(err);
    }
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO ceo (ma_ceo, ten_ceo, ceo_cap_tren_id, nhan_vien_cham_soc)
         VALUES (?1, ?2, ?3, ?4)",
        params![
            data.ma_ceo.trim(),
            data.ten_ceo.trim(),
            data.ceo_cap_tren_id,
            data.nhan_vien_cham_soc,
        ],
    )
    .map_err(|e| {
        if e.to_string().contains("UNIQUE") {
            format!("Mã CEO '{}' đã tồn tại", data.ma_ceo)
        } else {
            e.to_string()
        }
    })?;
    let id = db.last_insert_rowid();
    let mut stmt = db
        .prepare(&format!("{} WHERE id=?1", SELECT))
        .map_err(|e| e.to_string())?;
    stmt.query_row([id], row_to_ceo).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_ceo(state: State<DbState>, id: i64, data: CeoBody) -> Result<Ceo, String> {
    if let Some(err) = validate(&data, Some(id)) {
        return Err(err);
    }
    let db = state.0.lock().map_err(|e| e.to_string())?;
    let n = db
        .execute(
            "UPDATE ceo SET ma_ceo=?1, ten_ceo=?2, ceo_cap_tren_id=?3,
                nhan_vien_cham_soc=?4, updated_at=datetime('now')
             WHERE id=?5",
            params![
                data.ma_ceo.trim(),
                data.ten_ceo.trim(),
                data.ceo_cap_tren_id,
                data.nhan_vien_cham_soc,
                id,
            ],
        )
        .map_err(|e| {
            if e.to_string().contains("UNIQUE") {
                format!("Mã CEO '{}' đã tồn tại", data.ma_ceo)
            } else {
                e.to_string()
            }
        })?;
    if n == 0 {
        return Err("Không tìm thấy CEO".into());
    }
    let mut stmt = db
        .prepare(&format!("{} WHERE id=?1", SELECT))
        .map_err(|e| e.to_string())?;
    stmt.query_row([id], row_to_ceo).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_ceo(state: State<DbState>, id: i64) -> Result<(), String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    let n = db
        .execute("DELETE FROM ceo WHERE id=?1", [id])
        .map_err(|e| e.to_string())?;
    if n == 0 {
        return Err("Không tìm thấy CEO".into());
    }
    Ok(())
}
