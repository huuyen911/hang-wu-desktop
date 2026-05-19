CREATE TABLE IF NOT EXISTS ceo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ma_ceo TEXT NOT NULL UNIQUE,
  ten_ceo TEXT NOT NULL,
  ceo_cap_tren_id INTEGER REFERENCES ceo(id) ON DELETE SET NULL,
  nhan_vien_cham_soc TEXT NOT NULL CHECK (nhan_vien_cham_soc IN ('Hằng', 'Hiền')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
