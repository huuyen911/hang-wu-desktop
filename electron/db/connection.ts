import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import initSqlJs, { type Database } from 'sql.js'

// sql.js = SQLite biên dịch WASM (không cần native build). DB nằm hoàn toàn
// trong RAM; sau mỗi lần ghi ta export ra file để bền vững. Dữ liệu master
// nhỏ nên chi phí export không đáng kể.

let _db: Database | null = null
let _dbFile = ''

function wasmPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'sql-wasm.wasm')
    : join(app.getAppPath(), 'node_modules/sql.js/dist/sql-wasm.wasm')
}

/** Khởi tạo kết nối. Phải gọi (await) sau app.whenReady, trước khi phục vụ IPC. */
export async function initDb(): Promise<void> {
  if (_db) return
  // Buffer của Node có thể là view vào một ArrayBuffer pool lớn hơn → cắt đúng
  // khoảng byte để có ArrayBuffer chuẩn (kiểu sql.js yêu cầu).
  const wasm = readFileSync(wasmPath())
  const wasmBinary = wasm.buffer.slice(
    wasm.byteOffset,
    wasm.byteOffset + wasm.byteLength,
  ) as ArrayBuffer
  const SQL = await initSqlJs({ wasmBinary })

  _dbFile = join(app.getPath('userData'), 'hang-wu.db')
  mkdirSync(dirname(_dbFile), { recursive: true })

  _db = existsSync(_dbFile) ? new SQL.Database(readFileSync(_dbFile)) : new SQL.Database()
  _db.run('PRAGMA foreign_keys = ON')
}

function db(): Database {
  if (!_db) throw new Error('DB chưa khởi tạo — gọi initDb() trước')
  return _db
}

/**
 * Ghi toàn bộ DB ra đĩa. Gọi sau mỗi thao tác ghi để không mất dữ liệu.
 *
 * Ghi nguyên tử: xuất ra file tạm rồi `rename` đè lên file thật. `rename`
 * trong cùng thư mục là thao tác nguyên tử của OS (cả Windows lẫn POSIX) —
 * nếu process chết giữa chừng, file `.db` thật hoặc còn nguyên (chưa rename)
 * hoặc đã là bản mới hoàn chỉnh, không bao giờ rơi vào trạng thái ghi dở.
 */
export function persist(): void {
  if (!_db) return
  const tmpFile = _dbFile + '.tmp'
  writeFileSync(tmpFile, Buffer.from(_db.export()))
  renameSync(tmpFile, _dbFile)
}

export function closeDb(): void {
  if (_db) {
    persist()
    _db.close()
    _db = null
  }
}

// ─── Facade kiểu better-sqlite3 (đồng bộ) ────────────────────────────────────

type Params = unknown[]

function bindable(params: Params): (string | number | null | Uint8Array)[] {
  return params.map((p) =>
    typeof p === 'boolean' ? (p ? 1 : 0) : (p as string | number | null | Uint8Array),
  )
}

export function all<T = Record<string, unknown>>(sql: string, params: Params = []): T[] {
  const stmt = db().prepare(sql)
  try {
    stmt.bind(bindable(params))
    const rows: T[] = []
    while (stmt.step()) rows.push(stmt.getAsObject() as T)
    return rows
  } finally {
    stmt.free()
  }
}

export function get<T = Record<string, unknown>>(sql: string, params: Params = []): T | undefined {
  return all<T>(sql, params)[0]
}

export interface RunResult {
  lastInsertRowid: number
  changes: number
}

export function run(sql: string, params: Params = []): RunResult {
  db().run(sql, bindable(params))
  const idRow = db().exec('SELECT last_insert_rowid() AS id')
  const lastInsertRowid = Number(idRow[0]?.values?.[0]?.[0] ?? 0)
  return { lastInsertRowid, changes: db().getRowsModified() }
}

export function exec(sql: string): void {
  db().exec(sql)
}

/** Chạy fn trong 1 transaction (BEGIN/COMMIT, lỗi → ROLLBACK). */
export function transaction<T>(fn: () => T): T {
  db().run('BEGIN')
  try {
    const result = fn()
    db().run('COMMIT')
    return result
  } catch (e) {
    db().run('ROLLBACK')
    throw e
  }
}
