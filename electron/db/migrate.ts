import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import { all, exec, persist, run, transaction } from './connection'

// Dev: migrations/ ở gốc project. Đóng gói: copy qua extraResources (xem
// electron-builder.yml) → resourcesPath/migrations.
function migrationsDir(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'migrations')
    : join(app.getAppPath(), 'migrations')
}

/**
 * Chạy các file migrations/*.sql theo thứ tự tên, mỗi file trong 1 transaction
 * và ghi nhận vào bảng _migrations để không chạy lại. Idempotent: gọi mỗi lần
 * khởi động app. Ghi ra đĩa nếu có migration mới được áp dụng.
 */
export function runMigrations(): void {
  exec(
    `CREATE TABLE IF NOT EXISTS _migrations (
       name TEXT PRIMARY KEY,
       applied_at TEXT NOT NULL DEFAULT (datetime('now'))
     )`,
  )

  const applied = new Set(
    all<{ name: string }>('SELECT name FROM _migrations').map((r) => r.name),
  )

  const dir = migrationsDir()
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()

  let changed = false
  for (const file of files) {
    if (applied.has(file)) continue
    const sql = readFileSync(join(dir, file), 'utf8')
    transaction(() => {
      exec(sql)
      run('INSERT INTO _migrations (name) VALUES (?)', [file])
    })
    changed = true
  }

  if (changed) persist()
}
