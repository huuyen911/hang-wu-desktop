-- Chốt phiên: đông cứng số liệu báo cáo theo master data tại thời điểm chốt.
ALTER TABLE sales_session ADD COLUMN locked_at TEXT;        -- NULL = chưa chốt; có giá trị = mốc thời gian chốt
ALTER TABLE sales_session ADD COLUMN master_snapshot TEXT;  -- JSON {san_pham, ceo, nhom_san_pham} lúc chốt; NULL khi chưa chốt
