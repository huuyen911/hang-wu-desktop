use calamine::{Data, Reader, Xlsx, open_workbook};
use serde::Deserialize;

use crate::commands::sales_session::SalesRow;

// Column indices (0-based, same as JS parser)
const COL_CEO: usize = 0;
const COL_CEO_NAME: usize = 1;
const COL_PRODUCT: usize = 9;
const COL_PRODUCT_NAME: usize = 10;
const COL_BRAND: usize = 11;
const COL_UNIT: usize = 13;
const COL_INVOICE: usize = 19;
const COL_MONTH: usize = 21;
const COL_QTY: usize = 22;
const COL_UNIT_PRICE: usize = 23;
const COL_AMOUNT: usize = 25;

fn excel_dt_to_date_str(dt: &calamine::ExcelDateTime) -> String {
    if let Some(ndt) = dt.as_datetime() {
        ndt.format("%d/%m/%Y %H:%M:%S").to_string()
    } else {
        excel_serial_to_date_str(dt.as_f64())
    }
}

fn excel_dt_to_month_str(dt: &calamine::ExcelDateTime) -> String {
    if let Some(ndt) = dt.as_datetime() {
        ndt.format("%m/%Y").to_string()
    } else {
        excel_serial_to_date_str(dt.as_f64())
    }
}

fn cell_str(cell: &Data) -> String {
    match cell {
        Data::String(s) => s.trim().to_string(),
        Data::Float(f) => format!("{}", f),
        Data::Int(i) => format!("{}", i),
        Data::Bool(b) => format!("{}", b),
        Data::DateTime(dt) => excel_dt_to_date_str(dt),
        Data::DateTimeIso(s) => s.clone(),
        _ => String::new(),
    }
}

fn cell_to_f64(cell: &Data) -> f64 {
    match cell {
        Data::Float(f) => *f,
        Data::Int(i) => *i as f64,
        Data::String(s) => {
            let cleaned = s.replace(',', ".").replace([' ', '\u{00a0}'], "");
            let cleaned = if cleaned.matches('.').count() > 1 {
                let parts: Vec<&str> = cleaned.rsplitn(2, '.').collect();
                format!("{}.{}", parts[1].replace('.', ""), parts[0])
            } else {
                cleaned
            };
            cleaned.parse().unwrap_or(0.0)
        }
        _ => 0.0,
    }
}

fn parse_qty(cell: &Data) -> Option<f64> {
    match cell {
        Data::Float(f) if f.is_finite() => Some(*f),
        Data::Int(i) => Some(*i as f64),
        Data::String(s) => {
            let t = s.trim();
            if t.is_empty() {
                return None;
            }
            let cleaned = t.replace(',', ".").replace([' ', '\u{00a0}'], "");
            cleaned.parse::<f64>().ok().filter(|f| f.is_finite())
        }
        _ => None,
    }
}

fn excel_serial_to_date_str(serial: f64) -> String {
    let unix_days = serial - 25569.0;
    let secs = (unix_days * 86400.0) as i64;
    use chrono::{DateTime, Utc};
    if let Some(dt) = DateTime::<Utc>::from_timestamp(secs, 0) {
        dt.naive_utc().format("%d/%m/%Y %H:%M:%S").to_string()
    } else {
        String::new()
    }
}

fn format_month(cell: &Data) -> String {
    match cell {
        Data::DateTime(dt) => excel_dt_to_month_str(dt),
        Data::String(s) => {
            let t = s.trim();
            // "T1/2025" → "01/2025"
            if let Some(rest) = t.strip_prefix('T') {
                if let Some((m, y)) = rest.split_once('/') {
                    if let (Ok(month), Ok(_)) = (m.parse::<u32>(), y.parse::<u32>()) {
                        return format!("{:02}/{}", month, y);
                    }
                }
            }
            // "1/2025" or "01/2025"
            if let Some((m, y)) = t.split_once('/') {
                if let (Ok(month), Ok(_)) = (m.parse::<u32>(), y.parse::<u32>()) {
                    return format!("{:02}/{}", month, y);
                }
            }
            t.to_string()
        }
        Data::Float(f) => cell_str(&Data::Float(*f)),
        Data::Int(i) => format!("{}", i),
        _ => String::new(),
    }
}

fn make_row_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let r: u64 = rand::random();
    format!("r_{:x}_{:x}", ts, r & 0xfffffff)
}

fn get(row: &[Data], idx: usize) -> &Data {
    row.get(idx).unwrap_or(&Data::Empty)
}

fn is_data_row(row: &[Data]) -> bool {
    let ceo = get(row, COL_CEO);
    let brand = get(row, COL_BRAND);
    let qty = get(row, COL_QTY);
    !cell_str(ceo).is_empty() && !cell_str(brand).is_empty() && parse_qty(qty).is_some()
}

