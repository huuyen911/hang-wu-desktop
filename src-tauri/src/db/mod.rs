use rusqlite::{Connection, Result};
use std::path::Path;

pub fn open(db_path: &Path, migrations_dir: &Path) -> Result<Connection> {
    let conn = Connection::open(db_path)?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
    run_migrations(&conn, migrations_dir)?;
    Ok(conn)
}

fn run_migrations(conn: &Connection, migrations_dir: &Path) -> Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS _migrations (
            name TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );",
    )?;

    let mut entries: Vec<_> = std::fs::read_dir(migrations_dir)
        .expect("migrations dir not found")
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().map(|x| x == "sql").unwrap_or(false))
        .collect();
    entries.sort_by_key(|e| e.file_name());

    for entry in entries {
        let name = entry.file_name().to_string_lossy().to_string();
        let already: bool = conn
            .query_row(
                "SELECT COUNT(*) FROM _migrations WHERE name = ?1",
                [&name],
                |r| r.get::<_, i64>(0),
            )
            .unwrap_or(0)
            > 0;
        if already {
            continue;
        }
        let sql = std::fs::read_to_string(entry.path()).expect("read migration");
        conn.execute_batch(&sql)?;
        conn.execute("INSERT INTO _migrations (name) VALUES (?1)", [&name])?;
    }
    Ok(())
}
