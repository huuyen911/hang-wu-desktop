use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::DbState;

#[derive(Debug, Serialize, Deserialize)]
pub struct SanPham {
    pub id: i64,
    pub ma_san_pham: String,
    pub ten_san_pham: String,
    pub quy_cach: i64,
    pub thuong_hieu: String,
    pub la_san_pham_chinh_weilaiya: bool,
    pub la_san_pham_chinh_elvawell: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct SanPhamBody {
    pub ma_san_pham: String,
    pub ten_san_pham: String,
    pub quy_cach: i64,
    pub thuong_hieu: String,
    pub la_san_pham_chinh_weilaiya: bool,
    pub la_san_pham_chinh_elvawell: bool,
}

const LIST_SQL: &str = "SELECT id, ma_san_pham, ten_san_pham, quy_cach, thuong_hieu,
    la_san_pham_chinh_weilaiya, la_san_pham_chinh_elvawell, created_at, updated_at
    FROM san_pham ORDER BY thuong_hieu, ma_san_pham";

fn row_to_san_pham(row: &rusqlite::Row<'_>) -> rusqlite::Result<SanPham> {
    Ok(SanPham {
        id: row.get(0)?,
        ma_san_pham: row.get(1)?,
        ten_san_pham: row.get(2)?,
        quy_cach: row.get(3)?,
        thuong_hieu: row.get(4)?,
        la_san_pham_chinh_weilaiya: row.get::<_, i64>(5)? != 0,
        la_san_pham_chinh_elvawell: row.get::<_, i64>(6)? != 0,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

fn validate(body: &SanPhamBody) -> Option<String> {
    if body.ma_san_pham.trim().is_empty() {
        return Some("Mã sản phẩm không được để trống".into());
    }
    if body.ten_san_pham.trim().is_empty() {
        return Some("Tên sản phẩm không được để trống".into());
    }
    if body.quy_cach <= 0 {
        return Some("Quy cách phải lớn hơn 0".into());
    }
    if !["Weilaiya", "Elvawell"].contains(&body.thuong_hieu.as_str()) {
        return Some("Thương hiệu không hợp lệ".into());
    }
    None
}

/// Lấy toàn bộ sản phẩm từ một connection đang giữ sẵn. Tách khỏi command
/// `list_san_pham` để tính năng "Chốt phiên" tái dùng được khi đã giữ mutex
/// (không thể gọi lại command list_* vì sẽ deadlock).
pub fn fetch_all(db: &rusqlite::Connection) -> Result<Vec<SanPham>, String> {
    let mut stmt = db.prepare(LIST_SQL).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], row_to_san_pham)
        .map_err(|e| e.to_string())?;
    rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_san_pham(state: State<DbState>) -> Result<Vec<SanPham>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    fetch_all(&db)
}

#[tauri::command]
pub fn create_san_pham(
    state: State<DbState>,
    data: SanPhamBody,
) -> Result<SanPham, String> {
    if let Some(err) = validate(&data) {
        return Err(err);
    }
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO san_pham (ma_san_pham, ten_san_pham, quy_cach, thuong_hieu,
            la_san_pham_chinh_weilaiya, la_san_pham_chinh_elvawell)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            data.ma_san_pham.trim(),
            data.ten_san_pham.trim(),
            data.quy_cach,
            data.thuong_hieu,
            data.la_san_pham_chinh_weilaiya as i64,
            data.la_san_pham_chinh_elvawell as i64,
        ],
    )
    .map_err(|e| {
        if e.to_string().contains("UNIQUE") {
            format!("Mã sản phẩm '{}' đã tồn tại", data.ma_san_pham)
        } else {
            e.to_string()
        }
    })?;
    let id = db.last_insert_rowid();
    let mut stmt = db.prepare(&format!("{} WHERE id = ?1", LIST_SQL.replace("ORDER BY thuong_hieu, ma_san_pham", ""))).map_err(|e| e.to_string())?;
    stmt.query_row([id], row_to_san_pham).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_san_pham(
    state: State<DbState>,
    id: i64,
    data: SanPhamBody,
) -> Result<SanPham, String> {
    if let Some(err) = validate(&data) {
        return Err(err);
    }
    let db = state.0.lock().map_err(|e| e.to_string())?;
    let n = db
        .execute(
            "UPDATE san_pham SET ma_san_pham=?1, ten_san_pham=?2, quy_cach=?3,
                thuong_hieu=?4, la_san_pham_chinh_weilaiya=?5, la_san_pham_chinh_elvawell=?6,
                updated_at=datetime('now')
             WHERE id=?7",
            params![
                data.ma_san_pham.trim(),
                data.ten_san_pham.trim(),
                data.quy_cach,
                data.thuong_hieu,
                data.la_san_pham_chinh_weilaiya as i64,
                data.la_san_pham_chinh_elvawell as i64,
                id,
            ],
        )
        .map_err(|e| {
            if e.to_string().contains("UNIQUE") {
                format!("Mã sản phẩm '{}' đã tồn tại", data.ma_san_pham)
            } else {
                e.to_string()
            }
        })?;
    if n == 0 {
        return Err("Không tìm thấy sản phẩm".into());
    }
    let mut stmt = db
        .prepare("SELECT id, ma_san_pham, ten_san_pham, quy_cach, thuong_hieu,
            la_san_pham_chinh_weilaiya, la_san_pham_chinh_elvawell, created_at, updated_at
            FROM san_pham WHERE id=?1")
        .map_err(|e| e.to_string())?;
    stmt.query_row([id], row_to_san_pham).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_san_pham(state: State<DbState>, id: i64) -> Result<(), String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    let n = db
        .execute("DELETE FROM san_pham WHERE id=?1", [id])
        .map_err(|e| e.to_string())?;
    if n == 0 {
        return Err("Không tìm thấy sản phẩm".into());
    }
    Ok(())
}