fn parse_sheet(sheet: &calamine::Range<Data>) -> Vec<SalesRow> {
    let mut result = Vec::new();
    for row in sheet.rows() {
        if !is_data_row(row) {
            continue;
        }
        let ceo = cell_str(get(row, COL_CEO));
        let brand = cell_str(get(row, COL_BRAND));
        let product = cell_str(get(row, COL_PRODUCT));
        if ceo.is_empty() || brand.is_empty() || product.is_empty() {
            continue;
        }
        result.push(SalesRow {
            id: make_row_id(),
            ceo,
            ceo_name: cell_str(get(row, COL_CEO_NAME)),
            brand,
            product_code: product,
            product_name: cell_str(get(row, COL_PRODUCT_NAME)),
            unit: cell_str(get(row, COL_UNIT)),
            invoice: cell_str(get(row, COL_INVOICE)),
            month: format_month(get(row, COL_MONTH)),
            date: match get(row, COL_MONTH) {
                Data::DateTime(dt) => excel_dt_to_date_str(dt),
                Data::Float(f) => excel_serial_to_date_str(*f),
                _ => String::new(),
            },
            qty: parse_qty(get(row, COL_QTY)).unwrap_or(0.0),
            unit_price: cell_to_f64(get(row, COL_UNIT_PRICE)),
            amount: cell_to_f64(get(row, COL_AMOUNT)),
        });
    }
    result
}

#[tauri::command]
pub fn parse_excel_file(path: String) -> Result<Vec<SalesRow>, String> {
    let mut workbook: Xlsx<_> =
        open_workbook(&path).map_err(|e| format!("Không mở được file: {}", e))?;
    let sheet = workbook
        .worksheet_range_at(0)
        .ok_or("File không có sheet nào")?
        .map_err(|e| format!("Lỗi đọc sheet: {}", e))?;
    Ok(parse_sheet(&sheet))
}

#[tauri::command]
pub fn parse_excel_bytes(bytes: Vec<u8>) -> Result<Vec<SalesRow>, String> {
    use std::io::Cursor;
    let cursor = Cursor::new(bytes);
    let mut workbook: Xlsx<_> =
        Xlsx::new(cursor).map_err(|e| format!("Không mở được file: {}", e))?;
    let sheet = workbook
        .worksheet_range_at(0)
        .ok_or("File không có sheet nào")?
        .map_err(|e| format!("Lỗi đọc sheet: {}", e))?;
    Ok(parse_sheet(&sheet))
}

// ─── Excel export ────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct ExportRow {
    pub ceo: String,
    pub ceo_name: String,
    pub brand: String,
    pub product_code: String,
    pub product_name: String,
    pub unit: String,
    pub invoice: String,
    pub month: String,
    pub qty: f64,
    pub unit_price: f64,
    pub amount: f64,
}

#[tauri::command]
pub fn export_excel_file(path: String, rows: Vec<ExportRow>) -> Result<(), String> {
    use rust_xlsxwriter::*;

    let mut workbook = Workbook::new();
    let sheet = workbook.add_worksheet();

    let headers = [
        "CEO", "Tên CEO", "Thương hiệu", "Mã SP", "Tên SP",
        "ĐVT", "Hóa đơn", "Tháng", "Số lượng", "Đơn giá", "Thành tiền",
    ];
    for (i, h) in headers.iter().enumerate() {
        sheet.write(0, i as u16, *h).map_err(|e| e.to_string())?;
    }

    for (r, row) in rows.iter().enumerate() {
        let r = (r + 1) as u32;
        sheet.write(r, 0, &row.ceo).map_err(|e| e.to_string())?;
        sheet.write(r, 1, &row.ceo_name).map_err(|e| e.to_string())?;
        sheet.write(r, 2, &row.brand).map_err(|e| e.to_string())?;
        sheet.write(r, 3, &row.product_code).map_err(|e| e.to_string())?;
        sheet.write(r, 4, &row.product_name).map_err(|e| e.to_string())?;
        sheet.write(r, 5, &row.unit).map_err(|e| e.to_string())?;
        sheet.write(r, 6, &row.invoice).map_err(|e| e.to_string())?;
        sheet.write(r, 7, &row.month).map_err(|e| e.to_string())?;
        sheet.write(r, 8, row.qty).map_err(|e| e.to_string())?;
        sheet.write(r, 9, row.unit_price).map_err(|e| e.to_string())?;
        sheet.write(r, 10, row.amount).map_err(|e| e.to_string())?;
    }

    workbook.save(&path).map_err(|e| e.to_string())
}
