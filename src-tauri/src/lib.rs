mod commands;
mod db;

use std::sync::Mutex;
use tauri::Manager;

pub struct DbState(pub Mutex<rusqlite::Connection>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            // Khi chạy `tauri dev` (build debug) thì dùng DB riêng đặt ngay
            // trong folder source, không đụng tới DB của app thật.
            // Khi build release (app thật) thì dùng app_data_dir như bình thường.
            let db_path = if cfg!(debug_assertions) {
                // CARGO_MANIFEST_DIR là folder src-tauri, lùi 1 cấp ra root repo.
                let dev_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                    .join("..")
                    .join("dev-data");
                std::fs::create_dir_all(&dev_dir).ok();
                dev_dir.join("hang-wu.dev.db")
            } else {
                let data_dir = app.path().app_data_dir().expect("no app data dir");
                std::fs::create_dir_all(&data_dir).ok();
                data_dir.join("hang-wu.db")
            };

            let resource_dir = app.path().resource_dir().expect("no resource dir");
            let migrations_dir = resource_dir.join("migrations");

            let conn = db::open(&db_path, &migrations_dir).expect("DB init failed");
            app.manage(DbState(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // san_pham
            commands::san_pham::list_san_pham,
            commands::san_pham::create_san_pham,
            commands::san_pham::update_san_pham,
            commands::san_pham::delete_san_pham,
            // ceo
            commands::ceo::list_ceo,
            commands::ceo::create_ceo,
            commands::ceo::update_ceo,
            commands::ceo::delete_ceo,
            // nhom_san_pham
            commands::nhom_san_pham::list_nhom_san_pham,
            commands::nhom_san_pham::create_nhom_san_pham,
            commands::nhom_san_pham::update_nhom_san_pham,
            commands::nhom_san_pham::delete_nhom_san_pham,
            // sales_session
            commands::sales_session::list_sales_session,
            commands::sales_session::get_sales_session,
            commands::sales_session::create_sales_session,
            commands::sales_session::update_sales_session,
            commands::sales_session::delete_sales_session,
            commands::sales_session::lock_sales_session,
            commands::sales_session::unlock_sales_session,
            // excel
            commands::excel::parse_excel_file,
            commands::excel::export_matrix_excel_file,
            // backup
            commands::backup::build_backup,
            commands::backup::write_backup_file,
            commands::backup::read_backup_file,
            commands::backup::restore_backup,
            // cloud (R2)
            commands::cloud::cloud_save_credentials,
            commands::cloud::cloud_credentials_info,
            commands::cloud::cloud_clear_credentials,
            commands::cloud::cloud_upload_backup,
            commands::cloud::cloud_list_backups,
            commands::cloud::cloud_download_backup,
        ])
        .run(tauri::generate_context!())
        .expect("error running app");
}
