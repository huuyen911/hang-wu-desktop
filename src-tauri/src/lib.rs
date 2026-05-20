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
            let data_dir = app.path().app_data_dir().expect("no app data dir");
            std::fs::create_dir_all(&data_dir).ok();
            let db_path = data_dir.join("hang-wu.db");

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
            // excel
            commands::excel::parse_excel_file,
            commands::excel::export_excel_file,
            // backup
            commands::backup::build_backup,
            commands::backup::write_backup_file,
            commands::backup::read_backup_file,
            commands::backup::restore_backup,
        ])
        .run(tauri::generate_context!())
        .expect("error running app");
}
