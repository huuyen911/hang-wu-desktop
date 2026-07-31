# Hằng Wonder Union — Desktop

Ứng dụng desktop cho một người dùng. Quản lý dữ liệu gốc (khách hàng / nhóm sản
phẩm / sản phẩm) và lập **báo cáo bán hàng** từ file Excel. Toàn bộ dữ liệu nằm
trong **SQLite local** trên máy — không server, không tài khoản.

Mọi nghiệp vụ chạy offline. Chỉ hai tính năng chủ động gọi ra mạng, và đều do
người dùng bấm: kiểm tra cập nhật, và sao lưu / phục hồi qua Cloudflare R2 (xem
[Dữ liệu & sao lưu](#dữ-liệu--sao-lưu)).

## Tính năng

- **Dữ liệu gốc:** CRUD Khách hàng (CEO), Nhóm sản phẩm, Sản phẩm — kèm tìm
  kiếm và ánh xạ sản phẩm ↔ nhóm.
- **Báo cáo bán hàng:** import file Excel, tự bóc tách và tổng hợp doanh số
  theo khách hàng / thương hiệu.
- **Lịch sử phiên:** mỗi lần import là một *phiên* lưu trong DB — đặt tên, mở
  lại, đổi tên, xoá. Sửa dòng trong phiên được tự lưu (autosave) xuống DB.
- **Sao lưu & phục hồi:** xuất/nhập file JSON, hoặc đẩy thẳng lên bucket
  Cloudflare R2 của bạn để máy khác tải về.
- **Riêng tư:** mọi xử lý nghiệp vụ chạy tại chỗ; dữ liệu chỉ rời máy khi bạn
  bấm sao lưu lên mây.

## Kiến trúc

| Lớp | Công nghệ |
|---|---|
| Giao diện (renderer) | React 19 + Vite + Mantine 9 + TanStack Query |
| Cầu nối | Tauri IPC (`invoke`) — không HTTP server, không port |
| Backend (main process) | Rust trên `rusqlite` (SQLite native, không WASM) |
| CSDL | SQLite tại `%APPDATA%\com.hangwu.desktop\hang-wu.db` |
| Migrations | `src-tauri/migrations/*.sql` tự chạy lúc khởi động |

`rusqlite` dùng SQLite native (bundled), không cần WASM. Nhanh hơn và ổn định hơn so với sql.js trước đây.

## Yêu cầu

- **Windows 10/11** (mục tiêu đóng gói chính; dev được trên macOS/Linux).
- **Node.js 20 trở lên** (khuyến nghị 22 LTS).
- **Rust toolchain** — cài tại [rustup.rs](https://rustup.rs).
- **WebView2 Runtime** — có sẵn trên Windows 11; Windows 10 tải tại
  [microsoft.com/en-us/edge/webview2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

## Cài đặt & chạy

```bash
# 1. Cài phụ thuộc JS
npm install

# 2. Chạy app ở chế độ dev (hot-reload giao diện + Rust backend)
npm run dev
```

Lần chạy đầu tiên app tự tạo CSDL rỗng tại
`%APPDATA%\com.hangwu.desktop\hang-wu.db` và chạy toàn bộ migrations.

### Sau mạng công ty (proxy TLS) — nếu `npm install` lỗi chứng chỉ

```powershell
$env:NODE_OPTIONS = "--use-system-ca"
npm install
```

(Cần Node 22.15+ / 24 để có cờ `--use-system-ca`.)

## Các lệnh khác

```bash
npm run dev:vite    # chỉ khởi động Vite (không có Tauri)
npm run build:vite  # build frontend vào dist/
npm run dev         # chạy đầy đủ: Vite + Tauri dev window
npm run build       # build production (Vite + Tauri)
```

## Đóng gói phát hành

```bash
npm run build
```

Tạo file cài đặt NSIS tại `src-tauri/target/release/bundle/nsis/`. Cấu hình
đóng gói nằm ở `src-tauri/tauri.conf.json`; `migrations/` được copy vào
resources của bản đóng gói.

Phát hành phiên bản mới: tăng `version` trong `src-tauri/tauri.conf.json` và
`src-tauri/Cargo.toml` → `npm run build` → gửi file Setup mới. Cài đè lên bản
cũ, dữ liệu trong `%APPDATA%` được giữ nguyên.

## Dữ liệu & sao lưu

- **Vị trí:** `%APPDATA%\com.hangwu.desktop\hang-wu.db` (một file SQLite duy nhất).
- **Sao lưu / di chuyển máy:** copy đúng file đó là đủ.
- **Sao lưu lên mây (Cloudflare R2):** màn *Sao lưu & Phục hồi* đẩy bản sao lưu
  lên bucket R2 của bạn dưới prefix `backups/`, máy khác chọn bản cần và tải
  thẳng về. Lần đầu bấm, app hỏi 4 thông tin (Account ID, tên bucket, Access
  Key ID, Secret Access Key) — key được kiểm chứng bằng một lần gọi thử rồi mới
  lưu vào **Windows Credential Manager**, không nằm trong source, không trong DB
  và không trong file cấu hình nào. Đổi/xoá key ngay trên màn đó.
- **Lưu ý:** JSON đẩy lên R2 **không được mã hoá**. Ai lấy được key R2 là đọc
  được dữ liệu, nên hãy scope token đúng một bucket và cân nhắc bật Bucket Lock
  để chống xoá nhầm.
- **Reset sạch:** xoá file đó → mở app lại sẽ tạo DB rỗng và chạy lại migrations.
- **Migrations:** thêm file `src-tauri/migrations/NNNN_*.sql` (đánh số tăng
  dần); app áp dụng các file chưa chạy theo thứ tự tên, ghi nhận vào bảng
  `_migrations` — idempotent, không lặp lại migration cũ.

## Cấu trúc thư mục

```
src-tauri/
  src/
    commands/    Rust commands (san_pham, ceo, nhom_san_pham, sales_session, backup, cloud, excel)
    db/          Kết nối SQLite và runner migrations
    lib.rs       Đăng ký Tauri commands
    main.rs      Entry point
  migrations/    *.sql áp dụng tuần tự lúc khởi động
  tauri.conf.json
  Cargo.toml
src/             Giao diện React (renderer) — màn dữ liệu gốc & Báo cáo bán hàng
```

## Ghi chú

- **Icon:** nằm trong `src-tauri/icons/`. Tauri tự dùng khi build. Đổi icon =
  thay các file trong thư mục đó (dùng `tauri icon <file.png>` để sinh lại).
- **Mạng:** app không mở cổng nào và không có server; mọi giao tiếp UI ↔ backend
  đi qua Tauri IPC trong tiến trình. Kết nối ra ngoài chỉ xảy ra khi bạn bấm
  kiểm tra cập nhật hoặc sao lưu/phục hồi qua R2.
