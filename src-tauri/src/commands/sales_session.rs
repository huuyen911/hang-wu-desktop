use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::DbState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SalesRow {
    pub id: String,
    pub ceo: String,
    #[serde(rename = "ceoName")]
    pub ceo_name: String,
    pub brand: String,
    #[serde(rename = "productCode")]
    pub product_code: String,
    #[serde(rename = "productName")]
    pub product_name: String,
    pub unit: String,
    pub invoice: String,
    pub month: String,
    pub date: String,
    pub qty: f64,
    #[serde(rename = "unitPrice")]
    pub unit_price: f64,
    pub amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SalesSession {
    pub id: i64,
    pub ten: String,
    pub file_name: String,
    pub row_count: i64,
    pub created_at: String,
    pub updated_at: String,
    /// NULL = chưa chốt; có giá trị = mốc thời gian chốt phiên.
    pub locked_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SalesSessionDetail {
    pub id: i64,
    pub ten: String,
    pub file_name: String,
    pub row_count: i64,
    pub rows: Vec<SalesRow>,
    pub created_at: String,
    pub updated_at: String,
    /// NULL = chưa chốt; có giá trị = mốc thời gian chốt phiên.
    pub locked_at: Option<String>,
    /// Snapshot master data {san_pham, ceo, nhom_san_pham} lúc chốt; NULL khi
    /// chưa chốt.
    pub master_snapshot: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSessionBody {
    pub ten: String,
    pub file_name: String,
    pub rows: Vec<SalesRow>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSessionBody {
    pub ten: Option<String>,
    pub rows: Option<Vec<SalesRow>>,
}

// ⚠️ row_to_session dùng chung bởi list / create-meta / update-meta — cả 3 câu
// SELECT feed vào nó PHẢI chọn đúng thứ tự cột: id, ten, file_name, row_count,
// created_at, updated_at, locked_at.
fn row_to_session(row: &rusqlite::Row<'_>) -> rusqlite::Result<SalesSession> {
    Ok(SalesSession {
        id: row.get(0)?,
        ten: row.get(1)?,
        file_name: row.get(2)?,
        row_count: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
        locked_at: row.get(6)?,
    })
}

#[tauri::command]
pub fn list_sales_session(state: State<DbState>) -> Result<Vec<SalesSession>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(
            "SELECT id, ten, file_name, row_count, created_at, updated_at, locked_at
             FROM sales_session ORDER BY updated_at DESC, id DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], row_to_session).map_err(|e| e.to_string())?;
    rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_sales_session(
    state: State<DbState>,
    id: i64,
) -> Result<SalesSessionDetail, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    read_detail(&db, id)
}

/// Đọc chi tiết 1 phiên (kèm rows + lock state + master_snapshot) từ một
/// connection đang giữ sẵn. Tái dùng cho get / lock / unlock.
fn read_detail(db: &rusqlite::Connection, id: i64) -> Result<SalesSessionDetail, String> {
    let mut stmt = db
        .prepare(
            "SELECT id, ten, file_name, row_count, data, created_at, updated_at,
                    locked_at, master_snapshot
             FROM sales_session WHERE id=?1",
        )
        .map_err(|e| e.to_string())?;
    stmt.query_row([id], |row| {
        let data_json: String = row.get(4)?;
        let snapshot_json: Option<String> = row.get(8)?;
        Ok((
            row.get::<_, i64>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, i64>(3)?,
            data_json,
            row.get::<_, String>(5)?,
            row.get::<_, String>(6)?,
            row.get::<_, Option<String>>(7)?,
            snapshot_json,
        ))
    })
    .map_err(|_| "Không tìm thấy phiên".to_string())
    .and_then(
        |(id, ten, file_name, row_count, data_json, created_at, updated_at, locked_at, snapshot_json)| {
            let rows: Vec<SalesRow> =
                serde_json::from_str(&data_json).map_err(|e| e.to_string())?;
            let master_snapshot: Option<serde_json::Value> = match snapshot_json {
                Some(s) => Some(serde_json::from_str(&s).map_err(|e| e.to_string())?),
                None => None,
            };
            Ok(SalesSessionDetail {
                id,
                ten,
                file_name,
                row_count,
                rows,
                created_at,
                updated_at,
                locked_at,
                master_snapshot,
            })
        },
    )
}

#[tauri::command]
pub fn create_sales_session(
    state: State<DbState>,
    data: CreateSessionBody,
) -> Result<SalesSessionDetail, String> {
    let row_count = data.rows.len() as i64;
    let data_json = serde_json::to_string(&data.rows).map_err(|e| e.to_string())?;
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO sales_session (ten, file_name, row_count, data)
         VALUES (?1, ?2, ?3, ?4)",
        params![data.ten.trim(), data.file_name, row_count, data_json],
    )
    .map_err(|e| e.to_string())?;
    let id = db.last_insert_rowid();
    let mut stmt = db
        .prepare(
            "SELECT id, ten, file_name, row_count, created_at, updated_at, locked_at
             FROM sales_session WHERE id=?1",
        )
        .map_err(|e| e.to_string())?;
    let meta = stmt
        .query_row([id], row_to_session)
        .map_err(|e| e.to_string())?;
    // Phiên mới luôn chưa chốt → gán thẳng locked_at/master_snapshot = None.
    Ok(SalesSessionDetail {
        id: meta.id,
        ten: meta.ten,
        file_name: meta.file_name,
        row_count: meta.row_count,
        rows: data.rows,
        created_at: meta.created_at,
        updated_at: meta.updated_at,
        locked_at: None,
        master_snapshot: None,
    })
}

#[tauri::command]
pub fn update_sales_session(
    state: State<DbState>,
    id: i64,
    data: UpdateSessionBody,
) -> Result<SalesSession, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    // Guard: phiên đã chốt thì khóa hoàn toàn — chặn cả đổi tên (ten) lẫn sửa
    // dòng (rows). Phải hủy chốt trước khi sửa.
    if is_locked(&db, id)? {
        return Err("Phiên đã chốt — hãy hủy chốt trước khi sửa".into());
    }
    if let Some(ten) = &data.ten {
        db.execute(
            "UPDATE sales_session SET ten=?1, updated_at=datetime('now','localtime') WHERE id=?2",
            params![ten.trim(), id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(rows) = &data.rows {
        let row_count = rows.len() as i64;
        let data_json = serde_json::to_string(rows).map_err(|e| e.to_string())?;
        db.execute(
            "UPDATE sales_session SET data=?1, row_count=?2,
                updated_at=datetime('now','localtime') WHERE id=?3",
            params![data_json, row_count, id],
        )
        .map_err(|e| e.to_string())?;
    }
    let mut stmt = db
        .prepare(
            "SELECT id, ten, file_name, row_count, created_at, updated_at, locked_at
             FROM sales_session WHERE id=?1",
        )
        .map_err(|e| e.to_string())?;
    stmt.query_row([id], row_to_session)
        .map_err(|_| "Không tìm thấy phiên".to_string())
}

#[tauri::command]
pub fn delete_sales_session(state: State<DbState>, id: i64) -> Result<(), String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    // Guard: không xóa phiên đã chốt — phải hủy chốt trước.
    if is_locked(&db, id)? {
        return Err("Phiên đã chốt — hãy hủy chốt trước khi xóa".into());
    }
    let n = db
        .execute("DELETE FROM sales_session WHERE id=?1", [id])
        .map_err(|e| e.to_string())?;
    if n == 0 {
        return Err("Không tìm thấy phiên".into());
    }
    Ok(())
}

/// True nếu phiên đang ở trạng thái đã chốt (locked_at IS NOT NULL).
/// Phiên không tồn tại → false (để command sau trả lỗi "không tìm thấy" rõ ràng
/// hơn, hoặc no-op với delete).
fn is_locked(db: &rusqlite::Connection, id: i64) -> Result<bool, String> {
    let locked: Option<Option<String>> = db
        .query_row(
            "SELECT locked_at FROM sales_session WHERE id=?1",
            [id],
            |row| row.get::<_, Option<String>>(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;
    Ok(matches!(locked, Some(Some(_))))
}

/// Chốt phiên: chụp master data (san_pham, ceo, nhom_san_pham) tại thời điểm
/// hiện tại vào cột master_snapshot và ghi mốc thời gian vào locked_at.
/// ⚠️ Cố ý KHÔNG set updated_at — chốt không phải sửa dữ liệu nên không làm
/// phiên nhảy vị trí trên list (sort updated_at DESC).
#[tauri::command]
pub fn lock_sales_session(
    state: State<DbState>,
    id: i64,
) -> Result<SalesSessionDetail, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    // Build snapshot từ master data hiện tại (dùng fetch_all vì đã giữ mutex).
    let snapshot = serde_json::json!({
        "san_pham": crate::commands::san_pham::fetch_all(&db)?,
        "ceo": crate::commands::ceo::fetch_all(&db)?,
        "nhom_san_pham": crate::commands::nhom_san_pham::fetch_all(&db)?,
    });
    let snapshot_json = serde_json::to_string(&snapshot).map_err(|e| e.to_string())?;
    let n = db
        .execute(
            "UPDATE sales_session
             SET locked_at=datetime('now','localtime'), master_snapshot=?1
             WHERE id=?2",
            params![snapshot_json, id],
        )
        .map_err(|e| e.to_string())?;
    if n == 0 {
        return Err("Không tìm thấy phiên".into());
    }
    read_detail(&db, id)
}

/// Hủy chốt: xóa snapshot + cờ chốt → phiên quay về chế độ động (live).
/// ⚠️ Cố ý KHÔNG set updated_at (xem lý do ở lock_sales_session).
#[tauri::command]
pub fn unlock_sales_session(
    state: State<DbState>,
    id: i64,
) -> Result<SalesSessionDetail, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    let n = db
        .execute(
            "UPDATE sales_session SET locked_at=NULL, master_snapshot=NULL WHERE id=?1",
            [id],
        )
        .map_err(|e| e.to_string())?;
    if n == 0 {
        return Err("Không tìm thấy phiên".into());
    }
    read_detail(&db, id)
}
