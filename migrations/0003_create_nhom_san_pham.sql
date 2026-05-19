CREATE TABLE IF NOT EXISTS nhom_san_pham (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ten_nhom TEXT NOT NULL UNIQUE,
  thuong_hieu TEXT NOT NULL CHECK (thuong_hieu IN ('Weilaiya', 'Elvawell')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS nhom_san_pham_san_pham (
  nhom_san_pham_id INTEGER NOT NULL REFERENCES nhom_san_pham(id) ON DELETE CASCADE,
  san_pham_id INTEGER NOT NULL REFERENCES san_pham(id) ON DELETE CASCADE,
  PRIMARY KEY (nhom_san_pham_id, san_pham_id)
);
