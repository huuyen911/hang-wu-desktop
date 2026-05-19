# Hằng Wonder Union — Desktop

Ứng dụng desktop **chạy offline hoàn toàn** cho một người dùng. Quản lý dữ liệu
gốc (khách hàng / nhóm sản phẩm / sản phẩm) và lập **báo cáo bán hàng** từ file
Excel. Toàn bộ dữ liệu nằm trong **SQLite local** trên máy — không server,
không tài khoản, không kết nối mạng.

## Tính năng

- **Dữ liệu gốc:** CRUD Khách hàng (CEO), Nhóm sản phẩm, Sản phẩm — kèm tìm
  kiếm và ánh xạ sản phẩm ↔ nhóm.
- **Báo cáo bán hàng:** import file Excel, tự bóc tách và tổng hợp doanh số
  theo khách hàng / thương hiệu.
- **Lịch sử phiên:** mỗi lần import là một *phiên* lưu trong DB — đặt tên, mở
  lại, đổi tên, xoá. Sửa dòng trong phiên được tự lưu (autosave) xuống DB.
- **Riêng tư:** mọi xử lý chạy tại chỗ, không gửi dữ liệu ra ngoài.

## Kiến trúc

| Lớp | Công nghệ |
|---|---|
| Giao diện (renderer) | React 19 + Vite + Mantine 9 + TanStack Query |
| Cầu nối | Electron IPC (`window.api.invoke`) — **không HTTP server, không port** |
| Backend (main process) | TypeScript thuần trên `sql.js` (SQLite biên dịch WASM) |
| CSDL | SQLite tại `%APPDATA%\hang-wu-desktop\hang-wu.db` |
| Migrations | `migrations/*.sql` tự chạy lúc khởi động (bảng `_migrations`) |

`sql.js` chạy SQLite trong RAM; sau mỗi thao tác ghi, toàn bộ DB được export ra
file `hang-wu.db`. Ưu điểm: **không cần biên dịch native** (không node-gyp,
không Visual Studio Build Tools) → cài và chạy được trên mọi máy.

## Yêu cầu

- **Windows 10/11** (mục tiêu đóng gói chính; dev được trên macOS/Linux).
- **Node.js 20 trở lên** (khuyến nghị 22 LTS hoặc mới hơn).
- Không cần trình biên dịch C/C++ hay build tool nào khác.

## Cài đặt & chạy

```bash
# 1. Cài phụ thuộc (kéo luôn Electron binary + sql.js WASM)
npm install

# 2. Chạy app ở chế độ dev (hot-reload giao diện)
npm run dev
```

Lần chạy đầu tiên app tự tạo CSDL rỗng tại
`%APPDATA%\hang-wu-desktop\hang-wu.db` và chạy toàn bộ migrations. Nhập liệu
trực tiếp trong app hoặc import Excel ở màn **Báo cáo bán hàng**.

### Sau mạng công ty (proxy TLS) — nếu `npm install` lỗi chứng chỉ

Nếu `npm install` báo `unable to verify the first certificate` khi tải Electron
binary, cho Node đọc kho chứng chỉ của Windows (đã có CA của công ty):

```powershell
$env:NODE_OPTIONS = "--use-system-ca"
npm install
```

(Cần Node 22.15+ / 24 để có cờ `--use-system-ca`.)

## Các lệnh khác

```bash
npm run typecheck   # kiểm tra type cả main lẫn renderer
npm run build       # typecheck + build production vào out/
npm run build:win   # build + đóng gói installer .exe (NSIS) vào release/
npm run start        # xem thử bản đã build (electron-vite preview)
```

## Đóng gói phát hành

```bash
npm run build:win
```

Tạo file cài đặt NSIS `release/Hang Wonder Union Setup <version>.exe`. Cấu
hình đóng gói nằm ở `electron-builder.yml`; `migrations/`, `sql-wasm.wasm` và
icon được copy vào resources của bản đóng gói nên app cài đặt vẫn chạy
migrations bình thường.

`build:win` gọi `scripts/package-win.mjs` lo sẵn 2 việc, **không cần quyền
admin / Developer Mode**:

- Tự giải nén gói `winCodeSign` vào cache của electron-builder nhưng **loại
  trừ thư mục `darwin/`** — gói này có symlink macOS, giải nén trên Windows
  bằng tài khoản thường sẽ lỗi *"Cannot create symbolic link"*; phần `darwin`
  không cần trên Windows. Idempotent: cache có rồi thì bỏ qua.
- Ép `CSC_IDENTITY_AUTO_DISCOVERY=false` → bỏ qua ký số (app nội bộ, không
  có chứng chỉ), không dò chứng chỉ trong máy.

Phát hành phiên bản mới: tăng `version` trong `package.json` → `npm run
build:win` → gửi file Setup mới. Cài đè lên bản cũ, dữ liệu trong `%APPDATA%`
được giữ nguyên.

## Dữ liệu & sao lưu

- **Vị trí:** `%APPDATA%\hang-wu-desktop\hang-wu.db` (một file SQLite duy nhất).
- **Sao lưu / di chuyển máy:** copy đúng file đó là đủ.
- **Reset sạch:** xoá file đó → mở app lại sẽ tạo DB rỗng và chạy lại migrations.
- **Migrations:** thêm file `migrations/NNNN_*.sql` (đánh số tăng dần); app áp
  dụng các file chưa chạy theo thứ tự tên, ghi nhận vào bảng `_migrations` nên
  idempotent — chạy lại lúc khởi động không lặp lại migration cũ.

## Cấu trúc thư mục

```
electron/        Main process: kết nối DB (sql.js), runner migrations, IPC router, API
  db/            connection.ts (facade SQLite), migrate.ts
  api/           các resource (san_pham, ceo, nhom_san_pham, sales_session) + router
src/             Giao diện React (renderer) — màn dữ liệu gốc & Báo cáo bán hàng
migrations/      *.sql áp dụng tuần tự lúc khởi động
scripts/         package-win.mjs (đóng gói Windows tự lành)
public/clover.png      Icon ứng dụng (exe, installer, shortcut, taskbar)
electron-builder.yml   Cấu hình đóng gói NSIS
```

## Ghi chú

- **Icon:** dùng `public/clover.png` (512×512). electron-builder tự sinh `.ico`
  cho exe/installer/shortcut; `electron/main/index.ts` dùng nó cho cửa sổ &
  taskbar lúc chạy. Đổi icon = thay file này (giữ ≥256×256, vuông).
- **Offline tuyệt đối:** app không mở cổng mạng, không gọi API ngoài; mọi
  giao tiếp UI ↔ backend qua Electron IPC trong tiến trình.
