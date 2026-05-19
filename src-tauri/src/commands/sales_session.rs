use rusqlite::params;
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

fn row_to_session(row: &rusqlite::Row<'_>) -> rusqlite::Result<SalesSession> {
    Ok(SalesSession {
        id: row.get(0)?,
        ten: row.get(1)?,
        file_name: row.get(2)?,
        row_count: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}

#[tauri::command]
pub fn list_sales_session(state: State<DbState>) -> Result<Vec<SalesSession>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(
            "SELECT id, ten, file_name, row_count, created_at, updated_at
             FROM sales_session ORDER BY created_at DESC",
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
    let mut stmt = db
        .prepare(
            "SELECT id, ten, file_name, row_count, data, created_at, updated_at
             FROM sales_session WHERE id=?1",
        )
        .map_err(|e| e.to_string())?;
    stmt.query_row([id], |row| {
        let data_json: String = row.get(4)?;
        Ok((
            row.get::<_, i64>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, i64>(3)?,
            data_json,
            row.get::<_, String>(5)?,
            row.get::<_, String>(6)?,
        ))
    })
    .map_err(|_| "Không tìm thấy phiên".to_string())
    .and_then(|(id, ten, file_name, row_count, data_json, created_at, updated_at)| {
        let rows: Vec<SalesRow> =
            serde_json::from_str(&data_json).map_err(|e| e.to_string())?;
        Ok(SalesSessionDetail {
            id,
            ten,
            file_name,
            row_count,
            rows,
            created_at,
            updated_at,
        })
    })
}

#[tauri::command]
pub fn create_sales_session(
    state: State<DbState>,
    data: CreateSessionBody,
) -> Result<SalesSession, String> {
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
            "SELECT id, ten, file_name, row_count, created_at, updated_at
             FROM sales_session WHERE id=?1",
        )
        .map_err(|e| e.to_string())?;
    stmt.query_row([id], row_to_session).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_sales_session(
    state: State<DbState>,
    id: i64,
    data: UpdateSessionBody,
) -> Result<SalesSession, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
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
            "SELECT id, ten, file_name, row_count, created_at, updated_at
             FROM sales_session WHERE id=?1",
        )
        .map_err(|e| e.to_string())?;
    stmt.query_row([id], row_to_session)
        .map_err(|_| "Không tìm thấy phiên".to_string())
}

#[tauri::command]
pub fn delete_sales_session(state: State<DbState>, id: i64) -> Result<(), String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    let n = db
        .execute("DELETE FROM sales_session WHERE id=?1", [id])
        .map_err(|e| e.to_string())?;
    if n == 0 {
        return Err("Không tìm thấy phiên".into());
    }
    Ok(())
}
