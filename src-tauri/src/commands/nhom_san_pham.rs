use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::DbState;

#[derive(Debug, Serialize, Deserialize)]
pub struct NhomSanPham {
    pub id: i64,
    pub ten_nhom: String,
    pub thuong_hieu: String,
    pub san_pham_ids: Vec<i64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NhomSanPhamBody {
    pub ten_nhom: String,
    pub thuong_hieu: String,
    pub san_pham_ids: Vec<i64>,
}

const LIST_SQL: &str = "SELECT n.id, n.ten_nhom, n.thuong_hieu, n.created_at, n.updated_at,
    COALESCE(json_group_array(j.san_pham_id) FILTER (WHERE j.san_pham_id IS NOT NULL), '[]') as ids
    FROM nhom_san_pham n
    LEFT JOIN nhom_san_pham_san_pham j ON j.nhom_san_pham_id = n.id
    GROUP BY n.id ORDER BY n.thuong_hieu, n.ten_nhom";

fn row_to_nhom(row: &rusqlite::Row<'_>) -> rusqlite::Result<NhomSanPham> {
    let ids_json: String = row.get(5)?;
    let san_pham_ids: Vec<i64> = serde_json::from_str(&ids_json).unwrap_or_default();
    Ok(NhomSanPham {
        id: row.get(0)?,
        ten_nhom: row.get(1)?,
        thuong_hieu: row.get(2)?,
        created_at: row.get(3)?,
        updated_at: row.get(4)?,
        san_pham_ids,
    })
}

fn validate(body: &NhomSanPhamBody) -> Option<String> {
    if body.ten_nhom.trim().is_empty() {
        return Some("Tên nhóm không được để trống".into());
    }
    if !["Weilaiya", "Elvawell"].contains(&body.thuong_hieu.as_str()) {
        return Some("Thương hiệu không hợp lệ".into());
    }
    None
}

fn sync_members(
    db: &rusqlite::Connection,
    nhom_id: i64,
    san_pham_ids: &[i64],
) -> rusqlite::Result<()> {
    db.execute(
        "DELETE FROM nhom_san_pham_san_pham WHERE nhom_san_pham_id=?1",
        [nhom_id],
    )?;
    for sp_id in san_pham_ids {
        db.execute(
            "INSERT OR IGNORE INTO nhom_san_pham_san_pham (nhom_san_pham_id, san_pham_id)
             VALUES (?1, ?2)",
            params![nhom_id, sp_id],
        )?;
    }
    Ok(())
}

fn get_by_id(db: &rusqlite::Connection, id: i64) -> Result<NhomSanPham, String> {
    let sql = format!(
        "SELECT n.id, n.ten_nhom, n.thuong_hieu, n.created_at, n.updated_at,
            COALESCE(json_group_array(j.san_pham_id) FILTER (WHERE j.san_pham_id IS NOT NULL), '[]')
         FROM nhom_san_pham n
         LEFT JOIN nhom_san_pham_san_pham j ON j.nhom_san_pham_id = n.id
         WHERE n.id = {}
         GROUP BY n.id",
        id
    );
    let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
    stmt.query_row([], row_to_nhom).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_nhom_san_pham(state: State<DbState>) -> Result<Vec<NhomSanPham>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare(LIST_SQL).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], row_to_nhom).map_err(|e| e.to_string())?;
    rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_nhom_san_pham(
    state: State<DbState>,
    data: NhomSanPhamBody,
) -> Result<NhomSanPham, String> {
    if let Some(err) = validate(&data) {
        return Err(err);
    }
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO nhom_san_pham (ten_nhom, thuong_hieu) VALUES (?1, ?2)",
        params![data.ten_nhom.trim(), data.thuong_hieu],
    )
    .map_err(|e| {
        if e.to_string().contains("UNIQUE") {
            format!("Tên nhóm '{}' đã tồn tại", data.ten_nhom)
        } else {
            e.to_string()
        }
    })?;
    let id = db.last_insert_rowid();
    sync_members(&db, id, &data.san_pham_ids).map_err(|e| e.to_string())?;
    get_by_id(&db, id)
}

#[tauri::command]
pub fn update_nhom_san_pham(
    state: State<DbState>,
    id: i64,
    data: NhomSanPhamBody,
) -> Result<NhomSanPham, String> {
    if let Some(err) = validate(&data) {
        return Err(err);
    }
    let db = state.0.lock().map_err(|e| e.to_string())?;
    let n = db
        .execute(
            "UPDATE nhom_san_pham SET ten_nhom=?1, thuong_hieu=?2, updated_at=datetime('now')
             WHERE id=?3",
            params![data.ten_nhom.trim(), data.thuong_hieu, id],
        )
        .map_err(|e| {
            if e.to_string().contains("UNIQUE") {
                format!("Tên nhóm '{}' đã tồn tại", data.ten_nhom)
            } else {
                e.to_string()
            }
        })?;
    if n == 0 {
        return Err("Không tìm thấy nhóm sản phẩm".into());
    }
    sync_members(&db, id, &data.san_pham_ids).map_err(|e| e.to_string())?;
    get_by_id(&db, id)
}

#[tauri::command]
pub fn delete_nhom_san_pham(state: State<DbState>, id: i64) -> Result<(), String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    let n = db
        .execute("DELETE FROM nhom_san_pham WHERE id=?1", [id])
        .map_err(|e| e.to_string())?;
    if n == 0 {
        return Err("Không tìm thấy nhóm sản phẩm".into());
    }
    Ok(())
}
