-- Mỗi lần import file Excel ở màn Báo cáo bán hàng = 1 phiên lịch sử.
-- Dữ liệu các dòng (SalesRow[]) lưu nguyên dạng JSON trong cột `data` —
-- single-user, dữ liệu vừa phải nên không cần chuẩn hoá thành bảng con.
CREATE TABLE IF NOT EXISTS sales_session (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ten TEXT NOT NULL,
  file_name TEXT NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_sales_session_created
  ON sales_session (created_at DESC);
