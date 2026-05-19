CREATE TABLE IF NOT EXISTS san_pham (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ma_san_pham TEXT NOT NULL UNIQUE,
  ten_san_pham TEXT NOT NULL,
  quy_cach INTEGER NOT NULL,
  thuong_hieu TEXT NOT NULL CHECK (thuong_hieu IN ('Weilaiya', 'Elvawell')),
  la_san_pham_chinh_weilaiya INTEGER NOT NULL DEFAULT 0,
  la_san_pham_chinh_elvawell INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
