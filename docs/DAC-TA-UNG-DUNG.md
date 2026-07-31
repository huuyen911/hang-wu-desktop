# Tài liệu đặc tả — Hằng Wonder Union Desktop

| Mục | Giá trị |
|---|---|
| Tên sản phẩm | **Hằng Wonder Union** (`productName`: `Hang Wonder Union`) |
| Định danh ứng dụng | `com.hangwu.desktop` |
| Phiên bản tại thời điểm đặc tả | `0.1.5` (`package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` — cả ba phải trùng nhau) |
| Nền tảng đích | Windows 10 / 11 (x64), đóng gói NSIS |
| Loại ứng dụng | Desktop offline, **một người dùng**, không server, không tài khoản |
| Ngôn ngữ giao diện | Tiếng Việt (cứng, không đa ngữ) |
| Tài liệu này mô tả | Toàn bộ hành vi chức năng, mô hình dữ liệu, hợp đồng IPC, thuật toán nghiệp vụ, và các ràng buộc phi chức năng của bản `0.1.5` |

---

## Mục lục

1. [Tổng quan & phạm vi](#1-tổng-quan--phạm-vi)
2. [Thuật ngữ nghiệp vụ](#2-thuật-ngữ-nghiệp-vụ)
3. [Kiến trúc hệ thống](#3-kiến-trúc-hệ-thống)
4. [Mô hình dữ liệu](#4-mô-hình-dữ-liệu)
5. [Hợp đồng IPC — danh mục Tauri command](#5-hợp-đồng-ipc--danh-mục-tauri-command)
6. [Điều hướng & bố cục giao diện](#6-điều-hướng--bố-cục-giao-diện)
7. [Đặc tả chức năng — Dữ liệu gốc](#7-đặc-tả-chức-năng--dữ-liệu-gốc-master-data)
8. [Đặc tả chức năng — Báo cáo bán hàng](#8-đặc-tả-chức-năng--báo-cáo-bán-hàng)
9. [Thuật toán nghiệp vụ](#9-thuật-toán-nghiệp-vụ)
10. [Đặc tả nhập file Excel](#10-đặc-tả-nhập-file-excel)
11. [Đặc tả xuất file Excel](#11-đặc-tả-xuất-file-excel)
12. [Sao lưu & phục hồi](#12-sao-lưu--phục-hồi)
13. [Cập nhật ứng dụng](#13-cập-nhật-ứng-dụng)
14. [Yêu cầu phi chức năng](#14-yêu-cầu-phi-chức-năng)
15. [Xử lý lỗi & thông báo](#15-xử-lý-lỗi--thông-báo)
16. [Cấu hình, build & phát hành](#16-cấu-hình-build--phát-hành)
17. [Giới hạn đã biết & sai lệch trong hiện thực](#17-giới-hạn-đã-biết--sai-lệch-trong-hiện-thực)
18. [Phụ lục — cây thư mục](#18-phụ-lục--cây-thư-mục)

---

## 1. Tổng quan & phạm vi

### 1.1 Mục đích

Ứng dụng phục vụ **một người dùng nội bộ** làm hai việc:

1. **Quản lý dữ liệu gốc (master data)** — danh mục Sản phẩm, Nhóm sản phẩm, và CEO (khách hàng/đại lý), bao gồm quy cách đóng thùng và mức thưởng theo từng nhóm / sản phẩm.
2. **Lập báo cáo bán hàng** — nhập file Excel xuất từ hệ thống bán hàng, tự bóc tách dòng dữ liệu, tổng hợp theo thương hiệu → khách hàng (CEO) → tháng → sản phẩm, quy đổi ra **số thùng**, và tính **thưởng CEO** theo cây phân cấp cấp trên/cấp dưới.

### 1.2 Phạm vi trong (in-scope)

- CRUD ba thực thể gốc: `san_pham`, `nhom_san_pham` (kèm ánh xạ N-N tới sản phẩm), `ceo` (có cây cấp trên).
- Nhập file `.xlsx` / `.xls`; mỗi lần nhập tạo một **phiên** (`sales_session`) lưu vĩnh viễn trong CSDL.
- Sửa/thêm/xoá từng dòng dữ liệu trong phiên, có **autosave**.
- **Chốt phiên** — đóng băng số liệu theo bản chụp master data tại thời điểm chốt.
- Ba chế độ xem báo cáo: **Tổng hợp (ma trận)**, **Chi tiết theo CEO**, **Thưởng CEO**.
- Xuất Excel cho bảng ma trận và bảng thưởng.
- Sao lưu / phục hồi toàn bộ CSDL ra file JSON, hoặc qua bucket Cloudflare R2 của người dùng.
- Tự kiểm tra & cài đặt bản cập nhật (do người dùng bấm).

### 1.3 Phạm vi ngoài (out-of-scope)

- Không có xác thực, phân quyền, nhiều người dùng, hay đồng bộ thời gian thực.
- Không có server backend; không mở cổng mạng nào.
- Không đa ngôn ngữ, không dark mode.
- Không có báo cáo in ấn (PDF), không có biểu đồ.
- Không hỗ trợ macOS/Linux ở mức phát hành (chỉ chạy được ở chế độ dev).

### 1.4 Người dùng mục tiêu

Một nhân viên vận hành/kế toán bán hàng, thao tác trên máy Windows cá nhân, có toàn quyền với dữ liệu. Mọi hành động phá huỷ (xoá, phục hồi đè) đều được xác nhận bằng modal nhưng **không có cơ chế undo**.

---

## 2. Thuật ngữ nghiệp vụ

| Thuật ngữ | Định nghĩa trong hệ thống |
|---|---|
| **Thương hiệu** (`thuong_hieu`, brand) | Một trong hai giá trị cố định: `Weilaiya`, `Elvawell`. Ràng buộc bằng `CHECK` ở CSDL và hằng `THUONG_HIEU_VALUES` ở frontend. |
| **CEO** | Khách hàng / đại lý cấp cao. Có mã (`ma_ceo`), tên, **CEO cấp trên** (tự tham chiếu, tạo cây), và **nhân viên chăm sóc** (`Hằng` hoặc `Hiền`). Mã CEO theo quy ước bắt đầu bằng `W` (Weilaiya) hoặc `E` (Elvawell). |
| **Sản phẩm chính** | Cờ boolean **theo từng thương hiệu** (`la_san_pham_chinh_weilaiya`, `la_san_pham_chinh_elvawell`), **độc lập** với thương hiệu gốc của sản phẩm. Một SP thuộc Weilaiya vẫn có thể là "SP chính" phía Elvawell. |
| **Quy cách** (`quy_cach`) | Số đơn vị sản phẩm trên một thùng. Số nguyên > 0. |
| **Thùng** | `số lượng / quy cách`. Được gom theo **cột** (nhóm SP, hoặc mã SP nếu chưa thuộc nhóm nào) rồi `floor` từng cột. |
| **Nhóm sản phẩm** | Tập hợp sản phẩm cùng thương hiệu, dùng làm **cột** trong bảng ma trận và làm đơn vị tính thưởng. Một sản phẩm **chỉ được thuộc tối đa một nhóm** trên toàn hệ thống. |
| **Cross-brand** | Trường hợp một CEO thuộc thương hiệu này nhưng có nhập sản phẩm/nhóm của thương hiệu kia. Được đánh dấu bằng badge chữ `W` / `E` màu cam. |
| **Phiên** (`sales_session`) | Một lần nhập file Excel. Lưu toàn bộ dòng dữ liệu dạng JSON trong cột `data`. |
| **Chốt phiên** (lock) | Ghi `locked_at` + chụp `master_snapshot` (JSON toàn bộ master data). Sau khi chốt, báo cáo dựng từ snapshot, phiên bị khoá không sửa/đổi tên/xoá được. |
| **Thưởng bản thân** (`ownTotal`) | `Σ (số thùng của cột × thuong_ceo của cột)`. |
| **Thưởng từ cấp dưới** (`receivedTotal`) | `Σ (số thùng của từng cột ở các CEO cấp dưới trực tiếp × thuong_cap_tren của cột đó)`. |

---

## 3. Kiến trúc hệ thống

### 3.1 Tầng

```
┌──────────────────────────────────────────────────────────────┐
│  Renderer (WebView2)                                         │
│  React 19 + Vite 6 + Mantine 9 + TanStack Query 5            │
│  react-router-dom (HashRouter) · Tailwind 4 (qua @tailwindcss/vite) │
└────────────────────────┬─────────────────────────────────────┘
                         │ Tauri IPC — invoke() trong tiến trình
                         │ (KHÔNG HTTP, KHÔNG mở cổng)
┌────────────────────────▼─────────────────────────────────────┐
│  Main process (Rust, Tauri 2)                                │
│  commands/{san_pham, ceo, nhom_san_pham, sales_session,      │
│            excel, backup, cloud}                             │
│  db/ — kết nối SQLite + migration runner                     │
│  Plugin: dialog, updater, process                            │
└────────────────────────┬─────────────────────────────────────┘
                         │ rusqlite (SQLite native, feature `bundled`)
┌────────────────────────▼─────────────────────────────────────┐
│  SQLite — một file duy nhất                                  │
│  release: %APPDATA%\com.hangwu.desktop\hang-wu.db            │
│  debug:   <repo>\dev-data\hang-wu.dev.db                     │
│  PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON             │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Bảng công nghệ

| Lớp | Thư viện / phiên bản |
|---|---|
| UI framework | React `19.1`, React DOM `19.1` |
| Bundler dev/build | Vite `6.3`, `@vitejs/plugin-react` |
| Component library | Mantine `9.2` (`core`, `dates`, `hooks`, `notifications`) |
| Icon | `@tabler/icons-react` `3.44` |
| State máy chủ | TanStack Query `5.100` |
| Router | `react-router-dom` `7.6` (HashRouter — vì bản đóng gói tải qua `file://`) |
| Ngày giờ (FE) | `dayjs` `1.11` |
| Font | `@fontsource-variable/inter` |
| Shell desktop | Tauri `2`, plugin `dialog` / `updater 2.10.1` / `process 2.3.1` |
| CSDL | `rusqlite 0.33` (feature `bundled` — SQLite biên dịch kèm, không phụ thuộc hệ thống) |
| Đọc Excel | `calamine 0.26` (feature `dates`) |
| Ghi Excel | `rust_xlsxwriter 0.80` |
| S3/R2 | `rusty-s3 0.10` + `reqwest 0.13` (`rustls-no-provider`) + `rustls 0.23` (provider `ring`) |
| Kho khoá bí mật | `keyring 4.1` → Windows Credential Manager |
| Khác | `chrono 0.4`, `rand 0.8`, `serde`/`serde_json` |

> **Ghi chú TLS:** `reqwest` được cấu hình `default-features = false` + `rustls-no-provider` để bám đúng cây phụ thuộc của `tauri-plugin-updater`. Hệ quả: phải **tự cài crypto provider** (`rustls::crypto::ring::default_provider().install_default()`) trước khi tạo `reqwest::Client`, nếu không sẽ panic. Việc này được làm trong `cloud.rs::http_client()`. Đổi lại, máy build không cần `cmake` + `nasm` (aws-lc-rs).

### 3.3 Vòng đời khởi động

1. `main.rs` gọi `hang_wu_desktop_lib::run()`.
2. Đăng ký plugin `dialog`, `updater`, `process`.
3. Trong `setup`:
   - Xác định đường dẫn CSDL:
     - `cfg!(debug_assertions)` → `<CARGO_MANIFEST_DIR>/../dev-data/hang-wu.dev.db` (tạo thư mục nếu chưa có). **Chạy `tauri dev` không đụng vào CSDL thật.**
     - Ngược lại → `app.path().app_data_dir()/hang-wu.db`.
   - Xác định `resource_dir()/migrations`.
   - `db::open(db_path, migrations_dir)`:
     - `Connection::open`
     - `PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;`
     - Chạy migration (mục 4.3).
   - Đưa `DbState(Mutex<Connection>)` vào managed state.
4. Đăng ký 27 command (mục 5).
5. Mở cửa sổ chính: `1440×900`, tối thiểu `1024×640`, khởi động ở trạng thái **maximized**, tiêu đề `Hằng Wonder Union`, `csp: null`.

### 3.4 Đồng thời (concurrency)

- Toàn bộ truy cập CSDL đi qua **một** `Mutex<rusqlite::Connection>`. Không có connection pool.
- Command **đồng bộ** (`fn`) giữ mutex suốt thân hàm.
- Command **bất đồng bộ** có gọi mạng (`cloud_upload_backup`) **chủ động thu hẹp phạm vi giữ mutex**: dựng JSON backup trong một block rồi nhả khoá trước khi `await` HTTP.
- Vì lý do trên, các hàm `fetch_all` của `san_pham` / `ceo` / `nhom_san_pham` được tách riêng khỏi `#[tauri::command] list_*` — để `lock_sales_session` (đang giữ mutex) tái dùng được mà không tự deadlock.

### 3.5 Lớp truy cập dữ liệu ở frontend

`src/lib/api.ts` cung cấp một façade **giả REST** ánh xạ sang tên command:

| Lời gọi | Command sinh ra | Tham số |
|---|---|---|
| `api.get('/api/san-pham')` | `list_san_pham` | — |
| `api.get('/api/sales-session/7')` | `get_sales_session` | `{ id: 7 }` |
| `api.post('/api/ceo', body)` | `create_ceo` | `{ data: body }` |
| `api.put('/api/ceo/3', body)` | `update_ceo` | `{ id: 3, data: body }` |
| `api.del('/api/ceo/3')` | `delete_ceo` | `{ id: 3 }` |

Quy tắc: `path` bỏ tiền tố `/api/`, phần tài nguyên đổi `-` → `_`. Mọi lỗi được bọc thành `ApiError(message, 500)`; `message` lấy nguyên chuỗi lỗi tiếng Việt do Rust trả về.

Các command **không khớp** khuôn REST (`lock_sales_session`, `unlock_sales_session`, `parse_excel_file`, `export_matrix_excel_file`, `build_backup`, `restore_backup`, `cloud_*`) được gọi thẳng bằng `invoke()`.

### 3.6 Cấu hình cache (TanStack Query)

```ts
{ staleTime: Infinity, gcTime: 24h, retry: 1 }
```

Lý do: dữ liệu nằm trong SQLite cục bộ, đọc qua IPC gần như tức thì và **không có nguồn thay đổi bên ngoài** — nên không cần refetch nền. Cache **không** được persist ra `localStorage`; mở app luôn đọc tươi từ CSDL.

Khoá query tập trung tại `src/lib/queryKeys.ts`:

```
sanPham       → ['san-pham']          /api/san-pham
ceo           → ['ceo']               /api/ceo
nhomSanPham   → ['nhom-san-pham']     /api/nhom-san-pham
salesSession  → ['sales-session']     /api/sales-session
```

Riêng phiên báo cáo dùng thêm hai khoá tự quản trong `useSalesSessions.ts`:
- `SESSION_LIST_KEY = ['sales-sessions','list']`
- `sessionDetailKey(id) = ['sales-sessions','detail', id]`

Tách list và detail để invalidate danh sách **không** làm refetch (và mất) các chỉnh sửa optimistic của phiên đang mở.

---

## 4. Mô hình dữ liệu

### 4.1 Sơ đồ quan hệ

```
        ┌────────────────┐
        │      ceo       │
        │  id (PK)       │◄──┐  ceo_cap_tren_id → ceo.id
        │  ma_ceo (UQ)   │───┘  ON DELETE SET NULL
        └────────────────┘

┌──────────────────┐   ┌─────────────────────────────┐   ┌───────────────────┐
│    san_pham      │   │  nhom_san_pham_san_pham     │   │  nhom_san_pham    │
│  id (PK)         │◄──┤  san_pham_id (FK, CASCADE)  ├──►│  id (PK)          │
│  ma_san_pham(UQ) │   │  nhom_san_pham_id(FK,CASC.) │   │  ten_nhom (UQ)    │
└──────────────────┘   │  PK(nhom_id, san_pham_id)   │   └───────────────────┘
                       └─────────────────────────────┘

┌────────────────────────────────────────────────┐
│  sales_session   (không có FK — độc lập)       │
│  data: JSON SalesRow[]                          │
│  master_snapshot: JSON {san_pham, ceo, nhom...} │
└────────────────────────────────────────────────┘

┌──────────────┐
│  _migrations │  name (PK), applied_at
└──────────────┘
```

### 4.2 DDL hợp nhất (sau toàn bộ migration)

#### `san_pham`

```sql
CREATE TABLE san_pham (
  id                          INTEGER PRIMARY KEY AUTOINCREMENT,
  ma_san_pham                 TEXT    NOT NULL UNIQUE,
  ten_san_pham                TEXT    NOT NULL,
  quy_cach                    INTEGER NOT NULL,               -- số SP / thùng, > 0 (validate ở tầng lệnh)
  thuong_hieu                 TEXT    NOT NULL CHECK (thuong_hieu IN ('Weilaiya','Elvawell')),
  la_san_pham_chinh_weilaiya  INTEGER NOT NULL DEFAULT 0,     -- boolean 0/1
  la_san_pham_chinh_elvawell  INTEGER NOT NULL DEFAULT 0,     -- boolean 0/1
  thuong_ceo                  INTEGER,                        -- NULL = chưa khai, VND/thùng
  thuong_cap_tren             INTEGER,                        -- NULL = chưa khai, VND/thùng
  created_at                  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at                  TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

Thứ tự đọc mặc định: `ORDER BY thuong_hieu, ma_san_pham`.

#### `ceo`

```sql
CREATE TABLE ceo (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  ma_ceo             TEXT    NOT NULL UNIQUE,
  ten_ceo            TEXT    NOT NULL,
  ceo_cap_tren_id    INTEGER REFERENCES ceo(id) ON DELETE SET NULL,
  nhan_vien_cham_soc TEXT    NOT NULL CHECK (nhan_vien_cham_soc IN ('Hằng','Hiền')),
  created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

Thứ tự đọc mặc định: `ORDER BY ma_ceo`.

#### `nhom_san_pham` + bảng nối

```sql
CREATE TABLE nhom_san_pham (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ten_nhom        TEXT    NOT NULL UNIQUE,
  thuong_hieu     TEXT    NOT NULL CHECK (thuong_hieu IN ('Weilaiya','Elvawell')),
  thuong_ceo      INTEGER,
  thuong_cap_tren INTEGER,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE nhom_san_pham_san_pham (
  nhom_san_pham_id INTEGER NOT NULL REFERENCES nhom_san_pham(id) ON DELETE CASCADE,
  san_pham_id      INTEGER NOT NULL REFERENCES san_pham(id)      ON DELETE CASCADE,
  PRIMARY KEY (nhom_san_pham_id, san_pham_id)
);
```

Thứ tự đọc mặc định: `ORDER BY n.thuong_hieu, n.ten_nhom`. `san_pham_ids` được tổng hợp bằng `json_group_array(...) FILTER (WHERE ... IS NOT NULL)` trên `LEFT JOIN`, mặc định `'[]'`.

#### `sales_session`

```sql
CREATE TABLE sales_session (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ten             TEXT    NOT NULL,                      -- tên phiên do người dùng đặt
  file_name       TEXT    NOT NULL,                      -- tên file gốc (basename)
  row_count       INTEGER NOT NULL DEFAULT 0,
  data            TEXT    NOT NULL,                      -- JSON SalesRow[]
  created_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  locked_at       TEXT,                                  -- NULL = chưa chốt
  master_snapshot TEXT                                   -- JSON snapshot, NULL khi chưa chốt
);

CREATE INDEX idx_sales_session_created ON sales_session (created_at DESC);
```

Thứ tự đọc: `ORDER BY updated_at DESC, id DESC`.

> **Quyết định thiết kế:** các dòng bán hàng **không** được chuẩn hoá thành bảng con. Lý do ghi trong migration `0004`: single-user, dung lượng vừa phải, và mọi phép tổng hợp đều làm ở frontend trên toàn bộ mảng. Đánh đổi: không truy vấn/lọc được ở tầng SQL, và mỗi lần autosave phải ghi lại toàn bộ JSON.

> **Lưu ý mốc thời gian:** `sales_session` dùng `datetime('now','localtime')`, còn ba bảng master dùng `datetime('now')` (UTC). Đây là sự khác biệt cố ý nhưng không đồng nhất — xem mục 17.

#### `_migrations`

```sql
CREATE TABLE _migrations (
  name       TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 4.3 Cơ chế migration

Tệp: `src-tauri/migrations/NNNN_<mô_tả>.sql`, được copy vào `resources/migrations/` khi đóng gói (`tauri.conf.json → bundle.resources`).

Thuật toán (`src-tauri/src/db/mod.rs`):

1. Tạo `_migrations` nếu chưa có.
2. Đọc thư mục migration, giữ file `.sql`, **sắp theo tên file**.
3. Với từng file: nếu `name` đã có trong `_migrations` → bỏ qua.
4. Ngược lại: mở **transaction**, `execute_batch(nội dung file)`, `INSERT INTO _migrations`, `commit`.

Việc bọc transaction là chủ ý: migration `0005` có hai câu `ALTER TABLE` liên tiếp; nếu fail giữa chừng mà không rollback, lần mở app sau sẽ gặp `duplicate column` và panic vĩnh viễn lúc khởi động.

Danh sách migration hiện có:

| File | Nội dung |
|---|---|
| `0001_create_san_pham.sql` | Tạo `san_pham` |
| `0002_create_ceo.sql` | Tạo `ceo` |
| `0003_create_nhom_san_pham.sql` | Tạo `nhom_san_pham` + `nhom_san_pham_san_pham` |
| `0004_create_sales_session.sql` | Tạo `sales_session` + index |
| `0005_add_lock_to_sales_session.sql` | Thêm `locked_at`, `master_snapshot` |
| `0006_add_thuong_to_san_pham.sql` | Thêm `thuong_ceo`, `thuong_cap_tren` vào `san_pham` |
| `0007_add_thuong_to_nhom_san_pham.sql` | Thêm `thuong_ceo`, `thuong_cap_tren` vào `nhom_san_pham` |

**Quy tắc thêm migration mới:** đánh số tăng dần, không sửa file đã phát hành, không xoá file cũ.

### 4.4 Cấu trúc JSON trong `sales_session.data`

Kiểu `SalesRow` (đồng bộ giữa Rust `commands/sales_session.rs` và TS `tools/SalesReport/types.ts` qua `#[serde(rename)]`):

| Trường JSON | Kiểu | Nguồn | Mô tả |
|---|---|---|---|
| `id` | string | sinh tại chỗ | Định danh dòng cục bộ, không có trong Excel |
| `ceo` | string | cột A | Mã CEO |
| `ceoName` | string | cột B | Tên CEO |
| `brand` | string | cột L | Thương hiệu (chuỗi tự do từ file) |
| `productCode` | string | cột J | Mã sản phẩm |
| `productName` | string | cột K | Tên sản phẩm |
| `unit` | string | cột N | Đơn vị tính |
| `invoice` | string | cột T | Mã hoá đơn |
| `month` | string | cột V | `"MM/YYYY"` |
| `date` | string | cột V | `"DD/MM/YYYY HH:mm:ss"` hoặc `""` |
| `qty` | number (f64) | cột W | Số lượng |
| `unitPrice` | number (f64) | cột X | Đơn giá |
| `amount` | number (f64) | cột Z | Thành tiền |

### 4.5 Cấu trúc `master_snapshot`

```jsonc
{
  "san_pham":      [ /* mảng SanPham đầy đủ như list_san_pham trả về */ ],
  "ceo":           [ /* mảng Ceo   */ ],
  "nhom_san_pham": [ /* mảng NhomSanPham kèm san_pham_ids */ ]
}
```

Frontend đọc qua kiểu `MasterSnapshot`. Mọi trường được truy cập bằng `?? []` để snapshot sinh bởi bản app cũ (thiếu khoá) không làm vỡ báo cáo.

---

## 5. Hợp đồng IPC — danh mục Tauri command

Quy ước chung:

- Trả về `Result<T, String>`; nhánh `Err` là **chuỗi tiếng Việt** hiển thị thẳng cho người dùng.
- Tauri 2 tự chuyển tên tham số `camelCase` ở JS sang `snake_case` ở Rust (`appVersion` → `app_version`).
- Lỗi khoá mutex (`PoisonError`) được chuyển thành chuỗi và trả về như lỗi thường.

### 5.1 Nhóm `san_pham`

| Command | Tham số | Trả về | Lỗi có thể |
|---|---|---|---|
| `list_san_pham` | — | `SanPham[]` | lỗi SQL |
| `create_san_pham` | `data: SanPhamBody` | `SanPham` | `Mã sản phẩm không được để trống` · `Tên sản phẩm không được để trống` · `Quy cách phải lớn hơn 0` · `Thương hiệu không hợp lệ` · ``Mã sản phẩm '<x>' đã tồn tại`` |
| `update_san_pham` | `id: i64`, `data: SanPhamBody` | `SanPham` | như trên + `Không tìm thấy sản phẩm` |
| `delete_san_pham` | `id: i64` | `()` | `Không tìm thấy sản phẩm` |

`SanPhamBody`: `{ ma_san_pham, ten_san_pham, quy_cach, thuong_hieu, la_san_pham_chinh_weilaiya, la_san_pham_chinh_elvawell, thuong_ceo?, thuong_cap_tren? }`.

Hành vi phụ: `ma_san_pham` / `ten_san_pham` được `trim()` trước khi ghi. `update_*` set `updated_at = datetime('now')`.

### 5.2 Nhóm `ceo`

| Command | Tham số | Trả về | Lỗi có thể |
|---|---|---|---|
| `list_ceo` | — | `Ceo[]` | lỗi SQL |
| `create_ceo` | `data: CeoBody` | `Ceo` | `Mã CEO không được để trống` · `Tên CEO không được để trống` · `Nhân viên chăm sóc không hợp lệ` · ``Mã CEO '<x>' đã tồn tại`` |
| `update_ceo` | `id`, `data` | `Ceo` | như trên + `CEO không thể là cấp trên của chính mình` + `Không tìm thấy CEO` |
| `delete_ceo` | `id` | `()` | `Không tìm thấy CEO` |

**Ràng buộc cây:** chỉ chặn **tự tham chiếu trực tiếp** (`ceo_cap_tren_id == id`). Không phát hiện chu trình gián tiếp (A→B→A) — xem mục 17.

Xoá một CEO làm `ceo_cap_tren_id` của các CEO con trở thành `NULL` (`ON DELETE SET NULL`), tức là cấp dưới bị "mồ côi" chứ không bị xoá theo.

### 5.3 Nhóm `nhom_san_pham`

| Command | Tham số | Trả về | Lỗi có thể |
|---|---|---|---|
| `list_nhom_san_pham` | — | `NhomSanPham[]` (kèm `san_pham_ids`) | lỗi SQL |
| `create_nhom_san_pham` | `data: NhomSanPhamBody` | `NhomSanPham` | xem dưới |
| `update_nhom_san_pham` | `id`, `data` | `NhomSanPham` | xem dưới + `Không tìm thấy nhóm sản phẩm` |
| `delete_nhom_san_pham` | `id` | `()` | `Không tìm thấy nhóm sản phẩm` |

Kiểm tra khi tạo/sửa, **theo đúng thứ tự**:

1. `validate()` — tên nhóm không rỗng, thương hiệu hợp lệ.
2. `check_san_pham_brand()` — mọi `san_pham_id` phải có `thuong_hieu` **trùng** thương hiệu của nhóm. Lỗi: `Sản phẩm sau không thuộc thương hiệu <brand>: <MÃ> - <TÊN>, ...`
3. `check_san_pham_unique_group()` — không sản phẩm nào đang thuộc nhóm khác (khi `update` thì loại trừ chính nhóm đang sửa). Lỗi: `Sản phẩm sau đã thuộc nhóm khác: <MÃ> - <TÊN> (nhóm "<TÊN NHÓM>"), ...`
4. Ghi bản ghi nhóm.
5. `sync_members()` — `DELETE` toàn bộ liên kết cũ của nhóm, rồi `INSERT OR IGNORE` từng liên kết mới.

> **Lưu ý về tính nguyên tử:** bước 4 và 5 **không** nằm trong cùng một transaction. Nếu `sync_members` fail giữa chừng, nhóm đã được tạo/cập nhật nhưng danh sách thành viên có thể ở trạng thái dở dang.

### 5.4 Nhóm `sales_session`

| Command | Tham số | Trả về | Ghi chú |
|---|---|---|---|
| `list_sales_session` | — | `SalesSession[]` (metadata, **không** kèm `rows`) | sắp `updated_at DESC, id DESC` |
| `get_sales_session` | `id` | `SalesSessionDetail` | kèm `rows` + `master_snapshot` |
| `create_sales_session` | `data: { ten, file_name, rows }` | `SalesSessionDetail` | `locked_at`/`master_snapshot` = `null` |
| `update_sales_session` | `id`, `data: { ten?, rows? }` | `SalesSession` | **chặn nếu phiên đã chốt** |
| `delete_sales_session` | `id` | `()` | **chặn nếu phiên đã chốt** |
| `lock_sales_session` | `id` | `SalesSessionDetail` | chụp snapshot |
| `unlock_sales_session` | `id` | `SalesSessionDetail` | xoá snapshot |

Lỗi:

- `Tên phiên không được để trống`, `Tên file không được để trống` (khi tạo).
- `Không tìm thấy phiên`.
- `Phiên đã chốt — hãy hủy chốt trước khi sửa` (update).
- `Phiên đã chốt — hãy hủy chốt trước khi xóa` (delete).

**Chi tiết `update_sales_session`:** hai trường `ten` và `rows` là tuỳ chọn và được xử lý bằng **hai câu UPDATE riêng biệt**. Truyền cả hai → hai lần ghi. Truyền `rows` → `row_count` được tính lại từ `rows.len()`. Cả hai đều set `updated_at = datetime('now','localtime')`.

**Chi tiết `lock_sales_session`:**
1. Dựng `snapshot` JSON từ `san_pham::fetch_all` + `ceo::fetch_all` + `nhom_san_pham::fetch_all` (dùng connection đang giữ mutex).
2. `UPDATE sales_session SET locked_at = datetime('now','localtime'), master_snapshot = ? WHERE id = ?`.
3. Trả về `read_detail(id)`.

**Cố ý KHÔNG set `updated_at`** ở cả `lock` lẫn `unlock` — chốt không phải sửa dữ liệu, nên phiên không nhảy lên đầu danh sách (danh sách sắp theo `updated_at DESC`).

`unlock_sales_session` là **idempotent**: gọi trên phiên chưa chốt vẫn thành công (set `NULL` = `NULL`).

### 5.5 Nhóm `excel`

| Command | Tham số | Trả về |
|---|---|---|
| `parse_excel_file` | `path: String` | `SalesRow[]` |
| `export_matrix_excel_file` | `path`, `headers: String[]`, `text_totals: String[]`, `num_text_cols: usize`, `rows: Value[][]` | `()` |

Lỗi `parse_excel_file`: `Không mở được file: <chi tiết>` · `File không có sheet nào` · `Lỗi đọc sheet: <chi tiết>`.

> **Tại sao truyền path chứ không truyền bytes:** tránh JSON-serialize một file có thể tới hàng chục MB qua IPC. Đường dẫn luôn do người dùng chọn qua hộp thoại hệ thống hoặc kéo-thả, nên không có rủi ro path do web nội dung điều khiển.

### 5.6 Nhóm `backup`

| Command | Tham số | Trả về |
|---|---|---|
| `build_backup` | `app_version: String` | `String` (JSON pretty) |
| `write_backup_file` | `path`, `content` | `()` |
| `read_backup_file` | `path` | `String` |
| `restore_backup` | `json: String` | `RestoredCounts { san_pham, ceo, nhom_san_pham, sales_session }` |

Lỗi `restore_backup`: `File backup không hợp lệ` · `Không phải file backup của ứng dụng này` · `Phiên bản backup không tương thích (<n>)` · `Restore <bảng>: <lỗi SQL>`.

`write_backup_file` ghi **nguyên tử**: ghi ra `<path>.tmp` rồi `rename`.

### 5.7 Nhóm `cloud` (Cloudflare R2)

| Command | Tham số | Trả về |
|---|---|---|
| `cloud_save_credentials` | `account_id`, `access_key_id`, `secret_access_key`, `bucket` | `CloudInfo` |
| `cloud_credentials_info` | — | `CloudInfo \| null` |
| `cloud_clear_credentials` | — | `()` |
| `cloud_upload_backup` | `app_version` | `UploadResult { key, deleted, prune_error }` |
| `cloud_list_backups` | — | `CloudBackupItem[] { key, size, last_modified }` |
| `cloud_download_backup` | `key` | `String` (nội dung JSON) |

`CloudInfo = { account_id, bucket, masked_key_id }` — **không bao giờ** chứa secret. `masked_key_id` = `"••••••" + 4 ký tự cuối`.

Hằng số:

| Hằng | Giá trị | Ý nghĩa |
|---|---|---|
| `KEYRING_SERVICE` | `com.hangwu.desktop` | mục trong Windows Credential Manager |
| `KEYRING_ACCOUNT` | `r2` | |
| `PREFIX` | `backups/hang-wu-backup-` | vừa là prefix lọc khi liệt kê, vừa là tiền tố tên file khi tải lên |
| `REGION` | `auto` | R2 không phân vùng theo region |
| `SIGN_TTL` | `300s` | thời hạn URL đã ký |
| `KEEP` | `10` | số bản sao lưu giữ lại trên bucket |

Chi tiết hành vi ở mục 12.3.

---

## 6. Điều hướng & bố cục giao diện

### 6.1 Bố cục

`AppShell` của Mantine:

- **Navbar trái**, rộng `240px`, nền `dark.8`, cố định.
- **Main** chiếm phần còn lại, `height: 100vh`, `display: flex; flex-direction: column`, `padding: 0`.

Sidebar gồm:

```
┌────────────────────────────┐
│  Hằng Wonder Union         │  ← tiêu đề, có đường kẻ dưới
├────────────────────────────┤
│  🏠 Trang chủ              │
│  CÔNG CỤ                   │  ← nhãn nhóm (uppercase, letter-spacing 1px)
│  📊 Báo cáo hàng bán       │
│  DỮ LIỆU                   │
│  📦 Sản phẩm               │
│  🗂  Nhóm sản phẩm          │
│  ⭐ CEO                     │
│  HỆ THỐNG                  │
│  💾 Sao lưu & Phục hồi     │
├────────────────────────────┤
│  [ Kiểm tra cập nhật ]     │  ← UpdateButton
│  v0.1.5                    │
└────────────────────────────┘
```

Mục đang mở được tô nền `blue.6`, chữ trắng, `aria-current="page"`. Trạng thái active tính bằng so khớp `location.pathname` (khớp tuyệt đối nếu `end`, ngược lại khớp tiền tố `to + "/"`).

### 6.2 Bảng định tuyến

Dùng **HashRouter** (`createHashRouter`) vì bản đóng gói nạp qua `file://`.

| Đường dẫn | Màn hình | Ghi chú |
|---|---|---|
| `#/` | `Home` | Trang chủ dạng lưới thẻ |
| `#/tools/:toolId` | `ToolPage` → tra `tools` registry | `toolId` không hợp lệ → `Navigate to="/"` |
| `#/master-data/:pageId` | `MasterDataPage` → tra `masterDataPages` registry | tương tự |
| `#/system/backup` | `BackupPage` | |
| `#/*` | redirect về `#/` | |

Mọi trang con được nạp **lazy** (`React.lazy`) và bọc trong `<Suspense>` với fallback là `<Loader/>` giữa vùng cao 200px.

### 6.3 Registry (điểm mở rộng)

- `src/tools/registry.tsx` — mảng `ToolMeta { id, name, description, icon, component }`. Hiện có 1 mục: `sales-report`.
- `src/master-data/registry.tsx` — mảng `MasterDataMeta { id, name, icon, component }`. Hiện có 3 mục: `san-pham`, `nhom-san-pham`, `ceo`.

Thêm một công cụ/trang dữ liệu mới = thêm một entry vào registry; sidebar, trang chủ và router tự cập nhật.

### 6.4 Trang chủ (`Home`)

Ba khối thẻ, mỗi khối một tông màu:

| Khối | Nguồn | Màu |
|---|---|---|
| Công cụ | `tools` registry | `blue` |
| Dữ liệu | `masterDataPages` + bảng mô tả cứng `masterDataDescriptions` | `teal` |
| Hệ thống | mảng cứng 1 phần tử (Sao lưu & Phục hồi) | `orange` |

Lưới đáp ứng: `1 cột` (base) → `2` (sm) → `3` (lg). Thẻ có hiệu ứng hover (nâng 2px, đổ bóng, mũi tên trượt sang phải) và `:focus-visible` viền xanh.

### 6.5 Hệ thống thiết kế

- Font: **Inter Variable** cho toàn bộ (kể cả `fontFamilyMonospace` trong theme Mantine — tuy nhiên nhiều chỗ vẫn đặt `fontFamily: monospace` trực tiếp trên style cho mã CEO / mã SP).
- Thông báo: `@mantine/notifications`, đặt `<Notifications />` ở gốc.
- Bảng dùng chung style từ `src/styles/table.ts` (`mantineTableProps`, `thSticky`) và `src/tools/SalesReport/utils/tableStyles.ts` (`tdBase`, `rowBg`).
- Tiền tệ/số định dạng theo locale `vi-VN` (`src/tools/SalesReport/format.ts`):
  - `fmt` / `fmtQty` — `Intl.NumberFormat('vi-VN')`
  - `fmtDecimal` — tối đa 5 chữ số thập phân
  - `fmtAmount` — `style: currency, currency: VND`
  - `fmtAmountOrDash` — trả `"—"` khi giá trị `0` hoặc không hữu hạn
- Tìm kiếm không dấu: `normalizeSearch()` = `NFD` → bỏ `\p{Diacritic}` → `toLowerCase()`. Dùng thống nhất ở mọi ô tìm kiếm và cả trong `filter` của `<Select searchable>`.

---

## 7. Đặc tả chức năng — Dữ liệu gốc (master data)

### 7.0 Khung dùng chung

Ba trang dữ liệu gốc chia sẻ hai lớp trừu tượng:

**`useCrudResource<T, F>`** (`src/hooks/useCrudResource.ts`) — gom toàn bộ cơ chế lặp lại:

| Trách nhiệm | Chi tiết |
|---|---|
| Tải danh sách | `useQuery(cfg.resource.key)` |
| Lưu | `useMutation` → `POST` nếu tạo mới, `PUT` nếu đang sửa; on success hiện notification `Thêm mới thành công` / `Cập nhật thành công`, invalidate query, đóng modal |
| Xoá | `useMutation` → `DELETE`; notification `Đã xóa` màu cam |
| Trạng thái modal | `modalOpen`, `editItem`, `form`, `errors` |
| Xác nhận xoá | `deleteTarget` |
| Lọc theo tìm kiếm | ô `search` debounce 300ms, so khớp không dấu trên `cfg.searchFields(item)` |
| Lỗi | mọi lỗi mutation → notification đỏ tiêu đề `Lỗi` |

Điểm tinh chỉnh hiệu năng đáng chú ý: `cfg` là object literal mới mỗi render, nên **không** được đưa vào deps của `useMemo`; hook đọc `searchFields` qua `useRef` để `filtered` giữ được tham chiếu ổn định.

**`CrudShell`** (`src/components/crud/CrudShell.tsx`) — khung trang: tiêu đề + nút thêm, hàng bộ lọc, dòng đếm `X/Y bản ghi`, alert lỗi, và vùng nội dung tự xử lý ba trạng thái loading / rỗng / có dữ liệu. Kèm `FormModal` và `DeleteConfirmModal` dùng chung.

Cả ba trang đều **memo hoá phần bảng/cây** theo dữ liệu hiển thị. Lý do: state form nằm ở cấp trang, nên mỗi lần gõ phím trong modal sẽ re-render cả trang; giữ nguyên element bảng để React bỏ qua reconcile — tránh giật khi nhập liệu.

---

### 7.1 Màn hình **Sản phẩm** (`#/master-data/san-pham`)

#### Bảng danh sách

| Cột | Rộng | Nội dung |
|---|---|---|
| Mã sản phẩm | auto | monospace, đậm |
| Tên sản phẩm | auto | |
| Quy cách | 100, giữa | số nguyên |
| Thương hiệu | 120 | Badge màu theo brand (Weilaiya = `blue`, Elvawell = `violet`) |
| Chính (Elvawell) | 130, giữa | ✓ xanh / ✗ đỏ |
| Chính (Weilaiya) | 130, giữa | ✓ xanh / ✗ đỏ |
| Thưởng CEO | 130, phải | `toLocaleString('vi-VN')` hoặc `—` |
| Thưởng cấp trên | 130, phải | như trên |
| Thao tác | 100, giữa | nút Sửa (bút chì) / Xoá (thùng rác) |

#### Bộ lọc

- Ô tìm kiếm chính (width cố định 250px) — so khớp `ma_san_pham`, `ten_san_pham`.
- `Select` Thương hiệu (clearable).
- `Checkbox` **Chính (Elvawell)**.
- `Checkbox` **Chính (Weilaiya)**.
- Nút **Xoá bộ lọc** chỉ hiện khi có ít nhất một bộ lọc đang bật.

Các bộ lọc **giao nhau** (AND) và áp lên kết quả của ô tìm kiếm.

Văn bản khi rỗng: `Không tìm thấy sản phẩm phù hợp` (đang lọc) / `Chưa có sản phẩm nào`.

#### Form thêm/sửa

| Trường | Loại | Bắt buộc | Ràng buộc |
|---|---|---|---|
| Mã sản phẩm | `TextInput` | ✔ | không rỗng; `UNIQUE` toàn hệ thống |
| Tên sản phẩm | `TextInput` | ✔ | không rỗng |
| Quy cách (số lượng / thùng) | `NumberInput` `min=1`, không thập phân | ✔ | `> 0` |
| Thương hiệu | `Select` | ✔ | Weilaiya \| Elvawell |
| Thưởng CEO | `NumberInput` `min=0`, phân cách nghìn `.`, thập phân `,` | ✖ | rỗng → `null` |
| Thưởng cấp trên | như trên | ✖ | rỗng → `null` |
| Sản phẩm chính — Elvawell | `Switch` | ✖ | mô tả: *"Bật nếu đây là sản phẩm chính bên Elvawell (kể cả khi SP thuộc thương hiệu khác)"* |
| Sản phẩm chính — Weilaiya | `Switch` | ✖ | tương tự |

Validate chạy **hai lớp**: client (`validate()` trong trang, hiện lỗi ngay dưới trường) và server (`validate()` trong `san_pham.rs`, trả chuỗi lỗi hiển thị qua notification).

#### Xoá

Modal xác nhận hiển thị `Bạn có chắc muốn xóa sản phẩm <tên> (<mã>)?`. Xoá thành công sẽ **cascade** xoá các liên kết trong `nhom_san_pham_san_pham`.

---

### 7.2 Màn hình **Nhóm sản phẩm** (`#/master-data/nhom-san-pham`)

#### Bảng danh sách

| Cột | Nội dung |
|---|---|
| Tên nhóm sản phẩm | |
| Thương hiệu | Badge màu |
| Sản phẩm | danh sách dạng `• <mã> - <tên>` mỗi dòng; nếu SP không còn tồn tại → `• #<id>`; nếu nhóm rỗng → `Chưa có sản phẩm` |
| Thưởng CEO | phải, `—` nếu `null` |
| Thưởng cấp trên | phải, `—` nếu `null` |
| Thao tác | Sửa / Xoá |

#### Bộ lọc (ô tìm kiếm chính bị ẩn — `hideSearch`)

- Ô **Tên nhóm sản phẩm** (debounce 300ms).
- Ô **Mã, tên sản phẩm** — lọc các nhóm *chứa* sản phẩm khớp (debounce 300ms).
- `Select` Thương hiệu.
- Nút **Xoá bộ lọc**.

#### Form thêm/sửa

| Trường | Loại | Bắt buộc | Ghi chú |
|---|---|---|---|
| Tên nhóm sản phẩm | `TextInput` | ✔ | `UNIQUE` |
| Thương hiệu | `Select` | ✔ | **Đổi thương hiệu sẽ xoá sạch danh sách sản phẩm đang chọn** |
| Thưởng CEO | `NumberInput` | ✖ | VND / thùng |
| Thưởng cấp trên | `NumberInput` | ✖ | VND / thùng |
| Sản phẩm | `MultiSelect` (searchable, clearable, `hidePickedOptions`) | ✔ (≥ 1) | disabled tới khi chọn thương hiệu |

**Quy tắc lọc danh sách sản phẩm trong `MultiSelect`** — đây là điểm dễ nhầm:

> Danh sách chỉ liệt kê những sản phẩm là **"sản phẩm chính" của thương hiệu đã chọn** (`la_san_pham_chinh_weilaiya` hoặc `la_san_pham_chinh_elvawell`), **không** lọc theo `sp.thuong_hieu`. Ngoài ra vẫn giữ lại các SP đã được chọn sẵn (khi sửa nhóm cũ) dù hiện không còn là SP chính, để không làm mất lựa chọn/nhãn.

Kiểm tra phía server thì lại dựa trên `sp.thuong_hieu` (`check_san_pham_brand`). Hệ quả: nếu một SP là "chính bên Elvawell" nhưng `thuong_hieu = 'Weilaiya'`, nó **hiện trong dropdown** của nhóm Elvawell nhưng **bị server từ chối** khi lưu. Xem mục 17.

---

### 7.3 Màn hình **CEO** (`#/master-data/ceo`)

Khác hai màn trên: hiển thị dạng **cây phân cấp** thay vì bảng.

#### Dựng cây

`buildTree()` gom theo `ceo_cap_tren_id`; các CEO có `ceo_cap_tren_id = NULL` là gốc. Đệ quy dựng con.

Mỗi nút hiển thị:

```
[▸/▾] MÃ_CEO   Tên CEO   [n]   [Hằng|Hiền]              [✏] [🗑]
      ↑ mono     ↑          ↑ badge số con trực tiếp
```

- Nút có con: đậm hơn, click vào cả hàng để gập/mở.
- Badge nhân viên chăm sóc: `Hằng` → `teal`, `Hiền` → `pink`.
- Con được thụt vào 20px, có đường kẻ dọc bên trái.

#### Bộ lọc

- Ô tìm kiếm **Mã, tên CEO** (debounce 300ms, không dấu).
- `Select` **Nhân viên chăm sóc**.
- Nút **Xoá bộ lọc**.

Khi đang lọc:
- `filterTree()` giữ lại một nút nếu **chính nó khớp** *hoặc* **có hậu duệ khớp** — giữ nguyên ngữ cảnh cây.
- Mọi nút được **bung hết** (`effectiveCollapsed` = tập rỗng).
- Nút khớp trực tiếp được **highlight nền vàng** (`yellow.0`, hover `yellow.1`).
- Số đếm hiển thị là số bản ghi khớp trực tiếp, không phải số nút hiển thị.

#### Form thêm/sửa

| Trường | Loại | Bắt buộc |
|---|---|---|
| Mã CEO | `TextInput` | ✔ (UNIQUE) |
| Tên CEO | `TextInput` | ✔ |
| CEO cấp trên | `Select` searchable, clearable | ✖ |
| Nhân viên chăm sóc | `Select` (Hằng / Hiền) | ✔ |

Danh sách "CEO cấp trên" **loại trừ chính bản ghi đang sửa** (`item.id !== c.editItem?.id`), nhãn dạng `MÃ – Tên`.

---

## 8. Đặc tả chức năng — Báo cáo bán hàng

Đường dẫn: `#/tools/sales-report`. Đây là màn hình phức tạp nhất, gồm ba trạng thái lớn.

### 8.1 Máy trạng thái tổng thể

```
                    ┌──────────────────────────┐
  activeSessionId   │  MÀN CHỌN / LỊCH SỬ      │
      == null  ───► │  • FileDropZone           │
                    │  • SessionHistory (bảng)  │
                    └────────┬──────────────────┘
                             │ chọn file (.xlsx/.xls)
                             ▼
                    ┌──────────────────────────┐
                    │  local.status = parsing  │  ← spinner "Đang phân tích dữ liệu..."
                    └────────┬──────────────────┘
                    thành công │        │ 0 dòng hợp lệ / lỗi đọc
                             ▼        ▼
              ┌────────────────────┐  ┌──────────────────────┐
              │ ImportNameModal    │  │ local.status = error │
              │ (đặt tên phiên)    │  │  Alert + nút Thử lại │
              └────────┬───────────┘  └──────────────────────┘
                       │ Lưu & mở → create_sales_session
                       ▼
                    ┌──────────────────────────┐
  activeSessionId   │  DataView                │
      != null  ───► │  tab Báo cáo / Dữ liệu   │
                    └──────────────────────────┘
```

Trạng thái phiên đang mở (`activeSessionId`) được giữ trong một **store module-level** (`useSyncExternalStore`), **không persist**. Mở lại app luôn quay về màn lịch sử.

### 8.2 Vùng nhập file (`FileDropZone`)

Hai hình thức nhập, cùng cho ra một đường dẫn tuyệt đối:

1. **Bấm để chọn** — `@tauri-apps/plugin-dialog::open()`, bộ lọc `Excel (*.xlsx, *.xls)`, `multiple: false`.
2. **Kéo-thả từ Explorer** — Tauri chặn drop ở tầng OS và phát qua `webview.onDragDropEvent()`; **không** dùng HTML5 drag/drop, nên `<input type="file">` hoặc Mantine `Dropzone` thuần không nhận được. Trong payload `drop`, lấy **đường dẫn đầu tiên** có đuôi `.xlsx`/`.xls` (`hasExcelExt`, so khớp lowercase).

Trạng thái `dragOver` đổi icon (`IconFileSpreadsheet` → `IconUpload`), viền xanh, nền `blue.0`, scale `1.005`, đổ bóng.

Hai biến thể kích thước: **`large`** (khi chưa có phiên nào — icon 64px, hai dòng hướng dẫn, nút "Chọn file") và **compact** (khi đã có phiên — một hàng ngang).

Vùng này có `role="button"`, `tabIndex=0`, xử lý `Enter`/`Space`, `aria-label="Chọn hoặc kéo thả file Excel"`.

### 8.3 Modal đặt tên phiên (`ImportNameModal`)

Hiện sau khi parse thành công.

- Hiển thị: `File <tên file> — <n> dòng hợp lệ. Đặt tên để xem lại trong lịch sử.`
- Trường **Tên phiên**, giá trị mặc định = tên file **bỏ phần mở rộng** (`stripExt`). Reset lại mỗi lần modal mở cho file mới.
- `Enter` = submit. Nút **Lưu & mở** disabled khi tên rỗng (sau `trim`).
- Khi đang lưu: modal không đóng được bằng click ra ngoài; nút Hủy bị disable.

Sau khi lưu thành công:
1. Ghi thẳng `SalesSessionDetail` trả về vào cache detail (`qc.setQueryData`) — backend đã trả đủ `rows` nên không cần vá thủ công.
2. `open(session.id)` → chuyển sang `DataView`.
3. Notification xanh: `Đã lưu phiên · <tên> · <n> dòng`.

### 8.4 Lịch sử phiên (`SessionHistory`)

Bảng với các cột: `#`, **Tên phiên** (kèm badge cam `🔒 Đã chốt` nếu có), **File**, **Số dòng** (badge xanh), **Ngày import** (`created_at`, `DD/MM/YYYY HH:mm`), **Cập nhật gần nhất** (chỉ hiện khi `updated_at !== created_at`, chữ xanh đậm; ngược lại `—`), **Thao tác**.

Thao tác:

| Nút | Hành vi | Khi phiên đã chốt |
|---|---|---|
| 📂 Mở phiên | `open(id)` | vẫn hoạt động |
| ✏️ Đổi tên | mở modal nhập tên, `Enter` = lưu | **disabled**, tooltip `Phiên đã chốt — hủy chốt để thao tác` |
| 🗑 Xoá | modal xác nhận | **disabled**, tooltip như trên |

Khi chưa có phiên nào: `Chưa có phiên nào. Import một file Excel để bắt đầu.`

### 8.5 `DataView` — khung màn báo cáo

#### Thanh trên cùng

```
[← Danh sách phiên]  <tên phiên>  [🔒 Đã chốt lúc DD/MM/YYYY HH:mm]
                                       [🔒 Chốt phiên | 🔓 Hủy chốt]  [Báo cáo|Dữ liệu]
```

#### Hai tab chính

| Tab | Nội dung |
|---|---|
| **Báo cáo** | Tabs theo **thương hiệu** (lấy từ dữ liệu thực tế trong file, sắp theo alphabet) → `BrandPanel` |
| **Dữ liệu** | `SalesRowsTable` — bảng phẳng toàn bộ dòng, có CRUD |

Nếu không có brand nào (dữ liệu rỗng): hiện `Chưa có dữ liệu. Sang tab "Dữ liệu" để thêm dòng.`

Tabs thương hiệu dùng `keepMounted={false}`, chỉ render panel của brand đang chọn (`data.brands.map(b => b.brand === currentBrand ? <BrandPanel/> : null)`) — tránh tính toán thừa cho các brand ẩn.

**Bộ lọc được lưu theo từng brand** trong `Map<string, FilterState>` ở cấp `DataView`, nên chuyển tab qua lại không mất bộ lọc.

#### Chốt phiên / Hủy chốt

**Chốt** (modal xác nhận, nội dung nguyên văn):
> Số liệu báo cáo **và phần tính thưởng CEO** sẽ được **CỐ ĐỊNH** theo master data tại thời điểm này. Sau khi chốt, dù có sửa sản phẩm / quy cách / nhóm / CEO / mức thưởng trong master, phiên này **VẪN GIỮ NGUYÊN** số liệu & thưởng.
>
> Phiên sẽ bị khóa: không sửa / đổi tên / xóa được cho tới khi bạn hủy chốt.

Nút: `Để sau` / `Chốt phiên`.

Trước khi gọi `lock`, `DataView` **`await flushSavePending()`** — đảm bảo chỉnh sửa cuối cùng đã ghi xuống CSDL **trước khi** backend chụp snapshot.

**Hủy chốt** (modal xác nhận):
> Ngay khi bạn xác nhận, báo cáo & thưởng sẽ **CẬP NHẬT LẬP TỨC** theo master data mới nhất hiện tại. Các số liệu phụ thuộc master — đặc biệt là **SỐ THÙNG**, cách gom nhóm, mức thưởng, bộ lọc "chỉ sản phẩm chính" — có thể thay đổi so với bản đã chốt.

Nút: `Giữ chốt` / `Hủy chốt & cập nhật ngay`.

#### Ảnh hưởng của trạng thái chốt

| Thành phần | Chưa chốt | Đã chốt |
|---|---|---|
| Nguồn master data cho báo cáo | fetch live qua React Query | đọc từ `master_snapshot`, **tắt hẳn** query live |
| Thêm/sửa/xoá dòng | cho phép | ẩn nút; `mutateRows` no-op sớm (không gửi PUT thừa); backend cũng chặn |
| Đổi tên / xoá phiên | cho phép | disabled ở UI, chặn ở backend |
| Thưởng CEO | tính theo master hiện tại | đóng băng theo snapshot (vì `productBonusByCode` cũng dẫn xuất từ `sanPhamList` của snapshot) |

### 8.6 Tab **Dữ liệu** (`SalesRowsTable`)

Bảng phẳng, 13 cột: `STT`, `Mã CEO`, `Tên CEO`, `Thương hiệu`, `Mã sản phẩm`, `Tên sản phẩm`, `Đơn vị tính`, `Mã hóa đơn`, `Thời gian`, `Số lượng`, `Đơn giá`, `Thành tiền`, `Thao tác` (cột cuối bị ẩn khi phiên đã chốt).

- **Phân trang** cứng `PAGE_SIZE = 50`; thanh phân trang chỉ hiện khi số dòng đã lọc > 50.
- **Sắp xếp** cố định: theo `ceo` rồi `productCode`, dùng `localeCompare(..., 'vi')`.
- **Bộ lọc** (không debounce ở màn này — lọc ngay khi gõ): `Select` CEO (nhãn `MÃ — Tên`, searchable không dấu), `Select` Thương hiệu, ô Mã/tên sản phẩm, ô Mã hoá đơn, `Select` Tháng, nút **Xoá bộ lọc**. Mọi thay đổi bộ lọc **reset về trang 1**.
- Góc phải hiển thị `<đã lọc>/<tổng> dòng`.
- Ba trạng thái rỗng: `Chưa có dòng nào.` (kèm nút *Thêm dòng đầu tiên* nếu chưa chốt) / `Không có dòng khớp bộ lọc.`

#### Modal thêm/sửa dòng (`SalesRowFormModal`)

| Trường | Loại | Bắt buộc | Ghi chú |
|---|---|---|---|
| CEO | `Select` searchable từ master `ceo` | ✔ | chọn xong tự điền `ceoName` từ master |
| Thương hiệu | `Select` (Weilaiya/Elvawell) | ✔ | **đổi brand sẽ xoá `productCode`, `productName`, `unit`** |
| Sản phẩm | `Select` searchable | ✔ | danh sách lọc theo `sp.thuong_hieu === brand`; chọn xong tự điền `productName` |
| Đơn vị tính | `TextInput` | ✖ | |
| Mã hóa đơn | `TextInput` | ✖ | |
| Thời gian | `DateTimePicker` clearable | ✖ | định dạng hiện thị `DD/MM/YYYY HH:mm`; lưu `DD/MM/YYYY HH:mm:ss`; `month` suy ra `MM/YYYY` |
| Số lượng | `NumberInput` | ✔ | phải là số hữu hạn |
| Đơn giá | `NumberInput` | ✖ | rỗng → `0` |
| Thành tiền | `NumberInput` | ✖ | **để trống = tự tính `Số lượng × Đơn giá`** |

Lỗi chỉ hiện sau khi bấm submit lần đầu (`touched`). `id` giữ nguyên khi sửa, sinh mới (`r_<uuid>`) khi thêm.

Dòng thêm mới được **chèn lên đầu mảng** (`[row, ...rows]`).

### 8.7 Tab **Báo cáo** → `BrandPanel`

#### Thanh thống kê (trên cùng)

| Ô | Giá trị | Màu nhấn |
|---|---|---|
| Tổng CEO | `<số CEO hiển thị>` hoặc `<hiển thị>/<tổng>` khi đang lọc | blue.7 |
| Tổng sản phẩm | `Σ totalQty` của các CEO hiển thị | — |
| Tổng thùng | `Σ calcTotalThung(...)`, **chỉ hiện khi > 0** | indigo.7 |
| Tổng tiền | `Σ totalAmount` (định dạng VND) | green.7 |
| Tổng thưởng | `Σ grandTotal` của bảng thưởng | grape.7 |

Bên phải: nút **Xuất Excel** (chỉ hiện ở chế độ `Tổng hợp` và `Thưởng CEO`) và `SegmentedControl` ba chế độ: **Tổng hợp** / **Chi tiết** / **Thưởng CEO**.

#### Hàng bộ lọc

| Bộ lọc | Kiểu | Debounce |
|---|---|---|
| CEO | `Select` searchable, clearable, tìm không dấu | — |
| Mã / Tên / Nhóm sản phẩm | `SearchInput` | 300ms |
| Mã hóa đơn | `SearchInput` | 300ms |
| Trạng thái nhập hàng | `Select`: `Có nhập hàng` (`totalQty > 0`) / `Không nhập hàng` (`totalQty === 0`) | — |
| Xoá bộ lọc | nút, chỉ hiện khi có bộ lọc bật | — |

Thứ tự áp dụng (quan trọng vì ảnh hưởng kết quả):

```
allCEOs  ──(lọc CEO / SP / hoá đơn)──►  ──applyOnlyMain(brand)──►  ──(lọc trạng thái nhập hàng)──►  visibleCEOs
```

Nghĩa là **"Trạng thái nhập hàng" được đánh giá SAU khi đã lọc chỉ-sản-phẩm-chính** — một CEO có nhập hàng nhưng toàn SP phụ sẽ bị xếp vào nhóm "Không nhập hàng".

Danh sách chọn CEO (`ceoOptions`) chỉ giữ CEO **có trong master data** *hoặc* **không có trong master data ở bất kỳ đâu** (mã lạ từ file) — bằng biểu thức `masterCEOCodeSetForBrand.has(c.ceo) || !masterCEOCodeSet.has(c.ceo)`.

#### Chế độ **Tổng hợp** (`MatrixTable`)

Bảng ma trận: **hàng = CEO**, **cột = nhóm sản phẩm / sản phẩm lẻ**, **ô = số thùng**.

Cấu trúc cột, theo thứ tự:

1. Các nhóm sản phẩm **của thương hiệu đang xem** (`nhomGroups`), giữ nguyên thứ tự từ master.
2. Các nhóm **cross-brand** thực sự xuất hiện trong dữ liệu, sắp theo `(thương hiệu, tên nhóm)`, có badge cam `W`/`E`.
3. Các **sản phẩm lẻ** (chưa thuộc nhóm nào), sắp: SP cùng brand trước, rồi theo mã. Header hiện mã ở dòng trên, tên SP ở dòng dưới (cỡ 10px, màu dimmed).

**Ẩn cột:** cột nào không CEO nào có thùng (`colTotals ≤ 0`) sẽ bị ẩn — **ngoại trừ** cột sản phẩm lẻ *chưa có trong master* (thiếu quy cách), luôn giữ lại và tô **đỏ** để cảnh báo.

Cột cố định (sticky):
- Trái: `STT` (48px), `Mã CEO` (96px), `Tên CEO` (160px) — có đổ bóng phân tách.
- Phải: `Tổng thùng` (110px), `Tổng sản phẩm` (100px).
- Trên: hàng header + **hàng tổng** (`Σ`) — hàng tổng sticky ngay dưới header, offset tính động bằng `ResizeObserver` theo chiều cao thực của hàng header.

**Sắp xếp:** click vào bất kỳ header cột nào (kể cả `Tổng thùng`, `Tổng sản phẩm`) — chu kỳ `desc → asc → không sắp xếp`.

**Ô có dữ liệu** (`thùng > 0`) có nền `blue.0`, chữ `blue.8`, hover đổi nền + viền, `tabIndex=0`, `role="button"`, hỗ trợ `Enter`/`Space` → mở `CellDetailModal`. Ô không có dữ liệu hiển thị `—` màu xám.

Hàng CEO **không có trong master data** hiển thị mã màu đỏ. CEO có giao dịch cross-brand có badge `W`/`E` cam cạnh tên.

#### `CellDetailModal`

Mở khi bấm một ô hoặc một trong hai cột tổng (khi bấm cột tổng, `entries` = toàn bộ sản phẩm của CEO, nhãn cột = `Tất cả sản phẩm`).

Nội dung: san phẳng toàn bộ `rawLines` của các `ProductRow` trong ô, rồi **gom lại theo mã sản phẩm** thành từng hàng, mỗi hàng liệt kê danh sách hoá đơn / thời gian / đơn giá (mỗi giá trị một dòng, `white-space: pre`), tổng số lượng, tổng thùng, tổng tiền. Chiều cao vùng cuộn giới hạn `15 hàng × 28px`.

#### Chế độ **Chi tiết**

Bố cục hai cột:

- **Trái (320px)** — danh sách CEO (`CEOListItem`), có thanh sắp xếp: theo **Thùng** hoặc **Sản phẩm**, mỗi nút bấm lần nữa đổi chiều (mặc định `thung` / `desc`). Mỗi mục hiện mã CEO (monospace, đỏ nếu không có trong master), tên, badge cross-brand, và bên phải là `<n> thùng` + `<n> sản phẩm`, hoặc chữ nghiêng `Không có dữ liệu`.
- **Phải** — header CEO (avatar vuông xanh/đỏ tuỳ có trong master, mã + tên, dòng phụ `<n> sản phẩm · <n> thùng · <tiền>`) và bảng `CEODetailTable`.

`CEODetailTable` — một bảng duy nhất, **gộp mọi tháng**, chia theo nhóm sản phẩm:

Thứ tự khối: nhóm của brand hiện tại (theo thứ tự master) → nhóm cross-brand (sắp theo thương hiệu, tên) → khối **Chưa phân nhóm**.

- Hàng tiêu đề nhóm: nền `teal.0` (nhóm thường) hoặc `red.0` (Chưa phân nhóm), hiển thị tổng Số lượng / Số lượng thùng / Thành tiền của nhóm.
- Hàng sản phẩm: mỗi **mã sản phẩm** một hàng, gộp toàn bộ `rawLines`. Cột `Mã hóa đơn`, `Thời gian`, `Đơn giá` liệt kê nhiều giá trị, mỗi giá trị một dòng.
- Sản phẩm **thiếu quy cách** trong master: cả hàng tô nền `orange.0`, mã và cột quy cách/thùng màu cam, cột thùng hiện `—`.

10 cột: `Mã sản phẩm` 9% · `Tên sản phẩm` 20% · `Mã hóa đơn` 10% · `Đơn vị tính` 5% · `Số lượng` 8% · `Quy cách` 6% · `Số lượng thùng` 8% · `Thời gian` 10% · `Đơn giá` 10% · `Thành tiền` 14%.

> Lưu ý: số thùng ở bảng này tính theo **từng dòng hoá đơn** (`Σ line.qty / quy_cach`) và **không làm tròn**, khác với quy tắc `floor` theo cột của bảng ma trận.

#### Chế độ **Thưởng CEO** (`BonusTable`)

Bảng 8 cột: `STT`, `Mã CEO`, `Tên CEO`, `Thùng bản thân`, `Thưởng bản thân`, `Thùng từ cấp dưới`, `Thưởng từ cấp dưới`, `Tổng thưởng`.

- Năm cột số đều **sắp xếp được** (`desc → asc → tắt`).
- Có hàng tổng cuối bảng.
- Bấm vào một hàng → modal chi tiết, hiển thị breakdown theo từng nhóm / SP lẻ cho cả phần "bản thân" lẫn phần "nhận từ cấp dưới" (gom theo từng CEO cấp dưới).

Thuật toán tính ở mục 9.5.

---

## 9. Thuật toán nghiệp vụ

### 9.1 Tổng hợp dữ liệu — `aggregateRows()`

Đầu vào: `SalesRow[]`. Đầu ra: `ParsedReport`.

Cấu trúc lồng bốn cấp: **thương hiệu → CEO → tháng → mã sản phẩm**.

```
ParsedReport
├─ brands: BrandSummary[]           (sắp theo brand)
│  ├─ ceos: CEOSummary[]            (sắp theo mã CEO)
│  │  ├─ months: MonthSummary[]     (sắp theo chuỗi "MM/YYYY")
│  │  │  └─ products: ProductRow[]  (sắp theo mã SP)
│  │  │     ├─ quantity, totalAmount
│  │  │     ├─ invoiceCodes[]  (Set → mảng đã sắp)
│  │  │     ├─ unitPrices[]    (Set → mảng đã sắp tăng dần)
│  │  │     └─ rawLines[]      (mọi dòng gốc: invoice, qty, unitPrice, amount, date)
│  │  └─ totalQty, totalAmount
│  └─ totalQty, totalAmount
└─ totalQty, totalAmount, rowCount
```

Quy tắc chi tiết:

- **Bỏ qua** dòng thiếu `brand`, `ceo`, hoặc `productCode`. `rowCount` chỉ đếm dòng hợp lệ.
- `ceoName` lấy theo **lần xuất hiện đầu tiên** không rỗng của mỗi mã CEO (map toàn cục, không theo brand).
- `qty` / `amount` / `unitPrice` không hữu hạn (`NaN`, `Infinity`) được quy về `0`.
- `unitPrices` là `Set`, **loại bỏ giá trị `0`** (0 không phải đơn giá) và tránh `NaN` (vì `NaN !== NaN` sẽ làm Set phình ra).
- `invoiceCodes` chỉ nhận chuỗi không rỗng.
- Sắp xếp toàn bộ bằng `localeCompare` mặc định (không truyền locale) — riêng `SalesRowsTable` và `CEODetailTable` dùng `localeCompare(..., 'vi')`.

Hàm này được gọi lại **mỗi khi `rows` đổi** (`useMemo` trong `DataView`), nên mọi thao tác CRUD chỉ cần sửa mảng phẳng; bảng và chi tiết tự dựng lại.

### 9.2 Xác định CEO thuộc thương hiệu — `makeBrandMatcher()`

```
brandPrefix('Weilaiya') = 'W'
brandPrefix('Elvawell') = 'E'
```

- Nếu brand có prefix đăng ký → CEO thuộc brand khi `ma_ceo.toUpperCase().startsWith(prefix)`.
- Nếu brand **không** có trong `BRAND_CONFIG` (ví dụ file Excel chứa một chuỗi thương hiệu lạ) → fallback: khớp nếu mã CEO bắt đầu bằng **bất kỳ** prefix nào đã đăng ký (`W` hoặc `E`).

Toàn bộ cấu hình theo thương hiệu tập trung ở `src/domain/constants.ts`:

```ts
BRAND_CONFIG = {
  Elvawell: { short: 'E', ceoPrefix: 'E', color: 'violet', mainField: 'la_san_pham_chinh_elvawell' },
  Weilaiya: { short: 'W', ceoPrefix: 'W', color: 'blue',   mainField: 'la_san_pham_chinh_weilaiya' },
}
```

Thêm thương hiệu mới = thêm một entry + cập nhật `CHECK` constraint ở CSDL; không phải rải `if brand === '...'` khắp nơi.

### 9.3 Gộp cross-brand — `mergeCEOsAcrossBrands()`

Mục tiêu: ở tab **Weilaiya**, một CEO mã `W001` phải thấy được **cả** các đơn hàng Elvawell của mình.

Thuật toán:

1. Duyệt **mọi** `BrandSummary` (không chỉ brand đang xem).
2. Với mỗi CEO có mã khớp `matchesBrand(ceo.ceo)`:
   - Gộp `months` theo `month`, gộp `products` theo `productCode`.
   - Khi trùng mã SP: cộng dồn `quantity`, `totalAmount`; hợp nhất `invoiceCodes`, `unitPrices` (bỏ trùng); nối `rawLines`.
   - `ceoName` lấy giá trị không rỗng đầu tiên.
3. Bổ sung các CEO **chỉ có trong master data** (chưa phát sinh đơn) có mã khớp prefix, với `months = []`, `totalQty = 0`, `totalAmount = 0` — để vẫn hiển thị trên báo cáo.
4. Kết quả sắp theo mã CEO.

### 9.4 Lọc "chỉ sản phẩm chính" — `applyOnlyMain()`

```ts
sanPhamChinhSet: Set<"<ma_san_pham>|<thương hiệu>">
```

Được dựng bằng cách, với **mỗi** sản phẩm và **mỗi** thương hiệu trong `THUONG_HIEU_VALUES`, kiểm tra `isProductMainForBrand(sp, brand)`.

`applyOnlyMain(ceo, brand, set)` giữ lại sản phẩm khi `set.has(`${productCode}|${brand}`)` — tức là **tra theo thương hiệu của tab đang xem**, không phải thương hiệu gốc của sản phẩm. Nhờ vậy ở tab Elvawell, một SP cross-brand Weilaiya chỉ hiện nếu nó được đánh dấu "chính bên Elvawell".

Sau khi lọc, tháng nào hết sản phẩm sẽ bị loại; `totalQty` / `totalAmount` được tính lại.

> **Đây là bộ lọc luôn bật, không có công tắc trong UI.** Mọi con số trên tab Báo cáo (thống kê, ma trận, chi tiết, thưởng) đều tính trên tập đã lọc này.

### 9.5 Quy đổi số thùng

Đây là điểm nhạy cảm nhất về tính nhất quán số liệu. Có **ba** cách tính đang tồn tại:

#### (a) Quy ước chuẩn — dùng ở `MatrixTable`, `matrixExport`, `bonus.aggregateColThung`

```
với mỗi CEO:
  raw = Map<key, number>            // key = nhomId (number) nếu SP thuộc nhóm, ngược lại = productCode (string)
  với mỗi tháng, mỗi sản phẩm:
    productBrand = productBrandMap[productCode] ?? brand_đang_xem
    quyCach      = quyCachMap["<productCode>|<productBrand>"]
    nếu không có quyCach → BỎ QUA sản phẩm này
    raw[key] += product.quantity / quyCach
  thùng[key] = floor(raw[key])      // ← floor TỪNG key
  tổngThùng  = Σ thùng[key]
```

**Cộng phần lẻ rồi mới floor một lần sẽ lệch với số hiển thị trên ma trận**, nên bắt buộc phải floor theo từng cột.

#### (b) `calcTotalThung()` (`utils/report.ts`) — dùng ở thanh thống kê, danh sách CEO, và sắp xếp

Tích luỹ `raw` theo key giống (a), nhưng **cộng thẳng các giá trị chưa làm tròn**, không `floor`. Kết quả là số thập phân, hiển thị bằng `fmtDecimal` (tối đa 5 chữ số thập phân).

Docstring của hàm nói là "floor từng key rồi cộng lại" — mã không làm vậy. Xem mục 17.1.

#### (c) `CEODetailTable` / `CellDetailModal`

Tính theo **từng dòng hoá đơn**: `Σ (line.qty / quyCach)`, không làm tròn.

#### Hệ quả cần biết

| Nơi hiển thị | Cách tính | Có làm tròn? |
|---|---|---|
| Ô trong ma trận, cột `Tổng thùng` của ma trận, hàng `Σ` | (a) | ✔ floor theo cột |
| Ô "Tổng thùng" trên thanh thống kê, `<n> thùng` ở danh sách CEO và header CEO | (b) | ✖ |
| Cột `Số lượng thùng` trong bảng chi tiết & modal ô | (c) | ✖ |
| Cột `Thùng bản thân` / `Thùng từ cấp dưới` ở bảng thưởng | (a) | ✔ |

Nói cách khác: **con số ở thanh thống kê thường lớn hơn hoặc bằng tổng các ô trong ma trận**, do phần lẻ chưa bị cắt.

### 9.6 Tính thưởng CEO — `computeCeoBonuses()`

Đầu vào: `visibleCEOs` (đã gộp cross-brand + đã lọc SP chính + đã áp bộ lọc UI), `brand`, các map dẫn xuất, `allNhomGroups`, `productBonusByCode`, `masterCEOList`.

**Pass 1 — thưởng bản thân + breakdown**

Với mỗi CEO:

1. `colThung = aggregateColThung(...)` — quy ước (a), floor theo từng key.
2. Với mỗi key có `thùng > 0`:

   | Loại key | Nguồn mức thưởng | Nhãn |
   |---|---|---|
   | `number` (id nhóm) | `nhom.thuong_ceo`, `nhom.thuong_cap_tren` (mặc định `0` nếu `null`) | `ten_nhom`, fallback `Nhóm #<id>` |
   | `string` (mã SP lẻ) | `san_pham.thuong_ceo`, `san_pham.thuong_cap_tren` | mã SP + tên SP làm dòng phụ |

3. ```
   ownAmount      = thùng × thuongCeo
   superiorAmount = thùng × thuongCapTren
   ownTotal      += ownAmount
   superiorTotal += superiorAmount
   ```
4. `details` sắp: **nhóm trước, SP lẻ sau**, trong mỗi loại sắp theo nhãn.

**Pass 2 — chuyển thưởng lên cấp trên**

Với mỗi CEO có ít nhất một `detail`:
- Tra master: `parentId = ceoByCode[ceo].ceo_cap_tren_id`. Không có → bỏ qua.
- Tra `parent = ceoById[parentId]`. Không tìm thấy → bỏ qua.
- Đẩy **từng dòng detail** (kể cả dòng có thưởng = 0, để đếm thùng đúng) vào `receivedByParentCode[parent.ma_ceo]`.

**Pass 3 — kết quả**

```
received       = receivedByParentCode[ceo]  (sắp theo: mã CEO cấp dưới → nhóm trước → nhãn)
receivedTotal  = Σ received.superiorAmount
ownThung       = Σ details.thung
receivedThung  = Σ received.thung
grandTotal     = ownTotal + receivedTotal
crossBrands    = tập thương hiệu ≠ brand hiện tại xuất hiện trong details
inMaster       = mã CEO có trong master hay không
```

**Các quyết định quan trọng:**

- Thưởng chỉ chuyển lên **đúng một cấp** (`ceo_cap_tren_id` trực tiếp). Không cộng dồn lên ông/bà.
- **Không lọc bớt CEO** khỏi bảng thưởng: nhóm/SP chưa khai mức thưởng (hoặc = 0) vẫn hiển thị với thưởng = 0, để cột `Thùng bản thân` khớp đúng `Tổng thùng` bên ma trận.
- Thưởng được tính từ **chính `visibleCEOs`**, nên số thưởng luôn khớp số thùng đang hiển thị — kể cả khi người dùng đang lọc.
- Hệ quả: nếu CEO cấp trên **không nằm trong `visibleCEOs`** (bị lọc ra, hoặc mã không khớp prefix của tab), khoản `superiorAmount` từ cấp dưới sẽ **không được hiển thị ở đâu cả**.

### 9.7 Autosave phiên

Cơ chế nằm ở `src/tools/SalesReport/hooks/useSalesRows.ts`, cấp module (không phụ thuộc vòng đời React).

```
mutateRows(updater)
  ├─ nếu chưa mở phiên → no-op
  ├─ đọc cache detail; nếu chưa có → no-op
  ├─ nếu phiên ĐÃ CHỐT → no-op (chặn cả debounce, không gửi PUT thừa)
  ├─ cập nhật OPTIMISTIC vào cache (rows + row_count)
  └─ scheduleSave(qc, id, nextRows)
         ├─ pendingSnapshot = {qc, id, rows}
         ├─ clearTimeout(saveTimer)
         └─ saveTimer = setTimeout(flushSavePending, 500ms)

flushSavePending()
  ├─ huỷ timer
  ├─ nếu không có pendingSnapshot → trả về inFlight hiện tại
  └─ inFlight = inFlight.catch(noop).then(() => runSave(...))   ← HÀNG ĐỢI NỐI TIẾP

runSave()
  ├─ PUT /api/sales-session/<id> { rows }
  ├─ thành công → invalidate SESSION_LIST_KEY (cập nhật row_count, updated_at ở bảng lịch sử)
  └─ thất bại  → notification đỏ "Lưu phiên thất bại"
```

**Ba điểm thiết kế:**

1. **Debounce 500ms** — gộp nhiều thao tác liên tiếp thành một lần ghi CSDL.
2. **Hàng đợi nối tiếp (`inFlight`)** — hai lệnh PUT không bao giờ chạy chồng nhau và sai thứ tự. Nếu người dùng sửa tiếp khi một PUT đang chạy, payload mới xếp sau và gửi ngay khi PUT trước hoàn tất.
3. **Flush ở ba nơi**:
   - `useEffect` cleanup khi hook unmount (rời màn hình).
   - `window.addEventListener('beforeunload')`.
   - `window.onCloseRequested` của Tauri — **chặn đóng cửa sổ** (`e.preventDefault()`), `await flushSavePending()`, rồi mới `win.destroy()`. Đây là đường duy nhất thực sự *chờ* được lệnh ghi cuối cùng.
   - Ngoài ra `DataView.handleLock()` gọi `await flushSavePending()` trước khi chốt.

Khối đăng ký listener được bọc `try/catch` để chạy được ngoài Tauri (vite preview thuần).

---

## 10. Đặc tả nhập file Excel

Toàn bộ parsing nằm ở Rust (`src-tauri/src/commands/excel.rs`), dùng `calamine`.

### 10.1 Phạm vi đọc

- Chỉ đọc **sheet đầu tiên** (`worksheet_range_at(0)`).
- Không có khái niệm dòng tiêu đề — mọi dòng đều được kiểm tra bằng `is_data_row()`.

### 10.2 Ánh xạ cột (0-based)

| Chỉ số | Chữ cái Excel | Hằng | Trường `SalesRow` |
|---|---|---|---|
| 0 | **A** | `COL_CEO` | `ceo` |
| 1 | **B** | `COL_CEO_NAME` | `ceoName` |
| 9 | **J** | `COL_PRODUCT` | `productCode` |
| 10 | **K** | `COL_PRODUCT_NAME` | `productName` |
| 11 | **L** | `COL_BRAND` | `brand` |
| 13 | **N** | `COL_UNIT` | `unit` |
| 19 | **T** | `COL_INVOICE` | `invoice` |
| 21 | **V** | `COL_MONTH` | `month` **và** `date` |
| 22 | **W** | `COL_QTY` | `qty` |
| 23 | **X** | `COL_UNIT_PRICE` | `unitPrice` |
| 25 | **Z** | `COL_AMOUNT` | `amount` |

> Các chỉ số này **cứng trong mã**. Đổi cấu trúc file Excel nguồn = phải sửa `excel.rs` và phát hành bản mới.

### 10.3 Điều kiện nhận dòng

Một dòng được nhận khi **tất cả** điều kiện sau đúng:

1. `cell_str(A)` không rỗng (có mã CEO).
2. `cell_str(L)` không rỗng (có thương hiệu).
3. `parse_qty(W)` trả `Some(...)` (số lượng phân tích được thành số).
4. Sau đó kiểm tra thêm: `productCode` (J) không rỗng.

Dòng không thoả → bỏ qua **im lặng** (không báo lỗi, không đếm).

Nếu **không dòng nào** được nhận, frontend hiện lỗi: `Không tìm thấy dữ liệu hợp lệ trong file. Hãy kiểm tra lại định dạng.`

### 10.4 Chuyển đổi kiểu ô

`cell_str(cell)`:

| Kiểu `calamine::Data` | Kết quả |
|---|---|
| `String(s)` | `s.trim()` |
| `Float(f)` | `format!("{}", f)` |
| `Int(i)` | `format!("{}", i)` |
| `Bool(b)` | `"true"` / `"false"` |
| `DateTime(dt)` | `"DD/MM/YYYY HH:MM:SS"` |
| `DateTimeIso(s)` | nguyên chuỗi |
| khác (`Empty`, `Error`, `Duration`) | `""` |

### 10.5 Phân tích số bản địa hoá — `parse_localized_number()`

Xử lý chuỗi số đến từ Excel với dấu ngăn nghìn / thập phân lẫn lộn.

1. Bỏ mọi khoảng trắng, kể cả `U+00A0` (non-breaking space).
2. Nếu chuỗi rỗng → `None`.
3. Xét sự có mặt của `.` và `,`:

| Trường hợp | Quy tắc | Ví dụ |
|---|---|---|
| Có **cả** `.` và `,` | Dấu xuất hiện **sau cùng** là dấu thập phân; dấu còn lại là ngăn nghìn | `1.234,56` → `1234.56` · `1,234.56` → `1234.56` |
| Chỉ có `,`, xuất hiện **> 1 lần** | Toàn bộ là ngăn nghìn → xoá hết | `1,234,567` → `1234567` |
| Chỉ có `,`, xuất hiện **1 lần** | Là dấu thập phân | `1234,5` → `1234.5` |
| Chỉ có `.`, xuất hiện **> 1 lần** | Toàn bộ là ngăn nghìn → xoá hết | `1.234.567` → `1234567` |
| Còn lại | Giữ nguyên | `1234.56` → `1234.56` |

4. `parse::<f64>()`, lọc bỏ giá trị không hữu hạn.

> **Điểm mơ hồ cố hữu:** `1.234` (chỉ một dấu chấm) được hiểu là `1.234` (một phẩy hai ba bốn), **không phải** `1234`. Đây là hành vi đã chọn, không thể phân biệt được nếu chỉ nhìn chuỗi.

`cell_to_f64()` (dùng cho `unitPrice`, `amount`) trả `0.0` khi không phân tích được; `parse_qty()` (dùng cho `qty`) trả `Option` để phục vụ điều kiện nhận dòng.

### 10.6 Xử lý ngày tháng

Cột **V** vừa sinh `month` vừa sinh `date`.

**`month` — `format_month()`:**

| Đầu vào | Kết quả |
|---|---|
| `DateTime` | `"MM/YYYY"` |
| Chuỗi `"T1/2025"` | `"01/2025"` (bỏ tiền tố `T`, pad 2 chữ số) |
| Chuỗi `"1/2025"` hoặc `"01/2025"` | `"01/2025"` |
| Chuỗi khác | giữ nguyên (đã trim) |
| `Float`/`Int` | định dạng số |
| Khác | `""` |

**`date`:**

| Đầu vào | Kết quả |
|---|---|
| `DateTime` | `"DD/MM/YYYY HH:MM:SS"` |
| `Float` (serial Excel) | `excel_serial_to_date_str()` |
| Khác | `""` |

`excel_serial_to_date_str(serial)`: `unix_days = serial − 25569`, `secs = unix_days × 86400`, dựng `DateTime<Utc>` rồi format `"%d/%m/%Y %H:%M:%S"`. Trả `""` nếu timestamp không hợp lệ.

> Chuyển đổi này **không xét múi giờ** (dùng `naive_utc`) và không xử lý bug năm nhuận 1900 của Excel. Với dữ liệu sau 1900-03-01 thì kết quả đúng.

### 10.7 Sinh định danh dòng

**Phía Rust** (khi import): `format!("r_{:x}_{:x}_{:x}", timestamp_ms, rand::random::<u64>(), counter)`.

**Phía TypeScript** (khi thêm dòng thủ công): `` `r_${crypto.randomUUID()}` `` — `crypto.randomUUID` luôn khả dụng trong WebView2 nên không cần fallback.

---

## 11. Đặc tả xuất file Excel

Command dùng chung: `export_matrix_excel_file`. Frontend chuẩn bị dữ liệu, Rust chỉ lo định dạng và công thức.

### 11.1 Hợp đồng dữ liệu

```ts
interface MatrixExportData {
  headers:     string[];             // hàng 1
  textTotals:  string[];             // nhãn cho numTextCols cột đầu ở hàng tổng
  numTextCols: number;               // số cột đầu là cột chữ (= 2)
  dataRows:    (string | number)[][];
}
```

### 11.2 Bố cục file sinh ra

| Hàng Excel | Nội dung |
|---|---|
| 1 | **Header** — nền `#1C4587`, chữ trắng, đậm |
| 2 | **Hàng tổng** — nền `#C9DAF8`, chữ `#1C4587`, đậm. `numTextCols` cột đầu lấy từ `textTotals`; các cột số dùng công thức `=SUM(<Cột>3:<Cột><2+n>)` |
| 3 … | **Dữ liệu** — hàng chẵn/lẻ xen kẽ nền trắng / `#F3F4F6` |

Quy tắc định dạng ô số:
- Giá trị `> 0`: chữ `#1155CC`, đậm.
- Giá trị `≤ 0`: chữ `#BBBBBB`.
- Giá trị số được `floor()` trước khi ghi.

**Cột cuối cùng** của bảng ma trận (khi `headers.len() > numTextCols + 1`) không ghi giá trị tĩnh mà ghi công thức `=SUM(<cột đầu số><hàng>:<cột kề cuối><hàng>)` — nghĩa là tổng thùng trong file Excel **tự tính lại** từ các cột nhóm, và sẽ tự cập nhật nếu người nhận sửa số.

`col_letter(n)` chuyển chỉ số cột 0-based sang chữ cái Excel (hỗ trợ >26 cột: `A..Z, AA, AB, ...`).

### 11.3 Xuất bảng ma trận — `buildMatrixExportData()`

Cột: `Mã CEO` · `Tên CEO` · [các nhóm brand hiện tại] · [các nhóm cross-brand, header có tiền tố `[W]`/`[E]`] · [các SP lẻ, header có tiền tố `[W]`/`[E]` nếu khác brand] · `Tổng thùng`.

Khác với bảng trên màn hình: **không ẩn cột rỗng**, và ô không có dữ liệu ghi `0` thay vì `—`.

Tên file mặc định: `Báo cáo hàng bán theo khách <YYYY-MM-DD>.xlsx`.

### 11.4 Xuất bảng thưởng — `buildBonusExportData()`

Cột: `Mã CEO` · `Tên CEO` · `Thưởng bản thân` · `Thưởng từ cấp dưới` · `Tổng thưởng`.

Cột `Tổng thưởng` là cột cuối → được ghi thành công thức `=SUM(bản thân : cấp dưới)`.

Tên file mặc định: `Tính thưởng CEO <brand> <YYYY-MM-DD>.xlsx`.

### 11.5 Luồng người dùng

1. Bấm **Xuất Excel** (chỉ khả dụng khi `visibleCEOs.length > 0`).
2. Hộp thoại lưu file hệ thống, lọc `*.xlsx`. Huỷ → không làm gì.
3. Nút chuyển sang trạng thái loading.
4. Thành công → notification xanh `Đã xuất file Excel · <n> CEO → <đường dẫn>` (tự đóng sau 6s).
5. Thất bại → notification đỏ `Xuất Excel thất bại` kèm chi tiết.

---

## 12. Sao lưu & phục hồi

Màn hình: `#/system/backup`, rộng tối đa 760px, gồm hai thẻ.

### 12.1 Định dạng file sao lưu

```jsonc
{
  "format":      "hang-wu-backup",   // hằng, dùng để nhận diện
  "version":     1,                  // hằng, phải khớp tuyệt đối khi phục hồi
  "app_version": "0.1.5",            // do frontend truyền vào (__APP_VERSION__)
  "exported_at": "2026-07-31T08:12:44Z",   // UTC, format %Y-%m-%dT%H:%M:%SZ
  "tables": {
    "san_pham":               [ /* SELECT * */ ],
    "ceo":                    [ /* SELECT * */ ],
    "nhom_san_pham":          [ /* SELECT * */ ],
    "nhom_san_pham_san_pham": [ /* SELECT * */ ],
    "sales_session":          [ /* SELECT * — kể cả data, master_snapshot */ ]
  }
}
```

`dump_table()` dùng `SELECT *`, ánh xạ kiểu SQLite → JSON:

| SQLite | JSON |
|---|---|
| `NULL` | `null` |
| `Integer` | number |
| `Real` | number |
| `Text` | string (UTF-8 lossy) |
| `Blob` | string base64 (hàm base64 tự viết, không phụ thuộc crate ngoài) |

Bảng `_migrations` **không** nằm trong bản sao lưu — CSDL đích tự chạy migration khi khởi động.

JSON được xuất dạng `to_string_pretty` (dễ đọc, dung lượng lớn hơn).

### 12.2 Sao lưu / phục hồi bằng file

**Xuất ra file:**
1. Hộp thoại lưu, tên gợi ý `hang-wu-backup-<YYYY-MM-DD>.json`.
2. `build_backup(appVersion)` → chuỗi JSON.
3. `write_backup_file(path, content)` — ghi qua `.tmp` rồi `rename` (nguyên tử).
4. Notification xanh kèm đường dẫn.

**Phục hồi từ file:**
1. Bấm nút → **modal xác nhận** hiện trước, liệt kê các nhóm dữ liệu bị ảnh hưởng (Sản phẩm, Nhóm sản phẩm, CEO, Phiên báo cáo bán hàng) và câu cảnh báo `Hành động này không thể hoàn tác.`
2. Xác nhận → hộp thoại chọn file `*.json`.
3. `read_backup_file(path)` → `restore_backup(json)`.
4. `queryClient.invalidateQueries()` — invalidate **toàn bộ** cache.
5. Notification xanh dạng `Sản phẩm: 12 · CEO: 30 · Nhóm sản phẩm: 5 · Phiên báo cáo bán hàng: 3` (tự đóng sau 8s).

**Thuật toán `restore_backup`:**

```sql
BEGIN;
PRAGMA defer_foreign_keys=ON;
DELETE FROM nhom_san_pham_san_pham;
DELETE FROM nhom_san_pham;
DELETE FROM san_pham;
DELETE FROM ceo;
DELETE FROM sales_session;
-- rồi INSERT lại theo thứ tự: san_pham → ceo → nhom_san_pham → nhom_san_pham_san_pham → sales_session
COMMIT;   -- hoặc ROLLBACK nếu bất kỳ bước nào lỗi
```

- Kiểm tra `format` và `version` **trước** khi động vào CSDL.
- `defer_foreign_keys=ON` cho phép xoá/chèn không cần đúng thứ tự phụ thuộc trong transaction.
- Danh sách cột của mỗi bảng suy ra từ **khoá của bản ghi đầu tiên** trong mảng. Bảng rỗng → bỏ qua.
- Toàn bộ nằm trong một transaction: lỗi giữa chừng → `ROLLBACK`, dữ liệu cũ nguyên vẹn.
- `id` được ghi lại nguyên bản → mọi tham chiếu (`ceo_cap_tren_id`, bảng nối) vẫn đúng.

### 12.3 Sao lưu lên Cloudflare R2

#### Cấu hình khoá

Lần đầu bấm một trong hai nút, ứng dụng mở `CloudCredentialsModal` hỏi 4 thông tin:

| Trường | Loại |
|---|---|
| Account ID | `TextInput` |
| Tên bucket | `TextInput` |
| Access Key ID | `TextInput` |
| Secret Access Key | `PasswordInput` (mô tả: *"Cloudflare chỉ hiện chuỗi này đúng một lần lúc tạo token."*) |

Modal có liên kết tới `developers.cloudflare.com/r2/api/tokens/` và ghi rõ token cần quyền **Object Read & Write** trên đúng bucket đó.

**Quy trình lưu (`cloud_save_credentials`):**
1. `trim()` cả 4 trường; nếu có trường rỗng → `Vui lòng điền đủ 4 trường`.
2. **Gọi thử `ListObjectsV2`** lên bucket để kiểm chứng. Sai key → trả lỗi, **không lưu gì cả**.
3. Thành công → serialize JSON, `keyring.set_password()` → Windows Credential Manager (`service = com.hangwu.desktop`, `account = r2`).
4. Trả `CloudInfo` (không có secret).

**Nơi lưu khoá:** chỉ trong Windows Credential Manager. **Không** nằm trong mã nguồn, **không** trong CSDL, **không** trong bất kỳ file cấu hình nào.

Sau khi đã kết nối, thẻ hiển thị: tên bucket, badge `••••••XXXX`, dòng `Account <id>`, cùng hai nút **Đổi key** / **Xoá key**.

`cloud_credentials_info` trả `Ok(None)` khi chưa cấu hình — coi "chưa có key" là trạng thái bình thường, không phải lỗi.

#### Tải lên (`cloud_upload_backup`)

1. Nạp khoá; chưa có → lỗi `Chưa cấu hình key R2`.
2. Dựng JSON backup (giữ mutex trong phạm vi hẹp nhất rồi nhả ra trước khi chờ mạng).
3. Đặt tên đối tượng: `backups/hang-wu-backup-<YYYYMMDD>T<HHMMSS>Z.json` (UTC).
4. Ký `PutObject` (TTL 300s, path-style, region `auto`, endpoint `https://<account_id>.r2.cloudflarestorage.com`), `PUT` với `content-type: application/json`.
5. **Dọn bản cũ (`prune`)**: liệt kê theo prefix, sắp giảm dần theo `key` (tên file theo mốc thời gian nên thứ tự chữ cái trùng thứ tự thời gian), xoá mọi bản sau vị trí thứ `KEEP = 10`.
6. Trả `{ key, deleted, prune_error }`.

> **Quyết định:** bản sao lưu đã nằm trên R2 rồi, nên nếu bước dọn bản cũ lỗi thì **không** coi cả thao tác là thất bại. Lỗi được trả riêng ở `prune_error` và frontend hiện notification **màu vàng** `Sao lưu xong, nhưng chưa dọn được bản cũ`.

#### Phục hồi từ R2

1. `cloud_list_backups` → danh sách (sắp mới nhất lên đầu).
2. Modal chọn bản: mỗi mục hiện tên file (đã bỏ tiền tố `backups/`), thời điểm sửa đổi (`toLocaleString('vi-VN')`) và kích thước (`B` / `KB` / `MB`).
3. Bấm chọn → `cloud_download_backup(key)` tải nội dung về; đọc trước trường `exported_at` để hiển thị (đọc lỗi → `"không đọc được"`, `restore_backup` vẫn tự kiểm tra file).
4. Modal xác nhận (giống đường file, có thêm alert cam ghi tên bản và ngày xuất).
5. Xác nhận → `restore_backup(json)`.

#### Bảo vệ dữ liệu nhạy cảm trong thông báo lỗi

- `safe_err()` gọi `e.without_url()` — lỗi của `reqwest` có thể kèm nguyên URL **đã ký** (chứa chữ ký tạm thời), nên URL bị cắt trước khi lộ ra giao diện.
- `s3_error_code()` chỉ bóc thẻ `<Code>` trong XML lỗi của S3 (ví dụ `NoSuchBucket`) — phần này không chứa khoá hay chữ ký nên hiển thị được.

Ánh xạ mã HTTP → thông điệp:

| HTTP | Thông điệp |
|---|---|
| 401, 403 | `Key R2 không đúng hoặc không có quyền trên bucket này` |
| 404 | `Không tìm thấy bucket hoặc file trên R2` |
| khác, có `<Code>` | `R2 trả về lỗi <status> (<code>)` |
| khác, không có code | `R2 trả về lỗi <status>` |

#### Cảnh báo bảo mật (đã ghi trong README)

> JSON đẩy lên R2 **không được mã hoá**. Ai lấy được khoá R2 là đọc được dữ liệu. Khuyến nghị: giới hạn token đúng một bucket, và cân nhắc bật Bucket Lock để chống xoá nhầm.

---

## 13. Cập nhật ứng dụng

### 13.1 Cấu hình

```jsonc
"plugins": {
  "updater": {
    "active": true,
    "dialog": false,                       // KHÔNG dùng hộp thoại mặc định — UI tự làm
    "endpoints": [
      "https://github.com/huuyen911/hang-wu-desktop/releases/latest/download/latest.json"
    ],
    "pubkey": "<minisign public key>"
  }
}
```

`bundle.createUpdaterArtifacts: true` → tiến trình build sinh kèm file cập nhật đã ký.

### 13.2 Luồng người dùng (`UpdateButton`, góc dưới sidebar)

Máy trạng thái `idle → checking → available → downloading → ready`:

| Trạng thái | Giao diện |
|---|---|
| `idle` | Nút `Kiểm tra cập nhật` |
| `checking` | Nút ở trạng thái loading |
| không có bản mới | Notification `Đã là phiên bản mới nhất · v<x.y.z>`, quay về `idle` |
| `available` | Dòng chữ `Có bản mới: v<version>` + nút `Tải & cài đặt` |
| `downloading` | Dòng `Đang tải…` + `<pct>%` + thanh `Progress` (chỉ hiện % khi biết `contentLength`) |
| `ready` | `Đang khởi động lại…` → gọi `relaunch()` |
| lỗi | Notification đỏ `Không kiểm tra được cập nhật` / `Cập nhật thất bại`, quay về trạng thái trước |

Việc kiểm tra **hoàn toàn thủ công** — ứng dụng không tự gọi mạng khi khởi động.

### 13.3 Quyền (capabilities)

`src-tauri/capabilities/default.json`, áp cho cửa sổ `main`:

```
core:default
core:window:allow-destroy      ← cần cho flush-trước-khi-đóng
dialog:allow-open
dialog:allow-save
updater:default
process:allow-restart
process:default
```

Danh sách này là **tối thiểu cần thiết** — không có quyền `fs`, `shell`, `http` tổng quát. Mọi thao tác file đều đi qua command Rust cụ thể.

---

## 14. Yêu cầu phi chức năng

### 14.1 Hiệu năng

| Điểm | Biện pháp |
|---|---|
| Đọc Excel lớn | Parse ở Rust bằng `calamine`; truyền **đường dẫn** qua IPC thay vì bytes để tránh JSON-serialize file hàng chục MB |
| Bảng ma trận | Toàn bộ phép dẫn xuất nặng (dò cột, gom thùng, cộng tổng cột) gói trong một `useMemo` duy nhất |
| Trang master-data | Element bảng/cây được memo hoá riêng, để việc gõ trong modal không reconcile lại toàn bộ bảng |
| Ô tìm kiếm | Debounce 300ms ở master-data và bộ lọc báo cáo |
| Bảng dữ liệu phiên | Phân trang cứng 50 dòng/trang |
| Tab thương hiệu | `keepMounted={false}` — chỉ brand đang chọn được render |
| Ghi CSDL | Autosave debounce 500ms + hàng đợi nối tiếp |
| Cache | `staleTime: Infinity` — không refetch nền |
| Binary | `profile.release`: `panic=abort`, `codegen-units=1`, `lto=true`, `opt-level="s"`, `strip=true` |

### 14.2 Bảo mật & riêng tư

| Khía cạnh | Trạng thái |
|---|---|
| Kết nối ra ngoài | **Chỉ hai đường**, đều do người dùng bấm: kiểm tra cập nhật (GitHub) và sao lưu/phục hồi R2 |
| Cổng lắng nghe | Không mở cổng nào; IPC trong tiến trình |
| Lưu khoá R2 | Windows Credential Manager, không nằm trong source/CSDL/file cấu hình |
| Hiển thị khoá | Chỉ hiện `••••••` + 4 ký tự cuối |
| Rò rỉ qua log lỗi | URL đã ký bị cắt (`without_url()`) trước khi lộ ra UI |
| Truy vấn SQL | Chủ yếu dùng tham số bind (`params!`); một số chỗ nội suy `id: i64` bằng `format!` (xem 17.4) |
| CSP | `csp: null` — **không bật** Content Security Policy |
| Mã hoá dữ liệu | CSDL SQLite và file backup **không mã hoá** |
| Xác thực | Không có — bất kỳ ai truy cập được máy đều dùng được app và dữ liệu |

### 14.3 Độ tin cậy

- **Migration nguyên tử** — mỗi file chạy trong một transaction, tránh trạng thái nửa vời gây panic vĩnh viễn.
- **Ghi file backup nguyên tử** — qua `.tmp` + `rename`.
- **Phục hồi nguyên tử** — toàn bộ trong một transaction, lỗi thì rollback.
- **WAL mode** — chịu được crash tốt hơn journal mặc định.
- **Chốt phiên** — cơ chế bảo vệ số liệu lịch sử khỏi thay đổi master data về sau.
- **Chặn đóng cửa sổ để flush autosave** — không mất thao tác cuối.

### 14.4 Khả năng tiếp cận (a11y)

Có làm:
- `aria-label` cho mọi `ActionIcon` (`Sửa sản phẩm <mã>`, `Xoá phiên <tên>`, …).
- `aria-current="page"` cho mục sidebar đang mở.
- `scope="col"` trên các `<th>`.
- Ô ma trận có dữ liệu: `role="button"`, `tabIndex=0`, xử lý `Enter`/`Space`, `:focus-visible` viền xanh.
- Vùng thả file: `role="button"`, `tabIndex=0`, bàn phím hoạt động.
- Thẻ trang chủ có `:focus-visible`.

Chưa làm: không có kiểm thử screen reader, một số bảng tự dựng bằng `<table>` thuần chưa có `caption`, màu sắc chưa được kiểm tra tương phản WCAG.

### 14.5 Quốc tế hoá

Không có hệ thống i18n. Mọi chuỗi hiển thị **cứng bằng tiếng Việt** ở cả frontend lẫn thông điệp lỗi Rust. Định dạng số/tiền cố định locale `vi-VN`.

---

## 15. Xử lý lỗi & thông báo

### 15.1 Nguyên tắc

- **Lỗi nghiệp vụ** (validate, trùng mã, phiên đã chốt) → chuỗi tiếng Việt từ Rust, hiển thị nguyên văn.
- **Lỗi kỹ thuật** (SQL, IO) → chuỗi lỗi gốc, có thể lẫn tiếng Anh.
- Lỗi validate ở form master-data hiện **ngay dưới trường** (client-side) trước khi gọi backend.
- Lỗi khi lưu/xoá hiện qua **notification** ở góc màn hình.
- Thao tác phá huỷ luôn có **modal xác nhận** riêng.

### 15.2 Bảng thông báo

| Sự kiện | Loại | Tiêu đề | Ghi chú |
|---|---|---|---|
| Thêm master-data thành công | xanh | `Thêm mới thành công` | `<Loại> "<tên>" đã được lưu` |
| Sửa master-data thành công | xanh | `Cập nhật thành công` | |
| Xoá master-data thành công | cam | `Đã xóa` | |
| Lỗi mutation master-data | đỏ | `Lỗi` | |
| Lưu phiên import thành công | xanh | `Đã lưu phiên` | `<tên> · <n> dòng` |
| Lưu phiên import thất bại | đỏ | `Lưu phiên thất bại` | |
| Autosave thất bại | đỏ | `Lưu phiên thất bại` | không chặn thao tác tiếp |
| Đổi tên phiên | xanh | `Đã đổi tên phiên` | |
| Xoá phiên | cam | `Đã xóa phiên` | |
| Chốt phiên | xanh + icon khoá | — | `Đã chốt phiên — số liệu & thưởng đã cố định theo master hiện tại` |
| Chốt thất bại | đỏ | `Chốt phiên thất bại` | |
| Hủy chốt | xanh + icon ✓ | — | `Đã hủy chốt — báo cáo đã cập nhật theo master mới nhất` |
| Hủy chốt thất bại | đỏ | `Hủy chốt thất bại` | |
| Xuất Excel thành công | xanh | `Đã xuất file Excel` | tự đóng 6s |
| Xuất Excel thất bại | đỏ | `Xuất Excel thất bại` | |
| Xuất backup thành công | xanh | `Đã xuất bản sao lưu` | tự đóng 6s |
| Xuất backup thất bại | đỏ | `Xuất sao lưu thất bại` | |
| Phục hồi thành công | xanh | `Phục hồi thành công` | tóm tắt số bản ghi, đóng 8s |
| Phục hồi thất bại | đỏ | `Phục hồi thất bại` | |
| Kết nối R2 thành công | xanh | `Đã kết nối R2` | |
| Tải lên R2 thành công | xanh | `Đã sao lưu lên R2` | kèm `đã dọn <n> bản cũ` nếu có |
| Dọn bản cũ thất bại | **vàng** | `Sao lưu xong, nhưng chưa dọn được bản cũ` | đóng 8s |
| Tải lên R2 thất bại | đỏ | `Sao lưu lên mây thất bại` | |
| Liệt kê R2 thất bại | đỏ | `Không lấy được danh sách bản sao lưu` | |
| Tải bản sao lưu thất bại | đỏ | `Tải bản sao lưu thất bại` | |
| Xoá key R2 | xám | `Đã xoá key R2` | |
| Xoá key thất bại | đỏ | `Không xoá được key` | |
| Đã là bản mới nhất | teal | `Đã là phiên bản mới nhất` | |
| Kiểm tra cập nhật lỗi | đỏ | `Không kiểm tra được cập nhật` | |
| Cập nhật thất bại | đỏ | `Cập nhật thất bại` | |

### 15.3 Trạng thái lỗi toàn màn

| Nơi | Điều kiện | Hiển thị |
|---|---|---|
| Màn báo cáo | Lỗi đọc file Excel | `Alert` đỏ `Lỗi đọc file` + nút `Thử lại` |
| Màn báo cáo | Mở phiên thất bại | `Không tải được phiên này.` + nút `Về danh sách` |
| Master-data | Query lỗi | `Alert` đỏ trên đầu bảng |

---

## 16. Cấu hình, build & phát hành

### 16.1 Yêu cầu môi trường

| Thành phần | Yêu cầu |
|---|---|
| Hệ điều hành | Windows 10/11 (đóng gói). Dev được trên macOS/Linux. |
| Node.js | ≥ 20 (khuyến nghị 22 LTS) |
| Rust | toolchain stable (`rustup.rs`) |
| WebView2 Runtime | Có sẵn trên Windows 11; Windows 10 cần cài thêm |

**Sau mạng công ty có proxy TLS**, nếu `npm install` lỗi chứng chỉ:

```powershell
$env:NODE_OPTIONS = "--use-system-ca"
npm install
```

(Cần Node 22.15+ / 24 để có cờ `--use-system-ca`.)

### 16.2 Lệnh

| Lệnh | Tác dụng |
|---|---|
| `npm run dev` | Chạy đầy đủ: Vite + cửa sổ Tauri dev (hot-reload UI + backend Rust) |
| `npm run dev:vite` | Chỉ Vite trên `localhost:1420` (không có Tauri → mọi `invoke` sẽ lỗi) |
| `npm run build:vite` | Build frontend vào `dist/` |
| `npm run build` | Build production đầy đủ (Vite + Tauri → NSIS installer) |
| `npm run typecheck` | `tsc --noEmit` |

### 16.3 Cấu hình Vite

- Alias `@` → `src/`.
- `define.__APP_VERSION__` = `pkg.version` (khai báo kiểu ở `src/global.d.ts`). Đây là nguồn duy nhất cho số phiên bản hiển thị trên UI và ghi vào file backup.
- Dev server cố định cổng `1420`, `strictPort: true` (Tauri yêu cầu cổng cố định).
- Plugin: `@tailwindcss/vite`, `@vitejs/plugin-react`.

### 16.4 Đóng gói

```jsonc
"bundle": {
  "targets": ["nsis"],
  "resources": { "migrations/*": "migrations/" },   // migration đi kèm bản cài
  "windows": { "nsis": { "installMode": "currentUser" } },
  "createUpdaterArtifacts": true
}
```

Kết quả: `src-tauri/target/release/bundle/nsis/`.

Icon nằm ở `src-tauri/icons/` (đầy đủ bộ Windows/macOS/iOS/Android). Đổi icon: thay file hoặc chạy `tauri icon <file.png>` để sinh lại.

### 16.5 Quy trình phát hành

1. Tăng `version` **đồng bộ ở ba nơi**: `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`.
2. Đẩy tag `v<x.y.z>`.
3. GitHub Actions (`.github/workflows/release.yml`) chạy trên `windows-latest`:
   - `actions/setup-node@v4` (Node 20, cache npm)
   - `dtolnay/rust-toolchain@stable`
   - `Swatinem/rust-cache@v2` (workspace `src-tauri`)
   - `npm ci`
   - `tauri-apps/tauri-action@v0` với `TAURI_SIGNING_PRIVATE_KEY` + `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` từ secrets; tạo release **không draft**, tự sinh release notes, `updaterJsonPreferNsis: true`.
4. Người dùng cài đè bản cũ — dữ liệu trong `%APPDATA%` được giữ nguyên.

Workflow cũng chạy được thủ công qua `workflow_dispatch`.

### 16.6 Vòng đời dữ liệu khi vận hành

| Tình huống | Kết quả |
|---|---|
| Chạy lần đầu | Tự tạo CSDL rỗng và chạy toàn bộ migration |
| Cài đè bản mới | Giữ nguyên CSDL; migration mới (nếu có) tự chạy |
| Chuyển máy | Copy file `hang-wu.db` là đủ (hoặc dùng backup JSON / R2) |
| Reset sạch | Xoá file `hang-wu.db`, mở lại app |
| Chạy `tauri dev` | Dùng CSDL riêng ở `dev-data/`, không đụng dữ liệu thật |

---

## 17. Giới hạn đã biết & sai lệch trong hiện thực

Phần này ghi lại những điểm mà **mã nguồn hiện tại khác với ý định được ghi trong chính comment/tài liệu**, hoặc những giới hạn có thể gây bất ngờ. Đây là quan sát về bản `0.1.5`, không phải đề xuất sửa.

### 17.1 `calcTotalThung()` không làm tròn như docstring mô tả

`src/tools/SalesReport/utils/report.ts:50-77` — docstring ghi *"tích lũy raw … rồi floor từng key và cộng lại"*, nhưng vòng lặp cuối cộng thẳng giá trị chưa `floor`:

```ts
keyRawMap.forEach((v) => { total += v; });   // không có Math.floor
```

Hệ quả: ô **"Tổng thùng"** trên thanh thống kê, số thùng ở danh sách CEO và ở header CEO **không khớp** với cột `Tổng thùng` trong bảng ma trận (bảng ma trận floor theo cột). Chênh lệch bằng đúng tổng phần lẻ bị cắt. Việc hiển thị bằng `fmtDecimal` (5 chữ số thập phân) khiến hiện tượng này lộ ra rõ.

### 17.2 Ràng buộc "sản phẩm chính" vs "thương hiệu gốc" không nhất quán giữa UI và server

Ở form **Nhóm sản phẩm**, `MultiSelect` liệt kê sản phẩm theo cờ **"là SP chính của thương hiệu đã chọn"** (không quan tâm `sp.thuong_hieu`). Nhưng `check_san_pham_brand()` phía Rust lại đòi `sp.thuong_hieu` **trùng** thương hiệu nhóm.

Hệ quả: có thể chọn được một sản phẩm trong dropdown rồi bị server từ chối với thông điệp `Sản phẩm sau không thuộc thương hiệu <brand>: …`.

### 17.3 Cây CEO chỉ chặn tự tham chiếu trực tiếp

`ceo.rs::validate()` chỉ kiểm tra `ceo_cap_tren_id == id`. Chu trình gián tiếp (A → B → A) **không bị chặn**. Nếu tạo được chu trình, `buildTree()` ở màn CEO sẽ không đưa các nút đó vào cây (vì không nút nào có `parent = null` trong chu trình) — chúng sẽ **biến mất khỏi giao diện** thay vì gây treo, nhưng vẫn tồn tại trong CSDL.

### 17.4 Một số câu SQL nội suy `id` bằng `format!`

`nhom_san_pham.rs::get_by_id()` và `check_san_pham_unique_group()` chèn `id` / `exclude_nhom_id` trực tiếp vào chuỗi SQL thay vì bind tham số. Giá trị là `i64` do Rust kiểm kiểu nên **không có rủi ro injection thực tế**, nhưng khác phong cách với phần còn lại của codebase.

Tương tự, `san_pham.rs::create_san_pham()` dựng câu SELECT bằng `LIST_SQL.replace("ORDER BY thuong_hieu, ma_san_pham", "")` rồi nối `WHERE id = ?1` — hoạt động đúng nhưng phụ thuộc vào chuỗi `ORDER BY` khớp chính xác.

### 17.5 `create/update_nhom_san_pham` không nguyên tử

Việc ghi bản ghi nhóm và `sync_members()` nằm ngoài transaction chung. Lỗi ở bước đồng bộ thành viên để lại nhóm với danh sách sản phẩm dở dang.

### 17.6 `restore_backup` không kiểm tra lược đồ cột

Danh sách cột lấy từ **khoá của bản ghi đầu tiên** trong mảng. Nếu phục hồi một file backup sinh bởi bản app cũ hơn (thiếu cột `thuong_ceo`, `locked_at`…), lệnh `INSERT` vẫn chạy và các cột thiếu nhận giá trị mặc định. Ngược lại, backup từ bản **mới hơn** (có cột chưa tồn tại ở CSDL đích) sẽ làm `INSERT` lỗi và rollback. Trường `version` chỉ có một giá trị (`1`) nên không phân biệt được các biến thể này.

### 17.7 Thưởng cấp trên có thể "biến mất" khỏi báo cáo

Trong `computeCeoBonuses`, khoản `superiorAmount` chỉ hiển thị nếu **CEO cấp trên nằm trong `visibleCEOs`**. Nếu cấp trên bị bộ lọc loại ra, hoặc mã cấp trên không khớp prefix của tab thương hiệu đang xem, khoản thưởng đó không xuất hiện ở bất kỳ hàng nào — tổng thưởng của tab sẽ nhỏ hơn tổng thực tế.

### 17.8 Ba cách tính số thùng cùng tồn tại

Xem bảng ở mục 9.5. Bảng chi tiết và modal ô dùng cách tính theo dòng hoá đơn, không làm tròn, nên số ở đó cũng không khớp ô tương ứng trong ma trận.

### 17.9 Mốc thời gian trộn UTC và giờ địa phương

`san_pham`, `ceo`, `nhom_san_pham` dùng `datetime('now')` (UTC); `sales_session` dùng `datetime('now','localtime')`. `exported_at` trong file backup là UTC. Frontend hiển thị `created_at`/`updated_at` của phiên bằng `dayjs` **không chuyển múi giờ** — đúng vì đó là giờ địa phương, nhưng nếu áp cùng cách hiển thị cho mốc của master data thì sẽ lệch.

### 17.10 Xoá dòng trong tab Dữ liệu không có trạng thái chờ

`SalesRowsTable` truyền `isDeleting={false}` cố định cho `DeleteConfirmModal` — thao tác xoá chỉ sửa mảng trong bộ nhớ rồi để autosave lo, nên không có phản hồi "đang xoá". Đây là hành vi có chủ đích (xoá là tức thì) chứ không phải lỗi, nhưng khác với các màn master-data.

### 17.11 Không có kiểm thử tự động

Không có test đơn vị, test tích hợp, hay test e2e trong repo. Đặc biệt đáng chú ý với `parse_localized_number()`, `aggregateRows()`, `computeCeoBonuses()` và các phép quy đổi thùng — đây là những hàm thuần, dễ test và có rủi ro sai số cao nhất.

### 17.12 Giới hạn khác

- Chỉ đọc **sheet đầu tiên** của file Excel; chỉ số cột cứng trong mã.
- `sales_session.data` là JSON nguyên khối — với phiên rất lớn, mỗi lần autosave phải ghi lại toàn bộ chuỗi.
- Không có phân trang / lazy-load cho danh sách phiên hay danh sách master-data.
- `csp: null` — không bật Content Security Policy.
- Không có cơ chế undo cho bất kỳ thao tác nào.
- Backup JSON không mã hoá và không nén.

---

## 18. Phụ lục — cây thư mục

```
hang-wu-desktop/
├─ .github/workflows/release.yml     CI: build & publish khi push tag v*
├─ index.html                        Điểm vào Vite
├─ vite.config.ts                    Alias @, __APP_VERSION__, cổng 1420
├─ tsconfig.json / tsconfig.node.json
├─ package.json                      Phiên bản 0.1.5, scripts
│
├─ public/clover.png
├─ dev-data/                         CSDL chế độ dev (không commit)
│
├─ src/                              ── RENDERER ──────────────────────────
│  ├─ main.tsx                       QueryClient + MantineProvider + Notifications
│  ├─ App.tsx                        createHashRouter, bảng định tuyến
│  ├─ index.css
│  ├─ global.d.ts                    declare __APP_VERSION__
│  │
│  ├─ components/
│  │  ├─ Layout.tsx                  AppShell (navbar 240px + main 100vh)
│  │  ├─ Sidebar.tsx                 Điều hướng + UpdateButton + số phiên bản
│  │  ├─ UpdateButton.tsx            Máy trạng thái cập nhật
│  │  ├─ CloudCredentialsModal.tsx   Nhập & kiểm chứng key R2
│  │  └─ crud/
│  │     ├─ CrudShell.tsx            Khung trang master-data
│  │     ├─ FormModal.tsx            Modal tạo/sửa dùng chung
│  │     └─ DeleteConfirmModal.tsx   Modal xác nhận xoá dùng chung
│  │
│  ├─ domain/constants.ts            BRAND_CONFIG, THUONG_HIEU/NHAN_VIEN, helper màu & prefix
│  ├─ hooks/
│  │  ├─ useCrudResource.ts          CRUD + modal + lọc dùng chung
│  │  └─ useDebounce.ts
│  ├─ lib/
│  │  ├─ api.ts                      Façade REST → tên Tauri command
│  │  └─ queryKeys.ts                RESOURCES tập trung
│  ├─ styles/table.ts                mantineTableProps, thSticky
│  ├─ utils/search.ts                normalizeSearch (bỏ dấu)
│  │
│  ├─ pages/
│  │  ├─ Home.tsx                    Lưới thẻ 3 nhóm
│  │  ├─ MasterDataPage.tsx          Router → registry (lazy + Suspense)
│  │  ├─ ToolPage.tsx                Router → registry (lazy + Suspense)
│  │  └─ BackupPage.tsx              Sao lưu file + R2
│  │
│  ├─ master-data/
│  │  ├─ registry.tsx                3 trang: san-pham, nhom-san-pham, ceo
│  │  ├─ SanPham/{index.tsx,types.ts}
│  │  ├─ NhomSanPham/{index.tsx,types.ts}
│  │  └─ CEO/{index.tsx,types.ts}    Hiển thị dạng cây
│  │
│  └─ tools/
│     ├─ registry.tsx                1 công cụ: sales-report
│     └─ SalesReport/
│        ├─ index.tsx                Máy trạng thái: chọn file → đặt tên → DataView
│        ├─ parser.ts                invoke parse_excel_file, makeRowId
│        ├─ aggregate.ts             aggregateRows()  ★ lõi tổng hợp
│        ├─ bonus.ts                 computeCeoBonuses(), buildBonusExportData()  ★ lõi thưởng
│        ├─ format.ts                Định dạng số/tiền vi-VN
│        ├─ types.ts                 SalesRow, ParsedReport, SalesSession, MasterSnapshot
│        ├─ FileDropZone.tsx         Chọn / kéo-thả file (Tauri drag-drop event)
│        ├─ hooks/
│        │  ├─ useSalesRows.ts       Phiên đang mở + autosave  ★
│        │  ├─ useSalesSessions.ts   Lịch sử phiên + lock/unlock
│        │  └─ useReportMasterData.ts  Master live ↔ snapshot + các map dẫn xuất  ★
│        ├─ utils/
│        │  ├─ report.ts             makeBrandMatcher, applyOnlyMain, calcTotalThung, mergeCEOsAcrossBrands
│        │  ├─ matrixExport.ts       Dựng dữ liệu xuất Excel cho ma trận
│        │  └─ tableStyles.ts
│        └─ components/
│           ├─ DataView.tsx          Thanh trên + tab Báo cáo/Dữ liệu + modal chốt
│           ├─ BrandPanel.tsx        Thống kê + bộ lọc + 3 chế độ xem
│           ├─ MatrixTable.tsx       Bảng ma trận CEO × nhóm  ★
│           ├─ CellDetailModal.tsx   Chi tiết một ô ma trận
│           ├─ CEOListItem.tsx       Mục danh sách CEO
│           ├─ CEODetailTable.tsx    Bảng chi tiết theo nhóm
│           ├─ BonusTable.tsx        Bảng thưởng + modal breakdown
│           ├─ SalesRowsTable.tsx    Bảng dữ liệu phẳng + CRUD + phân trang
│           ├─ SalesRowFormModal.tsx Form thêm/sửa dòng
│           ├─ SessionHistory.tsx    Bảng lịch sử phiên
│           ├─ ImportNameModal.tsx   Đặt tên phiên
│           ├─ SearchInput.tsx
│           └─ BrandTag.tsx          Badge W/E cross-brand
│
└─ src-tauri/                        ── MAIN PROCESS ─────────────────────
   ├─ Cargo.toml                     Phiên bản 0.1.5, profile release tối ưu size
   ├─ build.rs
   ├─ tauri.conf.json                Cửa sổ, bundle NSIS, updater
   ├─ capabilities/default.json      Quyền tối thiểu
   ├─ icons/                         Bộ icon đa nền tảng
   ├─ migrations/                    0001…0007 *.sql
   └─ src/
      ├─ main.rs                     Entry point
      ├─ lib.rs                      Setup DB, đăng ký 27 command
      ├─ db/mod.rs                   open() + migration runner
      └─ commands/
         ├─ mod.rs
         ├─ san_pham.rs              CRUD + fetch_all
         ├─ ceo.rs                   CRUD + fetch_all
         ├─ nhom_san_pham.rs         CRUD + kiểm tra brand/unique + sync thành viên
         ├─ sales_session.rs         CRUD + lock/unlock + snapshot  ★
         ├─ excel.rs                 calamine (đọc) + rust_xlsxwriter (ghi)  ★
         ├─ backup.rs                dump/restore JSON
         └─ cloud.rs                 Cloudflare R2 + keyring  ★
```

★ = tệp chứa logic nghiệp vụ cốt lõi.

---

*Tài liệu này mô tả bản `0.1.5`. Khi thay đổi cấu trúc cột Excel, mô hình thưởng, hoặc lược đồ CSDL, cần cập nhật tương ứng các mục 4, 9, 10.*
