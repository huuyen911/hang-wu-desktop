use rusty_s3::actions::{DeleteObject, GetObject, ListObjectsV2, PutObject};
use rusty_s3::{Bucket, Credentials, S3Action, UrlStyle};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tauri::State;

use crate::DbState;

/// Key R2 nằm trong Windows Credential Manager, không nằm trong source hay
/// trong DB. Xoá key = xoá đúng một mục này.
const KEYRING_SERVICE: &str = "com.hangwu.desktop";
const KEYRING_ACCOUNT: &str = "r2";

/// Vừa là prefix để lọc lúc liệt kê, vừa là tiền tố tên file lúc tải lên — nhờ
/// vậy app chỉ nhìn thấy và chỉ xoá đúng file của chính nó, không đụng thứ khác
/// trong bucket.
const PREFIX: &str = "backups/hang-wu-backup-";
/// R2 không phân vùng theo region như S3, luôn dùng "auto".
const REGION: &str = "auto";
const SIGN_TTL: Duration = Duration::from_secs(300);
/// Số bản sao lưu giữ lại trên bucket; dọn bớt sau mỗi lần tải lên.
const KEEP: usize = 10;

#[derive(Debug, Serialize, Deserialize)]
struct StoredCredentials {
    account_id: String,
    access_key_id: String,
    secret_access_key: String,
    bucket: String,
}

/// Phần thông tin đủ an toàn để đưa ra giao diện — không bao giờ kèm secret.
#[derive(Debug, Serialize)]
pub struct CloudInfo {
    pub account_id: String,
    pub bucket: String,
    pub masked_key_id: String,
}

#[derive(Debug, Serialize)]
pub struct CloudBackupItem {
    pub key: String,
    pub size: u64,
    pub last_modified: String,
}

#[derive(Debug, Serialize)]
pub struct UploadResult {
    pub key: String,
    pub deleted: usize,
    /// Bản sao lưu đã lên rồi; đây chỉ là lỗi của bước dọn bản cũ.
    pub prune_error: Option<String>,
}

fn keyring_entry() -> Result<keyring::v1::Entry, String> {
    keyring::v1::Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT)
        .map_err(|e| format!("Không mở được kho mật khẩu của Windows: {}", e))
}

fn load_credentials() -> Result<StoredCredentials, String> {
    let raw = match keyring_entry()?.get_password() {
        Ok(raw) => raw,
        Err(keyring::v1::Error::NoEntry) => return Err("Chưa cấu hình key R2".into()),
        Err(e) => return Err(format!("Không đọc được key đã lưu: {}", e)),
    };
    serde_json::from_str(&raw).map_err(|_| "Key R2 đã lưu bị hỏng, hãy nhập lại".to_string())
}

fn mask_key_id(key_id: &str) -> String {
    let tail: String = key_id
        .chars()
        .skip(key_id.chars().count().saturating_sub(4))
        .collect();
    format!("••••••{}", tail)
}

fn info_of(c: &StoredCredentials) -> CloudInfo {
    CloudInfo {
        account_id: c.account_id.clone(),
        bucket: c.bucket.clone(),
        masked_key_id: mask_key_id(&c.access_key_id),
    }
}

fn bucket_of(c: &StoredCredentials) -> Result<(Bucket, Credentials), String> {
    let endpoint = format!("https://{}.r2.cloudflarestorage.com", c.account_id)
        .parse()
        .map_err(|_| "Account ID không hợp lệ".to_string())?;
    let bucket = Bucket::new(endpoint, UrlStyle::Path, c.bucket.clone(), REGION)
        .map_err(|e| format!("Cấu hình bucket không hợp lệ: {}", e))?;
    let creds = Credentials::new(c.access_key_id.clone(), c.secret_access_key.clone());
    Ok((bucket, creds))
}

/// `reqwest` ở đây bật `rustls-no-provider` (bám theo tauri-plugin-updater để
/// không kéo thêm aws-lc vào cây phụ thuộc), nên phải tự cài crypto provider —
/// không cài thì `Client::new()` panic. Cùng cách updater đang làm.
fn http_client() -> reqwest::Client {
    if rustls::crypto::CryptoProvider::get_default().is_none() {
        // Chỉ hỏng khi đã có provider mặc định, mà vừa kiểm tra là chưa có.
        let _ = rustls::crypto::ring::default_provider().install_default();
    }
    reqwest::Client::new()
}

/// Lỗi của reqwest có thể kèm nguyên URL đã ký (trong đó có chữ ký tạm thời).
/// Cắt URL đi trước khi cho ra ngoài.
fn safe_err(e: reqwest::Error) -> String {
    format!("Lỗi kết nối tới R2: {}", e.without_url())
}

/// Thân lỗi của S3 là XML dạng `<Error><Code>NoSuchBucket</Code>...`, không
/// chứa khoá hay chữ ký nên hiển thị mã lỗi ra được.
fn s3_error_code(body: &str) -> Option<&str> {
    let start = body.find("<Code>")? + "<Code>".len();
    let end = body[start..].find("</Code>")? + start;
    Some(&body[start..end])
}

async fn read_body(resp: reqwest::Response) -> Result<String, String> {
    let status = resp.status();
    let body = resp.text().await.map_err(safe_err)?;
    if status.is_success() {
        return Ok(body);
    }
    Err(match (status.as_u16(), s3_error_code(&body)) {
        (401, _) | (403, _) => "Key R2 không đúng hoặc không có quyền trên bucket này".into(),
        (404, _) => "Không tìm thấy bucket hoặc file trên R2".into(),
        (_, Some(code)) => format!("R2 trả về lỗi {} ({})", status, code),
        (_, None) => format!("R2 trả về lỗi {}", status),
    })
}

