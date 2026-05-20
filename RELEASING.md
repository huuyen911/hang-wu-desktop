# Phát hành & Auto-update

App dùng `tauri-plugin-updater` để tự kiểm tra, tải, và cài bản mới từ GitHub Releases.
User chỉ cần cài lần đầu (NSIS `.exe`), các lần sau bấm **Kiểm tra cập nhật** ở chân Sidebar.

---

## 1. Setup lần đầu (chỉ làm 1 lần)

### 1.1. Sinh signing key

Cần Ed25519 keypair để ký mỗi bản build. Public key nhúng vào app, private key giữ bí mật.

```powershell
npx @tauri-apps/cli signer generate -w $HOME\.tauri\hangwu.key
```

Lệnh in ra **public key** (base64). Mở `$HOME\.tauri\hangwu.key.pub` để copy.

### 1.2. Dán public key vào `src-tauri/tauri.conf.json`

Thay chuỗi `REPLACE_WITH_PUBLIC_KEY_FROM_signer_generate` ở field `plugins.updater.pubkey` bằng public key vừa sinh.

Commit + push lên repo.

### 1.3. Thêm secrets vào GitHub repo

Mở `https://github.com/huuyen911/hang-wu-desktop/settings/secrets/actions` và thêm 2 secret:

| Tên | Giá trị |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | nội dung file `$HOME\.tauri\hangwu.key` (private — gồm cả header `untrusted comment`) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | password đã đặt lúc generate (để rỗng nếu không đặt) |

⚠️ **Đừng commit** private key vào repo.

---

## 2. Quy trình phát hành 1 bản mới

### 2.1. Bump version ở 3 file (giữ đồng bộ)

- `package.json` → `"version"`
- `src-tauri/Cargo.toml` → `version`
- `src-tauri/tauri.conf.json` → `"version"`

### 2.2. Commit & push tag

```powershell
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "chore: release v0.2.2"
git tag v0.2.2
git push origin main --tags
```

### 2.3. GitHub Actions tự build & publish

Workflow `.github/workflows/release.yml` chạy khi push tag `v*`:

1. Build NSIS installer `.exe`
2. Ký file → sinh `.exe.sig`
3. Sinh `latest.json` (manifest mà updater fetch)
4. Tạo GitHub Release với tag `v0.2.2`, đính kèm:
   - `Hang.Wonder.Union_0.2.2_x64-setup.exe`
   - `Hang.Wonder.Union_0.2.2_x64-setup.exe.sig`
   - `latest.json`

Endpoint mà app fetch:

```
https://github.com/huuyen911/hang-wu-desktop/releases/latest/download/latest.json
```

Khi user bấm **Kiểm tra cập nhật**, app so version với `latest.json`, nếu mới hơn thì tải, verify signature, cài, restart.

---

## 3. Build cục bộ (không qua CI)

Nếu muốn test signing trên máy:

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content -Raw $HOME\.tauri\hangwu.key
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "<password hoặc bỏ nếu rỗng>"
npm run build
```

File `.sig` và `latest.json` sẽ nằm cạnh `.exe` trong `src-tauri/target/release/bundle/nsis/`.

---

## 4. Lưu ý

- **`installMode: currentUser`** đang bật → update silent (không UAC). App cài vào `%LOCALAPPDATA%\Programs\Hang Wonder Union\`, chỉ user đã cài dùng được (không share cho user Windows khác trên cùng máy).
- **Migration từ v0.2.1 (perMachine):** user v0.2.1 phải uninstall thủ công từ "Apps & Features" trước, rồi cài v0.2.2. Dữ liệu DB vẫn giữ vì lưu theo bundle identifier ở `%APPDATA%\com.hangwu.desktop\`.
- Nếu thay đổi schema DB, đảm bảo migration tương thích ngược — user nhảy bản có thể skip nhiều version.
- Mất private key = không phát hành được bản mới (user cũ sẽ không update được vì pubkey nhúng sẵn không khớp). **Backup file `.key` an toàn.**