async fn list_objects(c: &StoredCredentials) -> Result<Vec<CloudBackupItem>, String> {
    let (bucket, creds) = bucket_of(c)?;
    let mut action = bucket.list_objects_v2(Some(&creds));
    action.with_prefix(PREFIX);
    let url = action.sign(SIGN_TTL);

    let resp = http_client()
        .get(url)
        .send()
        .await
        .map_err(safe_err)?;
    let body = read_body(resp).await?;

    let parsed = ListObjectsV2::parse_response(&body)
        .map_err(|_| "Không đọc được danh sách bản sao lưu từ R2".to_string())?;
    Ok(parsed
        .contents
        .into_iter()
        .map(|o| CloudBackupItem {
            key: o.key,
            size: o.size,
            last_modified: o.last_modified,
        })
        .collect())
}

fn stamp() -> String {
    chrono::Utc::now().format("%Y%m%dT%H%M%SZ").to_string()
}

/// Xoá bớt cho bucket chỉ còn `keep` bản mới nhất. Trả về số bản đã xoá.
async fn prune(c: &StoredCredentials, keep: usize) -> Result<usize, String> {
    let mut items = list_objects(c).await?;
    if items.len() <= keep {
        return Ok(0);
    }
    // Tên file theo mốc thời gian nên thứ tự chữ cái trùng thứ tự thời gian.
    items.sort_by(|a, b| b.key.cmp(&a.key));

    let (bucket, creds) = bucket_of(c)?;
    let mut deleted = 0;
    for item in items.into_iter().skip(keep) {
        let url = DeleteObject::new(&bucket, Some(&creds), &item.key).sign(SIGN_TTL);
        let resp = http_client().delete(url).send().await.map_err(safe_err)?;
        read_body(resp).await?;
        deleted += 1;
    }
    Ok(deleted)
}

#[tauri::command]
pub async fn cloud_save_credentials(
    account_id: String,
    access_key_id: String,
    secret_access_key: String,
    bucket: String,
) -> Result<CloudInfo, String> {
    let c = StoredCredentials {
        account_id: account_id.trim().to_string(),
        access_key_id: access_key_id.trim().to_string(),
        secret_access_key: secret_access_key.trim().to_string(),
        bucket: bucket.trim().to_string(),
    };
    if c.account_id.is_empty()
        || c.access_key_id.is_empty()
        || c.secret_access_key.is_empty()
        || c.bucket.is_empty()
    {
        return Err("Vui lòng điền đủ 4 trường".into());
    }

    // Gọi thử LIST để kiểm chứng. Sai key thì không lưu gì cả.
    list_objects(&c).await?;

    let raw = serde_json::to_string(&c).map_err(|e| e.to_string())?;
    keyring_entry()?
        .set_password(&raw)
        .map_err(|e| format!("Không lưu được key vào kho mật khẩu: {}", e))?;
    Ok(info_of(&c))
}

#[tauri::command]
pub fn cloud_credentials_info() -> Result<Option<CloudInfo>, String> {
    match load_credentials() {
        Ok(c) => Ok(Some(info_of(&c))),
        // Chưa cấu hình là trạng thái bình thường, không phải lỗi.
        Err(_) => Ok(None),
    }
}

#[tauri::command]
pub fn cloud_clear_credentials() -> Result<(), String> {
    match keyring_entry()?.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::v1::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("Không xoá được key: {}", e)),
    }
}

#[tauri::command]
pub async fn cloud_upload_backup(
    state: State<'_, DbState>,
    app_version: String,
) -> Result<UploadResult, String> {
    let c = load_credentials()?;

    // Nhả mutex trước khi bước vào phần chờ mạng.
    let json = {
        let db = state.0.lock().map_err(|e| e.to_string())?;
        crate::commands::backup::build_backup_json(&db, &app_version)?
    };

    let key = format!("{}{}.json", PREFIX, stamp());
    let (bucket, creds) = bucket_of(&c)?;
    let url = PutObject::new(&bucket, Some(&creds), &key).sign(SIGN_TTL);

    let resp = http_client()
        .put(url)
        .header("content-type", "application/json")
        .body(json)
        .send()
        .await
        .map_err(safe_err)?;
    read_body(resp).await?;

    // Bản sao lưu đã nằm trên R2 rồi, nên dọn bản cũ hỏng thì cũng không được
    // coi cả thao tác là thất bại — báo riêng để người dùng biết mà xử lý.
    let (deleted, prune_error) = match prune(&c, KEEP).await {
        Ok(n) => (n, None),
        Err(e) => (0, Some(e)),
    };

    Ok(UploadResult {
        key,
        deleted,
        prune_error,
    })
}

#[tauri::command]
pub async fn cloud_list_backups() -> Result<Vec<CloudBackupItem>, String> {
    let c = load_credentials()?;
    let mut items = list_objects(&c).await?;
    // Mới nhất lên đầu; tên file đã theo dạng sắp xếp được nên dùng luôn.
    items.sort_by(|a, b| b.key.cmp(&a.key));
    Ok(items)
}

#[tauri::command]
pub async fn cloud_download_backup(key: String) -> Result<String, String> {
    let c = load_credentials()?;
    let (bucket, creds) = bucket_of(&c)?;
    let url = GetObject::new(&bucket, Some(&creds), &key).sign(SIGN_TTL);

    let resp = http_client()
        .get(url)
        .send()
        .await
        .map_err(safe_err)?;
    read_body(resp).await
}
